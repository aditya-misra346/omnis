"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
} from "lucide-react";
import { COUNTRIES_DATA } from "@/lib/data/global-intelligence";
import {
  executeWhatIfSimulation,
  parseSimulationQueryPrompt,
  SIMULATION_SCENARIOS,
} from "@/lib/simulations/engine";
import { ProvenancePanel } from "@/components/ui/ProvenancePanel";
import { MonteCarloFanChart, TornadoSensitivityChart } from "@/components/charts/OmnisCharts";
import { OmnisLoader } from "@/components/brand/OmnisLogo";
import {
  OmnisButton,
  OmnisModuleHeader,
  OmnisSegmentedControl,
  OmnisStatTile,
} from "@/components/ui/OmnisPrimitives";
import { OmnisSelect } from "@/components/ui/OmnisSelect";
import { OmnisParameterSlider } from "@/components/ui/OmnisParameterSlider";
import { OmnisMathBlock } from "@/components/ui/OmnisMathBlock";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import type { SimulationCategory } from "@/types/omnis";

const CATEGORIES: { id: SimulationCategory; label: string }[] = [
  { id: "economics", label: "Economics & Monetary" },
  { id: "demographics", label: "Demographics & Cohort" },
  { id: "energy", label: "Energy & Grid Transition" },
  { id: "technology", label: "AI & Semiconductor TFP" },
  { id: "environment", label: "Climate & Carbon Cycle" },
];

