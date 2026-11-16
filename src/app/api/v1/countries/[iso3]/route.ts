import {
  buildPlaceholderCountryProfile,
  WORLD_CATALOG_BY_ISO3,
} from "@/lib/data/world-catalog";
import { fetchLiveCountryIntelligence } from "@/lib/providers/live-data";
import { enforceRequestRateLimit } from "@/lib/security/guardrails";

export async function GET(
  request: Request,
  context: { params: Promise<{ iso3: string }> }
) {
  const rateLimited = enforceRequestRateLimit(request, "country-profile", 120, 60_000);
  if (rateLimited) return rateLimited;
  const { iso3 } = await context.params;
  if (!iso3 || !/^[A-Za-z]{3}$/.test(iso3.trim())) {
    return Response.json(
      { error: "Valid 3-letter ISO country code required." },
      { status: 400 }
    );
  }
  const upperIso = iso3.trim().toUpperCase();
  const profile = await fetchLiveCountryIntelligence(upperIso);
  if (!profile) {
    if (WORLD_CATALOG_BY_ISO3[upperIso]) {
      const catalogFallback = buildPlaceholderCountryProfile(upperIso);
      if (catalogFallback) {
        return Response.json(catalogFallback, { status: 200 });
      }
    }
    return Response.json(
      { error: `No verified or live-hydrated sovereign dossier found for ISO3 "${upperIso}".` },
      { status: 404 }
    );
  }
  return Response.json(profile);
}
