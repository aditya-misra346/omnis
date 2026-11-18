"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bookmark,
  Check,
  Download,
  ExternalLink,
  FileJson,
  Info,
  Network,
  ShieldCheck,
  Sliders,
  Sparkles,
} from "lucide-react";
import type { BriefSourceReference, IntelligenceBriefResponse } from "@/lib/ai/contracts";
import { resolveCountryEntities } from "@/lib/ai/orchestrator";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import { BriefChartRenderer } from "@/components/intelligence/BriefChartRenderer";
import { CitationDrawer } from "@/components/intelligence/CitationDrawer";

const SOURCE_BADGE_MAP: Record<BriefSourceReference["sourceType"], string> = {
  "Official Dataset": "badge-tone-verified",
  "Peer-Reviewed Article": "badge-tone-violet",
  "Institutional Archive": "badge-tone-cyan",
};

function renderTextWithCitations(
  text: string,
  sources: BriefSourceReference[],
  activeSourceId: string | null,
  onInspectSource: (id: string) => void,
  onHoverSource: (id: string | null) => void
): React.ReactNode {
  const validMap = new Map(sources.map((s) => [s.id, s]));
  const parts = text.split(/(\[SRC-\d+\])/g);
  return parts.map((part, idx) => {
    const match = part.match(/^\[(SRC-\d+)\]$/);
    if (!match) {
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    }
    const id = match[1];
    if (!validMap.has(id)) return null;
    const isActive = activeSourceId === id;
    const nextPart = parts[idx + 1] ?? "";
    const flushRight = /^[.,;:!?)]/.test(nextPart);
    return (
      <button
        key={`${id}-${idx}`}
        type="button"
        onClick={() => onInspectSource(id)}
        onMouseEnter={() => onHoverSource(id)}
        onMouseLeave={() => onHoverSource(null)}
        aria-label={`Inspect citation ${id}`}
        className={`inline-flex items-center ml-1 ${
          flushRight ? "mr-0" : "mr-1"
        } px-1.5 py-0.5 rounded text-[11px] font-bold omnis-mono align-baseline border transition-colors cursor-pointer ${
          isActive
            ? "bg-[var(--accent-blue-solid)] text-white border-[var(--accent-blue)]"
            : "bg-[var(--badge-blue-bg)] border-[var(--accent-blue)]/40 tone-blue hover:border-[var(--accent-blue)]"
        }`}
      >
        [{id}]
      </button>
    );
  });
}

function renderBoldLeadBullet(
  point: string,
  sources: BriefSourceReference[],
  activeSourceId: string | null,
  onInspectSource: (id: string) => void,
  onHoverSource: (id: string | null) => void
): React.ReactNode {
  const colonIdx = point.indexOf(":");
  if (colonIdx > 2 && colonIdx < 64) {
    const lead = point.slice(0, colonIdx + 1);
    const rest = point.slice(colonIdx + 1);
    return (
      <>
        <strong className="font-semibold text-[var(--text-primary)]">{lead}</strong>
        {renderTextWithCitations(rest, sources, activeSourceId, onInspectSource, onHoverSource)}
      </>
    );
  }
  return renderTextWithCitations(point, sources, activeSourceId, onInspectSource, onHoverSource);
}

