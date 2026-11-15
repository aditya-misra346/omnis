"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
  LayoutDashboard,
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
} from "lucide-react";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import { classifyQueryIntent } from "@/lib/research/engine";

const NAV_ITEMS = [
  { label: "Home", href: "/command", icon: Home, badge: "Command" },
  { label: "Intelligence", href: "/intelligence", icon: Layers, badge: "Compare" },
  { label: "Explore", href: "/explore", icon: Compass, badge: "Search" },
  { label: "Knowledge Graph", href: "/knowledge-graph", icon: Network, badge: "Mod 02" },
  { label: "Global Atlas", href: "/atlas", icon: Globe2, badge: "Mod 01" },
  { label: "Research", href: "/research", icon: FileSearch, badge: "Mod 05" },
  { label: "Simulations", href: "/simulations", icon: Sliders, badge: "Mod 03" },
  { label: "Timeline", href: "/timeline", icon: Clock, badge: "Mod 04" },
  { label: "Laboratory", href: "/laboratory", icon: FlaskConical, badge: "Mod 06" },
  { label: "My Workspace", href: "/workspace", icon: Briefcase },
  { label: "Settings", href: "/settings", icon: Settings },
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
  const [paletteQuery, setPaletteQuery] = useState("");
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);

  // Sync theme attribute on <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Keyboard shortcuts: Cmd+K for Universal Search Palette, Cmd+J for Universal AI Assistant
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setAssistantOpen(!assistantOpen);
      } else if (e.key === "Escape") {
        setCommandPaletteOpen(false);
        setMobileMenuOpen(false);
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

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-[var(--bg-obsidian)] text-[var(--text-primary)]">
        {/* Top Global Intelligence Header */}
        <header className="sticky top-0 z-40 h-14 border-b border-[var(--border-subtle)] bg-[var(--bg-obsidian)]/90 backdrop-blur-md px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open Navigation Menu"
              className="lg:hidden p-2 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <Menu className="w-4 h-4" />
            </button>

            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white font-bold tracking-wider shadow-sm">
                Ω
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-[0.18em] text-sm">OMNIS</span>
                  <span className="hidden sm:inline-block text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 omnis-mono">
                    v1.0
                  </span>
                </div>
                <p className="hidden xl:block text-[10px] text-[var(--text-muted)] -mt-0.5">
                  The Intelligence of Everything
                </p>
              </div>
            </Link>

            {isLandingPage && (
              <nav className="hidden md:flex items-center gap-1 ml-4 pl-4 border-l border-[var(--border-subtle)] text-xs">
                <Link
                  href="/command"
                  className="px-2.5 py-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-slate)]"
                >
                  Command Center
                </Link>
                <Link
                  href="/atlas"
                  className="px-2.5 py-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-slate)]"
                >
                  3D Global Atlas
                </Link>
                <Link
                  href="/knowledge-graph"
                  className="px-2.5 py-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-slate)]"
                >
                  Knowledge Graph
                </Link>
                <Link
                  href="/simulations"
                  className="px-2.5 py-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-slate)]"
                >
                  Simulations
                </Link>
                <Link
                  href="/research"
                  className="px-2.5 py-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-slate)]"
                >
                  Deep Research
                </Link>
                <Link
                  href="/laboratory"
                  className="px-2.5 py-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-slate)]"
                >
                  Digital Lab
                </Link>
              </nav>
            )}
          </div>

          {/* Universal Command & Search Trigger */}
          <div className="flex-1 max-w-xl mx-2">
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-blue-500/50 text-xs text-[var(--text-secondary)] transition-all"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">
                  Ask anything, search countries, compare indicators, or generate a graph...
                </span>
              </span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] rounded bg-[var(--bg-graphite)] border border-[var(--border-subtle)] omnis-mono">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Providers</span>
            </div>

            <button
              type="button"
              onClick={() => setAssistantOpen(!assistantOpen)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30 text-xs font-medium transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Assistant</span>
              <kbd className="hidden lg:inline text-[10px] opacity-75 omnis-mono">⌘J</kbd>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle Light/Dark Theme"
              title={`Switch to ${theme === "dark" ? "Alabaster Light" : "Obsidian Dark"} Theme`}
              className="p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link
              href="/settings"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-graphite)] text-xs hover:border-blue-500/40"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate max-w-[110px]">
                {user ? user.displayName.split(" ")[0] : "Sign In"}
              </span>
            </Link>
          </div>
        </header>

        {/* Main Workspace Body */}
        <div className="flex-1 flex">
          {/* Desktop Collapsible Sidebar (Shown on all routes or toggleable) */}
          {!isLandingPage && (
            <aside
              className={`hidden lg:flex flex-col justify-between border-r border-[var(--border-subtle)] bg-[var(--bg-graphite)] transition-all duration-200 shrink-0 ${
                sidebarCollapsed ? "w-16" : "w-60"
              }`}
            >
              <div className="p-2.5 space-y-1">
                <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                  {!sidebarCollapsed && (
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                      Navigation Matrix
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    aria-label="Toggle Sidebar Collapse"
                    className="p-1 rounded hover:bg-[var(--bg-slate)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {sidebarCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronLeft className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href ||
                    (item.href !== "/command" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      className={`flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-slate)]"
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Icon className="w-4 h-4 shrink-0" />
                        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </span>
                      {!sidebarCollapsed && item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded omnis-mono ${
                            active
                              ? "bg-white/20 text-white"
                              : "bg-[var(--bg-obsidian)] text-[var(--text-muted)]"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {!sidebarCollapsed && (
                <div className="p-3 m-2.5 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between text-[var(--text-primary)] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-blue-400" />
                      Epistemic Mode
                    </span>
                    <span className="text-emerald-400 omnis-mono">STRICT</span>
                  </div>
                  <p className="text-[var(--text-muted)] leading-relaxed">
                    Every indicator displays live source provenance. Zero unlabelled synthetic statistics.
                  </p>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1 text-blue-400 hover:underline font-medium pt-0.5"
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

        {/* Mobile Accessible Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-10 w-72 max-w-[85vw] bg-[var(--bg-graphite)] border-r border-[var(--border-subtle)] h-full flex flex-col justify-between p-4 overflow-y-auto">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold">
                      Ω
                    </div>
                    <span className="font-bold tracking-widest text-sm">OMNIS</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg border border-[var(--border-subtle)]"
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
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                          active
                            ? "bg-blue-600 text-white"
                            : "text-[var(--text-secondary)] hover:bg-[var(--bg-slate)]"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="w-4 h-4" />
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/20 omnis-mono">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-1.5 text-blue-400 font-medium"
                >
                  ← Return to Landing Presentation
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Universal Search & Natural-Language Command Palette (Cmd+K) */}
        {commandPaletteOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
            <div
              className="fixed inset-0 bg-black/65 backdrop-blur-xs"
              onClick={() => setCommandPaletteOpen(false)}
            />
            <div className="relative z-10 w-full max-w-2xl omnis-card overflow-hidden">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUniversalSearchSubmit(paletteQuery);
                }}
                className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border-subtle)]"
              >
                <Search className="w-5 h-5 text-blue-400 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={paletteQuery}
                  onChange={(e) => setPaletteQuery(e.target.value)}
                  placeholder="Enter a natural language question, country, concept, or scenario..."
                  className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setCommandPaletteOpen(false)}
                  className="px-2 py-1 text-xs rounded border border-[var(--border-subtle)] text-[var(--text-muted)]"
                >
                  ESC
                </button>
              </form>

              {liveIntent && (
                <div className="px-4 py-2.5 bg-blue-500/10 border-b border-[var(--border-subtle)] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>
                      Classified Intent:{" "}
                      <strong className="uppercase tracking-wider text-blue-400">
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
                    className="text-blue-400 hover:underline font-medium inline-flex items-center gap-1"
                  >
                    Route directly to module <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="p-4 space-y-4 max-h-[65vh] overflow-y-auto">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                    Natural Language Intelligence Queries
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {QUICK_NATURAL_QUERIES.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleUniversalSearchSubmit(q)}
                        className="text-left px-3 py-2 rounded-lg bg-[var(--bg-slate)] hover:border-blue-500/40 border border-transparent text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center justify-between gap-2"
                      >
                        <span className="truncate">{q}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
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
                          className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--bg-slate)] hover:bg-blue-600/20 border border-[var(--border-subtle)] text-xs font-medium"
                        >
                          <Icon className="w-4 h-4 text-blue-400 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Persistent Context-Aware Universal AI Assistant Drawer (Cmd+J) */}
        {assistantOpen && (
          <div className="fixed right-4 bottom-4 z-50 w-96 max-w-[calc(100vw-2rem)] h-[540px] max-h-[82vh] omnis-card flex flex-col overflow-hidden border-blue-500/40">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-600/20 to-violet-600/20 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-xs font-bold tracking-wide">
                    OMNIS Universal AI Assistant
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] truncate max-w-[230px]">
                    Context: {activeContextLabel} ({activeContextTopic})
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={clearAssistantMessages}
                  className="text-[10px] px-2 py-1 rounded border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setAssistantOpen(false)}
                  aria-label="Close AI Assistant"
                  className="p-1 rounded hover:bg-[var(--bg-slate)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs">
              {assistantMessages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-lg ${
                    m.role === "user"
                      ? "bg-blue-600 text-white ml-6"
                      : "bg-[var(--bg-slate)] text-[var(--text-primary)] mr-4 border border-[var(--border-subtle)]"
                  }`}
                >
                  <div className="whitespace-pre-line leading-relaxed">{m.content}</div>
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] space-y-1">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                        Verified Sources:
                      </div>
                      {m.citations.map((c) => (
                        <a
                          key={c.url}
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-[11px] text-blue-400 hover:underline truncate"
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
                          className="px-2 py-1 rounded bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 text-[11px] font-medium"
                        >
                          {act.label} →
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {assistantLoading && (
                <div className="p-3 rounded-lg bg-[var(--bg-slate)] text-xs text-[var(--text-muted)] animate-pulse">
                  Verifying indicators across World Bank & OpenAlex providers...
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
                className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={assistantLoading}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </QueryClientProvider>
  );
}
