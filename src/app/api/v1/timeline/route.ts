import { TIMELINE_EVENTS } from "@/lib/data/global-intelligence";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const era = searchParams.get("era") ?? "all";
  const category = searchParams.get("category") ?? "all";
  const country = searchParams.get("country") ?? "all";
  const q = (searchParams.get("q") ?? "").toLowerCase().trim();

  const filtered = TIMELINE_EVENTS.filter((evt) => {
    if (era !== "all" && evt.era !== era) return false;
    if (category !== "all" && evt.category !== category) return false;
    if (country !== "all" && evt.countryIso3 !== country) return false;
    if (
      q &&
      !`${evt.title} ${evt.description} ${evt.historicalContext} ${evt.location}`
        .toLowerCase()
        .includes(q)
    ) {
      return false;
    }
    return true;
  }).sort((a, b) => a.yearNumeric - b.yearNumeric);

  console.info(`[OMNIS Timeline API] Returning ${filtered.length} historical events`);
  return Response.json({
    count: filtered.length,
    events: filtered,
    retrievedAt: new Date().toISOString(),
  });
}
