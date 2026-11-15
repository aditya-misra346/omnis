"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { buildInfiniteKnowledgeGraph } from "@/lib/graph/engine";
import { KnowledgeGraphCanvas } from "@/components/graph/KnowledgeGraphCanvas";
import { ProvenancePanel, VerificationBadge } from "@/components/ui/ProvenancePanel";
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

function KnowledgeGraphContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTopic = searchParams.get("topic") || "Artificial Intelligence";

  const [topicInput, setTopicInput] = useState(initialTopic);
  const [activeTopic, setActiveTopic] = useState(initialTopic);
  const [layoutMode, setLayoutMode] = useState<GraphLayoutMode>("force");
  const [relFilter, setRelFilter] = useState<RelationshipType | "ALL">("ALL");
  const [nodeSearch, setNodeSearch] = useState("");
  const [maxNodes, setMaxNodes] = useState(24);
  const [expandTargetId, setExpandTargetId] = useState<string | undefined>(undefined);
  const [savedToast, setSavedToast] = useState(false);

  const { addWorkspaceItem, setActiveContext } = useOmnisStore();

  const graphData: KnowledgeGraphData = useMemo(
    () =>
      buildInfiniteKnowledgeGraph({
        topic: activeTopic,
        maxNodes,
        expandFromNodeId: expandTargetId,
      }),
    [activeTopic, maxNodes, expandTargetId]
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    graphData.nodes[0]?.id ?? "artificial-intelligence"
  );

  useEffect(() => {
    if (graphData.nodes.length > 0 && !graphData.nodes.some((n) => n.id === selectedNodeId)) {
      setSelectedNodeId(graphData.nodes[0].id);
    }
  }, [graphData, selectedNodeId]);

  useEffect(() => {
    setActiveContext("Infinite Knowledge Graph", activeTopic);
  }, [activeTopic, setActiveContext]);

  const selectedNode =
    graphData.nodes.find((n) => n.id === selectedNodeId) ?? graphData.nodes[0];

  const connectedEdges = graphData.edges.filter(
    (e) => e.source === selectedNode?.id || e.target === selectedNode?.id
  );

  const handleGenerateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = topicInput.trim();
    if (!clean) return;
    setExpandTargetId(undefined);
    setActiveTopic(clean);
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Topic Generator */}
      <div className="omnis-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">
              <Network className="w-3.5 h-3.5" />
              <span>MODULE 02 • INFINITE SEMANTIC KNOWLEDGE GRAPH</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">
              Connected Concept Discovery & Causal Relationship Engine
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveGraph}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              {savedToast ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              <span>{savedToast ? "Saved to Workspace" : "Save Graph"}</span>
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="px-3.5 py-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Topic Input & Presets */}
        <form
          onSubmit={handleGenerateTopic}
          className="flex flex-col sm:flex-row gap-2 bg-[var(--bg-slate)] p-2 rounded-xl border border-[var(--border-subtle)]"
        >
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5">
            <Search className="w-4 h-4 text-blue-400 shrink-0" />
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              placeholder="Enter any concept, technology, country, or phenomenon..."
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            Generate Network
          </button>
        </form>

        {/* Layout Modes & Relationship Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[var(--text-muted)] font-medium mr-1">Viewing Mode:</span>
            {LAYOUT_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setLayoutMode(m.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  layoutMode === m.id
                    ? "bg-blue-600 text-white"
                    : "bg-[var(--bg-slate)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[var(--bg-slate)] px-2.5 py-1 rounded-md border border-[var(--border-subtle)]">
              <Filter className="w-3.5 h-3.5 text-blue-400" />
              <select
                value={relFilter}
                onChange={(e) => setRelFilter(e.target.value as RelationshipType | "ALL")}
                aria-label="Filter by Relationship Type"
                className="bg-transparent text-xs focus:outline-none"
              >
                {RELATIONSHIP_TYPES.map((r) => (
                  <option key={r} value={r} className="bg-[var(--bg-graphite)]">
                    Rel: {r}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="text"
              value={nodeSearch}
              onChange={(e) => setNodeSearch(e.target.value)}
              placeholder="Filter nodes..."
              className="px-2.5 py-1 rounded-md bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs w-36 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Main Graph Viewport + Interactive Node Inspector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <KnowledgeGraphCanvas
            nodes={graphData.nodes}
            edges={graphData.edges}
            layoutMode={layoutMode}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onExpandNode={(id) => {
              setMaxNodes((n) => Math.min(60, n + 4));
              setExpandTargetId(id);
            }}
            relationshipFilter={relFilter}
            searchFilter={nodeSearch}
          />
        </div>

        {/* Node Intelligence Inspector Panel */}
        <div className="lg:col-span-4 omnis-card p-5 space-y-4 flex flex-col justify-between">
          {selectedNode ? (
            <div className="space-y-4">
              <div className="space-y-2 pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/15 text-blue-400">
                    {selectedNode.category}
                  </span>
                  <VerificationBadge status={selectedNode.verificationStatus} />
                </div>
                <h2 className="text-lg font-bold">{selectedNode.label}</h2>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {selectedNode.summary}
                </p>
              </div>

              {/* Connected Semantic Relationships */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Semantic Relationships ({connectedEdges.length})
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {connectedEdges.map((edge) => {
                    const otherId =
                      edge.source === selectedNode.id ? edge.target : edge.source;
                    const otherNode = graphData.nodes.find((n) => n.id === otherId);
                    return (
                      <div
                        key={edge.id}
                        onClick={() => setSelectedNodeId(otherId)}
                        className="omnis-surface-slate p-2.5 text-xs space-y-1 cursor-pointer hover:border-blue-500/40"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">
                            {edge.relationshipType}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {edge.isHypothesis ? "AI Hypothesis" : "Verified"}
                          </span>
                        </div>
                        <div className="font-semibold">→ {otherNode?.label ?? otherId}</div>
                        <div className="text-[11px] text-[var(--text-secondary)]">
                          {edge.evidence}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Supporting Sources */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Supporting Citations
                </div>
                {selectedNode.sources.map((s) => (
                  <a
                    key={s.title}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block omnis-surface-slate p-2.5 text-xs hover:border-blue-500/40"
                  >
                    <div className="font-semibold text-blue-400 flex items-center justify-between">
                      <span className="truncate">{s.title}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      {s.publisher} • {s.year}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
            <button
              type="button"
              onClick={() => {
                setMaxNodes((n) => Math.min(60, n + 4));
                setExpandTargetId(selectedNode?.id);
              }}
              className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Expand Node Into +4 Connected Entities</span>
            </button>
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/research?q=${encodeURIComponent(
                    `Deep analysis of ${selectedNode?.label ?? activeTopic}`
                  )}`
                )
              }
              className="w-full py-2 px-3 rounded-lg bg-[var(--bg-slate)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <FileSearch className="w-3.5 h-3.5 text-blue-400" />
              <span>Generate Deep Research Report on Concept</span>
            </button>
          </div>
        </div>
      </div>

      <ProvenancePanel provenance={graphData.provenance} compact />
    </div>
  );
}

export default function KnowledgeGraphPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm">Loading Infinite Knowledge Graph...</div>}>
      <KnowledgeGraphContent />
    </Suspense>
  );
}
