"use client";

import React, { useState } from "react";
import { BarChart3, ExternalLink, TrendingUp } from "lucide-react";
import type { BriefSourceReference, BriefVisualData } from "@/lib/ai/contracts";
import { formatMonetaryAxisTick, formatUsdBnCompact } from "@/lib/formatters";

function formatSeriesValue(val: number, unit: string): string {
  if (!Number.isFinite(val)) return "N/A";
  if (/\$b|\busd.*bn|\bgdp/i.test(unit)) {
    return formatUsdBnCompact(val);
  }
  if (/^\$/.test(unit)) {
    return `$${Math.round(val).toLocaleString()}`;
  }
  if (/%/.test(unit)) {
    return `${val.toFixed(1)}%`;
  }
  return val >= 1000 ? val.toLocaleString() : String(val);
}

function resolvePlotIndex(
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

export function BriefChartRenderer({
  visualData,
  sources,
  onInspectSource,
}: {
  visualData: BriefVisualData;
  sources: BriefSourceReference[];
  onInspectSource: (sourceId: string) => void;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const rows = visualData.series;

  if (!rows || rows.length === 0) return null;

  const sourcePills = visualData.sourceIds
    .map((id) => sources.find((s) => s.id === id))
    .filter((s): s is BriefSourceReference => Boolean(s));

  const renderFooterCitations = () =>
    sourcePills.length > 0 ? (
      <div className="pt-2.5 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
        <span className="truncate">{visualData.unitSubtitle}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {sourcePills.map((src) => (
            <button
              key={src.id}
              type="button"
              onClick={() => onInspectSource(src.id)}
              className="min-h-[34px] lg:min-h-0 px-2 py-0.5 rounded-md bg-[var(--badge-blue-bg)] border border-[var(--accent-blue)]/40 tone-blue omnis-mono text-[11px] font-semibold hover:brightness-110 cursor-pointer"
            >
              [{src.id}]
            </button>
          ))}
        </div>
      </div>
    ) : (
      <div className="pt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
        {visualData.unitSubtitle}
      </div>
    );

  // 1. Trend Line Mode
  if (visualData.type === "trend_line") {
    const pts = rows
      .map((r) => ({
        label: String(r.label ?? ""),
        value: Number(r.value ?? 0),
        unit: String(r.unit ?? visualData.unitSubtitle),
      }))
      .filter((p) => Number.isFinite(p.value));

    if (pts.length === 0) return null;

    const unitSample = pts[0].unit;
    const isMonetaryBn = /\$b|\bbn|\bgdp/i.test(unitSample);
    const values = pts.map((p) => p.value);
    const minVal = Math.min(...values, 0);
    const rawMax = Math.max(...values, 1);
    const maxVal = rawMax === minVal ? minVal + 1 : rawMax * 1.12;

    const w = 620;
    const h = 236;
    const padL = 66;
    const padR = 24;
    const padT = 22;
    const padB = 38;

    const toX = (i: number) =>
      padL + (i / Math.max(1, pts.length - 1)) * (w - padL - padR);
    const toY = (v: number) =>
      padT + (1 - (v - minVal) / Math.max(0.0001, maxVal - minVal)) * (h - padT - padB);

    const pathD = pts
      .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.value).toFixed(1)}`)
      .join(" ");
    const areaD =
      pts.length >= 2
        ? `${pathD} L ${toX(pts.length - 1).toFixed(1)} ${(h - padB).toFixed(1)} L ${toX(0).toFixed(1)} ${(h - padB).toFixed(1)} Z`
        : "";

    const selIdx = activeIndex !== null && pts[activeIndex] ? activeIndex : pts.length - 1;
    const selPt = pts[selIdx];
    const tickStep = (maxVal - minVal) / 3;

    const formatTick = (v: number) =>
      isMonetaryBn
        ? formatMonetaryAxisTick(v, "gdpUsdBn", tickStep)
        : v >= 1000
          ? `${(v / 1000).toFixed(1)}k`
          : v.toLocaleString(undefined, { maximumFractionDigits: 1 });

    return (
      <section className="rounded-2xl bg-[var(--bg-graphite)] border border-[var(--border-subtle)] p-4 sm:p-5 space-y-3 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <div className="text-[11.5px] font-semibold tone-cyan flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span>Verified Multi-Year Trajectory</span>
            </div>
            <h3 className="text-[15px] sm:text-base font-bold text-[var(--text-primary)] leading-snug">
              {visualData.takeawayTitle}
            </h3>
          </div>
        </div>

        {/* Always-Visible Active Data Readout Strip (Zero hover-only trap on mobile) */}
        <div
          aria-live="polite"
          className="rounded-xl bg-[var(--bg-slate)]/80 border border-[var(--border-subtle)] px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
        >
          <span className="text-[var(--text-muted)]">
            {activeIndex === null
              ? "Tap or drag across chart to inspect exact year values"
              : "Inspecting point"}
          </span>
          {selPt ? (
            <span className="omnis-mono omnis-tabular font-bold text-[var(--text-primary)]">
              {selPt.label}:{" "}
              <span className="tone-blue">{formatSeriesValue(selPt.value, unitSample)}</span>
            </span>
          ) : null}
        </div>

        <div className="rounded-xl bg-[var(--bg-obsidian)]/70 border border-[var(--border-subtle)] p-2">
          <svg
            viewBox={`0 0 ${w} ${h}`}
            role="img"
            aria-label={visualData.takeawayTitle}
            className="w-full h-52 sm:h-56 overflow-visible touch-pan-y select-none"
            onPointerDown={(e) => {
              const idx = resolvePlotIndex(e.clientX, e.currentTarget, w, padL, padR, pts.length);
              if (idx !== null) setActiveIndex(idx);
            }}
            onPointerMove={(e) => {
              const idx = resolvePlotIndex(e.clientX, e.currentTarget, w, padL, padR, pts.length);
              if (idx !== null) setActiveIndex(idx);
            }}
            onPointerLeave={() => setActiveIndex(null)}
            onPointerCancel={() => setActiveIndex(null)}
          >
            {[0, 0.33, 0.67, 1].map((frac) => {
              const v = minVal + frac * (maxVal - minVal);
              const y = toY(v);
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
                    fill="var(--chart-axis)"
                    className="omnis-mono text-[15px] sm:text-[11.5px]"
                  >
                    {formatTick(v)}
                  </text>
                </g>
              );
            })}

            {areaD ? <path d={areaD} fill="var(--chart-blue-area)" /> : null}
            {pts.length >= 2 ? (
              <path
                d={pathD}
                fill="none"
                stroke="var(--chart-blue)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {selPt ? (
              <line
                x1={toX(selIdx)}
                y1={padT}
                x2={toX(selIdx)}
                y2={h - padB}
                stroke="var(--border-strong)"
                strokeDasharray="3,3"
              />
            ) : null}

            {pts.map((pt, idx) => {
              const x = toX(idx);
              const y = toY(pt.value);
              const isSelected = selIdx === idx;
              const stride = Math.max(1, Math.ceil(pts.length / 5));
              const showX =
                pts.length <= 5 ||
                idx === 0 ||
                idx === pts.length - 1 ||
                (idx % stride === 0 && pts.length - 1 - idx >= Math.ceil(stride * 0.65));

              return (
                <g key={pt.label}>
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 5.5 : 3.5}
                    fill="var(--bg-graphite)"
                    stroke="var(--chart-blue)"
                    strokeWidth={isSelected ? 2.6 : 1.8}
                  />
                  {showX ? (
                    <text
                      x={x}
                      y={h - 10}
                      textAnchor="middle"
                      fill="var(--chart-axis)"
                      className="omnis-mono text-[15px] sm:text-[11.5px]"
                    >
                      {pt.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>

        {renderFooterCitations()}
      </section>
    );
  }

  // 2. Country Comparison Bars Mode
  if (visualData.type === "country_comparison_bars") {
    const firstRow = rows[0];
    const leftName = String(firstRow?.leftName ?? "Country A");
    const rightName = String(firstRow?.rightName ?? "Country B");
    const selIdx = activeIndex !== null && rows[activeIndex] ? activeIndex : 0;
    const selRow = rows[selIdx];

    return (
      <section className="rounded-2xl bg-[var(--bg-graphite)] border border-[var(--border-subtle)] p-4 sm:p-5 space-y-3 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <div className="text-[11.5px] font-semibold tone-cyan flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span>Side-by-Side Comparison</span>
            </div>
            <h3 className="text-[15px] sm:text-base font-bold text-[var(--text-primary)] leading-snug">
              {visualData.takeawayTitle}
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold shrink-0">
            <span className="inline-flex items-center gap-1.5 text-[var(--text-primary)]">
              <span className="w-2.5 h-2.5 rounded-xs bg-[var(--chart-blue)]" />
              {leftName}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[var(--text-primary)]">
              <span className="w-2.5 h-2.5 rounded-xs bg-[var(--chart-violet)]" />
              {rightName}
            </span>
          </div>
        </div>

        {/* Active Row Readout Strip */}
        <div
          aria-live="polite"
          className="rounded-xl bg-[var(--bg-slate)]/80 border border-[var(--border-subtle)] px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
        >
          <span className="text-[var(--text-muted)]">
            {String(selRow?.metric ?? "Select metric row")}
          </span>
          <span className="omnis-mono omnis-tabular font-bold text-[var(--text-primary)]">
            <span className="tone-blue">{String(selRow?.leftDisplay ?? "")}</span>
            <span className="text-[var(--text-muted)] mx-1.5">vs</span>
            <span className="tone-violet">{String(selRow?.rightDisplay ?? "")}</span>
          </span>
        </div>

        <div className="space-y-3">
          {rows.map((row, idx) => {
            const leftVal = Math.abs(Number(row.leftValue ?? 0));
            const rightVal = Math.abs(Number(row.rightValue ?? 0));
            const rowMax = Math.max(leftVal, rightVal, 0.001);
            const leftPct = Math.max(4, Math.round((leftVal / rowMax) * 100));
            const rightPct = Math.max(4, Math.round((rightVal / rowMax) * 100));
            const isSelected = selIdx === idx;

            return (
              <button
                key={String(row.metric ?? idx)}
                type="button"
                onClick={() => setActiveIndex(idx)}
                onFocus={() => setActiveIndex(idx)}
                className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer space-y-2 ${
                  isSelected
                    ? "bg-[var(--bg-slate)] border-[var(--accent-blue)]/60"
                    : "bg-[var(--bg-obsidian)]/55 border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs sm:text-[13px] font-bold text-[var(--text-primary)]">
                    {String(row.metric ?? "")}
                  </span>
                  {row.scaleNote ? (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md badge-tone-cyan">
                      {String(row.scaleNote)}
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5">
                    <div className="h-2.5 rounded-full bg-[var(--bg-graphite)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--chart-blue)] transition-all duration-300"
                        style={{ width: `${leftPct}%` }}
                      />
                    </div>
                    <span className="text-xs omnis-mono omnis-tabular font-semibold text-[var(--text-primary)] w-24 text-right">
                      {String(row.leftDisplay ?? leftVal)}
                    </span>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5">
                    <div className="h-2.5 rounded-full bg-[var(--bg-graphite)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--chart-violet)] transition-all duration-300"
                        style={{ width: `${rightPct}%` }}
                      />
                    </div>
                    <span className="text-xs omnis-mono omnis-tabular font-semibold text-[var(--text-primary)] w-24 text-right">
                      {String(row.rightDisplay ?? rightVal)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {renderFooterCitations()}
      </section>
    );
  }

  // 3. Breakdown Table Mode (Responsive Cards on mobile <640px, Scannable Table on >=640px)
  return (
    <section className="rounded-2xl bg-[var(--bg-graphite)] border border-[var(--border-subtle)] p-4 sm:p-5 space-y-3 min-w-0">
      <div className="space-y-0.5">
        <div className="text-[11.5px] font-semibold tone-cyan flex items-center gap-1.5">
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          <span>Verified Scholarly &amp; Evidence Matrix</span>
        </div>
        <h3 className="text-[15px] sm:text-base font-bold text-[var(--text-primary)] leading-snug">
          {visualData.takeawayTitle}
        </h3>
      </div>

      {/* Mobile card stack (< sm) preventing horizontal scroll at 360px */}
      <div className="sm:hidden divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
        {rows.map((row, idx) => (
          <div key={idx} className="py-3 space-y-1.5 min-w-0">
            <div className="text-[13.5px] font-bold text-[var(--text-primary)] break-words">
              {String(row.study ?? row.label ?? `Record ${idx + 1}`)}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
              <span className="truncate max-w-[200px]">{String(row.journal ?? "")}</span>
              <span className="omnis-mono omnis-tabular">
                {String(row.year ?? "")} · {Number(row.citations ?? 0).toLocaleString()} citations
              </span>
            </div>
            {row.sourceId ? (
              <button
                type="button"
                onClick={() => onInspectSource(String(row.sourceId))}
                className="min-h-[36px] px-2.5 py-1 rounded-md bg-[var(--badge-blue-bg)] tone-blue omnis-mono text-xs font-semibold cursor-pointer"
              >
                Inspect [{String(row.sourceId)}]
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {/* Desktop scannable table (>= sm) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
              <th className="py-2 pr-3 font-semibold">Study / Dataset</th>
              <th className="py-2 px-3 font-semibold">Publisher / Journal</th>
              <th className="py-2 px-3 font-semibold text-right">Year</th>
              <th className="py-2 px-3 font-semibold text-right">Citations</th>
              <th className="py-2 pl-3 font-semibold text-right">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-[var(--bg-slate)]/40 transition-colors">
                <td className="py-2.5 pr-3 font-semibold text-[var(--text-primary)] max-w-[260px]">
                  <div className="line-clamp-2">{String(row.study ?? row.label ?? "")}</div>
                </td>
                <td className="py-2.5 px-3 text-[var(--text-secondary)] max-w-[180px] truncate">
                  {String(row.journal ?? "")}
                </td>
                <td className="py-2.5 px-3 text-right omnis-mono omnis-tabular text-[var(--text-muted)]">
                  {String(row.year ?? "")}
                </td>
                <td className="py-2.5 px-3 text-right omnis-mono omnis-tabular font-semibold tone-verified">
                  {Number(row.citations ?? 0).toLocaleString()}
                </td>
                <td className="py-2.5 pl-3 text-right">
                  {row.sourceId ? (
                    <button
                      type="button"
                      onClick={() => onInspectSource(String(row.sourceId))}
                      className="px-2 py-0.5 rounded-md bg-[var(--badge-blue-bg)] tone-blue omnis-mono text-xs font-semibold hover:brightness-110 cursor-pointer"
                    >
                      [{String(row.sourceId)}]
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {renderFooterCitations()}
    </section>
  );
}
