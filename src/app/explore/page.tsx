"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Compass,
  Search,
  Sparkles,
  Bookmark,
  Globe2,
  Clock,
  Cpu,
  FileSearch,
  Network,
  ArrowRight,
  Trash2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { AddyIntelligenceView } from "@/components/ai/AddyIntelligenceView";
import { AddyRetrievalStepper } from "@/components/ai/AddyRetrievalStepper";
import { streamResearchWithProgress, type RetrievalStageState } from "@/lib/ai/stream-client";
import type { AddyIntelligenceBrief } from "@/lib/ai/contracts";
import {
  executeUniversalSearch,
  type UniversalSearchSourceFilter,
} from "@/lib/research/engine";
import { formatSignedPct } from "@/lib/formatters";
import { fetchOpenAlexSources } from "@/lib/providers/live-data";
import type { ResearchSourceItem } from "@/types/omnis";
import { OmnisLoader } from "@/components/brand/OmnisLogo";
import {
  OmnisButton,
  OmnisModuleHeader,
  OmnisSegmentedControl,
  OmnisSkeleton,
} from "@/components/ui/OmnisPrimitives";
import { OmnisSelect } from "@/components/ui/OmnisSelect";
import { useOmnisStore } from "@/lib/store/use-omnis-store";

const RESULT_CATEGORIES = [
  { id: "overview", label: "Overview" },
  { id: "countries", label: "Countries" },
  { id: "research", label: "Articles & Research" },
  { id: "technologies", label: "Technologies & Industries" },
  { id: "events", label: "Historical Events" },
  { id: "statistics", label: "Statistics & Visualisations" },
  { id: "concepts", label: "Related Concepts" },
];

