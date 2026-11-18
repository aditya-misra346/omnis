"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Radio } from "lucide-react";

interface SpecimenItem {
  label: string;
  summary: string;
  moduleLabel: string;
  href: string;
}

interface SpecimenRow {
  rowLabel: string;
  direction: "left" | "right";
  items: SpecimenItem[];
}

const SPECIMEN_ROWS: SpecimenRow[] = [
  {
    rowLabel: "Data Sources",
    direction: "left",
    items: [
      {
        label: "World Bank v2",
        summary: "Official WDI macroeconomic & energy series mapped across sovereign country dossiers.",
        moduleLabel: "Explore in Global Atlas",
        href: "/atlas",
      },
      {
        label: "OpenAlex",
        summary: "Peer-reviewed scholarly works graph backing Deep Research citations and evidence grading.",
        moduleLabel: "Explore in Deep Research",
        href: "/research",
      },
      {
        label: "REST Countries",
        summary: "Verified sovereign taxonomy, capitals, flags, languages, and ISO codes.",
        moduleLabel: "Explore in Global Atlas",
        href: "/atlas",
      },
      {
        label: "UN DESA",
        summary: "Cohort population projections and longevity baselines powering demographic simulations.",
        moduleLabel: "Explore in Simulations",
        href: "/simulations?category=demographics",
      },
      {
        label: "IMF WEO",
        summary: "Real GDP growth trajectories and sovereign inflation benchmarks across G20 & emerging markets.",
        moduleLabel: "Compare Entities",
        href: "/intelligence",
      },
      {
        label: "Crossref",
        summary: "DOI resolution & metadata provenance preventing unverified bibliography synthesis.",
        moduleLabel: "Explore in Deep Research",
        href: "/research",
      },
      {
        label: "Wikimedia REST",
        summary: "Structured encyclopedic event summaries linked into historical knowledge graphs.",
        moduleLabel: "Explore in Reality Timeline",
        href: "/timeline",
      },
    ],
  },
  {
    rowLabel: "Models & Engines",
    direction: "right",
    items: [
      {
        label: "What-If Engine",
        summary: "Tests 500 possible futures to show likely best, typical, and worst results.",
        moduleLabel: "Open What-If Simulator",
        href: "/simulations",
      },
      {
        label: "Physics & Climate Labs",
        summary: "Interactive science experiments covering pendulum motion, orbits, chemistry, and warming.",
        moduleLabel: "Open Science Lab",
        href: "/laboratory",
      },
      {
        label: "Accurate Earth Globe",
        summary: "Official Survey of India borders and global shapes wrapped onto a live day-and-night Earth.",
        moduleLabel: "Open 3D World Atlas",
        href: "/atlas",
      },
      {
        label: "Topic Map Layout",
        summary: "Arrange cause-and-effect concepts as force networks, rings, trees, or topic clusters.",
        moduleLabel: "Open Concept Map",
        href: "/knowledge-graph",
      },
      {
        label: "Smart Search",
        summary: "Matches plain-English questions straight to country data, timelines, or papers.",
        moduleLabel: "Search All Topics",
        href: "/explore",
      },
      {
        label: "Fair Country Comparisons",
        summary: "Places giant economies alongside per-person living standards so comparisons stay honest.",
        moduleLabel: "Compare Countries",
        href: "/intelligence",
      },
    ],
  },
  {
    rowLabel: "Subjects",
    direction: "left",
    items: [
      {
        label: "Macroeconomics",
        summary: "Solow-Swan growth, tariff elasticity, monetary transmission & sovereign fiscal comparisons.",
        moduleLabel: "Simulate Economics",
        href: "/simulations?category=economics",
      },
      {
        label: "Geopolitics",
        summary: "Treaty networks, semiconductor choke points, and multilateral diplomatic alignments.",
        moduleLabel: "Open Geopolitics Graph",
        href: "/knowledge-graph?topic=Semiconductors",
      },
      {
        label: "Energy Systems",
        summary: "Clean grid transition curves across renewables, nuclear fission/fusion, and fossil phase-down.",
        moduleLabel: "Simulate Clean Grid",
        href: "/simulations?category=energy",
      },
      {
        label: "Climate Science",
        summary: "Atmosphere–ocean heat exchange, radiative forcing, and CO₂ emission scenario trajectories.",
        moduleLabel: "Open Climate Simulator",
        href: "/laboratory?cat=climate",
      },
      {
        label: "Astrophysics",
        summary: "Keplerian orbital mechanics, tidal gravity fields, and phase-space conserved angular momentum.",
        moduleLabel: "Open Space Lab",
        href: "/laboratory?cat=space",
      },
      {
        label: "Historical Eras",
        summary: "Chronological inflection points spanning 2600 BCE Bronze Age cities through 1991 reforms.",
        moduleLabel: "Open Reality Timeline",
        href: "/timeline",
      },
    ],
  },
];

