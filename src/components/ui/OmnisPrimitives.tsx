"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Globe2, Home, RotateCcw, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { OmnisMark } from "@/components/brand/OmnisLogo";
import { useOmnisStore } from "@/lib/store/use-omnis-store";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function OmnisButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  loading = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}) {
  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      "bg-[var(--accent-blue-solid)] hover:brightness-110 text-white shadow-sm border border-transparent",
    secondary:
      "bg-[var(--bg-slate)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)]",
    ghost:
      "bg-transparent hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent",
    danger:
      "badge-tone-danger hover:brightness-105",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-[13px] rounded-lg gap-1.5",
    md: "px-4 py-2 text-sm rounded-lg gap-2",
    lg: "px-5.5 py-2.5 text-[15px] rounded-xl gap-2",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-150 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.99] ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function OmnisModuleHeader({
  moduleTag,
  title,
  subtitle,
  icon,
  actions,
  mobileFilterLabel = "Filters & Controls",
  secondaryControls,
  children,
}: {
  moduleTag: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  actions?: React.ReactNode;
  mobileFilterLabel?: string;
  secondaryControls?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const [mobileExpanded, setMobileExpanded] = useState(false);

  return (
    <section className="pb-4 sm:pb-5 border-b border-[var(--border-subtle)] space-y-3 sm:space-y-4 relative">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 sm:gap-4">
        <div className="space-y-1.5 sm:space-y-2 min-w-0">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] tone-blue omnis-mono">
            {icon}
            <span>{moduleTag}</span>
          </div>
          <h1 className="text-[clamp(1.625rem,2.6vw,2.4rem)] font-bold tracking-[-0.02em] text-[var(--text-primary)] leading-[1.16] text-balance">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[15px] sm:text-[17px] text-[var(--text-secondary)] max-w-3xl leading-[1.6] text-pretty line-clamp-3 sm:line-clamp-none">
              {subtitle}
            </p>
          )}
        </div>

        {(actions || secondaryControls) && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {actions}
            {secondaryControls && (
              <button
                type="button"
                onClick={() => setMobileExpanded((prev) => !prev)}
                aria-expanded={mobileExpanded}
                className="sm:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-[13px] font-semibold text-[var(--text-primary)] cursor-pointer"
              >
                <span>{mobileFilterLabel}</span>
                {mobileExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 tone-blue" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 tone-blue" />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {children}
      {secondaryControls && (
        <div
          className={`${
            mobileExpanded ? "block" : "hidden sm:block"
          } max-w-full pt-1 sm:pt-0 overflow-visible`}
        >
          {secondaryControls}
        </div>
      )}
    </section>
  );
}

export function OmnisStatTile({
  label,
  value,
  subValue,
  tone = "default",
}: {
  label: string;
  value: string;
  subValue?: string;
  tone?: "default" | "blue" | "verified" | "violet" | "warning";
}) {
  const toneClass = {
    default: "text-[var(--text-primary)]",
    blue: "tone-blue",
    verified: "tone-verified",
    violet: "tone-violet",
    warning: "tone-warning",
  }[tone];

  return (
    <div className="omnis-surface-slate p-4 space-y-1.5 hover:border-[var(--border-strong)] min-w-0">
      <div className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)] leading-snug">
        {label}
      </div>
      <div className={`text-[21px] sm:text-[26px] font-bold omnis-mono omnis-tabular leading-tight ${toneClass}`}>
        {value}
      </div>
      {subValue && (
        <div className="text-[13px] text-[var(--text-secondary)] omnis-mono omnis-tabular leading-snug break-words">
          {subValue}
        </div>
      )}
    </div>
  );
}

