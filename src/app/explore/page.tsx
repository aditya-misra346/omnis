"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { executeUniversalSearch } from "@/lib/research/engine";
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
  const router = useRouter();
  const initialQ =
    searchParams.get("q") || "Explain India's economic development since 1991";

  const [queryInput, setQueryInput] = useState(initialQ);
  const [activeQuery, setActiveQuery] = useState(initialQ);
  const [activeTab, setActiveTab] = useState("overview");
  const [sourceFilter, setSourceFilter] = useState("all");

  const {
    searchHistory,
    savedSearches,
    addSearchQuery,
    toggleSavedSearch,
    clearSearchHistory,
    setActiveContext,
  } = useOmnisStore();

  useEffect(() => {
    setActiveContext("Universal Search & Knowledge Explorer", activeQuery);
  }, [activeQuery, setActiveContext]);

  const searchResults = useMemo(
    () => executeUniversalSearch(activeQuery, activeTab),
    [activeQuery, activeTab]
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
      <div className="omnis-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">
              <Compass className="w-3.5 h-3.5" />
              <span>UNIVERSAL NATURAL-LANGUAGE SEARCH & KNOWLEDGE EXPLORER</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">
              Semantic Discovery Across Countries, Science, Economics & History
            </h1>
          </div>

          <button
            type="button"
            onClick={() => toggleSavedSearch(activeQuery)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border ${
              isSaved
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-[var(--bg-slate)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{isSaved ? "Search Saved" : "Save Search Query"}</span>
          </button>
        </div>

        {/* Search Input */}
        <form
          onSubmit={handleSearch}
          className="flex flex-col sm:flex-row gap-2 bg-[var(--bg-slate)] p-2 rounded-xl border border-[var(--border-subtle)]"
        >
          <div className="flex-1 flex items-center gap-2.5 px-3 py-1.5">
            <Search className="w-4 h-4 text-blue-400 shrink-0" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search anything (typo-tolerant & natural language enabled)..."
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            aria-label="Filter by Data Provider Source"
            className="px-3 py-2 rounded-lg bg-[var(--bg-graphite)] border border-[var(--border-subtle)] text-xs"
          >
            <option value="all">All Verified Sources</option>
            <option value="worldbank">World Bank & IMF</option>
            <option value="openalex">OpenAlex Peer-Reviewed</option>
            <option value="wikimedia">Wikimedia & Archives</option>
          </select>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            Search OMNIS
          </button>
        </form>

        {/* Natural Language Intent Classification Banner */}
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              Semantic Intent Classification:{" "}
              <strong className="uppercase text-blue-400">
                {searchResults.classification.intent.replace(/_/g, " ")}
              </strong>{" "}
              (Confidence: {(searchResults.classification.confidence * 100).toFixed(0)}%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/research?q=${encodeURIComponent(activeQuery)}`}
              className="px-2.5 py-1 rounded bg-blue-600 text-white font-semibold inline-flex items-center gap-1"
            >
              <FileSearch className="w-3 h-3" />
              <span>Synthesise Full Research Report</span>
            </Link>
            <Link
              href={`/knowledge-graph?topic=${encodeURIComponent(activeQuery.slice(0, 45))}`}
              className="px-2.5 py-1 rounded bg-[var(--bg-graphite)] border border-[var(--border-subtle)] font-semibold inline-flex items-center gap-1"
            >
              <Network className="w-3 h-3 text-violet-400" />
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Categorised Search Results + History Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* Countries Section */}
          {(activeTab === "overview" || activeTab === "countries" || activeTab === "statistics") && (
            <section className="omnis-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-blue-400" />
                  Sovereign Country Intelligence Matches ({searchResults.countries.length})
                </h2>
                <Link href="/atlas" className="text-xs text-blue-400 hover:underline">
                  Open 3D Global Atlas →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {searchResults.countries.map((c) => (
                  <Link
                    key={c.iso3}
                    href={`/atlas?country=${c.iso3}`}
                    className="omnis-surface-slate p-4 hover:border-blue-500/45 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">
                        {c.flagEmoji} {c.officialName}
                      </span>
                      <span className="text-[10px] omnis-mono px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">
                        {c.iso3}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      GDP: <strong>${c.gdpUsdBn.toLocaleString()}B</strong> (+{c.gdpGrowthPct}%/yr) •
                      Capita: ${c.gdpPerCapitaUsd.toLocaleString()} • Clean Grid:{" "}
                      {c.energyProfile.renewableSharePct}%
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      Source: {c.provenance.source}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Historical Events Section */}
          {(activeTab === "overview" || activeTab === "events" || activeTab === "research") && (
            <section className="omnis-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Historical Events & Research Milestones ({searchResults.historicalEvents.length})
                </h2>
                <Link href="/timeline" className="text-xs text-blue-400 hover:underline">
                  Open Reality Timeline →
                </Link>
              </div>
              <div className="space-y-2.5">
                {searchResults.historicalEvents.map((evt) => (
                  <Link
                    key={evt.id}
                    href={`/timeline?event=${evt.id}`}
                    className="block omnis-surface-slate p-4 hover:border-blue-500/45 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-blue-400 omnis-mono">{evt.dateDisplay}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">{evt.location}</span>
                    </div>
                    <div className="font-bold text-sm">{evt.title}</div>
                    <p className="text-xs text-[var(--text-secondary)]">{evt.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Technologies & Organisations Section */}
          {(activeTab === "overview" ||
            activeTab === "technologies" ||
            activeTab === "concepts") && (
            <section className="omnis-card p-5 space-y-3">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Cpu className="w-4 h-4 text-violet-400" />
                Technologies, Industries & Related Concepts
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {searchResults.technologiesAndOrganizations.map((item) => (
                  <div key={item.id} className="omnis-surface-slate p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{item.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[var(--text-secondary)]">{item.subtitle}</p>
                    <div className="text-[10px] text-[var(--text-muted)]">Source: {item.source}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Search History, Saved Searches & Related Concept Graph Bridges */}
        <div className="lg:col-span-4 space-y-6">
          <div className="omnis-card p-5 space-y-3">
            <h3 className="text-sm font-bold">Related Exploration Paths</h3>
            <div className="space-y-2">
              {searchResults.relatedConcepts.map((concept) => (
                <button
                  key={concept}
                  type="button"
                  onClick={() => {
                    setQueryInput(concept);
                    setActiveQuery(concept);
                  }}
                  className="w-full text-left omnis-surface-slate p-3 text-xs hover:border-blue-500/40 flex items-center justify-between"
                >
                  <span>{concept}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <div className="omnis-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Saved Searches ({savedSearches.length})</h3>
            </div>
            <div className="space-y-1.5">
              {savedSearches.map((sq) => (
                <button
                  key={sq}
                  type="button"
                  onClick={() => {
                    setQueryInput(sq);
                    setActiveQuery(sq);
                  }}
                  className="w-full text-left omnis-surface-slate p-2.5 text-xs hover:border-blue-500/40 truncate"
                >
                  ★ {sq}
                </button>
              ))}
            </div>
          </div>

          <div className="omnis-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Recent Search History</h3>
              <button
                type="button"
                onClick={clearSearchHistory}
                className="text-[11px] text-[var(--text-muted)] hover:text-rose-400 inline-flex items-center gap-1"
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
                  className="w-full text-left omnis-surface-slate p-2.5 text-xs hover:border-blue-500/40 truncate"
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
    <Suspense fallback={<div className="p-8 text-sm">Loading Universal Search...</div>}>
      <ExploreContent />
    </Suspense>
  );
}
