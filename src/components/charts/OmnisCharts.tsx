"use client";

import React, { useMemo, useState } from "react";
import { OmnisSegmentedControl } from "@/components/ui/OmnisPrimitives";
import type {
  CountryIntelligenceProfile,
  SimulationSensitivityItem,
  SimulationTrajectoryPoint,
} from "@/types/omnis";

type MetricKey = "gdpUsdBn" | "gdpPerCapitaUsd" | "renewableSharePct" | "internetPenetrationPct";

const METRIC_META: Record<
  MetricKey,
  { label: string; unit: string; format: (v: number) => string; colorVar: string }
> = {
  gdpUsdBn: {
    label: "Nominal GDP",
    unit: "USD Billions",
    format: (v) => `$${v.toLocaleString()}B`,
    colorVar: "var(--chart-blue)",
  },
  gdpPerCapitaUsd: {
    label: "GDP Per Capita",
    unit: "Current USD",
    format: (v) => `$${v.toLocaleString()}`,
    colorVar: "var(--chart-violet)",
  },
  renewableSharePct: {
    label: "Renewable Electricity",
    unit: "% of Total",
    format: (v) => `${v.toFixed(1)}%`,
    colorVar: "var(--chart-emerald)",
  },
  internetPenetrationPct: {
    label: "Internet Penetration",
    unit: "% Population",
    format: (v) => `${v.toFixed(1)}%`,
    colorVar: "var(--chart-amber)",
  },
};

