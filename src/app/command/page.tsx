"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Sparkles,
  Globe2,
  Network,
  Sliders,
  Clock,
  FileSearch,
  FlaskConical,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  RotateCcw,
  ArrowRight,
  Bookmark,
  TrendingUp,
  Layers,
  LayoutGrid,
  AlertTriangle,
  X,
} from "lucide-react";
import { AddyIntelligenceView } from "@/components/ai/AddyIntelligenceView";
import { AddyRetrievalStepper } from "@/components/ai/AddyRetrievalStepper";
import { streamResearchWithProgress, type RetrievalStageState } from "@/lib/ai/stream-client";
import type { ResearchReportData } from "@/types/omnis";
import { COUNTRIES_DATA, TIMELINE_EVENTS } from "@/lib/data/global-intelligence";
import { formatSignedPct } from "@/lib/formatters";
import { OmnisButton, OmnisModuleHeader } from "@/components/ui/OmnisPrimitives";
import { useOmnisStore } from "@/lib/store/use-omnis-store";

export default function CommandCenterPage() {
  const router = useRouter();
  const {
    widgets,
    toggleWidgetVisibility,
    moveWidget,
    resetWidgets,
    workspaceItems,
    searchHistory,
    addSearchQuery,
    setActiveContext,
    setAssistantOpen,
  } = useOmnisStore();

  const [commandInput, setCommandInput] = useState("");
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [briefReport, setBriefReport] = useState<ResearchReportData | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefStages, setBriefStages] = useState<Partial<Record<1 | 2 | 3 | 4, RetrievalStageState>>>({});
  const [briefElapsedMs, setBriefElapsedMs] = useState(0);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [briefQueryLabel, setBriefQueryLabel] = useState("");
  const [providerStatuses, setProviderStatuses] = useState<
    Array<{ id: string; name: string; status: string; latencyMs?: number; license: string }>
  >([
    { id: "world-bank", name: "World Bank WDI v2", status: "checking", license: "CC BY 4.0" },
    { id: "rest-countries", name: "REST Countries v3.1", status: "checking", license: "MPL 2.0" },
    { id: "openalex", name: "OpenAlex Scholarly Graph", status: "checking", license: "CC0" },
    { id: "wikimedia", name: "Wikimedia REST v1", status: "checking", license: "CC BY-SA 4.0" },
  ]);

  useEffect(() => {
    setActiveContext("Home — Intelligence Command Center", "Global Overview & Live Signals");
  }, [setActiveContext]);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/health")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data || !Array.isArray(data.providers) || data.providers.length === 0) return;
        setProviderStatuses(
          data.providers.map((p: { id: string; name: string; status: string; latencyMs?: number; license?: string }) => ({
            id: p.id,
            name: p.name,
            status: p.status || "operational",
            latencyMs: typeof p.latencyMs === "number" ? p.latencyMs : undefined,
            license: p.license || "Open",
          }))
        );
      })
      .catch(() => {
        // Retain static epistemic attribution labels on offline/network failure
      });
    return () => {
      active = false;
    };
  }, []);

  const runInlineBrief = async (rawQuery: string) => {
    const clean = rawQuery.trim();
    if (clean.length < 3) return;
    addSearchQuery(clean);
    setCommandInput(clean);
    setBriefQueryLabel(clean);
    setBriefLoading(true);
    setBriefError(null);
    setBriefStages({
      1: {
        step: 1,
        label: "Resolving countries, time horizons & economic indicators…",
        status: "active",
        elapsedMs: 0,
      },
    });
    setBriefElapsedMs(0);

    const startedAt = Date.now();
    const ticker = window.setInterval(() => {
      setBriefElapsedMs(Date.now() - startedAt);
    }, 150);

    try {
      const data = await streamResearchWithProgress(clean, "deep", {
        onStage: (stage) => {
          setBriefElapsedMs(stage.elapsedMs);
          setBriefStages((prev) => ({ ...prev, [stage.step]: stage }));
        },
      });
      setBriefReport(data);
    } catch (err) {
      setBriefError(
        err instanceof Error && err.message ? err.message : "Could not synthesize brief."
      );
    } finally {
      window.clearInterval(ticker);
      setBriefLoading(false);
    }
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = commandInput.trim();
    if (!q) return;
    addSearchQuery(q);
    const lower = q.toLowerCase();
    if (lower.startsWith("compare ")) {
      router.push(`/intelligence?q=${encodeURIComponent(q)}`);
    } else if (lower.startsWith("simulate ") || lower.includes("what if")) {
      router.push(`/simulations?q=${encodeURIComponent(q)}`);
    } else if (lower.startsWith("graph ")) {
      router.push(`/knowledge-graph?topic=${encodeURIComponent(q.replace(/^graph\s+/i, ""))}`);
    } else if (q.split(/\s+/).length >= 4 || q.includes("?")) {
      void runInlineBrief(q);
    } else {
      router.push(`/explore?q=${encodeURIComponent(q)}`);
    }
  };

  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);
  const countries = Object.values(COUNTRIES_DATA);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <OmnisModuleHeader
        moduleTag="Ask & Navigate"
        title="Start with a question, country, or topic"
        subtitle="Type what you want to understand—like comparing two countries, testing an oil shock, or tracing an event in history."
        icon={<Sparkles className="w-3.5 h-3.5" />}
        actions={
          <>
            <OmnisButton
              variant="secondary"
              onClick={() => setCustomizeOpen((prev) => !prev)}
            >
              <LayoutGrid className="w-3.5 h-3.5 tone-blue" />
              <span>{customizeOpen ? "Done Editing" : "Edit Layout"}</span>
            </OmnisButton>
            <OmnisButton onClick={() => setAssistantOpen(true)}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AddyIntelligence</span>
            </OmnisButton>
          </>
        }
      >
        <form
          onSubmit={handleCommandSubmit}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-[var(--bg-slate)] p-2 rounded-lg border border-[var(--border-subtle)] focus-within:border-[var(--accent-blue)] transition-colors"
        >
          <div className="flex-1 flex items-center gap-2.5 px-3 py-1.5">
            <Search className="w-4 h-4 tone-blue shrink-0" />
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Ask a question or enter a country: 'India economy since 1991', 'Compare India and China'..."
              className="w-full bg-transparent text-base md:text-[15px] focus:outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            <OmnisButton
              type="button"
              onClick={() => void runInlineBrief(commandInput || "Explain India's economic development since 2014 and what challenges remain.")}
              disabled={briefLoading}
              className="min-h-[44px] flex-1 sm:flex-none"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{briefLoading ? "Synthesizing..." : "Ask AddyIntelligence Brief"}</span>
            </OmnisButton>
            <OmnisButton type="submit" variant="secondary" size="md" className="omnis-magnetic-arrow min-h-[44px]">
              <span>Explore</span>
              <ArrowRight className="omnis-arrow-glyph w-3.5 h-3.5" />
            </OmnisButton>
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-[var(--text-muted)] font-medium text-xs">
            Try a question:
          </span>
          {[
            { label: "🇮🇳 India Country Profile", href: "/atlas?country=IND" },
            { label: "⚖️ India vs China Compare", href: "/intelligence?left=IND&right=CHN" },
            { label: "🕸️ Semiconductors Graph", href: "/knowledge-graph?topic=Semiconductors" },
            { label: "📈 Oil Shock Simulation", href: "/simulations?category=economics" },
            { label: "🔬 Orbital Gravity Lab", href: "/laboratory?cat=space" },
          ].map((pill) => (
            <Link
              key={pill.href}
              href={pill.href}
              className="min-h-[44px] md:min-h-[32px] inline-flex items-center px-3 md:px-2.5 py-2 md:py-1 rounded-full bg-[var(--bg-slate)] hover:border-[var(--border-strong)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {pill.label}
            </Link>
          ))}
        </div>
      </OmnisModuleHeader>

      {briefError ? (
        <div className="omnis-card p-4 border-[var(--status-danger)] text-sm tone-danger flex flex-wrap items-center justify-between gap-2 font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{briefError}</span>
          </div>
          <OmnisButton
            variant="secondary"
            size="sm"
            onClick={() => void runInlineBrief(briefQueryLabel || commandInput)}
            className="min-h-[44px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </OmnisButton>
        </div>
      ) : null}

      {briefLoading ? (
        <AddyRetrievalStepper
          stages={briefStages}
          elapsedMs={briefElapsedMs}
          query={briefQueryLabel}
        />
      ) : briefReport?.brief ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold tone-blue">
              AddyIntelligence · Verified Brief
            </span>
            <button
              type="button"
              onClick={() => setBriefReport(null)}
              className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Dismiss Brief</span>
            </button>
          </div>
          <AddyIntelligenceView
            brief={briefReport.brief}
            onSelectFollowUp={(fq) => void runInlineBrief(fq)}
          />
        </div>
      ) : null}

      {customizeOpen ? (
        <div className="p-4 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-strong)] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Choose Sections to Show
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Show, hide, or reorder sections. Saved automatically in this browser.
              </p>
            </div>
            <OmnisButton variant="secondary" size="sm" onClick={resetWidgets}>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Defaults</span>
            </OmnisButton>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {sortedWidgets.map((w, idx) => (
              <div
                key={w.id}
                className="p-3 rounded-lg bg-[var(--bg-graphite)] border border-[var(--border-subtle)] flex flex-col justify-between gap-2 text-[13px]"
              >
                <div className="font-semibold text-[var(--text-primary)]">{w.title}</div>
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => toggleWidgetVisibility(w.id)}
                    className={`min-h-[44px] md:min-h-[32px] inline-flex items-center gap-1 px-3 md:px-2 py-1.5 md:py-1 rounded-md font-semibold cursor-pointer ${
                      w.visible ? "badge-tone-verified" : "badge-tone-danger"
                    }`}
                  >
                    {w.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    <span>{w.visible ? "Visible" : "Hidden"}</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveWidget(w.id, "up")}
                      className="min-h-[44px] min-w-[44px] md:min-h-[30px] md:min-w-[30px] inline-flex items-center justify-center p-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-slate)] disabled:opacity-30 cursor-pointer"
                      aria-label={`Move ${w.title} Up`}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === sortedWidgets.length - 1}
                      onClick={() => moveWidget(w.id, "down")}
                      className="min-h-[44px] min-w-[44px] md:min-h-[30px] md:min-w-[30px] inline-flex items-center justify-center p-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-slate)] disabled:opacity-30 cursor-pointer"
                      aria-label={`Move ${w.title} Down`}
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Asymmetric Analytical Cockpit Grid: 8-col Analytical Matrix + 4-col Telemetry & Workspace Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Primary Analytical Pane (8 Cols) */}
        <div className="lg:col-span-8 min-w-0 space-y-6">
          {(() => {
            const widgetMap: Record<string, React.ReactNode> = {
              "trending-global": (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 tone-blue" />
                  <h2 className="text-[15px] font-bold uppercase tracking-wider text-[var(--text-primary)] omnis-mono">
                    Sovereign Macroeconomic Matrix
                  </h2>
                </div>
                <span className="text-xs text-[var(--text-muted)] omnis-mono">
                  World Bank WDI & IMF WEO 2026
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-[var(--border-subtle)] bg-[var(--bg-graphite)]">
                {countries.map((c) => {
                  const gdps = c.historicalSeries.map((pt) => pt.gdpUsdBn);
                  const minGdp = Math.min(...gdps);
                  const maxGdp = Math.max(...gdps);
                  const sparkPoints = gdps
                    .map((val, idx) => {
                      const sx = (idx / Math.max(1, gdps.length - 1)) * 78;
                      const sy = 20 - ((val - minGdp) / Math.max(1, maxGdp - minGdp)) * 16;
                      return `${idx === 0 ? "M" : "L"}${sx.toFixed(1)},${sy.toFixed(1)}`;
                    })
                    .join(" ");
                  return (
                    <Link
                      key={c.iso3}
                      href={`/atlas?country=${c.iso3}`}
                      className="p-4 border-r border-b border-[var(--border-subtle)] hover:bg-[var(--bg-slate)]/60 transition-colors space-y-2.5 group"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-bold text-sm sm:text-[15px] text-[var(--text-primary)] truncate group-hover:text-[var(--accent-blue)] transition-colors">
                          {c.flagEmoji} {c.name}
                        </span>
                        <span className="text-[11.5px] font-semibold omnis-mono px-1.5 py-0.5 rounded badge-tone-blue shrink-0">
                          {c.iso3}
                        </span>
                      </div>
                      <div className="flex items-end justify-between gap-2">
                        <div className="grid grid-cols-2 gap-3 text-[13.5px] sm:text-sm">
                          <div>
                            <div className="text-xs text-[var(--text-muted)]">GDP (Nom.)</div>
                            <div className="font-bold omnis-mono omnis-tabular text-[var(--text-primary)]">
                              ${c.gdpUsdBn.toLocaleString()}B
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-[var(--text-muted)]">Real/yr</div>
                            <div
                              className={`font-bold omnis-mono omnis-tabular ${
                                c.gdpGrowthPct >= 0 ? "tone-verified" : "tone-danger"
                              }`}
                            >
                              {formatSignedPct(c.gdpGrowthPct)}
                            </div>
                          </div>
                        </div>
                        <svg
                          viewBox="0 0 80 24"
                          className="w-16 h-6 shrink-0"
                          aria-label={`${c.name} GDP trajectory sparkline`}
                        >
                          <path
                            d={sparkPoints}
                            fill="none"
                            stroke={c.gdpGrowthPct >= 0 ? "var(--status-verified)" : "var(--chart-amber)"}
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div className="text-xs text-[var(--text-muted)] flex justify-between pt-2 border-t border-[var(--border-subtle)] omnis-mono omnis-tabular">
                        <span>Clean: {c.energyProfile.renewableSharePct}%</span>
                        <span>AI: {c.technologyProfile.aiReadinessIndex}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
              ),
              "flagship-modules": (
            <section className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 tone-violet" />
                  <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
                    Explore Atlas &amp; Tools
                  </h2>
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  6 Interactive Tools
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-[var(--border-subtle)] bg-[var(--bg-graphite)]">
                {[
                  {
                    title: "World Globe & Country Profiles",
                    desc: "3D Earth, live day/night light, detailed country stats & comparisons.",
                    href: "/atlas",
                    icon: Globe2,
                  },
                  {
                    title: "Connected Topic Map",
                    desc: "6 interactive views showing causes, connections & sources.",
                    href: "/knowledge-graph",
                    icon: Network,
                  },
                  {
                    title: "What-If Scenario Forecasts",
                    desc: "500-run models testing oil shocks, tariffs, clean grids & warming.",
                    href: "/simulations",
                    icon: Sliders,
                  },
                  {
                    title: "World History Timeline",
                    desc: "Historical milestones from 3000 BCE connected directly to modern trends.",
                    href: "/timeline",
                    icon: Clock,
                  },
                  {
                    title: "AddyIntelligence",
                    desc: "Plain-English answers backed by World Bank tables & OpenAlex studies.",
                    href: "/research",
                    icon: FileSearch,
                  },
                  {
                    title: "Interactive Science Labs",
                    desc: "Hands-on physics, orbits, molecules, ecosystems, climate & bridges.",
                    href: "/laboratory",
                    icon: FlaskConical,
                  },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <Link
                      key={m.href}
                      href={m.href}
                      className="p-4 border-r border-b border-[var(--border-subtle)] hover:bg-[var(--bg-slate)]/60 flex items-start gap-3 transition-colors group"
                    >
                      <div className="p-2 rounded-md badge-tone-blue shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="font-bold text-sm text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors">
                          {m.title}
                        </div>
                        <p className="text-[13px] sm:text-[13.5px] text-[var(--text-secondary)] leading-relaxed">
                          {m.desc}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
              ),
              "global-developments": (
            <section className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <h2 className="text-[15px] font-bold text-[var(--text-primary)]">
                  Recent National Trends
                </h2>
                <Link
                  href="/timeline"
                  className="omnis-magnetic-arrow text-[13px] tone-blue font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <span>Open World Timeline</span>
                  <ArrowRight className="omnis-arrow-glyph w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 border-t border-l border-[var(--border-subtle)] bg-[var(--bg-graphite)]">
                {countries.slice(0, 3).map((c) => {
                  const dev = c.currentDevelopments[0];
                  return (
                    <div
                      key={c.iso3}
                      className="p-4 border-r border-b border-[var(--border-subtle)] space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs tone-blue font-bold">
                        <span>
                          {c.flagEmoji} {c.name}
                        </span>
                        <span className="omnis-mono omnis-tabular">{dev?.date ?? "2026"}</span>
                      </div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">
                        {dev?.headline}
                      </h3>
                      <p className="text-[13.5px] text-[var(--text-secondary)] leading-relaxed">
                        {dev?.summary}
                      </p>
                      <div className="text-xs text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
                        Source: {dev?.source}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
              ),
              "recommended-paths": (
                <section className="space-y-4 pt-2 border-t border-[var(--border-subtle)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[var(--accent-blue)]" />
                      <h2 className="text-[17px] font-bold text-[var(--text-primary)]">
                        Guided Topics
                      </h2>
                    </div>
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                      Step-by-Step Paths
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 border border-[var(--border-subtle)] rounded-xl overflow-hidden divide-y md:divide-y-0 md:grid-rows-2 bg-[var(--bg-graphite)]">
                    {[
                      {
                        title: "Submarine Cable & Sovereign AI Compute",
                        chain: "Atlas → Concept Map → Research",
                        detail:
                          "Compare submarine cable bottlenecks, chip factories, and AI infrastructure readiness across key corridor countries.",
                        href: "/atlas",
                        accent: "text-[var(--accent-blue)]",
                      },
                      {
                        title: "Clean Power Grids & Carbon Risk",
                        chain: "Concept Map → What-If Forecast → Research",
                        detail:
                          "See how carbon emissions intensity ties into clean power builds, factory output, and fuel price shocks.",
                        href: "/knowledge-graph",
                        accent: "text-[var(--accent-cyan)]",
                      },
                      {
                        title: "Higher Interest Rates & Developing Economies",
                        chain: "What-If Forecast → Atlas → Timeline",
                        detail:
                          "Test how higher borrowing costs, trade openness, and public debt affect growth in developing economies.",
                        href: "/simulations",
                        accent: "text-[var(--accent-amber)]",
                      },
                      {
                        title: "Orbital Launches & Space Infrastructure",
                        chain: "Research → Science Lab → Workspace",
                        detail:
                          "Combine multi-source research on satellite constellations, orbital mechanics, and launch costs into saved notes.",
                        href: "/research",
                        accent: "text-[var(--accent-blue)]",
                      },
                    ].map((path, idx) => (
                      <Link
                        key={path.title}
                        href={path.href}
                        className={`group bg-[var(--bg-graphite)] hover:bg-[var(--bg-slate)] p-4 transition-colors flex flex-col justify-between gap-2.5 ${
                          idx < 2 ? "md:border-b md:border-[var(--border-subtle)]" : ""
                        } ${idx % 2 === 0 ? "md:border-r md:border-[var(--border-subtle)]" : ""}`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-xs font-medium ${path.accent}`}>
                              {path.chain}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)] transition-transform shrink-0" />
                          </div>
                          <h3 className="text-[15px] font-semibold text-[var(--text-primary)] leading-snug">
                            {path.title}
                          </h3>
                          <p className="text-[13.5px] text-[var(--text-secondary)] leading-relaxed">
                            {path.detail}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ),
              "recent-explorations": (
                <section className="omnis-card p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2">
                      <Bookmark className="w-4 h-4 tone-violet" />
                      <h2 className="text-base font-bold text-[var(--text-primary)]">
                        Recently Explored &amp; Saved Workspace
                      </h2>
                    </div>
                    <Link
                      href="/workspace"
                      className="text-xs tone-blue font-semibold hover:underline"
                    >
                      Open Workspace ({workspaceItems.length}) →
                    </Link>
                  </div>
                  <div className="-mx-5 -mb-5 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] rounded-b-2xl overflow-hidden">
                    <div className="bg-[var(--bg-graphite)] p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                          <Search className="w-3.5 h-3.5 tone-violet" />
                          Recent Searches
                        </h3>
                        <Link
                          href="/explore"
                          className="text-xs tone-blue font-semibold hover:underline"
                        >
                          Explore →
                        </Link>
                      </div>
                      <div className="divide-y divide-[var(--border-subtle)]">
                        {searchHistory.slice(0, 5).map((q) => (
                          <Link
                            key={q}
                            href={`/explore?q=${encodeURIComponent(q)}`}
                            className="omnis-magnetic-arrow flex items-center justify-between py-2 text-[13.5px] text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors gap-2"
                          >
                            <span className="truncate font-medium">{q}</span>
                            <ArrowRight className="omnis-arrow-glyph w-3 h-3 shrink-0 opacity-70" />
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[var(--bg-graphite)] p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                          <Bookmark className="w-3.5 h-3.5 tone-blue" />
                          Saved Items ({workspaceItems.length})
                        </h3>
                        <Link
                          href="/workspace"
                          className="text-xs tone-blue font-semibold hover:underline"
                        >
                          Manage →
                        </Link>
                      </div>
                      <div className="divide-y divide-[var(--border-subtle)]">
                        {workspaceItems.slice(0, 4).map((item) => (
                          <Link
                            key={item.id}
                            href={item.href}
                            className="block py-2 hover:bg-[var(--bg-slate)]/50 -mx-2 px-2 rounded transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2 text-[13.5px] font-semibold">
                              <span className="text-[var(--text-primary)] truncate">{item.title}</span>
                              <span className="text-xs font-medium capitalize px-2 py-0.5 rounded-md badge-tone-blue shrink-0">
                                {item.type}
                              </span>
                            </div>
                            <div className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                              {item.subtitle}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              ),
            };
            return sortedWidgets
              .filter((w) => w.visible && widgetMap[w.id])
              .map((w) => (
                <React.Fragment key={w.id}>{widgetMap[w.id]}</React.Fragment>
              ));
          })()}
        </div>

        {/* Right Data Source Health & Timeline Highlights Rail (4 Cols, De-boxed Hairline Layout) */}
        <aside className="lg:col-span-4 min-w-0 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-[var(--border-subtle)] lg:pl-6 divide-y divide-[var(--border-subtle)]">
          {/* Live Data Source Health */}
          <div className="pb-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 tone-cyan" />
                Data Source Health
              </h2>
              <Link
                href="/settings"
                className="text-xs tone-blue font-semibold hover:underline"
              >
                Check all →
              </Link>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {providerStatuses.map((provider) => {
                const routeMap: Record<string, string> = {
                  "world-bank": "/intelligence",
                  "rest-countries": "/atlas",
                  openalex: "/explore",
                  wikimedia: "/knowledge-graph",
                };
                const targetHref = routeMap[provider.id] ?? "/explore";
                const isOp = provider.status === "operational";
                const isChecking = provider.status === "checking";
                const statusLabel = isOp ? "Online" : isChecking ? "Checking" : "Slow";
                return (
                  <Link
                    key={provider.id}
                    href={targetHref}
                    className="flex items-center justify-between gap-2 py-2.5 hover:bg-[var(--bg-slate)]/50 -mx-2 px-2 rounded transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-[var(--text-primary)] truncate">
                        {provider.name}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {provider.license}
                        {typeof provider.latencyMs === "number" ? (
                          <span className="omnis-mono omnis-tabular"> • {provider.latencyMs}ms</span>
                        ) : null}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-md shrink-0 ${
                        isOp
                          ? "badge-tone-verified"
                          : isChecking
                          ? "badge-tone-blue"
                          : "badge-tone-warning"
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Timeline Highlights */}
          <div className="pt-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 tone-warning" />
                Recent Historical Highlights
              </h2>
              <Link href="/timeline" className="text-xs tone-blue font-semibold hover:underline">
                Full timeline →
              </Link>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {TIMELINE_EVENTS.slice(-3).map((evt) => (
                <Link
                  key={evt.id}
                  href={`/timeline?event=${evt.id}`}
                  className="block py-2.5 space-y-1 hover:bg-[var(--bg-slate)]/50 -mx-2 px-2 rounded transition-colors"
                >
                  <div className="text-xs tone-blue font-bold omnis-mono">
                    {evt.dateDisplay} • {evt.category}
                  </div>
                  <div className="text-[13.5px] font-bold text-[var(--text-primary)]">{evt.title}</div>
                  <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2">
                    {evt.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
