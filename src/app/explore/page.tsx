"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
} from "lucide-react";
import {
  executeUniversalSearch,
  type UniversalSearchSourceFilter,
} from "@/lib/research/engine";
import { fetchOpenAlexSources } from "@/lib/providers/live-data";
import type { ResearchSourceItem } from "@/types/omnis";
import { OmnisLoader } from "@/components/brand/OmnisLogo";
import { OmnisButton, OmnisModuleHeader } from "@/components/ui/OmnisPrimitives";
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

function ExploreContent() {
  const searchParams = useSearchParams();
  const paramQ = searchParams.get("q");
  const initialQ = paramQ || "Explain India's economic development since 1991";

  const [queryInput, setQueryInput] = useState(initialQ);
  const [activeQuery, setActiveQuery] = useState(initialQ);
  const [activeTab, setActiveTab] = useState("overview");
  const [sourceFilter, setSourceFilter] = useState<UniversalSearchSourceFilter>("all");
  const [openAlexWorks, setOpenAlexWorks] = useState<ResearchSourceItem[]>([]);

  const {
    searchHistory,
    savedSearches,
    addSearchQuery,
    toggleSavedSearch,
    clearSearchHistory,
    setActiveContext,
  } = useOmnisStore();

  useEffect(() => {
    if (paramQ && paramQ.trim()) {
      setQueryInput(paramQ);
      setActiveQuery(paramQ);
    }
  }, [paramQ]);

  useEffect(() => {
    setActiveContext("Universal Search & Knowledge Explorer", activeQuery);
  }, [activeQuery, setActiveContext]);

  useEffect(() => {
    let active = true;
    fetchOpenAlexSources(activeQuery, 4)
      .then((items) => {
        if (active) setOpenAlexWorks(items);
      })
      .catch(() => {
        if (active) setOpenAlexWorks([]);
      });
    return () => {
      active = false;
    };
  }, [activeQuery]);

  const searchResults = useMemo(
    () => executeUniversalSearch(activeQuery, activeTab, sourceFilter),
    [activeQuery, activeTab, sourceFilter]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = queryInput.trim();
    if (!clean) return;
    addSearchQuery(clean);
    setActiveQuery(clean);
  };

  const isSaved = savedSearches.includes(activeQuery);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Universal Search Header */}
      <OmnisModuleHeader
        moduleTag="UNIVERSAL NATURAL-LANGUAGE SEARCH & KNOWLEDGE EXPLORER"
        title="Semantic Discovery Across Countries, Science, Economics & History"
        subtitle="Decompose complex natural-language queries across sovereign World Bank dossiers, historical inflection events, and interactive Knowledge Graph pathways."
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
          <div className="flex-1 flex items-center gap-2.5 px-3 py-1.5">
            <Search className="w-4 h-4 tone-blue shrink-0" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search anything (typo-tolerant & natural language enabled)..."
              className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
          </div>
          <OmnisSelect
            value={sourceFilter}
            onChange={(val) => setSourceFilter(val as UniversalSearchSourceFilter)}
            ariaLabel="Filter by Data Provider Source"
            size="md"
            options={[
              { value: "all", label: "All Verified Sources" },
              { value: "worldbank", label: "World Bank & IMF" },
              { value: "openalex", label: "OpenAlex Peer-Reviewed" },
              { value: "wikimedia", label: "Wikimedia & Archives" },
              { value: "curated", label: "Curated OMNIS Benchmarks" },
            ]}
          />
          <OmnisButton type="submit">Search OMNIS</OmnisButton>
        </form>

        {/* Natural Language Intent Classification Banner */}
        <div className="p-3 rounded-xl badge-tone-blue flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              Semantic Intent:{" "}
              <strong className="uppercase tracking-wider">
                {searchResults.classification.intent.replace(/_/g, " ")}
              </strong>{" "}
              (Confidence: {(searchResults.classification.confidence * 100).toFixed(0)}%)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/research?q=${encodeURIComponent(activeQuery)}`}
              className="px-3 py-1 rounded-lg bg-[var(--accent-blue-solid)] text-white font-semibold inline-flex items-center gap-1 shadow-2xs"
            >
              <FileSearch className="w-3 h-3" />
              <span>Synthesise Full Research Report</span>
            </Link>
            <Link
              href={`/knowledge-graph?topic=${encodeURIComponent(activeQuery.slice(0, 45))}`}
              className="px-3 py-1 rounded-lg bg-[var(--bg-graphite)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold inline-flex items-center gap-1 hover:border-[var(--border-strong)]"
            >
              <Network className="w-3 h-3 tone-violet" />
              <span>Open in Knowledge Graph</span>
            </Link>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {RESULT_CATEGORIES.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[var(--accent-blue-solid)] text-white shadow-xs"
                  : "bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </OmnisModuleHeader>

      {/* Categorised Search Results + History Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {searchResults.countries.length === 0 &&
            openAlexWorks.length === 0 &&
            searchResults.historicalEvents.length === 0 &&
            searchResults.technologiesAndOrganizations.length === 0 && (
              <section className="omnis-card p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] omnis-mono font-bold uppercase tracking-[0.16em] tone-warning mb-1">
                      ZERO DIRECT MATCHES IN INDEX
                    </div>
                    <h2 className="text-base font-bold text-[var(--text-primary)]">
                      No verified records matched &ldquo;{activeQuery}&rdquo;
                    </h2>
                  </div>
                  {sourceFilter !== "all" && (
                    <OmnisButton variant="secondary" onClick={() => setSourceFilter("all")}>
                      Reset Source Filter
                    </OmnisButton>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  OMNIS enforces strict provenance honesty and never substitutes unrelated fallback countries or events when a query yields zero matches. Try broadening keywords, checking spelling, or switching directly into the Deep Research synthesiser for OpenAlex literature discovery.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] omnis-mono">
                    Quick Try:
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
                      onClick={() => {
                        setQueryInput(sample);
                        setActiveQuery(sample);
                        setSourceFilter("all");
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-[var(--accent-blue)] text-xs font-medium text-[var(--text-primary)] transition-colors cursor-pointer"
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
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold flex items-center gap-2 text-[var(--text-primary)]">
                  <Globe2 className="w-4 h-4 tone-blue" />
                  Sovereign Country Intelligence Matches ({searchResults.countries.length})
                </h2>
                <Link href="/atlas" className="text-xs tone-blue font-semibold hover:underline">
                  Open 3D Global Atlas →
                </Link>
              </div>
              {searchResults.countries.length === 0 ? (
                <div className="omnis-surface-slate p-4 text-xs text-[var(--text-secondary)] flex flex-wrap items-center justify-between gap-2">
                  <span>
                    No Sovereign Country profiles match the active source filter ({sourceFilter}).
                  </span>
                  <button
                    type="button"
                    onClick={() => setSourceFilter("all")}
                    className="tone-blue font-semibold hover:underline cursor-pointer"
                  >
                    Show All Verified Sources
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {searchResults.countries.map((c) => (
                    <Link
                      key={c.iso3}
                      href={`/atlas?country=${c.iso3}`}
                      className="omnis-surface-slate omnis-card-interactive p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-[var(--text-primary)]">
                          {c.flagEmoji} {c.officialName}
                        </span>
                        <span className="text-[10px] font-bold omnis-mono px-1.5 py-0.5 rounded-md badge-tone-blue shrink-0">
                          {c.iso3}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] omnis-tabular">
                        GDP: <strong className="text-[var(--text-primary)]">${c.gdpUsdBn.toLocaleString()}B</strong>{" "}
                        (+{c.gdpGrowthPct}%/yr) • Capita: ${c.gdpPerCapitaUsd.toLocaleString()} • Clean:{" "}
                        {c.energyProfile.renewableSharePct}%
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        Source: {c.provenance.source}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Live Peer-Reviewed OpenAlex Literature Section */}
          {(activeTab === "overview" || activeTab === "research") &&
            (sourceFilter === "all" || sourceFilter === "openalex") &&
            openAlexWorks.length > 0 && (
              <section className="omnis-card p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold flex items-center gap-2 text-[var(--text-primary)]">
                    <FileSearch className="w-4 h-4 tone-verified" />
                    Live OpenAlex Scholarly Literature ({openAlexWorks.length})
                  </h2>
                  <span className="px-2 py-0.5 rounded-full badge-tone-verified text-[10px] font-semibold omnis-mono uppercase">
                    OpenAlex Live
                  </span>
                </div>
                <div className="space-y-2.5">
                  {openAlexWorks.map((work) => (
                    <a
                      key={work.id}
                      href={work.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block omnis-surface-slate omnis-card-interactive p-4 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] omnis-mono">
                        <span className="tone-verified font-semibold">{work.publishedDate}</span>
                        <span className="text-[var(--text-muted)] truncate">{work.publisher}</span>
                      </div>
                      <div className="font-bold text-sm text-[var(--text-primary)]">{work.title}</div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {work.excerpt}
                      </p>
                    </a>
                  ))}
                </div>
              </section>
            )}

          {/* Historical Events Section */}
          {(activeTab === "overview" || activeTab === "events" || activeTab === "research") && (
            <section className="omnis-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold flex items-center gap-2 text-[var(--text-primary)]">
                  <Clock className="w-4 h-4 tone-warning" />
                  Historical Events & Research Milestones ({searchResults.historicalEvents.length})
                </h2>
                <Link href="/timeline" className="text-xs tone-blue font-semibold hover:underline">
                  Open Reality Timeline →
                </Link>
              </div>
              {searchResults.historicalEvents.length === 0 ? (
                <div className="omnis-surface-slate p-4 text-xs text-[var(--text-secondary)]">
                  No timeline events match the active source filter ({sourceFilter}).
                </div>
              ) : (
                <div className="space-y-2.5">
                  {searchResults.historicalEvents.map((evt) => (
                    <Link
                      key={evt.id}
                      href={`/timeline?event=${evt.id}`}
                      className="block omnis-surface-slate omnis-card-interactive p-4 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold tone-blue omnis-mono">{evt.dateDisplay}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{evt.location}</span>
                      </div>
                      <div className="font-bold text-sm text-[var(--text-primary)]">{evt.title}</div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
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
              <h2 className="text-sm font-bold flex items-center gap-2 text-[var(--text-primary)]">
                <Cpu className="w-4 h-4 tone-violet" />
                Technologies, Industries & Related Concepts (
                {searchResults.technologiesAndOrganizations.length})
              </h2>
              {searchResults.technologiesAndOrganizations.length === 0 ? (
                <div className="omnis-surface-slate p-4 text-xs text-[var(--text-secondary)]">
                  No technology or industry benchmarks match the active source filter ({sourceFilter}).
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {searchResults.technologiesAndOrganizations.map((item) => (
                    <div key={item.id} className="omnis-surface-slate p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-[var(--text-primary)]">{item.name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md badge-tone-violet shrink-0">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[var(--text-secondary)] leading-relaxed">{item.subtitle}</p>
                      <div className="text-[10px] text-[var(--text-muted)]">Source: {item.source}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right Column: Search History, Saved Searches & Related Concept Graph Bridges */}
        <div className="lg:col-span-4 space-y-6">
          <div className="omnis-card p-5 space-y-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Related Exploration Paths</h3>
            <div className="space-y-2">
              {searchResults.relatedConcepts.map((concept) => (
                <button
                  key={concept}
                  type="button"
                  onClick={() => {
                    setQueryInput(concept);
                    setActiveQuery(concept);
                  }}
                  className="w-full text-left omnis-surface-slate omnis-card-interactive p-3 text-xs text-[var(--text-primary)] flex items-center justify-between cursor-pointer"
                >
                  <span className="font-medium truncate pr-2">{concept}</span>
                  <ArrowRight className="w-3.5 h-3.5 tone-blue shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <div className="omnis-card p-5 space-y-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Saved Searches ({savedSearches.length})
            </h3>
            <div className="space-y-1.5">
              {savedSearches.map((sq) => (
                <button
                  key={sq}
                  type="button"
                  onClick={() => {
                    setQueryInput(sq);
                    setActiveQuery(sq);
                  }}
                  className="w-full text-left omnis-surface-slate omnis-card-interactive p-2.5 text-xs text-[var(--text-primary)] truncate cursor-pointer"
                >
                  ★ {sq}
                </button>
              ))}
            </div>
          </div>

          <div className="omnis-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Recent Search History</h3>
              <button
                type="button"
                onClick={clearSearchHistory}
                className="text-[11px] font-medium text-[var(--text-muted)] hover:tone-danger inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            </div>
            <div className="space-y-1.5">
              {searchHistory.map((hq) => (
                <button
                  key={hq}
                  type="button"
                  onClick={() => {
                    setQueryInput(hq);
                    setActiveQuery(hq);
                  }}
                  className="w-full text-left omnis-surface-slate omnis-card-interactive p-2.5 text-xs text-[var(--text-primary)] truncate cursor-pointer"
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
          <OmnisLoader label="Initialising Universal Knowledge Explorer..." />
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
