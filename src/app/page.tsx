"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
  BarChart3,
  Cpu,
  Pause,
  Play,
} from "lucide-react";
import { COUNTRIES_DATA } from "@/lib/data/global-intelligence";
import { InteractiveGlobe3D } from "@/components/globe/InteractiveGlobe3D";
import { ProvenancePanel } from "@/components/ui/ProvenancePanel";
import { OmnisWordmark } from "@/components/brand/OmnisLogo";
import { OmnisStatTile } from "@/components/ui/OmnisPrimitives";
import { ElasticMagneticText } from "@/components/typography/ElasticMagneticText";
import { ClipMaskHeading } from "@/components/typography/ClipMaskHeading";
import { ScrollFocusNarrative } from "@/components/typography/ScrollFocusNarrative";
import { IntelligenceSpecimenTicker } from "@/components/typography/IntelligenceSpecimenTicker";
import { InteractiveQueryComposer } from "@/components/typography/InteractiveQueryComposer";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import type { IntelligenceLayerId } from "@/types/omnis";

const FLAGSHIP_MODULES = [
  {
    number: "MODULE 01",
    title: "Global Intelligence Globe",
    href: "/atlas",
    icon: Globe2,
    tone: "badge-tone-blue",
    accentText: "tone-blue",
    description:
      "Interactive 3D Earth with Natural Earth 110m vector projection, Fresnel atmospheric scatter, day/night city illumination, and 7 toggleable overlays.",
    metrics: "200+ Sovereign Profiles • World Bank & REST Countries",
  },
  {
    number: "MODULE 02",
    title: "Infinite Knowledge Graph",
    href: "/knowledge-graph",
    icon: Network,
    tone: "badge-tone-violet",
    accentText: "tone-violet",
    description:
      "Multi-layout semantic network engine (Force, Radial, Hierarchical, Circular, Tree, Clustered) with 11 typed causal relationships and hypothesis separation.",
    metrics: "6 Layout Modes • Neighborhood Focus • SVG/JSON Export",
  },
  {
    number: "MODULE 03",
    title: "What-If Simulation Engine",
    href: "/simulations",
    icon: Sliders,
    tone: "badge-tone-blue",
    accentText: "tone-blue",
    description:
      "Quantitative scenario laboratory across Economics, Demographics, Energy, Technology, and Environment powered by 500-path Monte Carlo & ODE models.",
    metrics: "P10/P50/P90 Uncertainty Bands • Tornado Sensitivity",
  },
  {
    number: "MODULE 04",
    title: "Reality Timeline",
    href: "/timeline",
    icon: Clock,
    tone: "badge-tone-warning",
    accentText: "tone-warning",
    description:
      "Chronological and cross-regional exploration from 2600 BCE Bronze Age urbanism to India's 1991 liberalisation and modern Transformer breakthroughs.",
    metrics: "Horizontal & Vertical Views • Knowledge Graph Bridges",
  },
  {
    number: "MODULE 05",
    title: "Deep Research Intelligence",
    href: "/research",
    icon: FileSearch,
    tone: "badge-tone-verified",
    accentText: "tone-verified",
    description:
      "Multi-step research orchestrator across 6 modes retrieving peer-reviewed OpenAlex works, World Bank series, and Wikimedia references with claim verification.",
    metrics: "6 Research Modes • Contradictory Evidence & Grading",
  },
  {
    number: "MODULE 06",
    title: "Digital World Laboratory",
    href: "/laboratory",
    icon: FlaskConical,
    tone: "badge-tone-violet",
    accentText: "tone-violet",
    description:
      "High-DPI interactive mathematical and physical simulators across Physics, Space, Chemistry, Biology, Climate, and Engineering with governing equations.",
    metrics: "6 Scientific Disciplines • Interactive Real-Time Solvers",
  },
];

const ARCHITECTURAL_NARRATIVE =
  "Conventional search engines return fragmented links; generic chatbots return unverified prose. OMNIS transforms inquiry into source-traceable intelligence—uniting a 3D Natural Earth Atlas, Infinite Knowledge Graphs, Monte Carlo Scenario Simulations, Deep Research, and a Digital Scientific Laboratory with rigorous provenance.";

