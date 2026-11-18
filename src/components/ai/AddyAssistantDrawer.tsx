"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ExternalLink, RotateCcw, Send, Sparkles, X } from "lucide-react";
import type { AssistantMessage } from "@/lib/store/use-omnis-store";

export interface AddyAssistantDrawerProps {
  open: boolean;
  onClose: () => void;
  drawerRef: React.RefObject<HTMLDivElement | null>;
  activeContextLabel: string;
  activeContextTopic: string;
  assistantMessages: AssistantMessage[];
  assistantInput: string;
  assistantLoading: boolean;
  setAssistantInput: (value: string) => void;
  onSend: (overridePrompt?: string) => void;
  onClear: () => void;
}

export function AddyAssistantDrawer({
  open,
  onClose,
  drawerRef,
  activeContextLabel,
  activeContextTopic,
  assistantMessages,
  assistantInput,
  assistantLoading,
  setAssistantInput,
  onSend,
  onClear,
}: AddyAssistantDrawerProps) {
  const router = useRouter();

  const hasSpecificTopic =
    Boolean(activeContextTopic) &&
    activeContextTopic !== "Global Macroeconomic Indicators" &&
    activeContextTopic !== "Global Macroeconomic & Scientific Overview" &&
    activeContextTopic !== "Global Command Center";

  const starterChips = [
    ...(hasSpecificTopic
      ? [`Explain ${activeContextTopic} with official data & trade-offs`]
      : []),
    "Compare India and China economy size and clean energy since 2014",
    "What does research say on AI productivity and jobs?",
  ].slice(0, 3);

  return (
    <AnimatePresence>
      {open && (
        <div key="assistant-drawer-root" className="fixed inset-0 top-14 z-[60]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="absolute inset-0 omnis-modal-scrim backdrop-blur-md"
          />
          <motion.div
            ref={drawerRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%", transition: { duration: 0.18, ease: "easeIn" } }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            aria-label="AddyIntelligence Assistant Drawer"
            tabIndex={-1}
            className="absolute top-0 bottom-0 right-0 w-full sm:w-[420px] max-w-full bg-[var(--bg-graphite)] border-l border-[var(--border-subtle)] flex flex-col shadow-2xl focus:outline-none"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-[var(--bg-slate)] border-b border-[var(--border-subtle)] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg badge-tone-blue flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-[var(--text-primary)] truncate">
                      AddyIntelligence
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/12 border border-emerald-400/30 text-[10px] font-medium text-emerald-200 shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Verified Feeds
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] truncate max-w-[240px]">
                    Context: {activeContextLabel} ({activeContextTopic})
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={onClear}
                  aria-label="Reset AddyIntelligence conversation"
                  className="min-h-[44px] md:min-h-[34px] inline-flex items-center gap-1 text-xs px-3 md:px-2.5 py-1.5 md:py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-graphite)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close AddyIntelligence"
                  className="min-h-[44px] min-w-[44px] md:min-h-[34px] md:min-w-[34px] flex items-center justify-center p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contextual Starter Chips */}
            <div className="px-3.5 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-obsidian)]/60 space-y-1.5 shrink-0">
              <div className="text-[11px] font-medium text-[var(--text-muted)]">
                Ask AddyIntelligence about {activeContextLabel}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {starterChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={assistantLoading}
                    onClick={() => onSend(chip)}
                    className="text-left text-[11px] leading-snug px-2.5 py-1 min-h-[34px] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-cyan-400/40 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-[13px] sm:text-sm bg-[var(--bg-obsidian)]">
              {assistantMessages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-xl ${
                    m.role === "user"
                      ? "bg-[var(--accent-blue-solid)] text-white ml-6 shadow-xs"
                      : "bg-[var(--bg-slate)] text-[var(--text-primary)] mr-4 border border-[var(--border-subtle)]"
                  }`}
                >
                  {m.role === "assistant" && m.provenanceMeta ? (
                    <div className="mb-2 pb-1.5 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-1.5 text-[11px] omnis-mono">
                      <span className="font-semibold text-[var(--text-secondary)] truncate">
                        {m.provenanceMeta.countryName} ({m.provenanceMeta.iso3})
                      </span>
                      <span
                        title={`${m.provenanceMeta.source} — ${m.provenanceMeta.methodology}`}
                        className={`px-1.5 py-0.5 rounded font-bold shrink-0 ${
                          m.provenanceMeta.verificationStatus === "verified"
                            ? "badge-tone-verified"
                            : m.provenanceMeta.verificationStatus === "single_source"
                              ? "badge-tone-warning"
                              : m.provenanceMeta.verificationStatus === "unverified"
                                ? "badge-tone-danger"
                                : "badge-tone-blue"
                        }`}
                      >
                        {m.provenanceMeta.verificationStatus === "verified"
                          ? "Verified Multi-Source"
                          : m.provenanceMeta.verificationStatus === "single_source"
                            ? "Single Source"
                            : m.provenanceMeta.verificationStatus === "unverified"
                              ? "Unverified Claim"
                              : "Modeled Estimate"}
                      </span>
                    </div>
                  ) : null}

                  <div className="whitespace-pre-line leading-relaxed break-words">{m.content}</div>

                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] space-y-1">
                      <div className="text-xs font-medium text-[var(--text-muted)]">
                        Verified Sources
                      </div>
                      {m.citations.map((c) => (
                        <a
                          key={c.url}
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs sm:text-[13px] tone-blue hover:underline font-medium"
                        >
                          <span className="truncate">• {c.label}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}

                  {m.suggestedActions && m.suggestedActions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] flex flex-wrap gap-1.5">
                      {m.suggestedActions.map((act) => (
                        <button
                          key={act.href + act.label}
                          type="button"
                          onClick={() => {
                            if (typeof window !== "undefined" && window.innerWidth < 640) {
                              onClose();
                            }
                            router.push(act.href);
                          }}
                          className="min-h-[44px] md:min-h-[34px] inline-flex items-center px-3 md:px-2.5 py-1.5 md:py-1 rounded-md badge-tone-blue hover:brightness-105 text-xs font-semibold cursor-pointer"
                        >
                          {act.label} →
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {assistantLoading && (
                <div className="p-3 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] flex items-center gap-2.5 text-xs text-cyan-200">
                  <span className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin shrink-0" />
                  <span>AddyIntelligence is checking World Bank &amp; scholarly sources…</span>
                </div>
              )}
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!assistantInput.trim() || assistantLoading) return;
                onSend();
              }}
              className="p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] border-t border-[var(--border-subtle)] bg-[var(--bg-graphite)] flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                placeholder={`Ask AddyIntelligence about ${activeContextTopic}…`}
                aria-label="Ask AddyIntelligence"
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-base md:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)]"
              />
              <button
                type="submit"
                disabled={assistantLoading || !assistantInput.trim()}
                aria-label="Send message to AddyIntelligence"
                className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center p-2 rounded-xl bg-[var(--accent-blue-solid)] hover:brightness-110 text-white disabled:opacity-50 transition-all cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
