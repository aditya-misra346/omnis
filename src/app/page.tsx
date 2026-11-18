"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
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
  BookOpen,
  BarChart3,
  Cpu,
  Pause,
  Play,
  ChevronDown,
} from "lucide-react";
import { COUNTRIES_DATA } from "@/lib/data/global-intelligence";
import { buildPlaceholderCountryProfile } from "@/lib/data/world-catalog";
import {
  formatCountryMetricOrNa,
  formatIndexContext,
  formatPopulationHuman,
  formatSignedPct,
  formatSignedValue,
  formatUsdBnCompact,
  getEffectiveGdpUsdBn,
  getEffectiveGdpYear,
} from "@/lib/formatters";
import { InteractiveGlobe3D } from "@/components/globe/InteractiveGlobe3D";
import { CountrySolarClockBadge } from "@/components/solar/SolarBadges";
import { ProvenancePanel } from "@/components/ui/ProvenancePanel";
import { OmnisParameterSlider } from "@/components/ui/OmnisParameterSlider";
import { OmnisWordmark } from "@/components/brand/OmnisLogo";
import { OmnisStatTile, OmnisSegmentedControl } from "@/components/ui/OmnisPrimitives";
import { ElasticMagneticText } from "@/components/typography/ElasticMagneticText";
import { ClipMaskHeading } from "@/components/typography/ClipMaskHeading";
import { ScrollFocusNarrative } from "@/components/typography/ScrollFocusNarrative";
import { IntelligenceSpecimenTicker } from "@/components/typography/IntelligenceSpecimenTicker";
import { InteractiveQueryComposer } from "@/components/typography/InteractiveQueryComposer";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import type { CountryIntelligenceProfile, IntelligenceLayerId } from "@/types/omnis";

const FLAGSHIP_MODULES = [
  {
    number: "Atlas",
    title: "World Earth Globe",
    href: "/atlas",
    icon: Globe2,
    tone: "badge-tone-blue",
    accentText: "tone-blue",
    description:
      "Spin an interactive 3D Earth with accurate country borders, live day-and-night sunlight, and instant country profiles across 7 topics.",
    metrics: "Built-in Profiles + Live World Bank & UN Data",
  },
  {
    number: "Topic Map",
    title: "Connected Topic Map",
    href: "/knowledge-graph",
    icon: Network,
    tone: "badge-tone-violet",
    accentText: "tone-violet",
    description:
      "See how ideas, technologies, and policies influence each other across 6 visual layouts—with unconfirmed scenarios kept separate from facts.",
    metrics: "6 Views • Connection Tracer • SVG & JSON Export",
  },
  {
    number: "What-If Lab",
    title: "Scenario Projections",
    href: "/simulations",
    icon: Sliders,
    tone: "badge-tone-blue",
    accentText: "tone-blue",
    description:
      "Adjust oil prices, interest rates, clean energy growth, or carbon targets to see how outcomes shift with realistic uncertainty bands.",
    metrics: "500 Simulated Runs • Sensitivity Driver Ranking",
  },
  {
    number: "History",
    title: "World Timeline",
    href: "/timeline",
    icon: Clock,
    tone: "badge-tone-warning",
    accentText: "tone-warning",
    description:
      "Follow major turning points from Bronze Age cities (3000 BCE) to modern AI and jump straight into each event's wider cause-and-effect map.",
    metrics: "Horizontal & List Views • Interactive Era Scrubber",
  },
  {
    number: "AddyIntelligence",
    title: "AddyIntelligence",
    href: "/research",
    icon: FileSearch,
    tone: "badge-tone-verified",
    accentText: "tone-verified",
    description:
      "Ask AddyIntelligence a question in plain English to read clear answers backed by real World Bank series and OpenAlex academic papers—no made-up citations.",
    metrics: "6 Research Styles • Source Checks & Limits",
  },
  {
    number: "Science Lab",
    title: "Interactive Science Labs",
    href: "/laboratory",
    icon: FlaskConical,
    tone: "badge-tone-violet",
    accentText: "tone-violet",
    description:
      "Experiment directly with pendulums, planetary orbits, molecules, ecosystem cycles, Earth's climate balance, and structural bridges.",
    metrics: "6 Live Experiments • Pause, Drag & PNG Export",
  },
];

const ARCHITECTURAL_NARRATIVE =
  "Search engines hand back lists of links, and standard chatbots guess without showing their math. OMNIS puts clear numbers, source-checked research, history timelines, topic maps, and interactive models together in one calm space.";

