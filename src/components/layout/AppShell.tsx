"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  Compass,
  Globe2,
  Network,
  FlaskConical,
  Clock,
  FileSearch,
  Sliders,
  Briefcase,
  Settings,
  Layers,
  Search,
  Sparkles,
  Sun,
  Moon,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Send,
  ArrowUpRight,
  ShieldCheck,
  Terminal,
  Home,
  Pause,
  Play,
} from "lucide-react";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import { CreatorSignature } from "@/components/CreatorSignature";
import { COUNTRIES_DATA } from "@/lib/data/global-intelligence";
import { classifyQueryIntent } from "@/lib/research/engine";
import { OmnisLoader, OmnisWordmark } from "@/components/brand/OmnisLogo";

const NAV_ITEMS = [
  { label: "Home", href: "/command", icon: Home, badge: "Command", group: "core" },
  { label: "Intelligence", href: "/intelligence", icon: Layers, badge: "Compare", group: "core" },
  { label: "Explore", href: "/explore", icon: Compass, badge: "Search", group: "core" },
  { label: "Global Atlas", href: "/atlas", icon: Globe2, badge: "Mod 01", group: "modules" },
  { label: "Knowledge Graph", href: "/knowledge-graph", icon: Network, badge: "Mod 02", group: "modules" },
  { label: "Simulations", href: "/simulations", icon: Sliders, badge: "Mod 03", group: "modules" },
  { label: "Timeline", href: "/timeline", icon: Clock, badge: "Mod 04", group: "modules" },
  { label: "Research", href: "/research", icon: FileSearch, badge: "Mod 05", group: "modules" },
  { label: "Laboratory", href: "/laboratory", icon: FlaskConical, badge: "Mod 06", group: "modules" },
  { label: "My Workspace", href: "/workspace", icon: Briefcase, group: "system" },
  { label: "Settings", href: "/settings", icon: Settings, group: "system" },
];

