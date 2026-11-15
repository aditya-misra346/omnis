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
  Pin,
  ArrowRight,
} from "lucide-react";
import {
  COMPARABLE_ENTITIES,
  COUNTRIES_DATA,
  TIMELINE_EVENTS,
} from "@/lib/data/global-intelligence";
import { buildSovereignComparisonMatrix } from "@/lib/research/compare";
import { fetchOpenAlexSources } from "@/lib/providers/live-data";
import { ComparisonRadarChart } from "@/components/charts/OmnisCharts";
import { OmnisLoader } from "@/components/brand/OmnisLogo";
import { OmnisButton, OmnisModuleHeader } from "@/components/ui/OmnisPrimitives";
import { OmnisSelect } from "@/components/ui/OmnisSelect";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import type { ResearchSourceItem } from "@/types/omnis";

interface FollowedTopicBriefing {
  status: "live" | "cached";
  dateLabel: string;
  headline: string;
  summary: string;
  sourceLabel: string;
  sourceUrl: string;
}

function resolveCachedTopicBriefing(topic: string): FollowedTopicBriefing {
  const lower = topic.toLowerCase();
  const stems = lower
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4)
    .map((w) => w.slice(0, 5));

  const matchesText = (text: string) => {
    const t = text.toLowerCase();
    return t.includes(lower) || stems.some((s) => t.includes(s));
  };

  const matchedCountry = Object.values(COUNTRIES_DATA).find(
    (c) =>
      matchesText(c.name) ||
      matchesText(c.officialName) ||
      lower.includes(c.iso3.toLowerCase()) ||
      (lower.includes("european") && c.region === "Europe") ||
      (lower.includes("us dollar") && c.iso3 === "USA") ||
      (lower.includes("inflation") && c.iso3 === "USA")
  );

  const matchedEvent =
    TIMELINE_EVENTS.find(
      (evt) =>
        matchesText(evt.title) ||
        matchesText(evt.description) ||
        evt.connectedGraphTopics.some((t) => matchesText(t))
    ) ?? null;

  if (matchedEvent && !matchedCountry) {
    return {
      status: "cached",
      dateLabel: `Event Record • ${matchedEvent.dateDisplay}`,
      headline: matchedEvent.title,
      summary: matchedEvent.description,
      sourceLabel: matchedEvent.sources[0]?.publisher ?? "OMNIS Verified Event Archive",
      sourceUrl: matchedEvent.sources[0]?.url ?? "/timeline",
    };
  }

  const matchedEntity =
    COMPARABLE_ENTITIES.find(
      (ent) => matchesText(ent.name) || matchesText(ent.subtitle) || matchesText(ent.category)
    ) ?? null;

  if (matchedEntity) {
    const firstAttr = Object.entries(matchedEntity.keyAttributes)[0];
    return {
      status: "cached",
      dateLabel: `Curated Benchmark (${COUNTRIES_DATA.IND.provenance.lastUpdated} Edition)`,
      headline: matchedEntity.name,
      summary: `${matchedEntity.subtitle}. ${
        firstAttr ? `${firstAttr[0]}: ${firstAttr[1]}.` : ""
      }`,
      sourceLabel: matchedEntity.source,
      sourceUrl: `/research?q=${encodeURIComponent(topic)}`,
    };
  }

  const country = matchedCountry ?? COUNTRIES_DATA.IND;
  if (matchedEvent && matchedCountry) {
    return {
      status: "cached",
      dateLabel: `Sovereign & Event Record • ${matchedEvent.dateDisplay}`,
      headline: `${matchedCountry.name}: ${matchedEvent.title}`,
      summary: `${matchedEvent.description} (2026 GDP: $${matchedCountry.gdpUsdBn.toLocaleString()}B, +${matchedCountry.gdpGrowthPct}%/yr).`,
      sourceLabel: `${matchedEvent.sources[0]?.publisher ?? "OMNIS"} / ${matchedCountry.provenance.publisher}`,
      sourceUrl: `/atlas?country=${matchedCountry.iso3}`,
    };
  }

  return {
    status: "cached",
    dateLabel: `WDI Edition • ${country.provenance.lastUpdated}`,
    headline: `${country.flagEmoji} ${country.officialName} — ${topic}`,
    summary: `GDP $${country.gdpUsdBn.toLocaleString()}B (${
      country.gdpGrowthPct >= 0 ? "+" : ""
    }${country.gdpGrowthPct}% real), ${country.energyProfile.renewableSharePct}% clean electricity, AI readiness ${country.technologyProfile.aiReadinessIndex}/100.`,
    sourceLabel: country.provenance.source,
    sourceUrl: `/atlas?country=${country.iso3}`,
  };
}

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

