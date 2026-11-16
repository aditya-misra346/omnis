import { COUNTRIES_DATA } from "@/lib/data/global-intelligence";
import { enforceRequestRateLimit } from "@/lib/security/guardrails";

export async function GET(request: Request) {
  const rateLimited = enforceRequestRateLimit(request, "countries-list", 120, 60_000);
  if (rateLimited) return rateLimited;
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region");
  const all = Object.values(COUNTRIES_DATA);
  const filtered = region
    ? all.filter((c) => c.region.toLowerCase() === region.toLowerCase())
    : all;

  console.info(`[OMNIS Countries API] Serving ${filtered.length} sovereign profiles`);
  return Response.json({
    count: filtered.length,
    countries: filtered,
    retrievedAt: new Date().toISOString(),
  });
}