export function IntelligenceBriefView({
  brief,
  onSelectFollowUp,
  typographyStyle = "editorial",
  hideFooterActions = false,
}: {
  brief: IntelligenceBriefResponse;
  onSelectFollowUp?: (question: string) => void;
  typographyStyle?: "editorial" | "sans";
  hideFooterActions?: boolean;
}) {
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const addWorkspaceItem = useOmnisStore((s) => s.addWorkspaceItem);

  const primaryIso3 = useMemo(() => {
    const detected = resolveCountryEntities(brief.query);
    return detected[0]?.iso3;
  }, [brief.query]);

  const handleInspectSource = (sourceId: string) => {
    setActiveSourceId(sourceId);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setDrawerOpen(true);
      return;
    }
    if (typeof document !== "undefined") {
      document
        .getElementById(`brief-rail-${sourceId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  const handleSaveBrief = () => {
    addWorkspaceItem({
      type: "report",
      title: `Brief: ${brief.query}`,
      subtitle: `${brief.sources.length} Verified Sources · ${brief.intent.replace(/_/g, " ")}`,
      folder: "Geopolitics & Macro",
      tags: ["Intelligence Brief", brief.intent, "Verified Citations"],
      href: `/research?q=${encodeURIComponent(brief.query)}`,
      payload: brief as unknown as Record<string, unknown>,
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2400);
  };

  const handleExportMarkdown = () => {
    const lines = [
      `# ${brief.query}`,
      "",
      `## Bottom Line`,
      brief.bottomLine,
      "",
      `## Key Verified Metrics`,
      ...brief.keyMetrics.map(
        (m) => `- **${m.label}**: ${m.value} (${m.benchmark}) — ${m.everydayMeaning} [${m.sourceId}]`
      ),
      "",
      ...brief.sections.flatMap((sec) => [
        `## ${sec.heading}`,
        sec.summary,
        ...sec.bullets.map((b) => `- ${b.point}`),
        "",
      ]),
      `## Practical Implications & Honest Data Boundaries`,
      `- **What This Means in Practice**: ${brief.practicalTakeaway.whatItMeansInPractice}`,
      `- **Key Trade-Offs & Risks**: ${brief.practicalTakeaway.keyRisksOrTradeOffs}`,
      `- **What the Data Does Not Cover**: ${brief.practicalTakeaway.dataLimitations}`,
      "",
      `## Verified Bibliography`,
      ...brief.sources.map(
        (s) => `- [${s.id}] **${s.title}** — ${s.publisher} (${s.year}) | ${s.url}`
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `omnis-brief-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(brief, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `omnis-brief-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 lg:gap-8 items-start">
        {/* Left Primary Reading Column (max 68ch prose measure) */}
        <div className="min-w-0 space-y-6">
          {/* 1. The Bottom Line Banner (High-Contrast Obsidian with 1px Top Specular Edge) */}
          <section className="relative overflow-hidden rounded-2xl bg-[var(--bg-graphite)] border border-[var(--border-subtle)] p-5 sm:p-7 space-y-4">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/60 to-transparent"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 text-xs font-semibold tone-blue">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>The Bottom Line</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-md badge-tone-verified font-semibold inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {brief.sources.length} Verified {brief.sources.length === 1 ? "Source" : "Sources"}
                </span>
                {brief.diagnostics?.partialOutage ? (
                  <span className="px-2 py-0.5 rounded-md badge-tone-warning font-semibold">
                    Partial Feed Fallback
                  </span>
                ) : null}
              </div>
            </div>

            {brief.diagnostics?.unavailableRequestedMetric ? (
              <div className="p-3 rounded-xl bg-[var(--badge-warning-bg)]/20 border border-[var(--status-warning)]/50 text-xs sm:text-[13px] tone-warning flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Data honesty disclosure: Requested granular metric not available in national multilateral APIs.
                </span>
              </div>
            ) : null}

            <h2 className="omnis-display-section font-extrabold text-[var(--text-primary)] leading-tight break-words">
              {brief.query}
            </h2>

            <p
              className={`max-w-[68ch] text-[var(--text-primary)] leading-[1.7] ${
                typographyStyle === "editorial"
                  ? "text-[17px] sm:text-[18px]"
                  : "text-[15.5px] sm:text-[16.5px]"
              }`}
              style={
                typographyStyle === "editorial"
                  ? { fontFamily: "var(--font-editorial), Georgia, serif" }
                  : undefined
              }
            >
              {renderTextWithCitations(
                brief.bottomLine,
                brief.sources,
                activeSourceId,
                handleInspectSource,
                setActiveSourceId
              )}
            </p>
          </section>

          {/* 2. Key Verified Metrics Grid */}
          {brief.keyMetrics.length > 0 ? (
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {brief.keyMetrics.map((metric, idx) => (
                <div
                  key={`${metric.label}-${idx}`}
                  className="rounded-2xl bg-[var(--bg-graphite)] border border-[var(--border-subtle)] p-4 sm:p-5 space-y-2 min-w-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--text-muted)] leading-snug">
                      {metric.label}
                    </span>
                    {metric.sourceId ? (
                      <button
                        type="button"
                        onClick={() => handleInspectSource(metric.sourceId)}
                        onMouseEnter={() => setActiveSourceId(metric.sourceId)}
                        onMouseLeave={() => setActiveSourceId(null)}
                        className="min-h-[32px] lg:min-h-0 px-2 py-0.5 rounded-md bg-[var(--badge-blue-bg)] border border-[var(--accent-blue)]/40 tone-blue omnis-mono text-[11px] font-bold hover:brightness-110 shrink-0 cursor-pointer"
                      >
                        [{metric.sourceId}]
                      </button>
                    ) : null}
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold omnis-mono omnis-tabular tone-blue break-words">
                    {metric.value}
                  </div>
                  <div className="inline-block px-2 py-0.5 rounded-md bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-[11.5px] font-medium text-[var(--text-secondary)]">
                    {metric.benchmark}
                  </div>
                  <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] leading-relaxed">
                    {metric.everydayMeaning}
                  </p>
                </div>
              ))}
            </section>
          ) : null}

          {/* 3. Interactive Visual Proof */}
          {brief.visualData ? (
            <BriefChartRenderer
              visualData={brief.visualData}
              sources={brief.sources}
              onInspectSource={handleInspectSource}
            />
          ) : null}

          {/* 4. Structured Analytical Sections */}
          {brief.sections.length > 0 ? (
            <div className="space-y-4">
              {brief.sections.map((section) => (
                <section
                  key={section.heading}
                  className="rounded-2xl bg-[var(--bg-graphite)] border border-[var(--border-subtle)] p-5 sm:p-6 space-y-3.5 min-w-0"
                >
                  <div className="space-y-1.5 max-w-[68ch]">
                    <h3 className="text-base sm:text-[17.5px] font-bold text-[var(--text-primary)] leading-snug">
                      {section.heading}
                    </h3>
                    <p className="text-sm sm:text-[15px] text-[var(--text-secondary)] leading-relaxed">
                      {renderTextWithCitations(
                        section.summary,
                        brief.sources,
                        activeSourceId,
                        handleInspectSource,
                        setActiveSourceId
                      )}
                    </p>
                  </div>

                  {section.bullets.length > 0 ? (
                    <ul className="space-y-3 pt-2 border-t border-[var(--border-subtle)] max-w-[68ch]">
                      {section.bullets.map((bullet, bIdx) => (
                        <li
                          key={bIdx}
                          className="text-sm sm:text-[15px] leading-relaxed text-[var(--text-secondary)] pl-3.5 border-l-2 border-[var(--border-strong)] break-words"
                        >
                          {renderBoldLeadBullet(
                            bullet.point,
                            brief.sources,
                            activeSourceId,
                            handleInspectSource,
                            setActiveSourceId
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>
          ) : null}

          {/* 5. Practical Implications & Honest Data Boundaries Card */}
          <section className="rounded-2xl bg-[var(--bg-graphite)] border border-[var(--border-subtle)] overflow-hidden divide-y divide-[var(--border-subtle)] min-w-0">
            <div className="px-5 py-3.5 bg-[var(--bg-slate)]/65 flex items-center gap-2">
              <Info className="w-4 h-4 tone-cyan shrink-0" />
              <h3 className="text-sm sm:text-[15px] font-bold text-[var(--text-primary)]">
                Practical Implications &amp; Honest Data Boundaries
              </h3>
            </div>
            <div className="p-5 space-y-1.5 max-w-[68ch]">
              <div className="text-xs font-bold tone-verified uppercase tracking-wider omnis-mono">
                What This Means in Practice
              </div>
              <p className="text-sm sm:text-[15px] text-[var(--text-secondary)] leading-relaxed">
                {brief.practicalTakeaway.whatItMeansInPractice}
              </p>
            </div>
            <div className="p-5 space-y-1.5 max-w-[68ch]">
              <div className="text-xs font-bold tone-warning uppercase tracking-wider omnis-mono">
                Key Trade-Offs &amp; Risks
              </div>
              <p className="text-sm sm:text-[15px] text-[var(--text-secondary)] leading-relaxed">
                {brief.practicalTakeaway.keyRisksOrTradeOffs}
              </p>
            </div>
            <div className="p-5 space-y-1.5 max-w-[68ch]">
              <div className="text-xs font-bold tone-blue uppercase tracking-wider omnis-mono">
                What the Data Does Not Cover
              </div>
              <p className="text-sm sm:text-[15px] text-[var(--text-secondary)] leading-relaxed">
                {brief.practicalTakeaway.dataLimitations}
              </p>
            </div>
          </section>

          {/* 6. Cross-Module Action Footer & Suggested Follow-Ups */}
          {!hideFooterActions ? (
            <section className="rounded-2xl bg-[var(--bg-graphite)] border border-[var(--border-subtle)] p-5 space-y-5 no-print omnis-no-print">
              {brief.suggestedFollowUps.length > 0 && onSelectFollowUp ? (
                <div className="space-y-2.5">
                  <div className="text-xs font-semibold text-[var(--text-muted)]">
                    Follow-Up Questions
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {brief.suggestedFollowUps.map((fq) => (
                      <button
                        key={fq}
                        type="button"
                        onClick={() => onSelectFollowUp(fq)}
                        className="min-h-[44px] text-left px-3.5 py-2 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-[var(--accent-blue)] text-xs sm:text-[13px] font-medium text-[var(--text-primary)] transition-colors cursor-pointer"
                      >
                        {fq}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/knowledge-graph?q=${encodeURIComponent(brief.query.slice(0, 80))}&topic=${encodeURIComponent(brief.query.slice(0, 48))}`}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--accent-blue-solid)] text-white text-xs sm:text-[13px] font-semibold inline-flex items-center gap-1.5 hover:brightness-110 transition-all"
                  >
                    <Network className="w-3.5 h-3.5 shrink-0" />
                    <span>Explore Entities in Knowledge Graph ↗</span>
                  </Link>
                  <Link
                    href={primaryIso3 ? `/simulations?country=${primaryIso3}` : "/simulations"}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-[var(--accent-blue)] text-xs sm:text-[13px] font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Sliders className="w-3.5 h-3.5 tone-cyan shrink-0" />
                    <span>Stress-Test in What-If Simulations ↗</span>
                  </Link>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveBrief}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-[var(--accent-blue)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {savedToast ? <Check className="w-3.5 h-3.5 tone-verified" /> : <Bookmark className="w-3.5 h-3.5 tone-blue" />}
                    <span>{savedToast ? "Saved to Workspace" : "Save Brief to My Workspace"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportMarkdown}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-xs font-semibold text-[var(--text-secondary)] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>MD</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-[var(--bg-slate)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-xs font-semibold text-[var(--text-secondary)] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    <span>JSON</span>
                  </button>
                </div>
              </div>
            </section>
          ) : null}
        </div>

        {/* Right Sticky Provenance Rail (>= 1024px) */}
        <aside className="hidden lg:block sticky top-20 self-start max-h-[calc(100dvh-6rem)] overflow-y-auto pr-1 space-y-3">
          <div className="rounded-2xl bg-[var(--bg-graphite)] border border-[var(--border-subtle)] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
              <div className="text-sm font-bold text-[var(--text-primary)]">
                Verified Provenance ({brief.sources.length})
              </div>
              {activeSourceId ? (
                <button
                  type="button"
                  onClick={() => setActiveSourceId(null)}
                  className="text-xs omnis-mono tone-blue hover:underline cursor-pointer"
                >
                  Clear
                </button>
              ) : null}
            </div>

            {brief.sources.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                No verified official datasets or peer-reviewed studies matched the requested figure.
              </p>
            ) : (
              <div className="space-y-2.5">
                {brief.sources.map((src) => {
                  const isFocused = activeSourceId === src.id;
                  return (
                    <div
                      id={`brief-rail-${src.id}`}
                      key={src.id}
                      onMouseEnter={() => setActiveSourceId(src.id)}
                      onMouseLeave={() => setActiveSourceId(null)}
                      className={`p-3 rounded-xl border transition-all space-y-1.5 ${
                        isFocused
                          ? "bg-[var(--badge-blue-bg)] border-[var(--accent-blue)] ring-2 ring-[var(--accent-blue)]/40"
                          : "bg-[var(--bg-obsidian)]/55 border-[var(--border-subtle)]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span
                          className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md ${
                            SOURCE_BADGE_MAP[src.sourceType] ?? "badge-tone-blue"
                          }`}
                        >
                          {src.sourceType}
                        </span>
                        <span className="text-[11px] omnis-mono omnis-tabular font-bold tone-cyan">
                          [{src.id}] · {src.year}
                        </span>
                      </div>

                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] font-bold tone-blue hover:underline flex items-start justify-between gap-1.5 leading-snug break-words"
                      >
                        <span className="line-clamp-2">{src.title}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      </a>

                      <div className="text-[11.5px] text-[var(--text-muted)] truncate">
                        {src.publisher}
                      </div>

                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3 break-words">
                        {src.excerptOrIndicator}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile Swipe-Dismissible Bottom Sheet Citation Drawer (< 1024px) */}
      <CitationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpen={() => setDrawerOpen(true)}
        sources={brief.sources}
        activeSourceId={activeSourceId}
        onSelectSource={setActiveSourceId}
      />
    </div>
  );
}