function parseCountriesFromCompareQuery(query: string): [string, string] | null {
  const clean = query.trim().toLowerCase();
  if (!clean) return null;
  const aliases: Record<string, string> = {
    usa: "USA",
    "united states": "USA",
    america: "USA",
    us: "USA",
    uk: "GBR",
    britain: "GBR",
    "united kingdom": "GBR",
    south: "KOR",
    korea: "KOR",
    india: "IND",
    china: "CHN",
    germany: "DEU",
    japan: "JPN",
    france: "FRA",
    brazil: "BRA",
    singapore: "SGP",
    nigeria: "NGA",
  };
  const hits: Array<{ idx: number; iso3: string }> = [];
  for (const country of Object.values(COUNTRIES_DATA)) {
    const isoPos = clean.search(new RegExp(`\\b${country.iso3.toLowerCase()}\\b`));
    if (isoPos !== -1) hits.push({ idx: isoPos, iso3: country.iso3 });
    const namePos = clean.indexOf(country.name.toLowerCase());
    if (namePos !== -1) hits.push({ idx: namePos, iso3: country.iso3 });
  }
  for (const [alias, iso3] of Object.entries(aliases)) {
    const pos = clean.search(new RegExp(`\\b${alias}\\b`));
    if (pos !== -1) hits.push({ idx: pos, iso3 });
  }
  hits.sort((a, b) => a.idx - b.idx);
  const ordered: string[] = [];
  for (const h of hits) {
    if (!ordered.includes(h.iso3)) ordered.push(h.iso3);
  }
  if (ordered.length >= 2) return [ordered[0], ordered[1]];
  if (ordered.length === 1) {
    const first = ordered[0];
    return [first, first === "IND" ? "CHN" : "IND"];
  }
  return null;
}

