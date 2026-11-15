"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
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
      "bg-[var(--accent-blue-solid)] hover:brightness-110 text-white shadow-sm border border-white/10",
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
          } max-w-full overflow-x-auto pb-1 sm:pb-0 sm:overflow-visible`}
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
