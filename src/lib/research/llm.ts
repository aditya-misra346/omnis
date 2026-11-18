import type { ResearchMode } from "@/types/omnis";
import {
  IntelligenceBriefLlmSchema,
  type IntelligenceBriefLlmPayload,
} from "@/lib/ai/contracts";
import {
  buildAssistantSystemPrompt,
  buildBriefSynthesisSystemPrompt,
  buildEditorialSystemPrompt,
  EditorialBriefPayloadSchema,
  sanitizeEditorialProse,
  type EditorialBriefPayload,
} from "@/lib/research/prompts";

type LlmEnv = Record<string, string | undefined>;
type LlmProvider = "openai" | "gemini" | "anthropic";

const LLM_TIMEOUT_MS = 12000;

function detectConfiguredProvider(env: LlmEnv = process.env): {
  provider: LlmProvider;
  apiKey: string;
} | null {
  const openaiKey = env.OPENAI_API_KEY?.trim();
  if (openaiKey) return { provider: "openai", apiKey: openaiKey };

  const geminiKey = env.GEMINI_API_KEY?.trim();
  if (geminiKey) return { provider: "gemini", apiKey: geminiKey };

  const anthropicKey = env.ANTHROPIC_API_KEY?.trim();
  if (anthropicKey) return { provider: "anthropic", apiKey: anthropicKey };

  const genericKey = env.AI_PROVIDER_API_KEY?.trim();
  if (genericKey) {
    if (genericKey.startsWith("sk-ant-")) return { provider: "anthropic", apiKey: genericKey };
    if (genericKey.startsWith("AIza")) return { provider: "gemini", apiKey: genericKey };
    return { provider: "openai", apiKey: genericKey };
  }

  return null;
}

export function hasConfiguredLlmKey(env: LlmEnv = process.env): boolean {
  return detectConfiguredProvider(env) !== null;
}

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

