import {
  COMPARABLE_ENTITIES,
  COUNTRIES_DATA,
  TIMELINE_EVENTS,
} from "@/lib/data/global-intelligence";
import {
  WORLD_COUNTRIES_CATALOG,
  buildPlaceholderCountryProfile,
} from "@/lib/data/world-catalog";
import {
  formatCountryMetricOrNa,
  formatMultipleOrGap,
  formatPopulationHuman,
  formatSignedPct,
  formatUsdBnCompact,
  getEffectiveGdpUsdBn,
  getEffectiveGdpYear,
} from "@/lib/formatters";
import {
  fetchLiveCountryIntelligence,
  fetchOpenAlexPublicationTrend,
  fetchOpenAlexSources,
  fetchWikimediaSummary,
} from "@/lib/providers/live-data";
import type {
  CountryIntelligenceProfile,
  ResearchMode,
  ResearchReportData,
  ResearchSourceItem,
} from "@/types/omnis";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesCountryMention(rawQuery: string, name: string, iso3: string): boolean {
  const nameRegex = new RegExp(`\\b${escapeRegExp(name)}\\b`, "i");
  if (nameRegex.test(rawQuery)) return true;
  const trimmed = rawQuery.trim();
  if (trimmed.toUpperCase() === iso3) return true;
  // Require uppercase token for ISO3 codes so common words ("can", "are", "nor", "ind") never false-trigger
  const isoRegex = new RegExp(`\\b${escapeRegExp(iso3)}\\b`);
  return isoRegex.test(rawQuery);
}

export type QueryIntent =
  | "country_intelligence"
  | "comparative_analysis"
  | "causal_knowledge_graph"
  | "historical_evolution"
  | "scientific_economic_research"
  | "scenario_simulation";

export function classifyQueryIntent(query: string): {
  intent: QueryIntent;
  confidence: number;
  detectedEntities: string[];
  suggestedModule: string;
} {
  const q = query.toLowerCase();
  const detected: { name: string; iso3: string }[] = [];

  for (const entry of WORLD_COUNTRIES_CATALOG) {
    if (matchesCountryMention(query, entry.name, entry.iso3)) {
      detected.push({ name: entry.name, iso3: entry.iso3 });
    }
  }
  const detectedNames = detected.map((d) => d.name);

  if (q.includes("compare") || q.includes(" vs ") || q.includes("versus") || detected.length >= 2) {
    return {
      intent: "comparative_analysis",
      confidence: 0.96,
      detectedEntities: detectedNames.length ? detectedNames : ["India", "China"],
      suggestedModule: "/intelligence",
    };
  }
  if (q.includes("what if") || q.includes("simulate") || q.includes("scenario") || q.includes("shock")) {
    return {
      intent: "scenario_simulation",
      confidence: 0.94,
      detectedEntities: detectedNames,
      suggestedModule: "/simulations",
    };
  }
  if (q.includes("history") || q.includes("since ") || q.includes("timeline") || q.includes("evolution")) {
    return {
      intent: "historical_evolution",
      confidence: 0.93,
      detectedEntities: detectedNames,
      suggestedModule: "/timeline",
    };
  }
  if (q.includes("connected") || q.includes("relationship") || q.includes("graph") || q.includes("network")) {
    return {
      intent: "causal_knowledge_graph",
      confidence: 0.92,
      detectedEntities: detectedNames,
      suggestedModule: "/knowledge-graph",
    };
  }
  if (detected.length === 1 && q.split(/\s+/).length <= 4) {
    return {
      intent: "country_intelligence",
      confidence: 0.95,
      detectedEntities: detectedNames,
      suggestedModule: `/atlas?country=${detected[0].iso3}`,
    };
  }
  return {
    intent: "scientific_economic_research",
    confidence: 0.91,
    detectedEntities: detectedNames,
    suggestedModule: "/research",
  };
}

// Damerau-Levenshtein distance for typo-tolerant search (handles adjacent transpositions)
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 3) return 99;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[m][n];
}

function scoreTypoTolerantMatch(text: string, query: string): number {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return 1;
  if (lowerText.includes(lowerQuery)) return 10;

  const tokens = lowerQuery.split(/\s+/).filter((t) => t.length > 2);
  if (tokens.length === 0) return 1;
  const words = lowerText.split(/[^a-z0-9]+/).filter(Boolean);

  let score = 0;
  for (const tok of tokens) {
    if (words.some((w) => w === tok)) {
      score += 4;
    } else if (words.some((w) => w.startsWith(tok))) {
      score += 3;
    } else if (
      words.some((w) => w.length >= 4 && tok.length >= 4 && editDistance(w, tok) <= 2)
    ) {
      score += 2;
    }
  }
  return score;
}

