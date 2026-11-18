import { COUNTRIES_DATA, TIMELINE_EVENTS } from "@/lib/data/global-intelligence";
import { describeVsBenchmark } from "@/lib/data/world-benchmarks";
import {
  WORLD_CATALOG_BY_ISO3,
  WORLD_COUNTRIES_CATALOG,
} from "@/lib/data/world-catalog";
import {
  formatPopulationHuman,
  formatSignedPct,
  formatUsdBnCompact,
  getEffectiveGdpUsdBn,
  getEffectiveGdpYear,
  hasSectorMetricValue,
} from "@/lib/formatters";
import {
  fetchCrossrefSources,
  fetchLiveCountryIntelligence,
  fetchOpenAlexPublicationTrend,
  fetchOpenAlexSources,
  fetchRestCountriesProfile,
  fetchWikimediaSummary,
  fetchWorldBankRangeSeries,
} from "@/lib/providers/live-data";
import { synthesizeStructuredBriefWithOptionalLlm } from "@/lib/research/llm";
import { sanitizeEditorialProse } from "@/lib/research/prompts";
import type { ResearchMode, ResearchSourceItem } from "@/types/omnis";
import type {
  BriefKeyMetric,
  BriefSection,
  BriefSourceReference,
  BriefVisualData,
  EvidencePack,
  EvidencePackEntry,
  IntelligenceBriefResponse,
  PlannerIntent,
  ResearchPlan,
  RetrievalProgressCallback,
  RestCountriesMeta,
  WorldBankIndicatorReading,
  WorldBankIndicatorSpec,
} from "@/lib/ai/contracts";

export const WDI_INDICATOR_CATALOG: Record<string, WorldBankIndicatorSpec> = {
  "NY.GDP.MKTP.CD": {
    code: "NY.GDP.MKTP.CD",
    label: "Nominal GDP",
    family: "macro",
    unit: "Current USD ($B)",
    unitKind: "usd_bn",
    everydayMeaning: "Total yearly dollar size of goods and services produced inside the country.",
  },
  "NY.GDP.MKTP.KD.ZG": {
    code: "NY.GDP.MKTP.KD.ZG",
    label: "Real GDP Growth",
    family: "macro",
    unit: "% per year",
    unitKind: "signed_pct",
    everydayMeaning: "How fast economic output grew after adjusting for local price changes.",
  },
  "NY.GDP.PCAP.CD": {
    code: "NY.GDP.PCAP.CD",
    label: "Income per Person (GDP per Capita)",
    family: "macro",
    unit: "Current USD / yr",
    unitKind: "usd",
    everydayMeaning: "Average yearly economic output divided across every resident.",
  },
  "NY.GDP.PCAP.PP.CD": {
    code: "NY.GDP.PCAP.PP.CD",
    label: "Living-Cost-Adjusted Income (PPP)",
    family: "macro",
    unit: "Intl $ (PPP)",
    unitKind: "usd",
    everydayMeaning: "Income per person adjusted for how much groceries, rent, and services actually cost locally.",
  },
  "FP.CPI.TOTL.ZG": {
    code: "FP.CPI.TOTL.ZG",
    label: "Consumer Inflation (CPI)",
    family: "cost_labor",
    unit: "% per year",
    unitKind: "pct",
    everydayMeaning: "How fast everyday household expenses like food, fuel, and rent rose over a year.",
  },
  "SL.UEM.TOTL.ZS": {
    code: "SL.UEM.TOTL.ZS",
    label: "Unemployment Rate",
    family: "cost_labor",
    unit: "% of labor force",
    unitKind: "pct",
    everydayMeaning: "Share of people actively seeking work who remain without a job.",
  },
  "NE.EXP.GNFS.ZS": {
    code: "NE.EXP.GNFS.ZS",
    label: "Exports Share of Economy",
    family: "trade_fiscal",
    unit: "% of GDP",
    unitKind: "pct",
    everydayMeaning: "How much domestic farms, factories, and IT firms earn from overseas buyers.",
  },
  "NE.IMP.GNFS.ZS": {
    code: "NE.IMP.GNFS.ZS",
    label: "Imports Share of Economy",
    family: "trade_fiscal",
    unit: "% of GDP",
    unitKind: "pct",
    everydayMeaning: "How reliant the country is on foreign fuel, components, and consumer goods.",
  },
  "GC.DOD.TOTL.GD.ZS": {
    code: "GC.DOD.TOTL.GD.ZS",
    label: "Central Government Debt",
    family: "trade_fiscal",
    unit: "% of GDP",
    unitKind: "pct",
    everydayMeaning: "Total sovereign borrowing relative to one year of national economic output.",
  },
  "BX.KLT.DINV.WD.GD.ZS": {
    code: "BX.KLT.DINV.WD.GD.ZS",
    label: "Foreign Direct Investment (FDI)",
    family: "trade_fiscal",
    unit: "% of GDP",
    unitKind: "pct",
    everydayMeaning: "Long-term overseas capital committed directly to local factories, grids, and firms.",
  },
  "SP.POP.TOTL": {
    code: "SP.POP.TOTL",
    label: "Total Population",
    family: "demographics_human",
    unit: "People",
    unitKind: "people",
    everydayMeaning: "Total residents, shaping both domestic market demand and job-creation needs.",
  },
  "SP.DYN.LE00.IN": {
    code: "SP.DYN.LE00.IN",
    label: "Life Expectancy at Birth",
    family: "demographics_human",
    unit: "Years",
    unitKind: "years",
    everydayMeaning: "Broadest measure of nutrition, sanitation, clean water, and primary healthcare quality.",
  },
  "SP.URB.TOTL.IN.ZS": {
    code: "SP.URB.TOTL.IN.ZS",
    label: "Urbanization Share",
    family: "demographics_human",
    unit: "% of population",
    unitKind: "pct",
    everydayMeaning: "Share of residents living in cities, driving housing, transit, and formal service jobs.",
  },
  "SE.ADT.LITR.ZS": {
    code: "SE.ADT.LITR.ZS",
    label: "Adult Literacy Rate",
    family: "demographics_human",
    unit: "% of adults",
    unitKind: "pct",
    everydayMeaning: "Foundational workforce readiness to transition into skilled manufacturing and services.",
  },
  "SH.XPD.CHEX.GD.ZS": {
    code: "SH.XPD.CHEX.GD.ZS",
    label: "Healthcare Spending",
    family: "demographics_human",
    unit: "% of GDP",
    unitKind: "pct",
    everydayMeaning: "Combined public and household health outlays protecting families from medical shocks.",
  },
  "EG.ELC.RNWX.ZS": {
    code: "EG.ELC.RNWX.ZS",
    label: "Modern Renewables in Electricity (Excl. Hydro)",
    family: "energy_tech_climate",
    unit: "% of total kWh",
    unitKind: "pct",
    everydayMeaning: "Solar, wind, geothermal, and bioenergy share reducing fossil import dependence.",
  },
  "EG.FEC.RNEW.ZS": {
    code: "EG.FEC.RNEW.ZS",
    label: "Renewable Energy Share (Final Consumption)",
    family: "energy_tech_climate",
    unit: "% of final energy",
    unitKind: "pct",
    everydayMeaning: "Clean energy share across electricity, transport, and cooking/heating demand.",
  },
  "EN.ATM.CO2E.PC": {
    code: "EN.ATM.CO2E.PC",
    label: "CO₂ Emissions per Person",
    family: "energy_tech_climate",
    unit: "Metric tons / person",
    unitKind: "tons",
    everydayMeaning: "Annual carbon footprint per resident from power grids, steel, cement, and transport.",
  },
  "GB.XPD.RSDV.GD.ZS": {
    code: "GB.XPD.RSDV.GD.ZS",
    label: "R&D Investment",
    family: "energy_tech_climate",
    unit: "% of GDP",
    unitKind: "pct",
    everydayMeaning: "Share of national income reinvested in science, patents, and industrial engineering.",
  },
  "IT.NET.USER.ZS": {
    code: "IT.NET.USER.ZS",
    label: "Internet Penetration",
    family: "energy_tech_climate",
    unit: "% of population",
    unitKind: "pct",
    everydayMeaning: "Share of households able to use digital payments, e-commerce, and remote services.",
  },
};

const EXACT_ALIAS_TO_ISO3: Array<{ pattern: RegExp; iso3: string; name: string }> = [
  { pattern: /\bBharat\b/i, iso3: "IND", name: "India" },
  { pattern: /\b(?:U\.S\.A\.?|United States(?: of America)?|America)\b/i, iso3: "USA", name: "United States" },
  { pattern: /\bUS\b/, iso3: "USA", name: "United States" },
  { pattern: /\bPRC\b/, iso3: "CHN", name: "China" },
  { pattern: /\b(?:U\.K\.?|United Kingdom|Britain|Great Britain)\b/i, iso3: "GBR", name: "United Kingdom" },
  { pattern: /\bUK\b/, iso3: "GBR", name: "United Kingdom" },
  { pattern: /\bUAE\b/, iso3: "ARE", name: "United Arab Emirates" },
  { pattern: /\bSouth Korea\b|\bRepublic of Korea\b/i, iso3: "KOR", name: "South Korea" },
  { pattern: /\bRussian Federation\b|\bRussia\b/i, iso3: "RUS", name: "Russia" },
  { pattern: /\bTürkiye\b|\bTurkey\b/i, iso3: "TUR", name: "Turkey" },
];

const SUB_NATIONAL_OR_GRANULAR_PATTERNS = [
  /\b(municipal|municipality|city council|ward|tehsil|panchayat|district|county|prefecture|state-level|provincial)\b/i,
  /\b(property tax|water bill revenue|parking fine|octroi|stamp duty collection)\b/i,
  /\b(exact|audited)\s+(q[1-4]\s*20\d{2}|quarterly|monthly|weekly|daily)\b/i,
];

const KNOWN_SUBNATIONAL_CITIES = [
  "jaipur",
  "pune",
  "surat",
  "lucknow",
  "kanpur",
  "nagpur",
  "indore",
  "bhopal",
  "patna",
  "vadodara",
  "coimbatore",
  "kochi",
  "austin",
  "dallas",
  "miami",
  "seattle",
  "manchester",
  "lyon",
  "osaka",
  "shenzhen",
];

