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
