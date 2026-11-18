"use client";

import React, { useEffect, useRef } from "react";
import { BookOpenCheck, ExternalLink, X } from "lucide-react";
import type { BriefSourceReference } from "@/lib/ai/contracts";

const SOURCE_BADGE_MAP: Record<BriefSourceReference["sourceType"], string> = {
  "Official Dataset": "badge-tone-verified",
  "Peer-Reviewed Article": "badge-tone-violet",
  "Institutional Archive": "badge-tone-cyan",
};

export function CitationDrawer({
  open,
  onClose,
  onOpen,
  sources,
  activeSourceId,
  onSelectSource,
}: {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
  sources: BriefSourceReference[];
  activeSourceId: string | null;
  onSelectSource: (sourceId: string) => void;
}) {
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dragStartYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !activeSourceId) return;
    const target = cardRefs.current[activeSourceId];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [open, activeSourceId]);

  if (sources.length === 0) return null;

  return (
    <div className="lg:hidden">
      {/* Sticky Bottom Pill when closed */}
      {!open ? (
        <div className="fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex justify-center px-4 pointer-events-none">
          <button
            type="button"
            onClick={onOpen}
            className="pointer-events-auto min-h-[44px] px-4 py-2.5 rounded-full bg-[var(--bg-graphite)]/95 backdrop-blur-md border border-[var(--border-strong)] shadow-2xl flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)] hover:border-[var(--accent-blue)] transition-colors cursor-pointer"
          >
            <BookOpenCheck className="w-4 h-4 tone-verified shrink-0" />
            <span>
              Inspect {sources.length} Verified {sources.length === 1 ? "Source" : "Sources"}
            </span>
          </button>
        </div>
      ) : null}

      {/* Swipe-Dismissible Accessible Bottom Sheet Drawer */}
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <div
            onClick={onClose}
            aria-hidden="true"
            className="absolute inset-0 omnis-modal-scrim backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Verified Sources Citation Drawer"
            className="relative z-10 w-full max-h-[82dvh] rounded-t-2xl bg-[var(--bg-graphite)] border-t border-[var(--border-strong)] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Swipe Handle + Header */}
            <div
              onPointerDown={(e) => {
                dragStartYRef.current = e.clientY;
              }}
              onPointerUp={(e) => {
                if (dragStartYRef.current !== null && e.clientY - dragStartYRef.current > 60) {
                  onClose();
                }
                dragStartYRef.current = null;
              }}
              className="px-4 pt-2.5 pb-3 border-b border-[var(--border-subtle)] bg-[var(--bg-slate)] select-none"
            >
              <div className="w-10 h-1 rounded-full bg-[var(--border-strong)] mx-auto mb-2.5" />
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[var(--text-primary)]">
                    Verified Sources ({sources.length})
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Tap any reference to open official dataset or paper DOI
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close Citation Drawer"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-graphite)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Sources List with iOS Safe Area Bottom Inset */}
            <div className="flex-1 overflow-y-auto p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-3">
              {sources.map((src) => {
                const isFocused = activeSourceId === src.id;
                return (
                  <div
                    key={src.id}
                    ref={(el) => {
                      cardRefs.current[src.id] = el;
                    }}
                    onClick={() => onSelectSource(src.id)}
                    className={`p-3.5 rounded-xl border transition-all space-y-2 min-w-0 ${
                      isFocused
                        ? "bg-[var(--badge-blue-bg)] border-[var(--accent-blue)] ring-2 ring-[var(--accent-blue)]/40"
                        : "bg-[var(--bg-obsidian)]/65 border-[var(--border-subtle)]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                          SOURCE_BADGE_MAP[src.sourceType] ?? "badge-tone-blue"
                        }`}
                      >
                        {src.sourceType}
                      </span>
                      <span className="text-xs omnis-mono omnis-tabular font-bold tone-cyan">
                        [{src.id}] · {src.year}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-[var(--text-primary)] leading-snug break-words">
                      {src.title}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {src.publisher}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed break-words">
                      {src.excerptOrIndicator}
                    </p>

                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] w-full px-3 py-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-[var(--accent-blue)] text-xs font-semibold tone-blue flex items-center justify-between gap-2 break-all"
                    >
                      <span className="truncate">{src.url}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