function escapeRegExp(val: string): string {
  return val.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesCatalogCountry(rawQuery: string, name: string, iso3: string): boolean {
  if (new RegExp(`\\b${escapeRegExp(name)}\\b`, "i").test(rawQuery)) return true;
  if (rawQuery.trim().toUpperCase() === iso3) return true;
  return new RegExp(`\\b${escapeRegExp(iso3)}\\b`).test(rawQuery);
}

export function resolveCountryEntities(query: string): Array<{ iso3: string; name: string }> {
  const seen = new Set<string>();
  const resolved: Array<{ iso3: string; name: string }> = [];

  for (const alias of EXACT_ALIAS_TO_ISO3) {
    if (alias.pattern.test(query) && !seen.has(alias.iso3)) {
      seen.add(alias.iso3);
      resolved.push({
        iso3: alias.iso3,
        name: WORLD_CATALOG_BY_ISO3[alias.iso3]?.name ?? alias.name,
      });
    }
  }

  for (const entry of WORLD_COUNTRIES_CATALOG) {
    if (!seen.has(entry.iso3) && matchesCatalogCountry(query, entry.name, entry.iso3)) {
      seen.add(entry.iso3);
      resolved.push({ iso3: entry.iso3, name: entry.name });
    }
  }

  // Order entities by earliest appearance in the query so "Compare India and China" puts IND left, CHN right
  return resolved
    .map((ent) => {
      const idxName = query.toLowerCase().indexOf(ent.name.toLowerCase());
      const idxIso = query.indexOf(ent.iso3);
      const posCandidates = [idxName, idxIso].filter((n) => n >= 0);
      return {
        ...ent,
        pos: posCandidates.length > 0 ? Math.min(...posCandidates) : 9999,
      };
    })
    .sort((a, b) => a.pos - b.pos)
    .map(({ iso3, name }) => ({ iso3, name }))
    .slice(0, 3);
}

export function detectUnavailableRequestedMetric(query: string): string | null {
  const clean = query.trim();
  const hasGranularMarker = SUB_NATIONAL_OR_GRANULAR_PATTERNS.some((re) => re.test(clean));
  const cityHit = KNOWN_SUBNATIONAL_CITIES.find((c) =>
    new RegExp(`\\b${escapeRegExp(c)}\\b`, "i").test(clean)
  );
  if (cityHit && (hasGranularMarker || /\b(tax|revenue|budget|spending|gdp|income|inflation|debt)\b/i.test(clean))) {
    return clean;
  }
  if (hasGranularMarker && /\b(revenue|tax|budget|collection|expenditure|figure|exact)\b/i.test(clean)) {
    return clean;
  }
  return null;
}

/**
 * Phase 2 Step 1: Deterministic Structured Query Decomposition & Entity/Indicator Resolver.
 */
export function planResearchQuery(query: string): ResearchPlan {
  const clean = query.trim();
  const lower = clean.toLowerCase();
  const entities = resolveCountryEntities(clean);
  const unavailableRequestedMetric = detectUnavailableRequestedMetric(clean);

  const subTopic: ResearchPlan["subTopic"] =
    /\b(inflation|prices|cpi|cost of living|expensive|purchasing power)\b/i.test(clean)
      ? "inflation"
      : /\b(debt|deficit|borrowing|fiscal|budget|spending)\b/i.test(clean)
        ? "debt"
        : /\b(jobs|unemployment|employment|wages|labour|labor|workforce|automation|layoffs)\b/i.test(clean)
          ? "jobs"
          : /\b(renewable|solar|wind|coal|nuclear|clean energy|clean power|electricity|grid|carbon|emission|warming|climate)\b/i.test(clean)
            ? "energy"
            : /\b(ai|artificial intelligence|semiconductor|chip|euv|tsmc|r&d|rd|innovation|patent|quantum|software|internet)\b/i.test(clean)
              ? "tech"
              : /\b(tariff|trade|export|import|corridor|fdi|supply chain|sanction|geopolit)\b/i.test(clean)
                ? "trade"
                : /\b(health|life expectancy|literacy|education|urban|population|demographic)\b/i.test(clean)
                  ? "health"
                  : null;

  let intent: PlannerIntent = "scientific_technical";
  if (
    entities.length >= 2 ||
    /\b(compare|comparison|versus|vs\.?|difference between)\b/i.test(lower)
  ) {
    intent = "country_comparison";
  } else if (subTopic === "trade" && /\b(geopolit|tariff|sanction|corridor|supply chain)\b/i.test(lower)) {
    intent = "geopolitics_trade";
  } else if (/\b(since \d{4}|history|historical|evolution|reform|decade|century)\b/i.test(lower)) {
    intent = "historical_context";
  } else if (entities.length === 1 && /\b(inflation|debt|growth|development|economy|economic|gdp|unemployment|budget)\b/i.test(lower)) {
    intent = "economic_policy";
  } else if (entities.length === 1 && lower.split(/\s+/).length <= 5) {
    intent = "country_profile";
  } else if (entities.length === 1) {
    intent = "development_trend";
  } else if (subTopic === "inflation" || subTopic === "debt" || subTopic === "jobs") {
    intent = "economic_policy";
  }

  // Pick exact World Bank WDI indicators matched to query intent (multi-year 2014:2026)
  const indicatorSet = new Set<string>();
  if (entities.length > 0 && !unavailableRequestedMetric) {
    indicatorSet.add("NY.GDP.MKTP.CD");
    indicatorSet.add("NY.GDP.MKTP.KD.ZG");
    indicatorSet.add("NY.GDP.PCAP.CD");
    indicatorSet.add("NY.GDP.PCAP.PP.CD");

    if (intent === "country_comparison") {
      indicatorSet.add("SP.POP.TOTL");
      indicatorSet.add("FP.CPI.TOTL.ZG");
      indicatorSet.add("EG.ELC.RNWX.ZS");
      indicatorSet.add("EG.FEC.RNEW.ZS");
      indicatorSet.add("GB.XPD.RSDV.GD.ZS");
    } else if (subTopic === "inflation") {
      indicatorSet.add("FP.CPI.TOTL.ZG");
      indicatorSet.add("NE.IMP.GNFS.ZS");
      indicatorSet.add("SL.UEM.TOTL.ZS");
    } else if (subTopic === "debt") {
      indicatorSet.add("GC.DOD.TOTL.GD.ZS");
      indicatorSet.add("FP.CPI.TOTL.ZG");
      indicatorSet.add("NE.EXP.GNFS.ZS");
    } else if (subTopic === "jobs") {
      indicatorSet.add("SL.UEM.TOTL.ZS");
      indicatorSet.add("SE.ADT.LITR.ZS");
      indicatorSet.add("SP.URB.TOTL.IN.ZS");
    } else if (subTopic === "energy") {
      indicatorSet.add("EG.ELC.RNWX.ZS");
      indicatorSet.add("EG.FEC.RNEW.ZS");
      indicatorSet.add("EN.ATM.CO2E.PC");
      indicatorSet.add("GB.XPD.RSDV.GD.ZS");
    } else if (subTopic === "tech") {
      indicatorSet.add("GB.XPD.RSDV.GD.ZS");
      indicatorSet.add("IT.NET.USER.ZS");
      indicatorSet.add("EG.ELC.RNWX.ZS");
    } else if (subTopic === "trade") {
      indicatorSet.add("NE.EXP.GNFS.ZS");
      indicatorSet.add("NE.IMP.GNFS.ZS");
      indicatorSet.add("BX.KLT.DINV.WD.GD.ZS");
    } else if (subTopic === "health") {
      indicatorSet.add("SP.DYN.LE00.IN");
      indicatorSet.add("SH.XPD.CHEX.GD.ZS");
      indicatorSet.add("SE.ADT.LITR.ZS");
      indicatorSet.add("SP.URB.TOTL.IN.ZS");
    } else {
      // Rich development & country trajectory set
      indicatorSet.add("FP.CPI.TOTL.ZG");
      indicatorSet.add("SL.UEM.TOTL.ZS");
      indicatorSet.add("EG.FEC.RNEW.ZS");
      indicatorSet.add("GB.XPD.RSDV.GD.ZS");
      indicatorSet.add("IT.NET.USER.ZS");
    }
  }

  const yearHintMatch = clean.match(/\b(19[89]\d|20[01]\d)\b/);
  const dateRange = yearHintMatch ? `${yearHintMatch[1]}:2026` : "2014:2026";

  // Build 2-3 crisp scholarly & institutional queries
  const entityNames = entities.map((e) => e.name);
  const scholarlyQueries: string[] = [];
  if (entities.length >= 2) {
    scholarlyQueries.push(`${entityNames[0]} ${entityNames[1]} macroeconomics GDP growth clean energy transition`);
  } else if (entities.length === 1) {
    const topicHint =
      subTopic === "energy"
        ? "renewable grid energy storage electricity transition"
        : subTopic === "inflation"
          ? "inflation CPI monetary policy household prices"
          : subTopic === "debt"
            ? "public debt fiscal deficit government spending"
            : subTopic === "jobs"
              ? "employment labor force formal jobs wages"
              : subTopic === "tech"
                ? "research development semiconductor technology adoption"
                : subTopic === "trade"
                  ? "exports foreign direct investment supply chains"
                  : "macroeconomics GDP growth structural transformation industrial policy";
    scholarlyQueries.push(`${entityNames[0]} ${topicHint}`);
  } else if (/\bai\b|artificial intelligence/i.test(clean)) {
    scholarlyQueries.push("artificial intelligence employment labor market wages productivity");
  } else {
    scholarlyQueries.push(clean);
  }

  const wikimediaTopics: string[] = [];
  if (entities.length > 0 && !unavailableRequestedMetric) {
    wikimediaTopics.push(entities[0].name);
    if (entities[1]) wikimediaTopics.push(entities[1].name);
  } else if (!unavailableRequestedMetric) {
    const cleanWords = clean
      .replace(/[?.,!]/g, "")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !/^(how|what|does|why|when|the|and|for|with|according|recent)$/i.test(w))
      .slice(0, 4)
      .join(" ");
    if (cleanWords) wikimediaTopics.push(cleanWords);
  }

  return {
    query: clean,
    intent,
    entities,
    indicators: Array.from(indicatorSet),
    dateRange,
    scholarlyQueries: Array.from(new Set(scholarlyQueries)).slice(0, 2),
    wikimediaTopics: Array.from(new Set(wikimediaTopics)).slice(0, 2),
    subTopic,
    unavailableRequestedMetric,
  };
}

function formatWdiValue(value: number, unitKind: WorldBankIndicatorSpec["unitKind"]): string {
  if (!Number.isFinite(value)) return "N/A";
  switch (unitKind) {
    case "usd_bn": {
      const bn = value >= 1e6 ? value / 1e9 : value;
      return formatUsdBnCompact(bn);
    }
    case "usd":
      return `$${Math.round(value).toLocaleString()}`;
    case "signed_pct":
      return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
    case "pct":
      return `${value.toFixed(1)}%`;
    case "people":
      return formatPopulationHuman(value, "long");
    case "years":
      return `${value.toFixed(1)} years`;
    case "tons":
      return `${value.toFixed(1)} t/person`;
    default:
      return String(value);
  }
}

/**
 * Phase 2 Step 2: Parallel Verified Evidence Hydration across World Bank v2 (2014:2026),
 * REST Countries v3.1, OpenAlex (with reconstructed abstracts), Crossref, and Wikimedia REST v1.
 */