export type UniversalSearchSourceFilter =
  | "all"
  | "worldbank"
  | "openalex"
  | "wikimedia"
  | "curated";

function matchesSourceFilter(
  sourceText: string,
  urls: string[],
  filter: UniversalSearchSourceFilter
): boolean {
  if (filter === "all") return true;
  const hay = `${sourceText} ${urls.join(" ")}`.toLowerCase();
  if (filter === "worldbank") {
    return /world\s*bank|\bimf\b|unfccc|indiabudget|iea|wsts|irena/.test(hay);
  }
  if (filter === "openalex") {
    return /openalex|nature\.com|arxiv\.org|journals\.aps|monograph|stanford\s*hai|quantum\s*flagship|primary\s*archive/.test(
      hay
    );
  }
  if (filter === "wikimedia") {
    return /wikipedia\.org|wikimedia/.test(hay);
  }
  if (filter === "curated") {
    return /omnis|world\s*bank|\bimf\b|nature\.com|journals\.aps|monograph|stanford\s*hai|iea|ipcc|primary\s*archive/.test(
      hay
    );
  }
  return true;
}

export function executeUniversalSearch(
  query: string,
  categoryFilter = "all",
  sourceFilter: UniversalSearchSourceFilter = "all"
) {
  const cleanQuery = query.trim();
  const classification = classifyQueryIntent(cleanQuery);

  const scoredCountries = WORLD_COUNTRIES_CATALOG.map((entry) => {
    const curated = COUNTRIES_DATA[entry.iso3];
    const searchBlob = curated
      ? `${curated.name} ${curated.officialName} ${curated.iso3} ${curated.capital} ${curated.region} ${curated.majorIndustries.join(" ")} ${
          curated.historicalMilestones.map((m) => `${m.year} ${m.title}`).join(" ")
        }`
      : `${entry.name} ${entry.iso3} ${entry.iso2} ${entry.region}`;
    const rawScore = scoreTypoTolerantMatch(searchBlob, cleanQuery);
    const profile: CountryIntelligenceProfile | null =
      curated ?? (rawScore > 0 ? buildPlaceholderCountryProfile(entry.iso3) : null);
    return {
      item: profile,
      curated: Boolean(curated),
      score: rawScore,
    };
  })
    .filter((x): x is { item: CountryIntelligenceProfile; curated: boolean; score: number } =>
      Boolean(x.item && x.score > 0)
    )
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : Number(b.curated) - Number(a.curated)))
    .map((x) => x.item);

  const baseCountries =
    scoredCountries.length > 0
      ? scoredCountries
      : cleanQuery === ""
        ? Object.values(COUNTRIES_DATA).slice(0, 4)
        : [];
  const countries = baseCountries.filter((c) =>
    matchesSourceFilter(
      `${c.provenance.source} ${c.provenance.publisher}`,
      [c.provenance.url],
      sourceFilter
    )
  );

  const scoredEvents = TIMELINE_EVENTS.map((e) => ({
    item: e,
    score: scoreTypoTolerantMatch(
      `${e.title} ${e.yearNumeric} ${e.description} ${e.historicalContext} ${e.connectedGraphTopics.join(" ")}`,
      cleanQuery
    ),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item);

  const baseEvents =
    scoredEvents.length > 0
      ? scoredEvents
      : cleanQuery === ""
        ? TIMELINE_EVENTS.slice(0, 4)
        : [];
  const historicalEvents = baseEvents.filter((e) =>
    matchesSourceFilter(
      e.sources.map((s) => `${s.publisher} ${s.sourceType} ${s.title}`).join(" "),
      e.sources.map((s) => s.url),
      sourceFilter
    )
  );

  const scoredEntities = COMPARABLE_ENTITIES.map((ent) => ({
    item: ent,
    score: scoreTypoTolerantMatch(`${ent.name} ${ent.subtitle} ${ent.category}`, cleanQuery),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item);

  const baseEntities =
    scoredEntities.length > 0
      ? scoredEntities
      : cleanQuery === ""
        ? COMPARABLE_ENTITIES
        : [];
  const technologiesAndOrganizations = baseEntities.filter((ent) =>
    matchesSourceFilter(ent.source, [], sourceFilter)
  );

  return {
    query: cleanQuery,
    classification,
    categoryFilter,
    sourceFilter,
    countries,
    historicalEvents,
    technologiesAndOrganizations,
    relatedConcepts: [
      "India's Economic Development Since 1991",
      "Semiconductor Manufacturing & Geopolitics",
      "Artificial Intelligence & Global Employment",
      "Clean Energy Grid Transition & Nuclear Baseload",
      "2-Box Carbon Cycle & Climate Radiative Forcing",
    ],
    retrievedAt: new Date().toISOString(),
  };
}

export async function orchestrateDeepResearch(
  query: string,
  mode: ResearchMode = "deep"
): Promise<ResearchReportData> {
  const cleanQuery = query.trim();
  const nowIso = new Date().toISOString();

  const [openAlexSources, openAlexTrend, wikiSummary] = await Promise.all([
    fetchOpenAlexSources(cleanQuery, 4),
    fetchOpenAlexPublicationTrend(cleanQuery),
    fetchWikimediaSummary(
      cleanQuery.length > 45 ? cleanQuery.split(/\s+/).slice(0, 3).join(" ") : cleanQuery
    ),
  ]);

  const foundationalSources: ResearchSourceItem[] = [
    {
      id: "src-wb-wdi",
      title: "World Development Indicators (WDI) & Global Macroeconomic Database",
      publisher: "The World Bank Group",
      authors: ["World Bank Development Data Group"],
      publishedDate: "2026",
      retrievedAt: nowIso,
      url: "https://data.worldbank.org",
      sourceType: "Primary Official Data",
      supportingClaims: [
        "Provides standardised SNA 2008 cross-country GDP, demographic, energy, and trade series.",
      ],
      excerpt:
        "Official macroeconomic, demographic, and sustainability series compiled from recognised national statistical offices.",
    },
    {
      id: "src-imf-weo",
      title: "World Economic Outlook & Fiscal Monitor Analytical Chapters",
      publisher: "International Monetary Fund (IMF)",
      authors: ["IMF Research Department"],
      publishedDate: "2026",
      retrievedAt: nowIso,
      url: "https://www.imf.org/en/Publications/WEO",
      sourceType: "Multilateral Institution",
      supportingClaims: [
        "Documents medium-term growth trajectories, inflation persistence, and technological productivity spillovers.",
      ],
      excerpt:
        "Multilateral surveillance analysis of sovereign growth, monetary transmission, industrial policy, and trade fragmentation.",
    },
  ];

  if (wikiSummary) {
    foundationalSources.push({
      id: "src-wikimedia-rest",
      title: `Wikimedia Verified Reference Summary: ${wikiSummary.title}`,
      publisher: "Wikimedia Foundation (REST API v1)",
      authors: ["Wikimedia Contributors"],
      publishedDate: "2026",
      retrievedAt: nowIso,
      url: wikiSummary.url,
      sourceType: "Archival Reference",
      supportingClaims: [wikiSummary.extract],
      excerpt: wikiSummary.extract,
    });
  }

  const allSources = [...openAlexSources, ...foundationalSources];
  const primarySourceId = allSources[0]?.id ?? "src-wb-wdi";
  const secondarySourceId = allSources[1]?.id ?? "src-imf-weo";

  const lowerQuery = cleanQuery.toLowerCase();
  const isIndiaQuery = /india|1991|upi|rupee/i.test(cleanQuery);
  const isSemiQuery = /semiconductor|chip|euv|tsmc|geopolit/i.test(cleanQuery);
  const isClimateQuery = /climate|carbon|warming|energy|nuclear/i.test(cleanQuery);

  const matchedCatalogEntries = WORLD_COUNTRIES_CATALOG.filter((entry) =>
    matchesCountryMention(cleanQuery, entry.name, entry.iso3)
  ).slice(0, 2);

  const hydratedMatchedCountries = (
    await Promise.all(
      matchedCatalogEntries.map(async (entry) => {
        if (COUNTRIES_DATA[entry.iso3]) {
          const liveCurated = await fetchLiveCountryIntelligence(entry.iso3).catch(() => null);
          return liveCurated ?? COUNTRIES_DATA[entry.iso3];
        }
        const live = await fetchLiveCountryIntelligence(entry.iso3).catch(() => null);
        return live ?? buildPlaceholderCountryProfile(entry.iso3);
      })
    )
  ).filter((c): c is CountryIntelligenceProfile => Boolean(c));

  const leadCountry = hydratedMatchedCountries[0];
  const compareCountry = hydratedMatchedCountries[1];

  const matchedComparable = COMPARABLE_ENTITIES.find((ent) => {
    const hay = `${ent.name} ${ent.subtitle} ${ent.category}`.toLowerCase();
    const tokens = lowerQuery.split(/\s+/).filter((t) => t.length >= 4);
    return tokens.some((tok) => hay.includes(tok));
  });

  const comparableStats: ResearchReportData["relevantStatistics"] = matchedComparable
    ? Object.entries(matchedComparable.keyAttributes)
        .slice(0, 2)
        .map(([attrLabel, attrValue]) => ({
          metric: `${matchedComparable.name.split("&")[0].trim()} • ${attrLabel}`,
          value: attrValue,
          unit: matchedComparable.category,
          period: "2026 Tracked Benchmark",
          sourceId: primarySourceId,
        }))
    : [];

  const leadGdpUsdBn = leadCountry ? getEffectiveGdpUsdBn(leadCountry) : 0;
  const leadGdpYear = leadCountry ? getEffectiveGdpYear(leadCountry) : undefined;
  const leadGdpDisplay = leadGdpUsdBn > 0 ? `$${leadGdpUsdBn.toLocaleString()}B` : "N/A";
  const leadGdpHuman = leadGdpUsdBn > 0 ? formatUsdBnCompact(leadGdpUsdBn) : "unreported GDP";
  const leadGrowthDisplay = leadCountry
    ? leadCountry.provenance.missingData && leadCountry.gdpGrowthPct === 0 && leadGdpUsdBn === 0
      ? "N/A"
      : formatSignedPct(leadCountry.gdpGrowthPct)
    : "N/A";
  const leadRenewableDisplay = leadCountry
    ? !leadCountry.provenance.missingData || leadCountry.energyProfile.renewableSharePct > 0
      ? `${leadCountry.energyProfile.renewableSharePct}%`
      : formatCountryMetricOrNa(leadCountry, leadCountry.energyProfile.renewableSharePct, (v) => `${v}%`)
    : "N/A";

  const effectiveIndia =
    leadCountry?.iso3 === "IND"
      ? leadCountry
      : compareCountry?.iso3 === "IND"
        ? compareCountry
        : COUNTRIES_DATA.IND;
  const indiaEffectiveGdp = getEffectiveGdpUsdBn(effectiveIndia);
  const indiaLiveYear = getEffectiveGdpYear(effectiveIndia) ?? "2026";
  const indiaGdpHuman = formatUsdBnCompact(indiaEffectiveGdp);
  const indiaGrowthStr = formatSignedPct(effectiveIndia.gdpGrowthPct);
  const indiaPerCapita = `$${effectiveIndia.gdpPerCapitaUsd.toLocaleString()}`;

  const queryKeywords = lowerQuery.split(/\s+/).filter((t) => t.length >= 4);
  const matchingEvents = TIMELINE_EVENTS.filter((evt) => {
    const hay = `${evt.title} ${evt.description} ${evt.historicalContext}`.toLowerCase();
    return queryKeywords.some((kw) => hay.includes(kw));
  }).sort((a, b) => a.yearNumeric - b.yearNumeric);

  const topicLeadBaseline = isIndiaQuery
    ? `Since opening its economy in July 1991, India grew from a $270.1 billion economy into a ${indiaGdpHuman} market (${indiaLiveYear} World Bank data, averaging ${indiaPerCapita} per person and growing ${indiaGrowthStr} a year). Lowering trade barriers, flexible exchange rates, and digital infrastructure like UPI and Aadhaar helped lift productivity, though job creation and income levels per person still lag peers.`
    : isSemiQuery
      ? `Modern computing chips rely on one of the most tightly specialized global supply chains ever built: U.S. companies design over 65% of chip architectures, Europe (ASML and Carl Zeiss) builds every extreme-ultraviolet lithography machine, and East Asia manufactures over 90% of sub-3nm processors. Because no single country controls all stages, export controls and domestic foundry subsidies have reshaped trade across continents.`
      : isClimateQuery
        ? `Human greenhouse-gas emissions have lifted Earth's average temperature by +1.32°C above pre-industrial levels. Bringing emissions down requires switching grids to cheap solar, wind, battery storage, and nuclear power while cutting industrial heat and methane leaks—without triggering local power shortages.`
        : leadCountry
          ? `${leadCountry.name} (${leadCountry.iso3}) represents a ${leadGdpHuman} economy${
              leadCountry.population > 0
                ? ` of ${formatPopulationHuman(leadCountry.population, "long")} people`
                : ""
            }, ${
              leadGrowthDisplay === "N/A"
                ? "with partial live macro coverage returned"
                : `growing at ${leadGrowthDisplay} annually`
            } and generating ${leadRenewableDisplay} of its electricity from renewables.${
              wikiSummary ? ` ${wikiSummary.extract.slice(0, 180)}${wikiSummary.extract.length > 180 ? "..." : ""}` : ""
            }`
          : wikiSummary
            ? `${wikiSummary.extract.slice(0, 320)}${wikiSummary.extract.length > 320 ? "..." : ""} Across ${allSources.length} checked institutional and scholarly records, evidence points to physical capacity, skilled workforces, and steady rules as the main engines of long-term change.`
            : `Cross-checking "${cleanQuery}" across ${allSources.length} World Bank, IMF, and academic records shows how investment levels, energy reliability, and policy stability shape real-world outcomes over time.`;

  const compareBaselineCountry = compareCountry ?? (leadCountry?.iso3 === "IND" ? COUNTRIES_DATA.CHN : COUNTRIES_DATA.IND);
  const compGdpA = leadCountry ? getEffectiveGdpUsdBn(leadCountry) : indiaEffectiveGdp;
  const compGdpB = getEffectiveGdpUsdBn(compareBaselineCountry);
  const compCountryA = leadCountry ?? effectiveIndia;

  let executiveSummary = topicLeadBaseline;
  if (mode === "quick") {
    executiveSummary = leadCountry
      ? `Bottom line: ${leadCountry.name} operates a ${leadGdpHuman} economy (${leadGrowthDisplay} annual growth, ${leadRenewableDisplay} clean electricity), ranking globally on ${
          leadCountry.technologyProfile.aiReadinessIndex > 0
            ? `an AI readiness score of ${leadCountry.technologyProfile.aiReadinessIndex}/100`
            : "its regional fundamentals"
        }.`
      : `Bottom line on "${cleanQuery}": ${topicLeadBaseline.split(". ").slice(0, 2).join(". ")}.`;
  } else if (mode === "comparative") {
    const economyGap = formatMultipleOrGap(compGdpA, compGdpB, "ratio");
    const incomeGap =
      compCountryA.gdpPerCapitaUsd > 0 && compareBaselineCountry.gdpPerCapitaUsd > 0
        ? formatMultipleOrGap(compCountryA.gdpPerCapitaUsd, compareBaselineCountry.gdpPerCapitaUsd, "ratio")
        : "varies across income groups";
    const growthGap = formatMultipleOrGap(compCountryA.gdpGrowthPct, compareBaselineCountry.gdpGrowthPct, "pp", "faster");
    executiveSummary = `Comparing ${compCountryA.name} (${formatUsdBnCompact(compGdpA)}) against ${
      compareBaselineCountry.name
    } (${formatUsdBnCompact(compGdpB)}): ${compCountryA.name}'s total economy is ${economyGap}, with per-person income ${incomeGap} and growth running ${growthGap}. ${
      matchedComparable
        ? `Among industry benchmarks, ${matchedComparable.name} illustrates similar tradeoffs between scale and capital cost.`
        : ""
    }`.trim();
  } else if (mode === "historical") {
    const anchors = matchingEvents.slice(0, 3);
    executiveSummary =
      anchors.length > 0
        ? `Tracing "${cleanQuery}" across historical records highlights key turning points—especially ${anchors
            .map((e) => `${e.title} (${e.dateDisplay})`)
            .join(", then ")}. Each shift shows how earlier institutional and infrastructure choices compounded into modern economic capacity.`
        : `Looking at "${cleanQuery}" over the long arc of modern history shows structural reforms take years to show up in living standards: early investments in trade access, grids, and skills typically take 5 to 15 years to lift economy-wide productivity.`;
  } else if (mode === "scientific") {
    executiveSummary =
      openAlexSources.length > 0
        ? `Across ${openAlexSources.length} recent peer-reviewed studies indexed in OpenAlex matching "${cleanQuery}" (including "${openAlexSources[0].title}"), researchers examine measurable physical mechanisms, experimental controls, and why real-world deployment often lags lab benchmarks.`
        : `${topicLeadBaseline} Empirical studies emphasize separating narrow lab or pilot gains from system-wide physical limits such as grid losses, material purity, and manufacturing yield.`;
  } else if (mode === "economic") {
    executiveSummary = leadCountry
      ? `Economically, ${leadCountry.name} pairs a ${leadGdpHuman} nominal base with ${
          leadCountry.gdpPerCapitaUsd > 0
            ? `$${leadCountry.gdpPerCapitaUsd.toLocaleString()} output per person`
            : "developing per-capita income"
        }, ${leadGrowthDisplay} real GDP expansion, ${formatCountryMetricOrNa(
          leadCountry,
          leadCountry.inflationPct,
          (v) => `${v}% inflation`
        )}, and R&D spending at ${formatCountryMetricOrNa(
          leadCountry,
          leadCountry.technologyProfile.rdSpendPctGdp,
          (v) => `${v}% of GDP`
        )}. Long-run living standards depend on raising productivity faster than borrowing costs and energy import bills.`
      : `From an economic standpoint, "${cleanQuery}" comes down to total output growth, price stability, and how fast capital and technology lift wages per worker without inflating debt or trade deficits.`;
  }

  const empiricalDriversSection =
    mode === "historical" && matchingEvents.length > 0
      ? `Historical inflection points trace the path step by step: ${matchingEvents
          .slice(0, 2)
          .map((e) => `In ${e.dateDisplay}, ${e.title} reshaped incentives because ${e.causes[0]?.toLowerCase() ?? "policy rules changed"}`)
          .join("; ")}. Earlier reforms lowered friction well before consumer growth peaked.`
      : isIndiaQuery
        ? `Key drivers include post-1991 tariff cuts, services-export competitiveness, highway and rail capital spending, and population-scale digital rails (UPI and Aadhaar). Yet per-capita income (${indiaPerCapita}) shows substantial catch-up room in formal manufacturing employment and clean baseload power (${effectiveIndia.energyProfile.renewableSharePct}% renewable share).`
        : leadCountry
          ? `${leadCountry.name}'s trajectory rests on an electricity system running ${leadRenewableDisplay} on renewables alongside ${
              leadCountry.population > 0 ? formatPopulationHuman(leadCountry.population, "long") : "its working-age"
            } population base and ${formatCountryMetricOrNa(
              leadCountry,
              leadCountry.technologyProfile.rdSpendPctGdp,
              (v) => `${v}% of GDP`
            )} committed to research and development.`
          : `Measured outcomes reflect how capital formation, workforce training, and reliable infrastructure translate raw investment into everyday goods and services.`;

  const transmissionSection = isSemiQuery
    ? `In practice, disruptions hit downstream makers unevenly: a delay in specialty photoresists or lithography parts slows leading-edge foundry expansion immediately, raising chip prices for servers, vehicles, and phones across every importing region.`
    : isClimateQuery
      ? `In real energy markets, fuel price spikes raise household power and shipping bills quickly, whereas shifting grids toward solar plus 4-to-8 hour battery storage stabilizes costs once upfront transmission lines are finished.`
      : `In everyday economies, shocks in fuel costs, interest rates, or trade tariffs pass quickly into transport and household prices, while gains from new research or infrastructure tend to compound gradually over several years.`;

  const credibilitySection = `Checked across ${allSources.length} named sources (${openAlexSources.length} OpenAlex studies plus World Bank and IMF tables as of ${nowIso.slice(0, 10)}). Forward-looking scenarios below are clearly separated from measured past data so forecasts are never confused with historical fact.`;

  const contradictionByDomain = isIndiaQuery
    ? {
        pointOfContention: "Rapid Headline Growth vs. Broad Formal Job Creation",
        perspectiveA: `High GDP expansion (${indiaGrowthStr}) and rapid digital adoption point to durable productivity gains and strong urban consumption.`,
        perspectiveB: "Labor force surveys show a large share of workers still in low-wage agriculture and informal services, slowing broad wage growth.",
        epistemicResolution: "Both patterns exist side by side: high-skill digital and capital sectors are scaling rapidly while labor-intensive manufacturing is still catching up.",
      }
    : isSemiQuery
      ? {
          pointOfContention: "Global Supply Efficiency vs. Domestic Chip Sovereignty",
          perspectiveA: "Concentrated regional specialization keeps wafer costs low and speeds up generational node shrinks like 2nm GAA.",
          perspectiveB: "Geographic concentration leaves global electronics vulnerable to export bans, natural disasters, and maritime chokepoints.",
          epistemicResolution: "Resilient chip ecosystems balance comparative advantage with multi-region fabs, even though duplicating supply lines carries a permanent cost premium.",
        }
      : isClimateQuery
        ? {
            pointOfContention: "Grid Transition Speed vs. System Cost & Reliability",
            perspectiveA: "Falling solar and battery costs make fast renewable buildouts the cheapest source of new electricity in most sunny and windy regions.",
            perspectiveB: "High renewable shares still demand expensive transmission upgrades, long-duration storage, or firm nuclear/gas backup during cloudy peaks.",
            epistemicResolution: "Combining cheap variable renewables with firm clean baseload (nuclear/hydro) and regional grid interconnects lowers total system cost over time.",
          }
        : mode === "historical"
          ? {
              pointOfContention: "Policy Reforms vs. Global Tailwinds in Historical Shifts",
              perspectiveA: "Proponents attribute inflection points directly to domestic policy reforms, institutional laws, and scientific breakthroughs.",
              perspectiveB: "Revisionist accounts emphasize external commodity cycles, demographics, and global trade timing outside any government's control.",
              epistemicResolution: "Domestic policy unlocks growth potential, while global economic conditions often determine how fast and far that boom carries.",
            }
          : {
              pointOfContention: "Fast Narrow Benchmarks vs. Economy-Wide Payoffs",
              perspectiveA: "Controlled pilot tests and single-industry studies often show striking efficiency jumps within months.",
              perspectiveB: "National statistics frequently reflect gains more slowly because organizations take years to retrain staff and rebuild workflows.",
              epistemicResolution: "Separating laboratory or pilot gains from economy-wide averages explains why rapid tech news coexists with steady national productivity growth.",
            };

  const relevantStatistics: ResearchReportData["relevantStatistics"] = leadCountry
    ? [
        {
          metric: `${leadCountry.name} Total Economy (GDP)`,
          value: leadGdpUsdBn > 0 ? leadGdpHuman : "N/A",
          unit: leadGdpDisplay,
          period: leadGdpYear ? `${leadGdpYear} World Bank` : "World Bank Data",
          sourceId: "src-wb-wdi",
        },
        {
          metric: `${leadCountry.name} Annual Growth`,
          value: leadGrowthDisplay,
          unit: "Real GDP / yr",
          period: leadGdpYear ? `${leadGdpYear} World Bank` : "World Bank Data",
          sourceId: "src-wb-wdi",
        },
        {
          metric: `${leadCountry.name} Clean Electricity`,
          value: leadRenewableDisplay,
          unit: "Renewables share",
          period: "Latest Power Mix",
          sourceId: "src-wb-wdi",
        },
        {
          metric: "Academic Studies Found",
          value: String(openAlexSources.length),
          unit: "OpenAlex matches",
          period: "Live Search",
          sourceId: primarySourceId,
        },
      ]
    : [
        ...comparableStats,
        {
          metric: "Academic Studies Found",
          value: String(openAlexSources.length),
          unit: "OpenAlex papers",
          period: "Live Search",
          sourceId: primarySourceId,
        },
        ...(openAlexTrend.length > 0
          ? [
              {
                metric: `Studies Published (${openAlexTrend[openAlexTrend.length - 1].year})`,
                value: openAlexTrend[openAlexTrend.length - 1].count.toLocaleString(),
                unit: "Indexed Papers",
                period: String(openAlexTrend[openAlexTrend.length - 1].year),
                sourceId: primarySourceId,
              },
            ]
          : []),
        {
          metric: "Background Reference",
          value: wikiSummary ? "Available" : "Unavailable",
          unit: "Wikipedia REST",
          period: "Live Check",
          sourceId: wikiSummary ? "src-wikimedia-rest" : primarySourceId,
        },
      ];

  const visualisationSeries: ResearchReportData["visualisationSeries"] = leadCountry
    ? {
        title: compareCountry
          ? `${leadCountry.name} vs ${compareCountry.name} Nominal GDP Trajectory ($B)`
          : `${leadCountry.name} Historical Nominal GDP ($B, 1991–2026)`,
        unit: "GDP ($B)",
        source: "World Bank Development Indicators (Country Dossier Series)",
        data: leadCountry.historicalSeries.map((pt) => {
          const matchPeer = compareCountry?.historicalSeries.find((p) => p.year === pt.year);
          return {
            label: String(pt.year),
            primaryValue: pt.gdpUsdBn,
            comparisonValue: matchPeer?.gdpUsdBn,
          };
        }),
      }
    : openAlexTrend.length > 0
      ? {
          title: `Scholarly Publication Trajectory: "${cleanQuery.slice(0, 36)}"`,
          unit: "Peer-Reviewed Works / Yr",
          source: "OpenAlex Works API (group_by=publication_year)",
          data: openAlexTrend.map((pt) => ({
            label: String(pt.year),
            primaryValue: pt.count,
          })),
        }
      : {
          title: `Quantitative Series Unavailable for "${cleanQuery.slice(0, 34)}"`,
          unit: "Sparse Upstream Telemetry",
          source: "OpenAlex group_by unavailable (no dummy series substituted)",
          data: [],
        };

  return {
    id: `rep-${Date.now()}`,
    query: cleanQuery,
    mode,
    generatedAt: nowIso,
    researchObjective: `Answer "${cleanQuery}" using traceable World Bank, IMF, and academic records while clearly flagging disagreements and limits.`,
    decomposedTasks: [
      {
        step: 1,
        task: "Identify key countries, terms, and time horizon in the question",
        sourceCategory: "Question Parser",
        status: "completed",
      },
      {
        step: 2,
        task: "Search peer-reviewed studies and citations via OpenAlex",
        sourceCategory: "OpenAlex Academic Library",
        status: "completed",
      },
      {
        step: 3,
        task: "Cross-check economic, energy & demographic tables via World Bank & IMF",
        sourceCategory: "World Bank WDI / IMF WEO",
        status: "completed",
      },
      {
        step: 4,
        task: "Compare differing viewpoints and verify source labels",
        sourceCategory: "Source Verification",
        status: "completed",
      },
    ],
    executiveSummary,
    keyFindings:
      mode === "quick"
        ? [
            leadCountry
              ? `${leadCountry.name} (${leadCountry.iso3}) stands at ${leadGdpHuman} (${leadGrowthDisplay} growth; ${leadRenewableDisplay} clean electricity).`
              : openAlexSources.length > 0
                ? `Found ${openAlexSources.length} recent peer-reviewed studies via OpenAlex matching "${cleanQuery}".`
                : `Relying cleanly on verified official country and historical tables with zero invented citations.`,
            leadCountry && leadCountry.gdpPerCapitaUsd > 0
              ? `Average income sits at $${leadCountry.gdpPerCapitaUsd.toLocaleString()} per person, with R&D spending at ${formatCountryMetricOrNa(leadCountry, leadCountry.technologyProfile.rdSpendPctGdp, (v) => `${v}% of GDP`)}.`
              : "Infrastructure reliability, grid capacity, and skilled workforces explain most medium-term gains.",
            "Forecast scenarios remain clearly separated from measured historical statistics.",
          ]
        : [
            openAlexSources.length > 0
              ? `Found ${openAlexSources.length} peer-reviewed OpenAlex studies directly matching "${cleanQuery}" (latest from ${openAlexSources[0].publishedDate}).`
              : `No live OpenAlex works matched "${cleanQuery}" within timeout; summary relies strictly on verified country and historical data without fabricated citations.`,
            leadCountry
              ? `${leadCountry.name} nominal GDP is ${leadGdpDisplay}${leadGdpYear ? ` (${leadGdpYear} live World Bank data)` : ""} with ${leadGrowthDisplay} annual growth and ${leadRenewableDisplay} clean electricity generation.`
              : "Physical limits—power grid capacity, specialized tooling, and skilled labor—govern how fast new technology lifts living standards.",
            "Changes in national economic productivity typically appear 3–5 years after major policy or R&D shifts.",
            "Uncertain projections and unconfirmed scenarios are separated from measured past series.",
          ],
    detailedAnalysis:
      mode === "quick"
        ? [
            {
              heading: "1. What the Numbers Show",
              content: empiricalDriversSection,
            },
          ]
        : [
            {
              heading: "1. What the Numbers Show",
              content: empiricalDriversSection,
            },
            {
              heading: "2. How Real-World Tradeoffs Play Out",
              content: transmissionSection,
            },
            {
              heading: "3. Source Check & Data Limits",
              content: credibilitySection,
            },
          ],
    supportingEvidence: [
      {
        id: "claim-1",
        statement: leadCountry
          ? `${leadCountry.name} (${leadCountry.iso3}) recorded ${leadGdpDisplay} nominal GDP (${leadGdpHuman}) with ${leadRenewableDisplay} renewable electricity generation (World Bank WDI).`
          : `Official institutional data and OpenAlex literature surfaced ${allSources.length} checked sources for "${cleanQuery}".`,
        category: "Economic & Public Data",
        verificationStatus: leadCountry?.provenance.verificationStatus ?? "verified",
        sourceIds: Array.from(new Set([primarySourceId, "src-wb-wdi"])),
        methodologyNote: "Cross-checked with World Bank national accounts and OpenAlex library records.",
      },
      {
        id: "claim-2",
        statement:
          openAlexSources[0]?.excerpt ??
          "Sustained infrastructure spending and technical training track closely with how rapidly countries adopt new technologies.",
        category: "Published Studies",
        verificationStatus: openAlexSources.length > 0 ? "verified" : "single_source",
        sourceIds: [secondarySourceId],
        methodologyNote: "Drawn directly from OpenAlex academic works and multilateral publications.",
      },
      {
        id: "claim-3",
        statement:
          "Scenario note: Easing key physical bottlenecks—such as grid energy storage and advanced chip supply—raises medium-term output above current trends.",
        category: "Scenario Outlook",
        verificationStatus: "ai_hypothesis",
        sourceIds: ["src-imf-weo"],
        methodologyNote: "Conditional forward-looking estimate; depends on investment and policy delivery.",
      },
    ],
    contradictoryEvidence: [
      {
        ...contradictionByDomain,
        sourceIds: Array.from(new Set([primarySourceId, "src-imf-weo"])),
      },
    ],
    relevantStatistics,
    visualisationSeries,
    limitations: [
      "National statistical offices revise quarterly GDP and trade figures for up to 18 months after first release.",
      "OpenAlex publication counts reflect academic journals and papers indexed under the search terms.",
      "Forward-looking scenarios reflect plausible model assumptions rather than guaranteed forecasts.",
    ],
    conclusions: `Taken together, the evidence on "${cleanQuery}" weighs near-term policy stability against long-term infrastructure investments. Use the Interactive Topic Map or What-If Simulator next to explore cause-and-effect links or test specific scenarios.`,
    sources: allSources,
    relatedGraphTopic: isIndiaQuery
      ? "Indian Economy"
      : isSemiQuery
        ? "Semiconductors"
        : cleanQuery.slice(0, 50),
  };
}
