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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Research Orchestration Header */}
      <div className="omnis-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">
              <FileSearch className="w-3.5 h-3.5" />
              <span>MODULE 05 • DEEP RESEARCH INTELLIGENCE & SOURCE CREDIBILITY ENGINE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">
              Multi-Step Source Verification, Claim Extraction & Synthesis
            </h1>
          </div>

          {report && (
            <div className="flex flex-wrap items-center gap-2 no-print">
              <button
                type="button"
                onClick={handleSaveReport}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                {savedToast ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                <span>{savedToast ? "Saved Report" : "Save Report"}</span>
              </button>
              <button
                type="button"
                onClick={handleExportMarkdown}
                className="px-3 py-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Markdown</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-violet-400" />
                <span>Print / PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* 6 Research Modes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {RESEARCH_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMode(m.id);
                runResearch(queryInput, m.id);
              }}
              className={`p-2.5 rounded-lg text-left border transition-all ${
                mode === m.id
                  ? "bg-blue-600/20 border-blue-500 text-[var(--text-primary)]"
                  : "bg-[var(--bg-slate)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
              }`}
            >
              <div className="text-xs font-bold">{m.label}</div>
              <div className="text-[10px] text-[var(--text-muted)] line-clamp-1">{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Query Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-2 bg-[var(--bg-slate)] p-2 rounded-xl border border-[var(--border-subtle)]"
        >
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5">
            <Search className="w-4 h-4 text-blue-400 shrink-0" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Ask any complex research question..."
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50"
          >
            {loading ? "Synthesising Sources..." : "Synthesise Report"}
          </button>
        </form>
      </div>

      {errorMsg && (
        <div className="omnis-card p-4 border-rose-500/40 text-xs text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* Multi-Step Orchestration Trace */}
          <div className="omnis-card p-5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-blue-400">
                Multi-Step Research Orchestration Trace
              </span>
              <span className="text-[var(--text-muted)] omnis-mono">
                Objective: {report.researchObjective}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {report.decomposedTasks.map((t) => (
                <div key={t.step} className="omnis-surface-slate p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] omnis-mono text-emerald-400">
                    <span>STEP 0{t.step}</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-semibold">{t.task}</div>
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
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 omnis-mono">
                    {report.mode.toUpperCase()} RESEARCH REPORT • {report.generatedAt.slice(0, 10)}
                  </span>
                  <h2 className="text-xl font-extrabold mt-0.5">{report.query}</h2>
                </div>
                <div className="flex items-center gap-1.5 no-print">
                  <button
                    type="button"
                    onClick={() => setEditingSummary((e) => !e)}
                    className="px-2.5 py-1 rounded border border-[var(--border-subtle)] text-xs inline-flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{editingSummary ? "Save Edit" : "Edit Summary"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="px-2.5 py-1 rounded border border-[var(--border-subtle)] text-xs inline-flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedToast ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Executive Summary
                </div>
                {editingSummary ? (
                  <textarea
                    value={customSummary}
                    onChange={(e) => setCustomSummary(e.target.value)}
                    rows={4}
                    className="w-full p-3 rounded-lg bg-[var(--bg-slate)] border border-blue-500 text-xs leading-relaxed"
                  />
                ) : (
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {customSummary}
                  </p>
                )}
              </div>

              {/* Key Findings */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Key Empirical Findings
                </div>
                <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                  {report.keyFindings.map((kf) => (
                    <li
                      key={kf}
                      className="omnis-surface-slate p-3 flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{kf}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Detailed Analysis */}
              <div className="space-y-3">
                {report.detailedAnalysis.map((sec) => (
                  <div key={sec.heading} className="space-y-1">
                    <h3 className="text-sm font-bold">{sec.heading}</h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {sec.content}
                    </p>
                  </div>
                ))}
              </div>

              {/* Supporting & Contradictory Evidence */}
              <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
                <h3 className="text-sm font-bold">
                  Extracted Claims & Epistemic Verification Matrix
                </h3>
                <div className="space-y-2.5">
                  {report.supportingEvidence.map((claim) => (
                    <div key={claim.id} className="omnis-surface-slate p-3.5 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-blue-400">{claim.category}</span>
                        <VerificationBadge status={claim.verificationStatus} />
                      </div>
                      <p className="font-medium text-[var(--text-primary)]">{claim.statement}</p>
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
                  className="omnis-surface-slate p-4 space-y-2 border-amber-500/35 text-xs"
                >
                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Contradictory Evidence & Methodological Disagreement: {ce.pointOfContention}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-2.5 rounded bg-[var(--bg-graphite)]">
                      <div className="font-semibold text-sky-400">Perspective A:</div>
                      <p className="text-[var(--text-secondary)] mt-0.5">{ce.perspectiveA}</p>
                    </div>
                    <div className="p-2.5 rounded bg-[var(--bg-graphite)]">
                      <div className="font-semibold text-violet-400">Perspective B:</div>
                      <p className="text-[var(--text-secondary)] mt-0.5">{ce.perspectiveB}</p>
                    </div>
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] pt-1">
                    <strong>Epistemic Resolution:</strong> {ce.epistemicResolution}
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: Visualisation, Statistics, Limitations & Source Credibility Registry */}
            <div className="lg:col-span-4 space-y-6">
              {/* Relevant Statistics */}
              <div className="omnis-card p-5 space-y-3">
                <h3 className="text-sm font-bold">Relevant Statistics & Visualisation</h3>
                <div className="space-y-2">
                  {report.relevantStatistics.map((stat) => (
                    <div
                      key={stat.metric}
                      className="omnis-surface-slate p-3 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold">{stat.metric}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          {stat.period} • Ref: {stat.sourceId}
                        </div>
                      </div>
                      <div className="text-base font-bold omnis-mono text-blue-400">
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Indexed Bar Visualisation */}
                <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
                  <div className="text-xs font-semibold">{report.visualisationSeries.title}</div>
                  {report.visualisationSeries.data.map((d) => (
                    <div key={d.label} className="space-y-1 text-[11px] omnis-mono">
                      <div className="flex justify-between">
                        <span>{d.label}</span>
                        <span>
                          Primary: {d.primaryValue} | Baseline: {d.comparisonValue}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--bg-slate)] overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(100, (d.primaryValue / 500) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Source Credibility Registry */}
              <div className="omnis-card p-5 space-y-3">
                <h3 className="text-sm font-bold">
                  Transparent Source Credibility Registry ({report.sources.length})
                </h3>
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {report.sources.map((src) => (
                    <div key={src.id} className="omnis-surface-slate p-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold">
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
                        className="font-bold text-blue-400 hover:underline flex items-center justify-between gap-1"
                      >
                        <span className="line-clamp-2">{src.title}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Publisher: <strong>{src.publisher}</strong> • Authors:{" "}
                        {src.authors.join(", ")}
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
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Continue Investigation Across Modules
                </div>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/knowledge-graph?topic=${encodeURIComponent(report.relatedGraphTopic)}`
                    )
                  }
                  className="w-full py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-2"
                >
                  <Network className="w-4 h-4" />
                  <span>Generate Knowledge Graph from Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/timeline")}
                  className="w-full py-2.5 px-3 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs font-semibold inline-flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4 text-violet-400" />
                  <span>Inspect Connected Historical Timeline</span>
                </button>
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
    <Suspense fallback={<div className="p-8 text-sm">Loading Deep Research Intelligence...</div>}>
      <ResearchContent />
    </Suspense>
  );
}
