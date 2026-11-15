"use client";

import React from "react";
import { usePathname } from "next/navigation";
import styles from "./CreatorSignature.module.css";

export type CreatorSignatureVariant = "auto" | "editorial" | "compact";

const COMPACT_CANVAS_ROUTES = new Set(["/atlas", "/knowledge-graph", "/laboratory"]);

function resolveSignatureVariant(
  variant: CreatorSignatureVariant,
  pathname: string
): "editorial" | "compact" {
  if (variant === "editorial" || variant === "compact") {
    return variant;
  }
  const normalized = pathname.trim().replace(/\/+$/, "") || "/";
  return COMPACT_CANVAS_ROUTES.has(normalized) ? "compact" : "editorial";
}

function GeometricMonogram({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="1.5"
        y="1.5"
        width="25"
        height="25"
        rx="4.5"
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="1"
      />
      {/* Architectural AM Monogram */}
      <path
        d="M5.75 20L10.25 8L14.75 20M7.4 16H13.1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.6 20V8L19.1 14.5L22.6 8V20"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Non-intrusive dual-theme architectural colophon attributing OMNIS to Aditya Misra.
 * Adapts automatically between scrollable editorial routes and interactive canvas routes.
 */
export function CreatorSignature({
  variant = "auto",
}: {
  variant?: CreatorSignatureVariant;
}) {
  const pathname = usePathname() ?? "";
  const resolvedVariant = resolveSignatureVariant(variant, pathname);
  const isCompact = resolvedVariant === "compact";

  if (isCompact) {
    return (
      <aside
        aria-label="Creator Attribution"
        data-testid="creator-signature"
        data-variant="compact"
        className={`${styles.colophon} h-9 px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0`}
      >
        <span aria-hidden="true" className={styles.specularLine} />

        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`${styles.monogramFrame} w-6 h-6`}>
            <GeometricMonogram size={16} />
          </span>
          <span className={`${styles.eyebrow} hidden md:inline`}>
            ARCHITECTED &amp; ENGINEERED BY
          </span>
          <span aria-hidden="true" className={`${styles.dividerDot} hidden md:inline-block`} />
          <p className={`${styles.signatureLine} ${styles.signatureCompact} truncate`}>
            <span className={styles.madeBy}>Made by</span>{" "}
            <span className={styles.creatorName}>Aditya Misra</span>
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className={`${styles.tagline} hidden lg:inline`}>
            OMNIS · THE INTELLIGENCE OF EVERYTHING
          </span>
          <a
            href="https://github.com/aditya-misra346"
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.githubLink} ${styles.githubLinkCompact}`}
          >
            <span className="hidden sm:inline">GitHub (@aditya-misra346)</span>
            <span className="sm:hidden">GitHub</span>
            <span aria-hidden="true" className={styles.arrowIcon}>
              ↗
            </span>
          </a>
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Creator Attribution"
      data-testid="creator-signature"
      data-variant="editorial"
      className={`${styles.colophon} py-5 px-4 sm:px-8 shrink-0`}
    >
      <span aria-hidden="true" className={styles.specularLine} />

      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <span className={`${styles.monogramFrame} w-9 h-9`}>
            <GeometricMonogram size={22} />
          </span>
          <div className="min-w-0 space-y-1">
            <div className={styles.eyebrow}>ARCHITECTED &amp; ENGINEERED BY</div>
            <p className={`${styles.signatureLine} ${styles.signatureEditorial}`}>
              <span className={styles.madeBy}>Made by</span>{" "}
              <span className={styles.creatorName}>Aditya Misra</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <span className={styles.tagline}>
            OMNIS · THE INTELLIGENCE OF EVERYTHING
          </span>
          <a
            href="https://github.com/aditya-misra346"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.githubLink}
          >
            <span>GitHub (@aditya-misra346)</span>
            <span aria-hidden="true" className={styles.arrowIcon}>
              ↗
            </span>
          </a>
        </div>
      </div>
    </aside>
  );
}
