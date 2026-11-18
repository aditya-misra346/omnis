"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FileSearch,
  Search,
  Bookmark,
  Check,
  Download,
  Copy,
  Network,
  Clock,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Edit3,
} from "lucide-react";
import { VerificationBadge } from "@/components/ui/ProvenancePanel";
import { OmnisLoader } from "@/components/brand/OmnisLogo";
import {
  OmnisButton,
  OmnisGlossaryTip,
  OmnisModuleHeader,
  OmnisSegmentedControl,
  OmnisSkeleton,
} from "@/components/ui/OmnisPrimitives";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import { matchCountryCatalogFromText } from "@/lib/intelligence/spatial-sync";
import type {
  ResearchMode,
  ResearchReportData,
  VerificationStatus,
} from "@/types/omnis";

const PROVENANCE_DIFF_META: Record<
  VerificationStatus,
  { label: string; badgeClass: string; railClass: string }
> = {
  verified: {
    label: "Verified Multi-Source",
    badgeClass: "badge-tone-verified",
    railClass: "border-l-2 border-l-[var(--status-verified)]",
  },
  single_source: {
    label: "Single Source",
    badgeClass: "badge-tone-cyan",
    railClass: "border-l-2 border-l-[var(--status-cyan)]",
  },
  conflicting: {
    label: "Mixed Evidence",
    badgeClass: "badge-tone-warning",
    railClass: "border-l-2 border-l-[var(--status-warning)]",
  },
  interpretation: {
    label: "Modeled Estimate",
    badgeClass: "badge-tone-blue",
    railClass: "border-l-2 border-l-[var(--accent-blue)]",
  },
  unverified: {
    label: "Unverified Claim",
    badgeClass: "badge-tone-danger",
    railClass: "border-l-2 border-l-[var(--status-danger)]",
  },
  ai_hypothesis: {
    label: "Unconfirmed Scenario",
    badgeClass: "badge-tone-violet",
    railClass: "border-l-2 border-l-[var(--accent-violet)]",
  },
};

const RESEARCH_MODES: { id: ResearchMode; label: string; desc: string }[] = [
  { id: "quick", label: "Quick Research", desc: "Short bottom-line answer and top facts" },
  { id: "deep", label: "Deep Research", desc: "Full report with claim checks and sources" },
  { id: "comparative", label: "Comparative", desc: "Head-to-head comparison across peers" },
  { id: "historical", label: "Historical", desc: "How trends evolved over time" },
  { id: "scientific", label: "Scientific", desc: "Academic findings and study limits" },
  { id: "economic", label: "Economic", desc: "Output, income per person, and R&D drivers" },
];

function ResearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery =
    searchParams.get("q") || "Explain India's economic development since 1991";
  const urlModeParam = searchParams.get("mode") as ResearchMode | null;
  const resolvedInitialMode: ResearchMode = RESEARCH_MODES.some((m) => m.id === urlModeParam)
    ? (urlModeParam as ResearchMode)
    : "deep";

  const [queryInput, setQueryInput] = useState(initialQuery);
  const [mode, setMode] = useState<ResearchMode>(resolvedInitialMode);
  const [report, setReport] = useState<ResearchReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingSummary, setEditingSummary] = useState(false);
  const [customSummary, setCustomSummary] = useState("");
  const [savedToast, setSavedToast] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [typographyStyle, setTypographyStyle] = useState<"editorial" | "sans">("editorial");
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [activeClaimMeta, setActiveClaimMeta] = useState<{
    claimId: string;
    sourceIds: string[];
    verificationStatus: VerificationStatus;
    methodologyNote: string;
  } | null>(null);
  const [hoveredCitationKey, setHoveredCitationKey] = useState<string | null>(null);
  const [pinnedCitationKey, setPinnedCitationKey] = useState<string | null>(null);
  const [citationAlign, setCitationAlign] = useState<"left" | "center" | "right">("center");
  const sourceRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const clearCitationPopovers = useCallback(() => {
    setPinnedCitationKey(null);
    setHoveredCitationKey(null);
  }, []);

  const inspectCitation = (
    sourceId: string,
    claimMeta?: {
      claimId: string;
      sourceIds: string[];
      verificationStatus: VerificationStatus;
      methodologyNote: string;
    }
  ) => {
    setActiveSourceId(sourceId);
    if (claimMeta) setActiveClaimMeta(claimMeta);
    clearCitationPopovers();
    const card = sourceRefs.current[sourceId];
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  const openCitationPopover = (
    citKey: string,
    sourceId: string,
    triggerEl?: HTMLElement | null,
    claimMeta?: {
      claimId: string;
      sourceIds: string[];
      verificationStatus: VerificationStatus;
      methodologyNote: string;
    },
    mode: "hover" | "pin" = "hover"
  ) => {
    setActiveSourceId(sourceId);
    if (claimMeta) setActiveClaimMeta(claimMeta);
    if (triggerEl && typeof window !== "undefined") {
      const rect = triggerEl.getBoundingClientRect();
      if (rect.left < 180) setCitationAlign("left");
      else if (window.innerWidth - rect.right < 180) setCitationAlign("right");
      else setCitationAlign("center");
    }
    if (mode === "pin") {
      setPinnedCitationKey((prev) => (prev === citKey ? null : citKey));
      setHoveredCitationKey(null);
    } else {
      setHoveredCitationKey(citKey);
    }
  };

  useEffect(() => {
    if (!pinnedCitationKey && !hoveredCitationKey) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearCitationPopovers();
    };
    const onOutside = () => clearCitationPopovers();
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, [pinnedCitationKey, hoveredCitationKey, clearCitationPopovers]);

  const { addWorkspaceItem, addSearchQuery, setActiveContext } = useOmnisStore();
  const lastFetchedKeyRef = useRef<string | null>(null);

  const runResearch = useCallback(
    async (q: string, m: ResearchMode, syncUrl = false) => {
      const clean = q.trim();
      if (!clean) return;
      const reqKey = `${clean}::${m}`;
      lastFetchedKeyRef.current = reqKey;
      if (syncUrl) {
        router.replace(
          `/research?q=${encodeURIComponent(clean)}&mode=${encodeURIComponent(m)}`,
          { scroll: false }
        );
      }
      await Promise.resolve();
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch("/api/v1/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: clean, mode: m }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error ?? "Research request failed.");
        } else {
          setReport(data);
          setCustomSummary(data.executiveSummary);
          setActiveContext("Deep Research Intelligence", clean);
        }
      } catch {
        setErrorMsg("Network error while orchestrating research.");
      } finally {
        setLoading(false);
      }
    },
    [router, setActiveContext]
  );

  const researchUrlKey = `${initialQuery.trim()}::${resolvedInitialMode}`;
  const [prevResearchUrlKey, setPrevResearchUrlKey] = useState(researchUrlKey);
  if (researchUrlKey !== prevResearchUrlKey) {
    setPrevResearchUrlKey(researchUrlKey);
    setQueryInput(initialQuery);
    setMode(resolvedInitialMode);
  }

  useEffect(() => {
    const reqKey = `${initialQuery.trim()}::${resolvedInitialMode}`;
    if (lastFetchedKeyRef.current === reqKey) return;
    void runResearch(initialQuery, resolvedInitialMode, false);
  }, [initialQuery, resolvedInitialMode, runResearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSearchQuery(queryInput);
    runResearch(queryInput, mode, true);
  };

  const handleSaveReport = () => {
    if (!report) return;
    addWorkspaceItem({
      type: "report",
      title: `Research (${report.mode.toUpperCase()}): ${report.query}`,
      subtitle: `${report.sources.length} Verified Sources • Generated ${report.generatedAt.slice(0, 10)}`,
      folder: "Geopolitics & Macro",
      tags: ["Research Report", report.mode, "OpenAlex", "World Bank"],
      href: `/research?q=${encodeURIComponent(report.query)}&mode=${encodeURIComponent(report.mode)}`,
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const handleExportMarkdown = () => {
    if (!report) return;
    const md = `# OMNIS Deep Research Report: ${report.query}
**Mode:** ${report.mode.toUpperCase()} | **Generated:** ${report.generatedAt}

## Executive Summary
${customSummary}

## Key Findings
${report.keyFindings.map((f) => `- ${f}`).join("\n")}

## Supporting Evidence & Verification
${report.supportingEvidence
  .map((c) => `- [${c.verificationStatus.toUpperCase()}] ${c.statement} (${c.methodologyNote})`)
  .join("\n")}

## Limitations
${report.limitations.map((l) => `- ${l}`).join("\n")}

## Conclusions
${report.conclusions}

## Verified References
${report.sources
  .map((s) => `- **${s.title}** — ${s.publisher} (${s.publishedDate}) | ${s.url}`)
  .join("\n")}
`;
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `omnis-research-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySummary = () => {
    navigator.clipboard?.writeText(customSummary).catch(() => {});
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  const maxChartVal = report
    ? Math.max(
        10,
        ...report.visualisationSeries.data.flatMap((d) => [
          Math.abs(d.primaryValue),
          Math.abs(d.comparisonValue ?? 0),
        ])
      )
    : 100;

  const chartHeadlineTakeaway = (() => {
    const pts = report?.visualisationSeries.data ?? [];
    if (pts.length < 2) return null;
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (first.primaryValue > 0 && last.primaryValue > 0) {
      const ratio = last.primaryValue / first.primaryValue;
      if (ratio >= 1.5) {
        return `Grew ${ratio.toFixed(1)}× from ${first.label} to ${last.label}`;
      }
      const pct = ((last.primaryValue - first.primaryValue) / first.primaryValue) * 100;
      const sign = pct >= 0 ? "Up" : "Down";
      return `${sign} ${Math.abs(Math.round(pct))}% between ${first.label} and ${last.label}`;
    }
    return `${first.label}–${last.label} historical series`;
  })();

  const resolveStatGlossary = (metricName: string): string | undefined => {
    const lower = metricName.toLowerCase();
    if (lower.includes("inflation") || lower.includes("cpi")) return "CPI / Inflation";
    if (lower.includes("per capita") || lower.includes("income") || lower.includes("gdp")) return "GDP Per Capita";
    if (lower.includes("r&d") || lower.includes("research")) return "R&D Intensity";
    if (lower.includes("debt")) return "Public Debt (% of GDP)";
    return undefined;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Research Header */}
      <OmnisModuleHeader
        moduleTag="Deep Research"
        title="Source-Checked Answers & Evidence Breakdown"
        subtitle="Start with the plain-English answer and key statistics, then explore peer-reviewed studies, conflicting viewpoints, and primary data."
        icon={<FileSearch className="w-3.5 h-3.5" />}
        actions={
          report ? (
            <div className="flex flex-wrap items-center gap-2 no-print omnis-no-print">
              <OmnisButton onClick={handleSaveReport}>
                {savedToast ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                <span>{savedToast ? "Saved Report" : "Save Report"}</span>
              </OmnisButton>
              <OmnisButton variant="secondary" onClick={handleExportMarkdown}>
                <Download className="w-3.5 h-3.5 tone-blue" />
                <span>Markdown</span>
              </OmnisButton>
              <OmnisButton variant="secondary" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5 tone-violet" />
                <span>Print / PDF</span>
              </OmnisButton>
            </div>
          ) : undefined
        }
      >
        {/* 6 Research Modes (OmnisSegmentedControl) */}
        <div className="pt-1 overflow-x-auto max-w-full">
          <OmnisSegmentedControl
            groupId="research-mode-tabs"
            ariaLabel="Deep Research Synthesis Mode"
            size="sm"
            value={mode}
            onChange={(val) => {
              const nextMode = val as ResearchMode;
              setMode(nextMode);
              const activeQuery = queryInput.trim() || report?.query || initialQuery;
              if (activeQuery) {
                runResearch(activeQuery, nextMode, true);
              }
            }}
            options={RESEARCH_MODES.map((m) => ({
              value: m.id,
              label: m.label,
            }))}
          />
        </div>

        {/* Query Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-2 bg-[var(--bg-slate)] p-2 rounded-xl border border-[var(--border-subtle)] focus-within:border-[var(--accent-blue)] transition-colors"
        >
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5">
            <Search className="w-4 h-4 tone-blue shrink-0" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Ask any complex research question..."
              className="w-full bg-transparent text-base md:text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
          </div>
          <OmnisButton type="submit" disabled={loading}>
            {loading ? "Checking sources..." : "Investigate"}
          </OmnisButton>
        </form>
      </OmnisModuleHeader>

      {errorMsg && (
        <div className="omnis-card p-4 border-[var(--status-danger)] text-sm tone-danger flex items-center gap-2 font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading && !report && (
        <div className="space-y-4">
          <OmnisLoader label="Checking World Bank & OpenAlex sources…" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <OmnisSkeleton className="h-24" />
            <OmnisSkeleton className="h-24" />
            <OmnisSkeleton className="h-24" />
            <OmnisSkeleton className="h-24" />
          </div>
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* Layer 1 & 2: The Bottom Line + Key Numbers at a Glance */}
          <div className="omnis-card p-5 sm:p-7 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
              <div className="min-w-0">
                <div className="text-xs font-medium text-[var(--text-muted)]">
                  {RESEARCH_MODES.find((m) => m.id === report.mode)?.label ?? "Report"} • Updated{" "}
                  <span className="omnis-tabular">{report.generatedAt.slice(0, 10)}</span>
                </div>
                <h2 className="omnis-display-section font-extrabold mt-0.5 text-[var(--text-primary)]">
                  {report.query}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 no-print omnis-no-print">
                <OmnisSegmentedControl
                  groupId="research-reader-font"
                  ariaLabel="Reader typography toggle"
                  size="sm"
                  value={typographyStyle}
                  onChange={(val) => setTypographyStyle(val as "editorial" | "sans")}
                  options={[
                    { value: "editorial", label: "Serif" },
                    { value: "sans", label: "Sans" },
                  ]}
                />
                <OmnisButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingSummary((e) => !e)}
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{editingSummary ? "Done" : "Edit"}</span>
                </OmnisButton>
                <OmnisButton variant="secondary" size="sm" onClick={handleCopySummary}>
                  <Copy className="w-3 h-3" />
                  <span>{copiedToast ? "Copied!" : "Copy"}</span>
                </OmnisButton>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-7 space-y-2 min-w-0">
                <div className="text-sm font-semibold tone-blue">The Bottom Line</div>
                {editingSummary ? (
                  <textarea
                    value={customSummary}
                    onChange={(e) => setCustomSummary(e.target.value)}
                    rows={4}
                    className="w-full p-3 rounded-xl bg-[var(--bg-slate)] border border-[var(--accent-blue)] text-base md:text-[15px] leading-relaxed text-[var(--text-primary)] focus:outline-none"
                  />
                ) : (
                  <p
                    className={`omnis-prose max-w-[68ch] text-[var(--text-primary)] ${
                      typographyStyle === "editorial"
                        ? "text-[17px] sm:text-[18.5px] leading-[1.72]"
                        : "text-[15.5px] sm:text-base leading-[1.72]"
                    }`}
                    style={
                      typographyStyle === "editorial"
                        ? { fontFamily: "var(--font-editorial), Georgia, serif" }
                        : undefined
                    }
                  >
                    {customSummary}
                  </p>
                )}
              </div>

              <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                {report.relevantStatistics.slice(0, 4).map((stat) => {
                  const glossaryKey = resolveStatGlossary(stat.metric);
                  const citKey = `top-stat-${stat.metric}-${stat.sourceId}`;
                  const matchedSource = report.sources.find((s) => s.id === stat.sourceId);
                  const isOpen =
                    pinnedCitationKey === citKey || hoveredCitationKey === citKey;
                  return (
                    <div
                      key={stat.metric}
                      className="border-l-2 border-[var(--border-subtle)] pl-3 py-1 space-y-0.5 min-w-0"
                    >
                      <div className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1">
                        <span className="line-clamp-2">{stat.metric}</span>
                        {glossaryKey ? <OmnisGlossaryTip term={glossaryKey} /> : null}
                      </div>
                      <div className="text-lg sm:text-xl font-bold omnis-mono omnis-tabular tone-blue">
                        {stat.value}
                      </div>
                      <div className="text-[11.5px] text-[var(--text-secondary)] leading-snug">
                        {stat.unit}
                      </div>
                      <div className="text-[11.5px] text-[var(--text-muted)] flex flex-wrap items-center gap-1 pt-0.5">
                        <span>{stat.period} •</span>
                        <span className="relative inline-block" onPointerDown={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            onPointerEnter={(e) => {
                              if (e.pointerType !== "mouse") return;
                              openCitationPopover(citKey, stat.sourceId, e.currentTarget, undefined, "hover");
                            }}
                            onPointerLeave={(e) => {
                              if (e.pointerType === "mouse") setHoveredCitationKey(null);
                            }}
                            onFocus={(e) => {
                              if (
                                typeof window !== "undefined" &&
                                window.matchMedia?.("(hover: hover) and (pointer: fine)").matches
                              ) {
                                openCitationPopover(citKey, stat.sourceId, e.currentTarget, undefined, "hover");
                              }
                            }}
                            onBlur={() => setHoveredCitationKey(null)}
                            onClick={(e) => {
                              const isTouchViewport =
                                typeof window !== "undefined" &&
                                (window.innerWidth < 640 ||
                                  !window.matchMedia?.("(hover: hover) and (pointer: fine)").matches);
                              if (isTouchViewport) {
                                openCitationPopover(citKey, stat.sourceId, e.currentTarget, undefined, "pin");
                              } else {
                                inspectCitation(stat.sourceId);
                              }
                            }}
                            className="min-h-[44px] sm:min-h-0 inline-flex items-center px-1.5 sm:px-0 tone-blue hover:underline cursor-pointer"
                          >
                            [{stat.sourceId}]
                          </button>
                          {isOpen && matchedSource ? (
                            <div
                              role="dialog"
                              aria-label={`Citation preview for ${matchedSource.title}`}
                              className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] sm:inset-auto sm:absolute sm:bottom-full sm:right-0 sm:mb-2 sm:w-72 p-3.5 rounded-xl bg-[var(--bg-graphite)] border border-[var(--border-strong)] shadow-2xl z-50 text-left space-y-2 pointer-events-auto"
                            >
                              <div className="font-bold text-xs text-[var(--text-primary)] line-clamp-2">
                                {matchedSource.title}
                              </div>
                              <div className="text-[11.5px] text-[var(--text-muted)]">
                                {matchedSource.publisher} ({matchedSource.publishedDate})
                              </div>
                              <p className="text-[12.5px] text-[var(--text-secondary)] line-clamp-3">
                                {matchedSource.excerpt}
                              </p>
                              <div className="flex items-center justify-between gap-2 pt-1 sm:hidden">
                                <button
                                  type="button"
                                  onClick={() => inspectCitation(stat.sourceId)}
                                  className="min-h-[44px] px-3 py-2 rounded-lg bg-[var(--accent-blue-solid)] text-white text-xs font-semibold cursor-pointer"
                                >
                                  View in Registry ↓
                                </button>
                                <button
                                  type="button"
                                  onClick={clearCitationPopovers}
                                  className="min-h-[44px] px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-slate)] text-xs text-[var(--text-secondary)] cursor-pointer"
                                >
                                  Dismiss
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Collapsible Research Steps Disclosure */}
            <details className="pt-3 border-t border-[var(--border-subtle)] group">
              <summary className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-2 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer select-none">
                <CheckCircle2 className="w-3.5 h-3.5 tone-verified shrink-0" />
                <span>
                  Checked {report.sources.length} sources across World Bank, IMF &amp; OpenAlex • View research steps
                </span>
              </summary>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-[var(--border-subtle)] rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)] bg-[var(--bg-graphite)]">
                {report.decomposedTasks.map((t) => (
                  <div key={t.step} className="p-3 text-[13px] space-y-1">
                    <div className="flex items-center justify-between text-xs omnis-tabular tone-verified font-semibold">
                      <span>Step {t.step}</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="font-semibold text-[var(--text-primary)]">{t.task}</div>
                    <div className="text-xs text-[var(--text-muted)]">{t.sourceCategory}</div>
                  </div>
                ))}
              </div>
            </details>
          </div>

          {/* Layers 3 & 4: Key Takeaways + Progressive Accordions alongside Visual Proof & Sources */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 min-w-0 omnis-card p-6 sm:p-7 space-y-6">
              {/* Layer 2 Continuation: Scannable Takeaways */}
              <div className="space-y-2.5">
                <h3 className="text-base sm:text-[17px] font-bold text-[var(--text-primary)]">
                  Main Takeaways
                </h3>
                <ol className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)] max-w-[68ch]">
                  {report.keyFindings.map((kf, idx) => (
                    <li
                      key={kf}
                      className="py-3 grid grid-cols-[2.25rem_1fr] gap-3 items-baseline text-[15px] sm:text-base leading-relaxed text-[var(--text-secondary)]"
                    >
                      <span className="omnis-mono omnis-tabular text-[13px] font-bold tone-cyan">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="omnis-prose text-[var(--text-primary)]">{kf}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Layer 4: Expandable Deep Dive Accordions */}
              <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
                <details className="py-2 group" open>
                  <summary className="min-h-[44px] flex items-center justify-between gap-3 cursor-pointer select-none font-bold text-base text-[var(--text-primary)] hover:text-[var(--accent-blue)] transition-colors">
                    <span>How this works in everyday terms</span>
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                      {report.detailedAnalysis.length} parts
                    </span>
                  </summary>
                  <div className="pt-3 pb-2 space-y-5">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)] pb-2 border-b border-[var(--border-subtle)]">
                      <span className="font-medium text-[var(--text-secondary)]">Quick term guides:</span>
                      <span className="inline-flex items-center gap-1">
                        CPI / Inflation <OmnisGlossaryTip term="CPI / Inflation" />
                      </span>
                      <span className="inline-flex items-center gap-1">
                        GDP Per Capita <OmnisGlossaryTip term="GDP Per Capita" />
                      </span>
                      <span className="inline-flex items-center gap-1">
                        R&amp;D Intensity <OmnisGlossaryTip term="R&D Intensity" />
                      </span>
                    </div>
                    {report.detailedAnalysis.map((sec) => (
                      <div key={sec.heading} className="space-y-1.5 max-w-[68ch]">
                        <h4 className="text-[15.5px] font-bold text-[var(--text-primary)]">{sec.heading}</h4>
                        <p className="omnis-prose text-[var(--text-secondary)]">{sec.content}</p>
                      </div>
                    ))}
                  </div>
                </details>

                <details className="py-2 group">
                  <summary className="min-h-[44px] flex items-center justify-between gap-3 cursor-pointer select-none font-bold text-base text-[var(--text-primary)] hover:text-[var(--accent-amber)] transition-colors">
                    <span className="inline-flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 tone-warning shrink-0" />
                      Where experts disagree
                    </span>
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                      Balanced views
                    </span>
                  </summary>
                  <div className="pt-3 pb-2 space-y-4">
                    {report.contradictoryEvidence.map((ce) => (
                      <div
                        key={ce.pointOfContention}
                        className="border-l-2 border-[var(--accent-amber)] pl-4 py-1 space-y-2.5 text-[13.5px] sm:text-sm max-w-[68ch]"
                      >
                        <div className="font-bold tone-warning">{ce.pointOfContention}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 border border-[var(--border-subtle)] rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]">
                          <div className="p-3 bg-[var(--bg-slate)]/40">
                            <div className="font-semibold tone-cyan text-xs">One View</div>
                            <p className="text-[var(--text-secondary)] mt-1 leading-relaxed">
                              {ce.perspectiveA}
                            </p>
                          </div>
                          <div className="p-3 bg-[var(--bg-slate)]/40">
                            <div className="font-semibold tone-violet text-xs">Another View</div>
                            <p className="text-[var(--text-secondary)] mt-1 leading-relaxed">
                              {ce.perspectiveB}
                            </p>
                          </div>
                        </div>
                        <div className="text-[13.5px] text-[var(--text-secondary)] leading-relaxed">
                          <strong className="text-[var(--text-primary)]">What the data suggests:</strong>{" "}
                          {ce.epistemicResolution}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>

                <details className="py-2 group">
                  <summary className="min-h-[44px] flex items-center justify-between gap-3 cursor-pointer select-none font-bold text-base text-[var(--text-primary)] hover:text-[var(--accent-blue)] transition-colors">
                    <span>Verified claims &amp; source checks</span>
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                      {report.supportingEvidence.length} checks
                    </span>
                  </summary>
                  <div className="pt-3 pb-2 space-y-4 max-w-[68ch]">
                    {report.supportingEvidence.map((claim) => (
                      <div
                        key={claim.id}
                        className="border-l-2 border-[var(--accent-blue)] pl-4 py-1 space-y-1.5 text-[13.5px]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold tone-blue text-xs">{claim.category}</span>
                          <VerificationBadge status={claim.verificationStatus} />
                        </div>
                        <p className="omnis-prose font-medium text-[var(--text-primary)]">
                          {claim.statement}
                        </p>
                        <div className="text-[13px] text-[var(--text-muted)] flex flex-wrap items-center gap-1.5">
                          <span>How verified: {claim.methodologyNote} • Sources:</span>
                          {Array.from(new Set(claim.sourceIds)).map((sid, sIdx) => {
                            const citKey = `${claim.id}-${sid}-${sIdx}`;
                            const matchedSource = report.sources.find((s) => s.id === sid);
                            const claimMeta = {
                              claimId: claim.id,
                              sourceIds: claim.sourceIds,
                              verificationStatus: claim.verificationStatus,
                              methodologyNote: claim.methodologyNote,
                            };
                            const isOpen =
                              pinnedCitationKey === citKey || hoveredCitationKey === citKey;
                            const posClass =
                              citationAlign === "left"
                                ? "sm:left-0 sm:translate-x-0"
                                : citationAlign === "right"
                                  ? "sm:right-0 sm:left-auto sm:translate-x-0"
                                  : "sm:left-1/2 sm:-translate-x-1/2";
                            return (
                              <span
                                key={`${sid}-${sIdx}`}
                                className="relative inline-block"
                                onPointerDown={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  aria-expanded={isOpen}
                                  onPointerEnter={(e) => {
                                    if (e.pointerType !== "mouse") return;
                                    openCitationPopover(citKey, sid, e.currentTarget, claimMeta, "hover");
                                  }}
                                  onPointerLeave={(e) => {
                                    if (e.pointerType === "mouse") setHoveredCitationKey(null);
                                  }}
                                  onFocus={(e) => {
                                    if (
                                      typeof window !== "undefined" &&
                                      window.matchMedia?.("(hover: hover) and (pointer: fine)").matches
                                    ) {
                                      openCitationPopover(citKey, sid, e.currentTarget, claimMeta, "hover");
                                    }
                                  }}
                                  onBlur={() => setHoveredCitationKey(null)}
                                  onClick={(e) => {
                                    const isTouchViewport =
                                      typeof window !== "undefined" &&
                                      (window.innerWidth < 640 ||
                                        !window.matchMedia?.("(hover: hover) and (pointer: fine)").matches);
                                    if (isTouchViewport) {
                                      openCitationPopover(citKey, sid, e.currentTarget, claimMeta, "pin");
                                    } else {
                                      inspectCitation(sid, claimMeta);
                                    }
                                  }}
                                  className={`min-h-[44px] sm:min-h-0 px-2.5 sm:px-2 py-1.5 sm:py-0.5 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                                    activeSourceId === sid
                                      ? "badge-tone-blue border-[var(--accent-blue)]"
                                      : "bg-[var(--bg-graphite)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--accent-blue)]"
                                  }`}
                                >
                                  [{sid}]
                                </button>
                                {isOpen && matchedSource ? (
                                  <div
                                    role="dialog"
                                    aria-label={`Citation preview for ${matchedSource.title}`}
                                    className={`fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] sm:inset-auto sm:absolute sm:bottom-full ${posClass} sm:mb-2 sm:w-80 p-3.5 rounded-xl bg-[var(--bg-graphite)] border border-[var(--border-strong)] shadow-2xl z-50 text-left space-y-2 ${
                                      pinnedCitationKey === citKey
                                        ? "pointer-events-auto"
                                        : "sm:pointer-events-none pointer-events-auto"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2 text-[11px] tone-cyan font-bold">
                                      <span>{matchedSource.sourceType}</span>
                                      <span>{matchedSource.publishedDate}</span>
                                    </div>
                                    <div className="font-bold text-[13px] text-[var(--text-primary)] line-clamp-2">
                                      {matchedSource.title}
                                    </div>
                                    <div className="text-xs text-[var(--text-muted)]">
                                      {matchedSource.publisher}
                                    </div>
                                    <p className="text-[13px] text-[var(--text-secondary)] italic line-clamp-3">
                                      “{matchedSource.excerpt}”
                                    </p>
                                    <div className="flex items-center justify-between gap-2 pt-1 sm:hidden">
                                      <button
                                        type="button"
                                        onClick={() => inspectCitation(sid, claimMeta)}
                                        className="min-h-[44px] px-3 py-2 rounded-lg bg-[var(--accent-blue-solid)] text-white text-xs font-semibold cursor-pointer"
                                      >
                                        View in Registry ↓
                                      </button>
                                      <button
                                        type="button"
                                        onClick={clearCitationPopovers}
                                        className="min-h-[44px] px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-slate)] text-xs text-[var(--text-secondary)] cursor-pointer"
                                      >
                                        Dismiss
                                      </button>
                                    </div>
                                  </div>
                                ) : null}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            </div>

            {/* Layer 3: Visual Proof & Source Registry */}
            <div className="lg:col-span-4 min-w-0 space-y-6 lg:sticky lg:top-20 lg:self-start">
              {/* Visual Proof Card */}
              <div className="omnis-card p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Visual Proof
                  </h3>
                  {chartHeadlineTakeaway ? (
                    <span className="px-2 py-0.5 rounded-md badge-tone-blue text-xs font-semibold">
                      {chartHeadlineTakeaway}
                    </span>
                  ) : null}
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[13px] sm:text-sm font-semibold text-[var(--text-secondary)]">
                    <span>{report.visualisationSeries.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="w-2.5 h-2 rounded-xs inline-block"
                        style={{ backgroundColor: "var(--chart-blue)" }}
                      />
                      Primary
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="w-2.5 h-2 rounded-xs inline-block"
                        style={{ backgroundColor: "var(--chart-violet)" }}
                      />
                      Peer
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {report.visualisationSeries.data.length === 0 ? (
                      <div className="p-3 rounded-lg bg-[var(--bg-slate)] border border-dashed border-[var(--border-subtle)] text-[13px] text-[var(--text-secondary)]">
                        {report.visualisationSeries.source}. See Sources Used below for direct records.
                      </div>
                    ) : (
                      report.visualisationSeries.data.map((d) => {
                        const pPct = Math.min(
                          100,
                          Math.max(4, (Math.abs(d.primaryValue) / maxChartVal) * 100)
                        );
                        const hasComp = d.comparisonValue !== undefined;
                        const cPct = hasComp
                          ? Math.min(
                              100,
                              Math.max(4, (Math.abs(d.comparisonValue ?? 0) / maxChartVal) * 100)
                            )
                          : 0;
                        return (
                          <div key={d.label} className="space-y-1 text-[13px] omnis-mono omnis-tabular">
                            <div className="flex justify-between text-[var(--text-secondary)]">
                              <span className="font-semibold text-[var(--text-primary)]">{d.label}</span>
                              <span>
                                {d.primaryValue.toLocaleString()}
                                {hasComp ? ` vs ${d.comparisonValue?.toLocaleString()}` : ""}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="w-full h-2 rounded-full bg-[var(--bg-slate)] overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${pPct}%`,
                                    backgroundColor:
                                      d.primaryValue < 0 ? "var(--status-warning)" : "var(--chart-blue)",
                                  }}
                                />
                              </div>
                              {hasComp ? (
                                <div className="w-full h-1.5 rounded-full bg-[var(--bg-slate)] overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${cPct}%`,
                                      backgroundColor:
                                        (d.comparisonValue ?? 0) < 0
                                          ? "var(--status-danger)"
                                          : "var(--chart-violet)",
                                    }}
                                  />
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Source Registry */}
              <div className="omnis-card p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Sources Used ({report.sources.length})
                  </h3>
                  {(activeSourceId || activeClaimMeta) && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSourceId(null);
                        setActiveClaimMeta(null);
                      }}
                      className="text-xs omnis-mono tone-blue hover:underline cursor-pointer"
                    >
                      Clear highlight
                    </button>
                  )}
                </div>
                <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] max-h-96 overflow-y-auto pr-1">
                  {report.sources.map((src) => {
                    const isFocused = activeSourceId === src.id;
                    const isClaimLinked = Boolean(
                      activeClaimMeta && activeClaimMeta.sourceIds.includes(src.id)
                    );
                    const diffMeta =
                      isClaimLinked && activeClaimMeta
                        ? PROVENANCE_DIFF_META[activeClaimMeta.verificationStatus]
                        : null;
                    return (
                      <div
                        id={`source-${src.id}`}
                        key={src.id}
                        ref={(el) => {
                          sourceRefs.current[src.id] = el;
                        }}
                        className={`py-3 px-2.5 space-y-1.5 text-[13.5px] transition-all ${
                          isFocused
                            ? `bg-[var(--badge-blue-bg)] rounded-lg ${
                                diffMeta?.railClass ?? "border-l-2 border-l-[var(--accent-blue)]"
                              }`
                            : isClaimLinked && diffMeta
                              ? `bg-[var(--bg-slate)]/45 rounded-lg ${diffMeta.railClass}`
                              : "bg-transparent"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold tone-verified">
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-verified)] shrink-0" />
                              {src.sourceType}
                            </span>
                            {diffMeta ? (
                              <span
                                className={`text-[11px] px-1.5 py-0.5 rounded-md font-semibold ${diffMeta.badgeClass}`}
                              >
                                {diffMeta.label}
                              </span>
                            ) : null}
                          </div>
                          <span className="text-[11.5px] omnis-tabular text-[var(--text-muted)]">
                            [{src.id}] • {src.publishedDate}
                          </span>
                        </div>
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold tone-blue hover:underline flex items-center justify-between gap-1"
                        >
                          <span className="line-clamp-2">{src.title}</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </a>
                        <div className="text-xs sm:text-[13px] text-[var(--text-muted)]">
                          Publisher: <strong className="text-[var(--text-primary)]">{src.publisher}</strong>{" "}
                          • Authors: {src.authors.join(", ")}
                        </div>
                        <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] italic">
                          “{src.excerpt}”
                        </p>
                        {isClaimLinked && activeClaimMeta ? (
                          <div className="pt-1.5 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                            Source check: {activeClaimMeta.methodologyNote}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bridge to Concept Map & Timeline */}
              {(() => {
                const navigateWithSpatialFocus = (target: "knowledge-graph" | "timeline") => {
                  const matchedCountry = matchCountryCatalogFromText(
                    `${report.query} ${report.researchObjective} ${queryInput}`,
                    report.relatedGraphTopic
                  );
                  const focusLabel = matchedCountry?.name ?? report.relatedGraphTopic;
                  useOmnisStore.getState().setFocusedSignal({
                    iso3: matchedCountry?.iso3,
                    topic: focusLabel,
                    label: focusLabel,
                    source: "research",
                    updatedAt: Date.now(),
                  });
                  if (target === "knowledge-graph") {
                    router.push(
                      `/knowledge-graph?topic=${encodeURIComponent(
                        report.relatedGraphTopic
                      )}&focus=${encodeURIComponent(focusLabel)}`
                    );
                  } else {
                    router.push(`/timeline?focus=${encodeURIComponent(focusLabel)}`);
                  }
                };
                return (
                  <div className="omnis-card p-5 space-y-2.5 no-print">
                    <div className="text-xs font-semibold text-[var(--text-muted)]">
                      Explore Further
                    </div>
                    <OmnisButton
                      onClick={() => navigateWithSpatialFocus("knowledge-graph")}
                      className="w-full"
                    >
                      <Network className="w-4 h-4" />
                      <span>Open Topic Map</span>
                    </OmnisButton>
                    <OmnisButton
                      variant="secondary"
                      onClick={() => navigateWithSpatialFocus("timeline")}
                      className="w-full"
                    >
                      <Clock className="w-4 h-4 tone-violet" />
                      <span>Open Historical Timeline</span>
                    </OmnisButton>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResearchPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 max-w-7xl mx-auto">
          <OmnisLoader label="Initialising Deep Research Intelligence Engine..." />
        </div>
      }
    >
      <ResearchContent />
    </Suspense>
  );
}
