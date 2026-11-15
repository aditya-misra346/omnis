"use client";

import React, { useMemo } from "react";
import katex from "katex";

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
      {label ? (
        <div className="text-[10px] omnis-mono uppercase tracking-wider text-[var(--text-muted)] mb-2">
          {label}
        </div>
      ) : null}
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