export function IntelligenceSpecimenTicker() {
  const defaultItem = SPECIMEN_ROWS[0].items[0];
  const [activeItem, setActiveItem] = useState<SpecimenItem>(defaultItem);

  return (
    <div className="bg-[var(--bg-obsidian)] px-4 sm:px-6 py-5 border-y border-[var(--border-subtle)] space-y-4 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <span className="inline-flex items-center gap-2 font-semibold tone-blue text-[13px]">
          <Radio className="w-3.5 h-3.5" />
          Data Sources & Models Behind OMNIS
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          Hover or tap any item to see where data comes from
        </span>
      </div>

      <div className="space-y-2.5">
        {SPECIMEN_ROWS.map((row) => (
          <div
            key={row.rowLabel}
            className="omnis-ticker-row relative flex items-center gap-3 overflow-hidden py-1 border-b border-[var(--border-subtle)]/70 last:border-b-0"
          >
            <div className="shrink-0 w-28 sm:w-44 text-xs sm:text-[13px] font-medium text-[var(--text-muted)] z-10 bg-[var(--bg-obsidian)] pr-2 truncate">
              {row.rowLabel}
            </div>

            <div className="relative flex-1 min-w-0 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
              <div
                className={
                  row.direction === "left"
                    ? "omnis-ticker-track-left"
                    : "omnis-ticker-track-right"
                }
              >
                {[0, 1, 2].map((copyIdx) => {
                  const isClone = copyIdx > 0;
                  return (
                    <div
                      key={copyIdx}
                      aria-hidden={isClone}
                      className="flex items-center shrink-0 pr-3"
                    >
                      {row.items.map((item, idx) => {
                        const isActive = activeItem.label === item.label;
                        const isEditorial = idx % 2 === 1;
                        return (
                          <React.Fragment key={`${copyIdx}-${item.label}`}>
                            <Link
                              href={item.href}
                              tabIndex={isClone ? -1 : 0}
                              onMouseEnter={() => setActiveItem(item)}
                              onFocus={() => setActiveItem(item)}
                              className={`min-h-[44px] md:min-h-0 inline-flex items-center px-3 py-2 md:py-1 rounded-full text-sm transition-all whitespace-nowrap border focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] ${
                                isEditorial
                                  ? "omnis-editorial text-[18px] leading-none"
                                  : "font-display font-semibold text-[13px] sm:text-sm"
                              } ${
                                isActive
                                  ? "is-active text-[var(--text-primary)]"
                                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              }`}
                              style={
                                isActive
                                  ? {
                                      backgroundColor: "var(--specimen-active-bg)",
                                      borderColor: "var(--specimen-active-border)",
                                      boxShadow: "var(--specimen-active-glow)",
                                    }
                                  : undefined
                              }
                            >
                              {item.label}
                            </Link>
                            <span
                              aria-hidden="true"
                              className="mx-1.5 text-xs omnis-mono text-[var(--text-muted)] select-none"
                            >
                              *
                            </span>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Live Contextual Provenance Bar */}
      <div className="rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[13px] sm:text-sm">
        <div className="min-w-0 text-[var(--text-secondary)] leading-relaxed">
          <strong className="text-[var(--text-primary)] font-semibold">
            {activeItem.label}:
          </strong>{" "}
          <span>{activeItem.summary}</span>
        </div>
        <Link
          href={activeItem.href}
          className="shrink-0 inline-flex items-center gap-1 font-semibold tone-blue hover:underline omnis-mono text-xs"
        >
          <span>{activeItem.moduleLabel}</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
