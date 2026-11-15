"use client";

import React from "react";
import Link from "next/link";
import { RotateCcw, Home, Globe2 } from "lucide-react";
import { OmnisMark } from "@/components/brand/OmnisLogo";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-14">
      <div className="w-full max-w-lg omnis-card p-6 sm:p-8 space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 rounded-2xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] inline-flex items-center justify-center">
            <OmnisMark size={44} />
          </div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] tone-warning omnis-mono">
            Epistemic Runtime Boundary • Recovery Active
          </div>
          <h1 className="omnis-display-section text-[var(--text-primary)] font-bold">
            Execution Interrupted
          </h1>
          <p className="text-base text-[var(--text-secondary)] leading-relaxed">
            A recoverable client exception interrupted the active view. Local workspace state
            and cached datasets remain intact.
          </p>
          {error.digest && (
            <div className="px-2.5 py-1 rounded-md bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] omnis-mono">
              Digest: {error.digest}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-blue-solid)] hover:brightness-110 text-white text-sm font-semibold cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Active Module</span>
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-sm font-semibold text-[var(--text-primary)]"
          >
            <Home className="w-3.5 h-3.5 tone-blue" />
            <span>Home</span>
          </Link>
          <Link
            href="/atlas"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-sm font-semibold text-[var(--text-primary)]"
          >
            <Globe2 className="w-3.5 h-3.5 tone-blue" />
            <span>3D Atlas</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
