"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [resolvedAlign, setResolvedAlign] = useState<"left" | "right">(menuAlign);
  const [openUpward, setOpenUpward] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, options.findIndex((opt) => opt.value === value))
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxId = useId();

  const selected = options.find((opt) => opt.value === value) ?? options[0];
  const isSearchable = options.length > 12;

  const filteredOptions = useMemo(() => {
    if (!isSearchable || !searchQuery.trim()) return options;
    const q = searchQuery.trim().toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        (opt.hint ? opt.hint.toLowerCase().includes(q) : false)
    );
  }, [isSearchable, options, searchQuery]);

  useEffect(() => {
    if (!open) return;
    if (isSearchable && !window.matchMedia?.("(pointer: coarse)").matches) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
    const closeMenu = () => {
      setOpen(false);
      setSearchQuery("");
    };
    const handleOutside = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        triggerRef.current?.focus();
      }
    };
    const initialScrollY = window.scrollY;
    const handleScroll = () => {
      if (Math.abs(window.scrollY - initialScrollY) > 24) {
        closeMenu();
      }
    };
    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [open, isSearchable]);

  useEffect(() => {
    if (!open) return;
    const item = listboxRef.current?.querySelector<HTMLElement>(
      `[data-opt-index="${activeIndex}"]`
    );
    item?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, filteredOptions.length]);

  const openAndSyncIndex = () => {
    setOpen((prev) => {
      const nextOpen = !prev;
      if (nextOpen) {
        setSearchQuery("");
        const idx = Math.max(0, options.findIndex((opt) => opt.value === value));
        setActiveIndex(idx);
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect && typeof window !== "undefined") {
          const estimatedWidth = Math.min(320, window.innerWidth * 0.85);
          if (
            menuAlign === "left" &&
            rect.left + estimatedWidth > window.innerWidth - 12 &&
            rect.right - estimatedWidth >= 12
          ) {
            setResolvedAlign("right");
          } else if (
            menuAlign === "right" &&
            rect.right - estimatedWidth < 12 &&
            rect.left + estimatedWidth <= window.innerWidth - 12
          ) {
            setResolvedAlign("left");
          } else {
            setResolvedAlign(menuAlign);
          }
          const spaceBelow = window.innerHeight - rect.bottom;
          setOpenUpward(spaceBelow < 268 && rect.top > 268);
        }
      }
      return nextOpen;
    });
  };

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setOpen(false);
    setSearchQuery("");
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openAndSyncIndex();
      }
      return;
    }

    const total = filteredOptions.length;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (total > 0) setActiveIndex((prev) => (prev + 1) % total);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (total > 0) setActiveIndex((prev) => (prev - 1 + total) % total);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(0, total - 1));
    } else if (
      event.key === "Enter" ||
      (event.key === " " && (event.target as HTMLElement)?.tagName !== "INPUT")
    ) {
      event.preventDefault();
      const target = filteredOptions[activeIndex];
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
    size === "md"
      ? "px-3 py-2 text-sm min-h-[44px] md:min-h-[38px]"
      : "px-2.5 py-1.5 text-[13px] min-h-[44px] md:min-h-[34px]";

  const prefixToneClass =
    tone === "blue" ? "tone-blue" : tone === "violet" ? "tone-violet" : "text-[var(--text-muted)]";

  return (
    <div
      ref={containerRef}
      className={`relative ${fullWidth ? "w-full" : "inline-block max-w-full"} ${className}`}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={openAndSyncIndex}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        className={`flex items-center justify-between gap-2 ${fullWidth ? "w-full" : "max-w-full"} ${sizeClass} rounded-lg bg-[var(--bg-slate)] border ${borderToneClass} text-[var(--text-primary)] font-medium transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]`}
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
          onKeyDown={handleKeyDown}
          className={`absolute z-30 min-w-full w-max max-w-[min(320px,85vw)] max-h-64 overflow-y-auto rounded-lg bg-[var(--bg-graphite)] border border-[var(--border-subtle)] p-1 shadow-[var(--surface-shadow-hover)] ${
            openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } ${resolvedAlign === "right" ? "right-0" : "left-0"}`}
        >
          {isSearchable ? (
            <div className="sticky top-0 z-10 bg-[var(--bg-graphite)] pb-1 mb-1 border-b border-[var(--border-subtle)]">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveIndex(0);
                  }}
                  placeholder="Filter options…"
                  aria-label="Filter dropdown options"
                  className="w-full pl-7 pr-2 py-1.5 rounded-md bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-base md:text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)]"
                />
              </div>
            </div>
          ) : null}

          {filteredOptions.length === 0 ? (
            <div className="px-2.5 py-2 text-xs text-[var(--text-muted)] text-center">
              No matching options
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isHighlighted = idx === activeIndex;
              return (
                <button
                  key={opt.value}
                  data-opt-index={idx}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full min-h-[44px] md:min-h-[34px] flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-md text-left text-sm transition-colors cursor-pointer ${
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
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
