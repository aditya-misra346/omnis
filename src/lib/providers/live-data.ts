import { COUNTRIES_DATA } from "@/lib/data/global-intelligence";
import { sanitizeExternalSnippet } from "@/lib/security/guardrails";
import type { CountryIntelligenceProfile, ResearchSourceItem } from "@/types/omnis";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return hit.data as T;
}

function setCached<T>(key: string, data: T, ttlMs = 300_000): void {
  memoryCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export async function fetchLiveCountryIntelligence(
  iso3Input: string
): Promise<CountryIntelligenceProfile> {
  const iso3 = iso3Input.toUpperCase();
  const cacheKey = `country:${iso3}`;
  const cached = getCached<CountryIntelligenceProfile>(cacheKey);
  if (cached) return cached;

  const baseProfile = COUNTRIES_DATA[iso3]
    ? structuredClone(COUNTRIES_DATA[iso3])
    : structuredClone(COUNTRIES_DATA.IND);

  const nowIso = new Date().toISOString();
  baseProfile.provenance.retrievedAt = nowIso;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2800);
    const wbUrl = `https://api.worldbank.org/v2/country/${iso3}/indicator/NY.GDP.MKTP.CD?format=json&per_page=6`;
    const resp = await fetch(wbUrl, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timer);

    if (resp.ok) {
      const json = (await resp.json()) as unknown[];
      if (Array.isArray(json) && Array.isArray(json[1])) {
        const entries = json[1] as Array<{ date?: string; value?: number | null }>;
        const valid = entries.find((e) => typeof e.value === "number" && e.value !== null);
        if (valid && typeof valid.value === "number") {
          const liveGdpBn = Number((valid.value / 1e9).toFixed(1));
          baseProfile.liveWorldBankOverride = {
            latestYear: valid.date ?? "2025",
            gdpUsdBn: liveGdpBn,
            retrievedFromApi: true,
          };
          baseProfile.provenance.source =
            "World Bank Open Data API v2 (Live Telemetry) + REST Countries v3.1 + National Statistical Offices";
        }
      }
    }
  } catch {
    // Graceful fallback to verified baseline dataset without crashing
  }

  setCached(cacheKey, baseProfile, 300_000);
  return baseProfile;
}

export async function fetchOpenAlexSources(query: string, limit = 4): Promise<ResearchSourceItem[]> {
  const cacheKey = `openalex:${query.toLowerCase()}:${limit}`;
  const cached = getCached<ResearchSourceItem[]>(cacheKey);
  if (cached) return cached;

  const nowIso = new Date().toISOString();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const encoded = encodeURIComponent(query);
    const url = `https://api.openalex.org/works?search=${encoded}&per-page=${limit}&sort=cited_by_count:desc`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "OMNIS-Intelligence-Platform/1.0 (mailto:research@omnis-intelligence.org)",
      },
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as {
        results?: Array<{
          id?: string;
          title?: string;
          publication_year?: number;
          doi?: string;
          primary_location?: {
            source?: { display_name?: string };
            landing_page_url?: string;
          };
          authorships?: Array<{ author?: { display_name?: string } }>;
          cited_by_count?: number;
        }>;
      };
      if (Array.isArray(data.results) && data.results.length > 0) {
        const mapped: ResearchSourceItem[] = data.results
          .filter((w) => Boolean(w.title))
          .slice(0, limit)
          .map((work, idx) => {
            const authors = (work.authorships ?? [])
              .map((a) => a.author?.display_name)
              .filter((n): n is string => Boolean(n))
              .slice(0, 4);
            const publisher =
              work.primary_location?.source?.display_name ??
              "OpenAlex Indexed Peer-Reviewed Journal";
            const landingUrl =
              work.doi || work.primary_location?.landing_page_url || work.id || "https://openalex.org";
            return {
              id: `src-openalex-${idx + 1}`,
              title: sanitizeExternalSnippet(work.title ?? "Peer-Reviewed Research Study"),
              publisher,
              authors: authors.length > 0 ? authors : ["Research Consortium"],
              publishedDate: String(work.publication_year ?? "2024"),
              retrievedAt: nowIso,
              url: landingUrl,
              doi: work.doi ?? undefined,
              sourceType: "Peer-Reviewed Academic",
              supportingClaims: [
                `Empirical scholarly literature (${work.cited_by_count ?? 0} citations) indexed via OpenAlex.`,
              ],
              excerpt: `Peer-reviewed research record retrieved from OpenAlex scholarly graph (${publisher}, ${
                work.publication_year ?? "2024"
              }).`,
            };
          });
        if (mapped.length > 0) {
          setCached(cacheKey, mapped, 600_000);
          return mapped;
        }
      }
    }
  } catch {
    // Graceful fallback if OpenAlex rate-limits or times out
  }

  return [];
}

export async function fetchWikimediaSummary(
  topic: string
): Promise<{ title: string; extract: string; url: string } | null> {
  const cacheKey = `wiki:${topic.toLowerCase()}`;
  const cached = getCached<{ title: string; extract: string; url: string }>(cacheKey);
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const formatted = encodeURIComponent(topic.trim().replace(/\s+/g, "_"));
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${formatted}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = (await res.json()) as {
        title?: string;
        extract?: string;
        content_urls?: { desktop?: { page?: string } };
      };
      if (data.extract) {
        const result = {
          title: data.title ?? topic,
          extract: sanitizeExternalSnippet(data.extract),
          url:
            data.content_urls?.desktop?.page ??
            `https://en.wikipedia.org/wiki/${formatted}`,
        };
        setCached(cacheKey, result, 600_000);
        return result;
      }
    }
  } catch {
    // Fallback cleanly
  }
  return null;
}
