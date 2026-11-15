"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface OmnisSelectOption {
  value: string;
  label: string;
  hint?: string;
}

export interface OmnisSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: OmnisSelectOption[];
  ariaLabel?: string;
  leadingIcon?: React.ReactNode;
  prefixLabel?: string;
  tone?: "neutral" | "blue" | "violet";
  size?: "sm" | "md";
  fullWidth?: boolean;
  menuAlign?: "left" | "right";
  className?: string;
}

export function OmnisSelect({
  value,
  onChange,
  options,
  ariaLabel,
  leadingIcon,
  prefixLabel,
  tone = "neutral",
  size = "sm",
  fullWidth = false,
  menuAlign = "left",
  className = "",
}: OmnisSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, options.findIndex((opt) => opt.value === value))
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();

  const selected = options.find((opt) => opt.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const openAndSyncIndex = () => {
    const idx = Math.max(0, options.findIndex((opt) => opt.value === value));
    setActiveIndex(idx);
    setOpen((prev) => !prev);
  };

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openAndSyncIndex();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % Math.max(1, options.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + options.length) % Math.max(1, options.length));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(0, options.length - 1));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const target = options[activeIndex];
      if (target) handleSelect(target.value);
    } else if (event.key === "Escape" || event.key === "Tab") {
      setOpen(false);
    }
  };

  const borderToneClass =
    tone === "blue"
      ? "border-[var(--accent-blue)]"
      : tone === "violet"
        ? "border-[var(--accent-violet)]"
        : "border-[var(--border-subtle)] hover:border-[var(--border-strong)]";

  const sizeClass =
    size === "md" ? "px-3 py-2 text-sm min-h-[38px]" : "px-2.5 py-1.5 text-[13px] min-h-[34px]";

  const prefixToneClass =
    tone === "blue" ? "tone-blue" : tone === "violet" ? "tone-violet" : "text-[var(--text-muted)]";

  return (
    <div
      ref={containerRef}
      className={`relative ${fullWidth ? "w-full" : "inline-block"} ${className}`}
    >
      <button
        type="button"
        onClick={openAndSyncIndex}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        className={`flex items-center justify-between gap-2 ${fullWidth ? "w-full" : ""} ${sizeClass} rounded-lg bg-[var(--bg-slate)] border ${borderToneClass} text-[var(--text-primary)] font-medium transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]`}
      >
        <span className="flex items-center gap-1.5 min-w-0 truncate">
          {leadingIcon ? <span className="shrink-0">{leadingIcon}</span> : null}
          {prefixLabel ? (
            <span className={`font-bold shrink-0 ${prefixToneClass}`}>{prefixLabel}</span>
          ) : null}
          <span className="truncate font-semibold">{selected?.label ?? value}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-[var(--text-muted)] transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div
          id={listboxId}
          ref={listboxRef}
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute z-50 mt-1.5 min-w-full w-max max-w-[min(320px,85vw)] max-h-64 overflow-y-auto rounded-lg bg-[var(--bg-graphite)] border border-[var(--border-subtle)] p-1 shadow-[var(--surface-shadow-hover)] ${
            menuAlign === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isHighlighted = idx === activeIndex;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handleSelect(opt.value)}
                className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-md text-left text-sm transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-[var(--badge-blue-bg)] text-[var(--text-primary)] font-semibold"
                    : isHighlighted
                      ? "bg-[var(--bg-slate)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-slate)] hover:text-[var(--text-primary)]"
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate">{opt.label}</div>
                  {opt.hint ? (
                    <div className="text-xs text-[var(--text-muted)] truncate">{opt.hint}</div>
                  ) : null}
                </div>
                {isSelected ? <Check className="w-3.5 h-3.5 tone-blue shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
