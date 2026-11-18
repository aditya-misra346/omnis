"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  WORLD_CATALOG_BY_ISO3,
  WORLD_COUNTRIES_CATALOG,
  buildPlaceholderCountryProfile,
} from "@/lib/data/world-catalog";
import {
  buildComparisonTakeaways,
  buildSovereignComparisonMatrix,
} from "@/lib/research/compare";
import {
  formatMultipleOrGap,
  formatSignedPct,
  formatUsdBnCompact,
  getEffectiveGdpUsdBn,
} from "@/lib/formatters";
import { fetchOpenAlexSources } from "@/lib/providers/live-data";
import { ComparisonRadarChart } from "@/components/charts/OmnisCharts";
import { OmnisLoader } from "@/components/brand/OmnisLogo";
import {
  OmnisButton,
  OmnisModuleHeader,
  OmnisSegmentedControl,
  OmnisSkeleton,
} from "@/components/ui/OmnisPrimitives";
import { OmnisSelect } from "@/components/ui/OmnisSelect";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import type { CountryIntelligenceProfile, ResearchSourceItem } from "@/types/omnis";

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
  const effectiveGdp = getEffectiveGdpUsdBn(matchedCountry ?? COUNTRIES_DATA.IND);
  if (matchedEvent && matchedCountry) {
    return {
      status: "cached",
      dateLabel: `Sovereign & Event Record • ${matchedEvent.dateDisplay}`,
      headline: `${matchedCountry.name}: ${matchedEvent.title}`,
      summary: `${matchedEvent.description} (2026 GDP: $${effectiveGdp.toLocaleString()}B, ${formatSignedPct(matchedCountry.gdpGrowthPct)}/yr).`,
      sourceLabel: `${matchedEvent.sources[0]?.publisher ?? "OMNIS"} / ${matchedCountry.provenance.publisher}`,
      sourceUrl: `/atlas?country=${matchedCountry.iso3}`,
    };
  }

  return {
    status: "cached",
    dateLabel: `WDI Edition • ${country.provenance.lastUpdated}`,
    headline: `${country.flagEmoji} ${country.officialName} — ${topic}`,
    summary: `GDP $${getEffectiveGdpUsdBn(country).toLocaleString()}B (${formatSignedPct(
      country.gdpGrowthPct
    )} real), ${country.energyProfile.renewableSharePct}% clean electricity, AI readiness ${country.technologyProfile.aiReadinessIndex}/100.`,
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
  for (const entry of WORLD_COUNTRIES_CATALOG) {
    const isoPos = clean.search(new RegExp(`\\b${entry.iso3.toLowerCase()}\\b`));
    if (isoPos !== -1) hits.push({ idx: isoPos, iso3: entry.iso3 });
    const namePos = clean.indexOf(entry.name.toLowerCase());
    if (namePos !== -1) hits.push({ idx: namePos, iso3: entry.iso3 });
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

function isSupportedIso3(iso?: string | null): iso is string {
  if (!iso) return false;
  const code = iso.trim().toUpperCase();
  return (
    /^[A-Z]{3}$/.test(code) &&
    (Boolean(COUNTRIES_DATA[code]) || Boolean(WORLD_CATALOG_BY_ISO3[code]))
  );
}

function IntelligenceCompareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  const parsedFromQuery = parseCountriesFromCompareQuery(queryParam);
  const rawLeft = searchParams.get("left")?.trim().toUpperCase();
  const rawRight = searchParams.get("right")?.trim().toUpperCase();
  const initialLeft =
    (isSupportedIso3(rawLeft) ? rawLeft : null) || parsedFromQuery?.[0] || "IND";
  const initialRight =
    (isSupportedIso3(rawRight) ? rawRight : null) || parsedFromQuery?.[1] || "CHN";

  const [leftIso, setLeftIso] = useState(initialLeft);
  const [rightIso, setRightIso] = useState(initialRight);
  const [hydratedCountries, setHydratedCountries] = useState<
    Record<string, CountryIntelligenceProfile>
  >({});
  const hydratedRef = useRef<Record<string, CountryIntelligenceProfile>>({});
  const [hydratingIsoList, setHydratingIsoList] = useState<string[]>([]);
  const [savedNotice, setSavedNotice] = useState(false);
  const [indicatorTab, setIndicatorTab] = useState<"all" | "economy" | "tech_energy">("all");
  const [pinnedTopics, setPinnedTopics] = useState<Record<string, boolean>>({});
  const [liveBriefings, setLiveBriefings] = useState<Record<string, ResearchSourceItem | null>>({});
  const fetchedTopicsRef = useRef<Set<string>>(new Set());

  const intelQueryKey = searchParams.toString();
  const [prevIntelQueryKey, setPrevIntelQueryKey] = useState(intelQueryKey);
  if (intelQueryKey !== prevIntelQueryKey) {
    setPrevIntelQueryKey(intelQueryKey);
    const q = searchParams.get("q") || "";
    const parsed = parseCountriesFromCompareQuery(q);
    const leftParam = searchParams.get("left")?.trim().toUpperCase();
    const rightParam = searchParams.get("right")?.trim().toUpperCase();
    const nextLeft = (isSupportedIso3(leftParam) ? leftParam : null) || parsed?.[0];
    const nextRight = (isSupportedIso3(rightParam) ? rightParam : null) || parsed?.[1];
    if (nextLeft) setLeftIso(nextLeft);
    if (nextRight) setRightIso(nextRight);
  }

  const { followedTopics, toggleFollowedTopic, addWorkspaceItem, setActiveContext } =
    useOmnisStore();

  useEffect(() => {
    const targets = [leftIso, rightIso].filter(
      (iso, idx, arr) =>
        arr.indexOf(iso) === idx && !COUNTRIES_DATA[iso] && !hydratedRef.current[iso]
    );
    if (targets.length === 0) {
      setHydratingIsoList([]);
      return;
    }

    let cancelled = false;
    setHydratingIsoList(targets);
    Promise.all(
      targets.map(async (iso) => {
        try {
          const res = await fetch(`/api/v1/countries/${encodeURIComponent(iso)}`);
          if (!res.ok) return [iso, null] as const;
          const data = (await res.json()) as CountryIntelligenceProfile;
          return [iso, data?.iso3 === iso ? data : null] as const;
        } catch {
          return [iso, null] as const;
        }
      })
    ).then((results) => {
      if (cancelled) return;
      const nextEntries: Record<string, CountryIntelligenceProfile> = {};
      for (const [iso, data] of results) {
        if (data) {
          hydratedRef.current[iso] = data;
          nextEntries[iso] = data;
        }
      }
      if (Object.keys(nextEntries).length > 0) {
        setHydratedCountries((prev) => ({ ...prev, ...nextEntries }));
      }
      setHydratingIsoList([]);
    });

    return () => {
      cancelled = true;
    };
  }, [leftIso, rightIso]);

  const updateComparePair = (nextLeft: string, nextRight: string) => {
    setLeftIso(nextLeft);
    setRightIso(nextRight);
    router.replace(
      `/intelligence?left=${encodeURIComponent(nextLeft)}&right=${encodeURIComponent(nextRight)}`,
      { scroll: false }
    );
  };

  const countryOptions = useMemo(
    () =>
      WORLD_COUNTRIES_CATALOG.map((entry) => {
        const live = COUNTRIES_DATA[entry.iso3] ?? hydratedCountries[entry.iso3];
        const flagEmoji = live?.flagEmoji ?? entry.flagEmoji;
        const name = live?.name ?? entry.name;
        const region = live?.region ?? entry.region;
        return {
          value: entry.iso3,
          label: `${flagEmoji} ${name} (${entry.iso3})`,
          hint: region,
        };
      }),
    [hydratedCountries]
  );

  const leftCountry =
    COUNTRIES_DATA[leftIso] ??
    hydratedCountries[leftIso] ??
    buildPlaceholderCountryProfile(leftIso) ??
    COUNTRIES_DATA.IND;
  const rightCountry =
    COUNTRIES_DATA[rightIso] ??
    hydratedCountries[rightIso] ??
    buildPlaceholderCountryProfile(rightIso) ??
    COUNTRIES_DATA.CHN;

  useEffect(() => {
    setActiveContext(
      "Intelligence Compare & Personalised Feed",
      `${leftCountry.name} vs ${rightCountry.name}`
    );
  }, [leftCountry.name, rightCountry.name, setActiveContext]);

  useEffect(() => {
    let active = true;
    let settled = false;
    const fetchedSet = fetchedTopicsRef.current;
    const missing = followedTopics.filter((t) => !fetchedSet.has(t));
    if (missing.length === 0) return;

    for (const topic of missing) {
      fetchedSet.add(topic);
    }

    Promise.all(
      missing.map(async (topic) => {
        const works = await fetchOpenAlexSources(topic, 1).catch(() => []);
        return [topic, works[0] ?? null] as const;
      })
    ).then((entries) => {
      settled = true;
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
      if (!settled) {
        for (const topic of missing) {
          fetchedSet.delete(topic);
        }
      }
    };
  }, [followedTopics]);

  const metricsComparison = buildSovereignComparisonMatrix(leftCountry, rightCountry);
  const comparisonTakeaways = buildComparisonTakeaways(leftCountry, rightCountry);
  const visibleRows =
    indicatorTab === "all"
      ? metricsComparison
      : metricsComparison.filter((r) => r.category === indicatorTab);

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
        moduleTag="Compare Countries"
        title="How Countries & Key Sectors Stack Up"
        subtitle="Compare economic scale, average living standards, clean energy, and R&D investment side by side in clear, scaled numbers."
        icon={<Layers className="w-3.5 h-3.5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {hydratingIsoList.length > 0 && (
              <span className="px-2.5 py-1 rounded-full badge-tone-cyan text-xs font-semibold animate-pulse">
                Loading World Bank data…
              </span>
            )}
            <OmnisButton onClick={handleSaveComparison}>
              {savedNotice ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              <span>{savedNotice ? "Saved to Workspace" : "Save Comparison"}</span>
            </OmnisButton>
          </div>
        }
      >
        {/* Country Pair Selectors */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <OmnisSelect
            value={leftIso}
            onChange={(next) => updateComparePair(next, rightIso)}
            ariaLabel="Select Primary Comparison Country"
            prefixLabel="Country A:"
            tone="blue"
            size="md"
            options={countryOptions}
          />

          <button
            type="button"
            onClick={() => updateComparePair(rightIso, leftIso)}
            aria-label="Swap Entities"
            className="min-h-[44px] min-w-[44px] md:min-h-[36px] md:min-w-[36px] inline-flex items-center justify-center p-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
            title="Swap Countries"
          >
            <ArrowLeftRight className="w-4 h-4 tone-blue" />
          </button>

          <OmnisSelect
            value={rightIso}
            onChange={(next) => updateComparePair(leftIso, next)}
            ariaLabel="Select Secondary Comparison Country"
            prefixLabel="Country B:"
            tone="violet"
            size="md"
            options={countryOptions}
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
                onClick={() => updateComparePair(pair.l, pair.r)}
                className="min-h-[44px] md:min-h-[34px] inline-flex items-center px-3 md:px-2.5 py-1.5 rounded-lg bg-[var(--bg-slate)] hover:border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] font-medium transition-colors cursor-pointer"
              >
                {pair.label}
              </button>
            ))}
          </div>
        </div>
      </OmnisModuleHeader>

      {/* Key Differences at a Glance */}
      <div className="omnis-card p-5 sm:p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base sm:text-[17px] font-bold text-[var(--text-primary)]">
            Key Differences at a Glance: {leftCountry.flagEmoji} {leftCountry.name} vs {rightCountry.flagEmoji} {rightCountry.name}
          </h2>
          <span className="text-xs text-[var(--text-muted)]">
            Plain-English summary from latest figures
          </span>
        </div>
        <ul className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] text-[14.5px] sm:text-[15px] leading-relaxed text-[var(--text-secondary)]">
          {comparisonTakeaways.map((bullet, idx) => (
            <li key={idx} className="py-2.5 flex items-baseline gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-blue)] shrink-0 mt-2" />
              <span className="text-[var(--text-primary)]">{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Side-by-Side Indicator Table + Direct Comparison Visual */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 min-w-0 omnis-card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[15px] sm:text-base font-bold text-[var(--text-primary)]">
                Side-by-Side Comparison Table
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Notice the difference between total national scale and per-person averages.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hydratingIsoList.length > 0 ? (
                <span className="px-2 py-0.5 rounded badge-tone-cyan text-xs">
                  Loading World Bank data ({hydratingIsoList.join(", ")})…
                </span>
              ) : null}
              <span className="text-xs text-[var(--text-muted)]">
                Source: World Bank &amp; IMF
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-w-full">
            <OmnisSegmentedControl<"all" | "economy" | "tech_energy">
              groupId="compare-table-category"
              ariaLabel="Filter comparison metrics"
              size="sm"
              value={indicatorTab}
              onChange={setIndicatorTab}
              options={[
                { value: "all", label: "All Indicators" },
                { value: "economy", label: "Economy & Living Standards" },
                { value: "tech_energy", label: "Energy, Tech & Health" },
              ]}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px] sm:text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
                  <th className="py-2.5 pr-3">Indicator</th>
                  <th className="py-2.5 pr-3 tone-blue">
                    {leftCountry.flagEmoji} {leftCountry.name}
                  </th>
                  <th className="py-2.5 pr-3 tone-violet">
                    {rightCountry.flagEmoji} {rightCountry.name}
                  </th>
                  <th className="py-2.5">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] omnis-tabular text-[var(--text-primary)]">
                {visibleRows.map((row) => {
                  const isHydratingRow =
                    hydratingIsoList.length > 0 &&
                    ((hydratingIsoList.includes(leftIso) && row.leftVal === 0) ||
                      (hydratingIsoList.includes(rightIso) && row.rightVal === 0));
                  const anyMissing = Boolean(row.leftMissing || row.rightMissing);
                  const diffVal = row.leftVal - row.rightVal;
                  const bothZero = row.leftVal === 0 && row.rightVal === 0;
                  const sum = Math.max(1e-6, Math.abs(row.leftVal) + Math.abs(row.rightVal));
                  const leftShare =
                    anyMissing || bothZero
                      ? 50
                      : Math.min(92, Math.max(8, (Math.abs(row.leftVal) / sum) * 100));

                  const formatCellValue = (val: number) => {
                    if (row.unit === "$B") return formatUsdBnCompact(val);
                    if (row.unit === "$") return `$${val.toLocaleString()}`;
                    return `${val.toLocaleString()} ${row.unit}`;
                  };

                  let deltaText = "—";
                  if (isHydratingRow) {
                    deltaText = "Syncing…";
                  } else if (anyMissing) {
                    deltaText = "N/A";
                  } else if (bothZero) {
                    deltaText = "Even";
                  } else if (row.deltaKind === "ratio") {
                    const higherVal = Math.max(row.leftVal, row.rightVal);
                    const lowerVal = Math.min(row.leftVal, row.rightVal);
                    const leader = row.leftVal >= row.rightVal ? leftCountry.iso3 : rightCountry.iso3;
                    const gapStr = formatMultipleOrGap(higherVal, lowerVal, "ratio");
                    deltaText = gapStr === "Roughly equal" ? gapStr : `${leader} ${gapStr}`;
                  } else if (row.deltaKind === "pp") {
                    const faster = row.leftVal >= row.rightVal ? leftCountry.iso3 : rightCountry.iso3;
                    const unitHint = row.label.includes("Growth") ? "faster" : "higher";
                    const ppGap = formatMultipleOrGap(
                      Math.max(row.leftVal, row.rightVal),
                      Math.min(row.leftVal, row.rightVal),
                      "pp",
                      unitHint
                    );
                    const shortPp = ppGap.replace("percentage points", "pp");
                    deltaText = shortPp === "Same rate" ? shortPp : `${faster} ${shortPp}`;
                  } else {
                    const higherVal = Math.max(row.leftVal, row.rightVal);
                    const lowerVal = Math.min(row.leftVal, row.rightVal);
                    const leader = row.leftVal >= row.rightVal ? leftCountry.iso3 : rightCountry.iso3;
                    const gapStr = formatMultipleOrGap(higherVal, lowerVal, "diff", row.unit.replace("/", ""));
                    deltaText = gapStr === "No gap" ? gapStr : `${leader} ${gapStr}`;
                  }

                  return (
                    <tr key={row.label} className="hover:bg-[var(--bg-slate)]/50 transition-colors">
                      <td className="py-2.5 pr-3 font-medium text-[var(--text-primary)]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span>{row.label}</span>
                          <span className="text-[11px] font-normal text-[var(--text-muted)]">
                            • {row.scaleNote}
                          </span>
                        </div>
                        <div className="mt-1 h-1 w-28 rounded-full bg-[var(--bg-slate)] overflow-hidden flex">
                          <div style={{ width: `${leftShare}%`, backgroundColor: "var(--chart-blue)" }} />
                          <div style={{ width: `${100 - leftShare}%`, backgroundColor: "var(--chart-violet)" }} />
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 font-bold omnis-mono">
                        {isHydratingRow && row.leftVal === 0 ? (
                          <OmnisSkeleton className="h-4 w-20 rounded" />
                        ) : row.leftMissing ? (
                          <span className="text-[var(--text-muted)]">N/A</span>
                        ) : (
                          formatCellValue(row.leftVal)
                        )}
                      </td>
                      <td className="py-2.5 pr-3 font-bold omnis-mono">
                        {isHydratingRow && row.rightVal === 0 ? (
                          <OmnisSkeleton className="h-4 w-20 rounded" />
                        ) : row.rightMissing ? (
                          <span className="text-[var(--text-muted)]">N/A</span>
                        ) : (
                          formatCellValue(row.rightVal)
                        )}
                      </td>
                      <td
                        className={`py-2.5 text-[13px] font-semibold ${
                          isHydratingRow || anyMissing
                            ? "text-[var(--text-muted)]"
                            : diffVal >= 0
                              ? "tone-verified"
                              : "tone-warning"
                        }`}
                      >
                        {isHydratingRow ? <OmnisSkeleton className="h-4 w-14 rounded" /> : deltaText}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Direct Comparison Visual & Shape View */}
        <div className="lg:col-span-5 min-w-0 omnis-card p-6 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-[15px] sm:text-base font-bold text-[var(--text-primary)]">
              Visual Range &amp; Score Comparison
            </h2>
            <p className="text-[13.5px] sm:text-sm text-[var(--text-secondary)] mt-1">
              Direct numbers plotted on global scales, or switch to Shape View for an overall profile.
            </p>
          </div>

          <ComparisonRadarChart leftCountry={leftCountry} rightCountry={rightCountry} />
        </div>
      </div>

      {/* Key Industries & Companies */}
      <div className="omnis-card p-6 space-y-4">
        <h2 className="text-[15px] sm:text-base font-bold flex items-center gap-2 text-[var(--text-primary)]">
          <TrendingUp className="w-4 h-4 tone-verified" />
          Global Industry &amp; Technology Benchmarks
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 border border-[var(--border-subtle)] rounded-2xl overflow-hidden bg-[var(--bg-graphite)]">
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

      {/* Topics You Follow */}
      <div className="omnis-card p-6 space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 text-[var(--text-primary)]">
            <Sparkles className="w-4 h-4 tone-blue" />
            Topics You Follow
          </h2>
          <p className="text-[13.5px] sm:text-sm text-[var(--text-secondary)] mt-1">
            Pick topics you care about to see fresh academic papers and country updates here.
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
                className={`min-h-[44px] md:min-h-[34px] px-3 py-1.5 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
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
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className={`inline-flex items-center gap-1.5 ${isLive ? "tone-verified" : "tone-cyan"}`}>
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isLive ? "bg-[var(--status-verified)]" : "bg-[var(--status-cyan)]"
                        }`}
                      />
                      {isLive ? "Live study" : "From library"}
                    </span>
                    <span className="tone-blue">{topic}</span>
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
                        folder: "Technology & Compute",
                        tags: [topic, isLive ? "OpenAlex" : "Curated"],
                        href: `/research?q=${encodeURIComponent(topic)}`,
                      });
                      setPinnedTopics((p) => ({ ...p, [topic]: true }));
                    }}
                    className="min-h-[44px] md:min-h-[34px] px-3 md:px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-slate)] hover:border-[var(--border-strong)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
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
