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
import { OmnisLoader } from "@/components/brand/OmnisLogo";
import { OmnisButton, OmnisModuleHeader } from "@/components/ui/OmnisPrimitives";
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
  "Indian Economy",
  "Clean Energy",
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
      <OmnisModuleHeader
        moduleTag="MODULE 02 • INFINITE SEMANTIC KNOWLEDGE GRAPH"
        title="Connected Concept Discovery & Causal Relationship Engine"
        subtitle="Inspect directed causal relationships across 6 interactive layout engines, drag nodes cleanly, focus 1-hop neighborhoods, and verify citation provenance."
        icon={<Network className="w-3.5 h-3.5" />}
        actions={
          <>
            <OmnisButton onClick={handleSaveGraph}>
              {savedToast ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              <span>{savedToast ? "Saved to Workspace" : "Save Graph"}</span>
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
                placeholder="Enter any concept, technology, country, or phenomenon..."
                className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
              />
            </div>
            <OmnisButton type="submit">Generate Network</OmnisButton>
          </form>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-[var(--text-muted)] omnis-mono uppercase tracking-wider text-[10px]">
              Quick Domains:
            </span>
            {PRESET_TOPICS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setTopicInput(preset);
                  setExpandTargetId(undefined);
                  setActiveTopic(preset);
                }}
                className={`px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
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
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[var(--text-muted)] font-semibold mr-1">Viewing Mode:</span>
            {LAYOUT_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setLayoutMode(m.id)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  layoutMode === m.id
                    ? "bg-[var(--accent-blue-solid)] text-white shadow-xs"
                    : "bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[var(--bg-slate)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]">
              <Filter className="w-3.5 h-3.5 tone-blue" />
              <select
                value={relFilter}
                onChange={(e) => setRelFilter(e.target.value as RelationshipType | "ALL")}
                aria-label="Filter by Relationship Type"
                className="bg-transparent text-xs font-medium text-[var(--text-primary)] focus:outline-none cursor-pointer"
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
              className="px-2.5 py-1 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] w-36 focus:outline-none focus:border-[var(--accent-blue)]"
            />
          </div>
        </div>
      </OmnisModuleHeader>

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
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md badge-tone-blue omnis-mono">
                    {selectedNode.category}
                  </span>
                  <VerificationBadge status={selectedNode.verificationStatus} />
                </div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">{selectedNode.label}</h2>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {selectedNode.summary}
                </p>
              </div>

              {/* Connected Semantic Relationships */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] omnis-mono">
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
                        className="omnis-surface-slate p-2.5 text-xs space-y-1 cursor-pointer hover:border-[var(--border-strong)]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="omnis-mono text-[10px] px-1.5 py-0.5 rounded-md badge-tone-blue font-semibold">
                            {edge.relationshipType}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              edge.isHypothesis ? "badge-tone-violet" : "badge-tone-verified"
                            }`}
                          >
                            {edge.isHypothesis ? "AI Hypothesis" : "Verified"}
                          </span>
                        </div>
                        <div className="font-semibold text-[var(--text-primary)]">
                          → {otherNode?.label ?? otherId}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] leading-snug">
                          {edge.evidence}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Supporting Sources */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] omnis-mono">
                  Supporting Citations
                </div>
                {selectedNode.sources.map((s) => (
                  <a
                    key={s.title}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block omnis-surface-slate p-2.5 text-xs hover:border-[var(--border-strong)]"
                  >
                    <div className="font-semibold tone-blue flex items-center justify-between gap-2">
                      <span className="truncate">{s.title}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      {s.publisher} • {s.year}
                    </div>
                  </a>
                ))}
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
              <span>Expand Node Into +4 Connected Entities</span>
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
              <span>Generate Deep Research Report on Concept</span>
            </OmnisButton>
          </div>
        </div>
      </div>

      <ProvenancePanel provenance={graphData.provenance} compact />
    </div>
  );
}

export default function KnowledgeGraphPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 max-w-7xl mx-auto">
          <OmnisLoader label="Constructing Infinite Semantic Knowledge Graph..." />
        </div>
      }
    >
      <KnowledgeGraphContent />
    </Suspense>
  );
}