const DISCIPLINES = [
  {
    icon: Cpu,
    title: "1. Artificial Intelligence",
    badge: "Epistemic Routing",
    desc: "Context-aware natural language understanding, query decomposition, and strict separation between verified facts and AI hypotheses.",
  },
  {
    icon: Globe2,
    title: "2. Global Information & Research",
    badge: "Live Providers",
    desc: "Direct integration with World Bank Open Data, OpenAlex scholarly works, Crossref, REST Countries, and Wikimedia REST archives.",
  },
  {
    icon: Network,
    title: "3. Knowledge Representation",
    badge: "11 Edge Classes",
    desc: "Typed semantic networks with directional causal semantics (CAUSES, DEPENDS_ON, REGULATES, COMPETES_WITH) and progressive expansion.",
  },
  {
    icon: BarChart3,
    title: "4. Interactive Data Visualisation",
    badge: "High-DPI Graphics",
    desc: "3D WebGL planetary globes, multi-layout semantic graphs, Monte Carlo uncertainty fans, and comparative radar matrices.",
  },
  {
    icon: Sliders,
    title: "5. Scientific & Economic Simulations",
    badge: "ODE + Monte Carlo",
    desc: "Solow-Swan macroeconomic models, cohort-component demography, grid decarbonisation, and 2-box carbon cycle differential equations.",
  },
  {
    icon: Clock,
    title: "6. Historical & Geographical Intelligence",
    badge: "2600 BCE – 2026 CE",
    desc: "Cross-era chronological timelines connected directly to sovereign profiles and conceptual knowledge graphs.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { motionPaused, toggleMotionPaused } = useOmnisStore();
  const [heroQuery, setHeroQuery] = useState("");
  const [selectedIso3, setSelectedIso3] = useState("IND");
  const [activeLayer, setActiveLayer] = useState<IntelligenceLayerId>("economics");
  const [simOilShock, setSimOilShock] = useState(30);

  const countriesList = Object.values(COUNTRIES_DATA);
  const activeCountry = COUNTRIES_DATA[selectedIso3] ?? COUNTRIES_DATA.IND;

  const submitHeroExplore = (rawQuery: string) => {
    const q = rawQuery.trim() || "Explain India's economic development since 1991";
    setHeroQuery(q);
    router.push(`/explore?q=${encodeURIComponent(q)}`);
  };

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    submitHeroExplore(heroQuery);
  };

  // Compute responsive SVG curve paths for the live interactive Oil Shock Simulation demo
  const oilShockPreviewSvg = useMemo(() => {
    const years = [2025, 2028, 2031, 2034, 2037, 2040];
    const shockFactor = simOilShock * 0.0012;
    const uncertaintySpread = 0.084 + Math.abs(simOilShock) * 0.0011;

    const baseline = years.map((_, i) => 100 * Math.pow(1.032, i * 3));
    const shocked = years.map((_, i) => {
      const decay = 1 - Math.exp(-0.28 * (i + 1));
      return baseline[i] * (1 - shockFactor * decay);
    });
    const upper = shocked.map((v, i) => v * (1 + uncertaintySpread * (i / 5)));
    const lower = shocked.map((v, i) => v * (1 - uncertaintySpread * (i / 5)));

    const w = 360;
    const h = 104;
    const padX = 16;
    const padY = 12;
    const allVals = [...baseline, ...upper, ...lower];
    const minV = Math.min(...allVals) * 0.96;
    const maxV = Math.max(...allVals) * 1.03;

    const xOf = (idx: number) => padX + (idx / (years.length - 1)) * (w - padX * 2);
    const yOf = (val: number) => h - padY - ((val - minV) / Math.max(1e-6, maxV - minV)) * (h - padY * 2);

    const toLine = (arr: number[]) =>
      arr.map((v, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(" ");

    const areaPoints = [
      ...upper.map((v, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`),
      ...lower
        .slice()
        .reverse()
        .map((v, idx) => `L${xOf(years.length - 1 - idx).toFixed(1)},${yOf(v).toFixed(1)}`),
      "Z",
    ].join(" ");

    return {
      w,
      h,
      baselinePath: toLine(baseline),
      shockedPath: toLine(shocked),
      bandPath: areaPoints,
      endBaseline: baseline[baseline.length - 1],
      endShocked: shocked[shocked.length - 1],
      bandPct: ((uncertaintySpread * 100)).toFixed(1),
    };
  }, [simOilShock]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* SECTION 1 & 2: ARCHITECTURAL HERO + LIVE 3D PLANETARY STAGE */}
      <section className="relative py-12 lg:py-20 px-4 sm:px-8 border-b border-[var(--border-subtle)] omnis-grid-bg overflow-hidden">
        {/* Subtle studio radial ambient lighting (restrained, non-generic) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 right-0 w-[680px] h-[680px] rounded-full opacity-35 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(37, 99, 235, 0.22) 0%, rgba(124, 58, 237, 0.08) 45%, transparent 72%)",
          }}
        />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full badge-tone-blue text-[11px] font-semibold uppercase tracking-wider omnis-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>OMNIS Global Intelligence Platform • v2.0</span>
            </div>

            <div className="space-y-3.5">
              <ElasticMagneticText
                as="h1"
                className="omnis-display text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight leading-[1.06] text-[var(--text-primary)]"
                segments={[
                  { text: "Understand Anything." },
                  { text: "Connect Everything.", editorial: true, fluidInk: true },
                ]}
              />
              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl">
                OMNIS transforms static walls of text into interactive, source-traceable global
                intelligence—unifying a 3D Natural Earth Atlas, Infinite Knowledge Graphs, Monte
                Carlo Scenario Simulations, Deep Research, and a Digital Scientific Laboratory.
              </p>
            </div>

            {/* Universal Natural Language Search Bar */}
            <div className="space-y-3">
              <form
                onSubmit={handleHeroSearch}
                className="omnis-card p-1.5 sm:p-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border-[var(--border-strong)]"
              >
                <div className="flex-1 flex items-center gap-2.5 px-3 py-2">
                  <Search className="w-4 h-4 tone-blue shrink-0" />
                  <input
                    type="text"
                    value={heroQuery}
                    onChange={(e) => setHeroQuery(e.target.value)}
                    placeholder="Ask anything: e.g., 'Explain India's economic development since 1991'"
                    className="w-full bg-transparent text-sm focus:outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[var(--accent-blue-solid)] hover:brightness-110 text-white text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>Investigate</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              <InteractiveQueryComposer
                onSubmitQuery={submitHeroExplore}
                onSyncDraftQuery={setHeroQuery}
              />
            </div>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/command"
                className="px-5 py-3 rounded-xl bg-[var(--accent-blue-solid)] hover:brightness-110 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 shadow-md transition-all"
              >
                <span>Launch Intelligence Command Center</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/atlas"
                className="px-5 py-3 rounded-xl bg-[var(--bg-slate)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-xs sm:text-sm font-semibold text-[var(--text-primary)] inline-flex items-center gap-2 transition-all"
              >
                <Globe2 className="w-4 h-4 tone-blue" />
                <span>Explore 3D Global Atlas</span>
              </Link>
            </div>

            {/* Epistemic Provenance Strip */}
            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-[var(--border-subtle)] text-xs">
              <div>
                <div className="font-bold text-base omnis-mono tone-blue">6 Modules</div>
                <div className="text-[var(--text-secondary)]">Unified Intelligence Core</div>
              </div>
              <div>
                <div className="font-bold text-base omnis-mono tone-verified">100% Cited</div>
                <div className="text-[var(--text-secondary)]">World Bank, OpenAlex & UN</div>
              </div>
              <div>
                <div className="font-bold text-base omnis-mono tone-violet">500-Path MC</div>
                <div className="text-[var(--text-secondary)]">Stochastic Scenario Engine</div>
              </div>
            </div>
          </motion.div>

          {/* SECTION 2: LIVE 3D PLANETARY STAGE */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5 omnis-mono">
                <Layers className="w-3.5 h-3.5 tone-blue" />
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
                    className={`px-2.5 py-1 rounded-lg text-[11px] capitalize font-semibold transition-all cursor-pointer ${
                      activeLayer === layer
                        ? "bg-[var(--accent-blue-solid)] text-white shadow-2xs"
                        : "bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
              heightClass="h-[440px]"
            />
          </motion.div>
        </div>
      </section>

      {/* SECTION 3: PRODUCT INTRODUCTION — SIX DISCIPLINES UNIFIED */}
      <section className="py-16 px-4 sm:px-8 border-b border-[var(--border-subtle)] bg-[var(--bg-graphite)]">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="max-w-3xl space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest tone-blue omnis-mono">
              01 / Architectural Vision
            </div>
            <ClipMaskHeading className="omnis-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              Six Major Disciplines Integrated Into{" "}
              <span className="omnis-editorial font-normal text-[1.12em]">
                One Cohesive System
              </span>
            </ClipMaskHeading>
            <ScrollFocusNarrative text={ARCHITECTURAL_NARRATIVE} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DISCIPLINES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="omnis-card p-5 space-y-2.5 hover:border-[var(--border-strong)] transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="p-2 rounded-lg badge-tone-blue">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-[var(--text-muted)] omnis-mono">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">{item.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>

          <IntelligenceSpecimenTicker />
        </div>
      </section>

      {/* SECTION 4: THE SIX FLAGSHIP INTELLIGENCE MODULES */}
      <section className="py-16 px-4 sm:px-8 border-b border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest tone-blue omnis-mono">
                02 / Flagship Modules
              </div>
              <ClipMaskHeading className="omnis-display text-2xl sm:text-3xl font-bold mt-1 text-[var(--text-primary)]">
                Explore the Six Flagship{" "}
                <span className="omnis-editorial font-normal text-[1.12em]">
                  Intelligence Environments
                </span>
              </ClipMaskHeading>
            </div>
            <Link
              href="/command"
              className="text-xs font-semibold tone-blue hover:underline inline-flex items-center gap-1"
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
                  className="omnis-card omnis-card-interactive p-6 flex flex-col justify-between gap-5 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-bold tracking-widest omnis-mono ${mod.accentText}`}>
                        {mod.number}
                      </span>
                      <div className={`p-2 rounded-xl transition-transform group-hover:scale-105 ${mod.tone}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {mod.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)] omnis-mono">
                    <span className="truncate pr-2">{mod.metrics}</span>
                    <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${mod.accentText} group-hover:translate-x-1 transition-transform`} />
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
            <div className="text-xs font-bold uppercase tracking-widest tone-blue omnis-mono">
              03 / Live Interactive Demonstrations
            </div>
            <ClipMaskHeading className="omnis-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              Country Intelligence, Knowledge Graph, Research &{" "}
              <span className="omnis-editorial font-normal text-[1.12em]">
                Scenario Simulation
              </span>{" "}
              Preview
            </ClipMaskHeading>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Country Intelligence Live Preview */}
            <div className="lg:col-span-7 omnis-card p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10.5px] uppercase tracking-widest tone-blue font-bold omnis-mono">
                    Interactive Country Intelligence Experience
                  </span>
                  <h3 className="text-xl font-bold mt-0.5 text-[var(--text-primary)]">
                    {activeCountry.flagEmoji} {activeCountry.officialName} ({activeCountry.iso3})
                  </h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["IND", "USA", "CHN", "DEU", "JPN"].map((iso) => (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSelectedIso3(iso)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold omnis-mono transition-colors cursor-pointer ${
                        selectedIso3 === iso
                          ? "bg-[var(--accent-blue-solid)] text-white shadow-2xs"
                          : "bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {iso}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <OmnisStatTile
                  label="Nominal GDP"
                  value={`$${activeCountry.gdpUsdBn.toLocaleString()}B`}
                  subValue={`+${activeCountry.gdpGrowthPct}% real/yr`}
                  tone="blue"
                />
                <OmnisStatTile
                  label="GDP / Capita"
                  value={`$${activeCountry.gdpPerCapitaUsd.toLocaleString()}`}
                  subValue={`CPI: ${activeCountry.inflationPct}%`}
                  tone="default"
                />
                <OmnisStatTile
                  label="Clean Grid"
                  value={`${activeCountry.energyProfile.renewableSharePct}%`}
                  subValue={`Nuclear: ${activeCountry.energyProfile.nuclearSharePct}%`}
                  tone="verified"
                />
                <OmnisStatTile
                  label="Population"
                  value={`${(activeCountry.population / 1e6).toFixed(1)}M`}
                  subValue={`Life Exp: ${activeCountry.lifeExpectancyYears}y`}
                  tone="default"
                />
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                <strong className="text-[var(--text-primary)]">
                  Technology & Digital Infrastructure:
                </strong>{" "}
                {activeCountry.technologyProfile.digitalInfrastructureSummary}
              </p>

              <ProvenancePanel provenance={activeCountry.provenance} compact />

              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  href={`/atlas?country=${activeCountry.iso3}`}
                  className="px-4 py-2 rounded-xl bg-[var(--accent-blue-solid)] hover:brightness-110 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all"
                >
                  Open Full {activeCountry.name} Intelligence Dossier{" "}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href={`/intelligence?left=${activeCountry.iso3}&right=${
                    activeCountry.iso3 === "IND" ? "CHN" : "IND"
                  }`}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-slate)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-xs font-semibold text-[var(--text-primary)] transition-all"
                >
                  Compare {activeCountry.name} vs {activeCountry.iso3 === "IND" ? "China" : "India"}
                </Link>
              </div>
            </div>

            {/* Interactive What-If Simulation & Knowledge Graph Demo */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="omnis-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] uppercase tracking-widest tone-violet font-bold omnis-mono">
                    Interactive What-If Simulation Demo
                  </span>
                  <span className="text-[11px] omnis-mono text-[var(--text-muted)]">
                    Solow-Swan MDSE-v2.4
                  </span>
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Crude Oil Price Shock Impact on 2040 Real GDP Index
                </h3>

                {/* Live Interactive SVG Trajectory Fan */}
                <div className="rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] p-2.5">
                  <svg
                    viewBox={`0 0 ${oilShockPreviewSvg.w} ${oilShockPreviewSvg.h}`}
                    className="w-full h-24 overflow-visible"
                    aria-label="Interactive Oil Shock Projection Fan"
                  >
                    <path d={oilShockPreviewSvg.bandPath} fill="var(--chart-violet)" fillOpacity="0.16" />
                    <path
                      d={oilShockPreviewSvg.baselinePath}
                      fill="none"
                      stroke="var(--text-muted)"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    <path
                      d={oilShockPreviewSvg.shockedPath}
                      fill="none"
                      stroke="var(--chart-blue)"
                      strokeWidth="2.5"
                    />
                    <text x="16" y="12" fill="var(--text-muted)" fontSize="9" className="omnis-mono">
                      2025 BASE (100)
                    </text>
                    <text
                      x={oilShockPreviewSvg.w - 16}
                      y="12"
                      textAnchor="end"
                      fill="var(--chart-blue)"
                      fontSize="9"
                      fontWeight="700"
                      className="omnis-mono"
                    >
                      2040 P50: {oilShockPreviewSvg.endShocked.toFixed(1)}
                    </text>
                  </svg>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Oil Price Impulse:</span>
                    <span className="font-bold omnis-mono tone-blue">
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
                    aria-label="Oil Price Impulse Percentage"
                    className="w-full accent-[var(--accent-blue)] cursor-pointer"
                  />
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="omnis-surface-slate p-2.5">
                      <div className="text-[10px] text-[var(--text-muted)]">Baseline 2040</div>
                      <div className="text-sm font-bold omnis-mono text-[var(--text-primary)]">
                        {oilShockPreviewSvg.endBaseline.toFixed(1)}
                      </div>
                    </div>
                    <div className="omnis-surface-slate p-2.5">
                      <div className="text-[10px] text-[var(--text-muted)]">Modified P50</div>
                      <div className="text-sm font-bold omnis-mono tone-blue">
                        {oilShockPreviewSvg.endShocked.toFixed(1)}
                      </div>
                    </div>
                    <div className="omnis-surface-slate p-2.5">
                      <div className="text-[10px] text-[var(--text-muted)]">P10–P90 Band</div>
                      <div className="text-sm font-bold omnis-mono tone-violet">
                        ±{oilShockPreviewSvg.bandPct}%
                      </div>
                    </div>
                  </div>
                </div>
                <Link
                  href="/simulations"
                  className="text-xs font-semibold tone-blue hover:underline inline-flex items-center gap-1"
                >
                  Open Full 5-Domain Simulation Workspace <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="omnis-card p-6 space-y-3">
                <span className="text-[10.5px] uppercase tracking-widest tone-verified font-bold omnis-mono">
                  Deep Research & Infinite Graph Integration
                </span>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
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
                    className="px-3.5 py-2 rounded-xl badge-tone-verified hover:brightness-105 text-xs font-semibold transition-all"
                  >
                    Launch Deep Research
                  </Link>
                  <Link
                    href="/knowledge-graph"
                    className="px-3.5 py-2 rounded-xl badge-tone-blue hover:brightness-105 text-xs font-semibold transition-all"
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
            <div className="flex items-center gap-2 tone-blue text-xs font-bold uppercase tracking-wider omnis-mono">
              <Terminal className="w-4 h-4" />
              <span>04 / Technology & Polyglot Architecture</span>
            </div>
            <ClipMaskHeading as="h3" className="text-xl font-bold text-[var(--text-primary)]">
              Engineered for Precision, Speed & Reproducibility
            </ClipMaskHeading>
            <ul className="space-y-3 text-xs text-[var(--text-secondary)]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 tone-verified shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[var(--text-primary)]">
                    TypeScript + Next.js + Three.js + D3:
                  </strong>{" "}
                  Strict typing, GPU-disposed 3D Natural Earth rendering, and 6-layout semantic
                  graphs.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 tone-verified shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[var(--text-primary)]">
                    Python FastAPI + SQLAlchemy 2.0 + NumPy:
                  </strong>{" "}
                  Relational schema across 28 tables, Alembic migrations, and deterministic Monte
                  Carlo simulation routines.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 tone-verified shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[var(--text-primary)]">AI Security Guardrails:</strong>{" "}
                  Prompt-injection sanitization, untrusted retrieval quarantine, and sliding-window
                  API rate limiting.
                </span>
              </li>
            </ul>
          </div>

          <div className="omnis-card p-6 space-y-4">
            <div className="flex items-center gap-2 tone-verified text-xs font-bold uppercase tracking-wider omnis-mono">
              <ShieldCheck className="w-4 h-4" />
              <span>05 / Trust, Provenance & Epistemic Integrity</span>
            </div>
            <ClipMaskHeading as="h3" className="text-xl font-bold text-[var(--text-primary)]">
              Non-Negotiable Separation of Verified Data and Hypotheses
            </ClipMaskHeading>
            <ul className="space-y-3 text-xs text-[var(--text-secondary)]">
              <li className="flex items-start gap-2.5">
                <Database className="w-4 h-4 tone-blue shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[var(--text-primary)]">Identifiable Provenance:</strong>{" "}
                  Every country indicator and chart displays its publisher, retrieval timestamp,
                  units, coverage, and methodology.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <BookOpen className="w-4 h-4 tone-violet shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[var(--text-primary)]">Zero Fabricated Citations:</strong>{" "}
                  Claims are graded as <em>Verified Multi-Source</em>,{" "}
                  <em>Single Primary Source</em>, <em>Conflicting Evidence</em>, or{" "}
                  <em>AI-Generated Hypothesis</em>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 tone-verified shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[var(--text-primary)]">
                    Transparent Model Boundaries:
                  </strong>{" "}
                  Simulation outputs and laboratory experiments explicitly document governing
                  equations and simplifying assumptions.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* SECTION 11: FINAL CALL TO ACTION */}
      <section className="py-16 px-4 sm:px-8 border-b border-[var(--border-subtle)] bg-gradient-to-b from-[var(--bg-obsidian)] to-[var(--bg-graphite)] text-center">
        <div className="max-w-3xl mx-auto space-y-5">
          <ClipMaskHeading className="omnis-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Ready to Explore an Entirely New Way of{" "}
            <span className="omnis-editorial font-normal text-[1.12em]">
              Understanding the World?
            </span>
          </ClipMaskHeading>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            Enter the OMNIS Intelligence Command Center to investigate sovereign economies, expand
            infinite knowledge graphs, run Monte Carlo simulations, and organize your research.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/command"
              className="px-6 py-3 rounded-xl bg-[var(--accent-blue-solid)] hover:brightness-110 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-md transition-all"
            >
              <span>Enter Intelligence Command Center</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/explore"
              className="px-6 py-3 rounded-xl bg-[var(--bg-slate)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-sm font-semibold text-[var(--text-primary)] transition-all"
            >
              Open Universal Search Engine
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 12: PROFESSIONAL FOOTER */}
      <footer className="py-12 px-4 sm:px-8 bg-[var(--bg-obsidian)] text-xs text-[var(--text-secondary)]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 pb-8 border-b border-[var(--border-subtle)]">
          <div className="col-span-2 sm:col-span-1 space-y-3">
            <OmnisWordmark compact />
            <p className="leading-relaxed text-[var(--text-muted)]">
              The Intelligence of Everything. Understand Anything. Connect Everything. Discover What
              Comes Next.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="font-bold text-[var(--text-primary)] uppercase tracking-wider text-[11px] omnis-mono">
              Flagship Modules
            </div>
            <ul className="space-y-1.5">
              <li><Link href="/atlas" className="hover:text-[var(--accent-blue)] transition-colors">01. Global Intelligence Globe</Link></li>
              <li><Link href="/knowledge-graph" className="hover:text-[var(--accent-blue)] transition-colors">02. Infinite Knowledge Graph</Link></li>
              <li><Link href="/simulations" className="hover:text-[var(--accent-blue)] transition-colors">03. What-If Simulation Engine</Link></li>
              <li><Link href="/timeline" className="hover:text-[var(--accent-blue)] transition-colors">04. Reality Timeline</Link></li>
              <li><Link href="/research" className="hover:text-[var(--accent-blue)] transition-colors">05. Deep Research Intelligence</Link></li>
              <li><Link href="/laboratory" className="hover:text-[var(--accent-blue)] transition-colors">06. Digital World Laboratory</Link></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <div className="font-bold text-[var(--text-primary)] uppercase tracking-wider text-[11px] omnis-mono">
              Platform & Workspace
            </div>
            <ul className="space-y-1.5">
              <li><Link href="/command" className="hover:text-[var(--accent-blue)] transition-colors">Home — Command Center</Link></li>
              <li><Link href="/intelligence" className="hover:text-[var(--accent-blue)] transition-colors">Intelligence Compare & Feed</Link></li>
              <li><Link href="/explore" className="hover:text-[var(--accent-blue)] transition-colors">Universal Search & Explorer</Link></li>
              <li><Link href="/workspace" className="hover:text-[var(--accent-blue)] transition-colors">My Workspace & Export Centre</Link></li>
              <li><Link href="/settings" className="hover:text-[var(--accent-blue)] transition-colors">Settings, Theme & Privacy</Link></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <div className="font-bold text-[var(--text-primary)] uppercase tracking-wider text-[11px] omnis-mono">
              Verified Data Sources
            </div>
            <ul className="space-y-1.5 text-[var(--text-muted)]">
              <li>World Bank Open Data API (v2)</li>
              <li>REST Countries v3.1 Registry</li>
              <li>OpenAlex Scholarly Graph</li>
              <li>UN DESA & IMF WEO Series</li>
              <li>Wikimedia REST API v1</li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[var(--text-muted)]">
          <span>© 2026 OMNIS Global Intelligence Platform. All rights reserved.</span>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggleMotionPaused}
              aria-pressed={motionPaused}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-slate)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors cursor-pointer omnis-mono"
            >
              {motionPaused ? (
                <Play className="w-3 h-3 tone-blue" />
              ) : (
                <Pause className="w-3 h-3 tone-blue" />
              )}
              <span>{motionPaused ? "Resume motion" : "Pause motion"}</span>
            </button>
            <span className="omnis-mono text-[11px]">
              Epistemic Integrity Verified • Dual-Theme Contrast Engineered
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
