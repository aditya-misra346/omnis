import type { ResearchMode, ResearchReportData } from "@/types/omnis";

export interface RetrievalStageState {
  step: 1 | 2 | 3 | 4;
  label: string;
  status: "active" | "completed";
  elapsedMs: number;
}

/**
 * Invokes /api/v1/research using NDJSON progressive stage streaming when supported,
 * seamlessly falling back to standard JSON parsing if a proxy or cache returns JSON.
 */
export async function streamResearchWithProgress(
  query: string,
  mode: ResearchMode,
  options?: {
    signal?: AbortSignal;
    onStage?: (stage: RetrievalStageState) => void;
  }
): Promise<ResearchReportData> {
  const res = await fetch("/api/v1/research", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/x-ndjson, application/json",
    },
    body: JSON.stringify({ query, mode, stream: true }),
    signal: options?.signal,
  });

  if (!res.ok) {
    let message = "Research request failed.";
    try {
      const errJson = (await res.json()) as { error?: string };
      if (errJson?.error) message = errJson.error;
    } catch {
      // Ignore parse error
    }
    throw new Error(message);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("ndjson") || !res.body) {
    return (await res.json()) as ResearchReportData;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: ResearchReportData | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const evt = JSON.parse(trimmed) as
        | {
            type: "stage";
            step: 1 | 2 | 3 | 4;
            label: string;
            status: "active" | "completed";
            elapsedMs: number;
          }
        | { type: "result"; data: ResearchReportData }
        | { type: "error"; error?: string };

      if (evt.type === "stage") {
        options?.onStage?.({
          step: evt.step,
          label: evt.label,
          status: evt.status,
          elapsedMs: evt.elapsedMs,
        });
      } else if (evt.type === "result") {
        finalResult = evt.data;
      } else if (evt.type === "error") {
        throw new Error(evt.error || "Research orchestration failed.");
      }
    }
  }

  const tail = buffer.trim();
  if (tail && !finalResult) {
    const evt = JSON.parse(tail) as
      | { type: "result"; data: ResearchReportData }
      | { type: "error"; error?: string };
    if (evt.type === "result") finalResult = evt.data;
    else if (evt.type === "error") throw new Error(evt.error || "Research orchestration failed.");
  }

  if (!finalResult) {
    throw new Error("Empty research response received from server.");
  }
  return finalResult;
}
