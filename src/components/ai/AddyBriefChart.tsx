"use client";

import React from "react";
import { BarChart3, LineChart, Table2 } from "lucide-react";
import type { BriefSourceReference, BriefVisualData } from "@/lib/ai/contracts";

const PALETTE = ["#22d3ee", "#34d399", "#fbbf24", "#a78bfa"];

function formatAxisNumber(value: number, unitSubtitle: string): string {
  if (!Number.isFinite(value)) return "—";
  const lower = unitSubtitle.toLowerCase();
  const isPct = lower.includes("%") || lower.includes("percent") || lower.includes("share");
  const isDollar = lower.includes("$") || lower.includes("usd") || lower.includes("dollar");
  const isBillions = lower.includes("billion") || lower.includes("$b");

  if (isPct) {
    return `${value.toFixed(Math.abs(value) < 10 ? 1 : 0)}%`;
  }
  if (isDollar && isBillions) {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}T`;
    return `$${Math.round(value)}B`;
  }
  if (isDollar) {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${Math.round(value).toLocaleString()}`;
  }
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 10_000) return `${(value / 1000).toFixed(1)}k`;
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
}

function getNumericSeriesKeys(series: Array<Record<string, string | number>>): string[] {
  const keys = new Set<string>();
  for (const row of series) {
    for (const [k, v] of Object.entries(row)) {
      if (k === "label" || k === "year" || k === "name" || k === "country") continue;
      if (typeof v === "number" && Number.isFinite(v)) keys.add(k);
    }
  }
  return Array.from(keys).slice(0, 4);
}

