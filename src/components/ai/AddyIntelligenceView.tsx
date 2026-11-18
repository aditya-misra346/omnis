"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Compass,
  Database,
  ExternalLink,
  GitBranch,
  History,
  Sparkles,
} from "lucide-react";
import type { AddyIntelligenceBrief, BriefSourceReference } from "@/lib/ai/contracts";
import { AddyBriefChart } from "@/components/ai/AddyBriefChart";
import { AddyCitationDrawer } from "@/components/ai/AddyCitationDrawer";

function renderCitedProse(
  text: string,
  sourcesById: Map<string, BriefSourceReference>,
  onSelectSource: (src: BriefSourceReference) => void
): React.ReactNode {
  const parts = text.split(/(\[SRC-\d+\])/g);
  return parts.map((part, idx) => {
    const match = /^\[(SRC-\d+)\]$/.exec(part);
    if (!match) return <React.Fragment key={idx}>{part}</React.Fragment>;
    const src = sourcesById.get(match[1]);
    if (!src) return <React.Fragment key={idx}>{part}</React.Fragment>;
    const nextStartsWithPunct = /^[,.;:!?\)]/.test(parts[idx + 1] ?? "");
    return (
      <button
        key={`${match[1]}-${idx}`}
        type="button"
        onClick={() => onSelectSource(src)}
        aria-label={`Inspect source ${src.id}: ${src.title}`}
        className={`inline-flex items-center ${nextStartsWithPunct ? "ml-0.5 mr-0" : "mx-0.5"} px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/30 text-[11px] font-mono text-cyan-200 hover:bg-cyan-500/25 align-baseline transition-colors`}
      >
        [{src.id}]
      </button>
    );
  });
}

