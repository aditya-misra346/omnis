import { COUNTRIES_DATA } from "@/lib/data/global-intelligence";
import {
  WORLD_CATALOG_BY_ISO3,
  WORLD_COUNTRIES_CATALOG,
  type WorldCountryCatalogEntry,
} from "@/lib/data/world-catalog";

export interface FocusedSignal {
  iso3?: string;
  topic: string;
  label?: string;
}

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "into",
  "overview",
  "global",
  "intelligence",
  "republic",
  "kingdom",
  "state",
  "states",
  "federation",
]);

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasWordBoundaryMatch(haystack: string, needle: string, caseInsensitive = true): boolean {
  if (!needle.trim()) return false;
  const flags = caseInsensitive ? "i" : "";
  const pattern = new RegExp(`\\b${escapeRegExp(needle.trim())}\\b`, flags);
  return pattern.test(haystack);
}

/**
 * Matches all 130 sovereign nations in `WORLD_COUNTRIES_CATALOG` against natural-language
 * user messages and active context strings using word boundaries for names and exact uppercase
 * token checks for ISO3 codes (avoiding false positives like lowercase "can" or "are").
 */
export function matchCountryCatalogFromText(
  message: string,
  contextTopic = ""
): WorldCountryCatalogEntry | null {
  const combinedText = `${contextTopic} ${message}`.trim();
  if (!combinedText) return null;

  // 1. Highest priority: exact ISO3 standalone uppercase token in contextTopic or message
  const isoTokens = Array.from(combinedText.matchAll(/\b([A-Z]{3})\b/g)).map((m) => m[1]);
  for (const token of isoTokens) {
    if (WORLD_CATALOG_BY_ISO3[token]) {
      return WORLD_CATALOG_BY_ISO3[token];
    }
  }

  // 2. Match country common or official names sorted longest-first so multi-word names win
  const candidates: { entry: WorldCountryCatalogEntry; alias: string }[] = [];
  for (const entry of WORLD_COUNTRIES_CATALOG) {
    candidates.push({ entry, alias: entry.name });
    const curated = COUNTRIES_DATA[entry.iso3];
    if (curated && curated.officialName && curated.officialName !== entry.name) {
      candidates.push({ entry, alias: curated.officialName });
    }
  }
  candidates.sort((a, b) => b.alias.length - a.alias.length);

  for (const { entry, alias } of candidates) {
    if (alias.length < 3) continue;
    if (hasWordBoundaryMatch(message, alias, true) || hasWordBoundaryMatch(contextTopic, alias, true)) {
      return entry;
    }
  }

  return null;
}

/**
 * Extracts normalized semantic keywords for Spatial Cross-Filter Sync across Globe,
 * Knowledge Graph, and Historical Timeline modules.
 */
export function extractSignalTerms(signal: FocusedSignal | null | undefined): string[] {
  if (!signal) return [];
  const rawTerms: string[] = [];
  if (signal.topic) rawTerms.push(signal.topic);
  if (signal.iso3) {
    const upper = signal.iso3.trim().toUpperCase();
    const cat = WORLD_CATALOG_BY_ISO3[upper];
    if (cat?.name) rawTerms.push(cat.name);
    const curated = COUNTRIES_DATA[upper];
    if (curated?.capital) rawTerms.push(curated.capital);
    if (upper === "IND") rawTerms.push("indian");
    if (upper === "USA") rawTerms.push("american");
    if (upper === "CHN") rawTerms.push("chinese");
    if (upper === "DEU") rawTerms.push("german");
    if (upper === "GBR") rawTerms.push("british");
    if (upper === "JPN") rawTerms.push("japanese");
    if (upper === "FRA") rawTerms.push("french");
  }

  const tokens = new Set<string>();
  for (const phrase of rawTerms) {
    const cleanPhrase = phrase.trim().toLowerCase();
    if (cleanPhrase.length >= 3 && !STOPWORDS.has(cleanPhrase)) {
      tokens.add(cleanPhrase);
    }
    for (const part of cleanPhrase.split(/[^a-z0-9]+/)) {
      if (part.length >= 3 && !STOPWORDS.has(part)) {
        tokens.add(part);
      }
    }
  }
  return Array.from(tokens);
}

/**
 * Shared matcher for Knowledge Graph nodes and Historical Timeline events against
 * the active cross-module `FocusedSignal`.
 */
export function doesSignalMatchCandidate(
  signal: FocusedSignal | null | undefined,
  candidate: {
    countryIso3?: string;
    label?: string;
    summary?: string;
    title?: string;
    description?: string;
    historicalContext?: string;
    location?: string;
    connectedGraphTopics?: string[];
  }
): boolean {
  if (!signal) return false;

  if (
    signal.iso3 &&
    candidate.countryIso3 &&
    signal.iso3.trim().toUpperCase() === candidate.countryIso3.trim().toUpperCase()
  ) {
    return true;
  }

  const terms = extractSignalTerms(signal);
  if (terms.length === 0) return false;

  const haystack = [
    candidate.label,
    candidate.summary,
    candidate.title,
    candidate.description,
    candidate.historicalContext,
    candidate.location,
    ...(candidate.connectedGraphTopics ?? []),
  ]
    .filter(Boolean)
    .join(" ");

  return terms.some((term) => hasWordBoundaryMatch(haystack, term, true));
}
