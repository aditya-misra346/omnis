import {
  fetchOpenAlexPublicationTrend,
  fetchOpenAlexSources,
  fetchWikimediaSummary,
} from "@/lib/providers/live-data";
import { validateAndSanitizeInput } from "@/lib/security/guardrails";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider") ?? "openalex-sources";
  const rawQuery = searchParams.get("q") ?? searchParams.get("topic") ?? "";
  const limitRaw = Number(searchParams.get("limit") ?? 4);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(10, Math.round(limitRaw))) : 4;

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

  const items = await fetchOpenAlexSources(clean, limit);
  return Response.json(
    { ok: true, items },
    { headers: { "Cache-Control": "public, max-age=180, s-maxage=300" } }
  );
}
