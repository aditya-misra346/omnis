import { COUNTRIES_DATA } from "@/lib/data/global-intelligence";
import { buildPlaceholderCountryProfile } from "@/lib/data/world-catalog";
import {
  formatCountryMetricOrNa,
  formatSignedPct,
  getEffectiveGdpUsdBn,
  getEffectiveGdpYear,
} from "@/lib/formatters";
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
          ? `$${effectiveGdp.toLocaleString()}B${liveYear ? ` (Live WDI ${liveYear})` : ""}`
          : "N/A";
      const perCapitaLabel =
        matchedCountry.gdpPerCapitaUsd > 0
          ? `$${matchedCountry.gdpPerCapitaUsd.toLocaleString()}/capita`
          : "N/A";
      const growthLabel =
        matchedCountry.provenance.missingData && matchedCountry.gdpGrowthPct === 0 && effectiveGdp === 0
          ? "N/A"
          : formatSignedPct(matchedCountry.gdpGrowthPct);
      const cpiLabel = formatCountryMetricOrNa(matchedCountry, matchedCountry.inflationPct, (v) => `${v}%`);
      const renewLabel =
        !matchedCountry.provenance.missingData || matchedCountry.energyProfile.renewableSharePct > 0
          ? `${matchedCountry.energyProfile.renewableSharePct}%`
          : "N/A";
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
      reply =
        `Retrieved Country Profile — **${matchedCountry.name} (${matchedCountry.iso3})** [Context: ${
          body.contextLabel ?? "OMNIS"
        }]:\n\n` +
        `• **Macroeconomic Baseline**: Nominal GDP ${gdpLabel} (${perCapitaLabel}), ${growthLabel} real annual growth, ${cpiLabel} CPI inflation.\n` +
        `• **Energy & R&D**: Renewable electricity ${renewLabel} (Nuclear ${nuclearLabel}), R&D spend ${rdLabel}.\n` +
        `• **Source Provenance**: ${matchedCountry.provenance.source} (${provenanceMethodology}).`;
    } else if (openAlexWorks.length > 0 || wikiSummary) {
      const topWork = openAlexWorks[0];
      const wikiSnippet = wikiSummary ? `\n\n• **Reference Context (${wikiSummary.title})**: ${wikiSummary.extract.slice(0, 260)}${wikiSummary.extract.length > 260 ? "..." : ""}` : "";
      const papersBullet =
        openAlexWorks.length > 0
          ? `\n• **Live OpenAlex Peer-Reviewed Citations Retrieved (${openAlexWorks.length})**:\n${openAlexWorks
              .map((w) => `  - "${w.title}" (${w.publisher}, ${w.publishedDate})`)
              .join("\n")}`
          : "";
      reply =
        `Context-Grounded Retrieval for **"${msg}"** [Active Context: ${
          body.contextLabel ?? "Command Cockpit"
        } | Classified Intent: ${intentInfo.intent.replace(/_/g, " ")}]:` +
        wikiSnippet +
        papersBullet +
        (topWork
          ? `\n\nUse the Deep Research module to decompose empirical claims across these retrieved citations.`
          : "");
    } else {
      reply =
        `No pre-cached sovereign dossier directly matched **"${msg}"** under active context (${
          body.contextLabel ?? "Command Cockpit"
        }), and live upstream OpenAlex/Wikimedia providers returned zero records within timeout.\n\n` +
        `Intent classification routes this query to **${intentInfo.intent.replace(
          /_/g,
          " "
        )}**. Open Deep Research or Universal Explore directly to query external databases.`;
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
          label: `Explore Knowledge Graph: ${matchedCountry?.name ?? msg.slice(0, 24)}`,
          href: `/knowledge-graph?topic=${encodeURIComponent(
            matchedCountry?.name ?? msg.slice(0, 40)
          )}`,
        },
        {
          label: "Run Deep Research Report",
          href: `/research?q=${encodeURIComponent(msg)}`,
        },
        {
          label: "Open What-If Simulation Engine",
          href: "/simulations",
        },
      ],
    });
  } catch (err) {
    console.error("[OMNIS Assistant API] Error:", err);
    return Response.json({ error: "Assistant processing failed." }, { status: 500 });
  }
}
