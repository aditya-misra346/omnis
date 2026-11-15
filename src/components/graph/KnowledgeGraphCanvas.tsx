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
  "Core Concept": "#2563eb",
  Technology: "#0891b2",
  Economics: "#059669",
  Geopolitics: "#d97706",
  Science: "#7c3aed",
  Energy: "#ca8a04",
  Environment: "#16a34a",
  History: "#db2777",
  Institution: "#4f46e5",
  "Scenario Hypothesis": "#9333ea",
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
      const radius = ring === 1 ? 158 : 238;
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
      const y = 92 + lvlIdx * 186;
      const span = width - 170;
      lvlNodes.forEach((n, i) => {
        const x =
          lvlNodes.length === 1
            ? cx
            : 85 + (span * i) / Math.max(1, lvlNodes.length - 1);
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
      const clusterCx = cx + (catIdx === 0 ? 0 : 182 * Math.cos(clusterAngle));
      const clusterCy = cy + (catIdx === 0 ? 0 : 148 * Math.sin(clusterAngle));
      const jitterAngle = idx * 1.9;
      const jitterR = idx === 0 ? 0 : 52;
      return {
        ...n,
        x: clusterCx + jitterR * Math.cos(jitterAngle),
        y: clusterCy + jitterR * Math.sin(jitterAngle),
      };
    });
  }

  // Deterministic Force-Directed layout with ideal spring rest length to avoid center crowding
  const pos = nodes.map((n, idx) => {
    if (idx === 0) return { ...n, x: cx, y: cy };
    const angle = (2 * Math.PI * (idx - 1)) / Math.max(1, count - 1);
    const dist = 195 + ((idx * 41) % 68);
    return {
      ...n,
      x: cx + dist * Math.cos(angle),
      y: cy + dist * Math.sin(angle),
    };
  });

  const idToIdx = new Map(pos.map((p, i) => [p.id, i]));
  for (let iter = 0; iter < 48; iter++) {
    for (let i = 1; i < pos.length; i++) {
      let fx = 0;
      let fy = 0;
      for (let j = 0; j < pos.length; j++) {
        if (i === j) continue;
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        const distSq = Math.max(600, dx * dx + dy * dy);
        const dist = Math.sqrt(distSq);
        const rep = 7200 / distSq;
        fx += (dx / dist) * rep;
        fy += (dy / dist) * rep;
      }
      for (const e of edges) {
        const sIdx = idToIdx.get(e.source);
        const tIdx = idToIdx.get(e.target);
        const otherIdx = sIdx === i ? tIdx : tIdx === i ? sIdx : undefined;
        if (otherIdx !== undefined) {
          const dx = pos[otherIdx].x - pos[i].x;
          const dy = pos[otherIdx].y - pos[i].y;
          const dist = Math.max(1, Math.hypot(dx, dy));
          const spring = (dist - 178) * 0.036;
          fx += (dx / dist) * spring;
          fy += (dy / dist) * spring;
        }
      }
      pos[i].x = Math.max(92, Math.min(width - 92, pos[i].x + fx * 0.25));
      pos[i].y = Math.max(70, Math.min(height - 76, pos[i].y + fy * 0.25));
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
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [draggedOffsets, setDraggedOffsets] = useState<Record<string, { dx: number; dy: number }>>(
    {}
  );
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [panningCanvas, setPanningCanvas] = useState(false);
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

  const focusNodeId = hoveredNodeId ?? selectedNodeId;
  const connectedNodeIds = useMemo(() => {
    const set = new Set<string>([focusNodeId]);
    for (const e of filteredEdges) {
      if (e.source === focusNodeId) set.add(e.target);
      if (e.target === focusNodeId) set.add(e.source);
    }
    return set;
  }, [focusNodeId, filteredEdges]);

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
        isFullscreen ? "fixed inset-4 z-50 bg-[var(--bg-obsidian)]" : "relative w-full h-[560px]"
      } omnis-card overflow-hidden flex flex-col`}
    >
      {/* Top Control Toolbar */}
      <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-slate)] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-[var(--text-primary)]">
            Layout: <span className="uppercase tone-blue omnis-mono">{layoutMode}</span>
          </span>
          <span className="text-[var(--text-muted)] omnis-mono">
            {positionedNodes.length} Entities • {filteredEdges.length} Typed Links
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.85, Number((z + 0.15).toFixed(2))))}
            title="Zoom In"
            className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-graphite)] hover:border-[var(--border-strong)] cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.55, Number((z - 0.15).toFixed(2))))}
            title="Zoom Out"
            className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-graphite)] hover:border-[var(--border-strong)] cursor-pointer"
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
            className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-graphite)] hover:border-[var(--border-strong)] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleExportSvg}
            title="Export Knowledge Graph as SVG"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-graphite)] hover:border-[var(--border-strong)] cursor-pointer font-medium"
          >
            <Download className="w-3.5 h-3.5 tone-blue" />
            <span>SVG</span>
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen((f) => !f)}
            title="Toggle Fullscreen Graph Exploration"
            className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-graphite)] hover:border-[var(--border-strong)] cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Theme-Adaptive Interactive SVG Canvas */}
      <div
        className="flex-1 relative omnis-subtle-dots bg-[var(--bg-graphite)] overflow-hidden"
        onPointerDown={(e) => {
          setPanningCanvas(true);
          setDragStart({ x: e.clientX, y: e.clientY });
        }}
        onPointerMove={(e) => {
          if (draggingNodeId) {
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
          } else if (panningCanvas) {
            const dx = e.clientX - dragStart.x;
            const dy = e.clientY - dragStart.y;
            setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
            setDragStart({ x: e.clientX, y: e.clientY });
          }
        }}
        onPointerUp={() => {
          setDraggingNodeId(null);
          setPanningCanvas(false);
        }}
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
              refX="23"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--chart-blue)" />
            </marker>
            <marker
              id="arrow-hypothesis"
              viewBox="0 0 10 10"
              refX="23"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--chart-violet)" />
            </marker>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Curved Bezier Semantic Relationships */}
            {filteredEdges.map((edge, edgeIdx) => {
              const src = nodeById.get(edge.source);
              const tgt = nodeById.get(edge.target);
              if (!src || !tgt) return null;

              const isRelated = edge.source === focusNodeId || edge.target === focusNodeId;
              const dx = tgt.x - src.x;
              const dy = tgt.y - src.y;
              const dist = Math.hypot(dx, dy) || 1;
              const curveOffset = ((edgeIdx % 2 === 0 ? 1 : -1) * Math.min(28, dist * 0.14));
              const nx = -dy / dist;
              const ny = dx / dist;
              const cx = (src.x + tgt.x) / 2 + nx * curveOffset;
              const cy = (src.y + tgt.y) / 2 + ny * curveOffset;
              const mx = 0.25 * src.x + 0.5 * cx + 0.25 * tgt.x;
              const my = 0.25 * src.y + 0.5 * cy + 0.25 * tgt.y;

              return (
                <g key={edge.id} opacity={isRelated ? 1 : 0.34}>
                  <path
                    d={`M ${src.x} ${src.y} Q ${cx} ${cy} ${tgt.x} ${tgt.y}`}
                    fill="none"
                    stroke={edge.isHypothesis ? "var(--chart-violet)" : "var(--chart-blue)"}
                    strokeWidth={isRelated ? 2.2 : 1.5}
                    strokeDasharray={edge.isHypothesis ? "5,4" : undefined}
                    markerEnd={
                      edge.isHypothesis ? "url(#arrow-hypothesis)" : "url(#arrow-verified)"
                    }
                  />
                  {isRelated && (
                    <g>
                      <rect
                        x={mx - 46}
                        y={my - 9}
                        width={92}
                        height={17}
                        rx={5}
                        fill="var(--bg-graphite)"
                        stroke="var(--border-subtle)"
                      />
                      <text
                        x={mx}
                        y={my + 2.5}
                        textAnchor="middle"
                        fill={edge.isHypothesis ? "var(--accent-violet)" : "var(--accent-blue)"}
                        fontSize="8.5"
                        fontWeight="600"
                        className="omnis-mono"
                      >
                        {edge.relationshipType}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Differentiated Category Nodes */}
            {positionedNodes.map((node, idx) => {
              const isSelected = node.id === selectedNodeId;
              const isConnected = connectedNodeIds.has(node.id);
              const matchesSearch =
                !searchFilter.trim() ||
                node.label.toLowerCase().includes(searchFilter.toLowerCase());
              const color = CATEGORY_COLORS[node.category] ?? "#2563eb";
              const radius = idx === 0 ? 23 : isSelected ? 19 : 14.5;

              const effectiveOpacity = !matchesSearch ? 0.2 : isConnected ? 1 : 0.45;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  opacity={effectiveOpacity}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
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
                      strokeDasharray="3.5,3"
                    />
                  )}
                  <circle
                    r={radius}
                    fill={node.verificationStatus === "ai_hypothesis" ? "var(--bg-slate)" : color}
                    fillOpacity={node.verificationStatus === "ai_hypothesis" ? 0.92 : 0.9}
                    stroke={isSelected ? "var(--text-primary)" : color}
                    strokeWidth={isSelected ? 2.5 : 1.75}
                    strokeDasharray={node.verificationStatus === "ai_hypothesis" ? "3,2" : undefined}
                  />
                  {/* Inner core glyph differentiation */}
                  {idx === 0 && <circle r={6} fill="#ffffff" fillOpacity={0.92} />}
                  {node.category === "Geopolitics" && idx !== 0 && (
                    <rect x={-4} y={-4} width={8} height={8} rx={1.5} fill="#ffffff" fillOpacity={0.9} />
                  )}

                  {/* Theme-crisp label pill behind text for zero overlap/washout in both Dark & Light */}
                  <text
                    y={radius + 15}
                    textAnchor="middle"
                    fill="var(--text-primary)"
                    fontSize="11"
                    fontWeight={isSelected || idx === 0 ? "700" : "600"}
                  >
                    {node.label.length > 28 ? `${node.label.slice(0, 26)}…` : node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Bottom Legend & Expansion Bar */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl omnis-glass-panel text-[11px]">
          <div className="flex flex-wrap items-center gap-3.5 text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--chart-blue)]" />
              Verified Evidence (Solid Arc)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-[var(--chart-violet)]" />
              AI Hypothesis (Dashed Arc)
            </span>
            <span className="hidden sm:inline text-[var(--text-muted)]">
              Drag background to pan • Drag node to rearrange
            </span>
          </div>
          {onExpandNode && (
            <button
              type="button"
              onClick={() => onExpandNode(selectedNodeId)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--accent-blue-solid)] hover:brightness-110 text-white font-semibold cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Expand Node (+4)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
