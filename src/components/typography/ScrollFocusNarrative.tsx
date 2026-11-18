"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";
import { useOmnisStore } from "@/lib/store/use-omnis-store";

export interface NarrativeTermDefinition {
  phrase: string;
  href: string;
  moduleName: string;
  summary: string;
}

const NARRATIVE_TERMS: NarrativeTermDefinition[] = [
  {
    phrase: "clear numbers",
    href: "/atlas",
    moduleName: "World Atlas • 3D Earth",
    summary:
      "Every indicator traces directly to World Bank, IMF, UN DESA, and REST Countries records with official borders.",
  },
  {
    phrase: "source-checked research",
    href: "/research",
    moduleName: "Deep Research • Cited Answers",
    summary:
      "Breaks questions down and cross-checks academic studies in OpenAlex alongside World Bank and IMF tables.",
  },
  {
    phrase: "history timelines",
    href: "/timeline",
    moduleName: "World Timeline • 3000 BCE – Today",
    summary:
      "Connects major historical turning points directly to modern economic indicators and cause-and-effect maps.",
  },
  {
    phrase: "topic maps",
    href: "/knowledge-graph",
    moduleName: "Topic Map • Cause & Effect",
    summary:
      "Visual concept maps separating proven connections from unconfirmed scenarios across plain-English links.",
  },
  {
    phrase: "interactive models",
    href: "/simulations",
    moduleName: "What-If Forecasts & Science Labs",
    summary:
      "Tests 500 possible futures across oil shocks, interest rates, clean grids, jobs, and real-time physics instruments.",
  },
  {
    phrase: "source-traceable",
    href: "/explore",
    moduleName: "Universal Search & Sources",
    summary:
      "Every indicator, historical claim, and citation traces directly to World Bank, OpenAlex, UN DESA, or REST Countries records.",
  },
  {
    phrase: "Survey-Aligned 3D Global Atlas",
    href: "/atlas",
    moduleName: "World Atlas • 3D Earth",
    summary:
      "Interactive 3D Earth with official Survey of India borders and 7 economy, population, energy, and climate layers.",
  },
  {
    phrase: "Infinite Knowledge Graphs",
    href: "/knowledge-graph",
    moduleName: "Concept Map • Cause & Effect",
    summary:
      "Visual concept maps separating proven connections from unconfirmed scenarios across plain-English links.",
  },
  {
    phrase: "Monte Carlo Scenario Simulations",
    href: "/simulations",
    moduleName: "What-If Forecasts • 500 Runs",
    summary:
      "Tests 500 possible futures across oil shocks, interest rates, clean grids, jobs, and climate warming.",
  },
  {
    phrase: "Deep Research",
    href: "/research",
    moduleName: "Deep Research • Cited Answers",
    summary:
      "Breaks questions down and cross-checks academic studies in OpenAlex alongside World Bank and IMF tables.",
  },
  {
    phrase: "Digital Scientific Laboratory",
    href: "/laboratory",
    moduleName: "Science Lab • Live Physics & Climate",
    summary:
      "Hands-on interactive instruments for pendulums, planetary orbits, molecules, ecosystems, climate, and bridges.",
  },
];

interface NarrativeSegment {
  type: "word" | "term";
  text: string;
  term?: NarrativeTermDefinition;
}

function tokenizeNarrative(text: string, terms: NarrativeTermDefinition[]): NarrativeSegment[] {
  const sortedTerms = [...terms].sort((a, b) => b.phrase.length - a.phrase.length);
  const segments: NarrativeSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let matchedTerm: NarrativeTermDefinition | null = null;
    for (const t of sortedTerms) {
      if (text.slice(cursor, cursor + t.phrase.length) === t.phrase) {
        matchedTerm = t;
        break;
      }
    }

    if (matchedTerm) {
      segments.push({ type: "term", text: matchedTerm.phrase, term: matchedTerm });
      cursor += matchedTerm.phrase.length;
      continue;
    }

    // Scan ahead to next term boundary or space
    let nextTermIdx = text.length;
    for (const t of sortedTerms) {
      const idx = text.indexOf(t.phrase, cursor);
      if (idx !== -1 && idx < nextTermIdx) nextTermIdx = idx;
    }

    const plainChunk = text.slice(cursor, nextTermIdx);
    const words = plainChunk.split(/(\s+)/);
    for (const w of words) {
      if (w.length > 0 && !/^\s+$/.test(w)) {
        segments.push({ type: "word", text: w });
      }
    }
    cursor = nextTermIdx;
  }

  return segments;
}

