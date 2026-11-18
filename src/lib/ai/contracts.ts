import { z } from "zod";

export type PlannerIntent =
  | "country_profile"
  | "country_comparison"
  | "economic_policy"
  | "development_trend"
  | "geopolitics_trade"
  | "scientific_technical"
  | "historical_context";

export type BriefSourceType =
  | "Official Dataset"
  | "Peer-Reviewed Article"
  | "Institutional Archive";

export interface BriefKeyMetric {
  label: string;
  value: string;
  benchmark: string;
  everydayMeaning: string;
  sourceId: string;
}

export interface BriefVisualData {
  type: "trend_line" | "country_comparison_bars" | "breakdown_table";
  takeawayTitle: string;
  unitSubtitle: string;
  series: Array<Record<string, string | number>>;
  sourceIds: string[];
}

export interface BriefSectionBullet {
  point: string;
  sourceIds: string[];
}

export interface BriefSection {
  heading: string;
  summary: string;
  bullets: BriefSectionBullet[];
}

export interface BriefPracticalTakeaway {
  whatItMeansInPractice: string;
  keyRisksOrTradeOffs: string;
  dataLimitations: string;
}

export interface BriefSourceReference {
  id: string;
  title: string;
  publisher: string;
  year: string;
  url: string;
  sourceType: BriefSourceType;
  excerptOrIndicator: string;
}

export interface AddyIntelligenceBrief {
  engineName: "AddyIntelligence";
  query: string;
  intent: string;
  /** 2-3 plain-English sentences directly answering the user's question immediately */
  bottomLine: string;
  /** 3-4 headline verified metrics with human units & real-world benchmarks */
  keyMetrics: BriefKeyMetric[];
  /** Auto-populated chart or comparison table data derived strictly from retrieved series */
  visualData?: BriefVisualData;
  /** Scannable, practical analytical sections (max 3 sentences per paragraph) */
  sections: BriefSection[];
  /** Practical real-world takeaway & trade-offs for ordinary people / policymakers */
  practicalTakeaway: BriefPracticalTakeaway;
  /** Full verifiable bibliography mapped to inline [SRC-n] tags */
  sources: BriefSourceReference[];
  /** 3 smart contextual follow-up questions grounded in the retrieved topic */
  suggestedFollowUps: string[];
  /** Diagnostics about grounding & provider availability (non-intrusive metadata) */
  diagnostics?: {
    generationMode: "llm-verified" | "deterministic-verified";
    failedProviders: string[];
    partialOutage: boolean;
    strippedInvalidCitations: string[];
    unavailableRequestedMetric?: string | null;
    elapsedMs: number;
  };
}

export type IntelligenceBriefResponse = AddyIntelligenceBrief;

export const BriefKeyMetricSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  benchmark: z.string().min(1),
  everydayMeaning: z.string().min(1),
  sourceId: z.string().min(1),
});

export const BriefVisualDataSchema = z.object({
  type: z.enum(["trend_line", "country_comparison_bars", "breakdown_table"]),
  takeawayTitle: z.string().min(1),
  unitSubtitle: z.string().min(1),
  series: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
  sourceIds: z.array(z.string()),
});

export const BriefSectionSchema = z.object({
  heading: z.string().min(1),
  summary: z.string().min(1),
  bullets: z.array(
    z.object({
      point: z.string().min(1),
      sourceIds: z.array(z.string()),
    })
  ),
});

export const IntelligenceBriefLlmSchema = z.object({
  bottomLine: z.string().min(15),
  keyMetrics: z.array(BriefKeyMetricSchema).min(1).max(4),
  sections: z.array(BriefSectionSchema).min(1).max(4),
  practicalTakeaway: z.object({
    whatItMeansInPractice: z.string().min(10),
    keyRisksOrTradeOffs: z.string().min(10),
    dataLimitations: z.string().min(10),
  }),
  suggestedFollowUps: z.array(z.string().min(5)).min(1).max(4),
});

export type IntelligenceBriefLlmPayload = z.infer<typeof IntelligenceBriefLlmSchema>;

export interface ResearchPlan {
  query: string;
  intent: PlannerIntent;
  entities: Array<{ iso3: string; name: string }>;
  indicators: string[];
  dateRange: string;
  scholarlyQueries: string[];
  wikimediaTopics: string[];
  subTopic: "inflation" | "debt" | "jobs" | "energy" | "tech" | "trade" | "health" | null;
  unavailableRequestedMetric: string | null;
}

export interface WorldBankIndicatorSpec {
  code: string;
  label: string;
  family: "macro" | "cost_labor" | "trade_fiscal" | "demographics_human" | "energy_tech_climate";
  unit: string;
  unitKind: "usd_bn" | "usd" | "pct" | "signed_pct" | "people" | "years" | "tons";
  everydayMeaning: string;
}

export interface WorldBankIndicatorPoint {
  year: number;
  value: number;
}

export interface WorldBankIndicatorReading {
  iso3: string;
  countryName: string;
  indicator: WorldBankIndicatorSpec;
  latestYear: number;
  latestValue: number;
  earliestYear?: number;
  earliestValue?: number;
  deltaPct?: number;
  deltaPp?: number;
  multiple?: number;
  footnote?: string;
  series: WorldBankIndicatorPoint[];
  sourceUrl: string;
}

export interface RestCountriesMeta {
  iso3: string;
  iso2: string;
  name: string;
  officialName: string;
  flagEmoji: string;
  capital: string;
  region: string;
  subregion: string;
  population: number;
  areaSqKm: number;
  languages: string[];
  currency: string;
  borders: string[];
  url: string;
}

export interface EvidencePackEntry {
  id: string; // e.g. "SRC-1"
  title: string;
  publisher: string;
  year: string;
  url: string;
  sourceType: BriefSourceType;
  excerptOrIndicator: string;
  indicatorCode?: string;
  iso3?: string;
  facts: string[];
}

export interface EvidencePack {
  entries: EvidencePackEntry[];
  wbReadings: WorldBankIndicatorReading[];
  restCountries: RestCountriesMeta[];
  openAlexWorks: Array<{
    id: string;
    title: string;
    authors: string[];
    publisher: string;
    year: string;
    url: string;
    doi?: string;
    citedByCount?: number;
    abstract: string;
  }>;
  openAlexTrend: Array<{ year: number; count: number }>;
  crossrefWorks: Array<{
    title: string;
    authors: string[];
    publisher: string;
    year: string;
    url: string;
    doi?: string;
    citedByCount?: number;
    abstract: string;
  }>;
  wikiSummaries: Array<{ title: string; extract: string; url: string }>;
  failedProviders: string[];
  serializedForPrompt: string;
}

export type RetrievalProgressCallback = (event: {
  step: 1 | 2 | 3 | 4;
  label: string;
  status: "active" | "completed";
  elapsedMs: number;
}) => void;
