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
import { ComparisonRadarChart } from "@/components/charts/OmnisCharts";
import { OmnisLoader } from "@/components/brand/OmnisLogo";
import { OmnisButton, OmnisModuleHeader } from "@/components/ui/OmnisPrimitives";
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
      rightVal: leftCountry.energyProfile.renewableSharePct,
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

  const handleSaveComparison = () => {
    addWorkspaceItem({
      type: "report",
      title: `Intelligence Comparison: ${leftCountry.name} vs ${rightCountry.name}`,
      subtitle: "Multi-Indicator Macroeconomic, Energy & Technology Matrix",
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
      <OmnisModuleHeader
        moduleTag="INTELLIGENCE COMPARE ENGINE & PERSONALISED FEED"
        title="Multi-Dimensional Sovereign, Technology & Industry Comparison"
        subtitle="Compare structural macroeconomic, clean energy, R&D, and demographic trajectories side by side with normalised multi-axis profiles."
        icon={<Layers className="w-3.5 h-3.5" />}
        actions={
          <OmnisButton onClick={handleSaveComparison}>
            {savedNotice ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
            <span>{savedNotice ? "Comparison Saved" : "Save Comparison"}</span>
          </OmnisButton>
        }
      >
        {/* Entity Pair Selectors */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="flex items-center gap-2 bg-[var(--bg-slate)] px-3 py-2 rounded-xl border border-[var(--accent-blue)]">
            <span className="text-xs font-bold tone-blue">Entity A:</span>
            <select
              value={leftIso}
              onChange={(e) => setLeftIso(e.target.value)}
              aria-label="Select Primary Comparison Country"
              className="bg-transparent text-xs font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer"
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
            aria-label="Swap Entities"
            className="p-2 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
            title="Swap Entities"
          >
            <ArrowLeftRight className="w-4 h-4 tone-blue" />
          </button>

          <div className="flex items-center gap-2 bg-[var(--bg-slate)] px-3 py-2 rounded-xl border border-[var(--accent-violet)]">
            <span className="text-xs font-bold tone-violet">Entity B:</span>
            <select
              value={rightIso}
              onChange={(e) => setRightIso(e.target.value)}
              aria-label="Select Secondary Comparison Country"
              className="bg-transparent text-xs font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              {countries.map((c) => (
                <option key={c.iso3} value={c.iso3} className="bg-[var(--bg-graphite)]">
                  {c.flagEmoji} {c.name} ({c.iso3})
                </option>
              ))}
            </select>
          </div>

          {/* Preset Quick Comparisons */}
          <div className="flex flex-wrap gap-1.5 lg:ml-auto text-xs">
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
                className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-slate)] hover:border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] font-medium transition-colors cursor-pointer"
              >
                {pair.label}
              </button>
            ))}
          </div>
        </div>
      </OmnisModuleHeader>

      {/* Side-by-Side Indicator Table + Multi-Axis Radar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 omnis-card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Side-by-Side Indicator & Relative Delta Matrix
            </h2>
            <span className="text-[11px] text-[var(--text-muted)] omnis-mono">
              Source: World Bank WDI & IMF 2026
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                  <th className="py-2.5 pr-3">Metric / Indicator</th>
                  <th className="py-2.5 pr-3 tone-blue omnis-mono">
                    {leftCountry.flagEmoji} {leftCountry.name}
                  </th>
                  <th className="py-2.5 pr-3 tone-violet omnis-mono">
                    {rightCountry.flagEmoji} {rightCountry.name}
                  </th>
                  <th className="py-2.5 omnis-mono">Delta (A vs B)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] omnis-mono text-[var(--text-primary)]">
                {metricsComparison.map((row) => {
                  const pctDiff =
                    ((row.leftVal - row.rightVal) / Math.max(Math.abs(row.rightVal), 0.001)) * 100;
                  const sum = Math.max(1e-6, Math.abs(row.leftVal) + Math.abs(row.rightVal));
                  const leftShare = Math.min(92, Math.max(8, (Math.abs(row.leftVal) / sum) * 100));
                  return (
                    <tr key={row.label} className="hover:bg-[var(--bg-slate)]/50 transition-colors">
                      <td className="py-2.5 pr-3 font-sans font-medium text-[var(--text-primary)]">
                        <div>{row.label}</div>
                        <div className="mt-1 h-1 w-28 rounded-full bg-[var(--bg-slate)] overflow-hidden flex">
                          <div style={{ width: `${leftShare}%`, backgroundColor: "var(--chart-blue)" }} />
                          <div style={{ width: `${100 - leftShare}%`, backgroundColor: "var(--chart-violet)" }} />
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 font-bold">
                        {row.leftVal.toLocaleString()} {row.unit}
                      </td>
                      <td className="py-2.5 pr-3 font-bold">
                        {row.rightVal.toLocaleString()} {row.unit}
                      </td>
                      <td
                        className={`py-2.5 font-semibold ${
                          pctDiff >= 0 ? "tone-verified" : "tone-warning"
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

        {/* Interactive 6-Axis Normalised Radar Chart */}
        <div className="lg:col-span-5 omnis-card p-6 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              6-Dimension Normalized Radar Profile
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Hover axis vertices to inspect raw values scaled transparently against the global frontier.
            </p>
          </div>

          <ComparisonRadarChart leftCountry={leftCountry} rightCountry={rightCountry} />
        </div>
      </div>

      {/* Technology & Industry Comparable Entities */}
      <div className="omnis-card p-6 space-y-4">
        <h2 className="text-sm font-bold flex items-center gap-2 text-[var(--text-primary)]">
          <TrendingUp className="w-4 h-4 tone-verified" />
          Cross-Sector Technology & Industrial Benchmark Matrix
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COMPARABLE_ENTITIES.map((ent) => (
            <div key={ent.id} className="omnis-surface-slate p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md badge-tone-blue omnis-mono">
                  {ent.category}
                </span>
                <span className="omnis-mono text-[11px] tone-verified font-semibold">
                  Velocity: {ent.metrics.growthVelocity}/100
                </span>
              </div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">{ent.name}</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed">{ent.subtitle}</p>
              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1">
                {Object.entries(ent.keyAttributes).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2 text-[11px]">
                    <span className="text-[var(--text-muted)]">{k}:</span>
                    <span className="font-semibold text-[var(--text-primary)] text-right">{v}</span>
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
        <div>
          <h2 className="text-base font-bold flex items-center gap-2 text-[var(--text-primary)]">
            <Sparkles className="w-4 h-4 tone-blue" />
            Personalised Intelligence Feed (Explicitly Followed Topics)
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Zero opaque algorithmic profiling. Toggle topics below to curate your verified feed.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {ALL_TOPICS.map((topic) => {
            const active = followedTopics.includes(topic);
            return (
              <button
                key={topic}
                type="button"
                onClick={() => toggleFollowedTopic(topic)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
                  active
                    ? "badge-tone-blue"
                    : "bg-[var(--bg-slate)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
              <div className="flex items-center justify-between text-[10px] omnis-mono tone-blue font-semibold">
                <span>FOLLOWED TOPIC</span>
                <span>2026-11-15</span>
              </div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                {topic} — Institutional Synthesis
              </h3>
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
                  className="tone-blue hover:underline font-semibold"
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
    <Suspense
      fallback={
        <div className="p-8 max-w-7xl mx-auto">
          <OmnisLoader label="Loading Intelligence Comparison Matrix..." />
        </div>
      }
    >
      <IntelligenceCompareContent />
    </Suspense>
  );
}
