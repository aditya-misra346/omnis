"use client";

import React, { useId } from "react";

const OMNIS_BRAND_STYLES = `
:root,
[data-theme="dark"] {
  --omnis-logo-tile-bg: #0D121D;
  --omnis-logo-tile-border: rgba(148, 163, 184, 0.22);
  --omnis-logo-tile-highlight: rgba(255, 255, 255, 0.08);
  --omnis-logo-ink: #F8FAFC;
  --omnis-logo-wordmark: #FFFFFF;
  --omnis-logo-orbit-start: #3B82F6;
  --omnis-logo-orbit-end: #38BDF8;
  --omnis-logo-node: #38BDF8;
  --omnis-logo-node-core: #F8FAFC;
  --omnis-logo-node-halo: rgba(56, 189, 248, 0.26);
}

[data-theme="light"] {
  --omnis-logo-tile-bg: #F8FAFC;
  --omnis-logo-tile-border: #CBD5E1;
  --omnis-logo-tile-highlight: #FFFFFF;
  --omnis-logo-ink: #090D16;
  --omnis-logo-wordmark: #090D16;
  --omnis-logo-orbit-start: #2563EB;
  --omnis-logo-orbit-end: #1D4ED8;
  --omnis-logo-node: #2563EB;
  --omnis-logo-node-core: #FFFFFF;
  --omnis-logo-node-halo: rgba(37, 99, 235, 0.18);
}

.omnis-orbital-node {
  transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
  transform-box: fill-box;
  transform-origin: center;
  will-change: transform;
}

@media (prefers-reduced-motion: no-preference) {
  .group:hover .omnis-orbital-node,
  .omnis-brand-root:hover .omnis-orbital-node {
    transform: translate(1.35px, -0.65px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .omnis-orbital-node {
    transition: none !important;
    transform: none !important;
  }
}
`;

export interface OmnisMarkProps {
  size?: number;
  simplified?: boolean;
  className?: string;
}

/**
 * <OmnisMark /> — "The Sovereign Meridian & Causal Aperture"
 * Constructed on an exact 32×32 mathematical coordinate grid (viewBox="0 0 32 32")
 * with shapeRendering="geometricPrecision":
 * 1. Outer Orbital Ring / Aperture: r="13", strokeWidth="1.75" with 6 o'clock base aperture.
 * 2. The Omega (Ω) Vault & Feet: Monumental geometric arch anchored symmetrically at y="24.5".
 * 3. Tilted Orbital Elliptical Arc (-23.5° axial tilt) & Singularity Node (r="2") at 2 o'clock.
 */
export function OmnisMark({
  size = 32,
  simplified,
  className = "",
}: OmnisMarkProps) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const orbitGradId = `omnis-orbit-grad-${uid}`;
  const isSimplified = simplified ?? size <= 20;

  const outerStroke = isSimplified ? 2.0 : 1.75;
  const vaultStroke = isSimplified ? 2.1 : 1.9;
  const orbitStroke = isSimplified ? 1.85 : 1.75;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      shapeRendering="geometricPrecision"
      aria-hidden="true"
      className={`omnis-brand-mark shrink-0 ${className}`.trim()}
    >
      <style dangerouslySetInnerHTML={{ __html: OMNIS_BRAND_STYLES }} />
      <defs>
        <linearGradient
          id={orbitGradId}
          x1="5.5"
          y1="20.5"
          x2="26.5"
          y2="10.25"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="var(--omnis-logo-orbit-start)" />
          <stop offset="100%" stopColor="var(--omnis-logo-orbit-end)" />
        </linearGradient>
      </defs>

      {/* Architectural Obsidian / Archival Pearl Container Frame */}
      <rect
        x="0.75"
        y="0.75"
        width="30.5"
        height="30.5"
        rx="8.25"
        fill="var(--omnis-logo-tile-bg)"
        stroke="var(--omnis-logo-tile-border)"
        strokeWidth="1"
      />
      {!isSimplified && (
        <path
          d="M 5 1.5 H 27"
          stroke="var(--omnis-logo-tile-highlight)"
          strokeWidth="0.75"
          strokeLinecap="round"
        />
      )}

      {/* 1. Outer Orbital Ring (r="13", strokeWidth="1.75") with 6 o'clock Causal Aperture */}
      <path
        d="M 10.75 27.85 A 13 13 0 1 1 21.25 27.85"
        stroke="var(--omnis-logo-ink)"
        strokeWidth={outerStroke}
        strokeLinecap="round"
        strokeOpacity="0.92"
      />

      {/* Back-hemisphere 23.5° axial-tilt orbital trace (omitted at <=20px favicon scale) */}
      {!isSimplified && (
        <path
          d="M 6.5 20.0 A 11.25 4.25 -23.5 0 1 24.25 10.25"
          stroke={`url(#${orbitGradId})`}
          strokeWidth="1.15"
          strokeDasharray="1.75 2.25"
          strokeLinecap="round"
          opacity="0.48"
        />
      )}

      {/* 2. The Omega (Ω) Vault & Horizontal Terminal Feet anchored at y="24.5" */}
      <path
        d="M 8.5 24.5 H 12.75 V 21.5 A 7.25 7.25 0 1 1 19.25 21.5 V 24.5 H 23.5"
        stroke="var(--omnis-logo-ink)"
        strokeWidth={vaultStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 3. Foreground 23.5° Axial-Tilt Orbital Elliptical Arc */}
      <path
        d="M 6.5 20.0 A 11.25 4.25 -23.5 0 0 24.25 10.25"
        stroke={`url(#${orbitGradId})`}
        strokeWidth={orbitStroke}
        strokeLinecap="round"
      />

      {/* Central Causal Nexus Point inside the Omega Vault */}
      {!isSimplified && (
        <circle
          cx="16"
          cy="14.75"
          r="1.35"
          fill="var(--omnis-logo-ink)"
          fillOpacity="0.88"
        />
      )}

      {/* 2 o'clock Singularity Focal Node (r="2") with GPU-composited hover micro-interaction */}
      <g className="omnis-orbital-node">
        {!isSimplified && (
          <circle
            cx="24.25"
            cy="10.25"
            r="3.25"
            fill="var(--omnis-logo-node-halo)"
          />
        )}
        <circle
          cx="24.25"
          cy="10.25"
          r="2"
          fill="var(--omnis-logo-node)"
        />
        {!isSimplified && (
          <circle
            cx="24.25"
            cy="10.25"
            r="0.75"
            fill="var(--omnis-logo-node-core)"
          />
        )}
      </g>
    </svg>
  );
}

