"use client";

import React, { useMemo, useState } from "react";
import katex from "katex";
import { Check, Copy } from "lucide-react";

export interface OmnisMathBlockProps {
  latex: string;
  displayMode?: boolean;
  label?: string;
  className?: string;
}

export function OmnisMathBlock({
  latex,
  displayMode = true,
  label,
  className = "",
}: OmnisMathBlockProps) {
  const renderedHtml = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        strict: "ignore",
      });
    } catch {
      return "";
    }
  }, [latex, displayMode]);

  return (
    <div
      className={`p-3.5 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] overflow-x-auto ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-[10px] omnis-mono uppercase tracking-wider text-[var(--text-muted)]">
          {label || "KaTeX Equation"}
        </div>
        <CopyTexButton latex={latex} />
      </div>
      {renderedHtml ? (
        <div
          className="omnis-katex text-[var(--text-primary)]"
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      ) : (
        <code className="omnis-mono text-xs text-[var(--text-primary)]">{latex}</code>
      )}
    </div>
  );
}

function CopyTexButton({ latex }: { latex: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(latex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy LaTeX expression"
      className={`inline-flex items-center gap-1 px-2 py-0.5 min-h-[24px] rounded border text-[10px] omnis-mono font-medium transition-colors cursor-pointer shrink-0 ${
        copied
          ? "badge-tone-verified"
          : "border-[var(--border-subtle)] bg-[var(--bg-graphite)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
      }`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      <span>{copied ? "Copied TeX" : "Copy TeX"}</span>
    </button>
  );
}
