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
import { OmnisLoader } from "@/components/brand/OmnisLogo";
import { OmnisButton, OmnisModuleHeader } from "@/components/ui/OmnisPrimitives";
import { OmnisSelect } from "@/components/ui/OmnisSelect";
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
      <OmnisModuleHeader
        moduleTag="MODULE 04 • REALITY TIMELINE & CONNECTED HISTORY ENGINE"
        title="Chronological Causal Chains Across Civilisations, Science & Economics"
        subtitle="Trace primary historical milestones chronologically or horizontally and jump directly from historical inflection points into interactive causal Knowledge Graphs."
        icon={<Clock className="w-3.5 h-3.5" />}
        mobileFilterLabel="Era & Filters"
        actions={
          <>
            <OmnisButton
              variant="secondary"
              onClick={() =>
                setViewOrientation((v) => (v === "vertical" ? "horizontal" : "vertical"))
              }
            >
              {viewOrientation === "vertical" ? (
                <>
                  <Columns className="w-3.5 h-3.5 tone-blue" />
                  <span>Horizontal View</span>
                </>
              ) : (
                <>
                  <Rows className="w-3.5 h-3.5 tone-blue" />
                  <span>Vertical View</span>
                </>
              )}
            </OmnisButton>
            <OmnisButton onClick={handleSaveEvent}>
              {savedToast ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              <span>{savedToast ? "Saved Event" : "Save Event"}</span>
            </OmnisButton>
          </>
        }
        secondaryControls={
          <div className="space-y-3 pt-1">
            {/* Era Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {ERAS.map((era) => {
                const active = selectedEra === era.id;
                return (
                  <button
                    key={era.id}
                    type="button"
                    onClick={() => setSelectedEra(era.id)}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      active
                        ? "bg-[var(--accent-blue-solid)] text-white border-transparent shadow-sm"
                        : "bg-[var(--bg-slate)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <div className="text-xs font-bold">{era.label}</div>
                    <div
                      className={`text-[10px] omnis-mono ${
                        active ? "text-white/80" : "text-[var(--text-muted)]"
                      }`}
                    >
                      {era.range}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Search, Category & Milestone Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex-1 min-w-[220px] flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)]">
                <Search className="w-3.5 h-3.5 tone-blue shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search historical events, participants, or locations..."
                  className="w-full bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <OmnisSelect
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  ariaLabel="Filter by Event Category"
                  options={categories.map((cat) => ({
                    value: cat,
                    label: `Category: ${cat}`,
                  }))}
                />

                <button
                  type="button"
                  onClick={() => setMilestonesOnly((m) => !m)}
                  className={`px-3 py-1.5 rounded-xl border font-semibold transition-colors cursor-pointer ${
                    milestonesOnly
                      ? "badge-tone-warning"
                      : "bg-[var(--bg-slate)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  ★ Major Milestones Only
                </button>
              </div>
            </div>
          </div>
        }
      />

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
                  className={`w-72 text-left p-4 rounded-xl border transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                    active
                      ? "bg-[var(--bg-elevated)] border-[var(--accent-blue)] ring-1 ring-[var(--accent-blue)]"
                      : "bg-[var(--bg-slate)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] omnis-mono tone-blue font-bold">
                      <span>{evt.dateDisplay}</span>
                      {evt.isMilestone && <span className="tone-warning">★ MILESTONE</span>}
                    </div>
                    <div className="font-bold text-sm text-[var(--text-primary)]">{evt.title}</div>
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
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] omnis-mono">
            Chronological Sequence ({filteredEvents.length} Verified Events)
          </div>
          <div className="relative pl-4 border-l-2 border-[var(--accent-blue)]/40 space-y-3">
            {filteredEvents.map((evt) => {
              const active = evt.id === activeEvent.id;
              return (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEventId(evt.id)}
                  className={`relative p-3.5 rounded-xl border cursor-pointer transition-all ${
                    active
                      ? "bg-[var(--bg-elevated)] border-[var(--accent-blue)] shadow-sm"
                      : "bg-[var(--bg-slate)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <span
                    className={`absolute -left-[23px] top-4 w-3 h-3 rounded-full border-2 ${
                      active
                        ? "bg-[var(--accent-blue)] border-[var(--bg-obsidian)]"
                        : "bg-[var(--bg-obsidian)] border-[var(--accent-blue)]"
                    }`}
                  />
                  <div className="flex items-center justify-between text-[11px] omnis-mono">
                    <span className="tone-blue font-bold">{evt.dateDisplay}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-graphite)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                      {evt.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold mt-1 text-[var(--text-primary)]">{evt.title}</h3>
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
              <span className="px-2.5 py-0.5 rounded-full badge-tone-blue font-bold omnis-mono">
                {activeEvent.dateDisplay} • {activeEvent.era.toUpperCase()} ERA
              </span>
              <span className="text-[var(--text-muted)] font-medium">{activeEvent.location}</span>
            </div>
            <h2 className="omnis-display text-2xl font-extrabold text-[var(--text-primary)]">
              {activeEvent.title}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {activeEvent.description}
            </p>
          </div>

          <div className="omnis-surface-slate p-4 space-y-1.5 text-xs">
            <div className="font-bold uppercase tracking-wider tone-blue omnis-mono">
              Historical Context & Structural Significance
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              {activeEvent.historicalContext}
            </p>
          </div>

          {/* Causes & Consequences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="omnis-surface-slate p-4 space-y-2">
              <div className="font-bold uppercase tracking-wider tone-warning omnis-mono">
                Antecedent Causes
              </div>
              <ul className="space-y-1.5 list-disc pl-4 text-[var(--text-secondary)]">
                {activeEvent.causes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
            <div className="omnis-surface-slate p-4 space-y-2">
              <div className="font-bold uppercase tracking-wider tone-verified omnis-mono">
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
            <div className="font-bold uppercase tracking-wider text-[var(--text-muted)] omnis-mono">
              Major Historical Participants & Institutions
            </div>
            <div className="flex flex-wrap gap-2">
              {activeEvent.majorParticipants.map((p) => (
                <span
                  key={p}
                  className="px-2.5 py-1 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-medium"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Connected History -> Transition into Infinite Knowledge Graph */}
          <div className="omnis-surface-slate p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold tone-violet flex items-center gap-1.5">
                <Network className="w-4 h-4" />
                Connected History → Knowledge Graph Bridges
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">
                Click any bridge to transition into Module 02
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
                  className="px-3 py-1.5 rounded-lg badge-tone-violet hover:brightness-105 text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{topic}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Primary & Academic Sources */}
          <div className="space-y-2 text-xs">
            <div className="font-bold uppercase tracking-wider text-[var(--text-muted)] omnis-mono">
              Verified Primary & Academic Sources
            </div>
            {activeEvent.sources.map((src) => (
              <a
                key={src.title}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between omnis-surface-slate p-3 hover:border-[var(--border-strong)]"
              >
                <div className="min-w-0 pr-3">
                  <div className="font-bold tone-blue truncate">{src.title}</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {src.author ? `${src.author} • ` : ""}
                    {src.publisher} ({src.year}) • {src.sourceType}
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 tone-blue shrink-0" />
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
    <Suspense
      fallback={
        <div className="p-8 max-w-7xl mx-auto">
          <OmnisLoader label="Loading Reality Timeline & Connected History..." />
        </div>
      }
    >
      <TimelineContent />
    </Suspense>
  );
}
