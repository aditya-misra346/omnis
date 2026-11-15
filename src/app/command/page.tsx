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
  const countries = Object.values(COUNTRIES_DATA);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Welcome & Universal Natural-Language Command Bar */}
      <OmnisModuleHeader
        moduleTag="INTELLIGENCE COMMAND CENTER"
        title="Global Situation & Knowledge Discovery Matrix"
        subtitle="Route natural language commands directly to the 3D Sovereign Atlas, Infinite Knowledge Graph, Monte Carlo Simulator, or Multi-Step Deep Research Engine."
        icon={<Sparkles className="w-3.5 h-3.5" />}
        actions={
          <>
            <OmnisButton
              variant="secondary"
              onClick={() => setCustomizeOpen((prev) => !prev)}
            >
              <LayoutGrid className="w-3.5 h-3.5 tone-blue" />
              <span>{customizeOpen ? "Close Customiser" : "Customise Widgets"}</span>
            </OmnisButton>
            <OmnisButton onClick={() => setAssistantOpen(true)}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI Assistant</span>
            </OmnisButton>
          </>
        }
      >
        {/* Natural Language Command Input */}
        <form
          onSubmit={handleCommandSubmit}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-[var(--bg-slate)] p-2 rounded-xl border border-[var(--border-subtle)] focus-within:border-[var(--accent-blue)] transition-colors"
        >
          <div className="flex-1 flex items-center gap-2.5 px-3 py-1.5">
            <Search className="w-4 h-4 tone-blue shrink-0" />
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Natural language command: 'Explain India's economic development since 1991', 'Compare India and China', 'Graph Artificial Intelligence'..."
              className="w-full bg-transparent text-sm focus:outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
          <OmnisButton type="submit" size="md">
            <span>Execute Command</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </OmnisButton>
        </form>

        {/* Quick Command Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[var(--text-muted)] font-semibold omnis-mono uppercase tracking-wider text-[10px]">
            Instant Commands:
          </span>
          {[
            { label: "🇮🇳 India Country Dossier", href: "/atlas?country=IND" },
            { label: "⚖️ India vs China Economic Compare", href: "/intelligence?left=IND&right=CHN" },
            {
              label: "🕸️ Semiconductor & Geopolitics Graph",
              href: "/knowledge-graph?topic=Semiconductors",
            },
            { label: "📈 Oil Shock Monte Carlo Simulation", href: "/simulations?category=economics" },
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

      {/* Customisable Widget Controller Panel */}
      {customizeOpen && (
        <div className="omnis-card p-5 space-y-3 border-[var(--border-strong)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Customise Command Center Widgets
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Rearrange, hide, or restore dashboard intelligence modules. Changes persist
                automatically across sessions.
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
                className="omnis-surface-slate p-3 flex flex-col justify-between gap-2 text-xs"
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
                      className="p-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-graphite)] disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                      aria-label={`Move ${w.title} Up`}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === sortedWidgets.length - 1}
                      onClick={() => moveWidget(w.id, "down")}
                      className="p-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-graphite)] disabled:opacity-30 cursor-pointer"
                      title="Move Down"
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
      )}

      {/* Dynamic Widget Rendering based on User Order & Visibility */}
      <div className="space-y-6">
        {sortedWidgets
          .filter((w) => w.visible)
          .map((widget) => {
            if (widget.id === "trending-global") {
              return (
                <section key={widget.id} className="omnis-card p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 tone-blue" />
                      <h2 className="text-base font-bold text-[var(--text-primary)]">{widget.title}</h2>
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)] omnis-mono">
                      Source: World Bank Open Data (WDI) & IMF WEO 2026
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {countries.slice(0, 8).map((c) => (
                      <Link
                        key={c.iso3}
                        href={`/atlas?country=${c.iso3}`}
                        className="omnis-surface-slate omnis-card-interactive p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-[var(--text-primary)]">
                            {c.flagEmoji} {c.name}
                          </span>
                          <span className="text-[11px] font-semibold omnis-mono px-1.5 py-0.5 rounded-md badge-tone-blue">
                            {c.iso3}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <div>
                            <div className="text-[10px] text-[var(--text-muted)]">Nominal GDP</div>
                            <div className="font-bold omnis-mono text-[var(--text-primary)]">
                              ${c.gdpUsdBn.toLocaleString()}B
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-[var(--text-muted)]">Real Growth</div>
                            <div className="font-bold omnis-mono tone-verified">
                              +{c.gdpGrowthPct}%
                            </div>
                          </div>
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] flex justify-between pt-1 border-t border-[var(--border-subtle)] omnis-mono">
                          <span>Clean: {c.energyProfile.renewableSharePct}%</span>
                          <span>AI: {c.technologyProfile.aiReadinessIndex}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            }

            if (widget.id === "flagship-modules") {
              return (
                <section key={widget.id} className="omnis-card p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 tone-violet" />
                      <h2 className="text-base font-bold text-[var(--text-primary)]">{widget.title}</h2>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      Direct Launch into All 6 Core Modules
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {[
                      {
                        title: "01. Global Intelligence Globe",
                        desc: "3D Earth, 7 intelligence layers, sovereign dossiers & indicator comparisons.",
                        href: "/atlas",
                        icon: Globe2,
                      },
                      {
                        title: "02. Infinite Knowledge Graph",
                        desc: "6 graph layouts, 11 relationship types, progressive expansion & JSON export.",
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
                          className="omnis-surface-slate omnis-card-interactive p-4 flex items-start gap-3"
                        >
                          <div className="p-2 rounded-xl badge-tone-blue shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="space-y-1">
                            <div className="font-bold text-xs text-[var(--text-primary)]">
                              {m.title}
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                              {m.desc}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            }

            if (widget.id === "global-developments") {
              return (
                <section key={widget.id} className="omnis-card p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-[var(--text-primary)]">{widget.title}</h2>
                    <Link href="/timeline" className="text-xs tone-blue font-semibold hover:underline">
                      Open Reality Timeline →
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {countries.slice(0, 3).map((c) => {
                      const dev = c.currentDevelopments[0];
                      return (
                        <div key={c.iso3} className="omnis-surface-slate p-4 space-y-2">
                          <div className="flex items-center justify-between text-[11px] tone-blue font-bold">
                            <span>
                              {c.flagEmoji} {c.name}
                            </span>
                            <span className="omnis-mono">{dev?.date ?? "2026"}</span>
                          </div>
                          <h3 className="text-xs font-bold text-[var(--text-primary)]">
                            {dev?.headline}
                          </h3>
                          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            {dev?.summary}
                          </p>
                          <div className="text-[10px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
                            Source: {dev?.source}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            }

            if (widget.id === "recent-explorations") {
              return (
                <section key={widget.id} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="omnis-card p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold flex items-center gap-2 text-[var(--text-primary)]">
                        <Bookmark className="w-4 h-4 tone-blue" />
                        Saved Research, Graphs & Simulations
                      </h2>
                      <Link href="/workspace" className="text-xs tone-blue font-semibold hover:underline">
                        Open Workspace ({workspaceItems.length}) →
                      </Link>
                    </div>
                    <div className="space-y-2">
                      {workspaceItems.slice(0, 4).map((item) => (
                        <Link
                          key={item.id}
                          href={item.href}
                          className="block omnis-surface-slate omnis-card-interactive p-3"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                            <span className="text-[var(--text-primary)] truncate">{item.title}</span>
                            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-md badge-tone-blue omnis-mono shrink-0">
                              {item.type}
                            </span>
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                            {item.subtitle}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="omnis-card p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold flex items-center gap-2 text-[var(--text-primary)]">
                        <Search className="w-4 h-4 tone-violet" />
                        Recent Natural-Language Investigations
                      </h2>
                      <Link href="/explore" className="text-xs tone-blue font-semibold hover:underline">
                        Universal Search →
                      </Link>
                    </div>
                    <div className="space-y-2">
                      {searchHistory.slice(0, 5).map((q) => (
                        <Link
                          key={q}
                          href={`/explore?q=${encodeURIComponent(q)}`}
                          className="flex items-center justify-between omnis-surface-slate omnis-card-interactive p-3 text-xs text-[var(--text-primary)]"
                        >
                          <span className="truncate font-medium">{q}</span>
                          <ArrowRight className="w-3.5 h-3.5 tone-blue shrink-0" />
                        </Link>
                      ))}
                    </div>
                  </div>
                </section>
              );
            }

            return (
              <section key={widget.id} className="omnis-card p-6 space-y-3">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">{widget.title}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {TIMELINE_EVENTS.slice(-3).map((evt) => (
                    <Link
                      key={evt.id}
                      href={`/timeline?event=${evt.id}`}
                      className="omnis-surface-slate omnis-card-interactive p-3.5 space-y-1.5"
                    >
                      <div className="text-[10px] tone-blue font-bold omnis-mono">
                        {evt.dateDisplay} • {evt.category}
                      </div>
                      <div className="font-bold text-[var(--text-primary)]">{evt.title}</div>
                      <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">
                        {evt.description}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
}