const VALID_SOURCES: UniversalSearchSourceFilter[] = [
  "all",
  "worldbank",
  "openalex",
  "wikimedia",
  "curated",
];

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramQ = searchParams.get("q");
  const paramCat = searchParams.get("cat");
  const paramSource = searchParams.get("source");
  const initialQ = paramQ || "Explain India's economic development since 1991";
  const initialCat =
    paramCat && RESULT_CATEGORIES.some((c) => c.id === paramCat) ? paramCat : "overview";
  const initialSource: UniversalSearchSourceFilter =
    paramSource && VALID_SOURCES.includes(paramSource as UniversalSearchSourceFilter)
      ? (paramSource as UniversalSearchSourceFilter)
      : "all";

  const [queryInput, setQueryInput] = useState(initialQ);
  const [activeQuery, setActiveQuery] = useState(initialQ);
  const [activeTab, setActiveTab] = useState(initialCat);
  const [sourceFilter, setSourceFilter] = useState<UniversalSearchSourceFilter>(initialSource);
  const [openAlexFetch, setOpenAlexFetch] = useState<{
    query: string;
    works: ResearchSourceItem[];
    status: "verified" | "offline-fallback";
  } | null>(null);
  const openAlexWorks = openAlexFetch?.query === activeQuery ? openAlexFetch.works : [];
  const liveFetchState: "loading" | "verified" | "offline-fallback" =
    openAlexFetch?.query === activeQuery ? openAlexFetch.status : "loading";

  const [briefResult, setBriefResult] = useState<{
    query: string;
    brief: AddyIntelligenceBrief | null;
    error: string | null;
  } | null>(null);
  const [briefStageState, setBriefStageState] = useState<{
    query: string;
    stages: Partial<Record<1 | 2 | 3 | 4, RetrievalStageState>>;
  }>({ query: "", stages: {} });
  const briefStages = briefStageState.query === activeQuery ? briefStageState.stages : {};
  const [briefElapsedMs, setBriefElapsedMs] = useState(0);
  const [briefRetryTick, setBriefRetryTick] = useState(0);
  const briefLoading = briefResult?.query !== activeQuery;
  const activeBrief = briefResult?.query === activeQuery ? briefResult.brief : null;
  const briefError = briefResult?.query === activeQuery ? briefResult.error : null;

  const {
    searchHistory,
    savedSearches,
    addSearchQuery,
    toggleSavedSearch,
    clearSearchHistory,
    setActiveContext,
    setFocusedSignal,
  } = useOmnisStore();

  const exploreUrlKey = `${paramQ ?? ""}::${paramCat ?? ""}::${paramSource ?? ""}`;
  const [prevExploreUrlKey, setPrevExploreUrlKey] = useState(exploreUrlKey);
  if (exploreUrlKey !== prevExploreUrlKey) {
    setPrevExploreUrlKey(exploreUrlKey);
    if (paramQ && paramQ.trim()) {
      setQueryInput(paramQ);
      setActiveQuery(paramQ);
    }
    if (paramCat && RESULT_CATEGORIES.some((c) => c.id === paramCat)) {
      setActiveTab(paramCat);
    } else if (paramCat === null) {
      setActiveTab("overview");
    }
    if (paramSource && VALID_SOURCES.includes(paramSource as UniversalSearchSourceFilter)) {
      setSourceFilter(paramSource as UniversalSearchSourceFilter);
    } else if (paramSource === null) {
      setSourceFilter("all");
    }
  }

  const syncExploreUrl = (
    nextQ: string,
    nextCat: string,
    nextSource: UniversalSearchSourceFilter
  ) => {
    const params = new URLSearchParams();
    params.set("q", nextQ);
    if (nextCat && nextCat !== "overview") params.set("cat", nextCat);
    if (nextSource && nextSource !== "all") params.set("source", nextSource);
    router.replace(`/explore?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    setActiveContext("Universal Search & Knowledge Explorer", activeQuery);
    if (activeQuery.trim()) {
      setFocusedSignal({ topic: activeQuery, label: activeQuery });
    }
  }, [activeQuery, setActiveContext, setFocusedSignal]);

  useEffect(() => {
    let active = true;
    const targetQuery = activeQuery;
    fetchOpenAlexSources(targetQuery, 4)
      .then((items) => {
        if (!active) return;
        setOpenAlexFetch({
          query: targetQuery,
          works: items,
          status: items.length > 0 ? "verified" : "offline-fallback",
        });
      })
      .catch(() => {
        if (!active) return;
        setOpenAlexFetch({
          query: targetQuery,
          works: [],
          status: "offline-fallback",
        });
      });
    return () => {
      active = false;
    };
  }, [activeQuery]);

  useEffect(() => {
    const targetQuery = activeQuery.trim();
    if (targetQuery.length < 3) return;
    const controller = new AbortController();
    let active = true;
    const startedAt = Date.now();
    const ticker = window.setInterval(() => {
      if (active) setBriefElapsedMs(Date.now() - startedAt);
    }, 150);

    streamResearchWithProgress(targetQuery, "deep", {
      signal: controller.signal,
      onStage: (stage) => {
        if (!active) return;
        setBriefElapsedMs(stage.elapsedMs);
        setBriefStageState((prev) => ({
          query: activeQuery,
          stages: {
            ...(prev.query === activeQuery ? prev.stages : {}),
            [stage.step]: stage,
          },
        }));
      },
    })
      .then((report) => {
        if (!active) return;
        setBriefResult({ query: activeQuery, brief: report.brief ?? null, error: null });
      })
      .catch((err) => {
        if (!active || (err instanceof Error && err.name === "AbortError")) return;
        setBriefResult({
          query: activeQuery,
          brief: null,
          error: err instanceof Error ? err.message : "Failed to synthesize grounded brief.",
        });
      })
      .finally(() => {
        window.clearInterval(ticker);
      });

    return () => {
      active = false;
      window.clearInterval(ticker);
      controller.abort();
    };
  }, [activeQuery, briefRetryTick]);

  const searchResults = useMemo(
    () => executeUniversalSearch(activeQuery, activeTab, sourceFilter),
    [activeQuery, activeTab, sourceFilter]
  );

  const runSearchQuery = (raw: string, resetSourceFilter = false) => {
    const clean = raw.trim();
    if (!clean) return;
    setQueryInput(clean);
    setActiveQuery(clean);
    const nextSource = resetSourceFilter ? "all" : sourceFilter;
    if (resetSourceFilter) {
      setSourceFilter("all");
    }
    syncExploreUrl(clean, activeTab, nextSource);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = queryInput.trim();
    if (!clean) return;
    addSearchQuery(clean);
    runSearchQuery(clean);
  };

  const isSaved = savedSearches.includes(activeQuery);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Universal Search Header */}
      <OmnisModuleHeader
        moduleTag="Topic & Country Search"
        title="Search Countries, History, Science & Academic Studies"
        subtitle="Find country figures, historical timelines, concept maps, and academic papers in one place."
        icon={<Compass className="w-3.5 h-3.5" />}
        actions={
          <OmnisButton
            variant={isSaved ? "primary" : "secondary"}
            onClick={() => toggleSavedSearch(activeQuery)}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{isSaved ? "Search Saved" : "Save Search Query"}</span>
          </OmnisButton>
        }
      >
        {/* Search Input */}
        <form
          onSubmit={handleSearch}
          className="flex flex-col sm:flex-row gap-2 bg-[var(--bg-slate)] p-2 rounded-xl border border-[var(--border-subtle)] focus-within:border-[var(--accent-blue)] transition-colors"
        >
          <div className="flex-1 flex items-center gap-2.5 px-3 py-1">
            <Search className="w-4 h-4 tone-blue shrink-0" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search any country, topic, event, or question..."
              className="w-full min-h-[44px] sm:min-h-[36px] bg-transparent text-base md:text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
          </div>
          <OmnisSelect
            value={sourceFilter}
            onChange={(val) => {
              const nextSource = val as UniversalSearchSourceFilter;
              setSourceFilter(nextSource);
              syncExploreUrl(activeQuery, activeTab, nextSource);
            }}
            ariaLabel="Filter by Data Provider Source"
            size="md"
            options={[
              { value: "all", label: "All Verified Sources" },
              { value: "worldbank", label: "World Bank & IMF" },
              { value: "openalex", label: "OpenAlex Peer-Reviewed" },
              { value: "wikimedia", label: "Wikimedia & Archives" },
              { value: "curated", label: "Built-in Industry Guides" },
            ]}
          />
          <OmnisButton type="submit" className="min-h-[44px]">Search</OmnisButton>
        </form>

        {/* Quick Routing Helper */}
        <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-slate)]/50 flex flex-wrap items-center justify-between gap-2.5 text-[13px]">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Sparkles className="w-4 h-4 tone-blue shrink-0" />
            <span className="font-medium">
              Best tools for this topic:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/research?q=${encodeURIComponent(activeQuery)}`}
              className="min-h-[44px] sm:min-h-0 px-3 py-1.5 rounded-lg bg-[var(--accent-blue-solid)] text-white font-semibold inline-flex items-center gap-1.5 shadow-2xs"
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span>Read Full Research Report</span>
            </Link>
            <Link
              href={`/knowledge-graph?topic=${encodeURIComponent(activeQuery.slice(0, 45))}`}
              className="min-h-[44px] sm:min-h-0 px-3 py-1.5 rounded-lg bg-[var(--bg-graphite)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold inline-flex items-center gap-1.5 hover:border-[var(--border-strong)]"
            >
              <Network className="w-3.5 h-3.5 tone-violet" />
              <span>Open in Concept Map</span>
            </Link>
            <Link
              href="/intelligence"
              className="min-h-[44px] sm:min-h-0 px-3 py-1.5 rounded-lg bg-[var(--bg-graphite)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold inline-flex items-center gap-1.5 hover:border-[var(--border-strong)]"
            >
              <span>Compare Countries</span>
            </Link>
          </div>
        </div>

        {/* Category Filter Tabs (OmnisSegmentedControl) */}
        <div className="pt-1 overflow-x-auto max-w-full">
          <OmnisSegmentedControl
            groupId="explore-category-tabs"
            ariaLabel="Universal Search Category Filter"
            size="sm"
            value={activeTab}
            onChange={(val) => {
              setActiveTab(val);
              syncExploreUrl(activeQuery, val, sourceFilter);
            }}
            options={RESULT_CATEGORIES.map((tab) => ({
              value: tab.id,
              label: tab.label,
            }))}
          />
        </div>
      </OmnisModuleHeader>

      {/* Synthesized Grounded Intelligence Brief above Categorized Indices */}
      {(activeTab === "overview" || activeTab === "research") && activeQuery.trim().length >= 3 ? (
        <section className="space-y-4">
          {briefError ? (
            <div className="omnis-card p-4 border-[var(--status-danger)] text-sm tone-danger flex flex-wrap items-center justify-between gap-2 font-medium">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{briefError}</span>
              </div>
              <OmnisButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  setBriefResult(null);
                  setBriefRetryTick((n) => n + 1);
                }}
                className="min-h-[44px]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Brief</span>
              </OmnisButton>
            </div>
          ) : briefLoading ? (
            <AddyRetrievalStepper
              stages={briefStages}
              elapsedMs={briefElapsedMs}
              query={activeQuery}
            />
          ) : activeBrief ? (
            <AddyIntelligenceView
              brief={activeBrief}
              onSelectFollowUp={(fq) => runSearchQuery(fq)}
            />
          ) : null}
        </section>
      ) : null}

      {/* Categorised Search Results + History Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 min-w-0 space-y-6">
          {searchResults.countries.length === 0 &&
            liveFetchState !== "loading" &&
            openAlexWorks.length === 0 &&
            searchResults.historicalEvents.length === 0 &&
            searchResults.technologiesAndOrganizations.length === 0 && (
              <section className="omnis-card p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold tone-warning mb-1">
                      No matches found
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                      No verified records matched &ldquo;{activeQuery}&rdquo;
                    </h2>
                  </div>
                  {sourceFilter !== "all" && (
                    <OmnisButton
                      variant="secondary"
                      onClick={() => {
                        setSourceFilter("all");
                        syncExploreUrl(activeQuery, activeTab, "all");
                      }}
                    >
                      Reset Source Filter
                    </OmnisButton>
                  )}
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  OMNIS never makes up results when nothing matches your search. Try simpler words, check spelling, or ask AddyIntelligence to find academic studies.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">
                    Quick try:
                  </span>
                  {[
                    "India economy since 1991",
                    "Semiconductor lithography",
                    "Clean energy storage",
                    "Artificial intelligence",
                  ].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => runSearchQuery(sample, true)}
                      className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-[var(--accent-blue)] text-[13px] font-medium text-[var(--text-primary)] transition-colors cursor-pointer"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </section>
            )}

          {/* Countries Section */}
          {(activeTab === "overview" || activeTab === "countries" || activeTab === "statistics") && (
            <section className="omnis-card p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[15px] sm:text-base font-bold flex items-center gap-2 text-[var(--text-primary)]">
                  <Globe2 className="w-4 h-4 tone-blue shrink-0" />
                  Matching Countries ({searchResults.countries.length})
                </h2>
                <Link
                  href="/atlas"
                  className="omnis-magnetic-arrow text-[13px] tone-blue font-semibold hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  <span>Open 3D Global Atlas</span>
                  <ArrowRight className="omnis-arrow-glyph w-3.5 h-3.5" />
                </Link>
              </div>
              {searchResults.countries.length === 0 ? (
                <div className="py-3 border-t border-[var(--border-subtle)] text-[13.5px] sm:text-sm text-[var(--text-secondary)] flex flex-wrap items-center justify-between gap-2">
                  <span>
                    No Sovereign Country profiles match the active source filter ({sourceFilter}).
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSourceFilter("all");
                      syncExploreUrl(activeQuery, activeTab, "all");
                    }}
                    className="tone-blue font-semibold hover:underline cursor-pointer"
                  >
                    Show All Verified Sources
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                  {searchResults.countries.map((c) => (
                    <Link
                      key={c.iso3}
                      href={`/atlas?country=${c.iso3}`}
                      className="omnis-magnetic-arrow flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3.5 px-1 hover:bg-[var(--bg-slate)]/50 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[15px] text-[var(--text-primary)]">
                            {c.flagEmoji} {c.officialName}
                          </span>
                          <span className="text-[11px] font-bold omnis-mono px-1.5 py-0.5 rounded-md badge-tone-blue shrink-0">
                            {c.iso3}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--text-muted)] truncate">
                          Source: {c.provenance.source}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[13px] text-[var(--text-secondary)] omnis-tabular shrink-0">
                        {c.gdpUsdBn > 0 ? (
                          <span>
                            GDP{" "}
                            <strong className="omnis-mono text-[var(--text-primary)]">
                              ${c.gdpUsdBn.toLocaleString()}B
                            </strong>{" "}
                            <span className={c.gdpGrowthPct >= 0 ? "tone-verified" : "tone-warning"}>
                              ({formatSignedPct(c.gdpGrowthPct)})
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs font-medium tone-cyan">
                            Load latest data →
                          </span>
                        )}
                        {c.gdpUsdBn > 0 && (
                          <span className="hidden sm:inline">
                            Clean {c.energyProfile.renewableSharePct}%
                          </span>
                        )}
                        <ArrowRight className="omnis-arrow-glyph w-3.5 h-3.5 tone-blue" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Academic Papers Section */}
          {(activeTab === "overview" || activeTab === "research") &&
            (sourceFilter === "all" || sourceFilter === "openalex") && (
              <section className="omnis-card p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-[15px] sm:text-base font-bold flex items-center gap-2 text-[var(--text-primary)]">
                    <FileSearch className="w-4 h-4 tone-verified" />
                    Academic Papers ({openAlexWorks.length})
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                      liveFetchState === "verified"
                        ? "tone-verified"
                        : liveFetchState === "loading"
                          ? "tone-cyan"
                          : "tone-warning"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        liveFetchState === "verified"
                          ? "bg-[var(--status-verified)]"
                          : liveFetchState === "loading"
                            ? "bg-[var(--status-cyan)] animate-pulse"
                            : "bg-[var(--status-warning)]"
                      }`}
                    />
                    {liveFetchState === "loading"
                      ? "Searching OpenAlex…"
                      : liveFetchState === "verified"
                        ? "Live OpenAlex Results"
                        : "Showing built-in library"}
                  </span>
                </div>
                {liveFetchState === "loading" ? (
                  <div className="space-y-2.5 pt-1">
                    <OmnisSkeleton className="h-14" />
                    <OmnisSkeleton className="h-14" />
                  </div>
                ) : openAlexWorks.length === 0 ? (
                  <div className="py-3 border-t border-[var(--border-subtle)] text-[13.5px] sm:text-sm text-[var(--text-secondary)]">
                    Live OpenAlex query returned no direct DOI matches or was rate-limited. Curated OMNIS historical &amp; sovereign indices remain active above and below.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                    {openAlexWorks.map((work) => (
                      <a
                        key={work.id}
                        href={work.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="omnis-magnetic-arrow block py-3.5 px-1 space-y-1.5 hover:bg-[var(--bg-slate)]/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs omnis-mono">
                          <span className="tone-verified font-semibold">{work.publishedDate}</span>
                          <span className="text-[var(--text-muted)] truncate">{work.publisher}</span>
                        </div>
                        <div className="font-bold text-[15px] text-[var(--text-primary)] flex items-center justify-between gap-2">
                          <span>{work.title}</span>
                          <ArrowRight className="omnis-arrow-glyph w-3.5 h-3.5 tone-blue shrink-0" />
                        </div>
                        <p className="text-[13.5px] sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                          {work.excerpt}
                        </p>
                      </a>
                    ))}
                  </div>
                )}
              </section>
            )}

          {/* Historical Events Section */}
          {(activeTab === "overview" || activeTab === "events" || activeTab === "research") && (
            <section className="omnis-card p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[15px] sm:text-base font-bold flex items-center gap-2 text-[var(--text-primary)]">
                  <Clock className="w-4 h-4 tone-warning shrink-0" />
                  Historical Events & Research Milestones ({searchResults.historicalEvents.length})
                </h2>
                <Link
                  href="/timeline"
                  className="omnis-magnetic-arrow text-[13px] tone-blue font-semibold hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  <span>Open Reality Timeline</span>
                  <ArrowRight className="omnis-arrow-glyph w-3.5 h-3.5" />
                </Link>
              </div>
              {searchResults.historicalEvents.length === 0 ? (
                <div className="py-3 border-t border-[var(--border-subtle)] text-[13.5px] sm:text-sm text-[var(--text-secondary)]">
                  No timeline events match the active source filter ({sourceFilter}).
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                  {searchResults.historicalEvents.map((evt) => (
                    <Link
                      key={evt.id}
                      href={`/timeline?event=${evt.id}`}
                      className="omnis-magnetic-arrow block py-3.5 px-1 space-y-1.5 hover:bg-[var(--bg-slate)]/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="font-bold tone-blue omnis-mono">{evt.dateDisplay}</span>
                        <span className="text-xs text-[var(--text-muted)]">{evt.location}</span>
                      </div>
                      <div className="font-bold text-[15px] text-[var(--text-primary)] flex items-center justify-between gap-2">
                        <span>{evt.title}</span>
                        <ArrowRight className="omnis-arrow-glyph w-3.5 h-3.5 tone-blue shrink-0" />
                      </div>
                      <p className="text-[13.5px] sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                        {evt.description}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Technologies & Organisations Section */}
          {(activeTab === "overview" ||
            activeTab === "technologies" ||
            activeTab === "concepts") && (
            <section className="omnis-card p-5 space-y-3">
              <h2 className="text-[15px] sm:text-base font-bold flex items-center gap-2 text-[var(--text-primary)]">
                <Cpu className="w-4 h-4 tone-violet shrink-0" />
                Technologies, Industries & Related Concepts (
                {searchResults.technologiesAndOrganizations.length})
              </h2>
              {searchResults.technologiesAndOrganizations.length === 0 ? (
                <div className="py-3 border-t border-[var(--border-subtle)] text-[13.5px] sm:text-sm text-[var(--text-secondary)]">
                  No technology or industry benchmarks match the active source filter ({sourceFilter}).
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                  {searchResults.technologiesAndOrganizations.map((item) => (
                    <div key={item.id} className="py-3.5 px-1 space-y-1.5 text-[13.5px] sm:text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[15px] text-[var(--text-primary)]">{item.name}</span>
                        <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-md badge-tone-violet shrink-0">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[var(--text-secondary)] leading-relaxed">{item.subtitle}</p>
                      <div className="text-xs text-[var(--text-muted)]">Source: {item.source}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right Column: De-carded Search History, Saved Searches & Related Paths */}
        <div className="lg:col-span-4 min-w-0 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-[var(--border-subtle)] lg:pl-6 divide-y divide-[var(--border-subtle)]">
          <div className="pb-5 space-y-3">
            <h3 className="text-[15px] sm:text-base font-bold text-[var(--text-primary)]">Related Topics</h3>
            <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
              {searchResults.relatedConcepts.map((concept) => (
                <button
                  key={concept}
                  type="button"
                  onClick={() => runSearchQuery(concept)}
                  className="omnis-magnetic-arrow w-full text-left py-2.5 px-1 text-[13.5px] text-[var(--text-primary)] flex items-center justify-between cursor-pointer hover:bg-[var(--bg-slate)]/50 transition-colors"
                >
                  <span className="font-medium truncate pr-2">{concept}</span>
                  <ArrowRight className="omnis-arrow-glyph w-3.5 h-3.5 tone-blue shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <div className="py-5 space-y-3">
            <h3 className="text-[15px] sm:text-base font-bold text-[var(--text-primary)]">
              Saved Searches ({savedSearches.length})
            </h3>
            <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
              {savedSearches.map((sq) => (
                <button
                  key={sq}
                  type="button"
                  onClick={() => runSearchQuery(sq)}
                  className="w-full text-left py-2.5 px-1 text-[13.5px] text-[var(--text-primary)] truncate cursor-pointer hover:bg-[var(--bg-slate)]/50 transition-colors"
                >
                  ★ {sq}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] sm:text-base font-bold text-[var(--text-primary)]">Recent Searches</h3>
              <button
                type="button"
                onClick={clearSearchHistory}
                className="text-xs font-medium text-[var(--text-muted)] hover:tone-danger inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            </div>
            <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
              {searchHistory.map((hq) => (
                <button
                  key={hq}
                  type="button"
                  onClick={() => runSearchQuery(hq)}
                  className="w-full text-left py-2.5 px-1 text-[13.5px] text-[var(--text-primary)] truncate cursor-pointer hover:bg-[var(--bg-slate)]/50 transition-colors"
                >
                  {hq}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 max-w-7xl mx-auto">
          <OmnisLoader label="Loading search…" />
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