const QUICK_NATURAL_QUERIES = [
  "Explain India's economic development since 1991",
  "Compare India and China economically",
  "How are semiconductor manufacturing and geopolitics connected?",
  "How does artificial intelligence affect employment?",
  "What are the major causes of climate change?",
  "Explain the history of nuclear energy",
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const pathname = usePathname();
  const router = useRouter();

  const {
    theme,
    toggleTheme,
    motionPaused,
    toggleMotionPaused,
    sidebarCollapsed,
    setSidebarCollapsed,
    commandPaletteOpen,
    setCommandPaletteOpen,
    assistantOpen,
    setAssistantOpen,
    activeContextLabel,
    activeContextTopic,
    assistantMessages,
    addAssistantMessage,
    clearAssistantMessages,
    user,
    addSearchQuery,
  } = useOmnisStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteActiveIdx, setPaletteActiveIdx] = useState(0);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [providerTelemetry, setProviderTelemetry] = useState<{
    status: "checking" | "operational" | "degraded" | "unreachable";
    operationalCount: number;
    totalCount: number;
  }>({ status: "checking", operationalCount: 0, totalCount: 4 });

  useEffect(() => {
    let active = true;
    const pollHealth = () => {
      fetch("/api/v1/health")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!active || !data) return;
          const list = Array.isArray(data.providers) ? data.providers : [];
          const opCount = list.filter(
            (p: { status?: string }) => p.status === "operational"
          ).length;
          setProviderTelemetry({
            status: data.status ?? (opCount === list.length ? "operational" : "degraded"),
            operationalCount: opCount,
            totalCount: list.length || 4,
          });
        })
        .catch(() => {
          if (active) {
            setProviderTelemetry((prev) => ({ ...prev, status: "unreachable" }));
          }
        });
    };
    pollHealth();
    const timer = setInterval(pollHealth, 60_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  // Sync theme and motion preference attributes on <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme-ready", "true");
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-motion-paused", String(motionPaused));
  }, [motionPaused]);

  // Keyboard shortcuts: Cmd+K Search Palette, Cmd+J Assistant, ? Cheatsheet, Esc Close
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShortcutsOpen(false);
        setCommandPaletteOpen(!commandPaletteOpen);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setShortcutsOpen(false);
        setAssistantOpen(!assistantOpen);
      } else if (
        e.key === "?" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !(
          e.target instanceof HTMLElement &&
          (e.target.matches("input, textarea, select") || e.target.isContentEditable)
        )
      ) {
        e.preventDefault();
        setCommandPaletteOpen(false);
        setShortcutsOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setCommandPaletteOpen(false);
        setAssistantOpen(false);
        setMobileMenuOpen(false);
        setShortcutsOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandPaletteOpen, assistantOpen, setCommandPaletteOpen, setAssistantOpen]);

  const handleUniversalSearchSubmit = (q: string) => {
    const clean = q.trim();
    if (!clean) return;
    addSearchQuery(clean);
    setCommandPaletteOpen(false);
    router.push(`/explore?q=${encodeURIComponent(clean)}`);
  };

  const handleAssistantSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = assistantInput.trim();
    if (!text || assistantLoading) return;

    setAssistantInput("");
    addAssistantMessage({
      id: `usr-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    });

    setAssistantLoading(true);
    try {
      const res = await fetch("/api/v1/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          contextLabel: activeContextLabel,
          contextTopic: activeContextTopic,
        }),
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        addAssistantMessage({
          id: `ast-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          timestamp: data.timestamp ?? new Date().toISOString(),
          citations: data.citations,
          suggestedActions: data.suggestedActions,
        });
      } else {
        addAssistantMessage({
          id: `err-${Date.now()}`,
          role: "assistant",
          content: data.error ?? "Unable to process request. Guardrail or network restriction triggered.",
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      addAssistantMessage({
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "Network interruption detected. Verified offline cache remains available.",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setAssistantLoading(false);
    }
  };

  const isLandingPage = pathname === "/";
  const liveIntent = paletteQuery.trim() ? classifyQueryIntent(paletteQuery) : null;

  interface CommandPaletteAction {
    id: string;
    label: string;
    subtitle: string;
    category: "Module" | "Action" | "Route" | "Country";
    run: () => void;
  }

  const commandActions: CommandPaletteAction[] = useMemo(() => {
    const navActions: CommandPaletteAction[] = NAV_ITEMS.map((item) => ({
      id: `nav-${item.href}`,
      label: item.label,
      subtitle: item.badge ? `${item.badge} • ${item.href}` : item.href,
      category: "Module",
      run: () => {
        setCommandPaletteOpen(false);
        router.push(item.href);
      },
    }));

    const quickActions: CommandPaletteAction[] = [
      {
        id: "act-theme",
        label: `Switch Theme to ${theme === "dark" ? "Archival Light" : "Obsidian Dark"}`,
        subtitle: "Toggle global visual mode",
        category: "Action",
        run: () => {
          toggleTheme();
          setCommandPaletteOpen(false);
        },
      },
      {
        id: "act-motion",
        label: motionPaused ? "Resume Kinetic Typography & Motion" : "Pause Kinetic Typography & Motion",
        subtitle: "Global animation & shader motion toggle",
        category: "Action",
        run: () => {
          toggleMotionPaused();
          setCommandPaletteOpen(false);
        },
      },
      {
        id: "act-assistant",
        label: "Open Contextual AI Assistant Drawer (⌘J)",
        subtitle: "Grounded multi-provider synthesis sidebar",
        category: "Action",
        run: () => {
          setCommandPaletteOpen(false);
          setAssistantOpen(true);
        },
      },
      {
        id: "act-landing",
        label: "Return to Landing Presentation",
        subtitle: "Public executive showcase /",
        category: "Route",
        run: () => {
          setCommandPaletteOpen(false);
          router.push("/");
        },
      },
    ];

    const countryActions: CommandPaletteAction[] = Object.values(COUNTRIES_DATA).map((c) => ({
      id: `country-${c.iso3}`,
      label: `${c.flagEmoji} ${c.officialName} (${c.iso3})`,
      subtitle: `${c.capital} • GDP $${c.gdpUsdBn.toLocaleString()}B (${
        c.gdpGrowthPct >= 0 ? "+" : ""
      }${c.gdpGrowthPct}%) • ${c.region}`,
      category: "Country",
      run: () => {
        setCommandPaletteOpen(false);
        router.push(`/atlas?country=${c.iso3}`);
      },
    }));

    const q = paletteQuery.trim().toLowerCase();
    if (!q) {
      return [
        {
          id: "act-ctx-research",
          label: `Deep Research: ${activeContextTopic}`,
          subtitle: `Context (${activeContextLabel}) • Launch /research`,
          category: "Action" as const,
          run: () => {
            setCommandPaletteOpen(false);
            router.push(`/research?q=${encodeURIComponent(activeContextTopic)}`);
          },
        },
        ...navActions.slice(0, 4),
        ...quickActions.slice(0, 3),
        ...countryActions.slice(0, 2),
      ];
    }
    const combined = [...countryActions, ...navActions, ...quickActions];
    return combined
      .filter(
        (act) =>
          act.label.toLowerCase().includes(q) || act.subtitle.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const aStarts = a.label.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.label.toLowerCase().startsWith(q) ? 0 : 1;
        return aStarts - bStarts;
      });
  }, [
    paletteQuery,
    theme,
    motionPaused,
    activeContextLabel,
    activeContextTopic,
    toggleTheme,
    toggleMotionPaused,
    setCommandPaletteOpen,
    setAssistantOpen,
    router,
  ]);

  useEffect(() => {
    setPaletteActiveIdx(0);
  }, [paletteQuery, commandPaletteOpen]);

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen flex flex-col bg-[var(--bg-obsidian)] text-[var(--text-primary)]">
          {/* Top Global Intelligence Header */}
          <header
            className="sticky top-0 z-40 h-14 backdrop-blur-xl px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-3 overflow-x-clip"
            style={{
              backgroundColor: "var(--bg-glass)",
              boxShadow: "inset 0 -1px 0 var(--border-subtle), inset 0 1px 0 var(--border-highlight)",
            }}
          >
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open Navigation Menu"
                className="lg:hidden shrink-0 min-h-[40px] min-w-[40px] sm:min-h-[34px] sm:min-w-[34px] flex items-center justify-center p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <Menu className="w-4 h-4" />
              </button>

              <Link
                href="/"
                className="group focus:outline-none rounded-lg transition-opacity hover:opacity-90 shrink-0"
              >
                <OmnisWordmark />
              </Link>

              {isLandingPage && (
                <nav className="hidden xl:flex items-center gap-0.5 ml-2 pl-3 border-l border-[var(--border-subtle)] text-sm font-medium shrink-0">
                  {[
                    { label: "Command", href: "/command" },
                    { label: "3D Atlas", href: "/atlas" },
                    { label: "Graph", href: "/knowledge-graph" },
                    { label: "Simulations", href: "/simulations" },
                    { label: "Research", href: "/research" },
                    { label: "Lab", href: "/laboratory" },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="px-2.5 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-slate)] transition-colors whitespace-nowrap"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              )}
            </div>

            {/* Universal Command & Search Trigger */}
            <div className="flex-1 min-w-0 max-w-md xl:max-w-lg mx-0.5 sm:mx-2">
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                className="w-full min-w-0 flex items-center justify-between gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[13px] text-[var(--text-secondary)] transition-all shadow-2xs"
              >
                <span className="flex items-center gap-2 min-w-0 flex-1">
                  <Search className="w-3.5 h-3.5 tone-blue shrink-0" />
                  <span className="sm:hidden truncate">Search OMNIS...</span>
                  <span className="hidden sm:inline truncate">
                    Search nations, graphs, simulations...
                  </span>
                </span>
                <kbd className="hidden sm:inline-block shrink-0 px-1.5 py-0.5 text-[11px] rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] omnis-mono">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Right Action Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Link
                href="/settings"
                title={`Provider Telemetry: ${providerTelemetry.operationalCount}/${providerTelemetry.totalCount} operational`}
                className={`hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  providerTelemetry.status === "operational"
                    ? "badge-tone-verified"
                    : providerTelemetry.status === "checking"
                      ? "badge-tone-blue"
                      : "badge-tone-warning"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    providerTelemetry.status === "operational"
                      ? "bg-[var(--status-verified)] animate-pulse"
                      : providerTelemetry.status === "checking"
                        ? "bg-[var(--accent-blue)] animate-pulse"
                        : "bg-[var(--status-warning)]"
                  }`}
                />
                <span className="omnis-tabular">
                  {providerTelemetry.status === "checking"
                    ? "Probing Providers..."
                    : `${providerTelemetry.operationalCount}/${providerTelemetry.totalCount} Providers`}
                </span>
              </Link>

              <button
                type="button"
                onClick={() => setAssistantOpen(!assistantOpen)}
                aria-label="Toggle OMNIS AI Assistant"
                className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-2 sm:py-1.5 rounded-lg badge-tone-blue hover:brightness-105 text-[13px] font-semibold transition-all cursor-pointer shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">AI Assistant</span>
                <kbd className="hidden lg:inline text-[11px] opacity-80 omnis-mono">⌘J</kbd>
              </button>

              <button
                type="button"
                onClick={toggleMotionPaused}
                aria-label={motionPaused ? "Resume motion" : "Pause motion"}
                aria-pressed={motionPaused}
                title={
                  motionPaused
                    ? "Resume kinetic typography & ambient motion"
                    : "Pause kinetic typography & ambient motion"
                }
                className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-[13px] font-medium transition-all cursor-pointer shrink-0 ${
                  motionPaused
                    ? "badge-tone-warning"
                    : "border-[var(--border-subtle)] bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                }`}
              >
                {motionPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span className="hidden 2xl:inline">
                  {motionPaused ? "Resume motion" : "Pause motion"}
                </span>
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle Light/Dark Theme"
                title={`Switch to ${theme === "dark" ? "Alabaster Light" : "Obsidian Dark"} Theme`}
                className="min-h-[40px] min-w-[40px] sm:min-h-[34px] sm:min-w-[34px] flex items-center justify-center p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all cursor-pointer shrink-0"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <Link
                href="/settings"
                title={user?.verified ? `${user.displayName} (${user.role})` : "Local Browser Workspace"}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-graphite)] hover:border-[var(--border-strong)] text-[13px] font-medium text-[var(--text-primary)] transition-colors shrink-0"
              >
                <ShieldCheck
                  className={`w-3.5 h-3.5 shrink-0 ${
                    user?.verified ? "tone-verified" : "text-[var(--text-muted)]"
                  }`}
                />
                <span className="truncate max-w-[110px]">
                  {user
                    ? user.verified
                      ? user.displayName.replace(/^Dr\.\s*/i, "").split(" ")[0] ||
                        user.displayName.split(" ")[0]
                      : "Local Session"
                    : "Sign In"}
                </span>
              </Link>
            </div>
          </header>

          {/* Main Workspace Body */}
          <div className="flex-1 flex">
            {/* Desktop Collapsible Sidebar (Shown on all app routes) */}
            {!isLandingPage && (
              <aside
                className={`hidden lg:flex flex-col justify-between border-r border-[var(--border-subtle)] bg-[var(--bg-graphite)] transition-all duration-200 shrink-0 ${
                  sidebarCollapsed ? "w-[68px]" : "w-64"
                }`}
              >
                <div className="p-3 space-y-1">
                  <div className="flex items-center justify-between px-2 py-1.5 mb-2">
                    {!sidebarCollapsed && (
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] omnis-mono">
                        Navigation Matrix
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                      aria-label="Toggle Sidebar Collapse"
                      className="p-1.5 rounded-lg hover:bg-[var(--bg-slate)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {sidebarCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronLeft className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {NAV_ITEMS.map((item, idx) => {
                    const Icon = item.icon;
                    const active =
                      pathname === item.href ||
                      (item.href !== "/command" && pathname.startsWith(item.href));
                    const prevGroup = idx > 0 ? NAV_ITEMS[idx - 1].group : item.group;
                    const showDivider = idx > 0 && item.group !== prevGroup && !sidebarCollapsed;

                    return (
                      <React.Fragment key={item.href}>
                        {showDivider && (
                          <div className="pt-2.5 pb-1 px-2">
                            <div className="border-t border-[var(--border-subtle)] pt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] omnis-mono">
                              {item.group === "modules" ? "Intelligence Modules" : "Workspace & Governance"}
                            </div>
                          </div>
                        )}
                        <Link
                          href={item.href}
                          title={item.label}
                          className={`group relative flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-[13px] sm:text-sm font-medium transition-all ${
                            active
                              ? "bg-[var(--accent-blue-solid)] text-white shadow-sm"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-slate)]"
                          }`}
                        >
                          <span className="flex items-center gap-2.5 truncate">
                            <Icon className="w-4 h-4 shrink-0" />
                            {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                          </span>
                          {!sidebarCollapsed && item.badge && (
                            <span
                              className={`text-[11px] px-1.5 py-0.5 rounded-md omnis-mono ${
                                active
                                  ? "bg-white/20 text-white"
                                  : "bg-[var(--bg-slate)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </React.Fragment>
                    );
                  })}
                </div>

                {!sidebarCollapsed && (
                  <div className="p-3.5 m-3 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs space-y-2">
                    <div className="flex items-center justify-between text-[var(--text-primary)] font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 tone-blue" />
                        Epistemic Mode
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-bold badge-tone-verified omnis-mono">
                        STRICT
                      </span>
                    </div>
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      Every indicator displays source provenance. Zero unlabelled synthetic statistics.
                    </p>
                    <Link
                      href="/"
                      className="inline-flex items-center gap-1 tone-blue hover:underline font-semibold pt-0.5"
                    >
                      Platform Overview <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </aside>
            )}

            {/* Main Route Viewport */}
            <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
          </div>

          <CreatorSignature />

          {/* Mobile Accessible Navigation Drawer */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <div className="fixed inset-0 z-50 lg:hidden flex">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="fixed inset-0 omnis-modal-scrim backdrop-blur-md"
                  onClick={() => setMobileMenuOpen(false)}
                />
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 320 }}
                  className="relative z-10 w-72 max-w-[85vw] bg-[var(--bg-graphite)] border-r border-[var(--border-subtle)] h-full flex flex-col justify-between p-4 overflow-y-auto shadow-2xl"
                >
                  <div>
                    <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
                      <OmnisWordmark compact />
                      <button
                        type="button"
                        onClick={() => setMobileMenuOpen(false)}
                        aria-label="Close Navigation Menu"
                        className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-slate)] text-[var(--text-secondary)]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-4 space-y-1">
                      {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const active = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-[15px] font-medium transition-colors ${
                              active
                                ? "bg-[var(--accent-blue-solid)] text-white shadow-sm"
                                : "text-[var(--text-secondary)] hover:bg-[var(--bg-slate)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            <span className="flex items-center gap-3">
                              <Icon className="w-4 h-4" />
                              {item.label}
                            </span>
                            {item.badge && (
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded omnis-mono ${
                                  active
                                    ? "bg-white/20 text-white"
                                    : "bg-[var(--bg-slate)] text-[var(--text-muted)]"
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[var(--border-subtle)] text-[13px] space-y-2.5">
                    <button
                      type="button"
                      onClick={toggleMotionPaused}
                      aria-label={motionPaused ? "Resume motion" : "Pause motion"}
                      aria-pressed={motionPaused}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition-colors"
                    >
                      <span className="inline-flex items-center gap-2">
                        {motionPaused ? (
                          <Play className="w-3.5 h-3.5 tone-blue" />
                        ) : (
                          <Pause className="w-3.5 h-3.5 tone-blue" />
                        )}
                        <span>{motionPaused ? "Resume motion" : "Pause motion"}</span>
                      </span>
                      <span className="omnis-mono text-xs text-[var(--text-muted)]">
                        {motionPaused ? "OFF" : "ON"}
                      </span>
                    </button>
                    <Link
                      href="/"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-1.5 tone-blue font-semibold hover:underline"
                    >
                      ← Return to Landing Presentation
                    </Link>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Universal Search & Natural-Language Command Palette (Cmd+K) */}
          <AnimatePresence>
            {commandPaletteOpen && (
              <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  className="fixed inset-0 omnis-modal-scrim backdrop-blur-md"
                  onClick={() => setCommandPaletteOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.985 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  role="dialog"
                  aria-modal="true"
                  aria-label="OMNIS Command Palette"
                  className="relative z-10 w-full max-w-2xl omnis-card overflow-hidden shadow-2xl"
                >
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const selectedAction = commandActions[paletteActiveIdx];
                      if (selectedAction) {
                        selectedAction.run();
                        return;
                      }
                      handleUniversalSearchSubmit(paletteQuery);
                    }}
                    className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-graphite)]"
                  >
                    <Search className="w-5 h-5 tone-blue shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      value={paletteQuery}
                      onChange={(e) => setPaletteQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (commandActions.length === 0) return;
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setPaletteActiveIdx((i) => (i + 1) % commandActions.length);
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setPaletteActiveIdx(
                            (i) => (i - 1 + commandActions.length) % commandActions.length
                          );
                        }
                      }}
                      placeholder="Jump to module, run action (theme/motion), or search..."
                      className="w-full bg-transparent text-base sm:text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setCommandPaletteOpen(false)}
                      className="px-2 py-1 text-xs font-medium rounded-md border border-[var(--border-subtle)] bg-[var(--bg-slate)] text-[var(--text-secondary)] omnis-mono"
                    >
                      ESC
                    </button>
                  </form>

                  {commandActions.length > 0 ? (
                    <div className="px-3 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-graphite)] space-y-1">
                      <div className="px-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)] omnis-mono">
                        Direct Module & Action Matches (↵ to launch)
                      </div>
                      {commandActions.slice(0, 6).map((act, idx) => (
                        <button
                          key={act.id}
                          type="button"
                          onMouseEnter={() => setPaletteActiveIdx(idx)}
                          onClick={act.run}
                          className={`w-full px-3 py-2 rounded-lg text-left text-[13px] sm:text-sm flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                            idx === paletteActiveIdx
                              ? "bg-[var(--badge-blue-bg)] border border-[var(--badge-blue-border)] text-[var(--text-primary)]"
                              : "hover:bg-[var(--bg-slate)] text-[var(--text-secondary)] border border-transparent"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-[var(--text-primary)] truncate">
                              {act.label}
                            </div>
                            <div className="text-xs text-[var(--text-muted)] truncate omnis-mono">
                              {act.subtitle}
                            </div>
                          </div>
                          <span className="text-[11px] uppercase px-1.5 py-0.5 rounded bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-[var(--text-muted)] omnis-mono shrink-0">
                            {act.category}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {liveIntent && (
                    <div className="px-4 py-2.5 bg-[var(--bg-slate)] border-b border-[var(--border-subtle)] flex items-center justify-between text-[13px]">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 tone-blue" />
                        <span className="text-[var(--text-secondary)]">
                          Classified Intent:{" "}
                          <strong className="uppercase tracking-wider tone-blue font-semibold">
                            {liveIntent.intent.replace(/_/g, " ")}
                          </strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCommandPaletteOpen(false);
                          router.push(liveIntent.suggestedModule);
                        }}
                        className="tone-blue hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        Route directly to module <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="p-4 space-y-4 max-h-[65vh] overflow-y-auto">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)] mb-2 omnis-mono">
                        Natural Language Intelligence Queries
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {QUICK_NATURAL_QUERIES.map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => handleUniversalSearchSubmit(q)}
                            className="text-left px-3 py-2 rounded-xl bg-[var(--bg-slate)] hover:border-[var(--border-strong)] border border-[var(--border-subtle)] text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center justify-between gap-2"
                          >
                            <span className="truncate">{q}</span>
                            <ArrowUpRight className="w-3.5 h-3.5 shrink-0 tone-blue" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)] mb-2 omnis-mono">
                        Direct Module Launchers
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {NAV_ITEMS.slice(0, 8).map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.href}
                              type="button"
                              onClick={() => {
                                setCommandPaletteOpen(false);
                                router.push(item.href);
                              }}
                              className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--bg-slate)] hover:border-[var(--border-strong)] border border-[var(--border-subtle)] text-[13px] font-medium text-[var(--text-primary)] transition-colors"
                            >
                              <Icon className="w-4 h-4 tone-blue shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Docked Right-Side Context-Aware Universal AI Assistant Drawer (Cmd+J) */}
          <AnimatePresence>
            {assistantOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  onClick={() => setAssistantOpen(false)}
                  className="fixed inset-0 top-14 z-40 omnis-modal-scrim backdrop-blur-md"
                />
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 320 }}
                  role="dialog"
                  aria-label="OMNIS Contextual AI Assistant Drawer"
                  className="fixed top-14 bottom-0 right-0 z-50 w-full sm:w-[400px] bg-[var(--bg-graphite)] border-l border-[var(--border-subtle)] flex flex-col shadow-2xl"
                >
                <div className="px-4 py-3 bg-[var(--bg-slate)] border-b border-[var(--border-subtle)] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg badge-tone-blue flex items-center justify-center shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold tracking-wide text-[var(--text-primary)]">
                        OMNIS Universal AI Assistant
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] truncate max-w-[230px]">
                        Context: {activeContextLabel} ({activeContextTopic})
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={clearAssistantMessages}
                      className="text-xs px-2 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-graphite)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssistantOpen(false)}
                      aria-label="Close AI Assistant"
                      className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-[13px] sm:text-sm bg-[var(--bg-obsidian)]/40">
                  {assistantMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-xl ${
                        m.role === "user"
                          ? "bg-[var(--accent-blue-solid)] text-white ml-6 shadow-xs"
                          : "bg-[var(--bg-slate)] text-[var(--text-primary)] mr-4 border border-[var(--border-subtle)]"
                      }`}
                    >
                      <div className="whitespace-pre-line leading-relaxed">{m.content}</div>
                      {m.citations && m.citations.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] space-y-1">
                          <div className="text-[11.5px] font-semibold uppercase tracking-wider text-[var(--text-muted)] omnis-mono">
                            Verified Sources
                          </div>
                          {m.citations.map((c) => (
                            <a
                              key={c.url}
                              href={c.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-xs sm:text-[13px] tone-blue hover:underline truncate font-medium"
                            >
                              • {c.label}
                            </a>
                          ))}
                        </div>
                      )}
                      {m.suggestedActions && m.suggestedActions.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] flex flex-wrap gap-1.5">
                          {m.suggestedActions.map((act) => (
                            <button
                              key={act.href}
                              type="button"
                              onClick={() => {
                                router.push(act.href);
                              }}
                              className="px-2 py-1 rounded-md badge-tone-blue hover:brightness-105 text-xs font-semibold"
                            >
                              {act.label} →
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {assistantLoading && (
                    <div className="p-3 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)]">
                      <OmnisLoader label="Verifying indicators across live providers..." />
                    </div>
                  )}
                </div>

                <form
                  onSubmit={handleAssistantSend}
                  className="p-2.5 border-t border-[var(--border-subtle)] bg-[var(--bg-graphite)] flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={assistantInput}
                    onChange={(e) => setAssistantInput(e.target.value)}
                    placeholder={`Ask about ${activeContextTopic}...`}
                    className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-base sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)]"
                  />
                  <button
                    type="submit"
                    disabled={assistantLoading}
                    aria-label="Send Assistant Message"
                    className="p-2 rounded-xl bg-[var(--accent-blue-solid)] hover:brightness-110 text-white disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Keyboard Shortcuts Cheatsheet Modal (?) */}
          <AnimatePresence>
            {shortcutsOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  className="fixed inset-0 omnis-modal-scrim backdrop-blur-md"
                  onClick={() => setShortcutsOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Keyboard Shortcuts Cheatsheet"
                  className="relative z-10 w-full max-w-lg omnis-card overflow-hidden"
                >
                  <div className="px-4 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-slate)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 tone-blue" />
                      <span className="text-[13px] font-bold uppercase tracking-[0.14em] text-[var(--text-primary)] omnis-mono">
                        OMNIS Keyboard Shortcuts
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShortcutsOpen(false)}
                      aria-label="Close Keyboard Shortcuts"
                      className="min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-graphite)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="divide-y divide-[var(--border-subtle)] text-sm">
                    {[
                      {
                        keys: "⌘K / Ctrl+K",
                        title: "Universal Command Palette",
                        desc: "Jump directly to nations, modules, theme toggle, or natural search.",
                      },
                      {
                        keys: "⌘J / Ctrl+J",
                        title: "Contextual AI Assistant",
                        desc: "Open or close the grounded evidence synthesis drawer.",
                      },
                      {
                        keys: "↑ / ↓ + ↵",
                        title: "Keyboard Palette Launch",
                        desc: "Cycle curated or filtered palette targets and execute with Enter.",
                      },
                      {
                        keys: "?",
                        title: "Keyboard Shortcuts Cheatsheet",
                        desc: "Toggle this shortcuts overlay from any non-input surface.",
                      },
                      {
                        keys: "Esc",
                        title: "Dismiss Active Overlay",
                        desc: "Close open drawers, command palette, or mobile navigation.",
                      },
                    ].map((row) => (
                      <div
                        key={row.keys}
                        className="px-4 py-3 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-[var(--text-primary)]">
                            {row.title}
                          </div>
                          <div className="text-[13px] text-[var(--text-muted)]">
                            {row.desc}
                          </div>
                        </div>
                        <kbd className="shrink-0 px-2 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-slate)] text-xs font-semibold text-[var(--text-primary)] omnis-mono">
                          {row.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </MotionConfig>
    </QueryClientProvider>
  );
}
