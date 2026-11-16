import { COUNTRIES_DATA } from "@/lib/data/global-intelligence";
import { formatSignedPct } from "@/lib/formatters";
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

    const [matchedCountry, openAlexWorks, wikiSummary] = await Promise.all([
      matchedCatalog
        ? COUNTRIES_DATA[matchedCatalog.iso3]
          ? Promise.resolve(COUNTRIES_DATA[matchedCatalog.iso3])
          : fetchLiveCountryIntelligence(matchedCatalog.iso3)
        : Promise.resolve(null),
      fetchOpenAlexSources(msg, 3),
      fetchWikimediaSummary(matchedCatalog?.name ?? msg),
    ]);

    let reply = "";
    if (matchedCountry) {
      const growthLabel = formatSignedPct(matchedCountry.gdpGrowthPct);
      reply =
        `Retrieved Country Profile — **${matchedCountry.name} (${matchedCountry.iso3})** [Context: ${
          body.contextLabel ?? "OMNIS"
        }]:\n\n` +
        `• **Macroeconomic Baseline**: Nominal GDP $${matchedCountry.gdpUsdBn.toLocaleString()}B ($${matchedCountry.gdpPerCapitaUsd.toLocaleString()}/capita), ${growthLabel} real annual growth, ${matchedCountry.inflationPct}% CPI inflation.\n` +
        `• **Energy & R&D**: Renewable electricity ${matchedCountry.energyProfile.renewableSharePct}% (Nuclear ${matchedCountry.energyProfile.nuclearSharePct}%), R&D spend ${matchedCountry.technologyProfile.rdSpendPctGdp}% of GDP.\n` +
        `• **Source Provenance**: ${matchedCountry.provenance.source} (${matchedCountry.provenance.methodology}).`;
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
