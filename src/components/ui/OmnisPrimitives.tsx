"use client";

import React from "react";
import { motion } from "framer-motion";

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
  children,
}: {
  moduleTag: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="omnis-card p-5 sm:p-6 space-y-4 relative overflow-hidden"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full badge-tone-blue text-[11px] font-semibold uppercase tracking-wider omnis-mono">
            {icon}
            <span>{moduleTag}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-3xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {children}
    </motion.section>
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
    <div className="omnis-surface-slate p-3.5 space-y-1 hover:border-[var(--border-strong)]">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] truncate">
        {label}
      </div>
      <div className={`text-lg sm:text-xl font-bold omnis-mono leading-tight ${toneClass}`}>
        {value}
      </div>
      {subValue && (
        <div className="text-[11px] text-[var(--text-secondary)] omnis-mono truncate">
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
