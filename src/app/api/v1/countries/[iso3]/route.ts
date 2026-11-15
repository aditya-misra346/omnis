import { fetchLiveCountryIntelligence } from "@/lib/providers/live-data";

export async function GET(
  _request: Request,
  context: { params: Promise<{ iso3: string }> }
) {
  const { iso3 } = await context.params;
  if (!iso3 || iso3.length !== 3) {
    console.error("[OMNIS Country API] Invalid ISO3:", iso3);
    return Response.json({ error: "Valid 3-letter ISO country code required." }, { status: 400 });
  }
  const profile = await fetchLiveCountryIntelligence(iso3);
  return Response.json(profile);
}
