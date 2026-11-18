import { orchestrateAddyIntelligence } from "@/lib/ai/addyIntelligence";
import { enforceRequestRateLimit, validateAndSanitizeInput } from "@/lib/security/guardrails";
import { ResearchMode, ResearchRequestSchema } from "@/types/omnis";

const VALID_MODES = new Set<ResearchMode>([
  "quick",
  "deep",
  "comparative",
  "historical",
  "scientific",
  "economic",
]);

function streamBrief(query: string, mode: ResearchMode): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const write = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
        } catch {
          // Closed
        }
      };
      try {
        const { brief } = await orchestrateAddyIntelligence(query, mode, {
          onProgress: (stage) => write({ type: "stage", ...stage }),
        });
        write({ type: "result", data: brief });
      } catch (err) {
        console.error("[AddyIntelligence Brief Stream] Error:", err);
        write({ type: "error", error: "AddyIntelligence brief orchestration failed." });
      } finally {
        try {
          controller.close();
        } catch {
          // Closed
        }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
    },
  });
}

export async function GET(request: Request) {
  const rateLimited = enforceRequestRateLimit(request, "research", 60, 60_000);
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q") ?? searchParams.get("query") ?? "";
  const rawMode = (searchParams.get("mode") ?? "deep") as ResearchMode;
  const mode: ResearchMode = VALID_MODES.has(rawMode) ? rawMode : "deep";

  const check = validateAndSanitizeInput(rawQuery, 500);
  if (!check.allowed || check.sanitizedText.trim().length < 3) {
    return Response.json(
      { error: check.allowed ? "Please enter at least 3 characters." : check.reason },
      { status: 400 }
    );
  }

  const wantsStream =
    searchParams.get("stream") === "1" ||
    Boolean(request.headers.get("accept")?.includes("application/x-ndjson"));

  if (wantsStream) {
    return streamBrief(check.sanitizedText, mode);
  }
  const { brief } = await orchestrateAddyIntelligence(check.sanitizedText, mode);
  return Response.json(brief);
}

export async function POST(request: Request) {
  try {
    const rateLimited = enforceRequestRateLimit(request, "research", 60, 60_000);
    if (rateLimited) return rateLimited;

    const body = (await request.json()) as {
      query?: unknown;
      mode?: unknown;
      stream?: boolean;
    };
    const parsed = ResearchRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid brief parameters.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const check = validateAndSanitizeInput(parsed.data.query, 500);
    if (!check.allowed) {
      return Response.json({ error: check.reason }, { status: 400 });
    }

    const wantsStream =
      body.stream === true ||
      Boolean(request.headers.get("accept")?.includes("application/x-ndjson"));

    if (wantsStream) {
      return streamBrief(check.sanitizedText, parsed.data.mode);
    }

    const { brief } = await orchestrateAddyIntelligence(check.sanitizedText, parsed.data.mode);
    return Response.json(brief);
  } catch (err) {
    console.error("[AddyIntelligence Brief API] Error:", err);
    return Response.json({ error: "AddyIntelligence brief orchestration failed." }, { status: 500 });
  }
}
