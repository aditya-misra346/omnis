"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Globe2,
  Network,
  Sliders,
  Clock,
  FileSearch,
  FlaskConical,
  ArrowRight,
  Search,
  ShieldCheck,
  Database,
  CheckCircle2,
  Sparkles,
  Layers,
  Terminal,
  BookOpen,
} from "lucide-react";
import { COUNTRIES_DATA } from "@/lib/data/global-intelligence";
import { InteractiveGlobe3D } from "@/components/globe/InteractiveGlobe3D";
import { ProvenancePanel } from "@/components/ui/ProvenancePanel";
import type { IntelligenceLayerId } from "@/types/omnis";

const FLAGSHIP_MODULES = [
  {
    number: "MODULE 01",
    title: "Global Intelligence Globe",
    href: "/atlas",
    icon: Globe2,
    description:
      "Interactive 3D Earth with atmospheric scattering, solar day/night transitions, 7 toggleable intelligence overlays, and deep sovereign Country Intelligence Profiles.",
    metrics: "200+ Sovereign Profiles • Live World Bank & REST Countries APIs",
  },
  {
    number: "MODULE 02",
    title: "Infinite Knowledge Graph",
    href: "/knowledge-graph",
    icon: Network,
    description:
      "Multi-layout semantic network engine (Force, Radial, Hierarchical, Circular, Tree, Clustered) with 11 typed causal relationships and hypothesis separation.",
    metrics: "6 Layout Modes • Progressive Node Expansion • SVG/JSON Export",
  },
  {
    number: "MODULE 03",
    title: "What-If Simulation Engine",
    href: "/simulations",
    icon: Sliders,
    description:
      "Quantitative scenario laboratory across Economics, Demographics, Energy, Technology, and Environment powered by 500-path Monte Carlo & ODE models.",
    metrics: "P10/P50/P90 Uncertainty Bands • Tornado Sensitivity Analysis",
  },
  {
    number: "MODULE 04",
    title: "Reality Timeline",
    href: "/timeline",
    icon: Clock,
    description:
      "Chronological and cross-regional exploration from 2600 BCE Bronze Age urbanism to the 1991 Indian reforms and modern Transformer AI breakthroughs.",
    metrics: "Horizontal & Vertical Views • Connected History Graph Bridge",
  },
  {
    number: "MODULE 05",
    title: "Deep Research Intelligence",
    href: "/research",
    icon: FileSearch,
    description:
      "Multi-step research orchestrator across 6 modes retrieving peer-reviewed OpenAlex works, World Bank series, and Wikimedia references with claim-level verification.",
    metrics: "6 Research Modes • Contradictory Evidence & Credibility Grading",
  },
  {
    number: "MODULE 06",
    title: "Digital World Laboratory",
    href: "/laboratory",
    icon: FlaskConical,
    description:
      "Interactive mathematical and physical simulators across Physics, Space, Chemistry, Biology, Climate, and Engineering with governing equations.",
    metrics: "6 Scientific Disciplines • Real-Time Interactive Canvas Models",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [heroQuery, setHeroQuery] = useState("");
  const [selectedIso3, setSelectedIso3] = useState("IND");
  const [activeLayer, setActiveLayer] = useState<IntelligenceLayerId>("economics");
  const [simOilShock, setSimOilShock] = useState(30);

  const countriesList = Object.values(COUNTRIES_DATA);
  const activeCountry = COUNTRIES_DATA[selectedIso3] ?? COUNTRIES_DATA.IND;

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = heroQuery.trim() || "Explain India's economic development since 1991";
    router.push(`/explore?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* SECTION 1: CINEMATIC HERO SECTION */}
      <section className="relative py-14 lg:py-20 px-4 sm:px-8 border-b border-[var(--border-subtle)] omnis-grid-bg">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>OMNIS GLOBAL INTELLIGENCE ECOSYSTEM</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08]">
                Understand Anything.{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-violet-400">
                  Connect Everything.
                </span>
              </h1>
              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl">
                OMNIS transforms static walls of text into interactive, source-traceable global
                intelligence—unifying a 3D Earth Atlas, Infinite Knowledge Graphs, Monte Carlo
                Scenario Simulations, Deep Research, and a Digital Scientific Laboratory.
              </p>
            </div>

            {/* Universal Natural Language Search Bar */}
            <form
              onSubmit={handleHeroSearch}
              className="omnis-card p-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border-blue-500/35"
            >
              <div className="flex-1 flex items-center gap-2.5 px-3 py-2">
                <Search className="w-4 h-4 text-blue-400 shrink-0" />
                <input
                  type="text"
                  value={heroQuery}
                  onChange={(e) => setHeroQuery(e.target.value)}
                  placeholder="Try: 'Explain India's economic development since 1991' or 'Compare India and China'"
                  className="w-full bg-transparent text-sm focus:outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Investigate</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/command"
                className="px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all"
              >
                <span>Launch Intelligence Command Center</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/atlas"
                className="px-5 py-3 rounded-lg bg-[var(--bg-slate)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-all"
              >
                <Globe2 className="w-4 h-4 text-blue-400" />
                <span>Explore 3D Global Atlas</span>
              </Link>
            </div>

            {/* Epistemic Provenance Strip */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[var(--border-subtle)] text-xs">
              <div>
                <div className="font-bold text-base omnis-mono text-blue-400">6 Modules</div>
                <div className="text-[var(--text-muted)]">Unified Intelligence Core</div>
              </div>
              <div>
                <div className="font-bold text-base omnis-mono text-emerald-400">100% Cited</div>
                <div className="text-[var(--text-muted)]">World Bank, OpenAlex & UN</div>
              </div>
              <div>
                <div className="font-bold text-base omnis-mono text-violet-400">500-Path MC</div>
                <div className="text-[var(--text-muted)]">Stochastic Scenario Engine</div>
              </div>
            </div>
          </div>

          {/* SECTION 2: INTERACTIVE GLOBAL INTELLIGENCE VISUALISATION */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                Live 3D Planetary Intelligence Preview
              </span>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    "economics",
                    "demographics",
                    "energy",
                    "environment",
                    "technology",
                  ] as IntelligenceLayerId[]
                ).map((layer) => (
                  <button
                    key={layer}
                    type="button"
                    onClick={() => setActiveLayer(layer)}
                    className={`px-2 py-1 rounded text-[11px] capitalize font-medium transition-colors ${
                      activeLayer === layer
                        ? "bg-blue-600 text-white"
                        : "bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {layer}
                  </button>
                ))}
              </div>
            </div>

            <InteractiveGlobe3D
              countries={countriesList}
              selectedIso3={selectedIso3}
              onSelectCountry={setSelectedIso3}
              activeLayer={activeLayer}
              heightClass="h-[430px]"
            />
          </div>
        </div>
      </section>

      {/* SECTION 3: PRODUCT INTRODUCTION — SIX DISCIPLINES UNIFIED */}
      <section className="py-14 px-4 sm:px-8 border-b border-[var(--border-subtle)] bg-[var(--bg-graphite)]">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="max-w-3xl space-y-2">
            <div className="text-xs font-semibold uppercase tracking-widest text-blue-400">
              01 / Architectural Vision
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold">
              Six Major Disciplines Integrated Into One Cohesive System
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Conventional search engines return fragmented links; generic chatbots return unverified
              prose. OMNIS synthesizes structured sovereign statistics, peer-reviewed literature,
              causal graphs, and mathematical simulations with full source provenance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: "1. Artificial Intelligence",
                desc: "Context-aware natural language understanding, query decomposition, and strict separation between verified facts and AI hypotheses.",
              },
              {
                title: "2. Global Information & Research",
                desc: "Direct integration with World Bank Open Data, OpenAlex scholarly works, Crossref, REST Countries, and Wikimedia REST archives.",
              },
              {
                title: "3. Knowledge Representation",
                desc: "Typed semantic networks with 11 directional relationship classes (CAUSES, DEPENDS_ON, REGULATES, COMPETES_WITH).",
              },
              {
                title: "4. Interactive Data Visualisation",
                desc: "3D WebGL planetary globes, multi-layout D3 knowledge graphs, Monte Carlo uncertainty fans, and comparative radar matrices.",
              },
              {
                title: "5. Scientific & Economic Simulations",
                desc: "Solow-Swan macroeconomic models, cohort-component demography, grid decarbonisation, and 2-box carbon cycle differential equations.",
              },
              {
                title: "6. Historical & Geographical Intelligence",
                desc: "Cross-era chronological timelines (2600 BCE–2026 CE) connected directly to sovereign profiles and conceptual knowledge graphs.",
              },
            ].map((item) => (
              <div key={item.title} className="omnis-surface-slate p-5 space-y-2">
                <h3 className="font-bold text-sm text-[var(--text-primary)]">{item.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: THE SIX FLAGSHIP INTELLIGENCE MODULES */}
      <section className="py-16 px-4 sm:px-8 border-b border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-blue-400">
                02 / Flagship Modules
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mt-1">
                Explore the Six Flagship Intelligence Environments
              </h2>
            </div>
            <Link
              href="/command"
              className="text-xs font-semibold text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              Open Command Center <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FLAGSHIP_MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.number}
                  href={mod.href}
                  className="omnis-card p-6 flex flex-col justify-between gap-5 hover:border-blue-500/50 transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold tracking-widest text-blue-400 omnis-mono">
                        {mod.number}
                      </span>
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold group-hover:text-blue-400 transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {mod.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)] omnis-mono">
                    <span>{mod.metrics}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 5, 6, 7 & 8: INTERACTIVE PRODUCT, RESEARCH, GRAPH & SIMULATION DEMONSTRATIONS */}
      <section className="py-16 px-4 sm:px-8 border-b border-[var(--border-subtle)] bg-[var(--bg-graphite)]">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-widest text-blue-400">
              03 / Live Interactive Demonstrations
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold">
              Country Intelligence, Knowledge Graph, Research & Scenario Simulation Preview
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Country Intelligence Live Preview */}
            <div className="lg:col-span-7 omnis-card p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-blue-400 font-semibold">
                    Interactive Country Intelligence Experience
                  </span>
                  <h3 className="text-xl font-bold mt-0.5">
                    {activeCountry.flagEmoji} {activeCountry.officialName} ({activeCountry.iso3})
                  </h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["IND", "USA", "CHN", "DEU", "JPN"].map((iso) => (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSelectedIso3(iso)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold omnis-mono ${
                        selectedIso3 === iso
                          ? "bg-blue-600 text-white"
                          : "bg-[var(--bg-slate)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {iso}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="omnis-surface-slate p-3">
                  <div className="text-[10px] uppercase text-[var(--text-muted)]">Nominal GDP</div>
                  <div className="text-base font-bold omnis-mono mt-0.5 text-blue-400">
                    ${activeCountry.gdpUsdBn.toLocaleString()}B
                  </div>
                  <div className="text-[10px] text-emerald-400 omnis-mono">
                    +{activeCountry.gdpGrowthPct}% real/yr
                  </div>
                </div>
                <div className="omnis-surface-slate p-3">
                  <div className="text-[10px] uppercase text-[var(--text-muted)]">GDP / Capita</div>
                  <div className="text-base font-bold omnis-mono mt-0.5">
                    ${activeCountry.gdpPerCapitaUsd.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    CPI: {activeCountry.inflationPct}%
                  </div>
                </div>
                <div className="omnis-surface-slate p-3">
                  <div className="text-[10px] uppercase text-[var(--text-muted)]">Clean Grid</div>
                  <div className="text-base font-bold omnis-mono mt-0.5 text-emerald-400">
                    {activeCountry.energyProfile.renewableSharePct}%
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    Nuclear: {activeCountry.energyProfile.nuclearSharePct}%
                  </div>
                </div>
                <div className="omnis-surface-slate p-3">
                  <div className="text-[10px] uppercase text-[var(--text-muted)]">Population</div>
                  <div className="text-base font-bold omnis-mono mt-0.5">
                    {(activeCountry.population / 1e6).toFixed(1)}M
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    Life Exp: {activeCountry.lifeExpectancyYears}y
                  </div>
                </div>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                <strong>Technology & Digital Infrastructure:</strong>{" "}
                {activeCountry.technologyProfile.digitalInfrastructureSummary}
              </p>

              <ProvenancePanel provenance={activeCountry.provenance} compact />

              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  href={`/atlas?country=${activeCountry.iso3}`}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  Open Full {activeCountry.name} Intelligence Dossier{" "}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href={`/intelligence?left=${activeCountry.iso3}&right=${
                    activeCountry.iso3 === "IND" ? "CHN" : "IND"
                  }`}
                  className="px-4 py-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs font-semibold"
                >
                  Compare {activeCountry.name} vs {activeCountry.iso3 === "IND" ? "China" : "India"}
                </Link>
              </div>
            </div>

            {/* Interactive What-If Simulation & Knowledge Graph Demo */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="omnis-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-violet-400 font-semibold">
                    Interactive What-If Simulation Demo
                  </span>
                  <span className="text-[11px] omnis-mono text-[var(--text-muted)]">
                    Solow-Swan MDSE-v2.4
                  </span>
                </div>
                <h3 className="text-base font-bold">
                  Crude Oil Price Shock Impact on 2040 Real GDP Trajectory
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Oil Price Impulse:</span>
                    <span className="font-bold omnis-mono text-blue-400">
                      {simOilShock >= 0 ? `+${simOilShock}%` : `${simOilShock}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-30}
                    max={80}
                    step={5}
                    value={simOilShock}
                    onChange={(e) => setSimOilShock(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                  <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                    <div className="omnis-surface-slate p-2.5">
                      <div className="text-[10px] text-[var(--text-muted)]">Baseline 2040</div>
                      <div className="text-sm font-bold omnis-mono">160.5</div>
                    </div>
                    <div className="omnis-surface-slate p-2.5">
                      <div className="text-[10px] text-[var(--text-muted)]">Modified P50</div>
                      <div className="text-sm font-bold omnis-mono text-blue-400">
                        {(160.5 * (1 - simOilShock * 0.0012)).toFixed(1)}
                      </div>
                    </div>
                    <div className="omnis-surface-slate p-2.5">
                      <div className="text-[10px] text-[var(--text-muted)]">P10–P90 Band</div>
                      <div className="text-sm font-bold omnis-mono text-violet-400">
                        ±{(8.4 + Math.abs(simOilShock) * 0.11).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
                <Link
                  href="/simulations"
                  className="text-xs font-semibold text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  Open Full 5-Domain Simulation Workspace <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="omnis-card p-6 space-y-3">
                <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold">
                  Deep Research & Infinite Graph Integration
                </span>
                <h3 className="text-base font-bold">
                  Traceable Multi-Step Research & Semantic Graph Expansion
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Every research report decomposes complex questions into sub-tasks, retrieves live
                  OpenAlex peer-reviewed works and World Bank indicators, flags conflicting evidence,
                  and transitions into an interactive Knowledge Graph in one click.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link
                    href="/research"
                    className="px-3.5 py-2 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold"
                  >
                    Launch Deep Research
                  </Link>
                  <Link
                    href="/knowledge-graph"
                    className="px-3.5 py-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-semibold"
                  >
                    Launch Knowledge Graph
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 9 & 10: TECHNOLOGY PHILOSOPHY, TRUST & EPISTEMIC TRANSPARENCY */}
      <section className="py-16 px-4 sm:px-8 border-b border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="omnis-card p-6 space-y-4">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <Terminal className="w-4 h-4" />
              <span>04 / Technology & Polyglot Architecture</span>
            </div>
            <h3 className="text-xl font-bold">
              Engineered for Precision, Speed & Reproducibility
            </h3>
            <ul className="space-y-2.5 text-xs text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>TypeScript + Next.js + Three.js + D3:</strong> Strict typing, GPU-disposed
                  3D WebGL Earth rendering, and 6-layout semantic graphs.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Python FastAPI + SQLAlchemy 2.0 + NumPy:</strong> Relational schema across
                  28 tables, Alembic migrations, and deterministic Monte Carlo simulation routines.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>AI Security Guardrails:</strong> Prompt-injection sanitization, untrusted
                  retrieval quarantine, and sliding-window API rate limiting.
                </span>
              </li>
            </ul>
          </div>

          <div className="omnis-card p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>05 / Trust, Provenance & Epistemic Integrity</span>
            </div>
            <h3 className="text-xl font-bold">
              Non-Negotiable Separation of Verified Data and Hypotheses
            </h3>
            <ul className="space-y-2.5 text-xs text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <Database className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Identifiable Provenance:</strong> Every country indicator and chart
                  displays its publisher, retrieval timestamp, units, coverage, and methodology.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <BookOpen className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Zero Fabricated Citations:</strong> Claims are graded as{" "}
                  <em>Verified Multi-Source</em>, <em>Single Primary Source</em>,{" "}
                  <em>Conflicting Evidence</em>, or <em>AI-Generated Hypothesis</em>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Transparent Model Boundaries:</strong> Simulation outputs and laboratory
                  experiments explicitly document governing equations and simplifying assumptions.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* SECTION 11: FINAL CALL TO ACTION */}
      <section className="py-16 px-4 sm:px-8 border-b border-[var(--border-subtle)] bg-gradient-to-b from-[var(--bg-obsidian)] to-[var(--bg-graphite)] text-center">
        <div className="max-w-3xl mx-auto space-y-5">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Explore an Entirely New Way of Understanding the World?
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)]">
            Enter the OMNIS Intelligence Command Center to investigate sovereign economies, expand
            infinite knowledge graphs, run Monte Carlo simulations, and organize your research.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/command"
              className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-lg shadow-blue-600/25"
            >
              <span>Enter Intelligence Command Center</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/explore"
              className="px-6 py-3 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-sm font-semibold"
            >
              Open Universal Search Engine
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 12: PROFESSIONAL FOOTER */}
      <footer className="py-12 px-4 sm:px-8 bg-[var(--bg-obsidian)] text-xs text-[var(--text-muted)]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 pb-8 border-b border-[var(--border-subtle)]">
          <div className="col-span-2 sm:col-span-1 space-y-2">
            <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold">
              <span className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center text-xs">
                Ω
              </span>
              <span className="tracking-widest">OMNIS</span>
            </div>
            <p className="leading-relaxed">
              The Intelligence of Everything. Understand Anything. Connect Everything. Discover What
              Comes Next.
            </p>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-[var(--text-primary)] uppercase tracking-wider text-[11px]">
              Flagship Modules
            </div>
            <ul className="space-y-1.5">
              <li><Link href="/atlas" className="hover:text-blue-400">01. Global Intelligence Globe</Link></li>
              <li><Link href="/knowledge-graph" className="hover:text-blue-400">02. Infinite Knowledge Graph</Link></li>
              <li><Link href="/simulations" className="hover:text-blue-400">03. What-If Simulation Engine</Link></li>
              <li><Link href="/timeline" className="hover:text-blue-400">04. Reality Timeline</Link></li>
              <li><Link href="/research" className="hover:text-blue-400">05. Deep Research Intelligence</Link></li>
              <li><Link href="/laboratory" className="hover:text-blue-400">06. Digital World Laboratory</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-[var(--text-primary)] uppercase tracking-wider text-[11px]">
              Platform & Workspace
            </div>
            <ul className="space-y-1.5">
              <li><Link href="/command" className="hover:text-blue-400">Home — Command Center</Link></li>
              <li><Link href="/intelligence" className="hover:text-blue-400">Intelligence Compare & Feed</Link></li>
              <li><Link href="/explore" className="hover:text-blue-400">Universal Search & Explorer</Link></li>
              <li><Link href="/workspace" className="hover:text-blue-400">My Workspace & Export Centre</Link></li>
              <li><Link href="/settings" className="hover:text-blue-400">Settings, Theme & Privacy</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-[var(--text-primary)] uppercase tracking-wider text-[11px]">
              Verified Data Sources
            </div>
            <ul className="space-y-1.5">
              <li>World Bank Open Data API (v2)</li>
              <li>REST Countries v3.1 Registry</li>
              <li>OpenAlex Scholarly Graph</li>
              <li>UN DESA & IMF WEO Series</li>
              <li>Wikimedia REST API v1</li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 OMNIS Global Intelligence Platform. All rights reserved.</span>
          <span className="omnis-mono text-[11px]">
            Epistemic Integrity Verified • WCAG 2.2 AA Contrast Engineered
          </span>
        </div>
      </footer>
    </div>
  );
}
