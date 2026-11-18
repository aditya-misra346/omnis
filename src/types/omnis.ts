import { z } from "zod";
import type { IntelligenceBriefResponse } from "@/lib/ai/contracts";

export type VerificationStatus =
  | "verified"
  | "single_source"
  | "conflicting"
  | "interpretation"
  | "unverified"
  | "ai_hypothesis";

export interface ProvenanceMetadata {
  source: string;
  publisher: string;
  url: string;
  retrievedAt: string;
  lastUpdated: string;
  units: string;
  coverage: string;
  methodology?: string;
  missingData?: boolean;
  verificationStatus: VerificationStatus;
}

export type IntelligenceLayerId =
  | "geography"
  | "economics"
  | "demographics"
  | "energy"
  | "environment"
  | "technology"
  | "international";

export type RelationshipType =
  | "CAUSES"
  | "INFLUENCES"
  | "DEPENDS_ON"
  | "COMPETES_WITH"
  | "DEVELOPED_BY"
  | "RELATED_TO"
  | "HISTORICALLY_PRECEDED"
  | "PART_OF"
  | "REGULATES"
  | "SUPPORTS"
  | "CONTRADICTS";

export type GraphLayoutMode =
  | "force"
  | "radial"
  | "hierarchical"
  | "circular"
  | "tree"
  | "clustered";

export interface HistoricalSeriesPoint {
  year: number;
  gdpUsdBn: number;
  gdpPerCapitaUsd: number;
  gdpGrowthPct: number;
  inflationPct: number;
  renewableSharePct: number;
  internetPenetrationPct: number;
  lifeExpectancyYears: number;
}

export interface CountryIntelligenceProfile {
  iso3: string;
  iso2: string;
  name: string;
  officialName: string;
  flagEmoji: string;
  capital: string;
  region: string;
  subregion: string;
  lat: number;
  lng: number;
  population: number;
  populationDensityPerSqKm: number;
  medianAgeYears: number;
  urbanisationPct: number;
  lifeExpectancyYears: number;
  netMigrationPer1000: number;
  areaSqKm: number;
  languages: string[];
  currency: string;
  governmentStructure: string;
  headOfStateNote: string;
  gdpUsdBn: number;
  gdpPerCapitaUsd: number;
  gdpGrowthPct: number;
  inflationPct: number;
  unemploymentPct: number;
  publicDebtPctGdp: number;
  govExpenditurePctGdp: number;
  fdiNetInflowsUsdBn: number;
  tradeBalanceUsdBn: number;
  majorIndustries: string[];
  energyProfile: {
    oilProductionMbpd: number;
    naturalGasBcm: number;
    coalSharePct: number;
    renewableSharePct: number;
    nuclearSharePct: number;
    electricityGenerationTwh: number;
  };
  environmentProfile: {
    tempAnomalyC: number;
    co2EmissionsMt: number;
    co2PerCapitaTons: number;
    pm25AirQualityUgM3: number;
    forestCoveragePct: number;
    renewableWaterPerCapitaM3: number;
  };
  technologyProfile: {
    semiconductorRole: string;
    aiReadinessIndex: number;
    rdSpendPctGdp: number;
    internetPenetrationPct: number;
    digitalInfrastructureSummary: string;
  };
  educationHealthcare: {
    literacyRatePct: number;
    tertiaryEnrollmentPct: number;
    educationSpendPctGdp: number;
    healthcareSpendPctGdp: number;
    physiciansPer1000: number;
  };
  internationalRelations: {
    treatyMemberships: string[];
    topTradePartners: string[];
    diplomaticContext: string;
    geopoliticalDevelopments: string[];
  };
  geographyFeatures: {
    majorCities: string[];
    mountainRanges: string[];
    majorRivers: string[];
    oceanAccess: string[];
  };
  historicalMilestones: {
    year: number;
    title: string;
    significance: string;
  }[];
  currentDevelopments: {
    date: string;
    headline: string;
    summary: string;
    source: string;
  }[];
  futureEconomicScenarios: {
    horizon: string;
    baselineCagrPct: number;
    acceleratedReformCagrPct: number;
    headwindScenarioCagrPct: number;
    keyDrivers: string[];
  };
  historicalSeries: HistoricalSeriesPoint[];
  liveWorldBankOverride?: {
    latestYear: string;
    gdpUsdBn?: number;
    gdpPerCapitaUsd?: number;
    population?: number;
    inflationPct?: number;
    retrievedFromApi: boolean;
  };
  provenance: ProvenanceMetadata;
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  category:
    | "Core Concept"
    | "Technology"
    | "Economics"
    | "Geopolitics"
    | "Science"
    | "Energy"
    | "Environment"
    | "History"
    | "Institution"
    | "Scenario Hypothesis";
  summary: string;
  importance: number;
  verificationStatus: VerificationStatus;
  sources: {
    title: string;
    publisher: string;
    url: string;
    year: string;
  }[];
  keyMetrics?: { label: string; value: string; unit?: string }[];
}

export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: RelationshipType;
  evidence: string;
  citationUrl: string;
  isHypothesis: boolean;
  weight: number;
}

export interface KnowledgeGraphData {
  rootTopic: string;
  generatedAt: string;
  domainMatched?: string;
  isSynthesizedFallback?: boolean;
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  provenance: ProvenanceMetadata;
}

export type SimulationCategory =
  | "economics"
  | "demographics"
  | "energy"
  | "technology"
  | "environment";

