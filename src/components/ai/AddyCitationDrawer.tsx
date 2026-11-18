"use client";

import React, { useEffect, useRef } from "react";
import { ArrowUpRight, BookOpen, CheckCircle2, Database, FileText, X } from "lucide-react";
import type { BriefSourceReference } from "@/lib/ai/contracts";

function sourceBadgeStyle(type: BriefSourceReference["sourceType"]) {
  if (type === "Official Dataset") {
    return {
      icon: Database,
      classes: "bg-emerald-500/12 border-emerald-400/30 text-emerald-200",
    };
  }
  if (type === "Peer-Reviewed Article") {
    return {
      icon: BookOpen,
      classes: "bg-cyan-500/12 border-cyan-400/30 text-cyan-200",
    };
  }
  return {
    icon: FileText,
    classes: "bg-amber-500/12 border-amber-400/30 text-amber-200",
  };
}

export function AddyCitationDrawer({
  source,
  onClose,
}: {
  source: BriefSourceReference | null;
  onClose: () => void;
}) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!source) return;
    closeBtnRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [source, onClose]);

  if (!source) return null;
  const badge = sourceBadgeStyle(source.sourceType);
  const Icon = badge.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`AddyIntelligence verified source ${source.id}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/[0.12] bg-zinc-950 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85dvh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-cyan-500/15 border border-cyan-400/35 text-cyan-200">
              [{source.id}]
            </span>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${badge.classes}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {source.sourceType}
            </span>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close source drawer"
            className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
            {source.publisher} · {source.year}
          </p>
          <h3 className="text-base sm:text-lg font-semibold text-zinc-100 leading-snug break-words">
            {source.title}
          </h3>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>AddyIntelligence · Verified Excerpt / Indicator Reading</span>
          </div>
          <p className="text-sm text-zinc-200 leading-relaxed break-words">
            {source.excerptOrIndicator}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <span className="text-xs text-zinc-400">
            Retrieved live for this AddyIntelligence brief
          </span>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-cyan-500/15 border border-cyan-400/35 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/25 transition-colors"
          >
            Open Original Source
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
