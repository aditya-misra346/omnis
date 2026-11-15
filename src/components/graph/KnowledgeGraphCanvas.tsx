"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Download,
  PlusCircle,
  Scan,
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
  width: number,
  height: number
): PositionedNode[] {
  const safeW = Math.max(360, width);
  const safeH = Math.max(320, height);
  const cx = safeW / 2;
  const cy = safeH / 2;
  const count = nodes.length;
  if (count === 0) return [];

  if (mode === "circular") {
    const r = Math.min(safeW, safeH) * 0.36;
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
    const r1 = Math.min(safeW, safeH) * 0.27;
    const r2 = Math.min(safeW, safeH) * 0.41;
    return nodes.map((n, idx) => {
      if (idx === 0) return { ...n, x: cx, y: cy };
      const ring = idx <= 6 ? 1 : 2;
      const radius = ring === 1 ? r1 : r2;
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
    const topY = safeH * 0.16;
    const stepY = (safeH * 0.66) / 2;
    levels.forEach((lvlNodes, lvlIdx) => {
      const y = topY + lvlIdx * stepY;
      const padX = Math.max(76, safeW * 0.1);
      const span = Math.max(120, safeW - padX * 2);
      lvlNodes.forEach((n, i) => {
        const x =
          lvlNodes.length === 1
            ? cx
            : padX + (span * i) / Math.max(1, lvlNodes.length - 1);
        out.push({ ...n, x, y });
      });
    });
    return out;
  }

  if (mode === "clustered") {
    const categories = Array.from(new Set(nodes.map((n) => n.category)));
    const rx = safeW * 0.21;
    const ry = safeH * 0.27;
    return nodes.map((n, idx) => {
      const catIdx = categories.indexOf(n.category);
      const clusterAngle = (2 * Math.PI * catIdx) / Math.max(1, categories.length);
      const clusterCx = cx + (catIdx === 0 ? 0 : rx * Math.cos(clusterAngle));
      const clusterCy = cy + (catIdx === 0 ? 0 : ry * Math.sin(clusterAngle));
      const jitterAngle = idx * 1.9;
      const jitterR = idx === 0 ? 0 : Math.min(54, Math.min(safeW, safeH) * 0.1);
      return {
        ...n,
        x: clusterCx + jitterR * Math.cos(jitterAngle),
        y: clusterCy + jitterR * Math.sin(jitterAngle),
      };
    });
  }

  const baseDist = Math.min(safeW, safeH) * 0.34;
  const pos = nodes.map((n, idx) => {
    if (idx === 0) return { ...n, x: cx, y: cy };
    const angle = (2 * Math.PI * (idx - 1)) / Math.max(1, count - 1);
    const dist = baseDist + ((idx * 41) % 64) - 24;
    return {
      ...n,
      x: cx + dist * Math.cos(angle),
      y: cy + dist * Math.sin(angle),
    };
  });

  const padX = Math.max(82, safeW * 0.1);
  const padY = Math.max(66, safeH * 0.12);
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
          const spring = (dist - Math.min(182, baseDist * 0.92)) * 0.036;
          fx += (dx / dist) * spring;
          fy += (dy / dist) * spring;
        }
      }
      pos[i].x = Math.max(padX, Math.min(safeW - padX, pos[i].x + fx * 0.25));
      pos[i].y = Math.max(padY, Math.min(safeH - padY - 12, pos[i].y + fy * 0.25));
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
  const stageRef = useRef<HTMLDivElement | null>(null);
  const nodeGroupRefs = useRef<Map<string, SVGGElement>>(new Map());
  const [canvasSize, setCanvasSize] = useState({ width: 920, height: 560 });
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

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const syncSize = () => {
      const w = Math.max(360, el.clientWidth || 920);
      const h = Math.max(360, el.clientHeight || 560);
      setCanvasSize((prev) =>
        Math.abs(prev.width - w) > 2 || Math.abs(prev.height - h) > 2
          ? { width: w, height: h }
          : prev
      );
    };
    syncSize();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncSize) : null;
    ro?.observe(el);
    window.addEventListener("resize", syncSize);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", syncSize);
    };
  }, [isFullscreen]);

  const basePositions = useMemo(
    () =>
      computeLayoutPositions(nodes, edges, layoutMode, canvasSize.width, canvasSize.height),
    [nodes, edges, layoutMode, canvasSize.width, canvasSize.height]
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

  const handleFitToScreen = useCallback(() => {
    if (positionedNodes.length === 0) return;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const n of positionedNodes) {
      minX = Math.min(minX, n.x - 60);
      maxX = Math.max(maxX, n.x + 60);
      minY = Math.min(minY, n.y - 40);
      maxY = Math.max(maxY, n.y + 52);
    }
    const bboxW = Math.max(120, maxX - minX);
    const bboxH = Math.max(120, maxY - minY);
    const fitZoom = Math.min(
      1.6,
      Math.max(0.55, Math.min((canvasSize.width * 0.88) / bboxW, (canvasSize.height * 0.82) / bboxH))
    );
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setZoom(Number(fitZoom.toFixed(2)));
    setPan({
      x: canvasSize.width / 2 - centerX * fitZoom,
      y: canvasSize.height / 2 - centerY * fitZoom,
    });
  }, [positionedNodes, canvasSize.width, canvasSize.height]);

  const handleWheelZoom = useCallback(
    (e: WheelEvent) => {
      const el = stageRef.current;
      if (!el) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.09 : 0.91;

      setZoom((prevZoom) => {
        const nextZoom = Math.min(2.2, Math.max(0.45, Number((prevZoom * factor).toFixed(3))));
        const ratio = nextZoom / prevZoom;
        setPan((prevPan) => ({
          x: pointerX - (pointerX - prevPan.x) * ratio,
          y: pointerY - (pointerY - prevPan.y) * ratio,
        }));
        return nextZoom;
      });
    },
    []
  );

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheelZoom, { passive: false });
    return () => el.removeEventListener("wheel", handleWheelZoom);
  }, [handleWheelZoom]);

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
          <span className="text-[var(--text-muted)] omnis-mono omnis-tabular">
            {positionedNodes.length} Entities • {filteredEdges.length} Typed Links
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
            title="Zoom In"
            aria-label="Zoom In"
            className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-graphite)] hover:border-[var(--border-strong)] cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.45, Number((z - 0.15).toFixed(2))))}
            title="Zoom Out"
            aria-label="Zoom Out"
            className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-graphite)] hover:border-[var(--border-strong)] cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleFitToScreen}
            title="Fit Graph to Screen"
            aria-label="Fit Graph to Screen"
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-graphite)] hover:border-[var(--border-strong)] cursor-pointer font-medium"
          >
            <Scan className="w-3.5 h-3.5 tone-blue" />
            <span className="hidden sm:inline">Fit</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
              setDraggedOffsets({});
            }}
            title="Reset Graph Positions & Zoom"
            aria-label="Reset Graph Positions"
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
            aria-label="Toggle Fullscreen Graph"
            className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-graphite)] hover:border-[var(--border-strong)] cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Responsive Interactive SVG Canvas */}
      <div
        ref={stageRef}
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
          viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
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
              const curveOffset = (edgeIdx % 2 === 0 ? 1 : -1) * Math.min(28, dist * 0.14);
              const nx = -dy / dist;
              const ny = dx / dist;
              const cx = (src.x + tgt.x) / 2 + nx * curveOffset;
              const cy = (src.y + tgt.y) / 2 + ny * curveOffset;
              const mx = 0.25 * src.x + 0.5 * cx + 0.25 * tgt.x;
              const my = 0.25 * src.y + 0.5 * cy + 0.25 * tgt.y;

              const formattedRel = edge.relationshipType.replace(/_/g, " ");
              const pillWidth = Math.max(60, formattedRel.length * 6.2 + 16);

              return (
                <g key={edge.id} opacity={isRelated ? 1 : 0.25}>
                  <path
                    d={`M ${src.x} ${src.y} Q ${cx} ${cy} ${tgt.x} ${tgt.y}`}
                    fill="none"
                    stroke={edge.isHypothesis ? "var(--chart-violet)" : "var(--chart-blue)"}
                    strokeWidth={isRelated ? 2.2 : 1.4}
                    strokeDasharray={edge.isHypothesis ? "5,4" : undefined}
                    markerEnd={
                      edge.isHypothesis ? "url(#arrow-hypothesis)" : "url(#arrow-verified)"
                    }
                  />
                  {isRelated ? (
                    <g>
                      <rect
                        x={mx - pillWidth / 2}
                        y={my - 9}
                        width={pillWidth}
                        height={18}
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
                        {formattedRel}
                      </text>
                    </g>
                  ) : null}
                </g>
              );
            })}

            {/* Differentiated Category Nodes with 1-hop & Keyboard Accessibility */}
            {positionedNodes.map((node, idx) => {
              const isSelected = node.id === selectedNodeId;
              const isConnected = connectedNodeIds.has(node.id);
              const matchesSearch =
                !searchFilter.trim() ||
                node.label.toLowerCase().includes(searchFilter.toLowerCase());
              const color = CATEGORY_COLORS[node.category] ?? "#2563eb";
              const radius = idx === 0 ? 23 : isSelected ? 19 : 14.5;

              const effectiveOpacity = !matchesSearch ? 0.18 : isConnected ? 1 : 0.25;

              return (
                <g
                  key={node.id}
                  ref={(el) => {
                    if (el) nodeGroupRefs.current.set(node.id, el);
                    else nodeGroupRefs.current.delete(node.id);
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${node.label} (${node.category})`}
                  aria-pressed={isSelected}
                  transform={`translate(${node.x}, ${node.y})`}
                  opacity={effectiveOpacity}
                  className="cursor-pointer focus:outline-none"
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onFocus={() => setHoveredNodeId(node.id)}
                  onBlur={() => setHoveredNodeId(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectNode(node.id);
                    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                      e.preventDefault();
                      const nextNode = positionedNodes[(idx + 1) % positionedNodes.length];
                      if (nextNode) nodeGroupRefs.current.get(nextNode.id)?.focus();
                    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                      e.preventDefault();
                      const prevNode =
                        positionedNodes[
                          (idx - 1 + positionedNodes.length) % positionedNodes.length
                        ];
                      if (prevNode) nodeGroupRefs.current.get(prevNode.id)?.focus();
                    }
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onSelectNode(node.id);
                    setDraggingNodeId(node.id);
                    setDragStart({ x: e.clientX, y: e.clientY });
                  }}
                  onDoubleClick={() => onExpandNode?.(node.id)}
                >
                  {isSelected ? (
                    <circle
                      r={radius + 7}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      strokeDasharray="3.5,3"
                    />
                  ) : null}
                  <circle
                    r={radius}
                    fill={node.verificationStatus === "ai_hypothesis" ? "var(--bg-slate)" : color}
                    fillOpacity={node.verificationStatus === "ai_hypothesis" ? 0.92 : 0.9}
                    stroke={isSelected ? "var(--text-primary)" : color}
                    strokeWidth={isSelected ? 2.5 : 1.75}
                    strokeDasharray={node.verificationStatus === "ai_hypothesis" ? "3,2" : undefined}
                  />
                  {idx === 0 ? <circle r={6} fill="#ffffff" fillOpacity={0.92} /> : null}
                  {node.category === "Geopolitics" && idx !== 0 ? (
                    <rect
                      x={-4}
                      y={-4}
                      width={8}
                      height={8}
                      rx={1.5}
                      fill="#ffffff"
                      fillOpacity={0.9}
                    />
                  ) : null}

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
              Scroll to zoom • Drag canvas to pan • Tab/Arrows to focus nodes
            </span>
          </div>
          {onExpandNode ? (
            <button
              type="button"
              onClick={() => onExpandNode(selectedNodeId)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--accent-blue-solid)] hover:brightness-110 text-white font-semibold cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Expand Node (+4)</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
