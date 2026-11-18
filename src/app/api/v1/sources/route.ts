import {
  fetchCrossrefSources,
  fetchOpenAlexPublicationTrend,
  fetchOpenAlexSources,
  fetchWikimediaSummary,
} from "@/lib/providers/live-data";
import {
  clampIntParam,
  enforceRequestRateLimit,
  validateAndSanitizeInput,
} from "@/lib/security/guardrails";

export async function GET(request: Request) {
  const rateLimited = enforceRequestRateLimit(request, "sources", 120, 60_000);
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider") ?? "openalex-sources";
  const rawQuery = searchParams.get("q") ?? searchParams.get("topic") ?? "";
  const limit = clampIntParam(searchParams.get("limit"), 4, 1, 10);

  const check = validateAndSanitizeInput(rawQuery, 200);
  if (!check.allowed || !check.sanitizedText.trim()) {
    return Response.json(
      { ok: false, items: [], trend: [], summary: null },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  const clean = check.sanitizedText.trim();

  if (provider === "openalex-trend") {
    const trend = await fetchOpenAlexPublicationTrend(clean);
    return Response.json(
      { ok: true, trend },
      { headers: { "Cache-Control": "public, max-age=180, s-maxage=300" } }
    );
  }

  if (provider === "wikimedia") {
    const summary = await fetchWikimediaSummary(clean);
    return Response.json(
      { ok: true, summary },
      { headers: { "Cache-Control": "public, max-age=180, s-maxage=300" } }
    );
  }

  if (provider === "crossref") {
    const items = await fetchCrossrefSources(clean, limit);
    return Response.json(
      { ok: true, items },
      { headers: { "Cache-Control": "public, max-age=180, s-maxage=300" } }
    );
  }

  const items = await fetchOpenAlexSources(clean, limit);
  return Response.json(
    { ok: true, items },
    { headers: { "Cache-Control": "public, max-age=180, s-maxage=300" } }
  );
}
