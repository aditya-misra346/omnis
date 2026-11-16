"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useOmnisStore } from "@/lib/store/use-omnis-store";

export interface NarrativeTermDefinition {
  phrase: string;
  href: string;
  moduleName: string;
  summary: string;
}

const NARRATIVE_TERMS: NarrativeTermDefinition[] = [
  {
    phrase: "source-traceable",
    href: "/explore",
    moduleName: "Universal Search & Provenance",
    summary:
      "Every indicator, historical claim, and citation traces directly to World Bank, OpenAlex, UN DESA, or REST Countries records.",
  },
  {
    phrase: "Survey-Aligned 3D Global Atlas",
    href: "/atlas",
    moduleName: "Module 01 • Sovereign Globe",
    summary:
      "Interactive 3D geodesic projection with official Survey of India boundaries and 7 macroeconomic, demographic, and energy layers.",
  },
  {
    phrase: "Infinite Knowledge Graphs",
    href: "/knowledge-graph",
    moduleName: "Module 02 • Causal Networks",
    summary:
      "Multi-layout semantic networks separating empirically verified links from AI hypotheses across 11 relationship classes.",
  },
  {
    phrase: "Monte Carlo Scenario Simulations",
    href: "/simulations",
    moduleName: "Module 03 • What-If Engine",
    summary:
      "500-path stochastic macro, grid decarbonisation, cohort demography, and 2-box carbon cycle differential solvers.",
  },
  {
    phrase: "Deep Research",
    href: "/research",
    moduleName: "Module 05 • Literature Synthesis",
    summary:
      "Multi-step claim decomposition retrieving OpenAlex peer-reviewed works and Wikimedia references with grading.",
  },
  {
    phrase: "Digital Scientific Laboratory",
    href: "/laboratory",
    moduleName: "Module 06 • Real-Time Solvers",
    summary:
      "High-DPI differential-equation instruments across Physics, Orbital Mechanics, Chemistry, Biology, Climate, and Engineering.",
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
  const [scrollProgress, setScrollProgress] = useState(1);
  const [activeTermPhrase, setActiveTermPhrase] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  const segments = useMemo(() => tokenizeNarrative(text, NARRATIVE_TERMS), [text]);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) {
      setReducedMotion(true);
      setScrollProgress(1);
      return;
    }

    const onChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
      if (e.matches) setScrollProgress(1);
    };
    mq?.addEventListener?.("change", onChange);

    if (motionPaused) {
      setScrollProgress(1);
      return () => mq?.removeEventListener?.("change", onChange);
    }

    const el = containerRef.current;
    if (!el) return () => mq?.removeEventListener?.("change", onChange);

    let rafPending = false;
    let isVisible = false;

    const measureScroll = () => {
      rafPending = false;
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
      if (!isVisible || rafPending) return;
      rafPending = true;
      requestAnimationFrame(measureScroll);
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
                  className="relative inline-block omnis-focus-token"
                  style={{
                    opacity,
                    transform: `translate3d(0, ${translateY}px, 0)`,
                    filter: blurPx > 0.05 ? `blur(${blurPx}px)` : "none",
                  }}
                  onMouseEnter={() => setActiveTermPhrase(term.phrase)}
                  onMouseLeave={() =>
                    setActiveTermPhrase((prev) => (prev === term.phrase ? null : prev))
                  }
                >
                  <Link
                    href={term.href}
                    data-ink="term"
                    onFocus={() => setActiveTermPhrase(term.phrase)}
                    onBlur={() =>
                      setActiveTermPhrase((prev) => (prev === term.phrase ? null : prev))
                    }
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
                      role="tooltip"
                      className="hidden sm:block absolute left-1/2 -translate-x-1/2 bottom-full mb-2.5 z-40 w-72 omnis-card p-3 shadow-xl pointer-events-none text-left"
                    >
                      <span className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider tone-blue omnis-mono">
                        <span>{term.moduleName}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                      </span>
                      <span className="block mt-1 text-[13px] leading-relaxed text-[var(--text-secondary)] font-normal not-italic">
                        {term.summary}
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
