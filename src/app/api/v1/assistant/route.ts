import {
  COMPARABLE_ENTITIES,
  COUNTRIES_DATA,
  TIMELINE_EVENTS,
} from "@/lib/data/global-intelligence";
import { describeVsBenchmark } from "@/lib/data/world-benchmarks";
import { buildPlaceholderCountryProfile } from "@/lib/data/world-catalog";
import {
  formatCountryMetricOrNa,
  formatPopulationHuman,
  formatRelationshipSentence,
  formatSignedPct,
  formatUsdBnCompact,
  getEffectiveGdpUsdBn,
  getEffectiveGdpYear,
  hasSectorMetricValue,
} from "@/lib/formatters";
import { buildInfiniteKnowledgeGraph } from "@/lib/graph/engine";
import { matchCountryCatalogFromText } from "@/lib/intelligence/spatial-sync";
import {
  fetchLiveCountryIntelligence,
  fetchOpenAlexSources,
  fetchWikimediaSummary,
} from "@/lib/providers/live-data";
import { classifyQueryIntent } from "@/lib/research/engine";
import { synthesizeAssistantReplyWithOptionalLlm } from "@/lib/research/llm";
import { sanitizeEditorialProse } from "@/lib/research/prompts";
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
      const asksBroadOverview = /\b(macro baseline|overview|summarize|summary|tell me about)\b/i.test(msg);
      const asksInflation = !asksBroadOverview && /\b(inflation|prices|cpi|cost of living)\b/i.test(msg);
      const asksPower = !asksBroadOverview && /\b(energy|clean|renewable|solar|nuclear|coal|power|grid|emissions|climate)\b/i.test(msg);
      const asksDebt = !asksBroadOverview && /\b(debt|deficit|spending|fiscal)\b/i.test(msg);

      if (asksInflation && hasSectorMetricValue(matchedCountry, matchedCountry.inflationPct)) {
        const cpiBench = describeVsBenchmark("inflationPct", matchedCountry.inflationPct).summary;
        reply = sanitizeEditorialProse(
          `**${matchedCountry.name} (${matchedCountry.iso3})** currently runs an annual consumer inflation rate of ${cpiLabel} (${cpiBench}). Alongside ${
            growthLabel === "growth unavailable" ? "its recent activity" : `annual output growth of ${growthLabel}`
          }, household costs hinge on food supplies, fuel import prices, and interest-rate policy.\n\nSource: ${matchedCountry.provenance.source}${liveYear ? ` (${liveYear})` : ""}.`
        );
      } else if (asksPower && renewLabel !== "not reported") {
        const powBench = describeVsBenchmark("renewableSharePct", matchedCountry.energyProfile.renewableSharePct).summary;
        reply = sanitizeEditorialProse(
          `**${matchedCountry.name} (${matchedCountry.iso3})** gets ${renewLabel} of its electricity from renewables (${powBench}) and ${nuclearLabel} from nuclear power${
            hasSectorMetricValue(matchedCountry, matchedCountry.energyProfile.electricityGenerationTwh)
              ? `, generating ${matchedCountry.energyProfile.electricityGenerationTwh.toLocaleString()} TWh total each year`
              : ""
          }${
            growthLabel !== "growth unavailable" ? `, alongside ${growthLabel} annual GDP growth` : ""
          }.\n\nSource: ${matchedCountry.provenance.source}${liveYear ? ` (${liveYear})` : ""}.`
        );
      } else if (asksDebt && hasSectorMetricValue(matchedCountry, matchedCountry.publicDebtPctGdp)) {
        const debtBench = describeVsBenchmark("publicDebtPctGdp", matchedCountry.publicDebtPctGdp).summary;
        reply = sanitizeEditorialProse(
          `**${matchedCountry.name} (${matchedCountry.iso3})** carries public debt equal to ${matchedCountry.publicDebtPctGdp}% of its annual economy (${debtBench}), while annual government spending is ${formatCountryMetricOrNa(
            matchedCountry,
            matchedCountry.govExpenditurePctGdp,
            (v) => `${v}% of GDP`
          )}${
            growthLabel !== "growth unavailable" ? ` and annual growth stands at ${growthLabel}` : ""
          }.\n\nSource: ${matchedCountry.provenance.source}${liveYear ? ` (${liveYear})` : ""}.`
        );
      } else {
        const perCapBench =
          matchedCountry.gdpPerCapitaUsd > 0
            ? ` (${describeVsBenchmark("gdpPerCapitaUsd", matchedCountry.gdpPerCapitaUsd).summary})`
            : "";
        const openingSentence =
          effectiveGdp > 0
            ? `**${matchedCountry.name} (${matchedCountry.iso3})** has an economy of ${gdpLabel}${
                popLabel ? ` across ${popLabel} people` : ""
              }, averaging ${perCapitaLabel}${perCapBench} and ${
                growthLabel === "growth unavailable" ? "with recent annual growth still updating" : `growing ${growthLabel}`
              }.`
            : `**${matchedCountry.name} (${matchedCountry.iso3})** currently has partial live economic data available from World Bank sources.`;
        const secondSentence =
          renewLabel !== "not reported"
            ? ` Renewable sources provide ${renewLabel} of electricity generation, annual inflation is ${cpiLabel}, and R&D spending is ${rdLabel}.`
            : ` Latest measured inflation is ${cpiLabel}, and R&D spending stands at ${rdLabel}.`;

        reply = sanitizeEditorialProse(
          `${openingSentence}${secondSentence}\n\nSource: ${matchedCountry.provenance.source}${liveYear ? ` (${liveYear})` : ""}.`
        );
      }
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

    const verifiedContext = [
      `Deterministic Draft:\n${reply}`,
      openAlexWorks.length > 0
        ? `OpenAlex Papers:\n${openAlexWorks.map((w) => `- ${w.title} (${w.publisher}, ${w.publishedDate})`).join("\n")}`
        : "",
      wikiSummary ? `Wikimedia Summary (${wikiSummary.title}): ${wikiSummary.extract.slice(0, 260)}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const optionalLlmReply = await synthesizeAssistantReplyWithOptionalLlm({
      message: msg,
      contextLabel: body.contextLabel ?? "Global Overview",
      contextTopic,
      verifiedContext,
    });
    if (optionalLlmReply) {
      reply = optionalLlmReply;
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
