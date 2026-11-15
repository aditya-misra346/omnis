"use client";

import React from "react";

export function OmnisMark({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="omnis-mark-grad" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="55%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#omnis-mark-grad)" />
      <rect
        x="2.75"
        y="2.75"
        width="58.5"
        height="58.5"
        rx="15.25"
        stroke="#FFFFFF"
        strokeOpacity="0.22"
        strokeWidth="1.5"
      />
      <circle cx="32" cy="32" r="17" stroke="#FFFFFF" strokeOpacity="0.94" strokeWidth="2.1" />
      <ellipse
        cx="32"
        cy="32"
        rx="17"
        ry="6.8"
        transform="rotate(-24 32 32)"
        stroke="#BFDBFE"
        strokeOpacity="0.92"
        strokeWidth="1.65"
      />
      <ellipse
        cx="32"
        cy="32"
        rx="6.8"
        ry="17"
        transform="rotate(-24 32 32)"
        stroke="#DDD6FE"
        strokeOpacity="0.65"
        strokeWidth="1.35"
      />
      <circle cx="32" cy="32" r="3.4" fill="#FFFFFF" />
      <circle cx="45.2" cy="21.4" r="2.2" fill="#93C5FD" />
    </svg>
  );
}

export function OmnisWordmark({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="relative shrink-0 shadow-sm rounded-xl">
        <OmnisMark size={compact ? 28 : 34} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-[0.2em] text-[14px] text-[var(--text-primary)] leading-none">
            OMNIS
          </span>
          <span className="hidden sm:inline-flex items-center text-[9.5px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-md badge-tone-blue omnis-mono leading-none">
            v2.0
          </span>
        </div>
        {!compact && (
          <p className="hidden xl:block text-[10.5px] font-medium tracking-wide text-[var(--text-muted)] mt-0.5 truncate">
            The Intelligence of Everything
          </p>
        )}
      </div>
    </div>
  );
}

export function OmnisLoader({
  label = "Synchronising Intelligence Telemetry",
}: {
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center gap-4">
      <div className="relative w-14 h-14 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-[var(--border-subtle)]" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--accent-blue)] border-r-[var(--accent-violet)] animate-spin" />
        <OmnisMark size={30} />
      </div>
      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] tone-blue omnis-mono">
          OMNIS CORE ENGINE
        </div>
        <p className="text-xs text-[var(--text-secondary)]">{label}</p>
      </div>
    </div>
  );
}
