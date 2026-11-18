"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FileSearch,
  Search,
  Bookmark,
  Check,
  Download,
  Network,
  Clock,
  ExternalLink,
  AlertTriangle,
  Printer,
  RotateCcw,
  X,
} from "lucide-react";
import { IntelligenceBriefView } from "@/components/intelligence/IntelligenceBriefView";
import { RetrievalProgressStepper } from "@/components/intelligence/RetrievalProgressStepper";
import { streamResearchWithProgress, type RetrievalStageState } from "@/lib/ai/stream-client";
import { ResearchSeriesChart } from "@/components/charts/OmnisCharts";
import { VerificationBadge } from "@/components/ui/ProvenancePanel";
import { OmnisLoader } from "@/components/brand/OmnisLogo";
import {
  OmnisButton,
  OmnisModuleHeader,
  OmnisSegmentedControl,
} from "@/components/ui/OmnisPrimitives";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import type { ResearchMode, ResearchReportData } from "@/types/omnis";

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
  const [stages, setStages] = useState<Partial<Record<1 | 2 | 3 | 4, RetrievalStageState>>>({});
  const [elapsedMs, setElapsedMs] = useState(0);
  const [activeLoadingQuery, setActiveLoadingQuery] = useState(initialQuery);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState(false);
  const [typographyStyle, setTypographyStyle] = useState<"editorial" | "sans">("editorial");
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const sourceRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const inspectCitation = (sourceId: string) => {
    setActiveSourceId(sourceId);
    const card = sourceRefs.current[sourceId];
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

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
      setActiveLoadingQuery(clean);
      setStages({
        1: {
          step: 1,
          label: "Resolving countries, time horizons & economic indicators…",
          status: "active",
          elapsedMs: 0,
        },
      });
      setElapsedMs(0);
      setErrorMsg(null);

      const startedAt = Date.now();
      const ticker = window.setInterval(() => {
        setElapsedMs(Date.now() - startedAt);
      }, 150);

      try {
        const data = await streamResearchWithProgress(clean, m, {
          onStage: (stage) => {
            setElapsedMs(stage.elapsedMs);
            setStages((prev) => ({ ...prev, [stage.step]: stage }));
          },
        });
        setReport(data);
        setActiveContext("Deep Research Intelligence", clean);
      } catch (err) {
        setErrorMsg(
          err instanceof Error && err.message
            ? err.message
            : "Network error while orchestrating verified datasets."
        );
      } finally {
        window.clearInterval(ticker);
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
    const summaryText = report.brief?.bottomLine ?? report.executiveSummary;
    const md = `# OMNIS Deep Research Report: ${report.query}
**Mode:** ${report.mode.toUpperCase()} | **Generated:** ${report.generatedAt}

## Executive Summary
${summaryText}

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

        {/* Query Form (16px text-base prevents iOS auto-zoom; >=44px mobile touch targets) */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-2 bg-[var(--bg-slate)] p-2 rounded-xl border border-[var(--border-subtle)] focus-within:border-[var(--accent-blue)] transition-colors"
        >
          <div className="flex-1 flex items-center gap-2 px-3 py-1">
            <Search className="w-4 h-4 tone-blue shrink-0" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Ask any macro, policy, comparison, or scientific question..."
              className="w-full min-h-[44px] sm:min-h-[36px] bg-transparent text-base md:text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
            {queryInput ? (
              <button
                type="button"
                onClick={() => setQueryInput("")}
                aria-label="Clear question"
                className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>
          <OmnisButton type="submit" disabled={loading} className="min-h-[44px]">
            {loading ? "Checking sources..." : "Investigate"}
          </OmnisButton>
        </form>

        {/* Quick Suggested Prompts (>= 44px touch targets on mobile) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-[var(--text-muted)] font-medium">Examples:</span>
          {[
            "Explain India's economic development since 2014 and what challenges remain.",
            "Compare India and China across economy size, income per person, and clean energy.",
            "How does artificial intelligence adoption affect employment according to recent economic research?",
          ].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setQueryInput(sample);
                addSearchQuery(sample);
                runResearch(sample, mode, true);
              }}
              className="min-h-[44px] md:min-h-[32px] px-3 md:px-2.5 py-1.5 md:py-1 rounded-full bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-[var(--accent-blue)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-left cursor-pointer"
            >
              {sample.length > 54 ? `${sample.slice(0, 52)}…` : sample}
            </button>
          ))}
        </div>
      </OmnisModuleHeader>

      {errorMsg && (
        <div className="omnis-card p-4 sm:p-5 border-[var(--status-danger)] text-sm tone-danger flex flex-wrap items-center justify-between gap-3 font-medium">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <OmnisButton
            variant="secondary"
            onClick={() => runResearch(queryInput || activeLoadingQuery, mode, false)}
            className="min-h-[44px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Investigation</span>
          </OmnisButton>
        </div>
      )}

      {loading && (
        <RetrievalProgressStepper
          stages={stages}
          elapsedMs={elapsedMs}
          query={activeLoadingQuery}
        />
      )}

      {report && !loading && (
        <div className="space-y-6">
          {/* Reader Header Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-medium text-[var(--text-muted)]">
              {RESEARCH_MODES.find((m) => m.id === report.mode)?.label ?? "Report"} • Updated{" "}
              <span className="omnis-tabular">{report.generatedAt.slice(0, 10)}</span>
            </div>
            <div className="no-print omnis-no-print">
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
            </div>
          </div>

          {report.brief ? (
            <IntelligenceBriefView
              brief={report.brief}
              typographyStyle={typographyStyle}
              onSelectFollowUp={(fq) => {
                setQueryInput(fq);
                addSearchQuery(fq);
                runResearch(fq, mode, true);
              }}
            />
          ) : null}

          {/* Legacy Structured Claim Audit & Historical Series Fallback */}
          <details className="omnis-card p-4 sm:p-5 group">
            <summary className="min-h-[44px] flex items-center justify-between gap-3 cursor-pointer select-none text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <span>Full Claim Verification Ledger &amp; Auxiliary Trajectory ({report.sources.length} sources)</span>
              <span className="text-xs font-normal text-[var(--text-muted)]">Expand audit</span>
            </summary>
            <div className="pt-4 mt-3 border-t border-[var(--border-subtle)] grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-4 min-w-0">
                {report.supportingEvidence.map((claim) => (
                  <div
                    key={claim.id}
                    className="border-l-2 border-[var(--accent-blue)] pl-4 py-1 space-y-1.5 text-[13.5px]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold tone-blue text-xs">{claim.category}</span>
                      <VerificationBadge status={claim.verificationStatus} />
                    </div>
                    <p className="text-[var(--text-primary)]">{claim.statement}</p>
                    <div className="text-xs text-[var(--text-muted)] flex flex-wrap gap-1.5">
                      <span>{claim.methodologyNote}</span>
                      {claim.sourceIds.map((sid) => (
                        <button
                          key={sid}
                          type="button"
                          onClick={() => inspectCitation(sid)}
                          className="tone-blue hover:underline cursor-pointer"
                        >
                          [{sid}]
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {report.contradictoryEvidence.map((ce) => (
                  <div
                    key={ce.pointOfContention}
                    className="border-l-2 border-[var(--accent-amber)] pl-4 py-1 space-y-1.5 text-[13.5px]"
                  >
                    <div className="font-bold tone-warning">{ce.pointOfContention}</div>
                    <p className="text-[var(--text-secondary)]">{ce.epistemicResolution}</p>
                  </div>
                ))}
              </div>
              <div className="lg:col-span-5 space-y-4 min-w-0">
                <div className="rounded-xl border border-[var(--border-subtle)] p-3.5 space-y-2">
                  <div className="text-xs font-semibold text-[var(--text-secondary)]">
                    {report.visualisationSeries.title}
                  </div>
                  <ResearchSeriesChart series={report.visualisationSeries} />
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {report.sources.map((src) => (
                    <div
                      key={src.id}
                      ref={(el) => {
                        sourceRefs.current[src.id] = el;
                      }}
                      className={`p-2.5 rounded-lg border text-xs ${
                        activeSourceId === src.id
                          ? "border-[var(--accent-blue)] bg-[var(--badge-blue-bg)]"
                          : "border-[var(--border-subtle)]"
                      }`}
                    >
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold tone-blue hover:underline flex items-center justify-between gap-1"
                      >
                        <span className="truncate">{src.title}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                      <div className="text-[var(--text-muted)] mt-0.5">
                        {src.publisher} ({src.publishedDate})
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <OmnisButton
                    size="sm"
                    onClick={() => router.push(`/knowledge-graph?topic=${encodeURIComponent(report.relatedGraphTopic)}`)}
                  >
                    <Network className="w-3.5 h-3.5" />
                    <span>Open Topic Map</span>
                  </OmnisButton>
                  <OmnisButton
                    size="sm"
                    variant="secondary"
                    onClick={() => router.push("/timeline")}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Timeline</span>
                  </OmnisButton>
                </div>
              </div>
            </div>
          </details>
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