function IntelligenceCompareContent() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  const parsedFromQuery = parseCountriesFromCompareQuery(queryParam);
  const initialLeft =
    searchParams.get("left")?.toUpperCase() || parsedFromQuery?.[0] || "IND";
  const initialRight =
    searchParams.get("right")?.toUpperCase() || parsedFromQuery?.[1] || "CHN";

  const [leftIso, setLeftIso] = useState(COUNTRIES_DATA[initialLeft] ? initialLeft : "IND");
  const [rightIso, setRightIso] = useState(COUNTRIES_DATA[initialRight] ? initialRight : "CHN");
  const [savedNotice, setSavedNotice] = useState(false);
  const [pinnedTopics, setPinnedTopics] = useState<Record<string, boolean>>({});
  const [liveBriefings, setLiveBriefings] = useState<Record<string, ResearchSourceItem | null>>({});

  useEffect(() => {
    const q = searchParams.get("q") || "";
    const parsed = parseCountriesFromCompareQuery(q);
    const leftParam = searchParams.get("left")?.toUpperCase();
    const rightParam = searchParams.get("right")?.toUpperCase();
    const nextLeft = leftParam || parsed?.[0];
    const nextRight = rightParam || parsed?.[1];
    if (nextLeft && COUNTRIES_DATA[nextLeft]) setLeftIso(nextLeft);
    if (nextRight && COUNTRIES_DATA[nextRight]) setRightIso(nextRight);
  }, [searchParams]);

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

  useEffect(() => {
    let active = true;
    const missing = followedTopics.filter((t) => !(t in liveBriefings));
    if (missing.length === 0) return;

    Promise.all(
      missing.slice(0, 6).map(async (topic) => {
        const works = await fetchOpenAlexSources(topic, 1).catch(() => []);
        return [topic, works[0] ?? null] as const;
      })
    ).then((entries) => {
      if (!active) return;
      setLiveBriefings((prev) => {
        const next = { ...prev };
        for (const [topic, work] of entries) {
          next[topic] = work;
        }
        return next;
      });
    });

    return () => {
      active = false;
    };
  }, [followedTopics, liveBriefings]);

  const metricsComparison = buildSovereignComparisonMatrix(leftCountry, rightCountry);

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
            <span>{savedNotice ? "Pinned to Workspace" : "Pin to Workspace"}</span>
          </OmnisButton>
        }
      >
        {/* Entity Pair Selectors */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <OmnisSelect
            value={leftIso}
            onChange={setLeftIso}
            ariaLabel="Select Primary Comparison Country"
            prefixLabel="Entity A:"
            tone="blue"
            size="md"
            options={countries.map((c) => ({
              value: c.iso3,
              label: `${c.flagEmoji} ${c.name} (${c.iso3})`,
              hint: c.region,
            }))}
          />

          <button
            type="button"
            onClick={() => {
              const temp = leftIso;
              setLeftIso(rightIso);
              setRightIso(temp);
            }}
            aria-label="Swap Entities"
            className="p-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
            title="Swap Entities"
          >
            <ArrowLeftRight className="w-4 h-4 tone-blue" />
          </button>

          <OmnisSelect
            value={rightIso}
            onChange={setRightIso}
            ariaLabel="Select Secondary Comparison Country"
            prefixLabel="Entity B:"
            tone="violet"
            size="md"
            options={countries.map((c) => ({
              value: c.iso3,
              label: `${c.flagEmoji} ${c.name} (${c.iso3})`,
              hint: c.region,
            }))}
          />

          {/* Preset Quick Comparisons */}
          <div className="flex flex-wrap gap-1.5 lg:ml-auto text-[13px]">
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
            <h2 className="text-[15px] sm:text-base font-bold text-[var(--text-primary)]">
              Side-by-Side Indicator & Relative Delta Matrix
            </h2>
            <span className="text-xs text-[var(--text-muted)] omnis-mono">
              Source: World Bank WDI & IMF 2026
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px] sm:text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
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
            <h2 className="text-[15px] sm:text-base font-bold text-[var(--text-primary)]">
              6-Dimension Normalized Radar Profile
            </h2>
            <p className="text-[13.5px] sm:text-sm text-[var(--text-secondary)] mt-1">
              Hover axis vertices to inspect raw values scaled transparently against the global frontier.
            </p>
          </div>

          <ComparisonRadarChart leftCountry={leftCountry} rightCountry={rightCountry} />
        </div>
      </div>

      {/* Technology & Industry Comparable Entities (De-boxed 2x2 Architectural Grid) */}
      <div className="omnis-card p-6 space-y-4">
        <h2 className="text-[15px] sm:text-base font-bold flex items-center gap-2 text-[var(--text-primary)]">
          <TrendingUp className="w-4 h-4 tone-verified" />
          Cross-Sector Technology & Industrial Benchmark Matrix
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 border border-[var(--border-subtle)] rounded-2xl overflow-hidden bg-[var(--bg-obsidian)]/30">
          {COMPARABLE_ENTITIES.map((ent, idx) => (
            <div
              key={ent.id}
              className={`p-5 space-y-2.5 text-sm ${
                idx < COMPARABLE_ENTITIES.length - 1 ? "border-b border-[var(--border-subtle)]" : ""
              } ${idx % 2 === 0 ? "md:border-r md:border-[var(--border-subtle)]" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] font-bold uppercase px-2 py-0.5 rounded-md badge-tone-blue omnis-mono">
                  {ent.category}
                </span>
                <span className="omnis-mono omnis-tabular text-xs tone-verified font-semibold">
                  Velocity: {ent.metrics.growthVelocity}/100
                </span>
              </div>
              <h3 className="font-bold text-base sm:text-[17px] text-[var(--text-primary)]">{ent.name}</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed">{ent.subtitle}</p>
              <div className="pt-2 border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
                {Object.entries(ent.keyAttributes).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2 py-1.5 text-[13px]">
                    <span className="text-[var(--text-muted)]">{k}</span>
                    <span className="font-semibold omnis-tabular text-[var(--text-primary)] text-right">
                      {v}
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-[var(--text-muted)] pt-1">Source: {ent.source}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Personalised Intelligence Feed (Explicitly Followed Topics Only) */}
      <div className="omnis-card p-6 space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 text-[var(--text-primary)]">
            <Sparkles className="w-4 h-4 tone-blue" />
            Personalised Intelligence Feed (Explicitly Followed Topics)
          </h2>
          <p className="text-[13.5px] sm:text-sm text-[var(--text-secondary)] mt-1">
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
                className={`px-3 py-1.5 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
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

        <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {followedTopics.map((topic) => {
            const liveWork = liveBriefings[topic];
            const cached = resolveCachedTopicBriefing(topic);
            const isLive = Boolean(liveWork);
            const title = liveWork ? liveWork.title : cached.headline;
            const summary = liveWork ? liveWork.excerpt : cached.summary;
            const dateBadge = liveWork
              ? `Published ${liveWork.publishedDate}`
              : cached.dateLabel;
            const sourceText = liveWork ? liveWork.publisher : cached.sourceLabel;
            const isPinned = Boolean(pinnedTopics[topic]);

            return (
              <div
                key={topic}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13.5px] sm:text-sm"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs omnis-mono font-semibold">
                    <span
                      className={`px-2 py-0.5 rounded uppercase ${
                        isLive ? "badge-tone-verified" : "badge-tone-cyan"
                      }`}
                    >
                      {isLive ? "Live OpenAlex" : "Cached Archive"}
                    </span>
                    <span className="tone-blue uppercase tracking-wider">{topic}</span>
                    <span className="text-[var(--text-muted)]">• {dateBadge}</span>
                  </div>
                  <h3 className="font-bold text-base sm:text-[17px] text-[var(--text-primary)] leading-snug">
                    {title}
                  </h3>
                  <p className="text-[var(--text-secondary)] leading-relaxed line-clamp-2 omnis-prose">
                    {summary}
                  </p>
                  <div className="text-xs text-[var(--text-muted)]">
                    Source: {sourceText}
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      addWorkspaceItem({
                        type: "report",
                        title: `Briefing: ${topic}`,
                        subtitle: title,
                        folder: "AI & Frontier Tech",
                        tags: [topic, isLive ? "OpenAlex" : "Curated"],
                        href: `/research?q=${encodeURIComponent(topic)}`,
                      });
                      setPinnedTopics((p) => ({ ...p, [topic]: true }));
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-slate)] hover:border-[var(--border-strong)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Pin className="w-3.5 h-3.5 tone-blue" />
                    <span>{isPinned ? "Pinned" : "Pin to Workspace"}</span>
                  </button>
                  <Link
                    href={`/research?q=${encodeURIComponent(topic)}`}
                    className="omnis-magnetic-arrow text-[13.5px] tone-blue hover:underline font-semibold inline-flex items-center gap-1"
                  >
                    <span>Investigate</span>
                    <ArrowRight className="omnis-arrow-glyph w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
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
