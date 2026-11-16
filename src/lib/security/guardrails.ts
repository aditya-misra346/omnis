const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above|system)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior|system)\s+(instructions|prompts)/i,
  /reveal\s+(your\s+)?(system\s+prompt|api\s+key|secret|private\s+key|credentials)/i,
  /you\s+are\s+now\s+in\s+(developer|dan|jailbreak|unrestricted)\s+mode/i,
  /<\s*script\b/i,
  /javascript\s*:/i,
];

const rateLimitStore = new Map<string, number[]>();

export interface GuardrailResult {
  allowed: boolean;
  sanitizedText: string;
  reason?: string;
}

export function validateAndSanitizeInput(input: string, maxLength = 600): GuardrailResult {
  if (typeof input !== "string") {
    return { allowed: false, sanitizedText: "", reason: "Input must be a valid string." };
  }
  const trimmed = input.trim().slice(0, maxLength);
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        sanitizedText: "",
        reason:
          "Input blocked by OMNIS AI Security Guardrail: Potential instruction-override or script injection payload detected.",
      };
    }
  }
  // Strip control characters and raw HTML angle brackets while preserving mathematical symbols
  const cleaned = trimmed.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F<>]/g, "");
  return { allowed: true, sanitizedText: cleaned };
}

export function sanitizeExternalSnippet(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/ignore\s+previous\s+instructions/gi, "[redacted]")
    .trim()
    .slice(0, 1200);
}

export function checkApiRateLimit(
  clientKey: string,
  maxRequests = 120,
  windowMs = 60_000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  // Periodically prune expired client keys to avoid unbounded Map growth in long-lived processes
  if (rateLimitStore.size > 512) {
    for (const [key, timestamps] of rateLimitStore.entries()) {
      const fresh = timestamps.filter((ts) => now - ts < windowMs);
      if (fresh.length === 0) rateLimitStore.delete(key);
      else rateLimitStore.set(key, fresh);
    }
  }
  const history = rateLimitStore.get(clientKey) ?? [];
  const valid = history.filter((ts) => now - ts < windowMs);
  if (valid.length >= maxRequests) {
    rateLimitStore.set(clientKey, valid);
    return { allowed: false, remaining: 0 };
  }
  valid.push(now);
  rateLimitStore.set(clientKey, valid);
  return { allowed: true, remaining: maxRequests - valid.length };
}

/**
 * Shared API route rate-limit guard returning an HTTP 429 JSON Response when exceeded,
 * or null when the request is permitted to proceed.
 */
export function enforceRequestRateLimit(
  request: Request,
  prefix: string,
  maxRequests = 90,
  windowMs = 60_000
): Response | null {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  if (!checkApiRateLimit(`${prefix}:${ip}`, maxRequests, windowMs).allowed) {
    return Response.json({ error: "Rate limit exceeded." }, { status: 429 });
  }
  return null;
}

/**
 * Parses and safely clamps an integer query string parameter within [min, max].
 */
export function clampIntParam(
  raw: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  if (raw === null || raw.trim() === "") return fallback;
  const num = Number(raw);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}