interface ScrollFocusNarrativeProps {
  text: string;
  className?: string;
}

export function ScrollFocusNarrative({ text, className = "" }: ScrollFocusNarrativeProps) {
  const { motionPaused } = useOmnisStore();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerTypeRef = useRef<string>("");
  const interceptedTermRef = useRef<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(1);
  const [activeTermPhrase, setActiveTermPhrase] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (!activeTermPhrase) return;
    const onOutsidePointer = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-ink-wrapper]")) return;
      setActiveTermPhrase(null);
      interceptedTermRef.current = null;
    };
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveTermPhrase(null);
        interceptedTermRef.current = null;
      }
    };
    document.addEventListener("pointerdown", onOutsidePointer);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("pointerdown", onOutsidePointer);
      window.removeEventListener("keydown", onEsc);
    };
  }, [activeTermPhrase]);

  const segments = useMemo(() => tokenizeNarrative(text, NARRATIVE_TERMS), [text]);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let initTimer = 0;
    if (mq?.matches) {
      initTimer = window.setTimeout(() => {
        setReducedMotion(true);
        setScrollProgress(1);
      }, 0);
      return () => window.clearTimeout(initTimer);
    }

    const onChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
      if (e.matches) setScrollProgress(1);
    };
    mq?.addEventListener?.("change", onChange);

    if (motionPaused) {
      initTimer = window.setTimeout(() => setScrollProgress(1), 0);
      return () => {
        window.clearTimeout(initTimer);
        mq?.removeEventListener?.("change", onChange);
      };
    }

    const el = containerRef.current;
    if (!el) return () => mq?.removeEventListener?.("change", onChange);

    let rafId = 0;
    let isVisible = false;

    const measureScroll = () => {
      rafId = 0;
      const node = containerRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight || 900;
      const raw = (vh * 0.96 - rect.top) / (vh * 0.30);
      const clamped = Math.max(0, Math.min(1, raw));
      setScrollProgress(clamped);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveTermPhrase(null);
      }
    };

    const scheduleMeasure = () => {
      if (!isVisible) return;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measureScroll);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isVisible = entry.isIntersecting;
          if (isVisible) {
            measureScroll();
          }
        }
      },
      { threshold: 0.02 }
    );

    io.observe(el);
    measureScroll();
    window.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      io.disconnect();
      window.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("keydown", handleKeyDown);
      mq?.removeEventListener?.("change", onChange);
    };
  }, [motionPaused]);

  const effectiveProgress = motionPaused || reducedMotion ? 1 : scrollProgress;
  const totalCount = Math.max(1, segments.length);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <p className="text-base sm:text-[17.5px] leading-[1.72] text-[var(--text-secondary)]">
        {segments.map((seg, idx) => {
          const tokenStart = (idx / totalCount) * 0.75;
          const tokenSpan = 0.25;
          const localA = Math.max(
            0,
            Math.min(1, (effectiveProgress - tokenStart) / tokenSpan)
          );
          const opacity = Number((0.58 + localA * 0.42).toFixed(3));
          const translateY = Number(((1 - localA) * 5).toFixed(2));
          const blurPx = Number(((1 - localA) * 1.2).toFixed(2));

          if (seg.type === "term" && seg.term) {
            const term = seg.term;
            const unlocked = localA >= 0.65;
            const isOpen = activeTermPhrase === term.phrase;

            return (
              <React.Fragment key={`${idx}-${term.phrase}`}>
                <span
                  data-ink-wrapper
                  className="relative inline-block omnis-focus-token"
                  style={{
                    opacity,
                    transform: `translate3d(0, ${translateY}px, 0)`,
                    filter: blurPx > 0.05 ? `blur(${blurPx}px)` : "none",
                  }}
                  onMouseEnter={() => {
                    pointerTypeRef.current = "mouse";
                    setActiveTermPhrase(term.phrase);
                  }}
                  onMouseLeave={() =>
                    setActiveTermPhrase((prev) => (prev === term.phrase ? null : prev))
                  }
                >
                  <Link
                    href={term.href}
                    data-ink="term"
                    onPointerDown={(e) => {
                      pointerTypeRef.current = e.pointerType;
                      if (e.pointerType !== "mouse" && !isOpen) {
                        interceptedTermRef.current = term.phrase;
                        setActiveTermPhrase(term.phrase);
                      }
                    }}
                    onClick={(e) => {
                      const isCoarse =
                        pointerTypeRef.current !== "mouse" &&
                        (pointerTypeRef.current !== "" ||
                          window.matchMedia?.("(pointer: coarse)").matches);
                      if (isCoarse && (interceptedTermRef.current === term.phrase || !isOpen)) {
                        e.preventDefault();
                        interceptedTermRef.current = null;
                        setActiveTermPhrase(term.phrase);
                      }
                    }}
                    onFocus={() => setActiveTermPhrase(term.phrase)}
                    onBlur={(e) => {
                      const nextTarget = e.relatedTarget as HTMLElement | null;
                      if (nextTarget?.closest("[data-ink-wrapper]") === e.currentTarget.closest("[data-ink-wrapper]")) {
                        return;
                      }
                      setActiveTermPhrase((prev) => (prev === term.phrase ? null : prev));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setActiveTermPhrase(null);
                        (e.currentTarget as HTMLElement).blur();
                      }
                    }}
                    className={`group relative inline-flex items-baseline gap-0.5 px-0.5 omnis-editorial text-[1.15em] transition-colors border-b border-dashed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] rounded-sm ${
                      unlocked
                        ? "omnis-gradient-text font-normal border-[var(--ink-underline-active)]"
                        : "text-[var(--text-primary)] border-[var(--ink-underline)]"
                    }`}
                  >
                    <span>{term.phrase}</span>
                    <sup
                      aria-hidden="true"
                      className="omnis-magnetic-arrow text-[0.58em] font-sans not-italic opacity-75 leading-none select-none"
                    >
                      ↗
                    </sup>
                  </Link>

                  {isOpen && (
                    <span
                      role="dialog"
                      aria-label={term.moduleName}
                      className="fixed sm:absolute left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 bottom-4 sm:bottom-full sm:pb-2 z-50 sm:w-80 text-left"
                    >
                      <span className="block omnis-card p-3.5 shadow-xl space-y-2 border border-[var(--border-strong)]">
                        <span className="flex items-center justify-between gap-2 text-xs font-semibold tone-blue">
                          <span>{term.moduleName}</span>
                          <button
                            type="button"
                            aria-label={`Close ${term.phrase} preview`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTermPhrase(null);
                              interceptedTermRef.current = null;
                            }}
                            className="sm:hidden min-h-[44px] min-w-[44px] -mr-2 -my-2 inline-flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </span>
                        <span className="block text-[13px] leading-relaxed text-[var(--text-secondary)] font-normal not-italic">
                          {term.summary}
                        </span>
                        <Link
                          href={term.href}
                          className="min-h-[44px] sm:min-h-[30px] w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-blue-solid)] text-white text-xs font-semibold hover:brightness-110 transition-all"
                        >
                          <span>Open {term.phrase}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                        </Link>
                      </span>
                    </span>
                  )}
                </span>
                {idx < segments.length - 1 ? " " : ""}
              </React.Fragment>
            );
          }

          return (
            <React.Fragment key={`${idx}-${seg.text}`}>
              <span
                className="inline-block omnis-focus-token transition-[color] duration-200"
                style={{
                  opacity,
                  transform: `translate3d(0, ${translateY}px, 0)`,
                  filter: blurPx > 0.05 ? `blur(${blurPx}px)` : "none",
                }}
              >
                {seg.text}
              </span>
              {idx < segments.length - 1 ? " " : ""}
            </React.Fragment>
          );
        })}
      </p>
    </div>
  );
}
