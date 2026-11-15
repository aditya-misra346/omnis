"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Clock,
  Search,
  Network,
  ExternalLink,
  Bookmark,
  Check,
  Columns,
  Rows,
  Sparkles,
} from "lucide-react";
import { TIMELINE_EVENTS } from "@/lib/data/global-intelligence";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import type { TimelineEra } from "@/types/omnis";

const ERAS: { id: TimelineEra | "all"; label: string; range: string }[] = [
  { id: "all", label: "All Eras", range: "2600 BCE – 2026 CE" },
  { id: "ancient", label: "Ancient History", range: "3000 BCE – 500 CE" },
  { id: "medieval", label: "Medieval History", range: "500 CE – 1500 CE" },
  { id: "modern", label: "Modern History", range: "1500 CE – 1945 CE" },
  { id: "contemporary", label: "Contemporary Era", range: "1945 CE – Present" },
];

function TimelineContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialEventId = searchParams.get("event") || "evt-india-1991";

  const [selectedEra, setSelectedEra] = useState<TimelineEra | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [milestonesOnly, setMilestonesOnly] = useState(false);
  const [viewOrientation, setViewOrientation] = useState<"vertical" | "horizontal">("vertical");
  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const [savedToast, setSavedToast] = useState(false);

  const { addWorkspaceItem, setActiveContext } = useOmnisStore();

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(TIMELINE_EVENTS.map((e) => e.category)))],
    []
  );

  const filteredEvents = useMemo(() => {
    return TIMELINE_EVENTS.filter((evt) => {
      if (selectedEra !== "all" && evt.era !== selectedEra) return false;
      if (selectedCategory !== "all" && evt.category !== selectedCategory) return false;
      if (milestonesOnly && !evt.isMilestone) return false;
      if (
        searchQuery.trim() &&
        !`${evt.title} ${evt.description} ${evt.historicalContext} ${evt.location}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    }).sort((a, b) => a.yearNumeric - b.yearNumeric);
  }, [selectedEra, selectedCategory, milestonesOnly, searchQuery]);

  const activeEvent =
    filteredEvents.find((e) => e.id === selectedEventId) ??
    filteredEvents[0] ??
    TIMELINE_EVENTS[0];

  useEffect(() => {
    setActiveContext("Reality Timeline", activeEvent.title);
  }, [activeEvent.title, setActiveContext]);

  const handleSaveEvent = () => {
    addWorkspaceItem({
      type: "timeline",
      title: `${activeEvent.dateDisplay}: ${activeEvent.title}`,
      subtitle: `${activeEvent.location} • ${activeEvent.category}`,
      folder: "Geopolitics & Macro",
      tags: [activeEvent.era, activeEvent.category, ...activeEvent.connectedGraphTopics.slice(0, 2)],
      href: `/timeline?event=${activeEvent.id}`,
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="omnis-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">
              <Clock className="w-3.5 h-3.5" />
              <span>MODULE 04 • REALITY TIMELINE & CONNECTED HISTORY ENGINE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">
              Chronological Causal Chains Across Civilisations, Science & Economics
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setViewOrientation((v) => (v === "vertical" ? "horizontal" : "vertical"))
              }
              className="px-3 py-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs font-semibold inline-flex items-center gap-1.5"
            >
              {viewOrientation === "vertical" ? (
                <>
                  <Columns className="w-3.5 h-3.5 text-blue-400" />
                  <span>Switch to Horizontal View</span>
                </>
              ) : (
                <>
                  <Rows className="w-3.5 h-3.5 text-blue-400" />
                  <span>Switch to Vertical View</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleSaveEvent}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              {savedToast ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              <span>{savedToast ? "Saved Event" : "Save Event"}</span>
            </button>
          </div>
        </div>

        {/* Era Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {ERAS.map((era) => (
            <button
              key={era.id}
              type="button"
              onClick={() => setSelectedEra(era.id)}
              className={`p-2.5 rounded-lg text-left border transition-all ${
                selectedEra === era.id
                  ? "bg-blue-600/20 border-blue-500 text-[var(--text-primary)]"
                  : "bg-[var(--bg-slate)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
              }`}
            >
              <div className="text-xs font-bold">{era.label}</div>
              <div className="text-[10px] text-[var(--text-muted)] omnis-mono">{era.range}</div>
            </button>
          ))}
        </div>

        {/* Search, Category & Milestone Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex-1 min-w-[220px] flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)]">
            <Search className="w-3.5 h-3.5 text-blue-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search historical events, participants, or locations..."
              className="w-full bg-transparent focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by Event Category"
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)]"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-[var(--bg-graphite)]">
                  Category: {cat}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setMilestonesOnly((m) => !m)}
              className={`px-3 py-1.5 rounded-lg border font-medium ${
                milestonesOnly
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "bg-[var(--bg-slate)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
              }`}
            >
              ★ Major Milestones Only
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable View (when selected) */}
      {viewOrientation === "horizontal" && (
        <div className="omnis-card p-5 overflow-x-auto">
          <div className="flex items-stretch gap-4 min-w-max pb-2">
            {filteredEvents.map((evt) => {
              const active = evt.id === activeEvent.id;
              return (
                <button
                  key={evt.id}
                  type="button"
                  onClick={() => setSelectedEventId(evt.id)}
                  className={`w-72 text-left p-4 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                    active
                      ? "bg-blue-600/20 border-blue-500"
                      : "bg-[var(--bg-slate)] border-[var(--border-subtle)] hover:border-blue-500/40"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] omnis-mono text-blue-400">
                      <span>{evt.dateDisplay}</span>
                      {evt.isMilestone && <span className="text-amber-400">★ MILESTONE</span>}
                    </div>
                    <div className="font-bold text-sm">{evt.title}</div>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                      {evt.description}
                    </p>
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
                    {evt.location}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Chronological Stream + Event Intelligence Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Chronological Timeline List */}
        <div className="lg:col-span-5 omnis-card p-5 space-y-3 max-h-[680px] overflow-y-auto">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Chronological Sequence ({filteredEvents.length} Verified Events)
          </div>
          <div className="relative pl-4 border-l-2 border-blue-500/35 space-y-3">
            {filteredEvents.map((evt) => {
              const active = evt.id === activeEvent.id;
              return (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEventId(evt.id)}
                  className={`relative p-3.5 rounded-lg border cursor-pointer transition-all ${
                    active
                      ? "bg-blue-600/20 border-blue-500"
                      : "bg-[var(--bg-slate)] border-[var(--border-subtle)] hover:border-blue-500/40"
                  }`}
                >
                  <span
                    className={`absolute -left-[23px] top-4 w-3 h-3 rounded-full border-2 ${
                      active
                        ? "bg-blue-400 border-white"
                        : "bg-[var(--bg-obsidian)] border-blue-500"
                    }`}
                  />
                  <div className="flex items-center justify-between text-[11px] omnis-mono">
                    <span className="text-blue-400 font-bold">{evt.dateDisplay}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-graphite)] text-[var(--text-muted)]">
                      {evt.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold mt-1">{evt.title}</h3>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{evt.location}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detailed Historical Event Dossier */}
        <div className="lg:col-span-7 omnis-card p-6 space-y-5">
          <div className="space-y-2 pb-4 border-b border-[var(--border-subtle)]">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-bold omnis-mono">
                {activeEvent.dateDisplay} • {activeEvent.era.toUpperCase()} ERA
              </span>
              <span className="text-[var(--text-muted)]">{activeEvent.location}</span>
            </div>
            <h2 className="text-2xl font-extrabold">{activeEvent.title}</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {activeEvent.description}
            </p>
          </div>

          <div className="omnis-surface-slate p-4 space-y-1.5 text-xs">
            <div className="font-bold uppercase tracking-wider text-blue-400">
              Historical Context & Structural Significance
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              {activeEvent.historicalContext}
            </p>
          </div>

          {/* Causes & Consequences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="omnis-surface-slate p-4 space-y-2">
              <div className="font-bold uppercase tracking-wider text-amber-400">
                Antecedent Causes
              </div>
              <ul className="space-y-1.5 list-disc pl-4 text-[var(--text-secondary)]">
                {activeEvent.causes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
            <div className="omnis-surface-slate p-4 space-y-2">
              <div className="font-bold uppercase tracking-wider text-emerald-400">
                Systemic Consequences
              </div>
              <ul className="space-y-1.5 list-disc pl-4 text-[var(--text-secondary)]">
                {activeEvent.consequences.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Major Participants */}
          <div className="space-y-2 text-xs">
            <div className="font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Major Historical Participants & Institutions
            </div>
            <div className="flex flex-wrap gap-2">
              {activeEvent.majorParticipants.map((p) => (
                <span
                  key={p}
                  className="px-2.5 py-1 rounded-md bg-[var(--bg-slate)] border border-[var(--border-subtle)] font-medium"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Connected History -> Transition into Infinite Knowledge Graph */}
          <div className="omnis-surface-slate p-4 space-y-2.5 border-violet-500/35">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-violet-400 flex items-center gap-1.5">
                <Network className="w-4 h-4" />
                Connected History → Knowledge Graph Bridges
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">
                Click any node to transition into Module 02
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeEvent.connectedGraphTopics.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() =>
                    router.push(`/knowledge-graph?topic=${encodeURIComponent(topic)}`)
                  }
                  className="px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white border border-violet-500/35 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{topic}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Primary & Academic Sources */}
          <div className="space-y-2 text-xs">
            <div className="font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Verified Primary & Academic Sources
            </div>
            {activeEvent.sources.map((src) => (
              <a
                key={src.title}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between omnis-surface-slate p-3 hover:border-blue-500/40"
              >
                <div>
                  <div className="font-bold text-blue-400">{src.title}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {src.author ? `${src.author} • ` : ""}
                    {src.publisher} ({src.year}) • {src.sourceType}
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-blue-400 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TimelinePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm">Loading Reality Timeline...</div>}>
      <TimelineContent />
    </Suspense>
  );
}