async function callProviderText(
  providerInfo: { provider: LlmProvider; apiKey: string },
  systemPrompt: string,
  userPrompt: string,
  expectJson: boolean,
  fetchImpl: typeof fetch = fetch
): Promise<string | null> {
  try {
    if (providerInfo.provider === "openai") {
      const res = await fetchImpl("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providerInfo.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          ...(expectJson ? { response_format: { type: "json_object" } } : {}),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return data.choices?.[0]?.message?.content?.trim() || null;
    }

    if (providerInfo.provider === "gemini") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(
        providerInfo.apiKey
      )}`;
      const res = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.2,
            ...(expectJson ? { responseMimeType: "application/json" } : {}),
          },
        }),
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    }

    const res = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": providerInfo.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 900,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      content?: { type?: string; text?: string }[];
    };
    return data.content?.find((b) => b.type === "text")?.text?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Optionally synthesizes a structured 4-layer EditorialBriefPayload when an LLM API key is set.
 * Returns null cleanly with zero latency when unconfigured or on any provider/schema error.
 */
export async function synthesizeEditorialWithOptionalLlm(params: {
  query: string;
  mode: ResearchMode;
  verifiedContext: string;
  fetchImpl?: typeof fetch;
  env?: LlmEnv;
}): Promise<EditorialBriefPayload | null> {
  const providerInfo = detectConfiguredProvider(params.env);
  if (!providerInfo) return null;

  const systemPrompt = buildEditorialSystemPrompt(params.mode, params.verifiedContext);
  const raw = await callProviderText(
    providerInfo,
    systemPrompt,
    `Question: ${params.query}`,
    true,
    params.fetchImpl
  );
  if (!raw) return null;

  try {
    const parsedJson = JSON.parse(stripCodeFences(raw));
    const validated = EditorialBriefPayloadSchema.safeParse(parsedJson);
    if (!validated.success) return null;

    const p = validated.data;
    return {
      bottomLine: sanitizeEditorialProse(p.bottomLine),
      keyNumbers: p.keyNumbers.map((k) => ({
        ...k,
        benchmarkContext: sanitizeEditorialProse(k.benchmarkContext),
      })),
      mechanisms: p.mechanisms.map((m) => ({
        ...m,
        explanation: sanitizeEditorialProse(m.explanation),
      })),
      whereExpertsDisagree: {
        topic: sanitizeEditorialProse(p.whereExpertsDisagree.topic),
        viewA: sanitizeEditorialProse(p.whereExpertsDisagree.viewA),
        viewB: sanitizeEditorialProse(p.whereExpertsDisagree.viewB),
        evidenceBalance: sanitizeEditorialProse(p.whereExpertsDisagree.evidenceBalance),
      },
    };
  } catch {
    return null;
  }
}

/**
 * Optionally refines a grounded AI Assistant reply using buildAssistantSystemPrompt.
 * Returns null cleanly with zero latency when unconfigured or on upstream failure.
 */
export async function synthesizeAssistantReplyWithOptionalLlm(params: {
  message: string;
  contextLabel: string;
  contextTopic: string;
  verifiedContext: string;
  fetchImpl?: typeof fetch;
  env?: LlmEnv;
}): Promise<string | null> {
  const providerInfo = detectConfiguredProvider(params.env);
  if (!providerInfo) return null;

  const systemPrompt = buildAssistantSystemPrompt(
    params.contextLabel,
    params.contextTopic,
    params.verifiedContext
  );
  const raw = await callProviderText(
    providerInfo,
    systemPrompt,
    params.message,
    false,
    params.fetchImpl
  );
  if (!raw) return null;

  const cleaned = sanitizeEditorialProse(raw);
  return cleaned || null;
}

/**
 * Synthesizes a structured IntelligenceBriefLlmPayload strictly grounded in VERIFIED EVIDENCE PACK
 * when an external LLM API key is configured. Returns null cleanly with zero latency otherwise.
 */
export async function synthesizeStructuredBriefWithOptionalLlm(params: {
  query: string;
  mode: ResearchMode;
  intent: string;
  serializedEvidencePack: string;
  unavailableRequestedMetric?: string | null;
  fetchImpl?: typeof fetch;
  env?: LlmEnv;
}): Promise<IntelligenceBriefLlmPayload | null> {
  const providerInfo = detectConfiguredProvider(params.env);
  if (!providerInfo) return null;

  const systemPrompt = buildBriefSynthesisSystemPrompt({
    mode: params.mode,
    intent: params.intent,
    serializedEvidencePack: params.serializedEvidencePack,
    unavailableRequestedMetric: params.unavailableRequestedMetric,
  });

  const raw = await callProviderText(
    providerInfo,
    systemPrompt,
    `User Question: ${params.query}`,
    true,
    params.fetchImpl
  );
  if (!raw) return null;

  try {
    const parsedJson = JSON.parse(stripCodeFences(raw));
    const validated = IntelligenceBriefLlmSchema.safeParse(parsedJson);
    if (!validated.success) return null;

    const p = validated.data;
    return {
      bottomLine: sanitizeEditorialProse(p.bottomLine),
      keyMetrics: p.keyMetrics.map((m) => ({
        ...m,
        benchmark: sanitizeEditorialProse(m.benchmark),
        everydayMeaning: sanitizeEditorialProse(m.everydayMeaning),
      })),
      sections: p.sections.map((s) => ({
        heading: sanitizeEditorialProse(s.heading),
        summary: sanitizeEditorialProse(s.summary),
        bullets: s.bullets.map((b) => ({
          point: sanitizeEditorialProse(b.point),
          sourceIds: b.sourceIds,
        })),
      })),
      practicalTakeaway: {
        whatItMeansInPractice: sanitizeEditorialProse(p.practicalTakeaway.whatItMeansInPractice),
        keyRisksOrTradeOffs: sanitizeEditorialProse(p.practicalTakeaway.keyRisksOrTradeOffs),
        dataLimitations: sanitizeEditorialProse(p.practicalTakeaway.dataLimitations),
      },
      suggestedFollowUps: p.suggestedFollowUps.map((f) => sanitizeEditorialProse(f)).filter(Boolean),
    };
  } catch {
    return null;
  }
}
