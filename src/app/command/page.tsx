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
} from "lucide-react";
import { COUNTRIES_DATA, TIMELINE_EVENTS } from "@/lib/data/global-intelligence";
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

  useEffect(() => {
    setActiveContext("Home — Intelligence Command Center", "Global Overview & Live Signals");
  }, [setActiveContext]);

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
    } else {
      router.push(`/explore?q=${encodeURIComponent(q)}`);
    }
  };

  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);
  const isWidgetVisible = (id: string) =>
    widgets.find((w) => w.id === id)?.visible ?? true;
  const countries = Object.values(COUNTRIES_DATA);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <OmnisModuleHeader
        moduleTag="INTELLIGENCE COMMAND CENTER"
        title="Global Situation & Knowledge Discovery Cockpit"
        subtitle="Route natural-language investigations directly to the 3D Sovereign Atlas, Infinite Knowledge Graph, Monte Carlo Simulator, or Multi-Step Deep Research Engine."
        icon={<Sparkles className="w-3.5 h-3.5" />}
        actions={
          <>
            <OmnisButton
              variant="secondary"
              onClick={() => setCustomizeOpen((prev) => !prev)}
            >
              <LayoutGrid className="w-3.5 h-3.5 tone-blue" />
              <span>{customizeOpen ? "Close Customiser" : "Customise Cockpit"}</span>
            </OmnisButton>
            <OmnisButton onClick={() => setAssistantOpen(true)}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI Assistant</span>
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
              placeholder="Natural language command: 'Explain India's economic development since 1991', 'Compare India and China', 'Graph Semiconductors'..."
              className="w-full bg-transparent text-base sm:text-[15px] focus:outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
          <OmnisButton type="submit" size="md" className="omnis-magnetic-arrow">
            <span>Execute Command</span>
            <ArrowRight className="omnis-arrow-glyph w-3.5 h-3.5" />
          </OmnisButton>
        </form>

        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-[var(--text-muted)] font-semibold omnis-mono uppercase tracking-wider text-xs">
            Instant Triggers:
          </span>
          {[
            { label: "🇮🇳 India Country Dossier", href: "/atlas?country=IND" },
            { label: "⚖️ India vs China Compare", href: "/intelligence?left=IND&right=CHN" },
            { label: "🕸️ Semiconductors Graph", href: "/knowledge-graph?topic=Semiconductors" },
            { label: "📈 Oil Shock Simulation", href: "/simulations?category=economics" },
            { label: "🔬 Orbital Gravity Lab", href: "/laboratory?cat=space" },
          ].map((pill) => (
            <Link
              key={pill.href}
              href={pill.href}
              className="px-2.5 py-1 rounded-full bg-[var(--bg-slate)] hover:border-[var(--border-strong)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {pill.label}
            </Link>
          ))}
        </div>
      </OmnisModuleHeader>

      {customizeOpen ? (
        <div className="p-4 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-strong)] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Customise Command Cockpit Sections
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Toggle section visibility or adjust layout priorities. Persisted in local storage.
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
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold cursor-pointer ${
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
                      className="p-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-slate)] disabled:opacity-30 cursor-pointer"
                      aria-label={`Move ${w.title} Up`}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === sortedWidgets.length - 1}
                      onClick={() => moveWidget(w.id, "down")}
                      className="p-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-slate)] disabled:opacity-30 cursor-pointer"
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
        <div className="lg:col-span-8 space-y-6">
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
                              {c.gdpGrowthPct >= 0 ? `+${c.gdpGrowthPct}%` : `${c.gdpGrowthPct}%`}
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
                  <h2 className="text-[15px] font-bold uppercase tracking-wider text-[var(--text-primary)] omnis-mono">
                    Core Intelligence Modules
                  </h2>
                </div>
                <span className="text-xs text-[var(--text-muted)] omnis-mono">
                  6 Dedicated Environments
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-[var(--border-subtle)] bg-[var(--bg-graphite)]">
                {[
                  {
                    title: "01. Global Intelligence Globe",
                    desc: "3D Earth, 7 intelligence layers, sovereign dossiers & indicator comparisons.",
                    href: "/atlas",
                    icon: Globe2,
                  },
                  {
                    title: "02. Infinite Knowledge Graph",
                    desc: "6 graph layouts, typed causal relationships, progressive expansion & SVG/JSON export.",
                    href: "/knowledge-graph",
                    icon: Network,
                  },
                  {
                    title: "03. What-If Simulation Engine",
                    desc: "500-path Monte Carlo models across macroeconomics, energy, climate & AI.",
                    href: "/simulations",
                    icon: Sliders,
                  },
                  {
                    title: "04. Reality Timeline",
                    desc: "Connected historical milestones from 2600 BCE to modern AI & climate treaties.",
                    href: "/timeline",
                    icon: Clock,
                  },
                  {
                    title: "05. Deep Research Intelligence",
                    desc: "6 research modes retrieving live OpenAlex papers, World Bank data & citations.",
                    href: "/research",
                    icon: FileSearch,
                  },
                  {
                    title: "06. Digital World Laboratory",
                    desc: "Interactive physics, orbital mechanics, chemistry, DNA, climate & bridge labs.",
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
                <h2 className="text-[15px] font-bold uppercase tracking-wider text-[var(--text-primary)] omnis-mono">
                  Curated Sovereign Developments
                </h2>
                <Link
                  href="/timeline"
                  className="omnis-magnetic-arrow text-[13px] tone-blue font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Reality Timeline</span>
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
                <section className="omnis-card p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[var(--accent-blue)]" />
                      <h2 className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)]">
                        Recommended Cross-Disciplinary Explorations
                      </h2>
                    </div>
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      MULTI-MODULE WORKFLOWS
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      {
                        title: "Submarine Cable & Sovereign AI Compute",
                        chain: "Atlas → Knowledge Graph → Research",
                        detail:
                          "Compare submarine cable bottlenecks, semiconductor fabs, and sovereign AI infrastructure readiness across key corridor nations.",
                        href: "/atlas",
                        accent: "text-[var(--accent-blue)]",
                      },
                      {
                        title: "Atmospheric Carbon & Clean Transition Risk",
                        chain: "Knowledge Graph → Simulations → Report",
                        detail:
                          "Trace causal pathways from emissions intensity to grid decarbonization, industrial output, and policy shock sensitivity.",
                        href: "/knowledge-graph",
                        accent: "text-[var(--accent-cyan)]",
                      },
                      {
                        title: "Macro Monetary Tightening & EM Resilience",
                        chain: "Simulations → Atlas → Timeline",
                        detail:
                          "Stress-test reserve adequacy, trade openness, and external debt vulnerability under high-rate macro regimes.",
                        href: "/simulations",
                        accent: "text-[var(--accent-amber)]",
                      },
                      {
                        title: "Orbital Launch Cadence & Space Infrastructure",
                        chain: "Research → Digital Lab → Workspace",
                        detail:
                          "Synthesize multi-source dossiers on LEO constellations, orbital mechanics, and launch economics into saved briefs.",
                        href: "/research",
                        accent: "text-[var(--accent-blue)]",
                      },
                    ].map((path) => (
                      <Link
                        key={path.title}
                        href={path.href}
                        className="group rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-graphite)] p-3.5 hover:border-[var(--border-strong)] transition-colors flex flex-col justify-between gap-2.5"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-[10px] font-mono uppercase tracking-[0.12em] ${path.accent}`}
                            >
                              {path.chain}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)] transition-transform" />
                          </div>
                          <h3 className="text-[13px] font-semibold text-[var(--text-primary)] leading-snug">
                            {path.title}
                          </h3>
                          <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                            {path.detail}
                          </p>
                        </div>
                      </Link>
                    ))}
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

        {/* Right Telemetry & Pinned Workspace Hairline Rail (4 Cols) */}
        <aside className="lg:col-span-4 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-graphite)] divide-y divide-[var(--border-subtle)]">
          {/* Search History Strip */}
          {isWidgetVisible("recent-explorations") ? (
            <div className="p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] font-bold uppercase tracking-wider text-[var(--text-primary)] omnis-mono flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 tone-violet" />
                  Query History
                </h2>
                <Link
                  href="/explore"
                  className="omnis-magnetic-arrow text-xs tone-blue font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <span>Search All</span>
                  <ArrowRight className="omnis-arrow-glyph w-3 h-3" />
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
          ) : null}

          {/* Pinned Workspace Bookmarks */}
          {isWidgetVisible("recent-explorations") ? (
            <div className="p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] font-bold uppercase tracking-wider text-[var(--text-primary)] omnis-mono flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 tone-blue" />
                  Pinned Workspace ({workspaceItems.length})
                </h2>
                <Link href="/workspace" className="text-xs tone-blue font-semibold hover:underline">
                  Manage →
                </Link>
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {workspaceItems.slice(0, 4).map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="block py-2.5 hover:bg-[var(--bg-slate)]/50 -mx-2 px-2 rounded transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 text-[13.5px] font-semibold">
                      <span className="text-[var(--text-primary)] truncate">{item.title}</span>
                      <span className="text-[11px] uppercase px-1.5 py-0.5 rounded badge-tone-blue omnis-mono shrink-0">
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
          ) : null}

          {/* Timeline Digest */}
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-[var(--text-primary)] omnis-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 tone-warning" />
                Timeline Inflection Digest
              </h2>
              <Link href="/timeline" className="text-xs tone-blue font-semibold hover:underline">
                Full Era View →
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
