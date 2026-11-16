import { orchestrateDeepResearch } from "@/lib/research/engine";
import { enforceRequestRateLimit, validateAndSanitizeInput } from "@/lib/security/guardrails";
import { ResearchMode, ResearchRequestSchema } from "@/types/omnis";

const VALID_RESEARCH_MODES = new Set<ResearchMode>([
  "quick",
  "deep",
  "comparative",
  "historical",
  "scientific",
  "economic",
]);

export async function GET(request: Request) {
  const rateLimited = enforceRequestRateLimit(request, "research", 60, 60_000);
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? searchParams.get("query") ?? "Explain India's economic development since 1991";
  const rawMode = (searchParams.get("mode") ?? "deep") as ResearchMode;
  const mode: ResearchMode = VALID_RESEARCH_MODES.has(rawMode) ? rawMode : "deep";
  const check = validateAndSanitizeInput(query, 500);
  if (!check.allowed) {
    return Response.json({ error: check.reason }, { status: 400 });
  }
  const report = await orchestrateDeepResearch(check.sanitizedText, mode);
  return Response.json(report);
}

export async function POST(request: Request) {
  try {
    const rateLimited = enforceRequestRateLimit(request, "research", 60, 60_000);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const parsed = ResearchRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid research parameters.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const check = validateAndSanitizeInput(parsed.data.query, 500);
    if (!check.allowed) {
      return Response.json({ error: check.reason }, { status: 400 });
    }

    const report = await orchestrateDeepResearch(check.sanitizedText, parsed.data.mode);
    return Response.json(report);
  } catch (err) {
    console.error("[OMNIS Research API] Error:", err);
    return Response.json({ error: "Research orchestration failed." }, { status: 500 });
  }
}
