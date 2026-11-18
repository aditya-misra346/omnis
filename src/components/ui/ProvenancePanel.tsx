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
      className: "badge-tone-verified",
      icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
    },
    single_source: {
      label: "Single Source",
      className: "badge-tone-cyan",
      icon: <Database className="w-3.5 h-3.5 shrink-0" />,
    },
    conflicting: {
      label: "Conflicting Evidence",
      className: "badge-tone-warning",
      icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />,
    },
    interpretation: {
      label: "Modeled Estimate",
      className: "badge-tone-blue",
      icon: <Info className="w-3.5 h-3.5 shrink-0" />,
    },
    unverified: {
      label: "Unverified Claim",
      className: "badge-tone-danger",
      icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />,
    },
    ai_hypothesis: {
      label: "Unconfirmed Scenario",
      className: "badge-tone-hypothesis",
      icon: <Sparkles className="w-3.5 h-3.5 shrink-0" />,
    },
  };

  const current = styles[status] ?? styles.verified;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-tight ${current.className}`}
    >
      {current.icon}
      <span>{current.label}</span>
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
    <div className="border-y border-[var(--border-subtle)] bg-[var(--bg-slate)]/45 py-3 px-3.5 rounded-lg text-[13px] sm:text-sm transition-all">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <VerificationBadge status={provenance.verificationStatus} />
          <span className="font-medium text-[var(--text-primary)] truncate max-w-full">
            Source: {provenance.source}
          </span>
          <span className="text-[var(--text-muted)] text-xs omnis-tabular">
            • Updated {provenance.lastUpdated}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={provenance.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 tone-blue font-semibold underline-offset-2 hover:underline"
          >
            <span>View source</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1 min-h-[44px] sm:min-h-[28px] px-3 sm:px-2.5 py-1 rounded-md bg-[var(--bg-graphite)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
          >
            {expanded ? (
              <>
                <span>Hide details</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Method &amp; sources</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[var(--text-secondary)]">
          <div>
            <div className="text-xs font-medium text-[var(--text-muted)]">
              Publisher
            </div>
            <div className="font-medium text-[var(--text-primary)] mt-0.5 leading-snug">
              {provenance.publisher}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-[var(--text-muted)]">
              Units &amp; coverage
            </div>
            <div className="font-medium text-[var(--text-primary)] mt-0.5 leading-snug">
              {provenance.units} • {provenance.coverage}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-[var(--text-muted)]">
              How it&apos;s measured
            </div>
            <div className="font-medium text-[var(--text-primary)] mt-0.5 leading-snug">
              {provenance.methodology ?? "Standardised official statistics"}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-[var(--text-muted)]">
              Coverage check
            </div>
            <div className="font-semibold mt-0.5">
              {provenance.missingData ? (
                <span className="tone-warning">Some indicators unavailable</span>
              ) : (
                <span className="tone-verified">
                  Complete • {provenance.retrievedAt.slice(0, 10)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
