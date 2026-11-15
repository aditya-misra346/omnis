"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Info,
  ChevronDown,
  ChevronUp,
  Database,
} from "lucide-react";
import type { ProvenanceMetadata, VerificationStatus } from "@/types/omnis";

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const styles: Record<
    VerificationStatus,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    verified: {
      label: "Verified Multi-Source",
      className:
        "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    single_source: {
      label: "Single Primary Source",
      className: "bg-sky-500/15 text-sky-400 border-sky-500/30",
      icon: <Database className="w-3.5 h-3.5" />,
    },
    conflicting: {
      label: "Conflicting Evidence",
      className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    interpretation: {
      label: "Model / Analytical Output",
      className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      icon: <Info className="w-3.5 h-3.5" />,
    },
    unverified: {
      label: "Unverified Claim",
      className: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    ai_hypothesis: {
      label: "AI-Generated Hypothesis",
      className: "bg-violet-500/15 text-violet-400 border-violet-500/30",
      icon: <Sparkles className="w-3.5 h-3.5" />,
    },
  };

  const current = styles[status] ?? styles.verified;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${current.className}`}
    >
      {current.icon}
      {current.label}
    </span>
  );
}

export function ProvenancePanel({
  provenance,
  compact = false,
}: {
  provenance: ProvenanceMetadata;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(!compact);

  return (
    <div className="omnis-surface-slate p-3.5 text-xs transition-all">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <VerificationBadge status={provenance.verificationStatus} />
          <span className="font-medium text-[var(--text-primary)]">
            Source: {provenance.source}
          </span>
          <span className="text-[var(--text-muted)] omnis-mono">
            • Updated: {provenance.lastUpdated}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={provenance.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium underline-offset-2 hover:underline"
          >
            Inspect Source <ExternalLink className="w-3 h-3" />
          </a>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {expanded ? (
              <>
                Hide Provenance <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                Methodology & Units <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[var(--text-secondary)]">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              Publisher / Agency
            </div>
            <div className="font-medium text-[var(--text-primary)] mt-0.5">
              {provenance.publisher}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              Units & Coverage
            </div>
            <div className="font-medium text-[var(--text-primary)] mt-0.5">
              {provenance.units} • {provenance.coverage}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              Methodology
            </div>
            <div className="font-medium text-[var(--text-primary)] mt-0.5">
              {provenance.methodology ?? "Standardised Institutional Series"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              Data Integrity Status
            </div>
            <div className="font-medium mt-0.5 omnis-mono">
              {provenance.missingData ? (
                <span className="text-amber-400">Partial / Missing Values Flagged</span>
              ) : (
                <span className="text-emerald-400">
                  Complete • Retrieved {provenance.retrievedAt.slice(0, 10)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
