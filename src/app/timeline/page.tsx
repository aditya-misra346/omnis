"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Clock,
  Search,
  Network,
  ExternalLink,
  Check,
  Columns,
  Rows,
  Sparkles,
  ChevronUp,
  X,
  ArrowRight,
  Pin,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { TIMELINE_EVENTS } from "@/lib/data/global-intelligence";
import {
  findNearestEventByPercent,
  mapYearToTimelinePercent,
} from "@/lib/timeline/scale";
import { OmnisLoader } from "@/components/brand/OmnisLogo";
import {
  OmnisButton,
  OmnisModuleHeader,
  OmnisSegmentedControl,
} from "@/components/ui/OmnisPrimitives";
import { OmnisSelect } from "@/components/ui/OmnisSelect";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import type { TimelineEra } from "@/types/omnis";

const DOMAIN_TICK_COLORS: Record<string, string> = {
  "Scientific Discovery": "var(--chart-violet)",
  "Political Development": "var(--chart-amber)",
  "Economic Transformation": "var(--chart-blue)",
  "Technological Breakthrough": "var(--accent-cyan)",
  "Conflict & Geopolitics": "var(--status-danger)",
  "International Agreement": "var(--chart-emerald)",
  "Cultural Milestone": "var(--accent-violet)",
};

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
  const categories = useMemo(
    () => ["all", ...Array.from(new Set(TIMELINE_EVENTS.map((e) => e.category)))],
    []
  );

  const urlEventParam = searchParams.get("event")?.trim() || "";
  const urlEraParam = searchParams.get("era")?.trim() || "";
  const urlCatParam = searchParams.get("cat")?.trim() || "";
  const urlQParam = searchParams.get("q") || "";
  const urlMilestonesParam = searchParams.get("milestones");

  const initialEventId =
    urlEventParam && TIMELINE_EVENTS.some((e) => e.id === urlEventParam)
      ? urlEventParam
      : "evt-india-1991";
  const initialEra: TimelineEra | "all" = ERAS.some((e) => e.id === urlEraParam)
    ? (urlEraParam as TimelineEra | "all")
    : "all";
  const initialCategory =
    urlCatParam && categories.includes(urlCatParam) ? urlCatParam : "all";
  const initialMilestones = urlMilestonesParam === "1" || urlMilestonesParam === "true";

  const [selectedEra, setSelectedEra] = useState<TimelineEra | "all">(initialEra);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(urlQParam);
  const [milestonesOnly, setMilestonesOnly] = useState(initialMilestones);
  const [viewOrientation, setViewOrientation] = useState<"vertical" | "horizontal">("vertical");
  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const [savedToast, setSavedToast] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [mobileDossierOpen, setMobileDossierOpen] = useState(false);
  const scrubberRef = React.useRef<HTMLDivElement | null>(null);
  const lastSyncedTimelineQueryRef = React.useRef<string | null>(null);

  const syncTimelineUrl = (overrides?: {
    era?: TimelineEra | "all";
    cat?: string;
    q?: string;
    milestones?: boolean;
    eventId?: string;
  }) => {
    const nextEra = overrides?.era ?? selectedEra;
    const nextCat = overrides?.cat ?? selectedCategory;
    const nextQ = overrides?.q ?? searchQuery;
    const nextMilestones = overrides?.milestones ?? milestonesOnly;
    const nextEvent = overrides?.eventId ?? selectedEventId;

    const params = new URLSearchParams();
    if (nextEra !== "all") params.set("era", nextEra);
    if (nextCat !== "all") params.set("cat", nextCat);
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextMilestones) params.set("milestones", "1");
    if (nextEvent) params.set("event", nextEvent);

    const qs = params.toString();
    lastSyncedTimelineQueryRef.current = qs;
    router.replace(qs ? `/timeline?${qs}` : "/timeline", { scroll: false });
  };

  const selectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    syncTimelineUrl({ eventId });
  };

  useEffect(() => {
    const currentQs = searchParams.toString();
    if (
      lastSyncedTimelineQueryRef.current !== null &&
      currentQs === lastSyncedTimelineQueryRef.current
    ) {
      return;
    }
    const nextEra: TimelineEra | "all" = ERAS.some((e) => e.id === urlEraParam)
      ? (urlEraParam as TimelineEra | "all")
      : "all";
    const nextCat = urlCatParam && categories.includes(urlCatParam) ? urlCatParam : "all";
    const nextMilestones = urlMilestonesParam === "1" || urlMilestonesParam === "true";

    setSelectedEra(nextEra);
    setSelectedCategory(nextCat);
    setSearchQuery(urlQParam);
    setMilestonesOnly(nextMilestones);

    if (urlEventParam && TIMELINE_EVENTS.some((e) => e.id === urlEventParam)) {
      setSelectedEventId(urlEventParam);
      if (!urlEraParam && !urlCatParam && !urlQParam && !urlMilestonesParam) {
        setSelectedEra("all");
        setSelectedCategory("all");
        setSearchQuery("");
        setMilestonesOnly(false);
      }
    }
  }, [
    searchParams,
    urlEventParam,
    urlEraParam,
    urlCatParam,
    urlQParam,
    urlMilestonesParam,
    categories,
  ]);

  const { addWorkspaceItem, setActiveContext } = useOmnisStore();

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
              {savedToast ? <Check className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              <span>{savedToast ? "Pinned to Workspace" : "Pin to Workspace"}</span>
            </OmnisButton>
          </>
        }
        secondaryControls={
          <div className="space-y-3 pt-1">
            {/* Era Selector Segmented Bar */}
            <div className="overflow-x-auto max-w-full">
              <OmnisSegmentedControl
                groupId="timeline-era-tabs"
                ariaLabel="Historical Era Filter"
                size="sm"
                value={selectedEra}
                onChange={(val) => {
                  const nextEra = val as TimelineEra | "all";
                  setSelectedEra(nextEra);
                  syncTimelineUrl({ era: nextEra });
                }}
                options={ERAS.map((era) => ({
                  value: era.id,
                  label: era.label,
                }))}
              />
            </div>

            {/* Search, Category & Milestone Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-[13.5px] sm:text-sm">
              <div className="flex-1 min-w-[220px] flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)]">
                <Search className="w-3.5 h-3.5 tone-blue shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const nextQ = e.target.value;
                    setSearchQuery(nextQ);
                    syncTimelineUrl({ q: nextQ });
                  }}
                  placeholder="Search historical events, participants, or locations..."
                  className="w-full bg-transparent text-base sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <OmnisSelect
                  value={selectedCategory}
                  onChange={(nextCat) => {
                    setSelectedCategory(nextCat);
                    syncTimelineUrl({ cat: nextCat });
                  }}
                  ariaLabel="Filter by Event Category"
                  options={categories.map((cat) => ({
                    value: cat,
                    label: `Category: ${cat}`,
                  }))}
                />

                <button
                  type="button"
                  onClick={() => {
                    const nextM = !milestonesOnly;
                    setMilestonesOnly(nextM);
                    syncTimelineUrl({ milestones: nextM });
                  }}
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
                  onClick={() => selectEvent(evt.id)}
                  className={`w-72 text-left p-4 rounded-xl border transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                    active
                      ? "bg-[var(--bg-elevated)] border-[var(--accent-blue)] ring-1 ring-[var(--accent-blue)]"
                      : "bg-[var(--bg-slate)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs omnis-mono tone-blue font-bold">
                      <span>{evt.dateDisplay}</span>
                      {evt.isMilestone && <span className="tone-warning">★ MILESTONE</span>}
                    </div>
                    <div className="font-bold text-[15px] sm:text-base text-[var(--text-primary)]">{evt.title}</div>
                    <p className="text-[13.5px] text-[var(--text-secondary)] line-clamp-2">
                      {evt.description}
                    </p>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
                    {evt.location}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Piecewise-Logarithmic 5,000-Year Temporal Scrubber */}
      {(() => {
        const scrubFromPointer = (clientX: number, syncUrl = false) => {
          const track = scrubberRef.current;
          if (!track || filteredEvents.length === 0) return;
          const rect = track.getBoundingClientRect();
          const pct = ((clientX - rect.left) / Math.max(1, rect.width)) * 100;
          const nearest = findNearestEventByPercent(filteredEvents, pct);
          if (!nearest) return;
          if (syncUrl) {
            selectEvent(nearest.id);
          } else if (nearest.id !== selectedEventId) {
            setSelectedEventId(nearest.id);
          }
        };
        const activePct = mapYearToTimelinePercent(activeEvent.yearNumeric);
        return (
          <div className="omnis-card p-4 sm:p-5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider tone-cyan omnis-mono">
                  5,000-Year Logarithmic Temporal Scrubber
                </span>
                <span className="text-xs omnis-mono px-2 py-0.5 rounded badge-tone-blue font-semibold">
                  Active: {activeEvent.dateDisplay}
                </span>
              </div>
              <span className="text-xs text-[var(--text-muted)] omnis-mono hidden sm:inline">
                Drag track or tap milestone tick • Compressed Ancient → Expanded 1800–2026 CE
              </span>
            </div>

            <div
              ref={scrubberRef}
              role="slider"
              tabIndex={0}
              aria-label="5000 Year Temporal Scrubber"
              aria-valuemin={-3000}
              aria-valuemax={2026}
              aria-valuenow={activeEvent.yearNumeric}
              onPointerDown={(e) => {
                setScrubbing(true);
                scrubFromPointer(e.clientX);
              }}
              onPointerMove={(e) => {
                if (scrubbing) scrubFromPointer(e.clientX);
              }}
              onPointerUp={(e) => {
                setScrubbing(false);
                scrubFromPointer(e.clientX, true);
              }}
              onPointerCancel={() => setScrubbing(false)}
              onPointerLeave={() => setScrubbing(false)}
              onKeyDown={(e) => {
                const idx = filteredEvents.findIndex((evt) => evt.id === activeEvent.id);
                if (idx === -1) return;
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  const next = filteredEvents[Math.min(filteredEvents.length - 1, idx + 1)];
                  if (next) selectEvent(next.id);
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  const prev = filteredEvents[Math.max(0, idx - 1)];
                  if (prev) selectEvent(prev.id);
                }
              }}
              className="relative h-11 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] cursor-ew-resize select-none touch-none px-3 flex items-center"
            >
              <div className="relative w-full h-1.5 rounded-full bg-[var(--bg-graphite)]">
                {/* Era Segment Dividers (500 CE @ 22%, 1800 CE @ 45%) */}
                <span
                  style={{ left: "22%" }}
                  className="absolute top-1/2 -translate-y-1/2 h-4 w-px bg-[var(--border-strong)]"
                />
                <span
                  style={{ left: "45%" }}
                  className="absolute top-1/2 -translate-y-1/2 h-4 w-px bg-[var(--border-strong)]"
                />

                {/* Event Density & Category Ticks */}
                {filteredEvents.map((evt) => {
                  const pct = mapYearToTimelinePercent(evt.yearNumeric);
                  const isActive = evt.id === activeEvent.id;
                  const tickColor = DOMAIN_TICK_COLORS[evt.category] ?? "var(--accent-blue)";
                  return (
                    <button
                      key={evt.id}
                      type="button"
                      title={`${evt.dateDisplay}: ${evt.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectEvent(evt.id);
                      }}
                      style={{
                        left: `${pct}%`,
                        backgroundColor: tickColor,
                      }}
                      className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all cursor-pointer ${
                        isActive
                          ? "w-3.5 h-3.5 ring-4 ring-[var(--accent-cyan)]/35 z-20 scale-110"
                          : "w-1.5 h-4 opacity-80 hover:opacity-100 hover:scale-125 z-10"
                      }`}
                    />
                  );
                })}

                {/* Active Scrubbing Indicator Ring */}
                <div
                  style={{ left: `${activePct}%` }}
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-[var(--accent-cyan)] pointer-events-none z-10"
                />
              </div>
            </div>

            <div className="relative h-5 text-[11px] sm:text-xs omnis-mono omnis-tabular text-[var(--text-muted)]">
              <span className="absolute left-0">3000 BCE</span>
              <span className="absolute left-[25%] sm:left-[22%] -translate-x-1/2">
                500 CE
              </span>
              <span style={{ left: "45%" }} className="absolute -translate-x-1/2">
                1800 CE
              </span>
              <span className="absolute right-0">2026 CE</span>
            </div>
          </div>
        );
      })()}

      {/* Main Chronological Stream + Event Intelligence Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-16 lg:pb-0">
        {/* Left Chronological Timeline List */}
        <div className="lg:col-span-5 omnis-card p-5 space-y-3 max-h-[680px] overflow-y-auto">
          <div className="text-[13px] font-bold uppercase tracking-wider text-[var(--text-muted)] omnis-mono">
            Chronological Sequence ({filteredEvents.length} Verified Events)
          </div>
          <div className="relative pl-4 border-l-2 border-[var(--accent-blue)]/40 space-y-3">
            {filteredEvents.map((evt) => {
              const active = evt.id === activeEvent.id;
              return (
                <div
                  key={evt.id}
                  onClick={() => selectEvent(evt.id)}
                  className={`relative p-3.5 rounded-xl border cursor-pointer transition-all ${
                    active
                      ? "bg-[var(--bg-elevated)] border-[var(--accent-blue)] shadow-sm"
                      : "bg-[var(--bg-slate)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <span
                    className={`absolute -left-[23px] top-4 w-3 h-3 rounded-full border-2 ${
                      active
                        ? "bg-[var(--accent-blue)] border-[var(--bg-graphite)]"
                        : "bg-[var(--bg-graphite)] border-[var(--accent-blue)]"
                    }`}
                  />
                  <div className="flex items-center justify-between text-xs omnis-mono">
                    <span className="tone-blue font-bold">{evt.dateDisplay}</span>
                    <span className="text-[11.5px] px-1.5 py-0.5 rounded bg-[var(--bg-graphite)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                      {evt.category}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-bold mt-1 text-[var(--text-primary)]">{evt.title}</h3>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">{evt.location}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detailed Historical Event Dossier (De-boxed Editorial Callouts & Hairlines) */}
        <div className="lg:col-span-7 omnis-card p-6 sm:p-7 space-y-6">
          <div className="space-y-2 pb-4 border-b border-[var(--border-subtle)]">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
              <span className="px-2.5 py-0.5 rounded-full badge-tone-blue font-bold omnis-mono">
                {activeEvent.dateDisplay} • {activeEvent.era.toUpperCase()} ERA
              </span>
              <span className="text-[var(--text-muted)] font-medium">{activeEvent.location}</span>
            </div>
            <h2 className="omnis-display-section font-extrabold text-[var(--text-primary)]">
              {activeEvent.title}
            </h2>
            <p className="omnis-prose text-[var(--text-secondary)]">
              {activeEvent.description}
            </p>
          </div>

          <div className="border-l-2 border-[var(--accent-blue)] pl-4 py-1 space-y-1.5 text-[13px]">
            <div className="font-bold uppercase tracking-wider tone-blue omnis-mono">
              Historical Context &amp; Structural Significance
            </div>
            <p className="omnis-prose text-[var(--text-secondary)]">
              {activeEvent.historicalContext}
            </p>
          </div>

          {/* Causes & Consequences (Architectural Split Hairline Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 border border-[var(--border-subtle)] rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)] text-[14.5px] sm:text-[15px] bg-[var(--bg-obsidian)]/30">
            <div className="p-4 space-y-2">
              <div className="font-bold uppercase tracking-wider tone-warning omnis-mono text-xs">
                Antecedent Causes
              </div>
              <ul className="space-y-1.5 list-disc pl-4 text-[var(--text-secondary)] leading-relaxed">
                {activeEvent.causes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
            <div className="p-4 space-y-2">
              <div className="font-bold uppercase tracking-wider tone-verified omnis-mono text-xs">
                Systemic Consequences
              </div>
              <ul className="space-y-1.5 list-disc pl-4 text-[var(--text-secondary)] leading-relaxed">
                {activeEvent.consequences.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Major Participants */}
          <div className="space-y-2 text-[13px]">
            <div className="font-bold uppercase tracking-wider text-[var(--text-muted)] omnis-mono">
              Major Historical Participants &amp; Institutions
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
          <div className="border-t border-[var(--border-subtle)] pt-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[13.5px]">
              <span className="font-bold tone-violet flex items-center gap-1.5">
                <Network className="w-4 h-4" />
                Connected History → Knowledge Graph Bridges
              </span>
              <span className="text-xs text-[var(--text-muted)]">
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
                  className="omnis-magnetic-arrow px-3 py-1.5 rounded-lg badge-tone-violet hover:brightness-105 text-[13px] font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{topic}</span>
                  <ArrowRight className="omnis-arrow-glyph w-3 h-3 opacity-75" />
                </button>
              ))}
            </div>
          </div>

          {/* Primary & Academic Sources */}
          <div className="space-y-2 text-[13.5px] border-t border-[var(--border-subtle)] pt-4">
            <div className="font-bold uppercase tracking-wider text-[var(--text-muted)] omnis-mono text-xs">
              Verified Primary &amp; Academic Sources
            </div>
            <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
              {activeEvent.sources.map((src) => (
                <a
                  key={src.title}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="omnis-magnetic-arrow flex items-center justify-between py-2.5 hover:bg-[var(--bg-slate)]/50 transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <div className="font-bold tone-blue truncate">{src.title}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">
                      {src.author ? `${src.author} • ` : ""}
                      {src.publisher} ({src.year}) • {src.sourceType}
                    </div>
                  </div>
                  <ExternalLink className="omnis-arrow-glyph w-4 h-4 tone-blue shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Historical Event Inspector Bar (< 1024px) */}
      <div className="lg:hidden fixed bottom-3 left-3 right-3 z-40">
        <button
          type="button"
          onClick={() => setMobileDossierOpen(true)}
          className="w-full omnis-hud-pill rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-left text-[13.5px] cursor-pointer"
        >
          <div className="min-w-0">
            <div className="text-xs omnis-mono font-bold tone-blue">
              {activeEvent.dateDisplay}
            </div>
            <div className="font-bold text-[var(--text-primary)] truncate">
              {activeEvent.title}
            </div>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--accent-blue-solid)] text-white font-semibold">
            <span>Open Dossier</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </span>
        </button>
      </div>

      {/* Mobile Historical Dossier Sheet Drawer */}
      <AnimatePresence>
        {mobileDossierOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-50 omnis-modal-scrim backdrop-blur-sm flex items-end"
            onClick={() => setMobileDossierOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-h-[75vh] overflow-y-auto rounded-t-2xl bg-[var(--bg-graphite)] border-t border-[var(--border-strong)] p-5 space-y-4"
            >
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
                <div>
                  <div className="text-xs omnis-mono font-bold tone-blue">
                    {activeEvent.dateDisplay} • {activeEvent.location}
                  </div>
                  <div className="font-bold text-lg text-[var(--text-primary)]">
                    {activeEvent.title}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close Historical Event Dossier"
                  onClick={() => setMobileDossierOpen(false)}
                  className="p-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[14.5px] text-[var(--text-secondary)] leading-relaxed">
                {activeEvent.historicalContext}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {activeEvent.connectedGraphTopics.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() =>
                      router.push(`/knowledge-graph?topic=${encodeURIComponent(topic)}`)
                    }
                    className="px-2.5 py-1 rounded-lg badge-tone-violet text-[13px] font-semibold cursor-pointer"
                  >
                    {topic} →
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
