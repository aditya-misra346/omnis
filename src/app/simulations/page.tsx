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

  // Compute SVG coordinates for trajectory fan chart
  const pts = simulationOutput.trajectory;
  const allVals = pts.flatMap((p) => [p.baseline, p.modifiedP10, p.modifiedP90]);
  const minVal = Math.min(...allVals) * 0.96;
  const maxVal = Math.max(...allVals) * 1.04;
  const chartW = 740;
  const chartH = 310;
  const padL = 52;
  const padR = 24;
  const padT = 22;
  const padB = 34;

  const toX = (idx: number) =>
    padL + (idx / Math.max(1, pts.length - 1)) * (chartW - padL - padR);
  const toY = (val: number) =>
    padT +
    (1 - (val - minVal) / Math.max(0.0001, maxVal - minVal)) * (chartH - padT - padB);

  const baselinePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.baseline)}`)
    .join(" ");
  const modifiedP50Path = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.modifiedP50)}`)
    .join(" ");

  const bandUpper = pts.map((p, i) => `${toX(i)},${toY(p.modifiedP90)}`).join(" ");
  const bandLower = [...pts]
    .reverse()
    .map((p, revIdx) => {
      const i = pts.length - 1 - revIdx;
      return `${toX(i)},${toY(p.modifiedP10)}`;
    })
    .join(" ");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Category Tabs */}
      <div className="omnis-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">
              <Sliders className="w-3.5 h-3.5" />
              <span>MODULE 03 • WHAT-IF SCENARIO & MONTE CARLO SIMULATION ENGINE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">{activeSpec.title}</h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {activeSpec.subtitle} • Model: <span className="omnis-mono">{activeSpec.modelName}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveExperiment}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              {savedNotice ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              <span>{savedNotice ? "Experiment Saved" : "Save Experiment"}</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Category Selector */}
        <div className="flex flex-wrap gap-2 pt-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                category === c.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Simulation Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Parameter Controls */}
        <div className="lg:col-span-4 omnis-card p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <h2 className="text-sm font-bold">Scenario Variables & Assumptions</h2>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Baseline
            </button>
          </div>

          <div className="space-y-4">
            {activeSpec.parameters.map((param) => {
              const currentVal = overrides[param.key] ?? param.defaultModifiedValue;
              return (
                <div key={param.key} className="omnis-surface-slate p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">{param.label}</span>
                    <span className="font-bold omnis-mono text-blue-400">
                      {currentVal} {param.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={currentVal}
                    onChange={(e) =>
                      setOverrides((prev) => ({
                        ...prev,
                        [param.key]: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--text-muted)] omnis-mono">
                    <span>Min: {param.min}</span>
                    <span>Baseline: {param.baselineValue}</span>
                    <span>Max: {param.max}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">{param.description}</p>
                </div>
              );
            })}

            {/* Timeframe Horizon & Seed */}
            <div className="omnis-surface-slate p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="font-semibold">Projection Timeframe Horizon</span>
                <span className="font-bold omnis-mono text-violet-400">
                  {horizonYears} Years (2026–{2026 + horizonYears})
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={35}
                step={5}
                value={horizonYears}
                onChange={(e) => setHorizonYears(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Monte Carlo Seed (500 paths):
                </span>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(Number(e.target.value) || 42)}
                  className="w-20 px-2 py-1 rounded bg-[var(--bg-graphite)] border border-[var(--border-subtle)] text-xs omnis-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Trajectory Chart, Sensitivity & Epistemic Separation */}
        <div className="lg:col-span-8 space-y-6">
          {/* Summary KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="omnis-card p-4">
              <div className="text-[10px] uppercase text-[var(--text-muted)]">
                Baseline Terminal ({2026 + horizonYears})
              </div>
              <div className="text-xl font-bold omnis-mono mt-1">
                {simulationOutput.summaryMetrics.baselineTerminal}
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">{simulationOutput.units}</div>
            </div>
            <div className="omnis-card p-4">
              <div className="text-[10px] uppercase text-[var(--text-muted)]">
                Modified Median (P50)
              </div>
              <div className="text-xl font-bold omnis-mono mt-1 text-blue-400">
                {simulationOutput.summaryMetrics.modifiedMedianTerminal}
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">500-Path Median</div>
            </div>
            <div className="omnis-card p-4">
              <div className="text-[10px] uppercase text-[var(--text-muted)]">
                Divergence vs Baseline
              </div>
              <div
                className={`text-xl font-bold omnis-mono mt-1 ${
                  simulationOutput.summaryMetrics.percentageDelta >= 0
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {simulationOutput.summaryMetrics.percentageDelta >= 0 ? "+" : ""}
                {simulationOutput.summaryMetrics.percentageDelta}%
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">Relative Shift</div>
            </div>
            <div className="omnis-card p-4">
              <div className="text-[10px] uppercase text-[var(--text-muted)]">
                Uncertainty Band (P90 - P10)
              </div>
              <div className="text-xl font-bold omnis-mono mt-1 text-violet-400">
                ±{(simulationOutput.summaryMetrics.uncertaintySpreadP90MinusP10 / 2).toFixed(2)}
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">80% Confidence Interval</div>
            </div>
          </div>

          {/* Trajectory Fan Chart */}
          <div className="omnis-card p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold">
                  Historical Observations (2023–2025) vs Baseline & Stochastic Projection
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-slate-400 inline-block" /> Baseline
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-blue-500 inline-block" /> Modified P50
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-2.5 bg-blue-500/20 border border-blue-500/40 inline-block" />{" "}
                  P10–P90 Band
                </span>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-72">
                {/* Horizontal grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                  const val = minVal + frac * (maxVal - minVal);
                  const y = toY(val);
                  return (
                    <g key={frac}>
                      <line
                        x1={padL}
                        y1={y}
                        x2={chartW - padR}
                        y2={y}
                        stroke="rgba(148,163,184,0.14)"
                        strokeDasharray="3,3"
                      />
                      <text
                        x={padL - 8}
                        y={y + 4}
                        textAnchor="end"
                        fontSize="10"
                        fill="#94a3b8"
                        fontFamily="monospace"
                      >
                        {val.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* 2026 Observed -> Simulated Boundary Line */}
                <line
                  x1={toX(3)}
                  y1={padT}
                  x2={toX(3)}
                  y2={chartH - padB}
                  stroke="#f59e0b"
                  strokeDasharray="4,4"
                  strokeWidth="1.2"
                />
                <text x={toX(3) + 6} y={padT + 12} fontSize="9.5" fill="#fbbf24" fontFamily="monospace">
                  2026 Measured → Simulated
                </text>

                {/* P10-P90 Monte Carlo Polygon */}
                <polygon
                  points={`${bandUpper} ${bandLower}`}
                  fill="rgba(59, 130, 246, 0.18)"
                  stroke="rgba(59, 130, 246, 0.35)"
                  strokeWidth="1"
                />

                {/* Baseline Trajectory */}
                <path
                  d={baselinePath}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeDasharray="5,4"
                />

                {/* Modified Median P50 Trajectory */}
                <path d={modifiedP50Path} fill="none" stroke="#3b82f6" strokeWidth="2.8" />

                {/* X-axis Year Labels */}
                {pts.map((pt, i) =>
                  i % 3 === 0 || i === pts.length - 1 ? (
                    <text
                      key={pt.year}
                      x={toX(i)}
                      y={chartH - 10}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#94a3b8"
                      fontFamily="monospace"
                    >
                      {pt.year}
                    </text>
                  ) : null
                )}
              </svg>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-slate)] p-3 rounded-lg border border-[var(--border-subtle)]">
              <strong>Analytical Interpretation:</strong> {simulationOutput.analyticalExplanation}
            </p>
          </div>

          {/* Tornado Sensitivity Analysis & Model Governance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="omnis-card p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-400">
                <BarChart3 className="w-4 h-4" />
                <span>Tornado Parameter Sensitivity Analysis</span>
              </div>
              <div className="space-y-3">
                {simulationOutput.sensitivity.map((s) => (
                  <div key={s.parameterKey} className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="font-medium">{s.label}</span>
                      <span className="omnis-mono text-[11px] text-[var(--text-muted)]">
                        [{s.lowOutcomeDelta}, +{s.highOutcomeDelta}]
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-[var(--bg-slate)] flex overflow-hidden">
                      <div
                        className="bg-rose-500/75 h-full"
                        style={{ width: `${Math.min(50, Math.abs(s.lowOutcomeDelta) * 4)}%` }}
                      />
                      <div
                        className="bg-emerald-500/80 h-full"
                        style={{ width: `${Math.min(50, Math.abs(s.highOutcomeDelta) * 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="omnis-card p-5 space-y-3 text-xs">
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <span>Model Assumptions & Epistemic Limitations</span>
              </div>
              <div className="p-2.5 rounded bg-[var(--bg-slate)] omnis-mono text-[11px] overflow-x-auto">
                {activeSpec.equationsLatex}
              </div>
              <ul className="space-y-1.5 text-[var(--text-secondary)] list-disc pl-4">
                {simulationOutput.initialAssumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
                {simulationOutput.limitations.map((lim) => (
                  <li key={lim} className="text-amber-400/90">
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
    <Suspense fallback={<div className="p-8 text-sm">Loading Simulation Engine...</div>}>
      <SimulationsContent />
    </Suspense>
  );
}