export interface OmnisLogoProps {
  variant?: "full" | "compact" | "mark";
  size?: number;
  simplified?: boolean;
  showVersionBadge?: boolean;
  className?: string;
}

/**
 * <OmnisLogo /> — Unified Responsive Brand System
 * - variant="full": Emblem (34×34) + OMNIS wordmark + v2.0 badge + subtitle (hidden on narrow screens)
 * - variant="compact": Emblem (28×28) + OMNIS wordmark + v2.0 badge (mobile drawers, footers, compact headers)
 * - variant="mark": Standalone geometric emblem (24×24–48×48+)
 */
export function OmnisLogo({
  variant = "full",
  size,
  simplified,
  showVersionBadge = false,
  className = "",
}: OmnisLogoProps) {
  if (variant === "mark") {
    return (
      <OmnisMark
        size={size ?? 32}
        simplified={simplified}
        className={className}
      />
    );
  }

  const isCompact = variant === "compact";
  const markSize = size ?? (isCompact ? 28 : 34);

  return (
    <div
      className={`omnis-brand-root flex items-center gap-2 sm:gap-2.5 select-none ${className}`.trim()}
    >
      <div className="relative shrink-0 rounded-xl">
        <OmnisMark size={markSize} simplified={simplified} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="font-bold tracking-[0.14em] sm:tracking-[0.22em] text-sm sm:text-[15px] leading-none"
            style={{
              color: "var(--omnis-logo-wordmark, var(--text-primary))",
              fontFamily: "var(--font-display), var(--font-sans), sans-serif",
            }}
          >
            OMNIS
          </span>
          {showVersionBadge && (
            <span className="hidden sm:inline-flex items-center text-[11px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-md badge-tone-blue omnis-mono leading-none">
              v2.0
            </span>
          )}
        </div>
        {!isCompact && (
          <p className="hidden xl:block text-xs font-medium tracking-wide text-[var(--text-muted)] mt-0.5 truncate">
            The Intelligence of Everything
          </p>
        )}
      </div>
    </div>
  );
}

export function OmnisWordmark({
  compact = false,
  showVersionBadge = false,
  className = "",
}: {
  compact?: boolean;
  showVersionBadge?: boolean;
  className?: string;
}) {
  return (
    <OmnisLogo
      variant={compact ? "compact" : "full"}
      showVersionBadge={showVersionBadge}
      className={className}
    />
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
        <div className="text-[13px] font-semibold uppercase tracking-[0.16em] tone-blue omnis-mono">
          OMNIS CORE ENGINE
        </div>
        <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      </div>
    </div>
  );
}

export default OmnisLogo;
