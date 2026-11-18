import {
  COMPARABLE_ENTITIES,
  COUNTRIES_DATA,
  TIMELINE_EVENTS,
} from "@/lib/data/global-intelligence";
import { buildPlaceholderCountryProfile } from "@/lib/data/world-catalog";
import {
  formatCountryMetricOrNa,
  formatPopulationHuman,
  formatRelationshipSentence,
  formatSignedPct,
  formatUsdBnCompact,
  getEffectiveGdpUsdBn,
  getEffectiveGdpYear,
} from "@/lib/formatters";
import { buildInfiniteKnowledgeGraph } from "@/lib/graph/engine";
import { matchCountryCatalogFromText } from "@/lib/intelligence/spatial-sync";
import {
  fetchLiveCountryIntelligence,
  fetchOpenAlexSources,
  fetchWikimediaSummary,
} from "@/lib/providers/live-data";
import { classifyQueryIntent } from "@/lib/research/engine";
import { enforceRequestRateLimit, validateAndSanitizeInput } from "@/lib/security/guardrails";

export async function POST(request: Request) {
  try {
    const rateLimited = enforceRequestRateLimit(request, "assistant", 90, 60_000);
    if (rateLimited) return rateLimited;

    const body = (await request.json()) as {
      message?: string;
      contextLabel?: string;
      contextTopic?: string;
    };

    const check = validateAndSanitizeInput(body.message ?? "", 500);
    if (!check.allowed) {
      return Response.json({ error: check.reason }, { status: 400 });
    }

    const msg = check.sanitizedText;
    const contextTopic = body.contextTopic ?? "Global Overview";
    const intentInfo = classifyQueryIntent(`${msg} ${contextTopic}`);
    const matchedCatalog = matchCountryCatalogFromText(msg, contextTopic);

    const resolveCountryWithFallback = async (iso3: string) => {
      if (COUNTRIES_DATA[iso3]) {
        return await fetchLiveCountryIntelligence(iso3).catch(() => COUNTRIES_DATA[iso3]) ?? COUNTRIES_DATA[iso3];
      }
      const live = await fetchLiveCountryIntelligence(iso3).catch(() => null);
      if (live) return live;
      const fallback = buildPlaceholderCountryProfile(iso3);
      if (!fallback) return null;
      return {
        ...fallback,
        provenance: {
          ...fallback.provenance,
          source: "OMNIS Static Catalog Fallback (Upstream Timeout)",
          methodology:
            "Static catalog coordinate fallback used after live World Bank / REST Countries timeout; sector metrics withheld.",
          missingData: true,
          verificationStatus: "unverified" as const,
        },
      };
    };

    const [matchedCountry, openAlexWorks, wikiSummary] = await Promise.all([
      matchedCatalog ? resolveCountryWithFallback(matchedCatalog.iso3) : Promise.resolve(null),
      fetchOpenAlexSources(msg, 3),
      fetchWikimediaSummary(matchedCatalog?.name ?? msg),
    ]);

    let reply = "";
    const provenanceMethodology = matchedCountry
      ? matchedCountry.provenance.methodology?.trim() ||
        matchedCountry.provenance.verificationStatus
      : null;

    if (matchedCountry) {
      const effectiveGdp = getEffectiveGdpUsdBn(matchedCountry);
      const liveYear = getEffectiveGdpYear(matchedCountry);
      const gdpLabel =
        effectiveGdp > 0
          ? `${formatUsdBnCompact(effectiveGdp)}${liveYear ? ` (${liveYear} World Bank data)` : ""}`
          : "unavailable";
      const popLabel =
        matchedCountry.population > 0
          ? formatPopulationHuman(matchedCountry.population, "long")
          : null;
      const perCapitaLabel =
        matchedCountry.gdpPerCapitaUsd > 0
          ? `$${matchedCountry.gdpPerCapitaUsd.toLocaleString()} per person`
          : "per-capita income unavailable";
      const growthLabel =
        matchedCountry.provenance.missingData && matchedCountry.gdpGrowthPct === 0 && effectiveGdp === 0
          ? "growth unavailable"
          : `${formatSignedPct(matchedCountry.gdpGrowthPct)} a year`;
      const cpiLabel = formatCountryMetricOrNa(matchedCountry, matchedCountry.inflationPct, (v) => `${v}%`);
      const renewLabel =
        !matchedCountry.provenance.missingData || matchedCountry.energyProfile.renewableSharePct > 0
          ? `${matchedCountry.energyProfile.renewableSharePct}%`
          : "not reported";
      const nuclearLabel = formatCountryMetricOrNa(
        matchedCountry,
        matchedCountry.energyProfile.nuclearSharePct,
        (v) => `${v}%`
      );
      const rdLabel = formatCountryMetricOrNa(
        matchedCountry,
        matchedCountry.technologyProfile.rdSpendPctGdp,
        (v) => `${v}% of GDP`
      );

      const openingSentence =
        effectiveGdp > 0
          ? `**${matchedCountry.name} (${matchedCountry.iso3})** has an economy of ${gdpLabel}${
              popLabel ? ` across ${popLabel} people` : ""
            }, averaging ${perCapitaLabel} and ${growthLabel === "growth unavailable" ? "unreported recent growth" : `growing ${growthLabel}`}.`
          : `**${matchedCountry.name} (${matchedCountry.iso3})** currently has partial live economic data available from World Bank sources.`;
      const energySentence =
        renewLabel !== "not reported"
          ? ` Clean and renewable sources provide ${renewLabel} of its electricity generation.`
          : "";

      reply =
        `${openingSentence}${energySentence}\n\n` +
        `• **Prices & Innovation**: Annual inflation stands at ${cpiLabel}; R&D investment is ${rdLabel}.\n` +
        `• **Power Mix**: Renewables ${renewLabel} • Nuclear ${nuclearLabel}.\n` +
        `• **Source**: ${matchedCountry.provenance.source}${liveYear ? ` (${liveYear})` : ""}.`;
    } else if (openAlexWorks.length > 0 || wikiSummary) {
      const leadIntro = wikiSummary
        ? `${wikiSummary.extract.slice(0, 280)}${wikiSummary.extract.length > 280 ? "..." : ""}`
        : `Here is what published studies and reference archives say about **"${msg}"**.`;
      const papersBullet =
        openAlexWorks.length > 0
          ? `\n\n• **Recent academic studies (${openAlexWorks.length})**:\n${openAlexWorks
              .map((w) => `  - "${w.title}" (${w.publisher}, ${w.publishedDate})`)
              .join("\n")}`
          : "";
      const followUp = openAlexWorks.length > 0
        ? `\n\nOpen the full Research report to inspect abstracts, disagreements across studies, and citations.`
        : "";
      reply = `${leadIntro}${papersBullet}${followUp}`;
    } else {
      const lowerMsg = msg.toLowerCase();
      const keywords = lowerMsg.split(/\s+/).filter((t) => t.length >= 4);
      const matchingEvents = TIMELINE_EVENTS.filter((evt) => {
        const hay = `${evt.title} ${evt.description} ${evt.category}`.toLowerCase();
        return keywords.some((kw) => hay.includes(kw));
      }).slice(0, 2);
      const matchingBenchmark = COMPARABLE_ENTITIES.find((ent) => {
        const hay = `${ent.name} ${ent.subtitle} ${ent.category}`.toLowerCase();
        return keywords.some((kw) => hay.includes(kw));
      });
      const topicGraph = buildInfiniteKnowledgeGraph({ topic: msg, maxNodes: 8 });
      const sampleEdges = topicGraph.edges
        .slice(0, 2)
        .map((edge) => {
          const src = topicGraph.nodes.find((n) => n.id === edge.source)?.label ?? edge.source;
          const tgt = topicGraph.nodes.find((n) => n.id === edge.target)?.label ?? edge.target;
          return formatRelationshipSentence(src, edge.relationshipType, tgt);
        });

      const localHighlights: string[] = [];
      if (matchingBenchmark) {
        localHighlights.push(`• **Benchmark**: ${matchingBenchmark.name} — ${matchingBenchmark.subtitle}`);
      }
      for (const evt of matchingEvents) {
        localHighlights.push(`• **History (${evt.dateDisplay})**: ${evt.title} — ${evt.description.slice(0, 140)}…`);
      }
      if (sampleEdges.length > 0) {
        localHighlights.push(`• **Key Connections**: ${sampleEdges.join("; ")}.`);
      }

      reply =
        `Live academic and World Bank feeds didn't return direct matches for **"${msg}"** just now, so here is what OMNIS holds in its built-in history, sector benchmarks, and topic map:\n\n` +
        `${localHighlights.join("\n")}\n\n` +
        `Try opening the interactive **Topic Map**, running a **What-If Scenario**, or viewing a **Full Research Report** below.`;
    }

    const citations = [
      ...(matchedCountry
        ? [
            {
              label: `World Bank Open Data — ${matchedCountry.name}`,
              url: matchedCountry.provenance.url,
            },
          ]
        : []),
      ...openAlexWorks.slice(0, 2).map((w) => ({
        label: `${w.title} (${w.publishedDate})`,
        url: w.url,
      })),
      ...(wikiSummary
        ? [{ label: `Wikimedia — ${wikiSummary.title}`, url: wikiSummary.url }]
        : []),
      ...(openAlexWorks.length === 0 && !matchedCountry
        ? [
            {
              label: `OpenAlex Search: ${msg}`,
              url: `https://openalex.org/works?search=${encodeURIComponent(msg)}`,
            },
          ]
        : []),
    ];

    return Response.json({
      reply,
      timestamp: new Date().toISOString(),
      citations,
      provenanceMeta:
        matchedCountry && provenanceMethodology
          ? {
              iso3: matchedCountry.iso3,
              countryName: matchedCountry.name,
              verificationStatus: matchedCountry.provenance.verificationStatus,
              source: matchedCountry.provenance.source,
              methodology: provenanceMethodology,
            }
          : null,
      suggestedActions: [
        {
          label: `Explore Topic Map: ${matchedCountry?.name ?? msg.slice(0, 24)}`,
          href: `/knowledge-graph?topic=${encodeURIComponent(
            matchedCountry?.name ?? msg.slice(0, 40)
          )}`,
        },
        {
          label: "Read Full Research Report",
          href: `/research?q=${encodeURIComponent(msg)}`,
        },
        {
          label:
            intentInfo.intent === "comparative_analysis"
              ? "Compare Countries Side by Side"
              : "Test a What-If Scenario",
          href:
            intentInfo.intent === "comparative_analysis" && matchedCountry
              ? `/intelligence?left=${matchedCountry.iso3}&right=${matchedCountry.iso3 === "IND" ? "CHN" : "IND"}`
              : matchedCountry
                ? `/simulations?country=${matchedCountry.iso3}`
                : "/simulations",
        },
      ],
    });
  } catch (err) {
    console.error("[OMNIS Assistant API] Error:", err);
    return Response.json({ error: "Assistant processing failed." }, { status: 500 });
  }
}
