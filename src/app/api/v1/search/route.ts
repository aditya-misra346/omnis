import { executeUniversalSearch } from "@/lib/research/engine";
import { checkApiRateLimit, validateAndSanitizeInput } from "@/lib/security/guardrails";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const rate = checkApiRateLimit(`search:${ip}`, 120, 60_000);
  if (!rate.allowed) {
    return Response.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "all";

  const check = validateAndSanitizeInput(rawQuery, 400);
  if (!check.allowed) {
    console.error("[OMNIS Security] Rejected search query:", check.reason);
    return Response.json({ error: check.reason }, { status: 400 });
  }

  const results = executeUniversalSearch(check.sanitizedText, category);
  return Response.json(results);
}
