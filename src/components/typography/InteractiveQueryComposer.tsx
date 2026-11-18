"use client";

import React, { useMemo, useState } from "react";
import { ArrowRight, RotateCcw, Sparkles, X } from "lucide-react";

const QUICK_PRESETS = [
  "Explain India's economic development since 1991",
  "Compare India and China economically",
  "Semiconductor geopolitics",
  "Nuclear energy fusion vs fission",
];

const ACTION_VERBS = ["Explain", "Compare", "Simulate", "Map", "Timeline"] as const;
const FOCUS_TOPICS = [
  "India",
  "China",
  "Semiconductors",
  "Nuclear Energy",
  "AI & Labor",
  "Climate",
] as const;

interface InteractiveQueryComposerProps {
  onSubmitQuery: (query: string) => void;
  onSyncDraftQuery?: (query: string) => void;
  showPresetStrip?: boolean;
}

export function InteractiveQueryComposer({
  onSubmitQuery,
  onSyncDraftQuery,
  showPresetStrip = true,
}: InteractiveQueryComposerProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const tokens = useMemo(() => {
    const out: { label: string; kind: "action" | "topic" }[] = [];
    if (selectedAction) out.push({ label: selectedAction, kind: "action" });
    for (const topic of selectedTopics) {
      out.push({ label: topic, kind: "topic" });
    }
    return out;
  }, [selectedAction, selectedTopics]);

  const composedQuery = useMemo(() => {
    if (tokens.length === 0) return "";
    if (selectedAction === "Compare" && selectedTopics.length >= 2) {
      return `Compare ${selectedTopics[0]} and ${selectedTopics[1]} (${selectedTopics.slice(2).join(", ") || "economy & technology"})`.trim();
    }
    if (selectedAction && selectedTopics.length > 0) {
      return `${selectedAction} ${selectedTopics.join(" & ")}`;
    }
    if (selectedAction) return `${selectedAction} global macro & scientific systems`;
    return selectedTopics.join(" & ");
  }, [tokens.length, selectedAction, selectedTopics]);

  const toggleAction = (verb: string) => {
    const next = selectedAction === verb ? null : verb;
    setSelectedAction(next);
    if (onSyncDraftQuery && next) {
      const nextPreview = selectedTopics.length ? `${next} ${selectedTopics.join(" & ")}` : next;
      onSyncDraftQuery(nextPreview);
    }
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) => {
      const exists = prev.includes(topic);
      const next = exists ? prev.filter((t) => t !== topic) : [...prev.slice(-2), topic];
      if (onSyncDraftQuery) {
        const preview = selectedAction
          ? next.length
            ? `${selectedAction} ${next.join(" & ")}`
            : selectedAction
          : next.join(" & ");
        onSyncDraftQuery(preview);
      }
      return next;
    });
  };

  const removeToken = (token: { label: string; kind: "action" | "topic" }) => {
    if (token.kind === "action") {
      setSelectedAction(null);
    } else {
      setSelectedTopics((prev) => prev.filter((t) => t !== token.label));
    }
  };

  const handleReset = () => {
    setSelectedAction(null);
    setSelectedTopics([]);
    if (onSyncDraftQuery) onSyncDraftQuery("");
  };

  return (
    <div className="space-y-2.5">
      {showPresetStrip && (
        <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
          <span className="text-[var(--text-muted)] text-[13px] font-medium">
            Try a question:
          </span>
          {QUICK_PRESETS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onSubmitQuery(chip)}
              className="min-h-[44px] md:min-h-[32px] inline-flex items-center px-3 md:px-2.5 py-2 md:py-1 rounded-full bg-[var(--bg-slate)] hover:border-[var(--border-strong)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Modular Research Query Composer */}
      <div className="omnis-surface-slate p-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold tone-blue">
            <Sparkles className="w-3 h-3" />
            Build a custom question
          </span>
          <span className="text-[var(--text-muted)]">
            {tokens.length} {tokens.length === 1 ? "part" : "parts"} selected
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {ACTION_VERBS.map((verb) => {
            const active = selectedAction === verb;
            return (
              <button
                key={verb}
                type="button"
                onClick={() => toggleAction(verb)}
                aria-pressed={active}
                className={`min-h-[44px] md:min-h-[30px] inline-flex items-center px-3 md:px-2 py-1.5 md:py-0.5 rounded-md text-[13px] font-semibold transition-all cursor-pointer border ${
                  active
                    ? "bg-[var(--accent-blue-solid)] text-white border-transparent shadow-2xs"
                    : "bg-[var(--bg-graphite)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                }`}
              >
                {verb}
              </button>
            );
          })}

          <span aria-hidden="true" className="text-[var(--text-muted)] omnis-mono text-xs px-0.5">
            /
          </span>

          {FOCUS_TOPICS.map((topic) => {
            const active = selectedTopics.includes(topic);
            return (
              <button
                key={topic}
                type="button"
                onClick={() => toggleTopic(topic)}
                aria-pressed={active}
                className={`min-h-[44px] md:min-h-[30px] inline-flex items-center px-3 md:px-2 py-1.5 md:py-0.5 rounded-md text-[13px] font-medium transition-all cursor-pointer border ${
                  active
                    ? "badge-tone-violet font-semibold"
                    : "bg-[var(--bg-graphite)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                }`}
              >
                {topic}
              </button>
            );
          })}
        </div>

        {tokens.length > 0 && (
          <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              {tokens.map((tok) => (
                <button
                  key={`${tok.kind}-${tok.label}`}
                  type="button"
                  onClick={() => removeToken(tok)}
                  title={`Remove "${tok.label}"`}
                  className="min-h-[44px] md:min-h-[30px] inline-flex items-center gap-1.5 px-3 md:px-2 py-1.5 md:py-0.5 rounded-full bg-[var(--bg-graphite)] border border-[var(--border-strong)] text-[13px] text-[var(--text-primary)] hover:opacity-80 cursor-pointer"
                >
                  <span className="omnis-editorial text-[15px] leading-none tone-blue">
                    {tok.label}
                  </span>
                  <X className="w-3 h-3 text-[var(--text-muted)]" />
                </button>
              ))}
              <span className="omnis-editorial text-base sm:text-[17px] text-[var(--text-secondary)] truncate pl-1">
                → “{composedQuery}”
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleReset}
                className="min-h-[44px] md:min-h-[32px] inline-flex items-center gap-1 px-3 md:px-2.5 py-2 md:py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-graphite)] text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
              <button
                type="button"
                onClick={() => onSubmitQuery(composedQuery)}
                className="min-h-[44px] md:min-h-[32px] inline-flex items-center gap-1 px-3 md:px-2.5 py-2 md:py-1 rounded-lg bg-[var(--accent-blue-solid)] hover:brightness-110 text-white text-[13px] font-semibold cursor-pointer shadow-2xs"
              >
                <span>Investigate</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