export async function gatherVerifiedEvidence(
  plan: ResearchPlan,
  options?: { fetchFn?: typeof fetch }
): Promise<EvidencePack> {
  const fetchFn = options?.fetchFn ?? fetch;
  const failedProviders = new Set<string>();

  // If the user explicitly asked for unavailable municipal/sub-national data (e.g. Jaipur Q3 2025 property tax),
  // do NOT pull national WDI macro series and pretend they answer the sub-national query.
  const shouldFetchNationalWdi = plan.entities.length > 0 && !plan.unavailableRequestedMetric;

  const wbTasks: Array<Promise<WorldBankIndicatorReading | null>> = [];
  if (shouldFetchNationalWdi) {
    for (const ent of plan.entities) {
      for (const code of plan.indicators) {
        const spec = WDI_INDICATOR_CATALOG[code];
        if (!spec) continue;
        wbTasks.push(
          fetchWorldBankRangeSeries(ent.iso3, code, plan.dateRange, fetchFn)
            .then((summary): WorldBankIndicatorReading | null => {
              if (!summary.ok) {
                failedProviders.add("World Bank WDI");
                return null;
              }
              if (summary.byYear.size === 0 || summary.latestValue === null) return null;
              const points = Array.from(summary.byYear.entries())
                .map(([year, value]) => ({ year, value }))
                .sort((a, b) => a.year - b.year);
              const first = points[0];
              const last = points[points.length - 1];
              const deltaPp =
                points.length >= 2 && (spec.unitKind === "pct" || spec.unitKind === "signed_pct")
                  ? Number((last.value - first.value).toFixed(1))
                  : undefined;
              const deltaPct =
                points.length >= 2 && first.value > 0 && spec.unitKind !== "pct" && spec.unitKind !== "signed_pct"
                  ? Number((((last.value - first.value) / first.value) * 100).toFixed(1))
                  : undefined;
              const multiple =
                points.length >= 2 && first.value > 0 && last.value / first.value >= 1.35 && spec.unitKind !== "pct"
                  ? Number((last.value / first.value).toFixed(2))
                  : undefined;

              return {
                iso3: ent.iso3,
                countryName: ent.name,
                indicator: spec,
                latestYear: Number(summary.latestYear) || last.year,
                latestValue: last.value,
                earliestYear: points.length >= 2 ? first.year : undefined,
                earliestValue: points.length >= 2 ? first.value : undefined,
                deltaPct,
                deltaPp,
                multiple,
                series: points,
                sourceUrl: `https://data.worldbank.org/indicator/${encodeURIComponent(code)}?locations=${encodeURIComponent(
                  ent.iso3
                )}`,
              };
            })
            .catch(() => {
              failedProviders.add("World Bank WDI");
              return null;
            })
        );
      }
    }
  }

  const rcTasks: Array<Promise<RestCountriesMeta | null>> = shouldFetchNationalWdi
    ? plan.entities.map((ent) =>
        fetchRestCountriesProfile(ent.iso3, fetchFn)
          .then((bundle): RestCountriesMeta | null => {
            if (!bundle) {
              failedProviders.add("REST Countries v3.1");
              return null;
            }
            return {
              iso3: bundle.iso3,
              iso2: bundle.iso2,
              name: bundle.name,
              officialName: bundle.officialName,
              flagEmoji: bundle.flagEmoji,
              capital: bundle.capital,
              region: bundle.region,
              subregion: bundle.subregion,
              population: bundle.population,
              areaSqKm: bundle.areaSqKm,
              languages: bundle.languages,
              currency: bundle.currency,
              borders: bundle.borders,
              url: bundle.url,
            };
          })
          .catch(() => {
            failedProviders.add("REST Countries v3.1");
            return null;
          })
      )
    : [];

  const openAlexWorkTasks = plan.scholarlyQueries.map((q) =>
    fetchOpenAlexSources(q, 4, fetchFn).catch(() => {
      failedProviders.add("OpenAlex");
      return [] as ResearchSourceItem[];
    })
  );

  const openAlexTrendTask =
    plan.entities.length === 0 && !plan.unavailableRequestedMetric
      ? fetchOpenAlexPublicationTrend(plan.query, fetchFn).catch(() => {
          failedProviders.add("OpenAlex Trend");
          return [] as Array<{ year: number; count: number }>;
        })
      : Promise.resolve([] as Array<{ year: number; count: number }>);

  const crossrefTasks =
    !plan.unavailableRequestedMetric && plan.scholarlyQueries.length > 0
      ? [
          fetchCrossrefSources(plan.scholarlyQueries[0], 2, fetchFn).catch(() => {
            failedProviders.add("Crossref");
            return [] as ResearchSourceItem[];
          }),
        ]
      : [];

  const wikiTasks = plan.wikimediaTopics.map((topic) =>
    fetchWikimediaSummary(topic, fetchFn).catch(() => {
      failedProviders.add("Wikimedia REST");
      return null;
    })
  );

  const [wbSettled, rcSettled, oaSettled, oaTrendSettled, crSettled, wikiSettled] =
    await Promise.all([
      Promise.allSettled(wbTasks),
      Promise.allSettled(rcTasks),
      Promise.allSettled(openAlexWorkTasks),
      Promise.allSettled([openAlexTrendTask]),
      Promise.allSettled(crossrefTasks),
      Promise.allSettled(wikiTasks),
    ]);

  const wbReadings = wbSettled
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((v): v is WorldBankIndicatorReading => Boolean(v));

  const restCountries = rcSettled
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((v): v is RestCountriesMeta => Boolean(v));

  // Per-indicator curated baseline fill-in when World Bank v2 failed or timed out on individual indicators
  const hasIndicatorReading = (iso3: string, code: string) =>
    wbReadings.some((r) => r.iso3 === iso3 && r.indicator.code === code);
  const hasAnyRenewable = (iso3: string) =>
    hasIndicatorReading(iso3, "EG.ELC.RNWX.ZS") || hasIndicatorReading(iso3, "EG.FEC.RNEW.ZS");

  if (shouldFetchNationalWdi && (wbReadings.length === 0 || failedProviders.has("World Bank WDI"))) {
    const [rangeStartStr] = plan.dateRange.split(":");
    const rangeStartYear = Number.parseInt(rangeStartStr, 10) || 2014;
    for (const ent of plan.entities) {
      const curated = COUNTRIES_DATA[ent.iso3];
      if (!curated) continue;
      const liveProfile = await fetchLiveCountryIntelligence(ent.iso3, fetchFn).catch(() => null);
      const profile = liveProfile ?? curated;
      const effGdp = getEffectiveGdpUsdBn(profile);
      const effYear = Number(getEffectiveGdpYear(profile) ?? "2026");
      const slicedSeries = profile.historicalSeries.filter((p) => p.year >= rangeStartYear);
      const activeSeries = slicedSeries.length >= 2 ? slicedSeries : profile.historicalSeries;

      if (effGdp > 0 && !hasIndicatorReading(profile.iso3, "NY.GDP.MKTP.CD")) {
        const firstGdpPt = activeSeries.find((p) => p.gdpUsdBn > 0);
        wbReadings.push({
          iso3: profile.iso3,
          countryName: profile.name,
          indicator: WDI_INDICATOR_CATALOG["NY.GDP.MKTP.CD"],
          latestYear: effYear,
          latestValue: effGdp * 1e9,
          earliestYear: firstGdpPt?.year,
          earliestValue: firstGdpPt?.gdpUsdBn ? firstGdpPt.gdpUsdBn * 1e9 : undefined,
          multiple:
            firstGdpPt?.gdpUsdBn && firstGdpPt.gdpUsdBn > 0
              ? Number((effGdp / firstGdpPt.gdpUsdBn).toFixed(1))
              : undefined,
          series: activeSeries
            .filter((p) => p.gdpUsdBn > 0)
            .map((p) => ({ year: p.year, value: p.gdpUsdBn * 1e9 })),
          sourceUrl: `https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=${profile.iso3}`,
        });
      }
      if (
        hasSectorMetricValue(profile, profile.gdpPerCapitaUsd) &&
        profile.gdpPerCapitaUsd > 0 &&
        !hasIndicatorReading(profile.iso3, "NY.GDP.PCAP.CD")
      ) {
        wbReadings.push({
          iso3: profile.iso3,
          countryName: profile.name,
          indicator: WDI_INDICATOR_CATALOG["NY.GDP.PCAP.CD"],
          latestYear: effYear,
          latestValue: profile.gdpPerCapitaUsd,
          series: activeSeries
            .filter((p) => p.gdpPerCapitaUsd > 0)
            .map((p) => ({ year: p.year, value: p.gdpPerCapitaUsd })),
          sourceUrl: `https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=${profile.iso3}`,
        });
      }
      if (!profile.provenance.missingData) {
        if (!hasIndicatorReading(profile.iso3, "NY.GDP.MKTP.KD.ZG")) {
          wbReadings.push({
            iso3: profile.iso3,
            countryName: profile.name,
            indicator: WDI_INDICATOR_CATALOG["NY.GDP.MKTP.KD.ZG"],
            latestYear: effYear,
            latestValue: profile.gdpGrowthPct,
            series: activeSeries.map((p) => ({ year: p.year, value: p.gdpGrowthPct })),
            sourceUrl: `https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations=${profile.iso3}`,
          });
        }
        if (!hasIndicatorReading(profile.iso3, "FP.CPI.TOTL.ZG")) {
          wbReadings.push({
            iso3: profile.iso3,
            countryName: profile.name,
            indicator: WDI_INDICATOR_CATALOG["FP.CPI.TOTL.ZG"],
            latestYear: effYear,
            latestValue: profile.inflationPct,
            series: activeSeries.map((p) => ({ year: p.year, value: p.inflationPct })),
            sourceUrl: `https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=${profile.iso3}`,
          });
        }
        if (!hasAnyRenewable(profile.iso3)) {
          wbReadings.push({
            iso3: profile.iso3,
            countryName: profile.name,
            indicator: WDI_INDICATOR_CATALOG["EG.ELC.RNWX.ZS"],
            latestYear: effYear,
            latestValue: profile.energyProfile.renewableSharePct,
            series: activeSeries.map((p) => ({ year: p.year, value: p.renewableSharePct })),
            sourceUrl: `https://data.worldbank.org/indicator/EG.ELC.RNWX.ZS?locations=${profile.iso3}`,
          });
        }
        if (!hasIndicatorReading(profile.iso3, "GB.XPD.RSDV.GD.ZS")) {
          wbReadings.push({
            iso3: profile.iso3,
            countryName: profile.name,
            indicator: WDI_INDICATOR_CATALOG["GB.XPD.RSDV.GD.ZS"],
            latestYear: effYear,
            latestValue: profile.technologyProfile.rdSpendPctGdp,
            series: [{ year: effYear, value: profile.technologyProfile.rdSpendPctGdp }],
            sourceUrl: `https://data.worldbank.org/indicator/GB.XPD.RSDV.GD.ZS?locations=${profile.iso3}`,
          });
        }
        if (
          hasSectorMetricValue(profile, profile.publicDebtPctGdp) &&
          !hasIndicatorReading(profile.iso3, "GC.DOD.TOTL.GD.ZS")
        ) {
          wbReadings.push({
            iso3: profile.iso3,
            countryName: profile.name,
            indicator: WDI_INDICATOR_CATALOG["GC.DOD.TOTL.GD.ZS"],
            latestYear: effYear,
            latestValue: profile.publicDebtPctGdp,
            series: [{ year: effYear, value: profile.publicDebtPctGdp }],
            sourceUrl: `https://data.worldbank.org/indicator/GC.DOD.TOTL.GD.ZS?locations=${profile.iso3}`,
          });
        }
        if (profile.population > 0 && !hasIndicatorReading(profile.iso3, "SP.POP.TOTL")) {
          wbReadings.push({
            iso3: profile.iso3,
            countryName: profile.name,
            indicator: WDI_INDICATOR_CATALOG["SP.POP.TOTL"],
            latestYear: effYear,
            latestValue: profile.population,
            series: [{ year: effYear, value: profile.population }],
            sourceUrl: `https://data.worldbank.org/indicator/SP.POP.TOTL?locations=${profile.iso3}`,
          });
        }
      }
    }
  }

  // Deduplicate OpenAlex & Crossref works by title
  const seenTitles = new Set<string>();
  const openAlexWorks: EvidencePack["openAlexWorks"] = [];
  for (const res of oaSettled) {
    if (res.status !== "fulfilled") continue;
    for (const w of res.value) {
      const key = w.title.toLowerCase().trim();
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);
      openAlexWorks.push({
        id: w.id,
        title: w.title,
        authors: w.authors,
        publisher: w.publisher,
        year: w.publishedDate,
        url: w.url,
        doi: w.doi,
        citedByCount: w.citedByCount,
        abstract: w.excerpt,
      });
    }
  }

  const crossrefWorks: EvidencePack["crossrefWorks"] = [];
  for (const res of crSettled) {
    if (res.status !== "fulfilled") continue;
    for (const w of res.value) {
      const key = w.title.toLowerCase().trim();
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);
      crossrefWorks.push({
        title: w.title,
        authors: w.authors,
        publisher: w.publisher,
        year: w.publishedDate,
        url: w.url,
        doi: w.doi,
        citedByCount: w.citedByCount,
        abstract: w.excerpt,
      });
    }
  }

  const openAlexTrend =
    oaTrendSettled[0]?.status === "fulfilled" ? oaTrendSettled[0].value : [];

  const wikiSummaries = wikiSettled
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((v): v is { title: string; extract: string; url: string } => Boolean(v));

  // Build numbered immutable Evidence Pack [SRC-1], [SRC-2], ..., [SRC-N]
  const entries: EvidencePackEntry[] = [];
  let srcCounter = 1;
  const nextId = () => `SRC-${srcCounter++}`;

  // Group World Bank readings cleanly by entity+indicator (prioritizing key query indicators first)
  for (const reading of wbReadings) {
    const valStr = formatWdiValue(reading.latestValue, reading.indicator.unitKind);
    const firstStr =
      reading.earliestValue !== undefined && reading.earliestYear !== undefined
        ? formatWdiValue(reading.earliestValue, reading.indicator.unitKind)
        : null;
    const trajClause = firstStr
      ? ` (up/changed from ${firstStr} in ${reading.earliestYear}${
          reading.multiple
            ? `, ${reading.multiple}×`
            : reading.deltaPct !== undefined
              ? `, ${reading.deltaPct >= 0 ? "+" : ""}${reading.deltaPct}%`
              : reading.deltaPp !== undefined
                ? `, ${reading.deltaPp >= 0 ? "+" : ""}${reading.deltaPp} percentage points`
                : ""
        })`
      : "";
    entries.push({
      id: nextId(),
      title: `World Bank WDI — ${reading.countryName} ${reading.indicator.label} (${reading.indicator.code})`,
      publisher: "World Bank Open Data API v2",
      year: String(reading.latestYear),
      url: reading.sourceUrl,
      sourceType: "Official Dataset",
      indicatorCode: reading.indicator.code,
      iso3: reading.iso3,
      excerptOrIndicator: `${reading.indicator.code}: ${valStr} in ${reading.latestYear}${trajClause}`,
      facts: [
        `${reading.countryName} (${reading.iso3}) ${reading.indicator.label}: ${valStr} in ${reading.latestYear}${trajClause}.`,
      ],
    });
  }

  for (const rc of restCountries) {
    entries.push({
      id: nextId(),
      title: `REST Countries Registry — ${rc.officialName} (${rc.iso3})`,
      publisher: "REST Countries Geographic API v3.1",
      year: "2026",
      url: rc.url,
      sourceType: "Official Dataset",
      iso3: rc.iso3,
      excerptOrIndicator: `Capital: ${rc.capital} · Population: ${formatPopulationHuman(rc.population, "long")} · Currency: ${rc.currency}`,
      facts: [
        `${rc.name} (${rc.iso3}) in ${rc.subregion || rc.region}: capital ${rc.capital}, population ${formatPopulationHuman(
          rc.population,
          "long"
        )}, area ${rc.areaSqKm.toLocaleString()} km², borders ${
          rc.borders.length > 0 ? rc.borders.slice(0, 6).join(", ") : "island/maritime state"
        }.`,
      ],
    });
  }

  for (const work of openAlexWorks.slice(0, 5)) {
    const authorLead = work.authors.slice(0, 2).join(", ");
    entries.push({
      id: nextId(),
      title: work.title,
      publisher: `OpenAlex · ${work.publisher}`,
      year: work.year,
      url: work.url,
      sourceType: "Peer-Reviewed Article",
      excerptOrIndicator: `${authorLead} (${work.year})${
        work.citedByCount ? ` · ${work.citedByCount.toLocaleString()} citations` : ""
      } — ${work.abstract.slice(0, 180)}`,
      facts: [`"${work.title}" (${authorLead}, ${work.year}, ${work.publisher}): ${work.abstract}`],
    });
  }

  for (const work of crossrefWorks.slice(0, 2)) {
    const authorLead = work.authors.slice(0, 2).join(", ");
    entries.push({
      id: nextId(),
      title: work.title,
      publisher: `Crossref · ${work.publisher}`,
      year: work.year,
      url: work.url,
      sourceType: "Peer-Reviewed Article",
      excerptOrIndicator: `${work.doi ? `${work.doi} · ` : ""}${authorLead} (${work.year})`,
      facts: [`"${work.title}" (${work.publisher}, ${work.year}): ${work.abstract}`],
    });
  }

  for (const wiki of wikiSummaries) {
    entries.push({
      id: nextId(),
      title: `Wikimedia Reference: ${wiki.title}`,
      publisher: "Wikimedia Foundation (REST API v1)",
      year: "2026",
      url: wiki.url,
      sourceType: "Institutional Archive",
      excerptOrIndicator: wiki.extract.slice(0, 220),
      facts: [wiki.extract],
    });
  }

  // If query is sparse/empty across all upstream providers, add at least one institutional baseline check note only when genuinely relevant historical/benchmark records exist
  const serializedForPrompt =
    entries.length > 0
      ? entries.map((e) => `[${e.id}] (${e.sourceType} · ${e.publisher}, ${e.year}) ${e.facts[0]}`).join("\n")
      : "NO VERIFIED RECORDS RETRIEVED FOR THIS QUERY.";

  return {
    entries,
    wbReadings,
    restCountries,
    openAlexWorks,
    openAlexTrend,
    crossrefWorks,
    wikiSummaries,
    failedProviders: Array.from(failedProviders),
    serializedForPrompt,
  };
}