export function AddyIntelligenceView({
  brief,
  onSelectFollowUp,
  typographyStyle = "sans",
}: {
  brief: AddyIntelligenceBrief;
  onSelectFollowUp?: (query: string) => void;
  typographyStyle?: "editorial" | "sans" | React.CSSProperties;
}) {
  const [drawerSource, setDrawerSource] = useState<BriefSourceReference | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(
    brief.sources[0]?.id ?? null
  );

  const proseFontClass = typographyStyle === "editorial" ? "font-serif" : "font-sans";
  const wrapperStyle = typeof typographyStyle === "object" ? typographyStyle : undefined;

  const sourcesById = useMemo(() => {
    const map = new Map<string, BriefSourceReference>();
    for (const s of brief.sources) {
      map.set(s.id, s);
    }
    return map;
  }, [brief.sources]);

  const officialCount = useMemo(
    () => brief.sources.filter((s) => s.sourceType === "Official Dataset").length,
    [brief.sources]
  );

  const inspectSource = (src: BriefSourceReference) => {
    setSelectedSourceId(src.id);
    setDrawerSource(src);
  };

  return (
    <div
      className={`flex flex-col lg:flex-row gap-6 items-start min-w-0 ${proseFontClass}`}
      style={wrapperStyle}
    >
      {/* Main Analytical Column */}
      <div className="flex-1 min-w-0 w-full space-y-6">
        {/* Identity & Provenance Summary Banner */}
        <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/[0.08] via-zinc-950/90 to-zinc-950 p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/35 text-xs font-semibold text-cyan-200">
                <Sparkles className="w-3.5 h-3.5" />
                {brief.engineName || "AddyIntelligence"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/12 border border-emerald-400/30 text-xs font-medium text-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {brief.sources.length} Official &amp; Verified Sources
              </span>
              {officialCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-300">
                  <Database className="w-3 h-3 text-emerald-300" />
                  {officialCount} Official Indicators
                </span>
              )}
            </div>

            {brief.diagnostics && (
              <span className="text-[11px] font-mono text-zinc-400">
                {brief.diagnostics.generationMode === "llm-verified"
                  ? "AddyIntelligence + Grounded AI"
                  : "AddyIntelligence · Direct Data Synthesis"}{" "}
                · {(brief.diagnostics.elapsedMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>

          {brief.diagnostics?.partialOutage && brief.diagnostics.failedProviders.length > 0 && (
            <div
              className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3.5 py-2.5 text-xs text-amber-200"
              role="note"
            >
              <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <span>
                Some upstream feeds ({brief.diagnostics.failedProviders.join(", ")}) were slow or unavailable during retrieval. Figures shown come strictly from the verified feeds and cached official snapshots retrieved cleanly.
              </span>
            </div>
          )}

          {/* Direct Answer First */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              The Bottom Line
            </h2>
            <p className="text-base sm:text-[17px] leading-relaxed text-zinc-100 max-w-3xl">
              {renderCitedProse(brief.bottomLine, sourcesById, inspectSource)}
            </p>
          </div>
        </div>

        {/* Key Verified Figures */}
        {brief.keyMetrics.length > 0 && (
          <section aria-label="Key verified metrics" className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1">
              Headline Verified Figures
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {brief.keyMetrics.map((metric, idx) => {
                const src = sourcesById.get(metric.sourceId);
                return (
                  <div
                    key={`${metric.label}-${idx}`}
                    className="rounded-2xl border border-white/[0.08] bg-zinc-950/75 p-4 flex flex-col justify-between gap-3 min-w-0"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <p className="text-xs font-medium text-zinc-400 leading-snug">
                        {metric.label}
                      </p>
                      <p className="text-xl sm:text-2xl font-bold font-mono text-zinc-50 tracking-tight break-words">
                        {metric.value}
                      </p>
                      <p className="text-xs text-cyan-200/90 leading-snug">
                        {renderCitedProse(metric.benchmark, sourcesById, inspectSource)}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-white/[0.06] space-y-2">
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {renderCitedProse(metric.everydayMeaning, sourcesById, inspectSource)}
                      </p>
                      {src && (
                        <button
                          type="button"
                          onClick={() => inspectSource(src)}
                          className="inline-flex items-center gap-1.5 min-h-[36px] text-xs font-mono text-cyan-300 hover:text-cyan-200 transition-colors"
                        >
                          Inspect [{src.id}]
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Dynamic Verified Chart or Comparison Table */}
        {brief.visualData && (
          <AddyBriefChart
            visual={brief.visualData}
            sourcesById={sourcesById}
            onSelectSource={inspectSource}
          />
        )}

        {/* Analytical Sections */}
        {brief.sections.length > 0 && (
          <section aria-label="Detailed analysis" className="space-y-4">
            {brief.sections.map((section, idx) => (
              <article
                key={`${section.heading}-${idx}`}
                className="rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-5 space-y-3"
              >
                <h3 className="text-base sm:text-lg font-semibold text-zinc-100 leading-snug">
                  {section.heading}
                </h3>
                <p className="text-sm sm:text-[15px] text-zinc-300 leading-relaxed max-w-3xl">
                  {renderCitedProse(section.summary, sourcesById, inspectSource)}
                </p>
                <ul className="space-y-2.5 pt-1">
                  {section.bullets.map((bullet, bIdx) => (
                    <li
                      key={bIdx}
                      className="text-sm text-zinc-300 leading-relaxed pl-3.5 border-l-2 border-cyan-500/35 space-y-1.5"
                    >
                      <div>{renderCitedProse(bullet.point, sourcesById, inspectSource)}</div>
                      {bullet.sourceIds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {bullet.sourceIds.map((sid) => {
                            const src = sourcesById.get(sid);
                            if (!src) return null;
                            return (
                              <button
                                key={sid}
                                type="button"
                                onClick={() => inspectSource(src)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-zinc-300 hover:border-cyan-400/40 hover:text-cyan-200 transition-colors"
                              >
                                Inspect [{src.id}]
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        )}

        {/* Practical Implications */}
        <section
          aria-label="Practical implications and data scope"
          className="rounded-2xl border border-white/[0.08] bg-zinc-950/75 p-5 space-y-4"
        >
          <h3 className="text-base font-semibold text-zinc-100">
            Practical Implications &amp; Trade-Offs
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                What It Means in Practice
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {renderCitedProse(
                  brief.practicalTakeaway.whatItMeansInPractice,
                  sourcesById,
                  inspectSource
                )}
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                Key Risks &amp; Trade-Offs
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {renderCitedProse(
                  brief.practicalTakeaway.keyRisksOrTradeOffs,
                  sourcesById,
                  inspectSource
                )}
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Data Scope &amp; Limitations
              </p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {renderCitedProse(
                  brief.practicalTakeaway.dataLimitations,
                  sourcesById,
                  inspectSource
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Cross-Module Exploration & Follow-Ups */}
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-100">Continue Exploring in OMNIS</h3>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/knowledge-graph?q=${encodeURIComponent(brief.query)}`}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.03] text-xs font-medium text-zinc-200 hover:border-cyan-400/35 hover:text-cyan-200 transition-colors"
              >
                <GitBranch className="w-3.5 h-3.5 text-cyan-300" />
                Explore Entities in Knowledge Graph
              </Link>
              <Link
                href={`/simulations?q=${encodeURIComponent(brief.query)}`}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.03] text-xs font-medium text-zinc-200 hover:border-cyan-400/35 hover:text-cyan-200 transition-colors"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-300" />
                Model Scenarios
              </Link>
              <Link
                href={`/timeline?q=${encodeURIComponent(brief.query)}`}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.03] text-xs font-medium text-zinc-200 hover:border-cyan-400/35 hover:text-cyan-200 transition-colors"
              >
                <History className="w-3.5 h-3.5 text-amber-300" />
                Historical Timeline
              </Link>
              <Link
                href="/atlas"
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl border border-white/[0.1] bg-white/[0.03] text-xs font-medium text-zinc-200 hover:border-cyan-400/35 hover:text-cyan-200 transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-cyan-300" />
                Global Atlas
              </Link>
            </div>
          </div>

          {onSelectFollowUp && brief.suggestedFollowUps.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              <p className="text-xs font-medium text-zinc-400">Ask AddyIntelligence next</p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                {brief.suggestedFollowUps.map((fq) => (
                  <button
                    key={fq}
                    type="button"
                    onClick={() => onSelectFollowUp(fq)}
                    className="inline-flex items-center justify-between gap-2 min-h-[44px] px-3.5 py-2 rounded-xl border border-cyan-500/25 bg-cyan-500/[0.06] text-left text-xs font-medium text-cyan-100 hover:bg-cyan-500/[0.14] transition-colors"
                  >
                    <span>{fq}</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0 text-cyan-300" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Desktop Sticky Source Rail / Mobile Bibliography List */}
      {brief.sources.length > 0 && (
        <aside
          aria-label="Verified Bibliography and Citation Rail"
          className="w-full lg:w-80 xl:w-96 shrink-0 lg:sticky lg:top-20 rounded-2xl border border-white/[0.08] bg-zinc-950/85 p-4 sm:p-5 space-y-3 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto"
        >
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.08]">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Verified Sources</h3>
              <p className="text-[11px] text-zinc-400">
                Every statistic links to a live feed or paper below
              </p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-200">
              {brief.sources.length}
            </span>
          </div>

          <ul className="space-y-2.5">
            {brief.sources.map((src) => {
              const isSelected = selectedSourceId === src.id;
              return (
                <li
                  key={src.id}
                  className={`rounded-xl border p-3 transition-colors ${
                    isSelected
                      ? "border-cyan-400/40 bg-cyan-500/[0.06]"
                      : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.15]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-mono font-bold text-cyan-300">
                      [{src.id}]
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-zinc-300">
                      {src.sourceType}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-zinc-100 leading-snug line-clamp-2">
                    {src.title}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    {src.publisher} · {src.year}
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-2.5">
                    <button
                      type="button"
                      onClick={() => inspectSource(src)}
                      className="min-h-[36px] px-2.5 py-1 rounded-lg bg-cyan-500/12 border border-cyan-400/25 text-[11px] font-medium text-cyan-200 hover:bg-cyan-500/20 transition-colors"
                    >
                      Inspect
                    </button>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 min-h-[36px] px-2 text-[11px] text-zinc-400 hover:text-zinc-200"
                    >
                      Source URL
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>
      )}

      <AddyCitationDrawer source={drawerSource} onClose={() => setDrawerSource(null)} />
    </div>
  );
}