export function OmnisSkeleton({ className = "h-24 w-full" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] ${className}`}
    />
  );
}

/** Shared route-level suspense loading skeleton matching Obsidian Dark & Archival Pearl surface tokens. */
export function OmnisRouteLoadingSkeleton({
  moduleTag,
  layout = "split-workbench",
}: {
  moduleTag: string;
  layout?: "split-map" | "split-workbench" | "report";
}) {
  return (
    <div
      aria-busy="true"
      aria-label={`Loading ${moduleTag}`}
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6"
    >
      <div className="omnis-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] tone-blue omnis-mono">
          <span className="w-2 h-2 rounded-full bg-[var(--accent-blue)] animate-pulse" />
          <span>{moduleTag}</span>
        </div>
        <OmnisSkeleton className="h-8 w-3/4 max-w-lg" />
        <OmnisSkeleton className="h-4 w-full max-w-2xl" />
      </div>

      {layout === "split-map" ? (
        <>
          <OmnisSkeleton className="h-[460px] w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <OmnisSkeleton className="h-44 rounded-2xl" />
            <OmnisSkeleton className="h-44 rounded-2xl" />
            <OmnisSkeleton className="h-44 rounded-2xl" />
          </div>
        </>
      ) : layout === "report" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <OmnisSkeleton className="h-40 rounded-2xl" />
            <OmnisSkeleton className="h-64 rounded-2xl" />
          </div>
          <div className="lg:col-span-4 space-y-4">
            <OmnisSkeleton className="h-56 rounded-2xl" />
            <OmnisSkeleton className="h-40 rounded-2xl" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <OmnisSkeleton className="lg:col-span-4 h-[420px] rounded-2xl" />
          <div className="lg:col-span-8 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <OmnisSkeleton className="h-24" />
              <OmnisSkeleton className="h-24" />
              <OmnisSkeleton className="h-24" />
              <OmnisSkeleton className="h-24" />
            </div>
            <OmnisSkeleton className="h-80 rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}

export interface OmnisSegmentedOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  badge?: string | number;
  icon?: React.ReactNode;
}

export function OmnisSegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  groupId,
  ariaLabel = "Segmented control",
  className = "",
  size = "md",
}: {
  options: OmnisSegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  groupId: string;
  ariaLabel?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const { motionPaused } = useOmnisStore();
  const padClass = size === "sm" ? "px-3 py-1.5 text-[13px]" : "px-3.5 py-1.5 text-sm";

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`relative inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap min-h-[36px] sm:min-h-0 ${padClass} ${
              active
                ? "text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {active &&
              (motionPaused ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-lg bg-[var(--accent-blue-solid)] shadow-sm"
                />
              ) : (
                <motion.span
                  layoutId={groupId}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  aria-hidden="true"
                  className="absolute inset-0 rounded-lg bg-[var(--accent-blue-solid)] shadow-sm"
                />
              ))}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {opt.icon}
              <span>{opt.label}</span>
              {opt.badge !== undefined && (
                <span
                  className={`text-xs omnis-mono px-1.5 py-0.5 rounded-full ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-[var(--bg-graphite)] text-[var(--text-muted)]"
                  }`}
                >
                  {opt.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export { OmnisSelect, type OmnisSelectOption, type OmnisSelectProps } from "./OmnisSelect";
export { OmnisParameterSlider, type OmnisParameterSliderProps } from "./OmnisParameterSlider";

/**
 * Shared fullscreen body scroll-lock & Escape key handler used across 3D Globe
 * and interactive Knowledge Graph canvases.
 */
export function useFullscreenBodyLock(isFullscreen: boolean, onExit: () => void): void {
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onExitRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isFullscreen]);
}

/**
 * Accessible mobile slide-up bottom sheet with body scroll lock, Escape dismissal,
 * trigger focus restoration, 44x44px close touch target, and safe-area bottom clearance.
 */
export function OmnisMobileBottomSheet({
  open,
  onClose,
  eyebrow,
  title,
  subtitle,
  ariaLabel,
  closeAriaLabel = "Close panel",
  children,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  ariaLabel?: string;
  closeAriaLabel?: string;
  children: React.ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    prevFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      closeBtnRef.current?.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab" && sheetRef.current) {
        const focusables = Array.from(
          sheetRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
      prevFocusRef.current?.focus();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.14 } }}
          className="lg:hidden fixed inset-0 z-50 omnis-modal-scrim backdrop-blur-sm flex items-end"
          onClick={onClose}
        >
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel ?? title}
            initial={{ y: 36, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ y: 32, opacity: 0, transition: { duration: 0.14, ease: "easeIn" } }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-h-[78vh] overflow-y-auto rounded-t-2xl bg-[var(--bg-graphite)] border-t border-[var(--border-strong)] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
              <div className="min-w-0">
                {eyebrow ? (
                  <div className="text-xs omnis-mono font-bold tone-blue truncate">{eyebrow}</div>
                ) : null}
                <div className="font-bold text-lg text-[var(--text-primary)] truncate">{title}</div>
                {subtitle ? (
                  <div className="text-xs text-[var(--text-muted)] truncate">{subtitle}</div>
                ) : null}
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                aria-label={closeAriaLabel}
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] shrink-0 flex items-center justify-center rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Shared isolated route-level error recovery card matching OMNIS Dark & Light tokens. */
export function OmnisModuleErrorFallback({
  moduleName,
  error,
  reset,
}: {
  moduleName: string;
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[65vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg omnis-card p-6 sm:p-8 space-y-5 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 rounded-2xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] inline-flex items-center justify-center">
            <OmnisMark size={40} />
          </div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] tone-warning omnis-mono">
            {moduleName} • Isolated Recovery Boundary
          </div>
          <h1 className="omnis-display-section text-[var(--text-primary)] font-bold">
            Module Execution Interrupted
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            A localized client runtime error occurred in {moduleName}. Your workspace state and other modules remain unaffected.
          </p>
          {error.digest ? (
            <div className="px-2.5 py-1 rounded-md bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] omnis-mono">
              Digest: {error.digest}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={reset}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent-blue-solid)] hover:brightness-110 text-white text-sm font-semibold cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry {moduleName}</span>
          </button>
          <Link
            href="/command"
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-sm font-semibold text-[var(--text-primary)]"
          >
            <Globe2 className="w-3.5 h-3.5 tone-blue" />
            <span>Command Center</span>
          </Link>
          <Link
            href="/"
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-sm font-semibold text-[var(--text-primary)]"
          >
            <Home className="w-3.5 h-3.5 tone-blue" />
            <span>Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