export function AddyBriefChart({
  visual,
  sourcesById,
  onSelectSource,
}: {
  visual: BriefVisualData;
  sourcesById: Map<string, BriefSourceReference>;
  onSelectSource: (source: BriefSourceReference) => void;
}) {
  if (!visual || !Array.isArray(visual.series) || visual.series.length === 0) {
    return null;
  }

  const numericKeys = getNumericSeriesKeys(visual.series);
  const labelKey =
    visual.series[0]?.label !== undefined
      ? "label"
      : visual.series[0]?.year !== undefined
        ? "year"
        : Object.keys(visual.series[0] ?? {})[0] ?? "label";

  const TypeIcon =
    visual.type === "trend_line"
      ? LineChart
      : visual.type === "country_comparison_bars"
        ? BarChart3
        : Table2;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/75 p-4 sm:p-5 space-y-4 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-cyan-300">
            <TypeIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Verified Visual Evidence</span>
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-zinc-100 leading-snug">
            {visual.takeawayTitle}
          </h3>
          <p className="text-xs text-zinc-400">{visual.unitSubtitle}</p>
        </div>

        {visual.sourceIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {visual.sourceIds.map((id) => {
              const src = sourcesById.get(id);
              if (!src) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectSource(src)}
                  className="min-h-[28px] px-2 py-0.5 rounded-md border border-cyan-400/25 bg-cyan-500/10 text-[11px] font-mono text-cyan-200 hover:bg-cyan-500/20 transition-colors"
                >
                  [{id}]
                </button>
              );
            })}
          </div>
        )}
      </div>

      {visual.type === "trend_line" && numericKeys.length > 0 && (() => {
        const rows = visual.series;
        const allValues: number[] = [];
        for (const r of rows) {
          for (const k of numericKeys) {
            const v = r[k];
            if (typeof v === "number" && Number.isFinite(v)) allValues.push(v);
          }
        }
        if (allValues.length === 0) return null;

        const minRaw = Math.min(...allValues);
        const maxRaw = Math.max(...allValues);
        const minVal = minRaw > 0 && minRaw / Math.max(1, maxRaw) > 0.65 ? minRaw * 0.9 : Math.min(0, minRaw);
        const maxVal = maxRaw === minVal ? minVal + 1 : maxRaw * 1.08;

        const W = 680;
        const H = 230;
        const padL = 62;
        const padR = 26;
        const padT = 18;
        const padB = 34;
        const plotW = W - padL - padR;
        const plotH = H - padT - padB;

        const xAt = (idx: number) =>
          rows.length <= 1 ? padL + plotW / 2 : padL + (idx / (rows.length - 1)) * plotW;
        const yAt = (val: number) =>
          padT + plotH - ((val - minVal) / Math.max(1e-6, maxVal - minVal)) * plotH;

        const yTicks = [0, 0.5, 1].map((frac) => minVal + (maxVal - minVal) * frac);

        return (
          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              {numericKeys.map((k, idx) => (
                <div key={k} className="inline-flex items-center gap-1.5 text-xs text-zinc-300">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                  />
                  <span>{k}</span>
                </div>
              ))}
            </div>

            <div className="w-full overflow-hidden">
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-auto overflow-visible"
                role="img"
                aria-label={visual.takeawayTitle}
              >
                {yTicks.map((tick, i) => {
                  const y = yAt(tick);
                  return (
                    <g key={i}>
                      <line
                        x1={padL}
                        x2={W - padR}
                        y1={y}
                        y2={y}
                        stroke="rgba(255,255,255,0.08)"
                        strokeDasharray="3 4"
                      />
                      <text
                        x={padL - 8}
                        y={y + 4}
                        textAnchor="end"
                        fill="#a1a1aa"
                        fontSize="11"
                        fontFamily="ui-monospace, monospace"
                      >
                        {formatAxisNumber(tick, visual.unitSubtitle)}
                      </text>
                    </g>
                  );
                })}

                {numericKeys.map((key, keyIdx) => {
                  const color = PALETTE[keyIdx % PALETTE.length];
                  const coords = rows
                    .map((row, idx) => {
                      const val = row[key];
                      if (typeof val !== "number" || !Number.isFinite(val)) return null;
                      return { x: xAt(idx), y: yAt(val), val, label: String(row[labelKey] ?? "") };
                    })
                    .filter((pt): pt is { x: number; y: number; val: number; label: string } => Boolean(pt));

                  if (coords.length === 0) return null;
                  const pathD = coords
                    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
                    .join(" ");
                  const lastPt = coords[coords.length - 1];

                  return (
                    <g key={key}>
                      <path
                        d={pathD}
                        fill="none"
                        stroke={color}
                        strokeWidth={2.4}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      {coords.map((pt, i) => (
                        <circle
                          key={i}
                          cx={pt.x}
                          cy={pt.y}
                          r={i === coords.length - 1 ? 4 : 2.5}
                          fill={color}
                        />
                      ))}
                      {lastPt && (
                        <text
                          x={Math.min(W - padR, lastPt.x)}
                          y={Math.max(12, lastPt.y - 8)}
                          textAnchor="end"
                          fill={color}
                          fontSize="11"
                          fontWeight="600"
                          fontFamily="ui-monospace, monospace"
                        >
                          {formatAxisNumber(lastPt.val, visual.unitSubtitle)}
                        </text>
                      )}
                    </g>
                  );
                })}

                {rows.map((row, idx) => {
                  const showTick =
                    rows.length <= 7 ||
                    idx === 0 ||
                    idx === rows.length - 1 ||
                    idx === Math.floor(rows.length / 2);
                  if (!showTick) return null;
                  return (
                    <text
                      key={idx}
                      x={xAt(idx)}
                      y={H - 8}
                      textAnchor="middle"
                      fill="#a1a1aa"
                      fontSize="11"
                      fontFamily="ui-monospace, monospace"
                    >
                      {String(row[labelKey] ?? "")}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>
        );
      })()}

      {visual.type === "country_comparison_bars" && numericKeys.length > 0 && (() => {
        const activeKey = numericKeys[0];
        const maxVal = Math.max(
          1e-6,
          ...visual.series.map((r) => {
            const v = r[activeKey];
            return typeof v === "number" && Number.isFinite(v) ? Math.abs(v) : 0;
          })
        );

        return (
          <div className="space-y-3">
            {visual.series.map((row, idx) => {
              const rowLabel = String(row[labelKey] ?? `Item ${idx + 1}`);
              const primaryVal = typeof row[activeKey] === "number" ? (row[activeKey] as number) : 0;
              const pct = Math.max(4, Math.min(100, (Math.abs(primaryVal) / maxVal) * 100));
              const secondaryEntries = numericKeys
                .slice(1)
                .map((k) => {
                  const v = row[k];
                  return typeof v === "number" ? `${k}: ${formatAxisNumber(v, "")}` : null;
                })
                .filter(Boolean);

              return (
                <div key={`${rowLabel}-${idx}`} className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                    <span className="font-semibold text-zinc-100">{rowLabel}</span>
                    <span className="font-mono text-cyan-200">
                      {formatAxisNumber(primaryVal, visual.unitSubtitle)}
                      {secondaryEntries.length > 0 && (
                        <span className="text-zinc-400 font-sans ml-2">
                          ({secondaryEntries.join(" · ")})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: PALETTE[idx % PALETTE.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {visual.type === "breakdown_table" && (() => {
        const columns = Object.keys(visual.series[0] ?? {});
        if (columns.length === 0) return null;
        return (
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-white/[0.04] text-zinc-300">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="px-3 py-2 font-semibold whitespace-nowrap border-b border-white/[0.08]">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-zinc-200">
                {visual.series.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02]">
                    {columns.map((col) => {
                      const cell = row[col];
                      return (
                        <td key={col} className="px-3 py-2 whitespace-nowrap font-mono text-[12px]">
                          {typeof cell === "number" ? cell.toLocaleString() : String(cell ?? "—")}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );
}
