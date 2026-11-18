import type { ResearchMode } from "@/types/omnis";

export const BANNED_AI_PHRASES = [
  "Multi-source synthesis",
  "Delving into",
  "It is worth noting",
  "In the realm of",
  "Moreover",
  "In conclusion",
  "Furthermore",
  "It is important to note",
  "Ever-evolving landscape",
  "Testament to",
] as const;

export const RESEARCH_MODE_GUIDANCE: Record<ResearchMode, string> = {
  quick:
    "Lead immediately with a crisp 2-sentence bottom line and 3 verified benchmark numbers. Skip background history.",
  deep:
    "Deliver a thorough 4-layer brief covering the bottom line, benchmarked numbers, everyday cause-and-effect mechanics, and honest expert disagreements.",
  comparative:
    "Highlight ratios, per-person vs national-scale gaps, and concrete tradeoffs against peer countries or industry benchmarks.",
  historical:
    "Explain how reforms, crises, and technology turning points compounded over 5–30 years into today's outcomes.",
  scientific:
    "Center peer-reviewed empirical evidence from OpenAlex, physical constraints, and why real-world deployment can lag lab benchmarks.",
  economic:
    "Focus on real growth drivers, household prices (inflation), public debt, borrowing costs, R&D intensity, and productivity per worker.",
};

export interface EditorialBriefPayload {
  bottomLine: string;
  keyNumbers: {
    label: string;
    value: string;
    benchmarkContext: string;
    source: string;
  }[];
  mechanisms: {
    title: string;
    explanation: string;
    glossaryNotes?: string[];
  }[];
  whereExpertsDisagree: {
    topic: string;
    viewA: string;
    viewB: string;
    evidenceBalance: string;
  };
}

/**
 * Removes predictable AI filler openings while preserving exact data values and clarity.
 */
export function sanitizeEditorialProse(text: string): string {
  let out = text.trim();
  for (const phrase of BANNED_AI_PHRASES) {
    const leadingPattern = new RegExp(`^${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[:\\s,—-]*`, "i");
    out = out.replace(leadingPattern, "");
    const inlinePattern = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[:,\\s]+`, "gi");
    out = out.replace(inlinePattern, "");
  }
  if (!out) return "";
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/**
 * Builds the strict editorial system prompt and schema instructions used when
 * an external LLM provider key is configured for /api/v1/research or /api/v1/assistant.
 */
export function buildEditorialSystemPrompt(
  mode: ResearchMode,
  verifiedContext: string
): string {
  const modeRule = RESEARCH_MODE_GUIDANCE[mode] ?? RESEARCH_MODE_GUIDANCE.deep;
  return [
    "You are an editorial data journalist writing in the clear, accurate style of Our World in Data and The Economist.",
    `Mode objective (${mode}): ${modeRule}`,
    "Writing rules:",
    "1. Lead directly with the answer in active voice. Keep every paragraph to 3 sentences or fewer.",
    "2. Never start with filler clichés: " + BANNED_AI_PHRASES.join(", ") + ".",
    "3. Define financial or macro terms in plain parentheses on first use—such as CPI (everyday cost of living), basis points (100 bps = 1 percentage point), or PPP.",
    "4. Always scale big dollar or headcount figures naturally ($4.1T, 1.44 billion) and pair statistics with 'Compared to what?' global or historical context.",
    "5. Ground every number strictly in VERIFIED_CONTEXT below. Never invent statistics, citations, or URLs. Separate unconfirmed scenarios cleanly from measured data.",
    "",
    "Respond as valid JSON matching EditorialBriefPayload:",
    "{ bottomLine, keyNumbers: [{ label, value, benchmarkContext, source }], mechanisms: [{ title, explanation, glossaryNotes }], whereExpertsDisagree: { topic, viewA, viewB, evidenceBalance } }",
    "",
    "VERIFIED_CONTEXT:",
    verifiedContext.trim(),
  ].join("\n");
}
