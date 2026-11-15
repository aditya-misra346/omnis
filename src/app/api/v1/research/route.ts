import { orchestrateDeepResearch } from "@/lib/research/engine";
import { checkApiRateLimit, validateAndSanitizeInput } from "@/lib/security/guardrails";
import { ResearchRequestSchema } from "@/types/omnis";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    if (!checkApiRateLimit(`research:${ip}`, 60, 60_000).allowed) {
      return Response.json({ error: "Rate limit exceeded." }, { status: 429 });
    }

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
