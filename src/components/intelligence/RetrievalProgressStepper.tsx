"use client";

import React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { RetrievalStageState } from "@/lib/ai/stream-client";

const BASE_STEPS: Array<{ step: 1 | 2 | 3 | 4; defaultLabel: string }> = [
  { step: 1, defaultLabel: "Resolving countries, time horizons & economic indicators…" },
  { step: 2, defaultLabel: "Querying World Bank WDI, REST Countries & OpenAlex scholarly works…" },
  { step: 3, defaultLabel: "Cross-checking figures & filtering out unverified claims…" },
  { step: 4, defaultLabel: "Synthesizing plain-English brief & visual charts…" },
];

export function RetrievalProgressStepper({
  stages,
  elapsedMs,
  query,
}: {
  stages: Partial<Record<1 | 2 | 3 | 4, RetrievalStageState>>;
  elapsedMs: number;
  query: string;
}) {
  const highestActive =
    ([4, 3, 2, 1] as const).find((s) => Boolean(stages[s])) ?? 1;

  return (
    <div
      role="status"
      aria-live="polite"
      className="omnis-card p-5 sm:p-6 space-y-4 border border-[var(--border-subtle)] bg-[var(--bg-graphite)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
        <div className="min-w-0 space-y-0.5">
          <div className="text-xs font-semibold tone-blue flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span>Grounded Intelligence Pipeline</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate">
            Investigating &ldquo;{query}&rdquo;
          </div>
        </div>
        <span className="text-xs omnis-mono omnis-tabular px-2.5 py-1 rounded-md bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-[var(--text-secondary)] shrink-0">
          {(elapsedMs / 1000).toFixed(1)}s elapsed
        </span>
      </div>

      <ol className="space-y-2.5">
        {BASE_STEPS.map(({ step, defaultLabel }) => {
          const state = stages[step];
          const isCompleted = state?.status === "completed";
          const isActive = state?.status === "active" || (!state && step === highestActive);
          return (
            <li
              key={step}
              className={`flex items-start gap-3 p-2.5 rounded-xl border transition-colors ${
                isCompleted
                  ? "bg-[var(--bg-slate)]/40 border-[var(--border-subtle)]"
                  : isActive
                    ? "bg-[var(--badge-blue-bg)] border-[var(--accent-blue)]/50"
                    : "bg-transparent border-transparent opacity-55"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 tone-verified" />
                ) : isActive ? (
                  <Loader2 className="w-4 h-4 tone-blue animate-spin" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-[var(--border-strong)] inline-block" />
                )}
              </div>
              <div className="min-w-0 flex-1 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[13.5px] sm:text-sm text-[var(--text-primary)] leading-snug">
                  <strong className="font-semibold tone-cyan omnis-mono mr-1.5">
                    Step {step} ·
                  </strong>
                  {state?.label ?? defaultLabel}
                </span>
                {state ? (
                  <span className="text-[11.5px] omnis-mono omnis-tabular text-[var(--text-muted)] shrink-0">
                    {(state.elapsedMs / 1000).toFixed(2)}s
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
