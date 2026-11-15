import { checkApiRateLimit } from "@/lib/security/guardrails";
import { executeWhatIfSimulation, SIMULATION_SCENARIOS } from "@/lib/simulations/engine";
import { SimulationCategory, SimulationRequestSchema } from "@/types/omnis";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scenarioId = searchParams.get("scenarioId") ?? "econ-macro-shock";
  const category = (searchParams.get("category") as SimulationCategory) ?? "economics";
  const result = executeWhatIfSimulation({
    scenarioId,
    category,
    horizonYears: Number(searchParams.get("horizonYears") ?? 10),
    seed: Number(searchParams.get("seed") ?? 42),
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
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    if (!checkApiRateLimit(`simulate:${ip}`, 90, 60_000).allowed) {
      return Response.json({ error: "Rate limit exceeded." }, { status: 429 });
    }

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
      overrides: parsed.data.parameters,
    });

    return Response.json(result);
  } catch (err) {
    console.error("[OMNIS Simulate API] Error:", err);
    return Response.json({ error: "Simulation execution failed." }, { status: 500 });
  }
}
