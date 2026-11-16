import { clampIntParam, enforceRequestRateLimit } from "@/lib/security/guardrails";
import { executeWhatIfSimulation, SIMULATION_SCENARIOS } from "@/lib/simulations/engine";
import { SimulationCategory, SimulationRequestSchema } from "@/types/omnis";

const VALID_CATEGORIES = new Set<SimulationCategory>(
  SIMULATION_SCENARIOS.map((s) => s.category)
);

export async function GET(request: Request) {
  const rateLimited = enforceRequestRateLimit(request, "simulate", 90, 60_000);
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const scenarioId = searchParams.get("scenarioId") ?? "econ-macro-shock";
  const rawCategory = (searchParams.get("category") ?? "economics") as SimulationCategory;
  const category: SimulationCategory = VALID_CATEGORIES.has(rawCategory)
    ? rawCategory
    : "economics";
  const rawCountry = (searchParams.get("country") ?? searchParams.get("countryIso3"))?.trim().toUpperCase();
  const countryIso3 =
    rawCountry && /^(GLOBAL|[A-Z]{3})$/.test(rawCountry) ? rawCountry : undefined;
  const result = executeWhatIfSimulation({
    scenarioId,
    category,
    horizonYears: clampIntParam(searchParams.get("horizonYears"), 15, 5, 50),
    seed: clampIntParam(searchParams.get("seed"), 42, 1, 999_999),
    countryIso3,
    overrides: {},
  });
  return Response.json({
    scenarios: SIMULATION_SCENARIOS.map((s) => ({
      id: s.id,
      title: s.title,
      category: s.category,
      modelName: s.modelName,
      units: s.units,
    })),
    activeSimulation: result,
  });
}

export async function POST(request: Request) {
  try {
    const rateLimited = enforceRequestRateLimit(request, "simulate", 90, 60_000);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const parsed = SimulationRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid simulation request.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = executeWhatIfSimulation({
      scenarioId: parsed.data.scenarioId,
      category: parsed.data.category,
      horizonYears: parsed.data.horizonYears,
      seed: parsed.data.seed,
      countryIso3: parsed.data.countryIso3?.toUpperCase(),
      overrides: parsed.data.parameters,
    });

    return Response.json(result);
  } catch (err) {
    console.error("[OMNIS Simulate API] Error:", err);
    return Response.json({ error: "Simulation execution failed." }, { status: 500 });
  }
}
