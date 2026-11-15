import { fetchLiveCountryIntelligence } from "@/lib/providers/live-data";

export async function GET(
  _request: Request,
  context: { params: Promise<{ iso3: string }> }
) {
  const { iso3 } = await context.params;
  if (!iso3 || !/^[A-Za-z]{3}$/.test(iso3.trim())) {
    return Response.json(
      { error: "Valid 3-letter ISO country code required." },
      { status: 400 }
    );
  }
  const profile = await fetchLiveCountryIntelligence(iso3);
  if (!profile) {
    return Response.json(
      { error: `No verified or live-hydrated sovereign dossier found for ISO3 "${iso3.toUpperCase()}".` },
      { status: 404 }
    );
  }
  return Response.json(profile);
}
