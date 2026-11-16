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
  source?: string;
  updatedAt?: number;
}

const SORTED_COUNTRY_ALIAS_CANDIDATES: { entry: WorldCountryCatalogEntry; alias: string }[] = (() => {
  const list: { entry: WorldCountryCatalogEntry; alias: string }[] = [];
  for (const entry of WORLD_COUNTRIES_CATALOG) {
    list.push({ entry, alias: entry.name });
    const curated = COUNTRIES_DATA[entry.iso3];
    if (curated && curated.officialName && curated.officialName !== entry.name) {
      list.push({ entry, alias: curated.officialName });
    }
  }
  return list.sort((a, b) => b.alias.length - a.alias.length);
})();

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

function matchSingleTextPass(text: string): WorldCountryCatalogEntry | null {
  const clean = text.trim();
  if (!clean) return null;

  // 1. Exact standalone uppercase ISO3 token inside this single text input
  const isoTokens = Array.from(clean.matchAll(/\b([A-Z]{3})\b/g)).map((m) => m[1]);
  for (const token of isoTokens) {
    if (WORLD_CATALOG_BY_ISO3[token]) {
      return WORLD_CATALOG_BY_ISO3[token];
    }
  }

  // 2. Country common/official names sorted longest-first
  for (const { entry, alias } of SORTED_COUNTRY_ALIAS_CANDIDATES) {
    if (alias.length < 3) continue;
    if (hasWordBoundaryMatch(clean, alias, true)) {
      return entry;
    }
  }

  return null;
}

/**
 * Matches all 130 sovereign nations in `WORLD_COUNTRIES_CATALOG` against natural-language
 * user messages first, falling back to `contextTopic` only when `message` names no sovereign nation.
 */
export function matchCountryCatalogFromText(
  message: string,
  contextTopic = ""
): WorldCountryCatalogEntry | null {
  return matchSingleTextPass(message) ?? matchSingleTextPass(contextTopic);
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