export function HistoricalTrajectoryChart({
  country,
  compareCountry,
}: {
  country: CountryIntelligenceProfile;
  compareCountry?: CountryIntelligenceProfile | null;
}) {
  const [metric, setMetric] = useState<MetricKey>("gdpUsdBn");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const series = country.historicalSeries;
  const compareSeries = compareCountry && compareCountry.iso3 !== country.iso3
    ? compareCountry.historicalSeries
    : [];
  const meta = METRIC_META[metric];

  if (series.length === 0) {
    return (
      <div className="rounded-xl bg-[var(--bg-graphite)] border border-[var(--border-subtle)] p-6 text-center text-sm text-[var(--text-secondary)]">
        Historical multi-year time-series records were not returned for {country.name} ({country.iso3}).
      </div>
    );
  }

  const compareByYear = new Map(compareSeries.map((pt) => [pt.year, Number(pt[metric] ?? 0)]));
  const compareValues = compareSeries.length > 0
    ? series.map((s) => compareByYear.get(s.year)).filter((v): v is number => v !== undefined)
    : [];

  const values = series.map((s) => Number(s[metric] ?? 0));
  const combinedValues = [...values, ...compareValues];
  const minVal = Math.min(...combinedValues, 0);
  const rawMax = Math.max(...combinedValues, 1);
  const maxVal = rawMax === minVal ? minVal + 1 : rawMax * 1.12;

  const w = 640;
  const h = 248;
  const padL = 56;
  const padR = 20;
  const padT = 26;
  const padB = 34;

  const toX = (i: number) =>
    padL + (i / Math.max(1, series.length - 1)) * (w - padL - padR);
  const toY = (v: number) =>
    padT + (1 - (v - minVal) / (maxVal - minVal)) * (h - padT - padB);

  const points = series.map((s, i) => ({
    x: toX(i),
    y: toY(values[i]),
    year: s.year,
    val: values[i],
    compareVal: compareByYear.get(s.year),
    growth: s.gdpGrowthPct,
  }));

  const comparePoints = points
    .filter((p) => p.compareVal !== undefined)
    .map((p) => ({
      x: p.x,
      y: toY(p.compareVal!),
      year: p.year,
      val: p.compareVal!,
    }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const compareLinePath = comparePoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(h - padB).toFixed(1)} L ${points[0].x.toFixed(1)} ${(h - padB).toFixed(1)} Z`
      : "";

  const activePoint = hoverIdx !== null ? points[hoverIdx] : points[points.length - 1];
  const firstYear = series[0]?.year ?? 1970;
  const lastYear = series[series.length - 1]?.year ?? 2025;
  const inflectionMarkers = [
    { year: 1991, label: "1991 Shift" },
    { year: 2008, label: "2008 GFC" },
    { year: 2020, label: "2020 COVID" },
  ]
    .filter((m) => m.year >= firstYear && m.year <= lastYear && lastYear > firstYear)
    .map((m) => {
      const exactIdx = series.findIndex((s) => s.year === m.year);
      const frac =
        exactIdx >= 0
          ? exactIdx / Math.max(1, series.length - 1)
          : (m.year - firstYear) / Math.max(1, lastYear - firstYear);
      return {
        ...m,
        x: padL + frac * (w - padL - padR),
      };
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <OmnisSegmentedControl<MetricKey>
          groupId={`hist-metric-${country.iso3}`}
          ariaLabel="Historical Trajectory Metric"
          size="sm"
          value={metric}
          onChange={setMetric}
          options={(Object.keys(METRIC_META) as MetricKey[]).map((key) => ({
            value: key,
            label: METRIC_META[key].label,
          }))}
        />

        <div className="flex flex-wrap items-center gap-3 text-[13px] omnis-mono">
          {compareCountry && comparePoints.length > 0 && (
            <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-md bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs">
              <span className="inline-flex items-center gap-1 text-[var(--text-primary)] font-semibold">
                <span className="w-2.5 h-0.5 inline-block" style={{ backgroundColor: meta.colorVar }} />
                {country.iso3}
              </span>
              <span className="text-[var(--text-muted)]">vs</span>
              <span className="inline-flex items-center gap-1 tone-violet font-semibold">
                <span className="w-3 border-b-2 border-dashed border-[var(--chart-violet)] inline-block" />
                {compareCountry.iso3}
              </span>
            </div>
          )}
          {activePoint && (
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)]">{activePoint.year}:</span>
              <span className="font-bold text-[var(--text-primary)]">
                {meta.format(activePoint.val)}
              </span>
              {activePoint.compareVal !== undefined && compareCountry && (
                <span className="tone-violet font-semibold">
                  / {compareCountry.iso3}: {meta.format(activePoint.compareVal)}
                </span>
              )}
              <span className={activePoint.growth >= 0 ? "tone-verified" : "tone-danger"}>
                ({activePoint.growth >= 0 ? "+" : ""}
                {activePoint.growth}% GDP/yr)
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="relative rounded-xl bg-[var(--bg-graphite)] border border-[var(--border-subtle)] p-2">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-56 overflow-visible">
          <defs>
            <linearGradient id={`area-grad-${country.iso3}-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={meta.colorVar} stopOpacity="0.35" />
              <stop offset="100%" stopColor={meta.colorVar} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const val = minVal + frac * (maxVal - minVal);
            const y = toY(val);
            return (
              <g key={frac}>
                <line
                  x1={padL}
                  y1={y}
                  x2={w - padR}
                  y2={y}
                  stroke="var(--chart-grid)"
                  strokeDasharray="3,3"
                />
                <text
                  x={padL - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11.5"
                  fill="var(--chart-axis)"
                  className="omnis-mono"
                >
                  {metric === "gdpUsdBn" || metric === "gdpPerCapitaUsd"
                    ? val >= 1000
                      ? `${(val / 1000).toFixed(1)}k`
                      : val.toFixed(0)
                    : `${val.toFixed(0)}%`}
                </text>
              </g>
            );
          })}

          {inflectionMarkers.map((m) => (
            <g key={m.year}>
              <line
                x1={m.x}
                y1={padT}
                x2={m.x}
                y2={h - padB}
                stroke="var(--status-warning)"
                strokeDasharray="2,3"
                strokeOpacity="0.55"
              />
              <text
                x={m.x}
                y={padT - 7}
                textAnchor="middle"
                fontSize="10.5"
                fill="var(--status-warning)"
                className="omnis-mono"
              >
                {m.label}
              </text>
            </g>
          ))}

          {areaPath && (
            <path d={areaPath} fill={`url(#area-grad-${country.iso3}-${metric})`} />
          )}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={meta.colorVar}
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {compareLinePath && (
            <path
              d={compareLinePath}
              fill="none"
              stroke="var(--chart-violet)"
              strokeWidth="2.1"
              strokeDasharray="5,4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {activePoint && (
            <line
              x1={activePoint.x}
              y1={padT}
              x2={activePoint.x}
              y2={h - padB}
              stroke="var(--border-strong)"
              strokeDasharray="3,3"
            />
          )}

          {comparePoints.map((cp, idx) => (
            <circle
              key={`cmp-${cp.year}`}
              cx={cp.x}
              cy={cp.y}
              r={hoverIdx === idx ? 4.5 : 3}
              fill="var(--bg-graphite)"
              stroke="var(--chart-violet)"
              strokeWidth="1.8"
            />
          ))}

          {points.map((p, idx) => {
            const hovered = hoverIdx === idx;
            return (
              <g key={p.year}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={hovered ? 6 : 4}
                  fill="var(--bg-graphite)"
                  stroke={meta.colorVar}
                  strokeWidth={hovered ? 3 : 2.2}
                />
                <text
                  x={p.x}
                  y={h - 9}
                  textAnchor="middle"
                  fontSize="11.5"
                  fill="var(--chart-axis)"
                  className="omnis-mono"
                >
                  {p.year}
                </text>
                <rect
                  x={p.x - 24}
                  y={padT}
                  width={48}
                  height={h - padT - padB}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoverIdx(idx)}
                  onMouseLeave={() => setHoverIdx(null)}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function MonteCarloFanChart({
  trajectory,
  units,
}: {
  trajectory: SimulationTrajectoryPoint[];
  units: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showBaseline, setShowBaseline] = useState(true);
  const [showUncertainty, setShowUncertainty] = useState(true);

  const w = 740;
  const h = 324;
  const padL = 60;
  const padR = 28;
  const padT = 30;
  const padB = 38;

  const { minVal, maxVal } = useMemo(() => {
    const vals = trajectory.flatMap((p) => [p.baseline, p.modifiedP10, p.modifiedP90]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = Math.max(1, max - min);
    return { minVal: min - span * 0.08, maxVal: max + span * 0.08 };
  }, [trajectory]);

  const toX = (i: number) =>
    padL + (i / Math.max(1, trajectory.length - 1)) * (w - padL - padR);
  const toY = (v: number) =>
    padT + (1 - (v - minVal) / Math.max(0.0001, maxVal - minVal)) * (h - padT - padB);

  const baselinePath = trajectory
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.baseline)}`)
    .join(" ");
  const modifiedP50Path = trajectory
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.modifiedP50)}`)
    .join(" ");

  const outerUpper = trajectory.map((p, i) => `${toX(i)},${toY(p.modifiedP90)}`).join(" ");
  const outerLower = [...trajectory]
    .reverse()
    .map((p, rIdx) => `${toX(trajectory.length - 1 - rIdx)},${toY(p.modifiedP10)}`)
    .join(" ");

  // Inner P25-P75 core confidence envelope interpolated smoothly between P10/P50/P90
  const innerUpper = trajectory
    .map((p, i) => `${toX(i)},${toY((p.modifiedP50 + p.modifiedP90) / 2)}`)
    .join(" ");
  const innerLower = [...trajectory]
    .reverse()
    .map(
      (p, rIdx) =>
        `${toX(trajectory.length - 1 - rIdx)},${toY((p.modifiedP50 + p.modifiedP10) / 2)}`
    )
    .join(" ");

  const hovered =
    hoverIndex !== null ? trajectory[hoverIndex] : trajectory[trajectory.length - 1];
  const boundaryIdx = Math.min(3, Math.max(0, trajectory.length - 1));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBaseline((s) => !s)}
            className={`px-2.5 py-1 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
              showBaseline
                ? "bg-[var(--bg-slate)] border-[var(--border-strong)] text-[var(--text-primary)]"
                : "border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60"
            }`}
          >
            <span className="w-3 h-0.5 border-b-2 border-dashed border-[var(--chart-axis)]" />
            Baseline Reference
          </button>
          <button
            type="button"
            onClick={() => setShowUncertainty((s) => !s)}
            className={`px-2.5 py-1 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
              showUncertainty
                ? "bg-[var(--bg-slate)] border-[var(--border-strong)] text-[var(--text-primary)]"
                : "border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60"
            }`}
          >
            <span className="w-3 h-2.5 rounded-xs bg-[var(--chart-blue-area)] border border-[var(--chart-blue)]" />
            P10–P90 Confidence Band
          </button>
        </div>

        {hovered && (
          <div className="px-3 py-1 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] omnis-mono text-xs flex flex-wrap items-center gap-3">
            <span className="font-bold text-[var(--text-primary)]">{hovered.year}</span>
            <span className="tone-blue font-semibold">
              P50: {hovered.modifiedP50} {units.split(" ")[0]}
            </span>
            <span className="text-[var(--text-muted)]">
              [{hovered.modifiedP10} – {hovered.modifiedP90}]
            </span>
            <span className="text-[var(--text-secondary)]">Base: {hovered.baseline}</span>
          </div>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-72 min-w-[460px]">
          <defs>
            <linearGradient id="mc-fan-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-blue)" stopOpacity="0.24" />
              <stop offset="100%" stopColor="var(--chart-blue)" stopOpacity="0.06" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const val = minVal + frac * (maxVal - minVal);
            const y = toY(val);
            return (
              <g key={frac}>
                <line
                  x1={padL}
                  y1={y}
                  x2={w - padR}
                  y2={y}
                  stroke="var(--chart-grid)"
                  strokeDasharray="3,3"
                />
                <text
                  x={padL - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11.5"
                  fill="var(--chart-axis)"
                  className="omnis-mono"
                >
                  {val.toFixed(1)}
                </text>
              </g>
            );
          })}

          <line
            x1={toX(boundaryIdx)}
            y1={padT}
            x2={toX(boundaryIdx)}
            y2={h - padB}
            stroke="var(--status-warning)"
            strokeDasharray="4,4"
            strokeWidth="1.2"
          />
          <text
            x={toX(boundaryIdx) + 6}
            y={padT + 12}
            fontSize="11"
            fill="var(--status-warning)"
            className="omnis-mono"
          >
            2026 Measured → Simulated
          </text>

          {showUncertainty && (
            <>
              <polygon
                points={`${outerUpper} ${outerLower}`}
                fill="url(#mc-fan-grad)"
                stroke="var(--chart-blue)"
                strokeOpacity="0.28"
                strokeWidth="1"
              />
              <polygon
                points={`${innerUpper} ${innerLower}`}
                fill="var(--chart-blue-area)"
                fillOpacity="0.45"
              />
            </>
          )}

          {showBaseline && (
            <path
              d={baselinePath}
              fill="none"
              stroke="var(--chart-axis)"
              strokeWidth="2"
              strokeDasharray="5,4"
            />
          )}

          <path
            d={modifiedP50Path}
            fill="none"
            stroke="var(--chart-blue)"
            strokeWidth="2.8"
            strokeLinecap="round"
          />

          {hoverIndex !== null && (
            <g>
              <line
                x1={toX(hoverIndex)}
                y1={padT}
                x2={toX(hoverIndex)}
                y2={h - padB}
                stroke="var(--accent-blue)"
                strokeWidth="1.2"
              />
              <circle
                cx={toX(hoverIndex)}
                cy={toY(trajectory[hoverIndex].modifiedP50)}
                r={5}
                fill="var(--bg-graphite)"
                stroke="var(--chart-blue)"
                strokeWidth="2.5"
              />
            </g>
          )}

          {trajectory.map((pt, i) => (
            <g key={pt.year}>
              {(i % 3 === 0 || i === trajectory.length - 1) && (
                <text
                  x={toX(i)}
                  y={h - 9}
                  textAnchor="middle"
                  fontSize="11.5"
                  fill="var(--chart-axis)"
                  className="omnis-mono"
                >
                  {pt.year}
                </text>
              )}
              <rect
                x={toX(i) - 16}
                y={padT}
                width={32}
                height={h - padT - padB}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export function TornadoSensitivityChart({
  sensitivity,
}: {
  sensitivity: SimulationSensitivityItem[];
}) {
  const maxAbs = Math.max(
    0.01,
    ...sensitivity.flatMap((s) => [Math.abs(s.lowOutcomeDelta), Math.abs(s.highOutcomeDelta)])
  );

  const fmtSigned = (n: number) => `${n > 0 ? "+" : ""}${n}`;

  return (
    <div className="space-y-3">
      {sensitivity.map((item) => {
        const negDelta = Math.min(0, item.lowOutcomeDelta, item.highOutcomeDelta);
        const posDelta = Math.max(0, item.lowOutcomeDelta, item.highOutcomeDelta);
        const leftWidth = Math.min(48, (Math.abs(negDelta) / maxAbs) * 48);
        const rightWidth = Math.min(48, (Math.abs(posDelta) / maxAbs) * 48);
        return (
          <div key={item.parameterKey} className="space-y-1.5 text-[13px] sm:text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[var(--text-primary)]">{item.label}</span>
              <span className="omnis-mono omnis-tabular text-xs sm:text-[13px] text-[var(--text-muted)] shrink-0">
                min {fmtSigned(item.lowOutcomeDelta)} / max {fmtSigned(item.highOutcomeDelta)}
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-[var(--bg-slate)] border border-[var(--border-subtle)] overflow-hidden">
              {/* Center zero axis */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[var(--text-muted)] opacity-50 z-10" />
              {/* Contraction / negative wing extending left from 50% */}
              {leftWidth > 0 ? (
                <div
                  className="absolute top-0 bottom-0 rounded-l-full"
                  style={{
                    right: "50%",
                    width: `${leftWidth}%`,
                    backgroundColor: "var(--status-danger)",
                    opacity: 0.82,
                  }}
                />
              ) : null}
              {/* Expansion / positive wing extending right from 50% */}
              {rightWidth > 0 ? (
                <div
                  className="absolute top-0 bottom-0 rounded-r-full"
                  style={{
                    left: "50%",
                    width: `${rightWidth}%`,
                    backgroundColor: "var(--status-verified)",
                    opacity: 0.85,
                  }}
                />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ComparisonRadarChart({
  leftCountry,
  rightCountry,
}: {
  leftCountry: CountryIntelligenceProfile;
  rightCountry: CountryIntelligenceProfile;
}) {
  const [hoveredAxis, setHoveredAxis] = useState<number | null>(null);

  const radarAxes = [
    {
      label: "Real Growth",
      maxLabel: "-2..+10%",
      l: Math.max(0, Math.min(1, (leftCountry.gdpGrowthPct - -2) / 12)),
      r: Math.max(0, Math.min(1, (rightCountry.gdpGrowthPct - -2) / 12)),
      rawL: `${leftCountry.gdpGrowthPct >= 0 ? "+" : ""}${leftCountry.gdpGrowthPct}%`,
      rawR: `${rightCountry.gdpGrowthPct >= 0 ? "+" : ""}${rightCountry.gdpGrowthPct}%`,
      deltaLabel: `${leftCountry.gdpGrowthPct - rightCountry.gdpGrowthPct >= 0 ? "+" : ""}${(
        leftCountry.gdpGrowthPct - rightCountry.gdpGrowthPct
      ).toFixed(1)} pp`,
    },
    {
      label: "Clean Energy",
      maxLabel: "0..100%",
      l: Math.max(0, Math.min(1, leftCountry.energyProfile.renewableSharePct / 100)),
      r: Math.max(0, Math.min(1, rightCountry.energyProfile.renewableSharePct / 100)),
      rawL: `${leftCountry.energyProfile.renewableSharePct}%`,
      rawR: `${rightCountry.energyProfile.renewableSharePct}%`,
      deltaLabel: `${leftCountry.energyProfile.renewableSharePct - rightCountry.energyProfile.renewableSharePct >= 0 ? "+" : ""}${(
        leftCountry.energyProfile.renewableSharePct - rightCountry.energyProfile.renewableSharePct
      ).toFixed(1)} pp`,
    },
    {
      label: "AI Index",
      maxLabel: "0..100",
      l: Math.max(0, Math.min(1, leftCountry.technologyProfile.aiReadinessIndex / 100)),
      r: Math.max(0, Math.min(1, rightCountry.technologyProfile.aiReadinessIndex / 100)),
      rawL: `${leftCountry.technologyProfile.aiReadinessIndex}/100`,
      rawR: `${rightCountry.technologyProfile.aiReadinessIndex}/100`,
      deltaLabel: `${leftCountry.technologyProfile.aiReadinessIndex - rightCountry.technologyProfile.aiReadinessIndex >= 0 ? "+" : ""}${
        leftCountry.technologyProfile.aiReadinessIndex - rightCountry.technologyProfile.aiReadinessIndex
      } pts`,
    },
    {
      label: "R&D Spend",
      maxLabel: "0..4.5%",
      l: Math.max(0, Math.min(1, leftCountry.technologyProfile.rdSpendPctGdp / 4.5)),
      r: Math.max(0, Math.min(1, rightCountry.technologyProfile.rdSpendPctGdp / 4.5)),
      rawL: `${leftCountry.technologyProfile.rdSpendPctGdp}%`,
      rawR: `${rightCountry.technologyProfile.rdSpendPctGdp}%`,
      deltaLabel: `${leftCountry.technologyProfile.rdSpendPctGdp - rightCountry.technologyProfile.rdSpendPctGdp >= 0 ? "+" : ""}${(
        leftCountry.technologyProfile.rdSpendPctGdp - rightCountry.technologyProfile.rdSpendPctGdp
      ).toFixed(2)}% GDP`,
    },
    {
      label: "Internet",
      maxLabel: "0..100%",
      l: Math.max(0, Math.min(1, leftCountry.technologyProfile.internetPenetrationPct / 100)),
      r: Math.max(0, Math.min(1, rightCountry.technologyProfile.internetPenetrationPct / 100)),
      rawL: `${leftCountry.technologyProfile.internetPenetrationPct}%`,
      rawR: `${rightCountry.technologyProfile.internetPenetrationPct}%`,
      deltaLabel: `${leftCountry.technologyProfile.internetPenetrationPct - rightCountry.technologyProfile.internetPenetrationPct >= 0 ? "+" : ""}${(
        leftCountry.technologyProfile.internetPenetrationPct -
        rightCountry.technologyProfile.internetPenetrationPct
      ).toFixed(1)} pp`,
    },
    {
      label: "Longevity",
      maxLabel: "50..90y",
      l: Math.max(0, Math.min(1, (leftCountry.lifeExpectancyYears - 50) / 40)),
      r: Math.max(0, Math.min(1, (rightCountry.lifeExpectancyYears - 50) / 40)),
      rawL: `${leftCountry.lifeExpectancyYears} yrs`,
      rawR: `${rightCountry.lifeExpectancyYears} yrs`,
      deltaLabel: `${leftCountry.lifeExpectancyYears - rightCountry.lifeExpectancyYears >= 0 ? "+" : ""}${(
        leftCountry.lifeExpectancyYears - rightCountry.lifeExpectancyYears
      ).toFixed(1)} yrs`,
    },
  ];

  const cx = 210;
  const cy = 165;
  const zeroRingRadius = 18;
  const radius = 104;

  const getCoord = (idx: number, val: number) => {
    const angle = (Math.PI * 2 * idx) / radarAxes.length - Math.PI / 2;
    const normalized = Math.max(0, Math.min(1, val));
    const r = zeroRingRadius + (radius - zeroRingRadius) * normalized;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const buildPolygon = (key: "l" | "r") =>
    radarAxes
      .map((axis, i) => {
        const pt = getCoord(i, axis[key]);
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      })
      .join(" ");

  const activeAxis = hoveredAxis !== null ? radarAxes[hoveredAxis] : null;
  const contractionNotes = [
    leftCountry.gdpGrowthPct < -2
      ? `${leftCountry.iso3}: ${leftCountry.gdpGrowthPct}% contraction`
      : null,
    rightCountry.gdpGrowthPct < -2
      ? `${rightCountry.iso3}: ${rightCountry.gdpGrowthPct}% contraction`
      : null,
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      <svg viewBox="0 0 420 330" className="w-full h-64 mx-auto">
        {/* Explicit 0% inner reference ring */}
        <circle
          cx={cx}
          cy={cy}
          r={zeroRingRadius}
          fill="none"
          stroke="var(--chart-axis)"
          strokeOpacity={0.55}
          strokeDasharray="2,2"
        />
        <text
          x={cx + 3}
          y={cy - zeroRingRadius + 9}
          fontSize="9.5"
          fill="var(--text-muted)"
          className="omnis-mono"
        >
          min
        </text>
        {[0.25, 0.5, 0.75, 1.0].map((ring) => {
          const r = zeroRingRadius + (radius - zeroRingRadius) * ring;
          return (
            <g key={ring}>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="var(--chart-grid)"
                strokeDasharray="3,3"
              />
              <text
                x={cx + 4}
                y={cy - r + 9}
                fontSize="9"
                fill="var(--text-muted)"
                className="omnis-mono"
              >
                {Math.round(ring * 100)}%
              </text>
            </g>
          );
        })}
        {radarAxes.map((axis, i) => {
          const angle = (Math.PI * 2 * i) / radarAxes.length - Math.PI / 2;
          const x2 = cx + radius * Math.cos(angle);
          const y2 = cy + radius * Math.sin(angle);
          const lx = cx + (radius + 44) * Math.cos(angle);
          const ly = cy + (radius + 24) * Math.sin(angle);
          return (
            <g
              key={axis.label}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredAxis(i)}
              onMouseLeave={() => setHoveredAxis(null)}
              onClick={() => setHoveredAxis((prev) => (prev === i ? null : i))}
            >
              <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="var(--chart-grid)" strokeWidth="1.2" />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                fontSize="11.5"
                fontWeight={hoveredAxis === i ? "700" : "500"}
                fill={hoveredAxis === i ? "var(--text-primary)" : "var(--chart-axis)"}
                className="omnis-mono"
              >
                {axis.label}
              </text>
              <text
                x={lx}
                y={ly + 12}
                textAnchor="middle"
                fontSize="9.5"
                fill="var(--text-muted)"
                className="omnis-mono"
              >
                [{axis.maxLabel}]
              </text>
            </g>
          );
        })}

        <polygon
          points={buildPolygon("r")}
          fill="var(--chart-violet-area)"
          stroke="var(--chart-violet)"
          strokeWidth="2.1"
        />
        <polygon
          points={buildPolygon("l")}
          fill="var(--chart-blue-area)"
          stroke="var(--chart-blue)"
          strokeWidth="2.4"
        />

        {radarAxes.map((axis, i) => {
          const pl = getCoord(i, axis.l);
          const pr = getCoord(i, axis.r);
          return (
            <g
              key={`dots-${axis.label}`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredAxis(i)}
              onClick={() => setHoveredAxis((prev) => (prev === i ? null : i))}
            >
              <circle cx={pr.x} cy={pr.y} r={hoveredAxis === i ? 5 : 3.5} fill="var(--chart-violet)" />
              <circle cx={pl.x} cy={pl.y} r={hoveredAxis === i ? 5.2 : 3.8} fill="var(--chart-blue)" />
            </g>
          );
        })}
      </svg>

      {contractionNotes.length > 0 ? (
        <div className="px-2.5 py-1.5 rounded-md badge-tone-warning text-xs omnis-mono text-center">
          Severe contraction clamped to domain min (-2%): {contractionNotes.join(" • ")}
        </div>
      ) : null}

      {activeAxis ? (
        <div className="omnis-surface-slate px-3 py-2 text-[13px] flex flex-wrap items-center justify-between gap-2 omnis-mono">
          <span className="font-bold text-[var(--text-primary)]">{activeAxis.label}</span>
          <span className="tone-blue font-semibold">
            {leftCountry.iso3}: {activeAxis.rawL}
          </span>
          <span className="tone-violet font-semibold">
            {rightCountry.iso3}: {activeAxis.rawR}
          </span>
          <span className="px-1.5 py-0.5 rounded badge-tone-blue text-xs font-bold">
            Δ {activeAxis.deltaLabel}
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-4 text-[13px]">
          <span className="inline-flex items-center gap-1.5 font-semibold tone-blue">
            <span className="w-3 h-3 rounded-xs bg-[var(--chart-blue)]" />
            {leftCountry.name} ({leftCountry.iso3})
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold tone-violet">
            <span className="w-3 h-3 rounded-xs bg-[var(--chart-violet)]" />
            {rightCountry.name} ({rightCountry.iso3})
          </span>
          <span className="text-xs text-[var(--text-muted)] omnis-mono">
            Hover or tap any axis for vertex delta
          </span>
        </div>
      )}
    </div>
  );
}
