"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sliders,
  RotateCcw,
  Bookmark,
  Check,
  Download,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Globe2,
  Share2,
} from "lucide-react";
import { COUNTRIES_DATA } from "@/lib/data/global-intelligence";
import {
  buildPlaceholderCountryProfile,
  WORLD_CATALOG_BY_ISO3,
  WORLD_COUNTRIES_CATALOG,
} from "@/lib/data/world-catalog";
import {
  executeWhatIfSimulation,
  parseSimulationQueryPrompt,
  SIMULATION_SCENARIOS,
} from "@/lib/simulations/engine";
import {
  escapeCsvCell,
  formatIndexContext,
  formatSignedPct,
  formatSignedValue,
} from "@/lib/formatters";
import { ProvenancePanel } from "@/components/ui/ProvenancePanel";
import { MonteCarloFanChart, TornadoSensitivityChart } from "@/components/charts/OmnisCharts";
import { OmnisLoader } from "@/components/brand/OmnisLogo";
import {
  OmnisButton,
  OmnisGlossaryTip,
  OmnisModuleHeader,
  OmnisSegmentedControl,
  OmnisStatTile,
} from "@/components/ui/OmnisPrimitives";
import { OmnisSelect } from "@/components/ui/OmnisSelect";
import { OmnisParameterSlider } from "@/components/ui/OmnisParameterSlider";
import { OmnisMathBlock } from "@/components/ui/OmnisMathBlock";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import type { CountryIntelligenceProfile, SimulationCategory } from "@/types/omnis";

const CATEGORIES: { id: SimulationCategory; label: string }[] = [
  { id: "economics", label: "Economics & Monetary" },
  { id: "demographics", label: "Demographics & Cohort" },
  { id: "energy", label: "Energy & Grid Transition" },
  { id: "technology", label: "AI & Semiconductor TFP" },
  { id: "environment", label: "Climate & Carbon Cycle" },
];

function resolveScenarioCategory(
  catParam: string | null,
  modelParam: string | null
): SimulationCategory | null {
  const cat = catParam?.trim().toLowerCase();
  if (cat) {
    const byCat = SIMULATION_SCENARIOS.find(
      (s) => s.category.toLowerCase() === cat || s.id.toLowerCase() === cat
    );
    if (byCat) return byCat.category;
  }
  const mod = modelParam?.trim().toLowerCase();
  if (mod) {
    const byMod = SIMULATION_SCENARIOS.find(
      (s) =>
        s.id.toLowerCase() === mod ||
        s.category.toLowerCase() === mod ||
        s.modelName.toLowerCase().includes(mod)
    );
    if (byMod) return byMod.category;
  }
  return null;
}

function isSupportedBaselineCountry(code: string | null | undefined): code is string {
  if (!code) return false;
  const upper = code.toUpperCase();
  return Boolean(COUNTRIES_DATA[upper] || WORLD_CATALOG_BY_ISO3[upper]);
}

function SimulationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const promptQuery = searchParams.get("q") || "";
  const parsedPrompt = useMemo(
    () => parseSimulationQueryPrompt(promptQuery),
    [promptQuery]
  );

  const initialCat =
    resolveScenarioCategory(searchParams.get("category"), searchParams.get("model")) ||
    parsedPrompt.category ||
    "economics";

  const paramOilShock = searchParams.get("oilShock");
  const paramCountry =
    searchParams.get("country")?.toUpperCase() || parsedPrompt.countryIso3 || null;
  const parsedOilShock =
    paramOilShock !== null && Number.isFinite(Number(paramOilShock))
      ? Math.max(-40, Math.min(100, Number(paramOilShock)))
      : typeof parsedPrompt.overrides.oilPriceShockPct === "number"
        ? parsedPrompt.overrides.oilPriceShockPct
        : null;

  const rawHorizonParam = searchParams.get("horizon");
  const paramHorizon =
    rawHorizonParam !== null && rawHorizonParam.trim() !== "" ? Number(rawHorizonParam) : NaN;
  const initialHorizon =
    Number.isFinite(paramHorizon) && paramHorizon >= 5 && paramHorizon <= 35
      ? Math.round(paramHorizon)
      : 15;
  const rawSeedParam = searchParams.get("seed");
  const paramSeed =
    rawSeedParam !== null && rawSeedParam.trim() !== "" ? Number(rawSeedParam) : NaN;
  const initialSeed = Number.isFinite(paramSeed) ? Math.round(paramSeed) : 42;

  const [category, setCategory] = useState<SimulationCategory>(
    CATEGORIES.some((c) => c.id === initialCat) ? initialCat : "economics"
  );
  const [countryBaselineIso3, setCountryBaselineIso3] = useState<string>(
    isSupportedBaselineCountry(paramCountry) ? paramCountry : "GLOBAL"
  );
  const [horizonYears, setHorizonYears] = useState(initialHorizon);
  const [seed, setSeed] = useState(initialSeed);
  const [seedInput, setSeedInput] = useState(String(initialSeed));
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [savedNotice, setSavedNotice] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [hydratedCountries, setHydratedCountries] = useState<
    Record<string, CountryIntelligenceProfile>
  >({});
  const [hydratingCountryIso, setHydratingCountryIso] = useState<string | null>(null);
  const hydratedRef = useRef<Record<string, CountryIntelligenceProfile>>({});
  const [lastSyncedQuery, setLastSyncedQuery] = useState<string | null>(null);

  const { addWorkspaceItem, setActiveContext } = useOmnisStore();

  const countryOptions = useMemo(() => {
    const byIso = new Map<string, { value: string; label: string; hint?: string }>();
    for (const entry of WORLD_COUNTRIES_CATALOG) {
      const curated = COUNTRIES_DATA[entry.iso3];
      byIso.set(entry.iso3, {
        value: entry.iso3,
        label: curated
          ? `${curated.flagEmoji} ${curated.name} (${curated.iso3})`
          : `${entry.name} (${entry.iso3})`,
        hint: curated
          ? `${formatSignedPct(curated.gdpGrowthPct)} GDP • ${curated.energyProfile.renewableSharePct}% Clean`
          : entry.region,
      });
    }
    for (const curated of Object.values(COUNTRIES_DATA)) {
      if (!byIso.has(curated.iso3)) {
        byIso.set(curated.iso3, {
          value: curated.iso3,
          label: `${curated.flagEmoji} ${curated.name} (${curated.iso3})`,
          hint: `${formatSignedPct(curated.gdpGrowthPct)} GDP • ${curated.energyProfile.renewableSharePct}% Clean`,
        });
      }
    }
    const sorted = Array.from(byIso.values()).sort((a, b) => a.label.localeCompare(b.label));
    return [
      { value: "GLOBAL", label: "🌍 Global Aggregate (IMF/UN Weighted)", hint: "Baseline" },
      ...sorted,
    ];
  }, []);

  const activeSpec =
    SIMULATION_SCENARIOS.find((s) => s.category === category) ??
    SIMULATION_SCENARIOS[0];

  useEffect(() => {
    if (
      countryBaselineIso3 === "GLOBAL" ||
      COUNTRIES_DATA[countryBaselineIso3] ||
      hydratedRef.current[countryBaselineIso3]
    ) {
      return;
    }
    let active = true;
    const targetIso = countryBaselineIso3;
    setHydratingCountryIso(targetIso);
    fetch(`/api/v1/countries/${encodeURIComponent(targetIso)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const resolved: CountryIntelligenceProfile | null =
          data?.country ?? (data?.iso3 ? data : null);
        if (!active || !resolved) return;
        hydratedRef.current[targetIso] = resolved;
        setHydratedCountries((prev) => ({ ...prev, [targetIso]: resolved }));
      })
      .catch(() => {})
      .finally(() => {
        if (active) {
          setHydratingCountryIso((prev) => (prev === targetIso ? null : prev));
        }
      });
    return () => {
      active = false;
    };
  }, [countryBaselineIso3]);

  const simQueryKey = searchParams.toString();
  const [prevSimQueryKey, setPrevSimQueryKey] = useState(simQueryKey);
  if (simQueryKey !== prevSimQueryKey) {
    setPrevSimQueryKey(simQueryKey);
    if (lastSyncedQuery === null || simQueryKey !== lastSyncedQuery) {
      const urlCat = resolveScenarioCategory(
        searchParams.get("category"),
        searchParams.get("model")
      );
      if (urlCat && CATEGORIES.some((c) => c.id === urlCat)) {
        setCategory(urlCat);
      }
      const urlCountry = searchParams.get("country")?.toUpperCase();
      if (urlCountry === "GLOBAL" || isSupportedBaselineCountry(urlCountry)) {
        setCountryBaselineIso3(urlCountry);
      }
      const urlHorizon = Number(searchParams.get("horizon"));
      if (searchParams.get("horizon") !== null && Number.isFinite(urlHorizon)) {
        setHorizonYears(Math.max(5, Math.min(35, Math.round(urlHorizon))));
      }
      const urlSeed = Number(searchParams.get("seed"));
      if (searchParams.get("seed") !== null && Number.isFinite(urlSeed)) {
        const clampedSeed = Math.max(0, Math.min(999999, Math.round(urlSeed)));
        setSeed(clampedSeed);
        setSeedInput(String(clampedSeed));
      }
    }
  }

  const simOverrideKey = `${activeSpec.category}::${parsedOilShock ?? ""}::${searchParams.toString()}`;
  const [prevSimOverrideKey, setPrevSimOverrideKey] = useState(simOverrideKey);
  if (simOverrideKey !== prevSimOverrideKey) {
    setPrevSimOverrideKey(simOverrideKey);
    const currentQs = searchParams.toString();
    if (lastSyncedQuery === null || currentQs !== lastSyncedQuery) {
      const defaults: Record<string, number> = {};
      for (const p of activeSpec.parameters) {
        defaults[p.key] = p.defaultModifiedValue;
      }
      if (activeSpec.category === "economics" && parsedOilShock !== null) {
        defaults.oilPriceShockPct = parsedOilShock;
      }
      for (const [k, v] of Object.entries(parsedPrompt.overrides)) {
        if (k in defaults) defaults[k] = v;
      }
      for (const p of activeSpec.parameters) {
        const raw = searchParams.get(p.key);
        if (raw !== null && Number.isFinite(Number(raw))) {
          defaults[p.key] = Math.max(p.min, Math.min(p.max, Number(raw)));
        }
      }
      setOverrides(defaults);
    }
  }

  const activeCountryProfile = useMemo(() => {
    if (countryBaselineIso3 === "GLOBAL") return undefined;
    return (
      COUNTRIES_DATA[countryBaselineIso3] ??
      hydratedCountries[countryBaselineIso3] ??
      buildPlaceholderCountryProfile(countryBaselineIso3) ??
      undefined
    );
  }, [countryBaselineIso3, hydratedCountries]);

  useEffect(() => {
    setActiveContext(
      "What-If Simulation Engine",
      `${activeSpec.title} (${countryBaselineIso3})`
    );
  }, [activeSpec.title, countryBaselineIso3, setActiveContext]);

  const simulationOutput = useMemo(
    () =>
      executeWhatIfSimulation({
        scenarioId: activeSpec.id,
        category,
        horizonYears,
        seed,
        countryIso3: countryBaselineIso3,
        countryProfile: activeCountryProfile,
        overrides,
      }),
    [
      activeSpec.id,
      category,
      horizonYears,
      seed,
      countryBaselineIso3,
      activeCountryProfile,
      overrides,
    ]
  );

  const maxElasticity = useMemo(
    () => Math.max(0.01, ...simulationOutput.sensitivity.map((s) => s.elasticityScore)),
    [simulationOutput.sensitivity]
  );

  const buildShareQueryParams = (opts?: {
    nextCat?: SimulationCategory;
    nextCountry?: string;
    nextHorizon?: number;
    nextSeed?: number;
    nextOverrides?: Record<string, number>;
    includeOverrides?: boolean;
  }) => {
    const targetCat = opts?.nextCat ?? category;
    const targetSpec =
      SIMULATION_SCENARIOS.find((s) => s.category === targetCat) ?? activeSpec;
    const params = new URLSearchParams({
      category: targetCat,
      country: opts?.nextCountry ?? countryBaselineIso3,
      horizon: String(opts?.nextHorizon ?? horizonYears),
      seed: String(opts?.nextSeed ?? seed),
    });
    if (opts?.includeOverrides !== false) {
      const sourceOverrides = opts?.nextOverrides ?? overrides;
      for (const p of targetSpec.parameters) {
        params.set(p.key, String(sourceOverrides[p.key] ?? p.defaultModifiedValue));
      }
    }
    return params;
  };

  const syncUrlFromState = (opts?: {
    nextCat?: SimulationCategory;
    nextCountry?: string;
    nextHorizon?: number;
    nextSeed?: number;
    nextOverrides?: Record<string, number>;
    includeOverrides?: boolean;
  }) => {
    const params = buildShareQueryParams(opts);
    const qs = params.toString();
    setLastSyncedQuery(qs);
    router.replace(`/simulations?${qs}`, { scroll: false });
  };

  const handleCategoryChange = (nextCat: SimulationCategory) => {
    const targetSpec =
      SIMULATION_SCENARIOS.find((s) => s.category === nextCat) ?? SIMULATION_SCENARIOS[0];
    const defaults: Record<string, number> = {};
    for (const p of targetSpec.parameters) {
      defaults[p.key] = p.defaultModifiedValue;
    }
    setCategory(nextCat);
    setOverrides(defaults);
    syncUrlFromState({ nextCat, nextOverrides: defaults });
  };

  const handleCountryChange = (nextCountry: string) => {
    setCountryBaselineIso3(nextCountry);
    syncUrlFromState({ nextCountry });
  };

  const handleReset = () => {
    const baseVals: Record<string, number> = {};
    for (const p of activeSpec.parameters) {
      baseVals[p.key] = p.baselineValue;
    }
    setOverrides(baseVals);
    syncUrlFromState({ nextOverrides: baseVals, includeOverrides: false });
  };

  const handleRevertGlobalDefault = () => {
    const baseVals: Record<string, number> = {};
    for (const p of activeSpec.parameters) {
      baseVals[p.key] = p.baselineValue;
    }
    setCountryBaselineIso3("GLOBAL");
    setOverrides(baseVals);
    syncUrlFromState({
      nextCountry: "GLOBAL",
      nextOverrides: baseVals,
      includeOverrides: false,
    });
  };

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    const params = buildShareQueryParams();
    const shareUrl = `${window.location.origin}/simulations?${params.toString()}`;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  // Debounced two-way URL synchronization for slider drags, horizon & seed adjustments
  const hasMountedSimSyncRef = useRef(false);
  useEffect(() => {
    if (!hasMountedSimSyncRef.current) {
      hasMountedSimSyncRef.current = true;
      return;
    }
    const timer = setTimeout(() => {
      const targetSpec =
        SIMULATION_SCENARIOS.find((s) => s.category === category) ?? activeSpec;
      const params = new URLSearchParams({
        category,
        country: countryBaselineIso3,
        horizon: String(horizonYears),
        seed: String(seed),
      });
      for (const p of targetSpec.parameters) {
        params.set(p.key, String(overrides[p.key] ?? p.defaultModifiedValue));
      }
      const qs = params.toString();
      if (qs !== lastSyncedQuery) {
        setLastSyncedQuery(qs);
        router.replace(`/simulations?${qs}`, { scroll: false });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [
    category,
    countryBaselineIso3,
    horizonYears,
    seed,
    overrides,
    activeSpec,
    lastSyncedQuery,
    router,
  ]);

  const handleSaveExperiment = () => {
    const params = buildShareQueryParams();
    addWorkspaceItem({
      type: "simulation",
      title: `Simulation: ${activeSpec.title}`,
      subtitle: `Horizon ${horizonYears}y (${countryBaselineIso3}) • Delta ${formatSignedPct(
        simulationOutput.summaryMetrics.percentageDelta
      )} (${simulationOutput.units})`,
      folder: "Scenario Simulations",
      tags: [category, countryBaselineIso3, "Monte Carlo", activeSpec.modelVersion],
      href: `/simulations?${params.toString()}`,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleExportCsv = () => {
    const headers = [
      "Year",
      "HistoricalObserved",
      "Baseline",
      "ModifiedP10",
      "ModifiedP50",
      "ModifiedP90",
    ];
    const rows = simulationOutput.trajectory.map((pt) =>
      [
        pt.year,
        pt.historicalObserved ?? "",
        pt.baseline,
        pt.modifiedP10,
        pt.modifiedP50,
        pt.modifiedP90,
      ]
        .map(escapeCsvCell)
        .join(",")
    );
    const csv = `\uFEFF${[headers.map(escapeCsvCell).join(","), ...rows].join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `omnis-simulation-${category}-${horizonYears}y.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Category Tabs */}
      <OmnisModuleHeader
        moduleTag="What-If Scenarios"
        title={activeSpec.title}
        subtitle={activeSpec.subtitle}
        icon={<Sliders className="w-3.5 h-3.5" />}
        mobileFilterLabel={`Model: ${CATEGORIES.find((c) => c.id === category)?.label.split(" ")[0] ?? "Category"}`}
        actions={
          <>
            <OmnisButton variant="secondary" onClick={handleCopyLink}>
              {copiedLink ? (
                <Check className="w-3.5 h-3.5 tone-verified" />
              ) : (
                <Share2 className="w-3.5 h-3.5 tone-blue" />
              )}
              <span>{copiedLink ? "Link Copied" : "Copy Link"}</span>
            </OmnisButton>
            <OmnisButton onClick={handleSaveExperiment}>
              {savedNotice ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              <span>{savedNotice ? "Experiment Saved" : "Save Experiment"}</span>
            </OmnisButton>
            <OmnisButton variant="secondary" onClick={handleExportCsv}>
              <Download className="w-3.5 h-3.5 tone-blue" />
              <span>Export CSV</span>
            </OmnisButton>
          </>
        }
        secondaryControls={
          <div className="pt-1 overflow-x-auto max-w-full">
            <OmnisSegmentedControl
              groupId="simulation-category-tabs"
              ariaLabel="Simulation Scientific Domain"
              size="sm"
              value={category}
              onChange={(val) => handleCategoryChange(val as SimulationCategory)}
              options={CATEGORIES.map((c) => ({
                value: c.id,
                label: c.label,
              }))}
            />
          </div>
        }
      >
        {(parsedOilShock !== null ||
          (paramCountry && paramCountry !== "GLOBAL" && countryBaselineIso3 !== "GLOBAL") ||
          Boolean(promptQuery)) ? (
          <div className="px-3 py-2 rounded-xl badge-tone-blue text-[13px] flex flex-wrap items-center justify-between gap-2">
            <span>
              Anchored Baseline:{" "}
              <strong className="omnis-mono">
                {countryBaselineIso3 === "GLOBAL" ? "Global Aggregate" : countryBaselineIso3}
              </strong>
              {parsedOilShock !== null && category === "economics" ? (
                <>
                  {" "}
                  • Oil Impulse:{" "}
                  <strong className="omnis-mono omnis-tabular">
                    {formatSignedPct(parsedOilShock)}
                  </strong>
                </>
              ) : null}
              {promptQuery ? <> • Prompt: &ldquo;{promptQuery}&rdquo;</> : null}
            </span>
            <button
              type="button"
              onClick={handleRevertGlobalDefault}
              className="min-h-[44px] md:min-h-0 inline-flex items-center px-2 md:px-0 text-xs font-semibold underline cursor-pointer"
            >
              Revert to Default Baseline
            </button>
          </div>
        ) : undefined}
      </OmnisModuleHeader>

      {/* Main Simulation Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Parameter Controls */}
        <div className="lg:col-span-4 min-w-0 omnis-card p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Scenario Variables &amp; Baseline
            </h2>
            <button
              type="button"
              onClick={handleReset}
              className="shrink-0 whitespace-nowrap min-h-[44px] md:min-h-0 inline-flex items-center gap-1.5 px-2 md:px-0 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-[var(--text-muted)]">
                Starting Country Baseline
              </div>
              {hydratingCountryIso === countryBaselineIso3 && (
                <span className="text-[11px] font-semibold tone-cyan animate-pulse">
                  Loading World Bank data…
                </span>
              )}
            </div>
            <OmnisSelect
              value={countryBaselineIso3}
              onChange={handleCountryChange}
              ariaLabel="Country Baseline Calibration"
              leadingIcon={<Globe2 className="w-3.5 h-3.5 tone-blue" />}
              size="md"
              fullWidth
              options={countryOptions}
            />
          </div>

          <div className="space-y-3">
            {activeSpec.parameters.map((param) => {
              const currentVal = overrides[param.key] ?? param.defaultModifiedValue;
              return (
                <OmnisParameterSlider
                  key={param.key}
                  label={param.label}
                  unit={param.unit}
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  baselineValue={param.baselineValue}
                  description={param.description}
                  value={currentVal}
                  accent="blue"
                  onChange={(nextVal) =>
                    setOverrides((prev) => ({
                      ...prev,
                      [param.key]: nextVal,
                    }))
                  }
                  onReset={() =>
                    setOverrides((prev) => ({
                      ...prev,
                      [param.key]: param.baselineValue,
                    }))
                  }
                />
              );
            })}

            {/* Timeframe Horizon & Seed */}
            <div className="space-y-3">
              <OmnisParameterSlider
                label="Projection Timeframe Horizon"
                unit={`Years (2026–${2026 + horizonYears})`}
                min={5}
                max={35}
                step={5}
                baselineValue={15}
                value={horizonYears}
                accent="violet"
                onChange={setHorizonYears}
                onReset={() => setHorizonYears(15)}
              />

              <details className="rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] px-3.5 py-2 text-[13.5px]">
                <summary className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer select-none">
                  <span>Advanced repeatability option</span>
                </summary>
                <div className="flex items-center justify-between gap-2 pt-2.5 mt-1 border-t border-[var(--border-subtle)]">
                  <span className="text-[13px] text-[var(--text-secondary)]">
                    Repeatability Seed (500 runs):
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={999999}
                    value={seedInput}
                    aria-label="Monte Carlo Seed"
                    onChange={(e) => {
                      const raw = e.target.value;
                      setSeedInput(raw);
                      if (raw.trim() === "") return;
                      const parsed = Number(raw);
                      if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 999999) {
                        setSeed(parsed);
                      }
                    }}
                    onBlur={() => {
                      const parsed = Number(seedInput);
                      if (seedInput.trim() === "" || !Number.isFinite(parsed) || parsed < 0) {
                        setSeed(42);
                        setSeedInput("42");
                      } else {
                        const clean = Math.min(999999, Math.max(0, Math.round(parsed)));
                        setSeed(clean);
                        setSeedInput(String(clean));
                      }
                    }}
                    className="w-24 px-2.5 py-1.5 rounded-md bg-[var(--bg-graphite)] border border-[var(--border-subtle)] text-base md:text-sm font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]"
                  />
                </div>
              </details>
            </div>
          </div>
        </div>

        {/* Right Trajectory Chart, Sensitivity & Epistemic Separation */}
        <div className="lg:col-span-8 min-w-0 space-y-6">
          {/* Summary KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <OmnisStatTile
              label={`Expected Trend (${2026 + horizonYears})`}
              value={String(simulationOutput.summaryMetrics.baselineTerminal)}
              subValue={simulationOutput.units}
              tone="default"
            />
            <OmnisStatTile
              label={`Your Scenario (${2026 + horizonYears})`}
              value={String(simulationOutput.summaryMetrics.modifiedMedianTerminal)}
              subValue="Most likely path"
              tone="blue"
            />
            <OmnisStatTile
              label="Impact vs Trend"
              value={formatSignedPct(simulationOutput.summaryMetrics.percentageDelta)}
              subValue="Change at horizon"
              tone={simulationOutput.summaryMetrics.percentageDelta >= 0 ? "verified" : "warning"}
            />
            <OmnisStatTile
              label="Likely Range (80% of runs)"
              value={`±${(simulationOutput.summaryMetrics.uncertaintySpreadP90MinusP10 / 2).toFixed(2)}`}
              subValue="Low to high spread"
              glossaryTerm="Confidence Band (P10–P90)"
              tone="violet"
            />
          </div>

          {/* Interactive Trajectory Fan Chart */}
          <div className="omnis-card p-5 space-y-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
                  <TrendingUp className="w-4 h-4 tone-blue shrink-0" />
                  <span>{activeSpec.dependentVariableLabel} • 2023–{2026 + horizonYears}</span>
                </div>
                {simulationOutput.units.toLowerCase().includes("index") && (
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    100 = 2026 starting level; 155 means 55% larger than today
                    <OmnisGlossaryTip term="Index (2026 = 100)" />
                  </span>
                )}
              </div>
              <h3
                className="text-lg sm:text-xl font-bold text-[var(--text-primary)] leading-snug"
                style={{ fontFamily: "var(--font-editorial), Georgia, serif" }}
              >
                {simulationOutput.units.toLowerCase().includes("index")
                  ? `These settings point to ${formatIndexContext(
                      simulationOutput.summaryMetrics.baselineTerminal,
                      simulationOutput.summaryMetrics.modifiedMedianTerminal
                    )} by ${2026 + horizonYears}.`
                  : `These settings move ${activeSpec.dependentVariableLabel.toLowerCase()} from ${
                      simulationOutput.summaryMetrics.baselineTerminal
                    } to ${simulationOutput.summaryMetrics.modifiedMedianTerminal} (${formatSignedPct(
                      simulationOutput.summaryMetrics.percentageDelta
                    )} vs trend) by ${2026 + horizonYears}.`}
              </h3>
            </div>

            <MonteCarloFanChart
              trajectory={simulationOutput.trajectory}
              units={simulationOutput.units}
            />

            {/* Biggest Drivers Strip */}
            <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-[13px]">
                <span className="font-semibold tone-cyan">
                  Biggest Drivers
                </span>
                <span className="text-[var(--text-muted)]">
                  Sorted by how strongly each setting moves the {2026 + horizonYears} result
                </span>
              </div>
              <div className="space-y-2">
                {simulationOutput.sensitivity.map((item) => {
                  const pctWidth = Math.max(8, (item.elasticityScore / maxElasticity) * 100);
                  const specParam = activeSpec.parameters.find((p) => p.key === item.parameterKey);
                  return (
                    <div key={item.parameterKey} className="space-y-1 text-[13.5px] sm:text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-[var(--text-primary)] truncate">
                          {item.label}
                        </span>
                        <div className="flex items-center gap-2 omnis-mono omnis-tabular text-xs">
                          <span className="text-[var(--text-muted)]">
                            Low {formatSignedValue(item.lowOutcomeDelta)} / High{" "}
                            {formatSignedValue(item.highOutcomeDelta)}
                          </span>
                          {specParam ? (
                            <button
                              type="button"
                              onClick={() =>
                                setOverrides((prev) => ({
                                  ...prev,
                                  [specParam.key]: specParam.max,
                                }))
                              }
                              className="min-h-[44px] md:min-h-[32px] inline-flex items-center px-3 md:px-2 py-1 md:py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-slate)] hover:border-[var(--accent-blue)] text-[11.5px] sm:text-xs tone-blue cursor-pointer font-sans font-medium"
                            >
                              Test Max
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[var(--bg-slate)] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pctWidth.toFixed(1)}%`,
                            background:
                              "linear-gradient(90deg, var(--accent-blue-solid), var(--accent-cyan))",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="border-l-2 border-[var(--accent-blue)] pl-4 py-1 text-[14.5px] sm:text-[15px] text-[var(--text-secondary)] leading-relaxed">
              <strong className="text-[var(--text-primary)]">Plain-English Summary:</strong>{" "}
              {simulationOutput.analyticalExplanation}
            </p>
          </div>

          {/* Tornado Sensitivity & Collapsible Methodology */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="omnis-card p-5 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                  <BarChart3 className="w-4 h-4 tone-violet" />
                  <span>Which Setting Changes the Outcome Most?</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Longer bars show sliders that create the widest swing between their minimum and maximum settings.
                </p>
              </div>
              <TornadoSensitivityChart sensitivity={simulationOutput.sensitivity} />
            </div>

            <div className="omnis-card p-5 space-y-3 text-[13.5px] sm:text-sm">
              <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                <AlertCircle className="w-4 h-4 tone-warning shrink-0" />
                <span>What This Model Assumes</span>
              </div>
              <ul className="space-y-1.5 text-[var(--text-secondary)] list-disc pl-4 leading-relaxed">
                {simulationOutput.initialAssumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
                {simulationOutput.limitations.map((lim) => (
                  <li key={lim} className="tone-warning font-medium">
                    Caveat: {lim}
                  </li>
                ))}
              </ul>
              <details className="pt-2 border-t border-[var(--border-subtle)]">
                <summary className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 text-xs font-semibold tone-blue cursor-pointer select-none">
                  <span>Model methodology &amp; formula ({activeSpec.modelName})</span>
                </summary>
                <div className="pt-2.5">
                  <OmnisMathBlock
                    latex={activeSpec.equationsLatex}
                    label="Governing Equation"
                  />
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>

      <ProvenancePanel provenance={simulationOutput.provenance} compact />
    </div>
  );
}

export default function SimulationsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 max-w-7xl mx-auto">
          <OmnisLoader label="Loading what-if scenarios…" />
        </div>
      }
    >
      <SimulationsContent />
    </Suspense>
  );
}
