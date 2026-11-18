"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Network,
  Search,
  PlusCircle,
  Bookmark,
  Check,
  Download,
  FileSearch,
  ExternalLink,
  Filter,
  GitBranch,
  ChevronUp,
  X,
} from "lucide-react";
import {
  buildInfiniteKnowledgeGraph,
  findShortestCausalPath,
} from "@/lib/graph/engine";
import {
  formatRelationshipLabel,
  formatRelationshipSentence,
} from "@/lib/formatters";
import { fetchOpenAlexSources, fetchWikimediaSummary } from "@/lib/providers/live-data";
import { KnowledgeGraphCanvas } from "@/components/graph/KnowledgeGraphCanvas";
import { ProvenancePanel, VerificationBadge } from "@/components/ui/ProvenancePanel";
import { OmnisLoader } from "@/components/brand/OmnisLogo";
import {
  OmnisButton,
  OmnisMobileBottomSheet,
  OmnisModuleHeader,
  OmnisSegmentedControl,
  OmnisSkeleton,
} from "@/components/ui/OmnisPrimitives";
import { OmnisSelect } from "@/components/ui/OmnisSelect";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import type {
  GraphLayoutMode,
  KnowledgeGraphData,
  RelationshipType,
} from "@/types/omnis";

const LAYOUT_MODES: { id: GraphLayoutMode; label: string }[] = [
  { id: "force", label: "Force-Directed" },
  { id: "radial", label: "Radial" },
  { id: "hierarchical", label: "Hierarchical" },
  { id: "circular", label: "Circular" },
  { id: "tree", label: "Tree" },
  { id: "clustered", label: "Clustered" },
];

const RELATIONSHIP_TYPES: (RelationshipType | "ALL")[] = [
  "ALL",
  "DEPENDS_ON",
  "CAUSES",
  "INFLUENCES",
  "REGULATES",
  "COMPETES_WITH",
  "PART_OF",
  "SUPPORTS",
  "DEVELOPED_BY",
  "HISTORICALLY_PRECEDED",
];

const PRESET_TOPICS = [
  "Artificial Intelligence",
  "Semiconductors",
  "Clean Energy",
  "Climate Carbon Cycle",
  "Digital Public Infrastructure",
  "Indian Economy",
];

function KnowledgeGraphContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlTopicParam = searchParams.get("topic")?.trim() || "";
  const urlFocusParam = searchParams.get("focus")?.trim() || "";
  const initialTopic = urlTopicParam || "Artificial Intelligence";

  const [topicInput, setTopicInput] = useState(initialTopic);
  const [activeTopic, setActiveTopic] = useState(initialTopic);
  const [layoutMode, setLayoutMode] = useState<GraphLayoutMode>("force");
  const [relFilter, setRelFilter] = useState<RelationshipType | "ALL">("ALL");
  const [nodeSearch, setNodeSearch] = useState("");
  const [maxNodes, setMaxNodes] = useState(12);
  const userSetDensityRef = useRef(false);
  const [expandTargetId, setExpandTargetId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640 && !userSetDensityRef.current) {
      setMaxNodes(8);
    }
  }, []);
  const [savedToast, setSavedToast] = useState(false);
  const [liveGraphFetch, setLiveGraphFetch] = useState<{
    topic: string;
    works: import("@/types/omnis").ResearchSourceItem[];
    wiki: { title: string; extract: string; url: string } | null;
    state: "verified" | "offline-fallback";
  } | null>(null);
  const liveWorks = useMemo(
    () => (liveGraphFetch?.topic === activeTopic ? liveGraphFetch.works : []),
    [liveGraphFetch, activeTopic]
  );
  const wikiSummary = useMemo(
    () => (liveGraphFetch?.topic === activeTopic ? liveGraphFetch.wiki : null),
    [liveGraphFetch, activeTopic]
  );
  const liveFetchState: "loading" | "verified" | "offline-fallback" =
    liveGraphFetch?.topic === activeTopic ? liveGraphFetch.state : "loading";

  const [prevUrlTopicParam, setPrevUrlTopicParam] = useState(urlTopicParam);
  if (urlTopicParam !== prevUrlTopicParam) {
    setPrevUrlTopicParam(urlTopicParam);
    if (urlTopicParam) {
      setTopicInput(urlTopicParam);
      setExpandTargetId(undefined);
      setActiveTopic(urlTopicParam);
    }
  }
  const [pathTargetId, setPathTargetId] = useState<string>("");
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const filterInputRef = useRef<HTMLInputElement | null>(null);

  const {
    addWorkspaceItem,
    setActiveContext,
    focusedSignal,
    setFocusedSignal,
    clearFocusedSignal,
  } = useOmnisStore();
  const lastAppliedUrlFocusRef = useRef<string | null>(null);
  const activeFocusedSignal = focusedSignal;

  useEffect(() => {
    if (!urlFocusParam) {
      lastAppliedUrlFocusRef.current = null;
      return;
    }
    if (lastAppliedUrlFocusRef.current !== urlFocusParam) {
      lastAppliedUrlFocusRef.current = urlFocusParam;
      setFocusedSignal({
        topic: urlFocusParam,
        label: urlFocusParam,
        source: "url",
        updatedAt: Date.now(),
      });
    }
  }, [urlFocusParam, setFocusedSignal]);

  useEffect(() => {
    let cancelled = false;
    const targetTopic = activeTopic;
    Promise.all([
      fetchOpenAlexSources(targetTopic, 5),
      fetchWikimediaSummary(targetTopic),
    ])
      .then(([works, wiki]) => {
        if (cancelled) return;
        setLiveGraphFetch({
          topic: targetTopic,
          works,
          wiki,
          state: works.length > 0 || Boolean(wiki) ? "verified" : "offline-fallback",
        });
      })
      .catch(() => {
        if (!cancelled) {
          setLiveGraphFetch({
            topic: targetTopic,
            works: [],
            wiki: null,
            state: "offline-fallback",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeTopic]);

  const graphData: KnowledgeGraphData = useMemo(
    () =>
      buildInfiniteKnowledgeGraph({
        topic: activeTopic,
        maxNodes,
        expandFromNodeId: expandTargetId,
        openAlexWorks: liveWorks,
        wikiSummary,
      }),
    [activeTopic, maxNodes, expandTargetId, liveWorks, wikiSummary]
  );

  const [rawSelectedNodeId, setSelectedNodeId] = useState<string>(
    graphData.nodes[0]?.id ?? "artificial-intelligence"
  );
  const selectedNodeId =
    graphData.nodes.length > 0 && !graphData.nodes.some((n) => n.id === rawSelectedNodeId)
      ? graphData.nodes[0].id
      : rawSelectedNodeId;

  useEffect(() => {
    setActiveContext("Infinite Knowledge Graph", activeTopic);
  }, [activeTopic, setActiveContext]);

  const selectedNode =
    graphData.nodes.find((n) => n.id === selectedNodeId) ?? graphData.nodes[0];

  const connectedEdges = graphData.edges.filter(
    (e) => e.source === selectedNode?.id || e.target === selectedNode?.id
  );

  const causalPath = useMemo(() => {
    if (!pathTargetId || !selectedNode || pathTargetId === selectedNode.id) {
      return null;
    }
    return findShortestCausalPath(graphData.edges, selectedNode.id, pathTargetId);
  }, [graphData.edges, selectedNode, pathTargetId]);

  const highlightedPathNodeIds = useMemo(
    () => (causalPath?.reachable ? new Set(causalPath.nodeIds) : undefined),
    [causalPath]
  );

  const highlightedPathEdgeIds = useMemo(
    () => (causalPath?.reachable ? new Set(causalPath.edgeIds) : undefined),
    [causalPath]
  );

  const selectGraphTopic = (nextTopic: string) => {
    const clean = nextTopic.trim();
    if (!clean) return;
    setTopicInput(clean);
    setExpandTargetId(undefined);
    setActiveTopic(clean);
    const params = new URLSearchParams(searchParams.toString());
    params.set("topic", clean);
    router.replace(`/knowledge-graph?${params.toString()}`, {
      scroll: false,
    });
  };

  const handleGenerateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    selectGraphTopic(topicInput);
  };

  const handleSaveGraph = () => {
    addWorkspaceItem({
      type: "graph",
      title: `Knowledge Graph: ${activeTopic}`,
      subtitle: `${graphData.nodes.length} Nodes • ${graphData.edges.length} Typed Edges • Layout: ${layoutMode}`,
      folder: "Technology & Compute",
      tags: [activeTopic, "Knowledge Graph", layoutMode],
      href: `/knowledge-graph?topic=${encodeURIComponent(activeTopic)}`,
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(graphData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `omnis-graph-${activeTopic.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 pb-24 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Topic Generator */}
      <OmnisModuleHeader
        moduleTag="Topic Map"
        title="Connected Ideas & Cause-and-Effect Explorer"
        subtitle="See how technologies, policies, and economies connect across 6 interactive views, drag topics around, and check sources."
        icon={<Network className="w-3.5 h-3.5" />}
        actions={
          <>
            <OmnisButton onClick={handleSaveGraph}>
              {savedToast ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              <span>{savedToast ? "Saved to Workspace" : "Save Map"}</span>
            </OmnisButton>
            <OmnisButton variant="secondary" onClick={handleExportJson}>
              <Download className="w-3.5 h-3.5 tone-blue" />
              <span>Export JSON</span>
            </OmnisButton>
          </>
        }
      >
        {/* Topic Input & Presets */}
        <div className="space-y-2.5 pt-1">
          <form
            onSubmit={handleGenerateTopic}
            className="flex flex-col sm:flex-row gap-2 bg-[var(--bg-slate)] p-2 rounded-xl border border-[var(--border-subtle)]"
          >
            <div className="flex-1 flex items-center gap-2 px-3 py-1.5">
              <Search className="w-4 h-4 tone-blue shrink-0" />
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="Enter any concept, technology, country, or topic..."
                className="w-full bg-transparent text-base md:text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
              />
            </div>
            <OmnisButton type="submit">Build Map</OmnisButton>
          </form>

          <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
            <span className="text-[var(--text-muted)] text-xs font-medium">
              Popular topics:
            </span>
            {PRESET_TOPICS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => selectGraphTopic(preset)}
                className={`min-h-[44px] sm:min-h-0 px-3 sm:px-2.5 py-2 sm:py-1 rounded-full border transition-colors cursor-pointer ${
                  activeTopic.toLowerCase() === preset.toLowerCase()
                    ? "badge-tone-blue font-semibold"
                    : "bg-[var(--bg-slate)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Layout Modes & Relationship Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-[13px] sm:text-sm">
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto max-w-full">
            <span className="text-[var(--text-muted)] font-semibold shrink-0">Layout:</span>
            <OmnisSegmentedControl
              groupId="kg-layout-mode"
              ariaLabel="Knowledge Graph Layout Engine"
              size="sm"
              value={layoutMode}
              onChange={(val) => setLayoutMode(val as GraphLayoutMode)}
              options={LAYOUT_MODES.map((m) => ({
                value: m.id,
                label: m.label,
              }))}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <OmnisSegmentedControl<"8" | "16" | "28">
              groupId="kg-density-tier"
              ariaLabel="Map detail level"
              size="sm"
              value={maxNodes <= 10 ? "8" : maxNodes <= 20 ? "16" : "28"}
              onChange={(val) => {
                userSetDensityRef.current = true;
                setMaxNodes(Number(val));
              }}
              options={[
                { value: "8", label: "Core (8)" },
                { value: "16", label: "Standard (16)" },
                { value: "28", label: "Expanded (28)" },
              ]}
            />
            <OmnisSelect
              value={relFilter}
              onChange={(val) => setRelFilter(val as RelationshipType | "ALL")}
              ariaLabel="Filter by Relationship Type"
              leadingIcon={<Filter className="w-3.5 h-3.5 tone-blue" />}
              options={RELATIONSHIP_TYPES.map((r) => ({
                value: r,
                label: r === "ALL" ? "Link: All types" : `Link: ${formatRelationshipLabel(r)}`,
              }))}
            />

            <input
              ref={filterInputRef}
              type="text"
              value={nodeSearch}
              onChange={(e) => setNodeSearch(e.target.value)}
              placeholder="Filter nodes... (/)"
              className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-base md:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] w-44 sm:w-40 focus:outline-none focus:border-[var(--accent-blue)]"
            />
          </div>
        </div>
      </OmnisModuleHeader>

      {/* Live Epistemic Ingestion Status Banner */}
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        {liveFetchState === "loading" ? (
          <div className="flex-1 min-w-[240px] flex items-center gap-3 px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-graphite)]">
            <OmnisSkeleton className="h-3.5 w-36 rounded-md" />
            <span className="text-[var(--text-muted)] text-xs">
              Finding related OpenAlex studies &amp; topics for &ldquo;{activeTopic}&rdquo;…
            </span>
          </div>
        ) : (
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              liveFetchState === "verified" ? "badge-tone-verified" : "badge-tone-warning"
            }`}
          >
            {liveFetchState === "verified"
              ? `Live sources verified (${liveWorks.length} academic works)`
              : "Built-in topic map loaded"}
          </span>
        )}
        {activeFocusedSignal ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold omnis-mono badge-tone-warning">
            <span>Synced Focus: {activeFocusedSignal.label ?? activeFocusedSignal.topic}</span>
            {urlFocusParam &&
            activeFocusedSignal.topic.toLowerCase() !== urlFocusParam.toLowerCase() ? (
              <button
                type="button"
                onClick={() =>
                  setFocusedSignal({
                    topic: urlFocusParam,
                    label: urlFocusParam,
                    source: "url",
                    updatedAt: Date.now(),
                  })
                }
                className="underline text-[11px] px-1 cursor-pointer hover:opacity-80"
              >
                Reset Focus
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Clear synced spatial focus"
              onClick={() => {
                clearFocusedSignal();
                const nextParams = new URLSearchParams(searchParams.toString());
                if (nextParams.has("focus")) {
                  nextParams.delete("focus");
                  const qs = nextParams.toString();
                  router.replace(qs ? `/knowledge-graph?${qs}` : "/knowledge-graph", {
                    scroll: false,
                  });
                }
              }}
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-[24px] sm:min-w-[24px] -my-2 -mr-2 sm:my-0 sm:mr-0 rounded-full hover:opacity-75 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ) : null}
      </div>

      {/* Main Graph Viewport + Interactive Node Inspector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-16 lg:pb-0">
        <div className="lg:col-span-8 min-w-0">
          <KnowledgeGraphCanvas
            nodes={graphData.nodes}
            edges={graphData.edges}
            layoutMode={layoutMode}
            selectedNodeId={selectedNodeId}
            onSelectNode={(id) => {
              setSelectedNodeId(id);
              if (pathTargetId === id) setPathTargetId("");
              const clickedNode = graphData.nodes.find((n) => n.id === id);
              if (clickedNode) {
                setFocusedSignal({
                  iso3: activeFocusedSignal?.iso3,
                  topic: clickedNode.label,
                  label: clickedNode.label,
                });
              }
            }}
            onExpandNode={(id) => {
              setMaxNodes((n) => Math.min(60, n + 4));
              setExpandTargetId(id);
            }}
            onFocusFilter={() => filterInputRef.current?.focus()}
            relationshipFilter={relFilter}
            searchFilter={nodeSearch}
            highlightedPathNodeIds={highlightedPathNodeIds}
            highlightedPathEdgeIds={highlightedPathEdgeIds}
            focusedSignal={activeFocusedSignal}
          />
        </div>

        {/* Desktop Node Intelligence Inspector Panel */}
        <div
          id="inspector-panel"
          className="lg:col-span-4 min-w-0 omnis-card p-5 space-y-4 flex flex-col justify-between"
        >
          {selectedNode ? (
            <div className="space-y-4">
              <div className="space-y-2 pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md badge-tone-blue">
                    {selectedNode.category}
                  </span>
                  <VerificationBadge status={selectedNode.verificationStatus} />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">{selectedNode.label}</h2>
                <p className="text-[14.5px] sm:text-[15px] text-[var(--text-secondary)] leading-relaxed">
                  {selectedNode.summary}
                </p>
              </div>

              {/* Shortest-Path Connection Finder */}
              <div className="space-y-2 border-y border-[var(--border-subtle)] py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold tone-cyan inline-flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>See how two concepts connect</span>
                  </span>
                  {causalPath?.reachable ? (
                    <span className="text-[11.5px] font-bold omnis-tabular px-1.5 py-0.5 rounded badge-tone-cyan">
                      {causalPath.hops} {causalPath.hops === 1 ? "step" : "steps"}
                    </span>
                  ) : null}
                </div>
                <OmnisSelect
                  value={pathTargetId}
                  onChange={setPathTargetId}
                  ariaLabel="Trace Causal Path Target Node"
                  options={[
                    { value: "", label: "Pick another topic to connect…" },
                    ...graphData.nodes
                      .filter((n) => n.id !== selectedNode.id)
                      .map((n) => ({
                        value: n.id,
                        label: n.label,
                        hint: n.category,
                      })),
                  ]}
                />
                {causalPath ? (
                  causalPath.reachable ? (
                    <div className="flex flex-wrap items-center gap-1 pt-1 text-xs">
                      {causalPath.nodeIds.map((nid, idx) => {
                        const node = graphData.nodes.find((x) => x.id === nid);
                        return (
                          <React.Fragment key={nid}>
                            <button
                              type="button"
                              onClick={() => setSelectedNodeId(nid)}
                              className="px-1.5 py-0.5 rounded bg-[var(--bg-graphite)] border border-[var(--accent-cyan)]/40 text-[var(--text-primary)] hover:border-[var(--accent-cyan)] cursor-pointer text-left truncate max-w-[140px]"
                            >
                              {node?.label ?? nid}
                            </button>
                            {idx < causalPath.nodeIds.length - 1 ? (
                              <span className="tone-cyan">→</span>
                            ) : null}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-[var(--text-muted)]">
                      No direct path found yet. Try expanding more topics below.
                    </div>
                  )
                ) : null}
              </div>

              {/* Direct Connections */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[var(--text-muted)]">
                  Direct Connections ({connectedEdges.length})
                </div>
                <div className="divide-y divide-[var(--border-subtle)] max-h-52 overflow-y-auto pr-1 border-y border-[var(--border-subtle)]">
                  {connectedEdges.map((edge) => {
                    const otherId =
                      edge.source === selectedNode.id ? edge.target : edge.source;
                    const srcNode = graphData.nodes.find((n) => n.id === edge.source);
                    const tgtNode = graphData.nodes.find((n) => n.id === edge.target);
                    const otherNode = graphData.nodes.find((n) => n.id === otherId);
                    const sentence = formatRelationshipSentence(
                      srcNode?.label ?? edge.source,
                      edge.relationshipType,
                      tgtNode?.label ?? edge.target
                    );
                    return (
                      <button
                        key={edge.id}
                        type="button"
                        title={sentence}
                        onClick={() => setSelectedNodeId(otherId)}
                        className="w-full text-left py-2.5 px-1 text-[13.5px] space-y-1 cursor-pointer hover:bg-[var(--bg-slate)]/60 transition-colors rounded-md focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] px-2 py-0.5 rounded-md badge-tone-blue font-semibold">
                            {formatRelationshipLabel(edge.relationshipType)}
                          </span>
                          <span
                            className={`text-[11px] font-semibold inline-flex items-center gap-1 ${
                              edge.isHypothesis ? "tone-violet" : "tone-verified"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                edge.isHypothesis
                                  ? "bg-[var(--accent-violet)]"
                                  : "bg-[var(--status-verified)]"
                              }`}
                            />
                            {edge.isHypothesis ? "Unconfirmed Scenario" : "Verified"}
                          </span>
                        </div>
                        <div className="font-semibold text-[var(--text-primary)]">
                          {sentence}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          Open → {otherNode?.label ?? otherId}
                        </div>
                        <div className="text-[13px] text-[var(--text-secondary)] leading-snug">
                          {edge.evidence}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Supporting Sources */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-[var(--text-muted)]">
                  Sources
                </div>
                <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                  {selectedNode.sources.map((s) => (
                    <a
                      key={s.title}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block py-2 text-[13.5px] hover:bg-[var(--bg-slate)]/50 transition-colors"
                    >
                      <div className="font-semibold tone-blue flex items-center justify-between gap-2">
                        <span className="truncate">{s.title}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">
                        {s.publisher} • {s.year}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
            <OmnisButton
              onClick={() => {
                setMaxNodes((n) => Math.min(60, n + 4));
                setExpandTargetId(selectedNode?.id);
              }}
              className="w-full"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Show 4 more connected topics</span>
            </OmnisButton>
            <OmnisButton
              variant="secondary"
              onClick={() =>
                router.push(
                  `/research?q=${encodeURIComponent(
                    `Deep analysis of ${selectedNode?.label ?? activeTopic}`
                  )}`
                )
              }
              className="w-full"
            >
              <FileSearch className="w-3.5 h-3.5 tone-blue" />
              <span>Read Full Research Report</span>
            </OmnisButton>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Inspector Pill (< 1024px) */}
      {selectedNode ? (
        <div className="lg:hidden fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-30">
          <button
            type="button"
            onClick={() => setMobileInspectorOpen(true)}
            className="w-full omnis-hud-pill rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-left text-[13px] cursor-pointer"
          >
            <div className="min-w-0">
              <div className="text-xs font-semibold tone-blue">
                Selected Topic
              </div>
              <div className="font-bold text-[var(--text-primary)] truncate">
                {selectedNode.label}
              </div>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--accent-blue-solid)] text-white font-semibold">
              <span>Open Inspector</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>
      ) : null}

      {/* Mobile Inspector Slide-Up Sheet */}
      <OmnisMobileBottomSheet
        open={Boolean(mobileInspectorOpen && selectedNode)}
        onClose={() => setMobileInspectorOpen(false)}
        eyebrow={selectedNode?.category}
        title={selectedNode?.label ?? "Node Inspector"}
        closeAriaLabel="Close Node Inspector"
      >
        {selectedNode ? (
          <>
            <p className="text-[14.5px] text-[var(--text-secondary)] leading-relaxed">
              {selectedNode.summary}
            </p>
            <div className="space-y-1.5">
              <div className="text-xs font-semibold tone-cyan">
                See how two concepts connect {causalPath?.reachable ? `(${causalPath.hops} steps)` : ""}
              </div>
              <OmnisSelect
                value={pathTargetId}
                onChange={setPathTargetId}
                ariaLabel="Mobile Trace Causal Path Target"
                options={[
                  { value: "", label: "Pick another topic to connect…" },
                  ...graphData.nodes
                    .filter((n) => n.id !== selectedNode.id)
                    .map((n) => ({ value: n.id, label: n.label, hint: n.category })),
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-[var(--text-muted)]">
                Direct Connections ({connectedEdges.length})
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {connectedEdges.map((edge) => {
                  const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
                  const srcNode = graphData.nodes.find((n) => n.id === edge.source);
                  const tgtNode = graphData.nodes.find((n) => n.id === edge.target);
                  const sentence = formatRelationshipSentence(
                    srcNode?.label ?? edge.source,
                    edge.relationshipType,
                    tgtNode?.label ?? edge.target
                  );
                  return (
                    <button
                      key={edge.id}
                      type="button"
                      onClick={() => setSelectedNodeId(otherId)}
                      className="w-full text-left py-2 text-[13.5px] space-y-0.5 cursor-pointer"
                    >
                      <div className="font-semibold text-[var(--text-primary)]">
                        <span className="text-xs px-1.5 py-0.5 rounded badge-tone-blue mr-1.5">
                          {formatRelationshipLabel(edge.relationshipType)}
                        </span>
                        {sentence}
                      </div>
                      <div className="text-[13px] text-[var(--text-secondary)]">{edge.evidence}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <OmnisButton
                onClick={() => {
                  setMaxNodes((n) => Math.min(60, n + 4));
                  setExpandTargetId(selectedNode.id);
                  setMobileInspectorOpen(false);
                }}
                className="flex-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Expand (+4)</span>
              </OmnisButton>
              <OmnisButton
                variant="secondary"
                onClick={() =>
                  router.push(
                    `/research?q=${encodeURIComponent(
                      `Deep analysis of ${selectedNode.label}`
                    )}`
                  )
                }
                className="flex-1"
              >
                <FileSearch className="w-3.5 h-3.5 tone-blue" />
                <span>Research</span>
              </OmnisButton>
            </div>
          </>
        ) : null}
      </OmnisMobileBottomSheet>

      <ProvenancePanel provenance={graphData.provenance} compact />
    </div>
  );
}

export default function KnowledgeGraphPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 max-w-7xl mx-auto">
          <OmnisLoader label="Loading topic map…" />
        </div>
      }
    >
      <KnowledgeGraphContent />
    </Suspense>
  );
}