function SimulationsContent() {
  const searchParams = useSearchParams();
  const promptQuery = searchParams.get("q") || "";
  const parsedPrompt = useMemo(
    () => parseSimulationQueryPrompt(promptQuery),
    [promptQuery]
  );

  const initialCat =
    (searchParams.get("category") as SimulationCategory) ||
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

  const [category, setCategory] = useState<SimulationCategory>(
    CATEGORIES.some((c) => c.id === initialCat) ? initialCat : "economics"
  );
  const [countryBaselineIso3, setCountryBaselineIso3] = useState<string>(
    paramCountry && COUNTRIES_DATA[paramCountry] ? paramCountry : "GLOBAL"
  );
  const [horizonYears, setHorizonYears] = useState(15);
  const [seed, setSeed] = useState(42);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [savedNotice, setSavedNotice] = useState(false);

  const { addWorkspaceItem, setActiveContext } = useOmnisStore();
  const countriesList = useMemo(() => Object.values(COUNTRIES_DATA), []);

  const activeSpec =
    SIMULATION_SCENARIOS.find((s) => s.category === category) ??
    SIMULATION_SCENARIOS[0];

  // Reset overrides when category changes, honouring URL sandbox oilShock / prompt presets
  useEffect(() => {
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
    setOverrides(defaults);
  }, [activeSpec, parsedOilShock, parsedPrompt.overrides]);

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
        overrides,
      }),
    [activeSpec.id, category, horizonYears, seed, countryBaselineIso3, overrides]
  );

  const maxElasticity = useMemo(
    () => Math.max(0.01, ...simulationOutput.sensitivity.map((s) => s.elasticityScore)),
    [simulationOutput.sensitivity]
  );

  const handleReset = () => {
    const baseVals: Record<string, number> = {};
    for (const p of activeSpec.parameters) {
      baseVals[p.key] = p.baselineValue;
    }
    setOverrides(baseVals);
  };

  const handleSaveExperiment = () => {
    addWorkspaceItem({
      type: "simulation",
      title: `Simulation: ${activeSpec.title}`,
      subtitle: `Horizon ${horizonYears}y • Delta ${
        simulationOutput.summaryMetrics.percentageDelta >= 0 ? "+" : ""
      }${simulationOutput.summaryMetrics.percentageDelta}% (${simulationOutput.units})`,
      folder: "Scenario Simulations",
      tags: [category, "Monte Carlo", activeSpec.modelVersion],
      href: `/simulations?category=${category}`,
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
      ].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
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
        moduleTag="MODULE 03 • WHAT-IF SCENARIO & MONTE CARLO SIMULATION ENGINE"
        title={activeSpec.title}
        subtitle={`${activeSpec.subtitle} • Governing Model: ${activeSpec.modelName}`}
        icon={<Sliders className="w-3.5 h-3.5" />}
        mobileFilterLabel={`Model: ${CATEGORIES.find((c) => c.id === category)?.label.split(" ")[0] ?? "Category"}`}
        actions={
          <>
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
              onChange={(val) => setCategory(val as SimulationCategory)}
              options={CATEGORIES.map((c) => ({
                value: c.id,
                label: c.label,
              }))}
            />
          </div>
        }
      >
        {(parsedOilShock !== null || paramCountry || promptQuery) ? (
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
                    {parsedOilShock >= 0 ? "+" : ""}
                    {parsedOilShock}%
                  </strong>
                </>
              ) : null}
              {promptQuery ? <> • Prompt: &ldquo;{promptQuery}&rdquo;</> : null}
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold underline cursor-pointer"
            >
              Revert to Default Baseline
            </button>
          </div>
        ) : undefined}
      </OmnisModuleHeader>

      {/* Main Simulation Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Parameter Controls */}
        <div className="lg:col-span-4 omnis-card p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Scenario Variables &amp; Baseline
            </h2>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Baseline
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] omnis-mono">
              Country Baseline Calibration
            </div>
            <OmnisSelect
              value={countryBaselineIso3}
              onChange={setCountryBaselineIso3}
              ariaLabel="Country Baseline Calibration"
              leadingIcon={<Globe2 className="w-3.5 h-3.5 tone-blue" />}
              size="md"
              options={[
                { value: "GLOBAL", label: "🌍 Global Aggregate (IMF/UN Weighted)", hint: "Baseline" },
                ...countriesList.map((c) => ({
                  value: c.iso3,
                  label: `${c.flagEmoji} ${c.name} (${c.iso3})`,
                  hint: `+${c.gdpGrowthPct}% GDP • ${c.energyProfile.renewableSharePct}% Clean`,
                })),
              ]}
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

              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-[13.5px]">
                <span className="text-[13px] text-[var(--text-secondary)]">
                  Monte Carlo Seed (500 paths):
                </span>
                <input
                  type="number"
                  value={seed}
                  aria-label="Monte Carlo Seed"
                  onChange={(e) => setSeed(Number(e.target.value) || 42)}
                  className="w-20 px-2.5 py-1 rounded-md bg-[var(--bg-graphite)] border border-[var(--border-subtle)] text-base sm:text-sm font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Trajectory Chart, Sensitivity & Epistemic Separation */}
        <div className="lg:col-span-8 space-y-6">
          {/* Summary KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <OmnisStatTile
              label={`Baseline (${2026 + horizonYears})`}
              value={String(simulationOutput.summaryMetrics.baselineTerminal)}
              subValue={simulationOutput.units}
              tone="default"
            />
            <OmnisStatTile
              label="Modified Median (P50)"
              value={String(simulationOutput.summaryMetrics.modifiedMedianTerminal)}
              subValue="500-Path Median"
              tone="blue"
            />
            <OmnisStatTile
              label="Divergence vs Baseline"
              value={`${simulationOutput.summaryMetrics.percentageDelta >= 0 ? "+" : ""}${simulationOutput.summaryMetrics.percentageDelta}%`}
              subValue="Relative Shift"
              tone={simulationOutput.summaryMetrics.percentageDelta >= 0 ? "verified" : "warning"}
            />
            <OmnisStatTile
              label="Uncertainty (P90 - P10)"
              value={`±${(simulationOutput.summaryMetrics.uncertaintySpreadP90MinusP10 / 2).toFixed(2)}`}
              subValue="80% Confidence Envelope"
              tone="violet"
            />
          </div>

          {/* Interactive Trajectory Fan Chart */}
          <div className="omnis-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 tone-blue" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Historical Observations (2023–2025) vs Baseline & Stochastic Projection
                </h3>
              </div>
            </div>

            <MonteCarloFanChart
              trajectory={simulationOutput.trajectory}
              units={simulationOutput.units}
            />

            {/* Interactive Parameter Elasticity Strip */}
            <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2.5">
              <div className="flex items-center justify-between text-xs sm:text-[13px] omnis-mono">
                <span className="font-bold uppercase tracking-wider tone-cyan">
                  Parameter Sensitivity / Elasticity Strip
                </span>
                <span className="text-[var(--text-muted)]">
                  Ranked by terminal variance across bounds
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
                            Low {item.lowOutcomeDelta >= 0 ? "+" : ""}
                            {item.lowOutcomeDelta} / High {item.highOutcomeDelta >= 0 ? "+" : ""}
                            {item.highOutcomeDelta}
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
                              className="px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-slate)] hover:border-[var(--accent-blue)] text-[11.5px] sm:text-xs tone-blue cursor-pointer"
                            >
                              Stress Max
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

            <p className="text-[14.5px] sm:text-[15px] text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-slate)] p-3.5 rounded-xl border border-[var(--border-subtle)]">
              <strong className="text-[var(--text-primary)]">Analytical Interpretation:</strong>{" "}
              {simulationOutput.analyticalExplanation}
            </p>
          </div>

          {/* Tornado Sensitivity Analysis & Model Governance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="omnis-card p-5 space-y-4">
              <div className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider tone-violet omnis-mono">
                <BarChart3 className="w-4 h-4" />
                <span>Tornado Parameter Sensitivity Analysis</span>
              </div>
              <TornadoSensitivityChart sensitivity={simulationOutput.sensitivity} />
            </div>

            <div className="omnis-card p-5 space-y-3 text-[13.5px] sm:text-sm">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider tone-warning omnis-mono">
                <AlertCircle className="w-4 h-4" />
                <span>Model Assumptions & Epistemic Limitations</span>
              </div>
              <OmnisMathBlock
                latex={activeSpec.equationsLatex}
                label="Stochastic Governing Law"
              />
              <ul className="space-y-1.5 text-[var(--text-secondary)] list-disc pl-4 leading-relaxed">
                {simulationOutput.initialAssumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
                {simulationOutput.limitations.map((lim) => (
                  <li key={lim} className="tone-warning font-medium">
                    Limitation: {lim}
                  </li>
                ))}
              </ul>
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
          <OmnisLoader label="Initialising 500-Path Stochastic Simulation Engine..." />
        </div>
      }
    >
      <SimulationsContent />
    </Suspense>
  );
}
