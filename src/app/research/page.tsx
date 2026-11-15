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
  OmnisModuleHeader,
  OmnisSegmentedControl,
  OmnisSkeleton,
} from "@/components/ui/OmnisPrimitives";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import type { ResearchMode, ResearchReportData } from "@/types/omnis";

const RESEARCH_MODES: { id: ResearchMode; label: string; desc: string }[] = [
  { id: "quick", label: "Quick Research", desc: "Concise synthesis with primary citations" },
  { id: "deep", label: "Deep Research", desc: "Multi-source investigation & claim verification" },
  { id: "comparative", label: "Comparative", desc: "Cross-entity & cross-country comparison" },
  { id: "historical", label: "Historical", desc: "Longitudinal evolution across eras" },
  { id: "scientific", label: "Scientific", desc: "Empirical studies, methodology & limits" },
  { id: "economic", label: "Economic", desc: "Macro indicators, elasticities & policy models" },
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
  const [hoveredCitationKey, setHoveredCitationKey] = useState<string | null>(null);
  const sourceRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const inspectCitation = (sourceId: string) => {
    setActiveSourceId(sourceId);
    const card = sourceRefs.current[sourceId];
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  const { addWorkspaceItem, addSearchQuery, setActiveContext } = useOmnisStore();

  const runResearch = useCallback(
    async (q: string, m: ResearchMode, syncUrl = false) => {
      const clean = q.trim();
      if (!clean) return;
      if (syncUrl) {
        router.replace(
          `/research?q=${encodeURIComponent(clean)}&mode=${encodeURIComponent(m)}`,
          { scroll: false }
        );
      }
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

  useEffect(() => {
    setQueryInput(initialQuery);
    setMode(resolvedInitialMode);
    runResearch(initialQuery, resolvedInitialMode, false);
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
      href: `/research?q=${encodeURIComponent(report.query)}`,
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
    navigator.clipboard?.writeText(customSummary);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  const maxChartVal = report
    ? Math.max(
        10,
        ...report.visualisationSeries.data.flatMap((d) => [
          d.primaryValue,
          d.comparisonValue ?? 0,
        ])
      )
    : 100;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Research Orchestration Header */}
      <OmnisModuleHeader
        moduleTag="MODULE 05 • DEEP RESEARCH INTELLIGENCE & SOURCE CREDIBILITY ENGINE"
        title="Multi-Step Source Verification, Claim Extraction & Synthesis"
        subtitle="Orchestrate multi-provider literature and sovereign data retrieval with claim-level epistemic verification and zero fabricated references."
        icon={<FileSearch className="w-3.5 h-3.5" />}
        actions={
          report ? (
            <div className="flex flex-wrap items-center gap-2 no-print">
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
              runResearch(queryInput, nextMode, true);
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
              className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
            />
          </div>
          <OmnisButton type="submit" disabled={loading}>
            {loading ? "Synthesising Sources..." : "Synthesise Report"}
          </OmnisButton>
        </form>
      </OmnisModuleHeader>

      {errorMsg && (
        <div className="omnis-card p-4 border-[var(--status-danger)] text-xs tone-danger flex items-center gap-2 font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading && !report && (
        <div className="space-y-4">
          <OmnisLoader label="Orchestrating World Bank & OpenAlex multi-source retrieval..." />
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
          {/* Multi-Step Orchestration Trace (Architectural Hairline Grid) */}
          <div className="omnis-card p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold uppercase tracking-wider tone-blue omnis-mono">
                Multi-Step Research Orchestration Trace
              </span>
              <span className="text-[var(--text-muted)] omnis-mono">
                Objective: {report.researchObjective}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-[var(--border-subtle)] rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)] bg-[var(--bg-obsidian)]/30">
              {report.decomposedTasks.map((t) => (
                <div key={t.step} className="p-3.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] omnis-mono tone-verified font-bold">
                    <span>STEP 0{t.step}</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-semibold text-[var(--text-primary)]">{t.task}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{t.sourceCategory}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Executive Summary & Key Findings */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 omnis-card p-6 sm:p-7 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
                <div>
                  <span className="text-[10.5px] font-bold uppercase tracking-widest tone-blue omnis-mono">
                    {report.mode.toUpperCase()} RESEARCH REPORT • {report.generatedAt.slice(0, 10)}
                  </span>
                  <h2 className="omnis-display-section text-xl sm:text-2xl font-extrabold mt-0.5 text-[var(--text-primary)]">
                    {report.query}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 no-print">
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
                    <span>{editingSummary ? "Save Edit" : "Edit Summary"}</span>
                  </OmnisButton>
                  <OmnisButton variant="secondary" size="sm" onClick={handleCopySummary}>
                    <Copy className="w-3 h-3" />
                    <span>{copiedToast ? "Copied!" : "Copy"}</span>
                  </OmnisButton>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider tone-blue omnis-mono">
                  Executive Summary
                </div>
                {editingSummary ? (
                  <textarea
                    value={customSummary}
                    onChange={(e) => setCustomSummary(e.target.value)}
                    rows={4}
                    className="w-full p-3 rounded-xl bg-[var(--bg-slate)] border border-[var(--accent-blue)] text-xs leading-relaxed text-[var(--text-primary)] focus:outline-none"
                  />
                ) : (
                  <p
                    className={`omnis-prose text-[var(--text-secondary)] ${
                      typographyStyle === "editorial"
                        ? "text-[16px] leading-[1.72]"
                        : "text-[14px] leading-[1.75]"
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

              {/* Key Findings: Editorial Margin Ledger */}
              <div className="space-y-2.5 pt-2 border-t border-[var(--border-subtle)]">
                <div className="text-xs font-bold uppercase tracking-wider tone-verified omnis-mono">
                  Key Empirical Findings
                </div>
                <ol className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
                  {report.keyFindings.map((kf, idx) => (
                    <li
                      key={kf}
                      className="py-3 grid grid-cols-[2.25rem_1fr] gap-3 items-baseline text-[13.5px] leading-relaxed text-[var(--text-secondary)]"
                    >
                      <span className="omnis-mono omnis-tabular text-xs font-bold tone-cyan">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="omnis-prose text-[var(--text-primary)]">{kf}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Detailed Analysis */}
              <div className="space-y-5">
                {report.detailedAnalysis.map((sec) => (
                  <div key={sec.heading} className="space-y-1.5">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">{sec.heading}</h3>
                    <p className="omnis-prose text-[var(--text-secondary)]">{sec.content}</p>
                  </div>
                ))}
              </div>

              {/* Supporting Evidence: Left-Rule Architectural Callouts & Interactive Hover Citation Popover */}
              <div className="space-y-4 pt-3 border-t border-[var(--border-subtle)]">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Extracted Claims & Epistemic Verification Matrix
                </h3>
                <div className="space-y-4">
                  {report.supportingEvidence.map((claim) => (
                    <div
                      key={claim.id}
                      className="border-l-2 border-[var(--accent-blue)] pl-4 py-1 space-y-1.5 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold tone-blue omnis-mono text-[11px]">
                          {claim.category}
                        </span>
                        <VerificationBadge status={claim.verificationStatus} />
                      </div>
                      <p className="omnis-prose font-medium text-[var(--text-primary)]">
                        {claim.statement}
                      </p>
                      <div className="text-[11px] text-[var(--text-muted)] flex flex-wrap items-center gap-1.5">
                        <span>Methodology: {claim.methodologyNote} • Linked Sources:</span>
                        {claim.sourceIds.map((sid) => {
                          const citKey = `${claim.id}-${sid}`;
                          const matchedSource = report.sources.find((s) => s.id === sid);
                          const isOpen = hoveredCitationKey === citKey;
                          return (
                            <span key={sid} className="relative inline-block">
                              <button
                                type="button"
                                onMouseEnter={() => {
                                  setActiveSourceId(sid);
                                  setHoveredCitationKey(citKey);
                                }}
                                onMouseLeave={() => setHoveredCitationKey(null)}
                                onFocus={() => {
                                  setActiveSourceId(sid);
                                  setHoveredCitationKey(citKey);
                                }}
                                onBlur={() => setHoveredCitationKey(null)}
                                onClick={() => inspectCitation(sid)}
                                className={`px-1.5 py-0.5 rounded text-[10px] omnis-mono font-semibold border transition-colors cursor-pointer ${
                                  activeSourceId === sid
                                    ? "badge-tone-blue border-[var(--accent-blue)]"
                                    : "bg-[var(--bg-graphite)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--accent-blue)]"
                                }`}
                              >
                                [{sid}]
                              </button>
                              {isOpen && matchedSource ? (
                                <div
                                  role="tooltip"
                                  className="absolute bottom-full left-0 mb-2 w-72 sm:w-80 p-3 rounded-xl omnis-hud-pill z-30 text-left space-y-1 pointer-events-none"
                                >
                                  <div className="flex items-center justify-between text-[10px] omnis-mono tone-cyan font-bold">
                                    <span>{matchedSource.sourceType}</span>
                                    <span>{matchedSource.publishedDate}</span>
                                  </div>
                                  <div className="font-bold text-xs text-[var(--text-primary)] line-clamp-2">
                                    {matchedSource.title}
                                  </div>
                                  <div className="text-[10.5px] text-[var(--text-muted)]">
                                    {matchedSource.publisher}
                                  </div>
                                  <p className="text-[11px] text-[var(--text-secondary)] italic line-clamp-3">
                                    “{matchedSource.excerpt}”
                                  </p>
                                </div>
                              ) : null}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contradictory Evidence: Amber Border Callout */}
              {report.contradictoryEvidence.map((ce) => (
                <div
                  key={ce.pointOfContention}
                  className="border-l-2 border-[var(--accent-amber)] pl-4 py-1.5 space-y-2.5 text-xs"
                >
                  <div className="font-bold tone-warning flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Contradictory Evidence & Methodological Disagreement: {ce.pointOfContention}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 border border-[var(--border-subtle)] rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]">
                    <div className="p-3 bg-[var(--bg-obsidian)]/40">
                      <div className="font-semibold tone-cyan text-[11px] omnis-mono">
                        Perspective A
                      </div>
                      <p className="text-[var(--text-secondary)] mt-1 leading-relaxed">
                        {ce.perspectiveA}
                      </p>
                    </div>
                    <div className="p-3 bg-[var(--bg-obsidian)]/40">
                      <div className="font-semibold tone-violet text-[11px] omnis-mono">
                        Perspective B
                      </div>
                      <p className="text-[var(--text-secondary)] mt-1 leading-relaxed">
                        {ce.perspectiveB}
                      </p>
                    </div>
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    <strong className="text-[var(--text-primary)]">Epistemic Resolution:</strong>{" "}
                    {ce.epistemicResolution}
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: Visualisation, Statistics & Source Credibility Registry */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20 lg:self-start">
              {/* Relevant Statistics & Comparative Bar Visualisation */}
              <div className="omnis-card p-5 space-y-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Relevant Statistics & Visualisation
                </h3>
                <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
                  {report.relevantStatistics.map((stat) => {
                    const citKey = `stat-${stat.metric}-${stat.sourceId}`;
                    const matchedSource = report.sources.find((s) => s.id === stat.sourceId);
                    const isOpen = hoveredCitationKey === citKey;
                    return (
                      <div
                        key={stat.metric}
                        className="py-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-[var(--text-primary)] break-words">
                            {stat.metric}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] flex flex-wrap items-center gap-1">
                            <span>{stat.period} •</span>
                            <span className="relative inline-block">
                              <button
                                type="button"
                                onMouseEnter={() => {
                                  setActiveSourceId(stat.sourceId);
                                  setHoveredCitationKey(citKey);
                                }}
                                onMouseLeave={() => setHoveredCitationKey(null)}
                                onFocus={() => {
                                  setActiveSourceId(stat.sourceId);
                                  setHoveredCitationKey(citKey);
                                }}
                                onBlur={() => setHoveredCitationKey(null)}
                                onClick={() => inspectCitation(stat.sourceId)}
                                className="tone-blue hover:underline omnis-mono cursor-pointer"
                              >
                                Ref: [{stat.sourceId}]
                              </button>
                              {isOpen && matchedSource ? (
                                <div
                                  role="tooltip"
                                  className="absolute bottom-full left-0 mb-2 w-64 p-3 rounded-xl omnis-hud-pill z-30 text-left space-y-1 pointer-events-none"
                                >
                                  <div className="font-bold text-[11px] text-[var(--text-primary)] line-clamp-2">
                                    {matchedSource.title}
                                  </div>
                                  <div className="text-[10px] text-[var(--text-muted)]">
                                    {matchedSource.publisher} ({matchedSource.publishedDate})
                                  </div>
                                </div>
                              ) : null}
                            </span>
                          </div>
                        </div>
                        <div className="text-base font-bold omnis-mono omnis-tabular tone-blue shrink-0">
                          {stat.value}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Theme-Adaptive Dual-Series Comparison Bar Chart */}
                <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)]">
                    <span>{report.visualisationSeries.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] omnis-mono text-[var(--text-muted)]">
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
                      Baseline
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {report.visualisationSeries.data.length === 0 ? (
                      <div className="p-3 rounded-lg bg-[var(--bg-slate)] border border-dashed border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)]">
                        {report.visualisationSeries.source}. Consult the Source Credibility Registry
                        below for live primary records.
                      </div>
                    ) : (
                      report.visualisationSeries.data.map((d) => {
                        const pPct = Math.min(
                          100,
                          Math.max(4, (d.primaryValue / maxChartVal) * 100)
                        );
                        const hasComp = d.comparisonValue !== undefined;
                        const cPct = hasComp
                          ? Math.min(
                              100,
                              Math.max(4, ((d.comparisonValue ?? 0) / maxChartVal) * 100)
                            )
                          : 0;
                        return (
                          <div key={d.label} className="space-y-1 text-[11px] omnis-mono omnis-tabular">
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
                                  style={{ width: `${pPct}%`, backgroundColor: "var(--chart-blue)" }}
                                />
                              </div>
                              {hasComp ? (
                                <div className="w-full h-1.5 rounded-full bg-[var(--bg-slate)] overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${cPct}%`,
                                      backgroundColor: "var(--chart-violet)",
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

              {/* Source Credibility Registry */}
              <div className="omnis-card p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Transparent Source Credibility Registry ({report.sources.length})
                  </h3>
                  {activeSourceId && (
                    <button
                      type="button"
                      onClick={() => setActiveSourceId(null)}
                      className="text-[10px] omnis-mono tone-blue hover:underline cursor-pointer"
                    >
                      Clear highlight
                    </button>
                  )}
                </div>
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {report.sources.map((src) => {
                    const isFocused = activeSourceId === src.id;
                    return (
                      <div
                        key={src.id}
                        ref={(el) => {
                          sourceRefs.current[src.id] = el;
                        }}
                        className={`p-3 space-y-1.5 text-xs rounded-xl border transition-all ${
                          isFocused
                            ? "bg-[var(--badge-blue-bg)] border-[var(--accent-blue)] ring-1 ring-[var(--accent-blue)]"
                            : "omnis-surface-slate border-[var(--border-subtle)]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md badge-tone-verified font-semibold">
                            {src.sourceType}
                          </span>
                          <span className="text-[10px] omnis-mono text-[var(--text-muted)]">
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
                        <div className="text-[11px] text-[var(--text-muted)]">
                          Publisher: <strong className="text-[var(--text-primary)]">{src.publisher}</strong>{" "}
                          • Authors: {src.authors.join(", ")}
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] italic">
                          “{src.excerpt}”
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bridge to Knowledge Graph & Timeline */}
              <div className="omnis-card p-5 space-y-2.5 no-print">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] omnis-mono">
                  Continue Investigation Across Modules
                </div>
                <OmnisButton
                  onClick={() =>
                    router.push(
                      `/knowledge-graph?topic=${encodeURIComponent(report.relatedGraphTopic)}`
                    )
                  }
                  className="w-full"
                >
                  <Network className="w-4 h-4" />
                  <span>Generate Knowledge Graph from Report</span>
                </OmnisButton>
                <OmnisButton
                  variant="secondary"
                  onClick={() => router.push("/timeline")}
                  className="w-full"
                >
                  <Clock className="w-4 h-4 tone-violet" />
                  <span>Inspect Connected Historical Timeline</span>
                </OmnisButton>
              </div>
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