const DISCIPLINES = [
  {
    icon: Cpu,
    title: "Plain-English Answers",
    badge: "Source-Checked",
    desc: "Ask everyday questions and get direct summaries that keep measured statistics clearly separate from unconfirmed scenarios.",
  },
  {
    icon: Globe2,
    title: "Real World Data",
    badge: "Open APIs",
    desc: "Pulls official series straight from World Bank Open Data, REST Countries, OpenAlex academic papers, and Wikipedia reference archives.",
  },
  {
    icon: Network,
    title: "How Concepts Connect",
    badge: "Cause & Effect",
    desc: "Explore step-by-step topic maps showing what causes, depends on, or speeds up trends across economics, tech, and climate.",
  },
  {
    icon: BarChart3,
    title: "Clear Interactive Visuals",
    badge: "Mobile & Desktop",
    desc: "3D planetary globe, clean dual-country charts, likely forecast bands, and side-by-side comparisons designed to read effortlessly.",
  },
  {
    icon: Sliders,
    title: "What-If Forecasts",
    badge: "500 Scenarios",
    desc: "Test how economic shocks, clean power transitions, population aging, or warming unfold over 5 to 35 years.",
  },
  {
    icon: Clock,
    title: "Deep Historical Context",
    badge: "3000 BCE – Today",
    desc: "Connect historical turning points directly to modern national indicators and scientific trends.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { motionPaused, toggleMotionPaused, setFocusedSignal } = useOmnisStore();
  const [heroQuery, setHeroQuery] = useState("");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [selectedIso3, setSelectedIso3] = useState("IND");
  const [hydratedCountries, setHydratedCountries] = useState<
    Record<string, CountryIntelligenceProfile>
  >({});
  const [failedHydrateIso3, setFailedHydrateIso3] = useState<Record<string, boolean>>({});
  const [activeLayer, setActiveLayer] = useState<IntelligenceLayerId>("economics");
  const [simOilShock, setSimOilShock] = useState(30);
  const [activeGraphNodeIdx, setActiveGraphNodeIdx] = useState(0);

  useEffect(() => {
    if (hydratedCountries[selectedIso3] || failedHydrateIso3[selectedIso3]) return;
    let active = true;
    const targetIso = selectedIso3;
    const controller = new AbortController();
    fetch(`/api/v1/countries/${encodeURIComponent(targetIso)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        const resolved: CountryIntelligenceProfile | null =
          data?.country ?? (data?.iso3 ? data : null);
        if (resolved) {
          setHydratedCountries((prev) => ({ ...prev, [targetIso]: resolved }));
        } else {
          setFailedHydrateIso3((prev) => ({ ...prev, [targetIso]: true }));
        }
      })
      .catch(() => {
        if (active) {
          setFailedHydrateIso3((prev) => ({ ...prev, [targetIso]: true }));
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedIso3, hydratedCountries, failedHydrateIso3]);

  const countriesList = useMemo(
    () =>
      Object.values({
        ...COUNTRIES_DATA,
        ...hydratedCountries,
      }),
    [hydratedCountries]
  );
  const activeCountry =
    hydratedCountries[selectedIso3] ??
    COUNTRIES_DATA[selectedIso3] ??
    buildPlaceholderCountryProfile(selectedIso3) ??
    COUNTRIES_DATA.IND;
  const effectiveActiveGdp = getEffectiveGdpUsdBn(activeCountry);
  const effectiveActiveGdpYear = getEffectiveGdpYear(activeCountry);
  const isHydratingSelected =
    !COUNTRIES_DATA[selectedIso3] &&
    !hydratedCountries[selectedIso3] &&
    !failedHydrateIso3[selectedIso3];

  useEffect(() => {
    setFocusedSignal({
      iso3: activeCountry.iso3,
      topic: activeCountry.name,
      label: `${activeCountry.name} (${activeCountry.iso3})`,
    });
  }, [activeCountry.iso3, activeCountry.name, setFocusedSignal]);
  const formattedCoords = `${Math.abs(activeCountry.lat).toFixed(2)}°${
    activeCountry.lat >= 0 ? "N" : "S"
  }, ${Math.abs(activeCountry.lng).toFixed(2)}°${activeCountry.lng >= 0 ? "E" : "W"}`;

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
  // Dynamically coupled to the active sovereign nation's growth rate & fossil import exposure
  const oilShockPreviewSvg = useMemo(() => {
    const years = [2025, 2028, 2031, 2034, 2037, 2040];
    const baseAnnualRate = Math.max(-0.015, Math.min(0.075, activeCountry.gdpGrowthPct / 100));
    const fossilExposure = Math.max(0.25, (100 - activeCountry.energyProfile.renewableSharePct) / 100);
    const shockFactor = simOilShock * (0.00095 + fossilExposure * 0.00055);
    const uncertaintySpread = 0.078 + Math.abs(simOilShock) * 0.0011;

    const baseline = years.map((_, i) => 100 * Math.pow(1 + baseAnnualRate, i * 3));
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
      bandPct: (uncertaintySpread * 100).toFixed(1),
    };
  }, [simOilShock, activeCountry]);

  return (
    <div className="min-h-dvh flex flex-col">
      {/* SECTION 1 & 2: ARCHITECTURAL HERO + LIVE 3D PLANETARY STAGE */}
      <section className="relative py-12 lg:py-20 px-4 sm:px-8 border-b border-[var(--border-subtle)] omnis-grid-bg overflow-hidden">
        {/* Subtle theme-calibrated atmospheric wash */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 right-0 w-[680px] h-[680px] rounded-full opacity-90 blur-3xl"
          style={{
            background: "var(--bg-hero-radial)",
          }}
        />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full badge-tone-blue text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>World Data, History &amp; Science Atlas</span>
            </div>

            <div className="space-y-3">
              <ElasticMagneticText
                as="h1"
                className="omnis-display-hero font-extrabold text-[var(--text-primary)]"
                segments={[
                  { text: "Understand Anything." },
                  { text: "Connect Everything.", editorial: true, fluidInk: true },
                ]}
              />
              <p className="text-[17px] sm:text-[19px] text-[var(--text-secondary)] leading-[1.6] max-w-xl">
                Explore how countries grow, how technologies connect, and how global shocks play
                out—through clear charts, cited research, and interactive models built on World
                Bank and academic data.
              </p>
            </div>

            {/* Universal Natural Language Search Bar & Collapsible Query Builder */}
            <div className="space-y-2.5">
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
                    className="w-full bg-transparent text-base md:text-[15px] focus:outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
                <button
                  type="submit"
                  className="group px-5 py-2.5 rounded-xl bg-[var(--accent-blue-solid)] hover:brightness-110 text-white text-sm font-semibold tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>Investigate</span>
                  <ArrowRight className="w-3.5 h-3.5 omnis-magnetic-arrow" />
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
                <span className="text-[var(--text-muted)] text-[13px] font-medium">
                  Try asking:
                </span>
                {[
                  "Explain India's economic development since 1991",
                  "Compare India and China economically",
                  "Semiconductor geopolitics",
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => submitHeroExplore(chip)}
                    className="min-h-[44px] sm:min-h-0 px-3 sm:px-2.5 py-2 sm:py-1 rounded-full bg-[var(--bg-slate)] hover:border-[var(--border-strong)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-left"
                  >
                    {chip}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setBuilderOpen((prev) => !prev)}
                  aria-expanded={builderOpen}
                  className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1 px-3 sm:px-2.5 py-2 sm:py-1 rounded-full badge-tone-blue text-xs sm:text-[13px] font-semibold cursor-pointer hover:brightness-105 transition-all"
                >
                  <span>Build Custom Question</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 ${
                      builderOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              <AnimatePresence initial={false}>
                {builderOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <InteractiveQueryComposer
                      showPresetStrip={false}
                      onSubmitQuery={submitHeroExplore}
                      onSyncDraftQuery={setHeroQuery}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/command"
                className="group px-5 py-3 rounded-xl bg-[var(--accent-blue-solid)] hover:brightness-110 text-white text-sm sm:text-[15px] font-semibold inline-flex items-center gap-2 shadow-md transition-all"
              >
                <span>Launch Intelligence Command Center</span>
                <ArrowRight className="w-4 h-4 omnis-magnetic-arrow" />
              </Link>
              <Link
                href="/atlas"
                className="group px-5 py-3 rounded-xl bg-[var(--bg-slate)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-sm sm:text-[15px] font-semibold text-[var(--text-primary)] inline-flex items-center gap-2 transition-all"
              >
                <Globe2 className="w-4 h-4 tone-blue" />
                <span>Explore 3D Global Atlas</span>
                <span aria-hidden="true" data-diagonal="true" className="omnis-magnetic-arrow text-sm tone-blue">↗</span>
              </Link>
            </div>

            {/* Provenance Strip */}
            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-[var(--border-subtle)] text-[13px]">
              <div>
                <div className="font-bold text-[17px] sm:text-lg tone-blue">6 Tools</div>
                <div className="text-[var(--text-secondary)]">Globe, Maps &amp; Labs</div>
              </div>
              <div>
                <div className="font-bold text-[17px] sm:text-lg tone-verified">Cited Data</div>
                <div className="text-[var(--text-secondary)]">World Bank, UN &amp; OpenAlex</div>
              </div>
              <div>
                <div className="font-bold text-[17px] sm:text-lg tone-violet">Live Scenarios</div>
                <div className="text-[var(--text-secondary)]">What-If Projections</div>
              </div>
            </div>
          </div>

          {/* SECTION 2: LIVE 3D PLANETARY STAGE */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
              <span className="font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 tone-blue" />
                Live 3D World Globe Preview
              </span>
              <OmnisSegmentedControl<IntelligenceLayerId>
                groupId="hero-layer-seg"
                ariaLabel="Planetary Intelligence Layer"
                size="sm"
                value={activeLayer}
                onChange={setActiveLayer}
                options={(
                  [
                    { value: "economics", label: "Economics" },
                    { value: "demographics", label: "Demographics" },
                    { value: "energy", label: "Energy" },
                    { value: "environment", label: "Environment" },
                    { value: "technology", label: "Technology" },
                  ] as const
                ).map((item) => ({ value: item.value, label: item.label }))}
              />
            </div>

            <InteractiveGlobe3D
              countries={countriesList}
              selectedIso3={selectedIso3}
              onSelectCountry={setSelectedIso3}
              activeLayer={activeLayer}
              heightClass="h-[440px]"
              wheelZoomMode="engaged"
            />
          </div>
        </div>
      </section>

      {/* SECTION 3: PRODUCT INTRODUCTION — SIX DISCIPLINES UNIFIED */}
      <section className="py-16 px-4 sm:px-8 border-b border-[var(--border-subtle)] bg-[var(--bg-graphite)]">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-3">
              <div className="text-[13px] font-semibold tone-blue">
                Why We Built This
              </div>
              <ClipMaskHeading className="omnis-display-section font-bold text-[var(--text-primary)]">
                Global Data, Research &amp; History in{" "}
                <span className="omnis-editorial font-normal text-[1.12em]">
                  One Place
                </span>
              </ClipMaskHeading>
              <ScrollFocusNarrative text={ARCHITECTURAL_NARRATIVE} />
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 border-t border-[var(--border-subtle)]">
              {DISCIPLINES.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className={`p-5 border-b border-[var(--border-subtle)] ${
                      idx % 2 === 0 ? "sm:border-r" : ""
                    } hover:bg-[var(--bg-slate)]/40 transition-colors space-y-2.5`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="p-1.5 rounded-md badge-tone-blue">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-[var(--text-muted)]">
                        {item.badge}
                      </span>
                    </div>
                    <h3 className="font-bold text-base sm:text-[17px] text-[var(--text-primary)]">{item.title}</h3>
                    <p className="text-[15px] sm:text-base text-[var(--text-secondary)] leading-[1.6]">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <IntelligenceSpecimenTicker />
        </div>
      </section>

      {/* SECTION 4: THE SIX FLAGSHIP INTELLIGENCE MODULES */}
      <section className="py-16 px-4 sm:px-8 border-b border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="text-[13px] font-semibold tone-blue">
                Explore the Atlas &amp; Tools
              </div>
              <ClipMaskHeading className="omnis-display-section font-bold mt-1 text-[var(--text-primary)]">
                Six Interactive Ways to{" "}
                <span className="omnis-editorial font-normal text-[1.12em]">
                  Explore the World
                </span>
              </ClipMaskHeading>
            </div>
            <Link
              href="/command"
              className="group text-sm font-semibold tone-blue hover:underline inline-flex items-center gap-1"
            >
              Start from Command Hub <ArrowRight className="w-3.5 h-3.5 omnis-magnetic-arrow" />
            </Link>
          </div>

          {/* Primary Showcase Tier: Modules 01 & 02 Asymmetric Bento */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {FLAGSHIP_MODULES.slice(0, 2).map((mod, idx) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.number}
                  href={mod.href}
                  className={`${
                    idx === 0 ? "lg:col-span-7" : "lg:col-span-5"
                  } omnis-card omnis-card-interactive p-6 sm:p-7 flex flex-col justify-between gap-5 group`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold tracking-widest omnis-mono ${mod.accentText}`}>
                        {mod.number}
                      </span>
                      <div className={`p-2 rounded-lg transition-transform group-hover:scale-105 ${mod.tone}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-[15px] sm:text-base text-[var(--text-secondary)] leading-relaxed">
                      {mod.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3 text-[13px] text-[var(--text-muted)] omnis-mono">
                    <span>{mod.metrics}</span>
                    <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${mod.accentText} group-hover:translate-x-1 transition-transform`} />
                  </div>
                </Link>
              );
            })}
          </div>

            {/* Secondary Hairline Ledger: Modules 03–06 (De-carded) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-[var(--border-subtle)] divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]">
            {FLAGSHIP_MODULES.slice(2).map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.number}
                  href={mod.href}
                  className="p-5 hover:bg-[var(--bg-slate)]/45 flex flex-col justify-between gap-4 group transition-colors"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${mod.accentText}`}>
                        {mod.number}
                      </span>
                      <div className={`p-1.5 rounded-md ${mod.tone}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <h3 className="text-[17px] sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-[14.5px] sm:text-[15px] text-[var(--text-secondary)] leading-relaxed">
                      {mod.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                    <span>{mod.metrics}</span>
                    <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${mod.accentText} group-hover:translate-x-0.5 transition-transform`} />
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
            <div className="text-[13px] font-semibold tone-blue">
              Try It Live
            </div>
            <ClipMaskHeading className="omnis-display-section font-bold text-[var(--text-primary)]">
              Country Profiles, Scenarios &amp;{" "}
              <span className="omnis-editorial font-normal text-[1.12em]">
                How They Connect
              </span>{" "}
            </ClipMaskHeading>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Country Intelligence Live Preview */}
            <div className="lg:col-span-7 min-w-0 omnis-card p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[13px] tone-blue font-medium">
                    Country Profile Preview
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                      {activeCountry.flagEmoji} {activeCountry.officialName} ({activeCountry.iso3})
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs omnis-mono omnis-tabular text-[var(--text-muted)]">
                      {formattedCoords}
                    </span>
                    <CountrySolarClockBadge
                      iso3={activeCountry.iso3}
                      lat={activeCountry.lat}
                      lng={activeCountry.lng}
                      variant="pill"
                    />
                    {isHydratingSelected && (
                      <span className="px-2 py-0.5 rounded-md badge-tone-cyan text-xs animate-pulse">
                        Updating World Bank figures…
                      </span>
                    )}
                  </div>
                </div>
                <OmnisSegmentedControl<string>
                  groupId="sandbox-country-seg"
                  ariaLabel="Sandbox Country Selection"
                  size="sm"
                  value={selectedIso3}
                  onChange={setSelectedIso3}
                  options={(["IND", "USA", "CHN", "DEU", "JPN"].includes(selectedIso3)
                    ? ["IND", "USA", "CHN", "DEU", "JPN"]
                    : ["IND", "USA", "CHN", "DEU", "JPN", selectedIso3]
                  ).map((iso) => ({
                    value: iso,
                    label: <span className="omnis-mono">{iso}</span>,
                  }))}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <OmnisStatTile
                  label="Total Economy"
                  value={
                    isHydratingSelected && effectiveActiveGdp === 0
                      ? "Loading…"
                      : effectiveActiveGdp > 0
                        ? formatUsdBnCompact(effectiveActiveGdp)
                        : "N/A"
                  }
                  subValue={
                    isHydratingSelected && effectiveActiveGdp === 0
                      ? "World Bank"
                      : effectiveActiveGdp > 0
                        ? `$${effectiveActiveGdp.toLocaleString()}B${
                            effectiveActiveGdpYear ? ` (${effectiveActiveGdpYear})` : ""
                          } • ${formatSignedPct(activeCountry.gdpGrowthPct)}/yr`
                        : "Annual figures unavailable"
                  }
                  tone="blue"
                />
                <OmnisStatTile
                  label="Per Person Income"
                  value={
                    isHydratingSelected && activeCountry.gdpPerCapitaUsd === 0
                      ? "Loading…"
                      : activeCountry.gdpPerCapitaUsd > 0
                        ? `$${activeCountry.gdpPerCapitaUsd.toLocaleString()}`
                        : "N/A"
                  }
                  subValue={
                    isHydratingSelected && activeCountry.gdpPerCapitaUsd === 0
                      ? "Fetching inflation…"
                      : `Price rise: ${formatCountryMetricOrNa(activeCountry, activeCountry.inflationPct, (v) => `${v}%`)}`
                  }
                  tone="default"
                />
                <OmnisStatTile
                  label="Clean Power"
                  value={
                    isHydratingSelected && activeCountry.energyProfile.renewableSharePct === 0
                      ? "Loading…"
                      : !activeCountry.provenance.missingData || activeCountry.energyProfile.renewableSharePct > 0
                        ? `${activeCountry.energyProfile.renewableSharePct}%`
                        : "N/A"
                  }
                  subValue={
                    isHydratingSelected && activeCountry.energyProfile.renewableSharePct === 0
                      ? "Power mix"
                      : `Nuclear: ${formatCountryMetricOrNa(activeCountry, activeCountry.energyProfile.nuclearSharePct, (v) => `${v}%`)}`
                  }
                  tone="verified"
                />
                <OmnisStatTile
                  label="Population"
                  value={
                    isHydratingSelected && activeCountry.population === 0
                      ? "Loading…"
                      : formatPopulationHuman(activeCountry.population, "compact")
                  }
                  subValue={
                    isHydratingSelected && activeCountry.population === 0
                      ? "Population"
                      : `Life span: ${formatCountryMetricOrNa(activeCountry, activeCountry.lifeExpectancyYears, (v) => `${v} yrs`)}`
                  }
                  tone="default"
                />
              </div>

              <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
                <strong className="text-[var(--text-primary)]">
                  Technology & Digital Infrastructure:
                </strong>{" "}
                {activeCountry.technologyProfile.digitalInfrastructureSummary}
              </p>

              <ProvenancePanel provenance={activeCountry.provenance} compact />

              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  href={`/atlas?country=${activeCountry.iso3}`}
                  className="group px-4 py-2 rounded-xl bg-[var(--accent-blue-solid)] hover:brightness-110 text-white text-sm font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all"
                >
                  View Full {activeCountry.name} Profile{" "}
                  <ArrowRight className="w-3.5 h-3.5 omnis-magnetic-arrow" />
                </Link>
                <Link
                  href={`/intelligence?left=${activeCountry.iso3}&right=${
                    activeCountry.iso3 === "IND" ? "CHN" : "IND"
                  }`}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-slate)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-sm font-semibold text-[var(--text-primary)] transition-all"
                >
                  Compare {activeCountry.name} vs {activeCountry.iso3 === "IND" ? "China" : "India"}
                </Link>
              </div>
            </div>

            {/* Interactive What-If Scenario & Connections Preview */}
            <div className="lg:col-span-5 min-w-0 flex flex-col gap-6">
              <div className="omnis-card p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold tone-violet">
                    Try a What-If Oil Shock
                  </span>
                  <details className="text-xs text-[var(--text-muted)]">
                    <summary className="cursor-pointer hover:text-[var(--text-primary)] select-none">
                      Model info
                    </summary>
                    <div className="mt-1 text-[11.5px]">
                      {activeCountry.name} calibrated via Solow-Swan equilibrium model (MDSE-v2.4)
                    </div>
                  </details>
                </div>
                <div className="space-y-1">
                  <h3 className="text-[17px] sm:text-lg font-bold text-[var(--text-primary)]">
                    How Oil Prices Affect {activeCountry.name}&apos;s 2040 Economy
                  </h3>
                  <p className="text-[13px] text-[var(--text-secondary)]">
                    A {formatSignedPct(simOilShock)} crude oil price move leads to{" "}
                    <strong className="text-[var(--text-primary)]">
                      {formatIndexContext(oilShockPreviewSvg.endBaseline, oilShockPreviewSvg.endShocked, 2025)}
                    </strong>
                    .
                  </p>
                </div>

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
                    <text x="16" y="13" fill="var(--text-muted)" fontSize="11">
                      2025 level (100)
                    </text>
                    <text
                      x={oilShockPreviewSvg.w - 16}
                      y="13"
                      textAnchor="end"
                      fill="var(--chart-blue)"
                      fontSize="11"
                      fontWeight="700"
                    >
                      2040 scenario: {oilShockPreviewSvg.endShocked.toFixed(1)}
                    </text>
                  </svg>
                </div>

                <div className="space-y-3">
                  <OmnisParameterSlider
                    label="Oil Price Change"
                    unit="%"
                    min={-30}
                    max={80}
                    step={5}
                    baselineValue={0}
                    value={simOilShock}
                    accent="blue"
                    onChange={setSimOilShock}
                    onReset={() => setSimOilShock(0)}
                  />
                  <div className="grid grid-cols-3 gap-2 text-center border-y border-[var(--border-subtle)] py-2.5">
                    <div>
                      <div className="text-xs text-[var(--text-muted)]">Trend without shock</div>
                      <div className="text-base font-bold omnis-mono omnis-tabular text-[var(--text-primary)]">
                        {oilShockPreviewSvg.endBaseline.toFixed(1)}
                      </div>
                    </div>
                    <div className="border-x border-[var(--border-subtle)]">
                      <div className="text-xs text-[var(--text-muted)]">Projected with shock</div>
                      <div className="text-base font-bold omnis-mono omnis-tabular tone-blue">
                        {oilShockPreviewSvg.endShocked.toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[var(--text-muted)]">80% likely range</div>
                      <div className="text-base font-bold omnis-mono omnis-tabular tone-violet">
                        ±{oilShockPreviewSvg.bandPct}%
                      </div>
                    </div>
                  </div>
                </div>
                <Link
                  href={`/simulations?category=economics&oilShock=${simOilShock}&country=${activeCountry.iso3}`}
                  className="omnis-magnetic-arrow text-[13px] font-semibold tone-blue hover:underline inline-flex items-center gap-1"
                >
                  <span>Explore All 5 What-If Scenarios</span>
                  <ArrowRight className="omnis-arrow-glyph w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Card 3: How Causes Connect */}
              <div className="omnis-card p-6 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold tone-verified">
                    How Energy &amp; Economy Connect
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium tone-verified">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-verified)]" />
                    Checked Data
                  </span>
                </div>
                <h3 className="text-[17px] sm:text-lg font-bold text-[var(--text-primary)]">
                  What Happens When {activeCountry.name}&apos;s Oil Prices Move
                </h3>

                {(() => {
                  const fossilPct = Math.max(
                    0,
                    Number((100 - activeCountry.energyProfile.renewableSharePct).toFixed(1))
                  );
                  const inflationImpulse = Number((simOilShock * 0.042).toFixed(2));
                  const nodes = [
                    {
                      id: "core",
                      x: 190,
                      y: 54,
                      rectW: 132,
                      short: `${activeCountry.iso3} GDP (${formatSignedPct(activeCountry.gdpGrowthPct)})`,
                      title: `${activeCountry.officialName} Economic Output`,
                      claim: `Economy size of ${
                        effectiveActiveGdp > 0
                          ? `${formatUsdBnCompact(effectiveActiveGdp)} ($${effectiveActiveGdp.toLocaleString()}B)`
                          : "N/A"
                      }, growing ${formatSignedPct(activeCountry.gdpGrowthPct)} a year.`,
                      source: activeCountry.provenance.source,
                      tone: "var(--chart-blue)",
                    },
                    {
                      id: "fossil",
                      x: 66,
                      y: 24,
                      rectW: 114,
                      short: `Fossil (${fossilPct}%)`,
                      title: "Reliance on Fossil Fuels",
                      claim: `${fossilPct}% non-renewable power leaves import bills exposed to a ${formatSignedPct(
                        simOilShock
                      )} swing in global oil prices.`,
                      source: "IEA & World Bank Energy Data",
                      tone: "var(--chart-amber)",
                    },
                    {
                      id: "cpi",
                      x: 314,
                      y: 24,
                      rectW: 114,
                      short: `CPI (${formatSignedPct(inflationImpulse)})`,
                      title: "Higher Fuel Costs Lift Everyday Prices",
                      claim: `Simulated fuel shock shifts consumer inflation by ${formatSignedValue(
                        inflationImpulse,
                        " pp",
                        2
                      )} above ${activeCountry.inflationPct}% today.`,
                      source: "Estimated price response",
                      tone: "var(--chart-violet)",
                    },
                    {
                      id: "clean",
                      x: 190,
                      y: 102,
                      rectW: 136,
                      short: `Clean Grid (${activeCountry.energyProfile.renewableSharePct}%)`,
                      title: "Renewable Decarbonisation Buffer",
                      claim: `Generating ${activeCountry.energyProfile.renewableSharePct}% renewable electricity cushions families and factories from imported oil spikes.`,
                      source: "IRENA & World Bank Clean Power Data",
                      tone: "var(--chart-emerald)",
                    },
                  ];
                  const activeNode = nodes[activeGraphNodeIdx] ?? nodes[0];
                  return (
                    <>
                      <div className="rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] p-2">
                        <svg viewBox="0 0 380 124" className="w-full h-28" aria-label="Interactive 1-Hop Causal Graph">
                          <line x1={66} y1={24} x2={190} y2={54} stroke="var(--chart-amber)" strokeWidth="1.6" strokeOpacity={0.75} />
                          <line x1={190} y1={54} x2={314} y2={24} stroke="var(--chart-violet)" strokeWidth="1.6" strokeDasharray="3,2" />
                          <line x1={190} y1={102} x2={190} y2={54} stroke="var(--chart-emerald)" strokeWidth="1.8" />
                          {nodes.map((n, idx) => {
                            const selected = idx === activeGraphNodeIdx;
                            return (
                              <g
                                key={n.id}
                                role="button"
                                tabIndex={0}
                                aria-label={`Inspect ${n.title}: ${n.short}`}
                                aria-pressed={selected}
                                className="group cursor-pointer focus:outline-none"
                                onClick={() => setActiveGraphNodeIdx(idx)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setActiveGraphNodeIdx(idx);
                                  }
                                }}
                              >
                                <rect
                                  x={n.x - n.rectW / 2 - 3}
                                  y={n.y - 16}
                                  width={n.rectW + 6}
                                  height={32}
                                  rx={8}
                                  fill="none"
                                  stroke="var(--accent-blue)"
                                  strokeWidth={2}
                                  className="opacity-0 group-focus-visible:opacity-100 pointer-events-none transition-opacity"
                                />
                                <rect
                                  x={n.x - n.rectW / 2}
                                  y={n.y - 13}
                                  width={n.rectW}
                                  height={26}
                                  rx={6}
                                  fill={selected ? "var(--bg-graphite)" : "var(--bg-elevated)"}
                                  stroke={selected ? n.tone : "var(--border-subtle)"}
                                  strokeWidth={selected ? 2 : 1}
                                />
                                <text
                                  x={n.x}
                                  y={n.y + 4}
                                  textAnchor="middle"
                                  fontSize="11"
                                  fontWeight={selected ? "700" : "600"}
                                  fill="var(--text-primary)"
                                  className="omnis-mono"
                                >
                                  {n.short}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                      <div className="omnis-surface-slate p-3 space-y-1 text-[13px]">
                        <div className="font-bold text-[var(--text-primary)]">{activeNode.title}</div>
                        <p className="text-[13.5px] text-[var(--text-secondary)] leading-relaxed">
                          {activeNode.claim}
                        </p>
                        <div className="text-xs text-[var(--text-muted)]">
                          Source: {activeNode.source}
                        </div>
                      </div>
                    </>
                  );
                })()}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Link
                    href={`/research?q=${encodeURIComponent(
                      `Explain ${activeCountry.name}'s economic and energy trajectory`
                    )}`}
                    className="omnis-magnetic-arrow px-3.5 py-2 rounded-xl badge-tone-verified hover:brightness-105 text-[13px] font-semibold inline-flex items-center gap-1.5 transition-all"
                  >
                    <span>Ask AddyIntelligence</span>
                    <ArrowRight className="omnis-arrow-glyph w-3 h-3" />
                  </Link>
                  <Link
                    href={`/knowledge-graph?topic=${encodeURIComponent(activeCountry.name)}`}
                    className="omnis-magnetic-arrow px-3.5 py-2 rounded-xl badge-tone-blue hover:brightness-105 text-[13px] font-semibold inline-flex items-center gap-1.5 transition-all"
                  >
                    <span>Explore Topic Map</span>
                    <ArrowRight className="omnis-arrow-glyph w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 9 & 10: HOW WE VERIFY DATA (+ COLLAPSIBLE ARCHITECTURE) */}
      <section className="py-12 px-4 sm:px-8 border-b border-[var(--border-subtle)]">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 tone-verified text-[13px] font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>How We Verify Data</span>
            </div>
            <ClipMaskHeading as="h3" className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
              Measured Facts Stay Separate from Scenarios
            </ClipMaskHeading>
            <ul className="space-y-3 text-[15px] leading-relaxed text-[var(--text-secondary)]">
              <li className="flex items-start gap-2.5">
                <Database className="w-4 h-4 tone-blue shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[var(--text-primary)]">Direct Source Links:</strong>{" "}
                  Every country statistic and chart lists its publisher, update year, units, and
                  how it is measured.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <BookOpen className="w-4 h-4 tone-violet shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[var(--text-primary)]">No Made-Up Citations:</strong>{" "}
                  Claims are clearly labeled as <em>Verified Multi-Source</em>,{" "}
                  <em>Single Source</em>, <em>Conflicting Evidence</em>, or{" "}
                  <em>Unconfirmed Scenario</em>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 tone-verified shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[var(--text-primary)]">
                    Clear Model Assumptions:
                  </strong>{" "}
                  Projections and science labs list every simplifying assumption and math equation
                  inside optional disclosures.
                </span>
              </li>
            </ul>
          </div>

          <details className="pt-4 border-t border-[var(--border-subtle)] text-[14px]">
            <summary className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer select-none">
              <span>Technical architecture (under the hood)</span>
            </summary>
            <ul className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 tone-verified shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[var(--text-primary)]">Interactive WebGL &amp; SVG:</strong>{" "}
                  TypeScript, Next.js, Three.js Earth geometry, and 6-layout D3-style concept graphs.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 tone-verified shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[var(--text-primary)]">FastAPI + NumPy Models:</strong>{" "}
                  28-table Postgres schema and seeded 500-path simulation engines.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 tone-verified shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[var(--text-primary)]">Input Guardrails:</strong>{" "}
                  Sanitized external snippets, origin limits, and per-route API rate limiting.
                </span>
              </li>
            </ul>
          </details>
        </div>
      </section>

      {/* SECTION 11: FINAL CALL TO ACTION */}
      <section className="py-16 px-4 sm:px-8 border-b border-[var(--border-subtle)] bg-gradient-to-b from-[var(--bg-obsidian)] to-[var(--bg-graphite)] text-center">
        <div className="max-w-3xl mx-auto space-y-5">
          <ClipMaskHeading className="omnis-display-section font-extrabold text-[var(--text-primary)]">
            Ready to Explore an Entirely New Way of{" "}
            <span className="omnis-editorial font-normal text-[1.12em]">
              Understanding the World?
            </span>
          </ClipMaskHeading>
          <p className="text-base sm:text-[18px] text-[var(--text-secondary)] leading-relaxed">
            Open the Command Hub to explore countries, map cause and effect, test what-if forecasts, and organize your notes.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/command"
              className="omnis-magnetic-arrow px-6 py-3 rounded-xl bg-[var(--accent-blue-solid)] hover:brightness-110 text-white text-[15px] font-semibold inline-flex items-center gap-2 shadow-md transition-all"
            >
              <span>Open Command Hub</span>
              <ArrowRight className="omnis-arrow-glyph w-4 h-4" />
            </Link>
            <Link
              href="/explore"
              className="omnis-magnetic-arrow px-6 py-3 rounded-xl bg-[var(--bg-slate)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[15px] font-semibold text-[var(--text-primary)] inline-flex items-center gap-2 transition-all"
            >
              <span>Search All Topics</span>
              <ArrowRight className="omnis-arrow-glyph w-3.5 h-3.5 opacity-75" />
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 12: PROFESSIONAL FOOTER */}
      <footer className="py-12 px-4 sm:px-8 bg-[var(--bg-obsidian)] text-[13.5px] sm:text-sm text-[var(--text-secondary)]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 pb-8 border-b border-[var(--border-subtle)]">
          <div className="col-span-2 sm:col-span-1 space-y-3">
            <OmnisWordmark compact />
            <p className="leading-relaxed text-[var(--text-muted)]">
              The Intelligence of Everything. Understand Anything. Connect Everything. Discover What
              Comes Next.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="font-semibold text-[var(--text-primary)] text-xs">
              Explore Tools
            </div>
            <ul className="space-y-1.5">
              <li><Link href="/atlas" className="hover:text-[var(--accent-blue)] transition-colors">World Earth Globe</Link></li>
              <li><Link href="/knowledge-graph" className="hover:text-[var(--accent-blue)] transition-colors">Connected Topic Map</Link></li>
              <li><Link href="/simulations" className="hover:text-[var(--accent-blue)] transition-colors">What-If Scenarios</Link></li>
              <li><Link href="/timeline" className="hover:text-[var(--accent-blue)] transition-colors">World Timeline</Link></li>
              <li><Link href="/research" className="hover:text-[var(--accent-blue)] transition-colors">AddyIntelligence</Link></li>
              <li><Link href="/laboratory" className="hover:text-[var(--accent-blue)] transition-colors">Science Lab</Link></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <div className="font-semibold text-[var(--text-primary)] text-xs">
              Workspace
            </div>
            <ul className="space-y-1.5">
              <li><Link href="/command" className="hover:text-[var(--accent-blue)] transition-colors">Home — Command Hub</Link></li>
              <li><Link href="/intelligence" className="hover:text-[var(--accent-blue)] transition-colors">Compare Countries</Link></li>
              <li><Link href="/explore" className="hover:text-[var(--accent-blue)] transition-colors">Search &amp; Explore</Link></li>
              <li><Link href="/workspace" className="hover:text-[var(--accent-blue)] transition-colors">Saved Notes &amp; Exports</Link></li>
              <li><Link href="/settings" className="hover:text-[var(--accent-blue)] transition-colors">Settings &amp; Theme</Link></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <div className="font-semibold text-[var(--text-primary)] text-xs">
              Data Partners
            </div>
            <ul className="space-y-1.5 text-[var(--text-muted)]">
              <li>World Bank Open Data API (v2)</li>
              <li>REST Countries Registry</li>
              <li>OpenAlex Academic Library</li>
              <li>UN Population &amp; IMF Series</li>
              <li>Wikipedia Reference API</li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[var(--text-muted)]">
          <span>© 2026 OMNIS. Clear data, cited research, and open models.</span>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggleMotionPaused}
              aria-pressed={motionPaused}
              className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 px-3 sm:px-2.5 py-1.5 sm:py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-slate)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
            >
              {motionPaused ? (
                <Play className="w-3 h-3 tone-blue" />
              ) : (
                <Pause className="w-3 h-3 tone-blue" />
              )}
              <span>{motionPaused ? "Resume motion" : "Pause motion"}</span>
            </button>
            <span className="text-xs">
              Built on open World Bank, UN &amp; OpenAlex data
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
