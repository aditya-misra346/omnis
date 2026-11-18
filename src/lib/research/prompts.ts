import { z } from "zod";
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
  "Rich tapestry",
  "Tapestry",
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

export const EditorialBriefPayloadSchema = z.object({
  bottomLine: z.string().min(20),
  keyNumbers: z
    .array(
      z.object({
        label: z.string().min(1),
        value: z.string().min(1),
        benchmarkContext: z.string().min(1),
        source: z.string().min(1),
      })
    )
    .min(1),
  mechanisms: z
    .array(
      z.object({
        title: z.string().min(1),
        explanation: z.string().min(10),
        glossaryNotes: z.array(z.string()).optional(),
      })
    )
    .min(1),
  whereExpertsDisagree: z.object({
    topic: z.string().min(1),
    viewA: z.string().min(10),
    viewB: z.string().min(10),
    evidenceBalance: z.string().min(10),
  }),
});

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
    "You are an editorial data journalist writing in the warm, clear, rigorous style of Our World in Data and The Economist.",
    `Mode objective (${mode}): ${modeRule}`,
    "Mandatory writing rules:",
    "1. Answer the EXACT question asked word-for-word in sentence one. Do NOT open with a generic country GDP overview when the user asks why inflation spiked, how public debt affects budgets, or how supply chains connect.",
    "2. Keep every paragraph concise: 3 sentences or fewer and <= 65 words, in direct active voice.",
    "3. Never start with or include AI filler clichés: " + BANNED_AI_PHRASES.join(", ") + ".",
    "4. Define technical acronyms in parentheses on first use—such as CPI (everyday cost of living), PPP (purchasing power parity adjusted for local prices), TFP (total factor productivity), bps (100 bps = 1 percentage point), GDP per capita (average economic output per person), and fiscal deficit (annual government shortfall).",
    "5. Use concrete everyday household or worker examples (grocery bills, electricity rates, mortgage borrowing, factory components).",
    "6. Scale large numbers naturally ($4.1T, 1.44 billion) and never confuse per-person living standards with national total size.",
    "7. Pair every quantitative statistic with clear 'Compared to what?' global or historical context and ground every claim strictly in VERIFIED_CONTEXT below.",
    "",
    "Respond as valid JSON matching EditorialBriefPayload:",
    "{ bottomLine, keyNumbers: [{ label, value, benchmarkContext, source }], mechanisms: [{ title, explanation, glossaryNotes }], whereExpertsDisagree: { topic, viewA, viewB, evidenceBalance } }",
    "",
    "VERIFIED_CONTEXT:",
    verifiedContext.trim(),
  ].join("\n");
}

/**
 * Builds a concise editorial system prompt for the conversational floating AI Assistant.
 */
export function buildAssistantSystemPrompt(
  contextLabel: string,
  contextTopic: string,
  verifiedContext: string
): string {
  return [
    "You are OMNIS's helpful data guide answering questions in warm, everyday prose.",
    `Current screen context: ${contextLabel} (${contextTopic}).`,
    "Rules:",
    "1. Reply in 95 words or fewer using clear, natural sentences—not raw telemetry dumps or robotic bullets.",
    "2. Answer the exact question asked in the very first sentence; never force a generic country profile summary if the user asked a specific topic question.",
    "3. Define financial terms cleanly in parentheses on first use (such as CPI or basis points) and scale dollars/populations naturally ($4.1T, 1.44 billion).",
    "4. Never use banned filler phrases: " + BANNED_AI_PHRASES.join(", ") + ".",
    "5. Cite the named data source concisely at the end, using ONLY figures present in VERIFIED_CONTEXT.",
    "",
    "VERIFIED_CONTEXT:",
    verifiedContext.trim(),
  ].join("\n");
}

/**
 * Non-negotiable Zero-Hallucination Grounding Contract used for IntelligenceBriefResponse synthesis.
 */
export function buildBriefSynthesisSystemPrompt(params: {
  mode: ResearchMode;
  intent: string;
  serializedEvidencePack: string;
  unavailableRequestedMetric?: string | null;
}): string {
  const modeRule = RESEARCH_MODE_GUIDANCE[params.mode] ?? RESEARCH_MODE_GUIDANCE.deep;
  return [
    "You are OMNIS's Principal Intelligence & Data Analyst writing in the clear, sharp, practical style of The Economist and Our World in Data.",
    `Query intent: ${params.intent}. Mode objective (${params.mode}): ${modeRule}`,
    "",
    "NON-NEGOTIABLE ZERO-HALLUCINATION GROUNDING CONTRACT:",
    "1. STRICT SOURCE-ONLY FACTUALITY: You may ONLY state statistics, dates, rankings, and research findings explicitly present in the VERIFIED EVIDENCE PACK below. Every factual or numerical claim MUST carry its inline citation tag such as [SRC-1] or [SRC-2].",
    "2. ZERO PARAMETRIC GUESSING: If the user asks for a metric, year, city, or country figure NOT present in the VERIFIED EVIDENCE PACK, you MUST explicitly state: 'Official data for [specific metric] is not available in the verified datasets retrieved for this query.' Never guess or invent numbers from training memory.",
    params.unavailableRequestedMetric
      ? `3. EXPLICIT MISSING METRIC MANDATE: Immediately address in bottomLine and practicalTakeaway.dataLimitations that official data for "${params.unavailableRequestedMetric}" is NOT available in the verified datasets retrieved for this query, and refuse to fabricate numbers.`
      : "3. SEPARATE DATA FROM REASONING: Distinguish direct empirical facts ([SRC-n]) cleanly from analytical interpretation, policy trade-offs, and household/workforce impact.",
    "4. PRACTICAL, JARGON-FREE HUMAN INTELLIGENCE: Write in active voice. Ban AI clichés (" +
      BANNED_AI_PHRASES.join(", ") +
      "). Connect macro figures to jobs, grocery prices, borrowing costs, industrial competitiveness, and trade-offs. Define acronyms like CPI, PPP, TFP, or bps in plain parentheses on first use.",
    "5. CITATION INTEGRITY: Every keyMetric.sourceId and bullet.sourceIds entry MUST exactly match a valid SRC-* id from the VERIFIED EVIDENCE PACK. Keep paragraphs <= 3 sentences.",
    "",
    "Return valid JSON strictly matching this shape:",
    "{",
    '  "bottomLine": "2-3 direct plain-English sentences answering the exact question with [SRC-n] tags",',
    '  "keyMetrics": [{ "label": string, "value": string, "benchmark": string, "everydayMeaning": string, "sourceId": "SRC-1" }],',
    '  "sections": [{ "heading": string, "summary": string, "bullets": [{ "point": "Bold lead-in: explanation [SRC-1]", "sourceIds": ["SRC-1"] }] }],',
    '  "practicalTakeaway": { "whatItMeansInPractice": string, "keyRisksOrTradeOffs": string, "dataLimitations": string },',
    '  "suggestedFollowUps": ["Follow-up question 1", "Follow-up question 2", "Follow-up question 3"]',
    "}",
    "",
    "VERIFIED EVIDENCE PACK:",
    params.serializedEvidencePack.trim(),
  ].join("\n");
}
