"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  ArrowLeftRight,
  Sparkles,
  CheckCircle2,
  Bookmark,
  Check,
  TrendingUp,
} from "lucide-react";
import { COMPARABLE_ENTITIES, COUNTRIES_DATA } from "@/lib/data/global-intelligence";
import { useOmnisStore } from "@/lib/store/use-omnis-store";

const ALL_TOPICS = [
  "Artificial Intelligence",
  "Indian Economy",
  "Semiconductor Industry",
  "Climate Change & Clean Energy",
  "Global Geopolitics",
  "Space Exploration",
  "Quantum Computing",
  "Biotechnology & Genomics",
];

function IntelligenceCompareContent() {
  const searchParams = useSearchParams();
  const initialLeft = searchParams.get("left")?.toUpperCase() || "IND";
  const initialRight = searchParams.get("right")?.toUpperCase() || "CHN";

  const [leftIso, setLeftIso] = useState(COUNTRIES_DATA[initialLeft] ? initialLeft : "IND");
  const [rightIso, setRightIso] = useState(COUNTRIES_DATA[initialRight] ? initialRight : "CHN");
  const [savedNotice, setSavedNotice] = useState(false);

  const { followedTopics, toggleFollowedTopic, addWorkspaceItem, setActiveContext } =
    useOmnisStore();

  const countries = Object.values(COUNTRIES_DATA);
  const leftCountry = COUNTRIES_DATA[leftIso] ?? COUNTRIES_DATA.IND;
  const rightCountry = COUNTRIES_DATA[rightIso] ?? COUNTRIES_DATA.CHN;

  useEffect(() => {
    setActiveContext(
      "Intelligence Compare & Personalised Feed",
      `${leftCountry.name} vs ${rightCountry.name}`
    );
  }, [leftCountry.name, rightCountry.name, setActiveContext]);

  const metricsComparison = [
    {
      label: "Nominal GDP ($B)",
      leftVal: leftCountry.gdpUsdBn,
      rightVal: rightCountry.gdpUsdBn,
      unit: "$B",
    },
    {
      label: "GDP Per Capita ($)",
      leftVal: leftCountry.gdpPerCapitaUsd,
      rightVal: rightCountry.gdpPerCapitaUsd,
      unit: "$",
    },
    {
      label: "Real GDP Growth (%)",
      leftVal: leftCountry.gdpGrowthPct,
      rightVal: rightCountry.gdpGrowthPct,
      unit: "%",
    },
    {
      label: "Renewable Electricity (%)",
      leftVal: leftCountry.energyProfile.renewableSharePct,
      rightVal: rightCountry.energyProfile.renewableSharePct,
      unit: "%",
    },
    {
      label: "AI Readiness Index",
      leftVal: leftCountry.technologyProfile.aiReadinessIndex,
      rightVal: rightCountry.technologyProfile.aiReadinessIndex,
      unit: "/100",
    },
    {
      label: "R&D Intensity (% GDP)",
      leftVal: leftCountry.technologyProfile.rdSpendPctGdp,
      rightVal: rightCountry.technologyProfile.rdSpendPctGdp,
      unit: "%",
    },
    {
      label: "Internet Penetration (%)",
      leftVal: leftCountry.technologyProfile.internetPenetrationPct,
      rightVal: rightCountry.technologyProfile.internetPenetrationPct,
      unit: "%",
    },
    {
      label: "Life Expectancy (Years)",
      leftVal: leftCountry.lifeExpectancyYears,
      rightVal: rightCountry.lifeExpectancyYears,
      unit: "yrs",
    },
  ];

  // Normalised 6-axis Radar Polygon coordinates
  const radarAxes = [
    {
      label: "Real Growth",
      l: Math.min(1, leftCountry.gdpGrowthPct / 8),
      r: Math.min(1, rightCountry.gdpGrowthPct / 8),
    },
    {
      label: "Clean Energy",
      l: Math.min(1, leftCountry.energyProfile.renewableSharePct / 90),
      r: Math.min(1, rightCountry.energyProfile.renewableSharePct / 90),
    },
    {
      label: "AI Readiness",
      l: leftCountry.technologyProfile.aiReadinessIndex / 100,
      r: rightCountry.technologyProfile.aiReadinessIndex / 100,
    },
    {
      label: "R&D Spend",
      l: Math.min(1, leftCountry.technologyProfile.rdSpendPctGdp / 4),
      r: Math.min(1, rightCountry.technologyProfile.rdSpendPctGdp / 4),
    },
    {
      label: "Internet",
      l: leftCountry.technologyProfile.internetPenetrationPct / 100,
      r: rightCountry.technologyProfile.internetPenetrationPct / 100,
    },
    {
      label: "Longevity",
      l: leftCountry.lifeExpectancyYears / 90,
      r: rightCountry.lifeExpectancyYears / 90,
    },
  ];

  const cx = 160;
  const cy = 150;
  const radius = 105;

  const buildPolygonPoints = (key: "l" | "r") =>
    radarAxes
      .map((axis, i) => {
        const angle = (Math.PI * 2 * i) / radarAxes.length - Math.PI / 2;
        const rVal = radius * Math.max(0.15, axis[key]);
        return `${cx + rVal * Math.cos(angle)},${cy + rVal * Math.sin(angle)}`;
      })
      .join(" ");

  const handleSaveComparison = () => {
    addWorkspaceItem({
      type: "report",
      title: `Intelligence Comparison: ${leftCountry.name} vs ${rightCountry.name}`,
      subtitle: `Multi-Indicator Macroeconomic, Energy & Technology Matrix`,
      folder: "Geopolitics & Macro",
      tags: ["Comparison", leftCountry.iso3, rightCountry.iso3],
      href: `/intelligence?left=${leftCountry.iso3}&right=${rightCountry.iso3}`,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="omnis-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">
              <Layers className="w-3.5 h-3.5" />
              <span>INTELLIGENCE COMPARE ENGINE & PERSONALISED FEED</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">
              Multi-Dimensional Sovereign, Technology & Industry Comparison
            </h1>
          </div>

          <button
            type="button"
            onClick={handleSaveComparison}
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            {savedNotice ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
            <span>{savedNotice ? "Comparison Saved" : "Save Comparison"}</span>
          </button>
        </div>

        {/* Entity Pair Selectors */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <div className="flex items-center gap-2 bg-[var(--bg-slate)] px-3 py-2 rounded-lg border border-blue-500/40">
            <span className="text-xs font-semibold text-blue-400">Entity A:</span>
            <select
              value={leftIso}
              onChange={(e) => setLeftIso(e.target.value)}
              aria-label="Select Primary Comparison Country"
              className="bg-transparent text-xs font-bold focus:outline-none"
            >
              {countries.map((c) => (
                <option key={c.iso3} value={c.iso3} className="bg-[var(--bg-graphite)]">
                  {c.flagEmoji} {c.name} ({c.iso3})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              const temp = leftIso;
              setLeftIso(rightIso);
              setRightIso(temp);
            }}
            className="p-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-blue-500/40"
            title="Swap Entities"
          >
            <ArrowLeftRight className="w-4 h-4 text-blue-400" />
          </button>

          <div className="flex items-center gap-2 bg-[var(--bg-slate)] px-3 py-2 rounded-lg border border-violet-500/40">
            <span className="text-xs font-semibold text-violet-400">Entity B:</span>
            <select
              value={rightIso}
              onChange={(e) => setRightIso(e.target.value)}
              aria-label="Select Secondary Comparison Country"
              className="bg-transparent text-xs font-bold focus:outline-none"
            >
              {countries.map((c) => (
                <option key={c.iso3} value={c.iso3} className="bg-[var(--bg-graphite)]">
                  {c.flagEmoji} {c.name} ({c.iso3})
                </option>
              ))}
            </select>
          </div>

          {/* Preset Quick Comparisons */}
          <div className="flex flex-wrap gap-1.5 ml-auto text-xs">
            {[
              { l: "IND", r: "CHN", label: "India vs China" },
              { l: "IND", r: "USA", label: "India vs USA" },
              { l: "DEU", r: "JPN", label: "Germany vs Japan" },
              { l: "GBR", r: "FRA", label: "UK vs France" },
            ].map((pair) => (
              <button
                key={pair.label}
                type="button"
                onClick={() => {
                  setLeftIso(pair.l);
                  setRightIso(pair.r);
                }}
                className="px-2.5 py-1.5 rounded bg-[var(--bg-slate)] hover:bg-blue-600/20 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]"
              >
                {pair.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Side-by-Side Indicator Table + Multi-Axis Radar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 omnis-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">
              Side-by-Side Indicator & Percentage Delta Matrix
            </h2>
            <span className="text-[11px] text-[var(--text-muted)] omnis-mono">
              Source: World Bank WDI & IMF 2026
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                  <th className="py-2.5">Metric / Indicator</th>
                  <th className="py-2.5 text-blue-400 omnis-mono">
                    {leftCountry.flagEmoji} {leftCountry.name}
                  </th>
                  <th className="py-2.5 text-violet-400 omnis-mono">
                    {rightCountry.flagEmoji} {rightCountry.name}
                  </th>
                  <th className="py-2.5 omnis-mono">Relative Delta (A vs B)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] omnis-mono">
                {metricsComparison.map((row) => {
                  const pctDiff =
                    ((row.leftVal - row.rightVal) / Math.max(Math.abs(row.rightVal), 0.001)) *
                    100;
                  return (
                    <tr key={row.label}>
                      <td className="py-2.5 font-sans font-medium text-[var(--text-primary)]">
                        {row.label}
                      </td>
                      <td className="py-2.5 font-bold">
                        {row.leftVal.toLocaleString()} {row.unit}
                      </td>
                      <td className="py-2.5 font-bold">
                        {row.rightVal.toLocaleString()} {row.unit}
                      </td>
                      <td
                        className={`py-2.5 font-semibold ${
                          pctDiff >= 0 ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {pctDiff >= 0 ? "+" : ""}
                        {pctDiff.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 6-Axis Normalised Radar Chart */}
        <div className="lg:col-span-5 omnis-card p-6 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-sm font-bold">6-Dimension Normalized Radar Profile</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Transparent relative scaling (0–100% of global frontier) without arbitrary overall
              rankings.
            </p>
          </div>

          <svg viewBox="0 0 320 300" className="w-full h-64 mx-auto">
            {[0.33, 0.66, 1.0].map((ring) => (
              <circle
                key={ring}
                cx={cx}
                cy={cy}
                r={radius * ring}
                fill="none"
                stroke="rgba(148,163,184,0.18)"
                strokeDasharray="3,3"
              />
            ))}
            {radarAxes.map((axis, i) => {
              const angle = (Math.PI * 2 * i) / radarAxes.length - Math.PI / 2;
              const x2 = cx + radius * Math.cos(angle);
              const y2 = cy + radius * Math.sin(angle);
              const lx = cx + (radius + 26) * Math.cos(angle);
              const ly = cy + (radius + 18) * Math.sin(angle);
              return (
                <g key={axis.label}>
                  <line
                    x1={cx}
                    y1={cy}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(148,163,184,0.22)"
                  />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    fontSize="9.5"
                    fill="#94a3b8"
                    fontFamily="monospace"
                  >
                    {axis.label}
                  </text>
                </g>
              );
            })}
            <polygon
              points={buildPolygonPoints("r")}
              fill="rgba(139, 92, 246, 0.22)"
              stroke="#8b5cf6"
              strokeWidth="2"
            />
            <polygon
              points={buildPolygonPoints("l")}
              fill="rgba(59, 130, 246, 0.25)"
              stroke="#3b82f6"
              strokeWidth="2.2"
            />
          </svg>

          <div className="flex items-center justify-center gap-6 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-blue-400">
              <span className="w-3 h-3 rounded-xs bg-blue-500" />
              {leftCountry.name} ({leftCountry.iso3})
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-violet-400">
              <span className="w-3 h-3 rounded-xs bg-violet-500" />
              {rightCountry.name} ({rightCountry.iso3})
            </span>
          </div>
        </div>
      </div>

      {/* Technology & Industry Comparable Entities */}
      <div className="omnis-card p-6 space-y-4">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Cross-Sector Technology & Industrial Benchmark Matrix
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COMPARABLE_ENTITIES.map((ent) => (
            <div key={ent.id} className="omnis-surface-slate p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-500/15 text-blue-400">
                  {ent.category}
                </span>
                <span className="omnis-mono text-[11px] text-emerald-400">
                  Velocity: {ent.metrics.growthVelocity}/100
                </span>
              </div>
              <h3 className="font-bold text-sm">{ent.name}</h3>
              <p className="text-[var(--text-secondary)]">{ent.subtitle}</p>
              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1">
                {Object.entries(ent.keyAttributes).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2 text-[11px]">
                    <span className="text-[var(--text-muted)]">{k}:</span>
                    <span className="font-medium text-right">{v}</span>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] pt-1">Source: {ent.source}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Personalised Intelligence Feed (Explicitly Followed Topics Only) */}
      <div className="omnis-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              Personalised Intelligence Feed (Explicitly Followed Topics)
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Zero opaque algorithmic profiling. Toggle topics below to curate your verified feed.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {ALL_TOPICS.map((topic) => {
            const active = followedTopics.includes(topic);
            return (
              <button
                key={topic}
                type="button"
                onClick={() => toggleFollowedTopic(topic)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 border transition-colors ${
                  active
                    ? "bg-blue-600/20 border-blue-500 text-blue-400"
                    : "bg-[var(--bg-slate)] border-[var(--border-subtle)] text-[var(--text-muted)]"
                }`}
              >
                {active && <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{topic}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {followedTopics.map((topic) => (
            <div key={topic} className="omnis-surface-slate p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[10px] omnis-mono text-blue-400">
                <span>FOLLOWED TOPIC</span>
                <span>2026-11-15</span>
              </div>
              <h3 className="font-bold text-sm">{topic} — Institutional Synthesis</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Latest peer-reviewed OpenAlex publications and World Bank structural indicators
                updated for {topic}.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)]">
                  Source: OpenAlex / World Bank WDI
                </span>
                <Link
                  href={`/research?q=${encodeURIComponent(topic)}`}
                  className="text-blue-400 hover:underline font-semibold"
                >
                  Investigate →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function IntelligencePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm">Loading Intelligence Compare...</div>}>
      <IntelligenceCompareContent />
    </Suspense>
  );
}