export interface SimulationParameterSpec {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  baselineValue: number;
  defaultModifiedValue: number;
  description: string;
}

export interface SimulationScenarioSpec {
  id: string;
  category: SimulationCategory;
  title: string;
  subtitle: string;
  modelName: string;
  modelVersion: string;
  dependentVariableLabel: string;
  units: string;
  equationsLatex: string;
  parameters: SimulationParameterSpec[];
  baselineAssumptions: string[];
  limitations: string[];
  sourceAttribution: ProvenanceMetadata;
}

export interface SimulationTrajectoryPoint {
  year: number;
  historicalObserved: number | null;
  baseline: number;
  modifiedP10: number;
  modifiedP50: number;
  modifiedP90: number;
}

export interface SimulationSensitivityItem {
  parameterKey: string;
  label: string;
  lowOutcomeDelta: number;
  highOutcomeDelta: number;
  elasticityScore: number;
}

export interface SimulationRunOutput {
  scenarioId: string;
  scenarioTitle: string;
  category: SimulationCategory;
  modelName: string;
  modelVersion: string;
  timestamp: string;
  horizonYears: number;
  monteCarloIterations: number;
  seed: number;
  units: string;
  parametersUsed: Record<string, { baseline: number; modified: number; unit: string }>;
  initialAssumptions: string[];
  trajectory: SimulationTrajectoryPoint[];
  sensitivity: SimulationSensitivityItem[];
  summaryMetrics: {
    baselineTerminal: number;
    modifiedMedianTerminal: number;
    percentageDelta: number;
    uncertaintySpreadP90MinusP10: number;
  };
  analyticalExplanation: string;
  limitations: string[];
  provenance: ProvenanceMetadata;
}

export type TimelineEra = "ancient" | "medieval" | "modern" | "contemporary";

export type TimelineCategory =
  | "Scientific Discovery"
  | "Political Development"
  | "Economic Transformation"
  | "Technological Breakthrough"
  | "Conflict & Geopolitics"
  | "International Agreement"
  | "Cultural Milestone";

export interface HistoricalEventItem {
  id: string;
  slug: string;
  title: string;
  dateDisplay: string;
  yearNumeric: number;
  era: TimelineEra;
  category: TimelineCategory;
  location: string;
  countryIso3?: string;
  isMilestone: boolean;
  description: string;
  historicalContext: string;
  majorParticipants: string[];
  causes: string[];
  consequences: string[];
  relatedEventIds: string[];
  connectedGraphTopics: string[];
  sources: {
    title: string;
    publisher: string;
    author?: string;
    year: string;
    url: string;
    sourceType: "Primary Archive" | "Academic Monograph" | "Institutional Record";
  }[];
}

export type ResearchMode =
  | "quick"
  | "deep"
  | "comparative"
  | "historical"
  | "scientific"
  | "economic";

export interface ResearchSourceItem {
  id: string;
  title: string;
  publisher: string;
  authors: string[];
  publishedDate: string;
  retrievedAt: string;
  url: string;
  doi?: string;
  citedByCount?: number;
  sourceType:
    | "Primary Official Data"
    | "Peer-Reviewed Academic"
    | "Multilateral Institution"
    | "Archival Reference";
  supportingClaims: string[];
  excerpt: string;
}

export interface ResearchClaimItem {
  id: string;
  statement: string;
  category: string;
  verificationStatus: VerificationStatus;
  sourceIds: string[];
  methodologyNote: string;
}

export interface ResearchReportData {
  id: string;
  query: string;
  mode: ResearchMode;
  generatedAt: string;
  researchObjective: string;
  decomposedTasks: { step: number; task: string; sourceCategory: string; status: "completed" }[];
  executiveSummary: string;
  keyFindings: string[];
  detailedAnalysis: { heading: string; content: string }[];
  supportingEvidence: ResearchClaimItem[];
  contradictoryEvidence: {
    pointOfContention: string;
    perspectiveA: string;
    perspectiveB: string;
    epistemicResolution: string;
    sourceIds: string[];
  }[];
  relevantStatistics: {
    metric: string;
    value: string;
    unit: string;
    period: string;
    sourceId: string;
  }[];
  visualisationSeries: {
    title: string;
    unit: string;
    source: string;
    data: { label: string; primaryValue: number; comparisonValue?: number }[];
  };
  limitations: string[];
  conclusions: string;
  sources: ResearchSourceItem[];
  relatedGraphTopic: string;
  brief?: IntelligenceBriefResponse;
}

export const SimulationRequestSchema = z.object({
  scenarioId: z.string().min(2).max(128),
  category: z.enum(["economics", "demographics", "energy", "technology", "environment"]),
  horizonYears: z.number().int().min(5).max(50).default(15),
  seed: z.number().int().default(42),
  countryIso3: z.string().regex(/^(GLOBAL|[A-Z]{3})$/i).optional(),
  parameters: z.record(z.string(), z.number()),
});

export const GraphRequestSchema = z.object({
  topic: z.string().min(2).max(200),
  depth: z.number().int().min(1).max(3).default(2),
  maxNodes: z.number().int().min(5).max(60).default(28),
  expandFromNodeId: z.string().optional(),
});

export const ResearchRequestSchema = z.object({
  query: z.string().min(3).max(500),
  mode: z
    .enum(["quick", "deep", "comparative", "historical", "scientific", "economic"])
    .default("deep"),
});