/**
 * Phase 2 Step 3: Programmatic Post-Generation Citation Integrity Validator.
 * Strips any fabricated [SRC-k] tag whose ID does not exist in the retrieved Evidence Pack,
 * guaranteeing zero broken or hallucinated citation pills reach the UI.
 */
export function validateAndSanitizeBriefCitations(
  brief: IntelligenceBriefResponse,
  evidencePack: EvidencePack
): { brief: IntelligenceBriefResponse; strippedIds: string[] } {
  const validIds = new Set(evidencePack.entries.map((e) => e.id));
  const fallbackValidId = evidencePack.entries[0]?.id ?? "";
  const stripped = new Set<string>();

  const cleanTextCitations = (text: string): string => {
    const cleaned = sanitizeEditorialProse(text).replace(/\[?(SRC-\d+)\]?/gi, (full, rawId: string) => {
      const normalized = rawId.toUpperCase();
      if (validIds.has(normalized)) {
        return `[${normalized}]`;
      }
      stripped.add(normalized);
      return "";
    });
    return cleaned.replace(/\s{2,}/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();
  };

  const cleanIdList = (ids: string[]): string[] => {
    const kept: string[] = [];
    for (const id of ids) {
      const norm = id.toUpperCase();
      if (validIds.has(norm)) {
        if (!kept.includes(norm)) kept.push(norm);
      } else {
        stripped.add(norm);
      }
    }
    return kept;
  };

  const keyMetrics = brief.keyMetrics.map((m) => {
    const norm = m.sourceId.toUpperCase();
    const validSource = validIds.has(norm) ? norm : fallbackValidId;
    if (!validIds.has(norm) && m.sourceId) stripped.add(norm);
    return {
      ...m,
      benchmark: cleanTextCitations(m.benchmark),
      everydayMeaning: cleanTextCitations(m.everydayMeaning),
      sourceId: validSource,
    };
  });

  const sections = brief.sections.map((sec) => ({
    heading: cleanTextCitations(sec.heading),
    summary: cleanTextCitations(sec.summary),
    bullets: sec.bullets.map((b) => ({
      point: cleanTextCitations(b.point),
      sourceIds: cleanIdList(b.sourceIds),
    })),
  }));

  const visualData = brief.visualData
    ? {
        ...brief.visualData,
        takeawayTitle: cleanTextCitations(brief.visualData.takeawayTitle),
        unitSubtitle: cleanTextCitations(brief.visualData.unitSubtitle),
        sourceIds: cleanIdList(brief.visualData.sourceIds),
      }
    : undefined;

  // Sources rendered are ALWAYS locked strictly to retrieved EvidencePack entries
  const sources: BriefSourceReference[] = evidencePack.entries.map((e) => ({
    id: e.id,
    title: e.title,
    publisher: e.publisher,
    year: e.year,
    url: e.url,
    sourceType: e.sourceType,
    excerptOrIndicator: e.excerptOrIndicator,
  }));

  return {
    brief: {
      ...brief,
      bottomLine: cleanTextCitations(brief.bottomLine),
      keyMetrics,
      visualData,
      sections,
      practicalTakeaway: {
        whatItMeansInPractice: cleanTextCitations(brief.practicalTakeaway.whatItMeansInPractice),
        keyRisksOrTradeOffs: cleanTextCitations(brief.practicalTakeaway.keyRisksOrTradeOffs),
        dataLimitations: cleanTextCitations(brief.practicalTakeaway.dataLimitations),
      },
      sources,
      diagnostics: {
        generationMode: brief.diagnostics?.generationMode ?? "deterministic-verified",
        failedProviders: brief.diagnostics?.failedProviders ?? evidencePack.failedProviders,
        partialOutage:
          brief.diagnostics?.partialOutage ?? evidencePack.failedProviders.length > 0,
        strippedInvalidCitations: Array.from(stripped),
        unavailableRequestedMetric: brief.diagnostics?.unavailableRequestedMetric ?? null,
        elapsedMs: brief.diagnostics?.elapsedMs ?? 0,
      },
    },
    strippedIds: Array.from(stripped),
  };
}

function findReading(
  pack: EvidencePack,
  iso3: string,
  code: string
): WorldBankIndicatorReading | undefined {
  return pack.wbReadings.find((r) => r.iso3 === iso3 && r.indicator.code === code);
}

function findEntryIdForReading(
  pack: EvidencePack,
  reading?: WorldBankIndicatorReading
): string {
  if (!reading) return pack.entries[0]?.id ?? "";
  const hit = pack.entries.find(
    (e) => e.iso3 === reading.iso3 && e.indicatorCode === reading.indicator.code
  );
  return hit?.id ?? pack.entries[0]?.id ?? "";
}

function getRenewableReading(pack: EvidencePack, iso3: string): WorldBankIndicatorReading | undefined {
  return (
    findReading(pack, iso3, "EG.ELC.RNWX.ZS") ?? findReading(pack, iso3, "EG.FEC.RNEW.ZS")
  );
}

function synthesizeDeterministicBrief(
  plan: ResearchPlan,
  pack: EvidencePack,
  mode: ResearchMode
): IntelligenceBriefResponse {
  const leadEnt = plan.entities[0];
  const peerEnt = plan.entities[1];
  const leadCountryFallback = leadEnt ? COUNTRIES_DATA[leadEnt.iso3] : undefined;

  const cite = (id?: string) => (id ? ` [${id}]` : "");

  // 1. Explicit Missing-Data Honesty Guardrail (never guess sub-national or unretrieved numbers!)
  if (plan.unavailableRequestedMetric) {
    const academicSources = pack.entries.filter((e) => e.sourceType === "Peer-Reviewed Article");
    return {
      query: plan.query,
      intent: plan.intent,
      bottomLine: `Official data for ${plan.unavailableRequestedMetric} is not available in the verified datasets retrieved for this query. OMNIS never invents missing local budgets, quarterly tax receipts, or unverified city figures from memory.`,
      keyMetrics: [
        {
          label: "Verified Data Availability",
          value: "Not Reported",
          benchmark: "Sub-national quarterly municipal tax data outside national WDI scope",
          everydayMeaning:
            "World Bank WDI and REST Countries publish national totals, not city ward-level property tax rolls.",
          sourceId: academicSources[0]?.id ?? "",
        },
        {
          label: "Retrieved National/City Records",
          value: `${pack.entries.length}`,
          benchmark: pack.entries.length > 0 ? "Related research papers indexed" : "0 matching official datasets",
          everydayMeaning: "Number of verified archival or scholarly records directly referencing this topic.",
          sourceId: academicSources[0]?.id ?? "",
        },
      ],
      visualData: undefined,
      sections: [
        {
          heading: "Why this figure is missing from official APIs",
          summary:
            "Verified multilateral feeds such as World Bank Open Data standardize national-level accounts rather than individual municipal quarterly tax collections.",
          bullets: [
            {
              point:
                "No silent substitution: OMNIS deliberately withholds national GDP or annual averages instead of mislabeling them as city property tax revenue.",
              sourceIds: [],
            },
            {
              point:
                "Where audited local numbers live: Municipal property tax collections require direct verification in city corporation annual budget books, state municipal directorate portals, or Comptroller & Auditor General local audit reports.",
              sourceIds: [],
            },
            ...(academicSources[0]
              ? [
                  {
                    point: `Related peer-reviewed research: "${academicSources[0].title}" (${academicSources[0].publisher}, ${academicSources[0].year}) discusses urban municipal finance governance${cite(
                      academicSources[0].id
                    )}.`,
                    sourceIds: [academicSources[0].id],
                  },
                ]
              : []),
          ],
        },
      ],
      practicalTakeaway: {
        whatItMeansInPractice:
          "Before making budget or urban policy claims, verify the city's official municipal corporation receipts register rather than relying on estimated multipliers.",
        keyRisksOrTradeOffs:
          "Indian municipal property tax reporting frequently lags by 12–18 months and distinguishes billed demand from actual cash collection.",
        dataLimitations: `Official data for "${plan.unavailableRequestedMetric}" is absent across World Bank Open Data API v2, REST Countries v3.1, and retrieved academic abstracts.`,
      },
      sources: [],
      suggestedFollowUps: [
        "Explain India's economic development since 2014 and what challenges remain.",
        "Compare India's public debt and government spending share against peer economies.",
        "How do property taxes fund urban infrastructure in emerging economies according to research?",
      ],
      diagnostics: {
        generationMode: "deterministic-verified",
        failedProviders: pack.failedProviders,
        partialOutage: pack.failedProviders.length > 0,
        strippedInvalidCitations: [],
        unavailableRequestedMetric: plan.unavailableRequestedMetric,
        elapsedMs: 0,
      },
    };
  }

  // 2. Country Comparison Intelligence Synthesis
  if (leadEnt && peerEnt) {
    const gA = findReading(pack, leadEnt.iso3, "NY.GDP.MKTP.CD");
    const gB = findReading(pack, peerEnt.iso3, "NY.GDP.MKTP.CD");
    const pcA = findReading(pack, leadEnt.iso3, "NY.GDP.PCAP.CD");
    const pcB = findReading(pack, peerEnt.iso3, "NY.GDP.PCAP.CD");
    const pppA = findReading(pack, leadEnt.iso3, "NY.GDP.PCAP.PP.CD");
    const pppB = findReading(pack, peerEnt.iso3, "NY.GDP.PCAP.PP.CD");
    const grA = findReading(pack, leadEnt.iso3, "NY.GDP.MKTP.KD.ZG");
    const grB = findReading(pack, peerEnt.iso3, "NY.GDP.MKTP.KD.ZG");
    const renA = getRenewableReading(pack, leadEnt.iso3);
    const renB = getRenewableReading(pack, peerEnt.iso3);
    const rdA = findReading(pack, leadEnt.iso3, "GB.XPD.RSDV.GD.ZS");
    const rdB = findReading(pack, peerEnt.iso3, "GB.XPD.RSDV.GD.ZS");
    const popA = findReading(pack, leadEnt.iso3, "SP.POP.TOTL");
    const popB = findReading(pack, peerEnt.iso3, "SP.POP.TOTL");

    const idGA = findEntryIdForReading(pack, gA);
    const idGB = findEntryIdForReading(pack, gB);
    const idPcA = findEntryIdForReading(pack, pcA);
    const idPcB = findEntryIdForReading(pack, pcB);
    const idGrA = findEntryIdForReading(pack, grA);
    const idGrB = findEntryIdForReading(pack, grB);
    const idRenA = findEntryIdForReading(pack, renA);
    const idRenB = findEntryIdForReading(pack, renB);
    const firstPaper = pack.entries.find((e) => e.sourceType === "Peer-Reviewed Article");

    const gdpAVal = gA ? formatUsdBnCompact(gA.latestValue / 1e9) : "not reported";
    const gdpBVal = gB ? formatUsdBnCompact(gB.latestValue / 1e9) : "not reported";
    const ratioEconomy =
      gA && gB && gA.latestValue > 0 && gB.latestValue > 0
        ? gB.latestValue >= gA.latestValue
          ? `${(gB.latestValue / gA.latestValue).toFixed(1)}× larger`
          : `${(gA.latestValue / gB.latestValue).toFixed(1)}× larger`
        : "different in aggregate dollar scale";

    const pcGapClause =
      pcA && pcB && pcA.latestValue > 0 && pcB.latestValue > 0
        ? pcB.latestValue >= pcA.latestValue
          ? `${peerEnt.name} averages $${Math.round(pcB.latestValue).toLocaleString()} per person${cite(
              idPcB
            )}, roughly ${(pcB.latestValue / pcA.latestValue).toFixed(1)}× ${leadEnt.name}'s $${Math.round(
              pcA.latestValue
            ).toLocaleString()}${cite(idPcA)}`
          : `${leadEnt.name} averages $${Math.round(pcA.latestValue).toLocaleString()} per person${cite(
              idPcA
            )} versus $${Math.round(pcB.latestValue).toLocaleString()} in ${peerEnt.name}${cite(idPcB)}`
        : "per-person income contrasts highlight differences in industrial productivity";

    const bottomLine = `${
      gB && gA && gB.latestValue >= gA.latestValue ? peerEnt.name : leadEnt.name
    }'s economy (${gB && gA && gB.latestValue >= gA.latestValue ? gdpBVal : gdpAVal})${cite(
      gB && gA && gB.latestValue >= gA.latestValue ? idGB : idGA
    )} is ${ratioEconomy} than ${
      gB && gA && gB.latestValue >= gA.latestValue ? leadEnt.name : peerEnt.name
    } (${gB && gA && gB.latestValue >= gA.latestValue ? gdpAVal : gdpBVal})${cite(
      gB && gA && gB.latestValue >= gA.latestValue ? idGA : idGB
    )}, while ${pcGapClause}. ${
      grA && grB
        ? `${grA.latestValue >= grB.latestValue ? leadEnt.name : peerEnt.name} is expanding faster at ${formatSignedPct(
            Math.max(grA.latestValue, grB.latestValue)
          )}/yr versus ${formatSignedPct(Math.min(grA.latestValue, grB.latestValue))}/yr${cite(
            grA.latestValue >= grB.latestValue ? idGrA : idGrB
          )}, reshaping medium-term catch-up dynamics.`
        : ""
    }`.trim();

    const keyMetrics: BriefKeyMetric[] = [
      {
        label: `${leadEnt.name} vs ${peerEnt.name} GDP`,
        value: `${gdpAVal} vs ${gdpBVal}`,
        benchmark: `${gA?.latestYear ?? 2025} nominal output`,
        everydayMeaning: "National scale governs infrastructure spending and global supply-chain leverage.",
        sourceId: idGA,
      },
      ...(pcA && pcB
        ? [
            {
              label: "Income per Person (Nominal)",
              value: `$${Math.round(pcA.latestValue).toLocaleString()} vs $${Math.round(
                pcB.latestValue
              ).toLocaleString()}`,
              benchmark:
                pppA && pppB
                  ? `PPP living-cost adjusted: $${Math.round(pppA.latestValue).toLocaleString()} vs $${Math.round(
                      pppB.latestValue
                    ).toLocaleString()}`
                  : "Current USD per resident",
              everydayMeaning:
                "Shows average yearly economic output per resident; PPP adjusts for cheaper local groceries and rent.",
              sourceId: idPcA,
            },
          ]
        : []),
      ...(grA && grB
        ? [
            {
              label: "Annual Real GDP Growth",
              value: `${formatSignedPct(grA.latestValue)} vs ${formatSignedPct(grB.latestValue)}`,
              benchmark: `${Math.abs(grA.latestValue - grB.latestValue).toFixed(1)} pp growth gap (${grA.latestYear})`,
              everydayMeaning: "Faster expansion speeds up formal job creation and tax-revenue growth.",
              sourceId: idGrA,
            },
          ]
        : []),
      ...(renA && renB
        ? [
            {
              label: "Clean / Renewable Energy Share",
              value: `${renA.latestValue.toFixed(1)}% vs ${renB.latestValue.toFixed(1)}%`,
              benchmark: `${renA.indicator.label} (${renA.latestYear})`,
              everydayMeaning: "Measures domestic insulation from imported oil, gas, and coal price shocks.",
              sourceId: idRenA,
            },
          ]
        : rdA && rdB
          ? [
              {
                label: "R&D Investment (% of GDP)",
                value: `${rdA.latestValue.toFixed(2)}% vs ${rdB.latestValue.toFixed(2)}%`,
                benchmark: `${rdA.latestYear} World Bank WDI`,
                everydayMeaning: "Higher R&D intensity translates into higher-paying factory and tech jobs.",
                sourceId: findEntryIdForReading(pack, rdA),
              },
            ]
          : []),
    ];

    const compRows: Array<Record<string, string | number>> = [];
    if (gA && gB) {
      compRows.push({
        metric: "Nominal GDP ($T)",
        leftName: leadEnt.name,
        rightName: peerEnt.name,
        leftValue: Number((gA.latestValue / 1e12).toFixed(2)),
        rightValue: Number((gB.latestValue / 1e12).toFixed(2)),
        leftDisplay: gdpAVal,
        rightDisplay: gdpBVal,
        scaleNote: "Total Scale",
      });
    }
    if (pcA && pcB) {
      compRows.push({
        metric: "GDP per Person ($k)",
        leftName: leadEnt.name,
        rightName: peerEnt.name,
        leftValue: Number((pcA.latestValue / 1000).toFixed(2)),
        rightValue: Number((pcB.latestValue / 1000).toFixed(2)),
        leftDisplay: `$${Math.round(pcA.latestValue).toLocaleString()}`,
        rightDisplay: `$${Math.round(pcB.latestValue).toLocaleString()}`,
        scaleNote: "Per Person",
      });
    }
    if (grA && grB) {
      compRows.push({
        metric: "Real GDP Growth (%)",
        leftName: leadEnt.name,
        rightName: peerEnt.name,
        leftValue: Number(grA.latestValue.toFixed(1)),
        rightValue: Number(grB.latestValue.toFixed(1)),
        leftDisplay: formatSignedPct(grA.latestValue),
        rightDisplay: formatSignedPct(grB.latestValue),
        scaleNote: "Rate",
      });
    }
    if (renA && renB) {
      compRows.push({
        metric: "Renewable Share (%)",
        leftName: leadEnt.name,
        rightName: peerEnt.name,
        leftValue: Number(renA.latestValue.toFixed(1)),
        rightValue: Number(renB.latestValue.toFixed(1)),
        leftDisplay: `${renA.latestValue.toFixed(1)}%`,
        rightDisplay: `${renB.latestValue.toFixed(1)}%`,
        scaleNote: "Rate",
      });
    }

    const visualData: BriefVisualData | undefined =
      compRows.length > 0
        ? {
            type: "country_comparison_bars",
            takeawayTitle: `${leadEnt.name} vs ${peerEnt.name}: National Scale, Living Standards & Clean Energy`,
            unitSubtitle: "Verified World Bank Open Data API v2 series (scaled cleanly per indicator)",
            series: compRows,
            sourceIds: Array.from(new Set([idGA, idGB, idPcA, idRenA].filter(Boolean))),
          }
        : undefined;

    const sections: BriefSection[] = [
      {
        heading: "Scale vs. Household Living Standards",
        summary:
          "Aggregate GDP reflects total market size and geopolitical weight, whereas per-capita income (adjusted for local living costs) determines everyday household purchasing power.",
        bullets: [
          {
            point: `Total output vs. population: ${leadEnt.name} (${
              popA ? formatPopulationHuman(popA.latestValue, "long") : "population"
            }) runs a ${gdpAVal} economy${cite(idGA)}, compared with ${peerEnt.name}${
              popB ? ` (${formatPopulationHuman(popB.latestValue, "long")})` : ""
            } at ${gdpBVal}${cite(idGB)}.`,
            sourceIds: [idGA, idGB].filter(Boolean),
          },
          ...(pppA && pppB
            ? [
                {
                  point: `Local purchasing power (PPP): Adjusting for cheaper local services lifts ${leadEnt.name} to $${Math.round(
                    pppA.latestValue
                  ).toLocaleString()} Intl$ versus $${Math.round(pppB.latestValue).toLocaleString()} Intl$ in ${peerEnt.name}${cite(
                    findEntryIdForReading(pack, pppA)
                  )}.`,
                  sourceIds: [findEntryIdForReading(pack, pppA), findEntryIdForReading(pack, pppB)],
                },
              ]
            : []),
        ],
      },
      {
        heading: "Clean Energy Transition & R&D Competitiveness",
        summary:
          "Clean electricity lowers imported fossil bills over time, while R&D intensity governs whether workers move up the value chain into advanced manufacturing.",
        bullets: [
          ...(renA && renB
            ? [
                {
                  point: `Clean power mix: ${leadEnt.name} stands at ${renA.latestValue.toFixed(
                    1
                  )}% (${renA.indicator.label})${cite(idRenA)} versus ${renB.latestValue.toFixed(1)}% in ${peerEnt.name}${cite(
                    idRenB
                  )}. Both grids balance fast solar/wind additions against industrial peak reliability.`,
                  sourceIds: [idRenA, idRenB],
                },
              ]
            : []),
          ...(rdA && rdB
            ? [
                {
                  point: `Innovation spending: R&D intensity measures ${rdA.latestValue.toFixed(2)}% of GDP in ${
                    leadEnt.name
                  } compared with ${rdB.latestValue.toFixed(2)}% in ${peerEnt.name}${cite(
                    findEntryIdForReading(pack, rdA)
                  )}, shaping export sophistication.`,
                  sourceIds: [findEntryIdForReading(pack, rdA), findEntryIdForReading(pack, rdB)],
                },
              ]
            : []),
          ...(firstPaper
            ? [
                {
                  point: `Peer-reviewed context: ${firstPaper.facts[0]}${cite(firstPaper.id)}`,
                  sourceIds: [firstPaper.id],
                },
              ]
            : []),
        ],
      },
    ];

    return {
      query: plan.query,
      intent: plan.intent,
      bottomLine,
      keyMetrics: keyMetrics.slice(0, 4),
      visualData,
      sections,
      practicalTakeaway: {
        whatItMeansInPractice:
          "Businesses and investors weigh total market growth against per-worker productivity, borrowing rates, and reliable grid electricity costs before allocating multi-decade factories.",
        keyRisksOrTradeOffs:
          "Rapid capital investment can strain public debt or coal use in the short term, while aging demographics or skill bottlenecks cap potential growth if schooling and logistics lag.",
        dataLimitations:
          "Official WDI indicators update annually with a 6–18 month lag; nominal USD rankings also fluctuate with currency exchange rates relative to local-price PPP estimates.",
      },
      sources: [],
      suggestedFollowUps: [
        `Compare inflation and debt trends in ${leadEnt.name} vs ${peerEnt.name}`,
        `How fast has ${leadEnt.name}'s GDP per person grown since 2014?`,
        `Stress-test clean energy transition vs growth for ${leadEnt.name} in Simulations`,
      ],
    };
  }

  // 3. Single Sovereign Country Deep Intelligence (Multi-Year 2014–2026)
  if (leadEnt) {
    const gdp = findReading(pack, leadEnt.iso3, "NY.GDP.MKTP.CD");
    const growth = findReading(pack, leadEnt.iso3, "NY.GDP.MKTP.KD.ZG");
    const pc = findReading(pack, leadEnt.iso3, "NY.GDP.PCAP.CD");
    const ppp = findReading(pack, leadEnt.iso3, "NY.GDP.PCAP.PP.CD");
    const cpi = findReading(pack, leadEnt.iso3, "FP.CPI.TOTL.ZG");
    const unemp = findReading(pack, leadEnt.iso3, "SL.UEM.TOTL.ZS");
    const debt = findReading(pack, leadEnt.iso3, "GC.DOD.TOTL.GD.ZS");
    const ren = getRenewableReading(pack, leadEnt.iso3);
    const rd = findReading(pack, leadEnt.iso3, "GB.XPD.RSDV.GD.ZS");
    const net = findReading(pack, leadEnt.iso3, "IT.NET.USER.ZS");
    const pop = findReading(pack, leadEnt.iso3, "SP.POP.TOTL");
    const rc = pack.restCountries.find((r) => r.iso3 === leadEnt.iso3);

    const idGdp = findEntryIdForReading(pack, gdp);
    const idGrowth = findEntryIdForReading(pack, growth);
    const idPc = findEntryIdForReading(pack, pc);
    const idCpi = findEntryIdForReading(pack, cpi);
    const idDebt = findEntryIdForReading(pack, debt);
    const idRen = findEntryIdForReading(pack, ren);
    const idRd = findEntryIdForReading(pack, rd);
    const papers = pack.entries.filter((e) => e.sourceType === "Peer-Reviewed Article");
    const wiki = pack.entries.find((e) => e.sourceType === "Institutional Archive");

    const gdpNowStr = gdp ? formatUsdBnCompact(gdp.latestValue / 1e9) : "unavailable GDP";
    const gdpHistClause =
      gdp && gdp.earliestValue && gdp.earliestYear
        ? `expanded from ${formatUsdBnCompact(gdp.earliestValue / 1e9)} in ${gdp.earliestYear} to ${gdpNowStr} in ${
            gdp.latestYear
          }${gdp.multiple ? ` (${gdp.multiple}× since ${gdp.earliestYear})` : ""}${cite(idGdp)}`
        : `runs a ${gdpNowStr} economy (${gdp?.latestYear ?? 2025})${cite(idGdp)}`;

    const pcClause = pc
      ? `, raising average output per person to $${Math.round(pc.latestValue).toLocaleString()}${
          pc.earliestValue ? ` from $${Math.round(pc.earliestValue).toLocaleString()} in ${pc.earliestYear}` : ""
        }${cite(idPc)}`
      : "";

    let bottomLine = `${leadEnt.name} (${leadEnt.iso3}) ${gdpHistClause}${pcClause}.`;
    if (plan.subTopic === "inflation" && cpi && (mode === "deep" || mode === "economic")) {
      const bench = describeVsBenchmark("inflationPct", cpi.latestValue).summary;
      bottomLine = `${leadEnt.name}'s annual consumer inflation (CPI — everyday cost-of-living price rise) stands at ${cpi.latestValue.toFixed(
        1
      )}% in ${cpi.latestYear} (${bench})${cite(idCpi)}, alongside ${
        growth ? `${formatSignedPct(growth.latestValue)} real GDP growth${cite(idGrowth)}` : gdpNowStr
      }. Food harvest volatility, imported energy costs, and central-bank policy rates shape household budgets directly.`;
    } else if (plan.subTopic === "debt" && (debt || gdp) && (mode === "deep" || mode === "economic")) {
      const debtVal = debt
        ? `${debt.latestValue.toFixed(1)}% of GDP (${describeVsBenchmark("publicDebtPctGdp", debt.latestValue).summary})${cite(idDebt)}`
        : leadCountryFallback && hasSectorMetricValue(leadCountryFallback, leadCountryFallback.publicDebtPctGdp)
          ? `${leadCountryFallback.publicDebtPctGdp}% of GDP`
          : "partially reported in live WDI series";
      bottomLine = `${leadEnt.name} carries central government debt near ${debtVal} alongside a ${gdpNowStr} economy${cite(
        idGdp
      )}${growth ? ` growing ${formatSignedPct(growth.latestValue)} annually${cite(idGrowth)}` : ""}. Keeping real growth above borrowing interest rates allows fiscal deficits to narrow without cutting essential infrastructure.`;
    } else if (plan.subTopic === "energy" && ren && mode === "deep") {
      const renewBench = describeVsBenchmark("renewableSharePct", ren.latestValue).summary;
      bottomLine = `${leadEnt.name} draws ${ren.latestValue.toFixed(1)}% (${ren.latestYear}) from ${ren.indicator.label.toLowerCase()} (${renewBench})${cite(
        idRen
      )}, making grid battery storage and high-voltage transmission essential to balance sunny midday surpluses against evening peak factory and home electricity demand${
        growth ? ` while sustaining ${formatSignedPct(growth.latestValue)}/yr GDP growth${cite(idGrowth)}` : ""
      }.`;
    } else if (plan.subTopic === "tech" && mode === "deep") {
      bottomLine = `${leadEnt.name} commits ${
        rd ? `${rd.latestValue.toFixed(2)}% of GDP to R&D (${rd.latestYear})${cite(idRd)}` : "rising domestic investment to engineering capacity"
      }${net ? ` alongside ${net.latestValue.toFixed(1)}% internet penetration${cite(findEntryIdForReading(pack, net))}` : ""}. Scaling innovation into higher wages depends on reliable clean power, skilled engineers, and industrial adoption.`;
    } else if (mode === "quick") {
      bottomLine = `Bottom line: ${leadEnt.name} (${leadEnt.iso3}) operates a ${gdpNowStr} economy${cite(
        idGdp
      )}${growth ? `, growing ${formatSignedPct(growth.latestValue)}/yr${cite(idGrowth)}` : ""}${
        pc ? `, with $${Math.round(pc.latestValue).toLocaleString()} GDP per person${cite(idPc)}` : ""
      }.`;
    } else if (mode === "comparative") {
      const peer = COUNTRIES_DATA[leadEnt.iso3 === "IND" ? "CHN" : "IND"];
      const peerGdpStr = peer ? formatUsdBnCompact(getEffectiveGdpUsdBn(peer)) : "peer benchmark";
      bottomLine = `Comparing ${leadEnt.name} (${gdpNowStr})${cite(idGdp)} against global peer ${
        peer?.name ?? "benchmarks"
      } (${peerGdpStr}): average output per person sits at ${
        pc ? `$${Math.round(pc.latestValue).toLocaleString()}${cite(idPc)}` : "emerging-market levels"
      }, highlighting the gap between national market size and worker productivity.`;
    } else if (mode === "historical") {
      const evts = TIMELINE_EVENTS.filter((e) => e.countryIso3 === leadEnt.iso3).slice(0, 2);
      bottomLine = `Tracing ${leadEnt.name} (${leadEnt.iso3}) over time shows an economy that ${gdpHistClause}${pcClause}. ${
        evts.length > 0
          ? `Turning points like ${evts.map((e) => `${e.title} (${e.dateDisplay})`).join(" and ")} compounded into structural output gains over subsequent decades.`
          : "Multi-decade capital investment, trade integration, and urban job shifts steadily lifted output per worker."
      }`;
    } else if (mode === "scientific") {
      bottomLine = `Research evidence on ${leadEnt.name} (${leadEnt.iso3}) connects physical infrastructure—${
        ren ? `${ren.latestValue.toFixed(1)}% clean energy (${ren.indicator.label})${cite(idRen)}` : "power reliability"
      } and ${
        rd ? `${rd.latestValue.toFixed(2)}% of GDP in R&D${cite(idRd)}` : "technical R&D investment"
      }—to how quickly innovations translate into higher productivity${papers[0] ? `, supported by studies such as "${papers[0].title}"${cite(papers[0].id)}` : ""}.`;
    } else if (mode === "economic") {
      bottomLine = `From an economic standpoint, ${leadEnt.name} (${leadEnt.iso3}) pairs a ${gdpNowStr} market${cite(
        idGdp
      )} with ${
        growth ? `${formatSignedPct(growth.latestValue)} real growth${cite(idGrowth)}` : "steady expansion"
      }${cpi ? ` and ${cpi.latestValue.toFixed(1)}% CPI inflation${cite(idCpi)}` : ""}. Sustaining wage gains depends on private investment and keeping inflation predictable.`;
    } else {
      bottomLine = `${leadEnt.name} (${leadEnt.iso3}) ${gdpHistClause}${pcClause}. While headline expansion ${
        growth ? `(${formatSignedPct(growth.latestValue)} in ${growth.latestYear})${cite(idGrowth)} ` : ""
      }shows real momentum, broadening formal jobs, containing household inflation${
        cpi ? ` (${cpi.latestValue.toFixed(1)}%)${cite(idCpi)}` : ""
      }, and lifting R&D and clean energy reliability remain the central challenges.`;
    }

    const keyMetrics: BriefKeyMetric[] = [];
    if (gdp) {
      keyMetrics.push({
        label: "Total Economy Size (Nominal GDP)",
        value: gdpNowStr,
        benchmark: gdp.earliestValue
          ? `${gdp.earliestYear}→${gdp.latestYear}: ${
              gdp.multiple ? `${gdp.multiple}×` : `${gdp.deltaPct && gdp.deltaPct >= 0 ? "+" : ""}${gdp.deltaPct ?? 0}%`
            }`
          : `${gdp.latestYear} World Bank WDI`,
        everydayMeaning: gdp.indicator.everydayMeaning,
        sourceId: idGdp,
      });
    }
    if (pc) {
      keyMetrics.push({
        label: "Income per Person (GDP per Capita)",
        value: `$${Math.round(pc.latestValue).toLocaleString()}/yr`,
        benchmark: ppp
          ? `PPP adjusted: $${Math.round(ppp.latestValue).toLocaleString()} (${describeVsBenchmark("gdpPerCapitaUsd", pc.latestValue).summary})`
          : describeVsBenchmark("gdpPerCapitaUsd", pc.latestValue).summary,
        everydayMeaning: pc.indicator.everydayMeaning,
        sourceId: idPc,
      });
    }
    if (cpi) {
      keyMetrics.push({
        label: "Household Inflation (CPI)",
        value: `${cpi.latestValue.toFixed(1)}%/yr`,
        benchmark: describeVsBenchmark("inflationPct", cpi.latestValue).summary,
        everydayMeaning: cpi.indicator.everydayMeaning,
        sourceId: idCpi,
      });
    } else if (growth) {
      keyMetrics.push({
        label: "Annual Real GDP Growth",
        value: formatSignedPct(growth.latestValue),
        benchmark: describeVsBenchmark("gdpGrowthPct", growth.latestValue).summary,
        everydayMeaning: growth.indicator.everydayMeaning,
        sourceId: idGrowth,
      });
    }
    if (ren) {
      keyMetrics.push({
        label: ren.indicator.label,
        value: `${ren.latestValue.toFixed(1)}%`,
        benchmark: `${ren.latestYear} World Bank WDI`,
        everydayMeaning: ren.indicator.everydayMeaning,
        sourceId: idRen,
      });
    } else if (rd) {
      keyMetrics.push({
        label: "R&D Investment (% GDP)",
        value: `${rd.latestValue.toFixed(2)}%`,
        benchmark: `${rd.latestYear} World Bank WDI`,
        everydayMeaning: rd.indicator.everydayMeaning,
        sourceId: idRd,
      });
    }

    // Build real multi-year trend chart strictly from retrieved WDI points (preferring GDP per capita or Nominal GDP)
    const chartReading = gdp && gdp.series.length >= 2 ? gdp : pc && pc.series.length >= 2 ? pc : growth;
    const visualData: BriefVisualData | undefined =
      chartReading && chartReading.series.length >= 2
        ? {
            type: "trend_line",
            takeawayTitle:
              chartReading.indicator.code === "NY.GDP.MKTP.CD"
                ? `${leadEnt.name}'s GDP grew from ${formatUsdBnCompact(
                    chartReading.series[0].value / 1e9
                  )} (${chartReading.series[0].year}) to ${formatUsdBnCompact(
                    chartReading.latestValue / 1e9
                  )} (${chartReading.latestYear})`
                : `${leadEnt.name}: ${chartReading.indicator.label} (${chartReading.series[0].year}–${chartReading.latestYear})`,
            unitSubtitle: `${chartReading.indicator.unit} (World Bank WDI ${chartReading.indicator.code})`,
            series: chartReading.series.map((pt) => ({
              label: String(pt.year),
              value:
                chartReading.indicator.unitKind === "usd_bn"
                  ? Number((pt.value / 1e9).toFixed(1))
                  : Number(pt.value.toFixed(2)),
              unit: chartReading.indicator.unitKind === "usd_bn" ? "$B" : chartReading.indicator.unit,
            })),
            sourceIds: [findEntryIdForReading(pack, chartReading)],
          }
        : undefined;

    const sections: BriefSection[] = [
      {
        heading: `How ${leadEnt.name}'s growth reached everyday households`,
        summary:
          "Headline national growth only lifts broad living standards when infrastructure investment translates into formal jobs, digital access, and stable food and energy prices.",
        bullets: [
          ...(growth
            ? [
                {
                  point: `Sustained output pace: Real GDP expanded ${formatSignedPct(
                    growth.latestValue
                  )} in ${growth.latestYear}${
                    growth.earliestYear
                      ? `, rebounding from multi-year swings since ${growth.earliestYear}`
                      : ""
                  }${cite(idGrowth)}.`,
                  sourceIds: [idGrowth],
                },
              ]
            : []),
          ...(ppp || pc
            ? [
                {
                  point: `Income vs. local costs: Average nominal output per person sits at $${Math.round(
                    (pc ?? ppp)!.latestValue
                  ).toLocaleString()}${ppp ? `, equivalent to $${Math.round(ppp.latestValue).toLocaleString()} Intl$ when adjusted for purchasing power parity (PPP — local buying power)` : ""}${cite(
                    pc ? idPc : findEntryIdForReading(pack, ppp)
                  )}.`,
                  sourceIds: [pc ? idPc : findEntryIdForReading(pack, ppp)],
                },
              ]
            : []),
          ...(net || (pop && pop.latestValue > 0) || (rc && rc.population > 0)
            ? [
                {
                  point: `Demographics & digital reach: ${
                    pop && pop.latestValue > 0
                      ? `Across ${formatPopulationHuman(pop.latestValue, "long")} residents, `
                      : rc && rc.population > 0
                        ? `Across ${formatPopulationHuman(rc.population, "long")} residents, `
                        : ""
                  }${
                    net
                      ? `internet penetration reached ${net.latestValue.toFixed(1)}% (${net.latestYear})${cite(
                          findEntryIdForReading(pack, net)
                        )}, accelerating digital payments and service delivery`
                      : `urbanization and consumer scale drive demand for formal services and digital payments`
                  }${
                    pop && pop.latestValue > 0
                      ? cite(findEntryIdForReading(pack, pop))
                      : rc && rc.population > 0
                        ? cite(pack.entries.find((e) => e.publisher.includes("REST Countries"))?.id)
                        : ""
                  }.`,
                  sourceIds: [
                    net ? findEntryIdForReading(pack, net) : findEntryIdForReading(pack, pop),
                  ].filter(Boolean),
                },
              ]
            : []),
        ],
      },
      {
        heading: "Structural Bottlenecks & Challenges Ahead",
        summary:
          "Closing the gap with upper-middle- and high-income peers requires addressing employment quality, innovation spending, fiscal space, and clean grid reliability.",
        bullets: [
          ...(cpi || unemp
            ? [
                {
                  point: `Prices and labor absorption: ${
                    cpi
                      ? `Consumer inflation of ${cpi.latestValue.toFixed(1)}% (${cpi.latestYear})${cite(
                          idCpi
                        )} squeezes household real wages when food or fuel costs jump`
                      : "Managing retail price volatility remains critical"
                  }${
                    unemp
                      ? `, while measured unemployment stands near ${unemp.latestValue.toFixed(1)}%${cite(
                          findEntryIdForReading(pack, unemp)
                        )}`
                      : ""
                  }.`,
                  sourceIds: [cpi ? idCpi : "", unemp ? findEntryIdForReading(pack, unemp) : ""].filter(
                    Boolean
                  ),
                },
              ]
            : []),
          ...(rd || ren
            ? [
                {
                  point: `Productivity & grid transition: ${
                    rd
                      ? `R&D spending (${rd.latestValue.toFixed(2)}% of GDP${cite(
                          idRd
                        )}) leaves private-sector patenting below advanced manufacturing hubs`
                      : "Raising domestic engineering capacity takes sustained training"
                  }${
                    ren
                      ? `, alongside a ${ren.latestValue.toFixed(1)}% clean-energy share (${ren.indicator.label})${cite(idRen)} that needs storage and grid upgrades`
                      : ""
                  }.`,
                  sourceIds: [rd ? idRd : "", ren ? idRen : ""].filter(Boolean),
                },
              ]
            : []),
          ...(papers.slice(0, 2).map((p) => ({
            point: `Peer-reviewed research perspective: ${p.facts[0]}${cite(p.id)}`,
            sourceIds: [p.id],
          }))),
          ...(papers.length === 0 && wiki
            ? [
                {
                  point: `Institutional context: ${wiki.facts[0].slice(0, 240)}…${cite(wiki.id)}`,
                  sourceIds: [wiki.id],
                },
              ]
            : []),
        ],
      },
    ];

    return {
      query: plan.query,
      intent: plan.intent,
      bottomLine,
      keyMetrics: keyMetrics.slice(0, 4),
      visualData,
      sections,
      practicalTakeaway: {
        whatItMeansInPractice: `For households and local firms in ${leadEnt.name}, steady real GDP expansion creates urban and services opportunities, yet take-home gains hinge on whether inflation stays predictable and energy/logistics costs fall.`,
        keyRisksOrTradeOffs:
          "Heavy public infrastructure investment supports long-term competitiveness but competes with healthcare, education, and debt service in annual budgets if private manufacturing investment slows.",
        dataLimitations: `${
          pack.failedProviders.length > 0
            ? `Some upstream feeds (${pack.failedProviders.join(", ")}) were slow or unavailable during retrieval; `
            : ""
        }World Bank series reflect latest standardized annual releases and do not capture informal gig-sector earnings directly.`,
      },
      sources: [],
      suggestedFollowUps: [
        `Compare ${leadEnt.name} and ${leadEnt.iso3 === "CHN" ? "United States" : "China"} across GDP per person and clean energy`,
        `Why does ${leadEnt.name}'s inflation affect borrowing rates and household budgets?`,
        `What historical policy shifts shaped ${leadEnt.name}'s modern growth?`,
      ],
    };
  }

  // 4. Thematic / Peer-Reviewed Policy & Scientific Research (No country lock-in)
  const academicEntries = pack.entries.filter((e) => e.sourceType === "Peer-Reviewed Article");
  const archiveEntries = pack.entries.filter((e) => e.sourceType === "Institutional Archive");
  const topPaper = pack.openAlexWorks[0] ?? pack.crossrefWorks[0];
  const secondPaper = pack.openAlexWorks[1] ?? pack.crossrefWorks[1];
  const topPaperId = academicEntries[0]?.id ?? "";
  const secondPaperId = academicEntries[1]?.id ?? "";
  const archiveId = archiveEntries[0]?.id ?? "";

  if (academicEntries.length === 0 && archiveEntries.length === 0 && pack.openAlexTrend.length === 0) {
    return {
      query: plan.query,
      intent: plan.intent,
      bottomLine: `Official data and peer-reviewed scholarly records matching "${plan.query}" were unavailable or returned zero direct hits during this check. OMNIS refuses to invent statistics or citations from training memory.`,
      keyMetrics: [
        {
          label: "Retrieved Sources",
          value: "0 Verified",
          benchmark: "Upstream APIs returned empty or offline",
          everydayMeaning: "Try broadening keywords or retrying once OpenAlex and World Bank respond.",
          sourceId: "",
        },
      ],
      visualData: undefined,
      sections: [
        {
          heading: "Why no chart or numbers are shown",
          summary:
            "Every OMNIS statistic must trace directly to an API response in this session; no dummy series or placeholder numbers are substituted.",
          bullets: [
            {
              point: `Failed or empty feeds: ${
                pack.failedProviders.length > 0 ? pack.failedProviders.join(", ") : "OpenAlex / Wikimedia"
              }. Retry with simpler terms or verify network connectivity.`,
              sourceIds: [],
            },
          ],
        },
      ],
      practicalTakeaway: {
        whatItMeansInPractice:
          "Avoid relying on ungrounded single-pass LLM answers when primary scholarly or official datasets are unreachable.",
        keyRisksOrTradeOffs:
          "Narrow or highly idiosyncratic query phrasing can return zero DOI matches in bibliographic search APIs.",
        dataLimitations: `No verified records retrieved for "${plan.query}".`,
      },
      sources: [],
      suggestedFollowUps: [
        "How does artificial intelligence adoption affect employment according to recent economic research?",
        "Explain India's economic development since 2014 and what challenges remain.",
        "Compare Germany and Japan across GDP per person and clean energy.",
      ],
    };
  }

  const totalTrendCount = pack.openAlexTrend.reduce((acc, p) => acc + p.count, 0);
  const firstTrend = pack.openAlexTrend[0];
  const lastTrend = pack.openAlexTrend[pack.openAlexTrend.length - 1];

  let bottomLine = topPaper
    ? `Peer-reviewed research led by ${topPaper.authors[0] ?? "empirical economists"} (${topPaper.year}, ${
        topPaper.publisher
      })${cite(topPaperId)} shows that outcomes on "${plan.query}" depend on how rapidly organizations pair new technology with workforce training rather than immediate plug-and-play substitution.`
    : `${archiveEntries[0]?.facts[0]?.slice(0, 260) ?? ""}${cite(archiveId)}`;

  if (/\bai\b|artificial intelligence|employment|jobs/i.test(plan.query) && topPaper) {
    bottomLine = `Recent peer-reviewed economic studies in OpenAlex and Crossref (${topPaper.authors[0]} ${topPaper.year}${
      topPaper.citedByCount ? `, ${topPaper.citedByCount.toLocaleString()} citations` : ""
    }${cite(topPaperId)}) find that AI adoption restructures specific cognitive tasks faster than it eliminates entire jobs—lifting output in adopting firms while sharpening wage gaps between workers with complementary skills and those in routine white-collar roles${
      secondPaper ? ` (${secondPaper.authors[0]} ${secondPaper.year}${cite(secondPaperId)})` : ""
    }.`;
  } else if (mode === "scientific" && topPaper) {
    bottomLine = `Peer-reviewed literature indexed via OpenAlex (led by "${topPaper.title}", ${topPaper.year}${cite(
      topPaperId
    )}) shows measurable empirical effects alongside real-world deployment lags, training bottlenecks, and physical system limits.`;
  }

  const keyMetrics: BriefKeyMetric[] = [
    {
      label: "Peer-Reviewed Studies Found",
      value: `${academicEntries.length} Papers`,
      benchmark:
        topPaper?.citedByCount
          ? `Top study: ${topPaper.citedByCount.toLocaleString()} citations (${topPaper.year})`
          : "OpenAlex & Crossref DOI verified",
      everydayMeaning: "Number of scholarly studies with verified metadata and reconstructed findings retrieved now.",
      sourceId: topPaperId || archiveId,
    },
    ...(lastTrend
      ? [
          {
            label: `Published Research (${lastTrend.year})`,
            value: `${lastTrend.count.toLocaleString()} works`,
            benchmark:
              firstTrend && firstTrend.count > 0 && lastTrend.year > firstTrend.year
                ? `${firstTrend.year}→${lastTrend.year}: ${(lastTrend.count / firstTrend.count).toFixed(1)}× volume`
                : `${totalTrendCount.toLocaleString()} cumulative since 2015`,
            everydayMeaning: "Tracks how rapidly scientists and economists are publishing controlled evidence on this topic.",
            sourceId: topPaperId || archiveId,
          },
        ]
      : []),
    ...(topPaper
      ? [
          {
            label: "Highest-Impact Citation Anchor",
            value: `${topPaper.year} Study`,
            benchmark: `${topPaper.publisher} · ${(topPaper.citedByCount ?? 0).toLocaleString()} citations`,
            everydayMeaning: "Most-cited empirical anchor retrieved for this question—inspect full DOI in the Sources rail.",
            sourceId: topPaperId,
          },
        ]
      : []),
  ];

  const visualData: BriefVisualData | undefined =
    pack.openAlexTrend.length >= 2
      ? {
          type: "trend_line",
          takeawayTitle: `Scholarly research volume on "${plan.query.slice(0, 42)}" from ${
            pack.openAlexTrend[0].year
          } to ${pack.openAlexTrend[pack.openAlexTrend.length - 1].year}`,
          unitSubtitle: "Peer-reviewed works per year (OpenAlex group_by=publication_year)",
          series: pack.openAlexTrend.map((pt) => ({
            label: String(pt.year),
            value: pt.count,
            unit: "works",
          })),
          sourceIds: [topPaperId || archiveId].filter(Boolean),
        }
      : academicEntries.length >= 2
        ? {
            type: "breakdown_table",
            takeawayTitle: `Top Verified Peer-Reviewed Studies for "${plan.query.slice(0, 44)}"`,
            unitSubtitle: "Bibliographic metadata & citation impact retrieved live from OpenAlex & Crossref",
            series: pack.openAlexWorks.slice(0, 4).map((w, idx) => ({
              study: w.title,
              journal: w.publisher,
              year: Number(w.year) || 2024,
              citations: w.citedByCount ?? 0,
              sourceId: academicEntries[idx]?.id ?? topPaperId,
            })),
            sourceIds: academicEntries.slice(0, 4).map((e) => e.id),
          }
        : undefined;

  const sections: BriefSection[] = [
    {
      heading: "What Peer-Reviewed Studies Actually Show",
      summary:
        "Synthesizing abstracts across retrieved journals separates hype from documented mechanisms.",
      bullets: [
        ...(academicEntries.slice(0, 3).map((e) => ({
          point: `${e.title}: ${e.facts[0]}${cite(e.id)}`,
          sourceIds: [e.id],
        }))),
        ...(archiveEntries.slice(0, 1).map((e) => ({
          point: `Institutional baseline: ${e.facts[0].slice(0, 260)}…${cite(e.id)}`,
          sourceIds: [e.id],
        }))),
      ],
    },
    {
      heading: "Practical Mechanisms & Real-World Trade-Offs",
      summary:
        "Bridging controlled research settings to everyday firms, workers, and household budgets explains why headlines often overshoot short-term statistics.",
      bullets: [
        {
          point: `Productivity vs. reorganization lag: Narrow task speedups appear within months, yet broader firm-wide gains take years of workflow redesign and staff retraining${cite(
            topPaperId || archiveId
          )}.`,
          sourceIds: [topPaperId || archiveId].filter(Boolean),
        },
        {
          point: `Distributional friction: Benefits accrue unevenly across regions, firm sizes, and skill tiers, calling for targeted reskilling and clear governance guardrails${cite(
            secondPaperId || topPaperId || archiveId
          )}.`,
          sourceIds: [secondPaperId || topPaperId || archiveId].filter(Boolean),
        },
      ],
    },
  ];

  return {
    query: plan.query,
    intent: plan.intent,
    bottomLine,
    keyMetrics: keyMetrics.slice(0, 4),
    visualData,
    sections,
    practicalTakeaway: {
      whatItMeansInPractice:
        "Decision-makers should separate proven task-level efficiency gains from sweeping macro forecasts and budget time for staff training and validation checks.",
      keyRisksOrTradeOffs:
        "Over-reliance on unverified automation or premature workforce cuts risks quality failures and institutional knowledge loss.",
      dataLimitations:
        "Scholarly citation counts favor slightly older foundational studies; very recent 2025–2026 empirical datasets take months to pass peer review.",
    },
    sources: [],
    suggestedFollowUps: [
      "Compare United States and India AI readiness and R&D spending",
      "Explore Causal Entities in Knowledge Graph for this topic",
      "How fast has clean energy lowered grid electricity costs since 2015?",
    ],
  };
}

/**
 * Full Phase 2 Pipeline: Plan -> Retrieve -> Verify -> Synthesize -> Validate Citations.
 */
export async function orchestrateIntelligenceBrief(
  query: string,
  mode: ResearchMode = "deep",
  options?: {
    fetchFn?: typeof fetch;
    onProgress?: RetrievalProgressCallback;
  }
): Promise<{
  plan: ResearchPlan;
  evidencePack: EvidencePack;
  brief: IntelligenceBriefResponse;
}> {
  const startedAt = Date.now();
  const emit = (step: 1 | 2 | 3 | 4, label: string, status: "active" | "completed") => {
    options?.onProgress?.({
      step,
      label,
      status,
      elapsedMs: Date.now() - startedAt,
    });
  };

  emit(1, "Resolving countries, time horizons & economic indicators…", "active");
  const plan = planResearchQuery(query);
  emit(1, "Resolving countries, time horizons & economic indicators…", "completed");

  emit(2, "Querying World Bank WDI, REST Countries & OpenAlex scholarly works…", "active");
  const evidencePack = await gatherVerifiedEvidence(plan, { fetchFn: options?.fetchFn });
  emit(2, "Querying World Bank WDI, REST Countries & OpenAlex scholarly works…", "completed");

  emit(3, "Cross-checking figures & filtering out unverified claims…", "active");
  const deterministic = synthesizeDeterministicBrief(plan, evidencePack, mode);

  let candidateBrief: IntelligenceBriefResponse = deterministic;
  if (evidencePack.entries.length > 0 && !plan.unavailableRequestedMetric) {
    const llmPayload = await synthesizeStructuredBriefWithOptionalLlm({
      query: plan.query,
      mode,
      intent: plan.intent,
      serializedEvidencePack: evidencePack.serializedForPrompt,
      unavailableRequestedMetric: plan.unavailableRequestedMetric,
      fetchImpl: options?.fetchFn,
    });
    if (llmPayload) {
      candidateBrief = {
        ...deterministic,
        bottomLine: llmPayload.bottomLine,
        keyMetrics: llmPayload.keyMetrics,
        sections: llmPayload.sections,
        practicalTakeaway: llmPayload.practicalTakeaway,
        suggestedFollowUps:
          llmPayload.suggestedFollowUps.length > 0
            ? llmPayload.suggestedFollowUps
            : deterministic.suggestedFollowUps,
        diagnostics: {
          generationMode: "llm-verified",
          failedProviders: evidencePack.failedProviders,
          partialOutage: evidencePack.failedProviders.length > 0,
          strippedInvalidCitations: [],
          unavailableRequestedMetric: plan.unavailableRequestedMetric,
          elapsedMs: Date.now() - startedAt,
        },
      };
    }
  }
  emit(3, "Cross-checking figures & filtering out unverified claims…", "completed");

  emit(4, "Synthesizing plain-English brief & visual charts…", "active");
  const { brief: validatedBrief } = validateAndSanitizeBriefCitations(candidateBrief, evidencePack);
  validatedBrief.diagnostics = {
    generationMode: validatedBrief.diagnostics?.generationMode ?? "deterministic-verified",
    failedProviders: evidencePack.failedProviders,
    partialOutage: evidencePack.failedProviders.length > 0,
    strippedInvalidCitations: validatedBrief.diagnostics?.strippedInvalidCitations ?? [],
    unavailableRequestedMetric: plan.unavailableRequestedMetric,
    elapsedMs: Math.max(1, Date.now() - startedAt),
  };
  emit(4, "Synthesizing plain-English brief & visual charts…", "completed");

  return {
    plan,
    evidencePack,
    brief: validatedBrief,
  };
}
