import { buildInfiniteKnowledgeGraph } from "@/lib/graph/engine";
import { checkApiRateLimit, validateAndSanitizeInput } from "@/lib/security/guardrails";
import { GraphRequestSchema } from "@/types/omnis";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    if (!checkApiRateLimit(`graph:${ip}`, 90, 60_000).allowed) {
      return Response.json({ error: "Rate limit exceeded." }, { status: 429 });
    }

    const body = await request.json();
    const parsed = GraphRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid graph request parameters.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const check = validateAndSanitizeInput(parsed.data.topic, 200);
    if (!check.allowed) {
      return Response.json({ error: check.reason }, { status: 400 });
    }

    const graph = buildInfiniteKnowledgeGraph({
      topic: check.sanitizedText,
      maxNodes: parsed.data.maxNodes,
      expandFromNodeId: parsed.data.expandFromNodeId,
    });

    return Response.json(graph);
  } catch (err) {
    console.error("[OMNIS Graph API] Error:", err);
    return Response.json({ error: "Failed to generate knowledge graph." }, { status: 500 });
  }
}
