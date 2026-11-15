"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
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
import { OmnisButton, OmnisModuleHeader, OmnisSkeleton } from "@/components/ui/OmnisPrimitives";
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

  const [queryInput, setQueryInput] = useState(initialQuery);
  const [mode, setMode] = useState<ResearchMode>("deep");
  const [report, setReport] = useState<ResearchReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingSummary, setEditingSummary] = useState(false);
  const [customSummary, setCustomSummary] = useState("");
  const [savedToast, setSavedToast] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  const { addWorkspaceItem, addSearchQuery, setActiveContext } = useOmnisStore();

  const runResearch = useCallback(
    async (q: string, m: ResearchMode) => {
      const clean = q.trim();
      if (!clean) return;
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
    [setActiveContext]
  );

  useEffect(() => {
    runResearch(initialQuery, "deep");
  }, [initialQuery, runResearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSearchQuery(queryInput);
    runResearch(queryInput, mode);
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
        {/* 6 Research Modes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
          {RESEARCH_MODES.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMode(m.id);
                  runResearch(queryInput, m.id);
                }}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  active
                    ? "bg-[var(--accent-blue-solid)] text-white border-transparent shadow-sm"
                    : "bg-[var(--bg-slate)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                }`}
              >
                <div className="text-xs font-bold">{m.label}</div>
                <div
                  className={`text-[10px] line-clamp-1 ${
                    active ? "text-white/80" : "text-[var(--text-muted)]"
                  }`}
                >
                  {m.desc}
                </div>
              </button>
            );
          })}
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
          {/* Multi-Step Orchestration Trace */}
          <div className="omnis-card p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold uppercase tracking-wider tone-blue omnis-mono">
                Multi-Step Research Orchestration Trace
              </span>
              <span className="text-[var(--text-muted)] omnis-mono">
                Objective: {report.researchObjective}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {report.decomposedTasks.map((t) => (
                <div key={t.step} className="omnis-surface-slate p-3.5 text-xs space-y-1.5">
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
            <div className="lg:col-span-8 omnis-card p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <span className="text-[10.5px] font-bold uppercase tracking-widest tone-blue omnis-mono">
                    {report.mode.toUpperCase()} RESEARCH REPORT • {report.generatedAt.slice(0, 10)}
                  </span>
                  <h2 className="omnis-display text-xl font-extrabold mt-0.5 text-[var(--text-primary)]">
                    {report.query}
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 no-print">
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
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {customSummary}
                  </p>
                )}
              </div>

              {/* Key Findings */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider tone-verified omnis-mono">
                  Key Empirical Findings
                </div>
                <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                  {report.keyFindings.map((kf) => (
                    <li key={kf} className="omnis-surface-slate p-3 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 tone-verified shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{kf}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Detailed Analysis */}
              <div className="space-y-3">
                {report.detailedAnalysis.map((sec) => (
                  <div key={sec.heading} className="space-y-1">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">{sec.heading}</h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {sec.content}
                    </p>
                  </div>
                ))}
              </div>

              {/* Supporting & Contradictory Evidence */}
              <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Extracted Claims & Epistemic Verification Matrix
                </h3>
                <div className="space-y-2.5">
                  {report.supportingEvidence.map((claim) => (
                    <div key={claim.id} className="omnis-surface-slate p-3.5 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold tone-blue">{claim.category}</span>
                        <VerificationBadge status={claim.verificationStatus} />
                      </div>
                      <p className="font-medium text-[var(--text-primary)] leading-relaxed">
                        {claim.statement}
                      </p>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Methodology: {claim.methodologyNote} • Linked Sources:{" "}
                        <span className="omnis-mono">{claim.sourceIds.join(", ")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contradictory Evidence */}
              {report.contradictoryEvidence.map((ce) => (
                <div
                  key={ce.pointOfContention}
                  className="omnis-surface-slate p-4 space-y-2 border-[var(--status-warning)] text-xs"
                >
                  <div className="font-bold tone-warning flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Contradictory Evidence & Methodological Disagreement: {ce.pointOfContention}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-xl bg-[var(--bg-graphite)] border border-[var(--border-subtle)]">
                      <div className="font-semibold tone-cyan">Perspective A:</div>
                      <p className="text-[var(--text-secondary)] mt-1 leading-relaxed">
                        {ce.perspectiveA}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--bg-graphite)] border border-[var(--border-subtle)]">
                      <div className="font-semibold tone-violet">Perspective B:</div>
                      <p className="text-[var(--text-secondary)] mt-1 leading-relaxed">
                        {ce.perspectiveB}
                      </p>
                    </div>
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] pt-1 leading-relaxed">
                    <strong className="text-[var(--text-primary)]">Epistemic Resolution:</strong>{" "}
                    {ce.epistemicResolution}
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: Visualisation, Statistics & Source Credibility Registry */}
            <div className="lg:col-span-4 space-y-6">
              {/* Relevant Statistics & Comparative Bar Visualisation */}
              <div className="omnis-card p-5 space-y-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Relevant Statistics & Visualisation
                </h3>
                <div className="space-y-2">
                  {report.relevantStatistics.map((stat) => (
                    <div
                      key={stat.metric}
                      className="omnis-surface-slate p-3 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-[var(--text-primary)] truncate">
                          {stat.metric}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          {stat.period} • Ref: {stat.sourceId}
                        </div>
                      </div>
                      <div className="text-base font-bold omnis-mono tone-blue shrink-0">
                        {stat.value}
                      </div>
                    </div>
                  ))}
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
                    {report.visualisationSeries.data.map((d) => {
                      const pPct = Math.min(100, Math.max(4, (d.primaryValue / maxChartVal) * 100));
                      const hasComp = d.comparisonValue !== undefined;
                      const cPct = hasComp
                        ? Math.min(100, Math.max(4, ((d.comparisonValue ?? 0) / maxChartVal) * 100))
                        : 0;
                      return (
                        <div key={d.label} className="space-y-1 text-[11px] omnis-mono">
                          <div className="flex justify-between text-[var(--text-secondary)]">
                            <span className="font-semibold text-[var(--text-primary)]">{d.label}</span>
                            <span>
                              {d.primaryValue}
                              {hasComp ? ` vs ${d.comparisonValue}` : ""}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="w-full h-2 rounded-full bg-[var(--bg-slate)] overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pPct}%`, backgroundColor: "var(--chart-blue)" }}
                              />
                            </div>
                            {hasComp && (
                              <div className="w-full h-1.5 rounded-full bg-[var(--bg-slate)] overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${cPct}%`, backgroundColor: "var(--chart-violet)" }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Source Credibility Registry */}
              <div className="omnis-card p-5 space-y-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Transparent Source Credibility Registry ({report.sources.length})
                </h3>
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {report.sources.map((src) => (
                    <div key={src.id} className="omnis-surface-slate p-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md badge-tone-verified font-semibold">
                          {src.sourceType}
                        </span>
                        <span className="text-[10px] omnis-mono text-[var(--text-muted)]">
                          {src.publishedDate}
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
                  ))}
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
