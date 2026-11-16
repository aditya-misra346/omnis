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
    rowLabel: "01 / DATA PROVIDERS",
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
    rowLabel: "02 / COMPUTE & MODELS",
    direction: "right",
    items: [
      {
        label: "Monte Carlo",
        summary: "500-path stochastic ensemble computing reproducible P10/P50/P90 uncertainty trajectories.",
        moduleLabel: "Open What-If Simulator",
        href: "/simulations",
      },
      {
        label: "ODE Solvers",
        summary: "Symplectic and continuous numerical integrators powering orbital mechanics & 2-box climate physics.",
        moduleLabel: "Open Digital Lab",
        href: "/laboratory",
      },
      {
        label: "SOI + World Atlas 110m",
        summary: "Official Survey of India borders and geodesic vectors rendered into GPU textures with Fresnel atmospheric limb.",
        moduleLabel: "Open 3D Global Atlas",
        href: "/atlas",
      },
      {
        label: "Force-Directed D3",
        summary: "Multi-layout causal graph solver (Force, Radial, Hierarchical, Circular, Tree, Clustered).",
        moduleLabel: "Open Knowledge Graph",
        href: "/knowledge-graph",
      },
      {
        label: "Semantic Routing",
        summary: "Context-aware natural-language intent classifier routing questions directly into target modules.",
        moduleLabel: "Open Universal Search",
        href: "/explore",
      },
      {
        label: "Regression",
        summary: "Tornado elasticity & cross-country frontier normalisation across GDP, clean grid & R&D.",
        moduleLabel: "Compare in Intelligence",
        href: "/intelligence",
      },
    ],
  },
  {
    rowLabel: "03 / DISCIPLINES",
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
        <span className="inline-flex items-center gap-2 font-bold uppercase tracking-widest tone-blue omnis-mono text-xs">
          <Radio className="w-3.5 h-3.5" />
          Live Intelligence Specimen Matrix
        </span>
        <span className="text-xs text-[var(--text-muted)] omnis-mono">
          Hover or focus any capability node to inspect provenance & launch
        </span>
      </div>

      <div className="space-y-2.5">
        {SPECIMEN_ROWS.map((row) => (
          <div
            key={row.rowLabel}
            className="omnis-ticker-row relative flex items-center gap-3 overflow-hidden py-1 border-b border-[var(--border-subtle)]/70 last:border-b-0"
          >
            <div className="shrink-0 w-40 sm:w-48 text-[11.5px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] omnis-mono z-10 bg-[var(--bg-obsidian)] pr-2">
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
                              className={`px-3 py-1 rounded-full text-sm transition-all whitespace-nowrap border focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] ${
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
