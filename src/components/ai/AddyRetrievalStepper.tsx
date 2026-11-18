"use client";

import React from "react";
import { CheckCircle2, Clock, Sparkles } from "lucide-react";

export interface AddyRetrievalStage {
  step: 1 | 2 | 3 | 4;
  label: string;
  status: "active" | "completed";
  elapsedMs: number;
}

const DEFAULT_STAGE_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "Resolving countries, time horizons & official indicators…",
  2: "Querying World Bank WDI, REST Countries, OpenAlex, Crossref & Wikimedia…",
  3: "Cross-checking figures & filtering out unverified claims…",
  4: "Synthesizing plain-English brief & visual charts…",
};

export function AddyRetrievalStepper({
  stages,
  elapsedMs,
  query,
}: {
  stages: Partial<Record<1 | 2 | 3 | 4, AddyRetrievalStage>>;
  elapsedMs: number;
  query?: string;
}) {
  const steps: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];

  return (
    <div
      className="rounded-2xl border border-cyan-500/20 bg-zinc-950/90 p-5 sm:p-6 space-y-4 shadow-[0_0_0_1px_rgba(34,211,238,0.06)]"
      role="status"
      aria-live="polite"
      aria-label="AddyIntelligence live evidence retrieval status"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-zinc-100">AddyIntelligence</span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/25 text-cyan-200">
                Verified Retrieval Pipeline
              </span>
            </div>
            {query && (
              <p className="text-xs text-zinc-400 truncate mt-0.5 max-w-xl" title={query}>
                {query}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 px-2.5 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] shrink-0">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{(elapsedMs / 1000).toFixed(1)}s</span>
        </div>
      </div>

      <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {steps.map((stepNum) => {
          const item = stages[stepNum];
          const isCompleted = item?.status === "completed";
          const isActive = item?.status === "active";
          const label = item?.label || DEFAULT_STAGE_LABELS[stepNum];

          return (
            <li
              key={stepNum}
              className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                isCompleted
                  ? "border-emerald-500/25 bg-emerald-500/[0.05] text-zinc-100"
                  : isActive
                    ? "border-cyan-400/35 bg-cyan-500/[0.07] text-zinc-100"
                    : "border-white/[0.06] bg-white/[0.02] text-zinc-400"
              }`}
            >
              <span className="mt-0.5 shrink-0">
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isActive ? (
                  <span className="inline-block w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                ) : (
                  <span className="inline-flex w-4 h-4 rounded-full border border-zinc-600 text-[10px] items-center justify-center font-mono text-zinc-400">
                    {stepNum}
                  </span>
                )}
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-xs font-semibold text-zinc-200">Step {stepNum}</p>
                <p className="text-xs leading-relaxed text-zinc-400">{label}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
