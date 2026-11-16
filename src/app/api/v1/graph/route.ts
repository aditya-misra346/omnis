import { buildInfiniteKnowledgeGraph } from "@/lib/graph/engine";
import { fetchOpenAlexSources, fetchWikimediaSummary } from "@/lib/providers/live-data";
import {
  clampIntParam,
  enforceRequestRateLimit,
  validateAndSanitizeInput,
} from "@/lib/security/guardrails";
import { GraphRequestSchema } from "@/types/omnis";

async function generateHydratedGraph(params: {
  topic: string;
  maxNodes: number;
  expandFromNodeId?: string;
}) {
  const [openAlexWorks, wikiSummary] = await Promise.all([
    fetchOpenAlexSources(params.topic, 5),
    fetchWikimediaSummary(params.topic),
  ]);

  return buildInfiniteKnowledgeGraph({
    topic: params.topic,
    maxNodes: params.maxNodes,
    expandFromNodeId: params.expandFromNodeId,
    openAlexWorks,
    wikiSummary,
  });
}

export async function GET(request: Request) {
  const rateLimited = enforceRequestRateLimit(request, "graph", 90, 60_000);
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const topic = searchParams.get("topic") ?? "Semiconductors";
  const check = validateAndSanitizeInput(topic, 200);
  if (!check.allowed) {
    return Response.json({ error: check.reason }, { status: 400 });
  }
  const graph = await generateHydratedGraph({
    topic: check.sanitizedText,
    maxNodes: clampIntParam(searchParams.get("maxNodes"), 32, 5, 60),
  });
  return Response.json(graph);
}

export async function POST(request: Request) {
  try {
    const rateLimited = enforceRequestRateLimit(request, "graph", 90, 60_000);
    if (rateLimited) return rateLimited;

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

    const graph = await generateHydratedGraph({
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
