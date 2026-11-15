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
} from "lucide-react";
import {
  executeWhatIfSimulation,
  SIMULATION_SCENARIOS,
} from "@/lib/simulations/engine";
import { ProvenancePanel } from "@/components/ui/ProvenancePanel";
import { MonteCarloFanChart, TornadoSensitivityChart } from "@/components/charts/OmnisCharts";
import { OmnisLoader } from "@/components/brand/OmnisLogo";
import { OmnisButton, OmnisModuleHeader, OmnisStatTile } from "@/components/ui/OmnisPrimitives";
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
  const initialCat = (searchParams.get("category") as SimulationCategory) || "economics";

  const [category, setCategory] = useState<SimulationCategory>(
    CATEGORIES.some((c) => c.id === initialCat) ? initialCat : "economics"
  );
  const [horizonYears, setHorizonYears] = useState(15);
  const [seed, setSeed] = useState(42);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [savedNotice, setSavedNotice] = useState(false);

  const { addWorkspaceItem, setActiveContext } = useOmnisStore();

  const activeSpec =
    SIMULATION_SCENARIOS.find((s) => s.category === category) ??
    SIMULATION_SCENARIOS[0];

  // Reset overrides when category changes
  useEffect(() => {
    const defaults: Record<string, number> = {};
    for (const p of activeSpec.parameters) {
      defaults[p.key] = p.defaultModifiedValue;
    }
    setOverrides(defaults);
  }, [activeSpec]);

  useEffect(() => {
    setActiveContext("What-If Simulation Engine", activeSpec.title);
  }, [activeSpec.title, setActiveContext]);

  const simulationOutput = useMemo(
    () =>
      executeWhatIfSimulation({
        scenarioId: activeSpec.id,
        category,
        horizonYears,
        seed,
        overrides,
      }),
    [activeSpec.id, category, horizonYears, seed, overrides]
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
      >
        <div className="flex flex-wrap gap-2 pt-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                category === c.id
                  ? "bg-[var(--accent-blue-solid)] text-white shadow-sm"
                  : "bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </OmnisModuleHeader>

      {/* Main Simulation Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Parameter Controls */}
        <div className="lg:col-span-4 omnis-card p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Scenario Variables & Assumptions
            </h2>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Baseline
            </button>
          </div>

          <div className="space-y-4">
            {activeSpec.parameters.map((param) => {
              const currentVal = overrides[param.key] ?? param.defaultModifiedValue;
              return (
                <div key={param.key} className="omnis-surface-slate p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[var(--text-primary)]">{param.label}</span>
                    <span className="font-bold omnis-mono tone-blue shrink-0">
                      {currentVal} {param.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={currentVal}
                    aria-label={param.label}
                    onChange={(e) =>
                      setOverrides((prev) => ({
                        ...prev,
                        [param.key]: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-[var(--accent-blue)] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--text-muted)] omnis-mono">
                    <span>Min: {param.min}</span>
                    <span>Base: {param.baselineValue}</span>
                    <span>Max: {param.max}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    {param.description}
                  </p>
                </div>
              );
            })}

            {/* Timeframe Horizon & Seed */}
            <div className="omnis-surface-slate p-3.5 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="font-semibold text-[var(--text-primary)]">
                  Projection Timeframe Horizon
                </span>
                <span className="font-bold omnis-mono tone-violet">
                  {horizonYears} Years (2026–{2026 + horizonYears})
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={35}
                step={5}
                value={horizonYears}
                aria-label="Projection Timeframe Horizon"
                onChange={(e) => setHorizonYears(Number(e.target.value))}
                className="w-full accent-[var(--accent-violet)] cursor-pointer"
              />
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-[11px] text-[var(--text-secondary)]">
                  Monte Carlo Seed (500 paths):
                </span>
                <input
                  type="number"
                  value={seed}
                  aria-label="Monte Carlo Seed"
                  onChange={(e) => setSeed(Number(e.target.value) || 42)}
                  className="w-20 px-2.5 py-1 rounded-lg bg-[var(--bg-graphite)] border border-[var(--border-subtle)] text-xs font-semibold omnis-mono text-[var(--text-primary)]"
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
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Historical Observations (2023–2025) vs Baseline & Stochastic Projection
                </h3>
              </div>
            </div>

            <MonteCarloFanChart
              trajectory={simulationOutput.trajectory}
              units={simulationOutput.units}
            />

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-slate)] p-3.5 rounded-xl border border-[var(--border-subtle)]">
              <strong className="text-[var(--text-primary)]">Analytical Interpretation:</strong>{" "}
              {simulationOutput.analyticalExplanation}
            </p>
          </div>

          {/* Tornado Sensitivity Analysis & Model Governance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="omnis-card p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider tone-violet omnis-mono">
                <BarChart3 className="w-4 h-4" />
                <span>Tornado Parameter Sensitivity Analysis</span>
              </div>
              <TornadoSensitivityChart sensitivity={simulationOutput.sensitivity} />
            </div>

            <div className="omnis-card p-5 space-y-3 text-xs">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider tone-warning omnis-mono">
                <AlertCircle className="w-4 h-4" />
                <span>Model Assumptions & Epistemic Limitations</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] omnis-mono text-[11px] text-[var(--text-primary)] overflow-x-auto">
                {activeSpec.equationsLatex}
              </div>
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
