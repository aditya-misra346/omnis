"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

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
      "bg-[var(--accent-blue-solid)] hover:brightness-110 text-white shadow-sm border border-white/10",
    secondary:
      "bg-[var(--bg-slate)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)]",
    ghost:
      "bg-transparent hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent",
    danger:
      "badge-tone-danger hover:brightness-105",
  };

  const sizeClasses = {
    sm: "px-2.5 py-1.5 text-xs rounded-lg gap-1.5",
    md: "px-3.5 py-2 text-xs rounded-lg gap-2",
    lg: "px-5 py-2.5 text-sm rounded-xl gap-2",
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
        <div className="space-y-1 sm:space-y-1.5 min-w-0">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] tone-blue omnis-mono">
            {icon}
            <span>{moduleTag}</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-3xl leading-relaxed line-clamp-2 sm:line-clamp-none">
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
                className="sm:hidden inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer"
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
        <div className={mobileExpanded ? "block" : "hidden sm:block"}>{secondaryControls}</div>
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
    <div className="omnis-surface-slate p-3.5 space-y-1 hover:border-[var(--border-strong)] min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] leading-snug">
        {label}
      </div>
      <div className={`text-lg sm:text-xl font-bold omnis-mono omnis-tabular leading-tight ${toneClass}`}>
        {value}
      </div>
      {subValue && (
        <div className="text-[11px] text-[var(--text-secondary)] omnis-mono omnis-tabular leading-snug break-words">
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
