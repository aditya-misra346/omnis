"use client";

import React, { useMemo, useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Download,
  PlusCircle,
} from "lucide-react";
import type {
  GraphLayoutMode,
  KnowledgeGraphEdge,
  KnowledgeGraphNode,
  RelationshipType,
} from "@/types/omnis";

const CATEGORY_COLORS: Record<string, string> = {
  "Core Concept": "#3b82f6",
  Technology: "#06b6d4",
  Economics: "#10b981",
  Geopolitics: "#f59e0b",
  Science: "#8b5cf6",
  Energy: "#eab308",
  Environment: "#22c55e",
  History: "#ec4899",
  Institution: "#6366f1",
  "Scenario Hypothesis": "#a855f7",
};

interface PositionedNode extends KnowledgeGraphNode {
  x: number;
  y: number;
}

function computeLayoutPositions(
  nodes: KnowledgeGraphNode[],
  edges: KnowledgeGraphEdge[],
  mode: GraphLayoutMode,
  width = 920,
  height = 560
): PositionedNode[] {
  const cx = width / 2;
  const cy = height / 2;
  const count = nodes.length;
  if (count === 0) return [];

  if (mode === "circular") {
    const r = Math.min(width, height) * 0.36;
    return nodes.map((n, idx) => {
      const angle = (2 * Math.PI * idx) / count - Math.PI / 2;
      return {
        ...n,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    });
  }

  if (mode === "radial") {
    return nodes.map((n, idx) => {
      if (idx === 0) return { ...n, x: cx, y: cy };
      const ring = idx <= 6 ? 1 : 2;
      const radius = ring === 1 ? 155 : 235;
      const ringNodes = ring === 1 ? Math.min(6, count - 1) : Math.max(1, count - 7);
      const localIdx = ring === 1 ? idx - 1 : idx - 7;
      const angle = (2 * Math.PI * localIdx) / ringNodes - Math.PI / 4;
      return {
        ...n,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });
  }

  if (mode === "hierarchical" || mode === "tree") {
    const levels: KnowledgeGraphNode[][] = [[], [], []];
    nodes.forEach((n, idx) => {
      if (idx === 0) levels[0].push(n);
      else if (n.verificationStatus === "ai_hypothesis" || idx > 6) levels[2].push(n);
      else levels[1].push(n);
    });
    const out: PositionedNode[] = [];
    levels.forEach((lvlNodes, lvlIdx) => {
      const y = 95 + lvlIdx * 185;
      const span = width - 160;
      lvlNodes.forEach((n, i) => {
        const x =
          lvlNodes.length === 1
            ? cx
            : 80 + (span * i) / Math.max(1, lvlNodes.length - 1);
        out.push({ ...n, x, y });
      });
    });
    return out;
  }

  if (mode === "clustered") {
    const categories = Array.from(new Set(nodes.map((n) => n.category)));
    return nodes.map((n, idx) => {
      const catIdx = categories.indexOf(n.category);
      const clusterAngle = (2 * Math.PI * catIdx) / Math.max(1, categories.length);
      const clusterCx = cx + (catIdx === 0 ? 0 : 175 * Math.cos(clusterAngle));
      const clusterCy = cy + (catIdx === 0 ? 0 : 145 * Math.sin(clusterAngle));
      const jitterAngle = idx * 1.9;
      const jitterR = idx === 0 ? 0 : 48;
      return {
        ...n,
        x: clusterCx + jitterR * Math.cos(jitterAngle),
        y: clusterCy + jitterR * Math.sin(jitterAngle),
      };
    });
  }

  // Deterministic Force-Directed layout relaxation
  const pos = nodes.map((n, idx) => {
    if (idx === 0) return { ...n, x: cx, y: cy };
    const angle = (2 * Math.PI * (idx - 1)) / Math.max(1, count - 1);
    const dist = 165 + ((idx * 37) % 65);
    return {
      ...n,
      x: cx + dist * Math.cos(angle),
      y: cy + dist * Math.sin(angle),
    };
  });

  const idToIdx = new Map(pos.map((p, i) => [p.id, i]));
  for (let iter = 0; iter < 35; iter++) {
    for (let i = 1; i < pos.length; i++) {
      let fx = 0;
      let fy = 0;
      for (let j = 0; j < pos.length; j++) {
        if (i === j) continue;
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        const distSq = Math.max(400, dx * dx + dy * dy);
        const rep = 3800 / distSq;
        fx += (dx / Math.sqrt(distSq)) * rep;
        fy += (dy / Math.sqrt(distSq)) * rep;
      }
      for (const e of edges) {
        const sIdx = idToIdx.get(e.source);
        const tIdx = idToIdx.get(e.target);
        if (sIdx === i && tIdx !== undefined) {
          fx += (pos[tIdx].x - pos[i].x) * 0.04;
          fy += (pos[tIdx].y - pos[i].y) * 0.04;
        } else if (tIdx === i && sIdx !== undefined) {
          fx += (pos[sIdx].x - pos[i].x) * 0.04;
          fy += (pos[sIdx].y - pos[i].y) * 0.04;
        }
      }
      pos[i].x = Math.max(70, Math.min(width - 70, pos[i].x + fx * 0.25));
      pos[i].y = Math.max(60, Math.min(height - 60, pos[i].y + fy * 0.25));
    }
  }

  return pos;
}

export function KnowledgeGraphCanvas({
  nodes,
  edges,
  layoutMode,
  selectedNodeId,
  onSelectNode,
  onExpandNode,
  relationshipFilter = "ALL",
  searchFilter = "",
}: {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  layoutMode: GraphLayoutMode;
  selectedNodeId: string;
  onSelectNode: (id: string) => void;
  onExpandNode?: (id: string) => void;
  relationshipFilter?: RelationshipType | "ALL";
  searchFilter?: string;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [draggedOffsets, setDraggedOffsets] = useState<Record<string, { dx: number; dy: number }>>(
    {}
  );
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const basePositions = useMemo(
    () => computeLayoutPositions(nodes, edges, layoutMode),
    [nodes, edges, layoutMode]
  );

  const positionedNodes = useMemo(
    () =>
      basePositions.map((n) => {
        const off = draggedOffsets[n.id];
        return off ? { ...n, x: n.x + off.dx, y: n.y + off.dy } : n;
      }),
    [basePositions, draggedOffsets]
  );

  const nodeById = useMemo(
    () => new Map(positionedNodes.map((n) => [n.id, n])),
    [positionedNodes]
  );

  const filteredEdges = useMemo(
    () =>
      edges.filter(
        (e) =>
          (relationshipFilter === "ALL" || e.relationshipType === relationshipFilter) &&
          nodeById.has(e.source) &&
          nodeById.has(e.target)
      ),
    [edges, relationshipFilter, nodeById]
  );

  const handleExportSvg = () => {
    const svgElement = document.getElementById("omnis-knowledge-graph-svg");
    if (!svgElement) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgElement);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `omnis-knowledge-graph-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`${
        isFullscreen
          ? "fixed inset-4 z-50 bg-[var(--bg-obsidian)]"
          : "relative w-full h-[540px]"
      } omnis-card overflow-hidden flex flex-col`}
    >
      {/* Top Graph Controls Bar */}
      <div className="px-3.5 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-slate)] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-[var(--text-primary)]">
            Layout: <span className="uppercase text-blue-400">{layoutMode}</span>
          </span>
          <span className="text-[var(--text-muted)] omnis-mono">
            {positionedNodes.length} Nodes • {filteredEdges.length} Relationships
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.15).toFixed(2))))}
            title="Zoom In"
            className="p-1.5 rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-graphite)]"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.55, Number((z - 0.15).toFixed(2))))}
            title="Zoom Out"
            className="p-1.5 rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-graphite)]"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
              setDraggedOffsets({});
            }}
            title="Reset Graph Positions & Zoom"
            className="p-1.5 rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-graphite)]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleExportSvg}
            title="Export Knowledge Graph as SVG"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-graphite)]"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>SVG</span>
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen((f) => !f)}
            title="Toggle Fullscreen Graph Exploration"
            className="p-1.5 rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-graphite)]"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <div
        className="flex-1 relative omnis-grid-bg overflow-hidden"
        onPointerMove={(e) => {
          if (!draggingNodeId) return;
          const dx = (e.clientX - dragStart.x) / zoom;
          const dy = (e.clientY - dragStart.y) / zoom;
          setDraggedOffsets((prev) => ({
            ...prev,
            [draggingNodeId]: {
              dx: (prev[draggingNodeId]?.dx ?? 0) + dx,
              dy: (prev[draggingNodeId]?.dy ?? 0) + dy,
            },
          }));
          setDragStart({ x: e.clientX, y: e.clientY });
        }}
        onPointerUp={() => setDraggingNodeId(null)}
      >
        <svg
          id="omnis-knowledge-graph-svg"
          viewBox="0 0 920 560"
          className="w-full h-full select-none"
        >
          <defs>
            <marker
              id="arrow-verified"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#3b82f6" />
            </marker>
            <marker
              id="arrow-hypothesis"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#a855f7" />
            </marker>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Directed Semantic Edges */}
            {filteredEdges.map((edge) => {
              const src = nodeById.get(edge.source);
              const tgt = nodeById.get(edge.target);
              if (!src || !tgt) return null;
              const mx = (src.x + tgt.x) / 2;
              const my = (src.y + tgt.y) / 2;

              return (
                <g key={edge.id}>
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={edge.isHypothesis ? "#a855f7" : "#3b82f6"}
                    strokeWidth={edge.isHypothesis ? 1.5 : 2}
                    strokeDasharray={edge.isHypothesis ? "5,4" : undefined}
                    strokeOpacity={0.65}
                    markerEnd={
                      edge.isHypothesis ? "url(#arrow-hypothesis)" : "url(#arrow-verified)"
                    }
                  />
                  <rect
                    x={mx - 42}
                    y={my - 9}
                    width={84}
                    height={16}
                    rx={4}
                    fill="#0c1018"
                    stroke="rgba(148,163,184,0.25)"
                  />
                  <text
                    x={mx}
                    y={my + 2}
                    textAnchor="middle"
                    fill={edge.isHypothesis ? "#c084fc" : "#93c5fd"}
                    fontSize="8.5"
                    fontFamily="monospace"
                  >
                    {edge.relationshipType}
                  </text>
                </g>
              );
            })}

            {/* Interactive Entity Nodes */}
            {positionedNodes.map((node, idx) => {
              const isSelected = node.id === selectedNodeId;
              const matchesSearch =
                !searchFilter.trim() ||
                node.label.toLowerCase().includes(searchFilter.toLowerCase());
              const color = CATEGORY_COLORS[node.category] ?? "#3b82f6";
              const radius = idx === 0 ? 24 : isSelected ? 20 : 16;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  opacity={matchesSearch ? 1 : 0.25}
                  className="cursor-pointer"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onSelectNode(node.id);
                    setDraggingNodeId(node.id);
                    setDragStart({ x: e.clientX, y: e.clientY });
                  }}
                  onDoubleClick={() => onExpandNode?.(node.id)}
                >
                  {isSelected && (
                    <circle
                      r={radius + 7}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      strokeDasharray="3,3"
                    />
                  )}
                  <circle
                    r={radius}
                    fill={color}
                    fillOpacity={node.verificationStatus === "ai_hypothesis" ? 0.25 : 0.88}
                    stroke={isSelected ? "#ffffff" : color}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  <text
                    y={radius + 14}
                    textAnchor="middle"
                    fill="currentColor"
                    fontSize="11"
                    fontWeight={isSelected || idx === 0 ? "700" : "500"}
                  >
                    {node.label.length > 28 ? `${node.label.slice(0, 26)}…` : node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Bottom Legend & Progressive Expansion Hint */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[var(--bg-obsidian)]/85 backdrop-blur-md border border-[var(--border-subtle)] text-[11px]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Verified Relationship (Solid Line)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
              AI Hypothesis (Dashed Line)
            </span>
          </div>
          {onExpandNode && (
            <button
              type="button"
              onClick={() => onExpandNode(selectedNodeId)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Expand Selected Node (+4 Entities)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
