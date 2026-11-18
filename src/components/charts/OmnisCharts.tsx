"use client";

import React, { useMemo, useState } from "react";
import { OmnisSegmentedControl } from "@/components/ui/OmnisPrimitives";
import {
  formatMonetaryAxisTick,
  formatMultipleOrGap,
  formatSignedPct,
  formatSignedValue,
  getEffectiveGdpUsdBn,
  hasSectorMetricValue,
} from "@/lib/formatters";

/** Maps a pointer clientX coordinate inside an SVG viewBox plot area to the nearest data index. */
function resolveSvgPlotIndex(
  clientX: number,
  svgEl: SVGSVGElement,
  viewBoxWidth: number,
  padL: number,
  padR: number,
  count: number
): number | null {
  if (count <= 0) return null;
  if (count === 1) return 0;
  const rect = svgEl.getBoundingClientRect();
  if (rect.width <= 0) return null;
  const svgX = ((clientX - rect.left) / rect.width) * viewBoxWidth;
  const frac = Math.max(0, Math.min(1, (svgX - padL) / Math.max(1, viewBoxWidth - padL - padR)));
  return Math.max(0, Math.min(count - 1, Math.round(frac * (count - 1))));
}
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
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const firstYear = series[0]?.year ?? 1970;
  const lastYear = series[series.length - 1]?.year ?? 2025;
  const spanSummary = (() => {
    if (!firstPoint || !lastPoint || lastYear <= firstYear) return null;
    if (firstPoint.val > 0 && lastPoint.val > 0) {
      const ratio = lastPoint.val / firstPoint.val;
      if (ratio >= 1.5) {
        return `Grew ${ratio.toFixed(1)}× between ${firstYear} and ${lastYear}`;
      }
      const pct = ((lastPoint.val - firstPoint.val) / firstPoint.val) * 100;
      return `${pct >= 0 ? "Up" : "Down"} ${formatSignedPct(pct, 0).replace(/^[+-]/, "")} between ${firstYear} and ${lastYear}`;
    }
    return null;
  })();
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

        <div className="flex flex-wrap items-center gap-2.5 text-[13px] omnis-mono">
          {spanSummary && (
            <span className="px-2 py-0.5 rounded-md badge-tone-blue font-sans text-xs font-semibold">
              {spanSummary}
            </span>
          )}
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
                ({formatSignedPct(activePoint.growth)} GDP/yr)
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="relative rounded-xl bg-[var(--bg-graphite)] border border-[var(--border-subtle)] p-2">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-56 overflow-visible touch-pan-y select-none"
          onPointerDown={(e) => {
            const idx = resolveSvgPlotIndex(e.clientX, e.currentTarget, w, padL, padR, points.length);
            if (idx !== null) setHoverIdx(idx);
          }}
          onPointerMove={(e) => {
            const idx = resolveSvgPlotIndex(e.clientX, e.currentTarget, w, padL, padR, points.length);
            if (idx !== null) setHoverIdx(idx);
          }}
          onPointerLeave={() => setHoverIdx(null)}
          onPointerCancel={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id={`area-grad-${country.iso3}-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={meta.colorVar} stopOpacity="0.35" />
              <stop offset="100%" stopColor={meta.colorVar} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const val = minVal + frac * (maxVal - minVal);
            const y = toY(val);
            const tickStep = (maxVal - minVal) / 4;
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
                    ? formatMonetaryAxisTick(val, metric, tickStep)
                    : `${tickStep <= 1.25 ? val.toFixed(1) : val.toFixed(0)}%`}
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
            const tickStep = Math.max(1, Math.ceil(points.length / 5));
            const minTerminalGap = Math.max(2, Math.floor(tickStep * 0.6));
            const showTickLabel =
              points.length <= 6 ||
              idx === 0 ||
              idx === points.length - 1 ||
              (idx % tickStep === 0 && points.length - 1 - idx >= minTerminalGap);
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
                {showTickLabel && (
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
                )}
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
  const padR = 96;
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
  const lastIdx = Math.max(0, trajectory.length - 1);
  const terminalPt = trajectory[lastIdx];
  const rawBaseEndY = terminalPt ? toY(terminalPt.baseline) : padT;
  const rawModEndY = terminalPt ? toY(terminalPt.modifiedP50) : padT;
  const endpointDeCollide = Math.abs(rawBaseEndY - rawModEndY) < 18;
  const baseLabelY =
    endpointDeCollide && rawBaseEndY <= rawModEndY
      ? Math.max(padT + 10, rawBaseEndY - 8)
      : endpointDeCollide
        ? Math.min(h - padB - 6, rawBaseEndY + 12)
        : rawBaseEndY + 4;
  const modLabelY =
    endpointDeCollide && rawModEndY < rawBaseEndY
      ? Math.max(padT + 10, rawModEndY - 8)
      : endpointDeCollide
        ? Math.min(h - padB - 6, rawModEndY + 12)
        : rawModEndY + 4;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBaseline((s) => !s)}
            className={`min-h-[44px] md:min-h-[32px] px-3 md:px-2.5 py-1.5 md:py-1 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
              showBaseline
                ? "bg-[var(--bg-slate)] border-[var(--border-strong)] text-[var(--text-primary)]"
                : "border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60"
            }`}
          >
            <span className="w-3 h-0.5 border-b-2 border-dashed border-[var(--chart-axis)]" />
            Expected Trend
          </button>
          <button
            type="button"
            onClick={() => setShowUncertainty((s) => !s)}
            className={`min-h-[44px] md:min-h-[32px] px-3 md:px-2.5 py-1.5 md:py-1 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
              showUncertainty
                ? "bg-[var(--bg-slate)] border-[var(--border-strong)] text-[var(--text-primary)]"
                : "border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60"
            }`}
          >
            <span className="w-3 h-2.5 rounded-xs bg-[var(--chart-blue-area)] border border-[var(--chart-blue)]" />
            Likely range (8 of 10 runs)
          </button>
        </div>

        {hovered && (
          <div className="px-3 py-1 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] omnis-mono text-xs flex flex-wrap items-center gap-3">
            <span className="font-bold text-[var(--text-primary)]">{hovered.year}</span>
            <span className="tone-blue font-semibold">
              Scenario: {hovered.modifiedP50} {units.split(" ")[0]}
            </span>
            <span className="text-[var(--text-muted)]">
              [{hovered.modifiedP10}–{hovered.modifiedP90}]
            </span>
            <span className="text-[var(--text-secondary)]">Trend: {hovered.baseline}</span>
          </div>
        )}
      </div>

      <div className="w-full">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-60 sm:h-72 touch-pan-y select-none"
          onPointerDown={(e) => {
            const idx = resolveSvgPlotIndex(e.clientX, e.currentTarget, w, padL, padR, trajectory.length);
            if (idx !== null) setHoverIndex(idx);
          }}
          onPointerMove={(e) => {
            const idx = resolveSvgPlotIndex(e.clientX, e.currentTarget, w, padL, padR, trajectory.length);
            if (idx !== null) setHoverIndex(idx);
          }}
          onPointerLeave={() => setHoverIndex(null)}
          onPointerCancel={() => setHoverIndex(null)}
        >
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

          {terminalPt && (
            <g>
              {showBaseline && (
                <>
                  <circle
                    cx={toX(lastIdx)}
                    cy={rawBaseEndY}
                    r={3.5}
                    fill="var(--chart-axis)"
                  />
                  <text
                    x={toX(lastIdx) + 7}
                    y={baseLabelY}
                    fontSize="11.5"
                    fontWeight="600"
                    fill="var(--chart-axis)"
                    className="omnis-mono"
                  >
                    Trend {terminalPt.baseline}
                  </text>
                </>
              )}
              <circle
                cx={toX(lastIdx)}
                cy={rawModEndY}
                r={4.2}
                fill="var(--chart-blue)"
              />
              <text
                x={toX(lastIdx) + 7}
                y={modLabelY}
                fontSize="11.5"
                fontWeight="700"
                fill="var(--chart-blue)"
                className="omnis-mono"
              >
                Scenario {terminalPt.modifiedP50}
              </text>
            </g>
          )}

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

          {trajectory.map((pt, i) => {
            const tickStep = trajectory.length > 24 ? 5 : trajectory.length > 13 ? 3 : 2;
            const minTerminalGap = Math.max(2, Math.floor(tickStep * 0.6));
            const showTick =
              i === 0 ||
              i === trajectory.length - 1 ||
              (i % tickStep === 0 && trajectory.length - 1 - i >= minTerminalGap);
            return (
              <g key={pt.year}>
                {showTick && (
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
            );
          })}
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
  const [viewMode, setViewMode] = useState<"bars" | "radar">("bars");
  const [hoveredAxis, setHoveredAxis] = useState<number | null>(null);

  const perCapitaAvailable = (c: CountryIntelligenceProfile) =>
    hasSectorMetricValue(c, c.gdpPerCapitaUsd) && c.gdpPerCapitaUsd > 0;
  const growthAvailable = (c: CountryIntelligenceProfile) =>
    !(c.provenance.missingData && c.gdpGrowthPct === 0 && getEffectiveGdpUsdBn(c) === 0);
  const renewAvailable = (c: CountryIntelligenceProfile) =>
    !c.provenance.missingData || c.energyProfile.renewableSharePct > 0;
  const aiAvailable = (c: CountryIntelligenceProfile) =>
    hasSectorMetricValue(c, c.technologyProfile.aiReadinessIndex);
  const rdAvailable = (c: CountryIntelligenceProfile) =>
    hasSectorMetricValue(c, c.technologyProfile.rdSpendPctGdp);
  const internetAvailable = (c: CountryIntelligenceProfile) =>
    hasSectorMetricValue(c, c.technologyProfile.internetPenetrationPct);
  const longevityAvailable = (c: CountryIntelligenceProfile) =>
    hasSectorMetricValue(c, c.lifeExpectancyYears) && c.lifeExpectancyYears >= 25;

  const radarAxes = [
    {
      label: "Annual Growth",
      maxLabel: "-2..+10%",
      availL: growthAvailable(leftCountry),
      availR: growthAvailable(rightCountry),
      l: growthAvailable(leftCountry) ? Math.max(0, Math.min(1, (leftCountry.gdpGrowthPct - -2) / 12)) : 0,
      r: growthAvailable(rightCountry) ? Math.max(0, Math.min(1, (rightCountry.gdpGrowthPct - -2) / 12)) : 0,
      rawL: growthAvailable(leftCountry) ? formatSignedPct(leftCountry.gdpGrowthPct) : "N/A",
      rawR: growthAvailable(rightCountry) ? formatSignedPct(rightCountry.gdpGrowthPct) : "N/A",
      deltaLabel:
        growthAvailable(leftCountry) && growthAvailable(rightCountry)
          ? formatSignedValue(leftCountry.gdpGrowthPct - rightCountry.gdpGrowthPct, " pp", 1)
          : "N/A",
    },
    {
      label: "Clean Power",
      maxLabel: "0..100%",
      availL: renewAvailable(leftCountry),
      availR: renewAvailable(rightCountry),
      l: renewAvailable(leftCountry) ? Math.max(0, Math.min(1, leftCountry.energyProfile.renewableSharePct / 100)) : 0,
      r: renewAvailable(rightCountry) ? Math.max(0, Math.min(1, rightCountry.energyProfile.renewableSharePct / 100)) : 0,
      rawL: renewAvailable(leftCountry) ? `${leftCountry.energyProfile.renewableSharePct}%` : "N/A",
      rawR: renewAvailable(rightCountry) ? `${rightCountry.energyProfile.renewableSharePct}%` : "N/A",
      deltaLabel:
        renewAvailable(leftCountry) && renewAvailable(rightCountry)
          ? formatSignedValue(
              leftCountry.energyProfile.renewableSharePct - rightCountry.energyProfile.renewableSharePct,
              " pp",
              1
            )
          : "N/A",
    },
    {
      label: "AI Readiness",
      maxLabel: "0..100",
      availL: aiAvailable(leftCountry),
      availR: aiAvailable(rightCountry),
      l: aiAvailable(leftCountry) ? Math.max(0, Math.min(1, leftCountry.technologyProfile.aiReadinessIndex / 100)) : 0,
      r: aiAvailable(rightCountry) ? Math.max(0, Math.min(1, rightCountry.technologyProfile.aiReadinessIndex / 100)) : 0,
      rawL: aiAvailable(leftCountry) ? `${leftCountry.technologyProfile.aiReadinessIndex}/100` : "N/A",
      rawR: aiAvailable(rightCountry) ? `${rightCountry.technologyProfile.aiReadinessIndex}/100` : "N/A",
      deltaLabel:
        aiAvailable(leftCountry) && aiAvailable(rightCountry)
          ? formatSignedValue(
              leftCountry.technologyProfile.aiReadinessIndex -
                rightCountry.technologyProfile.aiReadinessIndex,
              " pts",
              0
            )
          : "N/A",
    },
    {
      label: "R&D Spend",
      maxLabel: "0..4.5%",
      availL: rdAvailable(leftCountry),
      availR: rdAvailable(rightCountry),
      l: rdAvailable(leftCountry) ? Math.max(0, Math.min(1, leftCountry.technologyProfile.rdSpendPctGdp / 4.5)) : 0,
      r: rdAvailable(rightCountry) ? Math.max(0, Math.min(1, rightCountry.technologyProfile.rdSpendPctGdp / 4.5)) : 0,
      rawL: rdAvailable(leftCountry) ? `${leftCountry.technologyProfile.rdSpendPctGdp}%` : "N/A",
      rawR: rdAvailable(rightCountry) ? `${rightCountry.technologyProfile.rdSpendPctGdp}%` : "N/A",
      deltaLabel:
        rdAvailable(leftCountry) && rdAvailable(rightCountry)
          ? formatSignedValue(
              leftCountry.technologyProfile.rdSpendPctGdp - rightCountry.technologyProfile.rdSpendPctGdp,
              "% GDP",
              2
            )
          : "N/A",
    },
    {
      label: "Internet",
      maxLabel: "0..100%",
      availL: internetAvailable(leftCountry),
      availR: internetAvailable(rightCountry),
      l: internetAvailable(leftCountry) ? Math.max(0, Math.min(1, leftCountry.technologyProfile.internetPenetrationPct / 100)) : 0,
      r: internetAvailable(rightCountry) ? Math.max(0, Math.min(1, rightCountry.technologyProfile.internetPenetrationPct / 100)) : 0,
      rawL: internetAvailable(leftCountry) ? `${leftCountry.technologyProfile.internetPenetrationPct}%` : "N/A",
      rawR: internetAvailable(rightCountry) ? `${rightCountry.technologyProfile.internetPenetrationPct}%` : "N/A",
      deltaLabel:
        internetAvailable(leftCountry) && internetAvailable(rightCountry)
          ? formatSignedValue(
              leftCountry.technologyProfile.internetPenetrationPct -
                rightCountry.technologyProfile.internetPenetrationPct,
              " pp",
              1
            )
          : "N/A",
    },
    {
      label: "Life Span",
      maxLabel: "50..90y",
      availL: longevityAvailable(leftCountry),
      availR: longevityAvailable(rightCountry),
      l: longevityAvailable(leftCountry) ? Math.max(0, Math.min(1, (leftCountry.lifeExpectancyYears - 50) / 40)) : 0,
      r: longevityAvailable(rightCountry) ? Math.max(0, Math.min(1, (rightCountry.lifeExpectancyYears - 50) / 40)) : 0,
      rawL: longevityAvailable(leftCountry) ? `${leftCountry.lifeExpectancyYears} yrs` : "N/A",
      rawR: longevityAvailable(rightCountry) ? `${rightCountry.lifeExpectancyYears} yrs` : "N/A",
      deltaLabel:
        longevityAvailable(leftCountry) && longevityAvailable(rightCountry)
          ? formatSignedValue(
              leftCountry.lifeExpectancyYears - rightCountry.lifeExpectancyYears,
              " yrs",
              1
            )
          : "N/A",
    },
  ];

  const dumbbellRows = [
    {
      label: "Income per person",
      availL: perCapitaAvailable(leftCountry),
      availR: perCapitaAvailable(rightCountry),
      l: perCapitaAvailable(leftCountry)
        ? Math.max(0, Math.min(1, leftCountry.gdpPerCapitaUsd / 90000))
        : 0,
      r: perCapitaAvailable(rightCountry)
        ? Math.max(0, Math.min(1, rightCountry.gdpPerCapitaUsd / 90000))
        : 0,
      rawL: perCapitaAvailable(leftCountry)
        ? `$${leftCountry.gdpPerCapitaUsd.toLocaleString()}`
        : "N/A",
      rawR: perCapitaAvailable(rightCountry)
        ? `$${rightCountry.gdpPerCapitaUsd.toLocaleString()}`
        : "N/A",
      gapText:
        perCapitaAvailable(leftCountry) && perCapitaAvailable(rightCountry)
          ? formatMultipleOrGap(leftCountry.gdpPerCapitaUsd, rightCountry.gdpPerCapitaUsd, "ratio")
          : "N/A",
    },
    ...radarAxes.map((ax) => ({
      label: ax.label,
      availL: ax.availL,
      availR: ax.availR,
      l: ax.l,
      r: ax.r,
      rawL: ax.rawL,
      rawR: ax.rawR,
      gapText: ax.deltaLabel,
    })),
  ];

  const leftHasMissing = radarAxes.some((a) => !a.availL);
  const rightHasMissing = radarAxes.some((a) => !a.availR);

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
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <OmnisSegmentedControl<"bars" | "radar">
          groupId={`compare-viz-${leftCountry.iso3}-${rightCountry.iso3}`}
          ariaLabel="Comparison chart view"
          size="sm"
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: "bars", label: "Direct Range" },
            { value: "radar", label: "Shape View" },
          ]}
        />
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 tone-blue">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--chart-blue)]" />
            {leftCountry.iso3}
          </span>
          <span className="inline-flex items-center gap-1.5 tone-violet">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--chart-violet)]" />
            {rightCountry.iso3}
          </span>
        </div>
      </div>

      {viewMode === "bars" ? (
        <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {dumbbellRows.map((row) => {
            const leftPct = Math.round(row.l * 100);
            const rightPct = Math.round(row.r * 100);
            const bridgeLeft = Math.min(leftPct, rightPct);
            const bridgeWidth = Math.max(0, Math.abs(rightPct - leftPct));
            return (
              <div key={row.label} className="py-2.5 space-y-1.5 text-[13px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[var(--text-primary)]">{row.label}</span>
                  <div className="flex items-center gap-1.5 omnis-mono omnis-tabular text-xs">
                    <span className="tone-blue font-semibold">{row.rawL}</span>
                    <span className="text-[var(--text-muted)]">vs</span>
                    <span className="tone-violet font-semibold">{row.rawR}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="relative flex-1 h-4 flex items-center">
                    <div className="w-full h-1.5 rounded-full bg-[var(--bg-slate)]" />
                    {row.availL && row.availR && (
                      <div
                        className="absolute h-1 rounded-full bg-[var(--border-strong)] opacity-60"
                        style={{ left: `${bridgeLeft}%`, width: `${bridgeWidth}%` }}
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className={`absolute -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 ${
                        row.availR
                          ? "bg-[var(--chart-violet)] border-[var(--bg-graphite)]"
                          : "bg-[var(--bg-graphite)] border-dashed border-[var(--chart-violet)]"
                      }`}
                      style={{ left: `${rightPct}%` }}
                    />
                    <span
                      aria-hidden="true"
                      className={`absolute -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 ${
                        row.availL
                          ? "bg-[var(--chart-blue)] border-[var(--bg-graphite)]"
                          : "bg-[var(--bg-graphite)] border-dashed border-[var(--chart-blue)]"
                      }`}
                      style={{ left: `${leftPct}%` }}
                    />
                  </div>
                  <span className="w-24 text-right text-xs font-medium text-[var(--text-muted)] truncate omnis-tabular">
                    {row.gapText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div className="text-xs text-[var(--text-muted)] text-center font-medium">
            Outer edge = stronger global score (tap any axis for exact values)
          </div>
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
              x={cx + zeroRingRadius * Math.cos(-Math.PI / 2 + Math.PI / radarAxes.length)}
              y={cy + zeroRingRadius * Math.sin(-Math.PI / 2 + Math.PI / radarAxes.length) + 3}
              textAnchor="middle"
              fontSize="10"
              fill="var(--text-muted)"
              className="omnis-mono"
            >
              min
            </text>
            {[0.25, 0.5, 0.75, 1.0].map((ring) => {
              const r = zeroRingRadius + (radius - zeroRingRadius) * ring;
              const labelAngle = -Math.PI / 2 + Math.PI / radarAxes.length;
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
                    x={cx + r * Math.cos(labelAngle)}
                    y={cy + r * Math.sin(labelAngle) + 3}
                    textAnchor="middle"
                    fontSize="10"
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
                  >
                    {axis.label}
                  </text>
                  <text
                    x={lx}
                    y={ly + 12}
                    textAnchor="middle"
                    fontSize="10"
                    fill="var(--text-muted)"
                    className="omnis-mono"
                  >
                    {axis.maxLabel}
                  </text>
                </g>
              );
            })}

            <polygon
              points={buildPolygon("r")}
              fill="var(--chart-violet-area)"
              fillOpacity={rightHasMissing ? 0.45 : 1}
              stroke="var(--chart-violet)"
              strokeWidth="2.1"
              strokeDasharray={rightHasMissing ? "4,3" : undefined}
            />
            <polygon
              points={buildPolygon("l")}
              fill="var(--chart-blue-area)"
              fillOpacity={leftHasMissing ? 0.45 : 1}
              stroke="var(--chart-blue)"
              strokeWidth="2.4"
              strokeDasharray={leftHasMissing ? "4,3" : undefined}
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
                  <circle
                    cx={pr.x}
                    cy={pr.y}
                    r={hoveredAxis === i ? 5 : 3.5}
                    fill={axis.availR ? "var(--chart-violet)" : "var(--bg-graphite)"}
                    stroke={axis.availR ? undefined : "var(--chart-violet)"}
                    strokeWidth={axis.availR ? undefined : 1.5}
                    strokeDasharray={axis.availR ? undefined : "2,2"}
                  />
                  <circle
                    cx={pl.x}
                    cy={pl.y}
                    r={hoveredAxis === i ? 5.2 : 3.8}
                    fill={axis.availL ? "var(--chart-blue)" : "var(--bg-graphite)"}
                    stroke={axis.availL ? undefined : "var(--chart-blue)"}
                    strokeWidth={axis.availL ? undefined : 1.5}
                    strokeDasharray={axis.availL ? undefined : "2,2"}
                  />
                </g>
              );
            })}
          </svg>
        </>
      )}

      {leftHasMissing || rightHasMissing ? (
        <div className="px-2.5 py-1 rounded-md badge-tone-warning text-xs text-center">
          N/A indicates data is currently unavailable from official sources.
        </div>
      ) : null}

      {contractionNotes.length > 0 ? (
        <div className="px-2.5 py-1.5 rounded-md badge-tone-warning text-xs text-center">
          Severe contraction clamped to chart min (-2%): {contractionNotes.join(" • ")}
        </div>
      ) : null}

      {viewMode === "radar" && activeAxis ? (
        <div className="border-t border-[var(--border-subtle)] pt-2.5 px-1 text-[13px] flex flex-wrap items-center justify-between gap-2 omnis-mono">
          <span className="font-sans font-bold text-[var(--text-primary)]">{activeAxis.label}</span>
          <span className="tone-blue font-semibold">
            {leftCountry.iso3}: {activeAxis.rawL}
          </span>
          <span className="tone-violet font-semibold">
            {rightCountry.iso3}: {activeAxis.rawR}
          </span>
          <span className="px-1.5 py-0.5 rounded badge-tone-blue text-xs font-bold">
            {activeAxis.deltaLabel}
          </span>
        </div>
      ) : null}
    </div>
  );
}
