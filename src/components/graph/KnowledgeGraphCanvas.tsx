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
import { formatRelationshipLabel } from "@/lib/formatters";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import { useFullscreenBodyLock } from "@/components/ui/OmnisPrimitives";
import {
  doesSignalMatchCandidate,
  type FocusedSignal,
} from "@/lib/intelligence/spatial-sync";

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

function estimateNodePillWidth(label: string): number {
  const len = Math.min(label.length, 38);
  return Math.min(296, Math.max(88, len * 7.5 + 22));
}

function relaxSameBandPillCollisions(
  nodes: PositionedNode[],
  safeW: number,
  padX: number,
  yBandThreshold = 56
): PositionedNode[] {
  const out = nodes.map((n) => ({ ...n }));
  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        if (Math.abs(out[i].y - out[j].y) > yBandThreshold) continue;
        const wA = estimateNodePillWidth(out[i].label);
        const wB = estimateNodePillWidth(out[j].label);
        const minDx = wA / 2 + wB / 2 + 12;
        const dx = out[j].x - out[i].x;
        const absDx = Math.abs(dx);
        if (absDx < minDx) {
          const push = (minDx - absDx) * 0.52;
          const dir = dx >= 0 ? 1 : -1;
          out[i].x = Math.max(padX, Math.min(safeW - padX, out[i].x - dir * push));
          out[j].x = Math.max(padX, Math.min(safeW - padX, out[j].x + dir * push));
        }
      }
    }
  }
  return out;
}

/**
 * Resolves all `var(--token)` CSS references inside a serialized SVG string against computed theme
 * tokens and prepends a solid theme background rectangle so exported SVGs are portable.
 */
export function buildStandaloneThemedSvg(
  rawSerializedSvg: string,
  resolveToken: (tokenName: string) => string
): string {
  const resolveValue = (val: string): string =>
    val.replace(/var\((--[a-zA-Z0-9-]+)\)/g, (_full, tokenName: string) => {
      const resolved = resolveToken(tokenName).trim();
      return resolved || "#0b1120";
    });

  const bgColor = resolveToken("--bg-graphite").trim() || "#0b1120";
  const withResolvedTokens = resolveValue(rawSerializedSvg);
  const withXmlns = withResolvedTokens.includes('xmlns="http://www.w3.org/2000/svg"')
    ? withResolvedTokens
    : withResolvedTokens.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');

  const injection = `<style>text { font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif; }</style><rect x="0" y="0" width="100%" height="100%" fill="${bgColor}" />`;
  return withXmlns.replace(/(<svg\b[^>]*>)/i, `$1${injection}`);
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
    const padX = Math.max(96, safeW * 0.1);
    levels.forEach((lvlNodes, lvlIdx) => {
      const y = topY + lvlIdx * stepY;
      const span = Math.max(120, safeW - padX * 2);
      lvlNodes.forEach((n, i) => {
        const x =
          lvlNodes.length === 1
            ? cx
            : padX + (span * i) / Math.max(1, lvlNodes.length - 1);
        out.push({ ...n, x, y });
      });
    });
    return relaxSameBandPillCollisions(out, safeW, padX, 52);
  }

  if (mode === "clustered") {
    const categories = Array.from(new Set(nodes.map((n) => n.category)));
    const rx = safeW * 0.24;
    const ry = safeH * 0.28;
    const padX = Math.max(96, safeW * 0.1);
    const initial = nodes.map((n, idx) => {
      const catIdx = categories.indexOf(n.category);
      const clusterAngle = (2 * Math.PI * catIdx) / Math.max(1, categories.length);
      const clusterCx = cx + (catIdx === 0 ? 0 : rx * Math.cos(clusterAngle));
      const clusterCy = cy + (catIdx === 0 ? 0 : ry * Math.sin(clusterAngle));
      const jitterAngle = idx * 1.9;
      const jitterR = idx === 0 ? 0 : Math.min(58, Math.min(safeW, safeH) * 0.11);
      return {
        ...n,
        x: clusterCx + jitterR * Math.cos(jitterAngle),
        y: clusterCy + jitterR * Math.sin(jitterAngle),
      };
    });
    return relaxSameBandPillCollisions(initial, safeW, padX, 56);
  }

  const baseDist = Math.min(safeW, safeH) * 0.38;
  const pos = nodes.map((n, idx) => {
    if (idx === 0) return { ...n, x: cx, y: cy };
    const angle = (2 * Math.PI * (idx - 1)) / Math.max(1, count - 1);
    const dist = baseDist + ((idx * 41) % 64) - 20;
    return {
      ...n,
      x: cx + dist * Math.cos(angle),
      y: cy + dist * Math.sin(angle),
    };
  });

  const padX = Math.max(105, safeW * 0.11);
  const padY = Math.max(54, safeH * 0.1);
  const idToIdx = new Map(pos.map((p, i) => [p.id, i]));
  for (let iter = 0; iter < 54; iter++) {
    for (let i = 1; i < pos.length; i++) {
      let fx = 0;
      let fy = 0;
      for (let j = 0; j < pos.length; j++) {
        if (i === j) continue;
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        // Weight vertical separation stronger when horizontal pill labels could align
        const effectiveDy = Math.abs(dx) < 180 ? dy * 0.68 : dy;
        const distSq = Math.max(720, dx * dx + effectiveDy * effectiveDy);
        const dist = Math.sqrt(distSq);
        const rep = 10800 / distSq;
        fx += (dx / dist) * rep;
        fy += (effectiveDy / dist) * rep;
      }
      for (const e of edges) {
        const sIdx = idToIdx.get(e.source);
        const tIdx = idToIdx.get(e.target);
        const otherIdx = sIdx === i ? tIdx : tIdx === i ? sIdx : undefined;
        if (otherIdx !== undefined) {
          const dx = pos[otherIdx].x - pos[i].x;
          const dy = pos[otherIdx].y - pos[i].y;
          const dist = Math.max(1, Math.hypot(dx, dy));
          const restLen = Math.min(220, baseDist * 0.98);
          const spring = (dist - restLen) * 0.028;
          fx += (dx / dist) * spring;
          fy += (dy / dist) * spring;
        }
      }
      pos[i].x = Math.max(padX, Math.min(safeW - padX, pos[i].x + fx * 0.25));
      pos[i].y = Math.max(padY, Math.min(safeH - padY - 16, pos[i].y + fy * 0.25));
    }
  }

  // Final label-pill de-confliction pass so stacked node pills never touch
  const minLabelW = 175;
  const minLabelH = 74;
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        if (i === j) continue;
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        if (Math.abs(dx) < minLabelW && Math.abs(dy) < minLabelH) {
          const pushY = (dy >= 0 ? 1 : -1) * ((minLabelH - Math.abs(dy)) * 0.55);
          const pushX = dx === 0 ? (i % 2 === 0 ? 22 : -22) : (dx > 0 ? 1 : -1) * 14;
          pos[i].x = Math.max(padX, Math.min(safeW - padX, pos[i].x + pushX));
          pos[i].y = Math.max(padY, Math.min(safeH - padY - 16, pos[i].y + pushY));
        }
      }
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
  onFocusFilter,
  relationshipFilter = "ALL",
  searchFilter = "",
  highlightedPathNodeIds,
  highlightedPathEdgeIds,
  focusedSignal = null,
}: {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  layoutMode: GraphLayoutMode;
  selectedNodeId: string;
  onSelectNode: (id: string) => void;
  onExpandNode?: (id: string) => void;
  onFocusFilter?: () => void;
  relationshipFilter?: RelationshipType | "ALL";
  searchFilter?: string;
  highlightedPathNodeIds?: Set<string>;
  highlightedPathEdgeIds?: Set<string>;
  focusedSignal?: FocusedSignal | null;
}) {
  const motionPaused = useOmnisStore((s) => s.motionPaused);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const nodeGroupRefs = useRef<Map<string, SVGGElement>>(new Map());
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 920, height: 560 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchGraphLocked, setTouchGraphLocked] = useState(false);
  const [isCanvasVisible, setIsCanvasVisible] = useState(true);
  const [isTabActive, setIsTabActive] = useState(true);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [draggedOffsets, setDraggedOffsets] = useState<Record<string, { dx: number; dy: number }>>(
    {}
  );
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [panningCanvas, setPanningCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [packetPhase, setPacketPhase] = useState(0);
  const packetPhaseRef = useRef(0);

  const rootNodeId = nodes[0]?.id ?? "";
  const graphResetKey = `${layoutMode}::${rootNodeId}`;
  const [prevGraphResetKey, setPrevGraphResetKey] = useState(graphResetKey);
  if (graphResetKey !== prevGraphResetKey) {
    setPrevGraphResetKey(graphResetKey);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setDraggedOffsets({});
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        onFocusFilter?.();
      } else if (e.key === "0") {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setDraggedOffsets({});
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onFocusFilter]);

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

  useFullscreenBodyLock(isFullscreen, () => setIsFullscreen(false));

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => setIsTabActive(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry) setIsCanvasVisible(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const basePositions = useMemo(
    () =>
      computeLayoutPositions(nodes, edges, layoutMode, canvasSize.width, canvasSize.height),
    [nodes, edges, layoutMode, canvasSize.width, canvasSize.height]
  );

  const [animatedBasePositions, setAnimatedBasePositions] =
    useState<PositionedNode[]>(basePositions);
  const animatedRef = useRef<PositionedNode[]>(basePositions);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || motionPaused || animatedRef.current.length === 0) {
      animatedRef.current = basePositions;
      setAnimatedBasePositions(basePositions);
      return;
    }

    const prevMap = new Map(animatedRef.current.map((n) => [n.id, n]));
    let current = basePositions.map((target) => {
      const prev = prevMap.get(target.id);
      return prev ? { ...target, x: prev.x, y: prev.y } : target;
    });

    let rafId = 0;
    const step = () => {
      let maxDelta = 0;
      const next = basePositions.map((target, idx) => {
        const cur = current[idx] ?? target;
        const dx = target.x - cur.x;
        const dy = target.y - cur.y;
        maxDelta = Math.max(maxDelta, Math.abs(dx), Math.abs(dy));
        if (Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4) {
          return target;
        }
        return {
          ...target,
          x: cur.x + dx * 0.18,
          y: cur.y + dy * 0.18,
        };
      });
      current = next;
      animatedRef.current = next;
      setAnimatedBasePositions(next);
      if (maxDelta >= 0.4) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [basePositions, motionPaused]);

  const hasActivePathTrace = Boolean(
    highlightedPathEdgeIds && highlightedPathEdgeIds.size > 0
  );

  useEffect(() => {
    if (!hasActivePathTrace || motionPaused || !isCanvasVisible || !isTabActive) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      const id = window.setTimeout(() => setPacketPhase(0.5), 0);
      return () => window.clearTimeout(id);
    }
    let rafId = 0;
    let lastTime = performance.now();
    const tick = (now: number) => {
      const dtSec = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      packetPhaseRef.current = (packetPhaseRef.current + dtSec / 1.5) % 1;
      setPacketPhase(packetPhaseRef.current);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [hasActivePathTrace, motionPaused, isCanvasVisible, isTabActive]);

  const positionedNodes = useMemo(
    () =>
      animatedBasePositions.map((n) => {
        const off = draggedOffsets[n.id];
        return off ? { ...n, x: n.x + off.dx, y: n.y + off.dy } : n;
      }),
    [animatedBasePositions, draggedOffsets]
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

  const edgePairCurveMap = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const edge of filteredEdges) {
      const key =
        edge.source < edge.target
          ? `${edge.source}--${edge.target}`
          : `${edge.target}--${edge.source}`;
      const list = groups.get(key) ?? [];
      list.push(edge.id);
      groups.set(key, list);
    }
    const offsets = new Map<string, { rank: number; total: number }>();
    for (const list of groups.values()) {
      list.forEach((edgeId, idx) => {
        offsets.set(edgeId, { rank: idx, total: list.length });
      });
    }
    return offsets;
  }, [filteredEdges]);

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
    if (!(svgElement instanceof SVGSVGElement)) return;
    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", String(canvasSize.width));
    clone.setAttribute("height", String(canvasSize.height));
    const serializer = new XMLSerializer();
    const rawSource = serializer.serializeToString(clone);
    const rootStyles = getComputedStyle(document.documentElement);
    const source = buildStandaloneThemedSvg(rawSource, (tokenName) =>
      rootStyles.getPropertyValue(tokenName)
    );
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
          ? "fixed inset-4 z-50 h-[calc(100dvh-2rem)] bg-[var(--bg-obsidian)]/95 backdrop-blur-xl shadow-2xl"
          : "relative w-full h-[560px]"
      } omnis-card overflow-hidden flex flex-col`}
    >
      {/* Top Control Toolbar */}
      <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-slate)] flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-[var(--text-primary)]">
            Layout: <span className="uppercase tone-blue omnis-mono">{layoutMode}</span>
          </span>
          <span className="text-[var(--text-muted)] omnis-mono omnis-tabular">
            {positionedNodes.length} Entities • {filteredEdges.length} Typed Links
          </span>
        </div>

        <div className="flex items-center gap-1 omnis-hud-pill px-1.5 py-1 rounded-xl">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
            title="Zoom In"
            aria-label="Zoom In"
            className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] cursor-pointer text-[var(--text-primary)]"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.45, Number((z - 0.15).toFixed(2))))}
            title="Zoom Out"
            aria-label="Zoom Out"
            className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] cursor-pointer text-[var(--text-primary)]"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleFitToScreen}
            title="Fit Graph to Screen"
            aria-label="Fit Graph to Screen"
            className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg hover:bg-[var(--bg-elevated)] cursor-pointer font-medium text-[var(--text-primary)]"
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
            className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] cursor-pointer text-[var(--text-primary)]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleExportSvg}
            title="Export Knowledge Graph as SVG"
            aria-label="Export Knowledge Graph as SVG"
            className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg hover:bg-[var(--bg-elevated)] cursor-pointer font-medium text-[var(--text-primary)]"
          >
            <Download className="w-3.5 h-3.5 tone-blue" />
            <span>SVG</span>
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen((f) => !f)}
            title="Toggle Fullscreen Graph Exploration"
            aria-label="Toggle Fullscreen Graph"
            className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] cursor-pointer text-[var(--text-primary)]"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Responsive Interactive SVG Canvas */}
      <div
        ref={stageRef}
        className={`flex-1 relative omnis-subtle-dots bg-[var(--bg-graphite)] overflow-hidden ${
          isFullscreen || touchGraphLocked ? "touch-none" : "touch-pan-y sm:touch-none"
        }`}
        onPointerDownCapture={(e) => {
          activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (activePointersRef.current.size === 2) {
            const pts = Array.from(activePointersRef.current.values());
            const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
            pinchStartRef.current = { dist: Math.max(1, dist), zoom };
            setDraggingNodeId(null);
            setPanningCanvas(false);
          }
        }}
        onPointerDown={(e) => {
          if (activePointersRef.current.size >= 2) {
            setDraggingNodeId(null);
            setPanningCanvas(false);
            return;
          }
          if (e.pointerType === "touch" && !touchGraphLocked && !isFullscreen) {
            return;
          }
          setPanningCanvas(true);
          setDragStart({ x: e.clientX, y: e.clientY });
        }}
        onPointerMove={(e) => {
          if (activePointersRef.current.has(e.pointerId)) {
            activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          }
          if (activePointersRef.current.size === 2 && pinchStartRef.current) {
            const pts = Array.from(activePointersRef.current.values());
            const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
            const scale = dist / pinchStartRef.current.dist;
            setZoom(
              Math.min(2.2, Math.max(0.45, Number((pinchStartRef.current.zoom * scale).toFixed(2))))
            );
            return;
          }
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
        onPointerUp={(e) => {
          activePointersRef.current.delete(e.pointerId);
          if (activePointersRef.current.size < 2) {
            pinchStartRef.current = null;
          }
          setDraggingNodeId(null);
          setPanningCanvas(false);
        }}
        onPointerCancel={(e) => {
          activePointersRef.current.delete(e.pointerId);
          if (activePointersRef.current.size < 2) {
            pinchStartRef.current = null;
          }
          setDraggingNodeId(null);
          setPanningCanvas(false);
        }}
        onPointerLeave={(e) => {
          activePointersRef.current.delete(e.pointerId);
          if (activePointersRef.current.size < 2) {
            pinchStartRef.current = null;
          }
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
            <marker
              id="arrow-path"
              viewBox="0 0 10 10"
              refX="23"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--accent-cyan)" />
            </marker>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Curved Bezier Semantic Relationships (Parallel & Bidirectional De-conflicted) */}
            {filteredEdges.map((edge) => {
              const src = nodeById.get(edge.source);
              const tgt = nodeById.get(edge.target);
              if (!src || !tgt) return null;

              const isRelated = edge.source === focusNodeId || edge.target === focusNodeId;
              const isPathEdge = Boolean(highlightedPathEdgeIds?.has(edge.id));

              // Canonical undirected normal orientation so A->B and B->A separate symmetrically
              const canonA = edge.source < edge.target ? src : tgt;
              const canonB = edge.source < edge.target ? tgt : src;
              const cdx = canonB.x - canonA.x;
              const cdy = canonB.y - canonA.y;
              const cDist = Math.hypot(cdx, cdy) || 1;
              const cnx = -cdy / cDist;
              const cny = cdx / cDist;

              const pairMeta = edgePairCurveMap.get(edge.id) ?? { rank: 0, total: 1 };
              const curveOffset =
                pairMeta.total === 1
                  ? (edge.source < edge.target ? 1 : -1) * Math.min(24, cDist * 0.12)
                  : (pairMeta.rank - (pairMeta.total - 1) / 2) * 32;

              const cx = (src.x + tgt.x) / 2 + cnx * curveOffset;
              const cy = (src.y + tgt.y) / 2 + cny * curveOffset;
              const mx = 0.25 * src.x + 0.5 * cx + 0.25 * tgt.x;
              const my = 0.25 * src.y + 0.5 * cy + 0.25 * tgt.y;

              const tP = packetPhase;
              const px =
                (1 - tP) * (1 - tP) * src.x + 2 * (1 - tP) * tP * cx + tP * tP * tgt.x;
              const py =
                (1 - tP) * (1 - tP) * src.y + 2 * (1 - tP) * tP * cy + tP * tP * tgt.y;

              const formattedRel = formatRelationshipLabel(edge.relationshipType);
              const pillWidth = Math.max(76, formattedRel.length * 7.2 + 20);
              const edgeOpacity = isPathEdge
                ? 1
                : isRelated
                  ? hasActivePathTrace
                    ? 0.85
                    : 0.96
                  : hasActivePathTrace
                    ? 0.22
                    : 0.24;

              return (
                <g key={edge.id} opacity={edgeOpacity}>
                  {isPathEdge ? (
                    <path
                      d={`M ${src.x} ${src.y} Q ${cx} ${cy} ${tgt.x} ${tgt.y}`}
                      fill="none"
                      stroke="var(--accent-cyan)"
                      strokeWidth={6}
                      strokeOpacity={0.26}
                    />
                  ) : null}
                  <path
                    d={`M ${src.x} ${src.y} Q ${cx} ${cy} ${tgt.x} ${tgt.y}`}
                    fill="none"
                    stroke={
                      isPathEdge
                        ? "var(--accent-cyan)"
                        : edge.isHypothesis
                          ? "var(--chart-violet)"
                          : "var(--chart-blue)"
                    }
                    strokeWidth={isPathEdge ? 2.6 : isRelated ? 2.2 : 1.4}
                    strokeDasharray={edge.isHypothesis ? "5,4" : undefined}
                    markerEnd={
                      isPathEdge
                        ? "url(#arrow-path)"
                        : edge.isHypothesis
                          ? "url(#arrow-hypothesis)"
                          : "url(#arrow-verified)"
                    }
                  />
                  {isPathEdge ? (
                    <circle
                      cx={px}
                      cy={py}
                      r={4}
                      fill="var(--accent-cyan)"
                      stroke="var(--bg-obsidian)"
                      strokeWidth={1.25}
                    />
                  ) : null}
                  {isRelated || isPathEdge ? (
                    <g>
                      <rect
                        x={mx - pillWidth / 2}
                        y={my - 11}
                        width={pillWidth}
                        height={22}
                        rx={6}
                        fill="var(--bg-graphite)"
                        stroke={isPathEdge ? "var(--accent-cyan)" : "var(--border-subtle)"}
                      />
                      <text
                        x={mx}
                        y={my + 3.5}
                        textAnchor="middle"
                        fill={
                          isPathEdge
                            ? "var(--status-cyan)"
                            : edge.isHypothesis
                              ? "var(--accent-violet)"
                              : "var(--accent-blue)"
                        }
                        fontSize="11"
                        fontWeight="600"
                      >
                        {formattedRel}
                      </text>
                    </g>
                  ) : null}
                </g>
              );
            })}

            {/* Semantic Category Shapes with Path Halo & Dual-Theme Contrast */}
            {positionedNodes.map((node, idx) => {
              const isSelected = node.id === selectedNodeId;
              const isConnected = connectedNodeIds.has(node.id);
              const isPathNode = Boolean(highlightedPathNodeIds?.has(node.id));
              const matchesSearch =
                !searchFilter.trim() ||
                node.label.toLowerCase().includes(searchFilter.toLowerCase());
              const color = CATEGORY_COLORS[node.category] ?? "#2563eb";
              const radius = idx === 0 ? 22 : isSelected || isPathNode ? 18 : 14.5;
              const isHypothesis = node.verificationStatus === "ai_hypothesis";
              const nodeFill = isHypothesis ? "var(--bg-slate)" : color;
              const nodeStroke = isPathNode
                ? "var(--accent-cyan)"
                : isSelected
                  ? "var(--text-primary)"
                  : color;
              const strokeW = isPathNode ? 2.5 : isSelected ? 2.4 : 1.75;

              const effectiveOpacity = !matchesSearch
                ? 0.22
                : isPathNode || isConnected
                  ? 1
                  : 0.36;

              const hexPts = Array.from({ length: 6 }, (_, k) => {
                const a = (Math.PI / 3) * k - Math.PI / 6;
                return `${(radius * 1.08 * Math.cos(a)).toFixed(1)},${(radius * 1.08 * Math.sin(a)).toFixed(1)}`;
              }).join(" ");

              const diamondR = radius * 1.16;
              const diamondPts = `0,${-diamondR.toFixed(1)} ${diamondR.toFixed(1)},0 0,${diamondR.toFixed(1)} ${(-diamondR).toFixed(1)},0`;

              const renderSemanticShape = () => {
                if (isHypothesis || node.category === "Scenario Hypothesis") {
                  return (
                    <>
                      <circle
                        r={radius + 4}
                        fill="none"
                        stroke={color}
                        strokeWidth={1.25}
                        strokeDasharray="3,2.5"
                        strokeOpacity={0.8}
                      />
                      <circle
                        r={radius}
                        fill={nodeFill}
                        fillOpacity={0.94}
                        stroke={nodeStroke}
                        strokeWidth={strokeW}
                        strokeDasharray="3,2"
                      />
                    </>
                  );
                }
                if (node.category === "Technology" || node.category === "Energy") {
                  return (
                    <polygon
                      points={hexPts}
                      fill={nodeFill}
                      fillOpacity={0.92}
                      stroke={nodeStroke}
                      strokeWidth={strokeW}
                    />
                  );
                }
                if (node.category === "Geopolitics" || node.category === "History") {
                  return (
                    <polygon
                      points={diamondPts}
                      fill={nodeFill}
                      fillOpacity={0.92}
                      stroke={nodeStroke}
                      strokeWidth={strokeW}
                    />
                  );
                }
                if (node.category === "Economics" || node.category === "Institution") {
                  const s = radius * 1.82;
                  return (
                    <rect
                      x={-s / 2}
                      y={-s / 2}
                      width={s}
                      height={s}
                      rx={5.5}
                      fill={nodeFill}
                      fillOpacity={0.92}
                      stroke={nodeStroke}
                      strokeWidth={strokeW}
                    />
                  );
                }
                return (
                  <circle
                    r={radius}
                    fill={nodeFill}
                    fillOpacity={0.92}
                    stroke={nodeStroke}
                    strokeWidth={strokeW}
                  />
                );
              };

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
                  className="group cursor-pointer focus:outline-none"
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
                    if (activePointersRef.current.size > 1 || !e.isPrimary) {
                      setDraggingNodeId(null);
                      return;
                    }
                    onSelectNode(node.id);
                    if (e.pointerType === "touch" && !touchGraphLocked && !isFullscreen) {
                      return;
                    }
                    e.stopPropagation();
                    setDraggingNodeId(node.id);
                    setDragStart({ x: e.clientX, y: e.clientY });
                  }}
                  onDoubleClick={() => onExpandNode?.(node.id)}
                >
                  <circle
                    r={radius + 11}
                    fill="none"
                    stroke="var(--accent-blue)"
                    strokeWidth={2.5}
                    className="opacity-0 group-focus-visible:opacity-100 pointer-events-none transition-opacity"
                  />
                  {doesSignalMatchCandidate(focusedSignal, node) ? (
                    <>
                      <circle
                        r={radius + 13.5}
                        fill="none"
                        stroke="var(--accent-amber)"
                        strokeWidth="1.6"
                        strokeDasharray="4,3"
                        strokeOpacity={0.78}
                        className="pointer-events-none"
                      />
                      <circle
                        r={radius + 17}
                        fill="none"
                        stroke="var(--accent-cyan)"
                        strokeWidth="1"
                        strokeOpacity={0.35}
                        className="pointer-events-none animate-pulse"
                      />
                    </>
                  ) : null}
                  {isPathNode ? (
                    <circle
                      r={radius + 9}
                      fill="none"
                      stroke="var(--accent-cyan)"
                      strokeWidth="2.2"
                      strokeOpacity={0.55}
                    />
                  ) : null}
                  {isSelected ? (
                    <circle
                      r={radius + 6.5}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      strokeDasharray="3.5,3"
                    />
                  ) : null}
                  {renderSemanticShape()}
                  <circle
                    r={idx === 0 ? 5.5 : 3.2}
                    fill={isHypothesis ? color : "var(--bg-slate)"}
                    fillOpacity={0.92}
                  />

                  {(() => {
                    const displayLabel =
                      node.label.length > 38 ? `${node.label.slice(0, 36)}…` : node.label;
                    const pillW = Math.min(296, Math.max(88, displayLabel.length * 7.5 + 22));
                    return (
                      <>
                        <rect
                          x={-pillW / 2}
                          y={radius + 5}
                          width={pillW}
                          height={21}
                          rx={6}
                          fill="var(--bg-graphite)"
                          fillOpacity={0.92}
                          stroke={
                            isPathNode
                              ? "var(--accent-cyan)"
                              : isSelected
                                ? color
                                : "var(--border-subtle)"
                          }
                          strokeWidth={isSelected || isPathNode ? 1.2 : 0.7}
                        />
                        <text
                          y={radius + 19}
                          textAnchor="middle"
                          fill="var(--text-primary)"
                          fontSize="12.5"
                          fontWeight={isSelected || idx === 0 || isPathNode ? "700" : "600"}
                        >
                          {displayLabel}
                        </text>
                      </>
                    );
                  })()}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Bottom Legend & Expansion Bar */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl omnis-hud-pill text-xs sm:text-[13px]">
          <div className="flex flex-wrap items-center gap-3 text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--chart-blue)]" />
              Verified Link
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-[var(--chart-violet)]" />
              Unconfirmed Scenario
            </span>
            <span className="hidden md:inline text-[var(--text-muted)] text-xs">
              Shapes mark topic domains • Click or drag any node
            </span>
          </div>
          {onExpandNode ? (
            <button
              type="button"
              onClick={() => onExpandNode(selectedNodeId)}
              className="min-h-[44px] sm:min-h-[30px] inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--accent-blue-solid)] hover:brightness-110 text-white font-semibold cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Show +4 More Topics</span>
            </button>
          ) : null}
        </div>

        {/* Mobile Scroll-Safe vs Locked Touch Canvas Mode Toggle */}
        <div className="sm:hidden absolute top-2.5 left-2.5 z-10">
          <button
            type="button"
            onClick={() => setTouchGraphLocked((prev) => !prev)}
            className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium backdrop-blur-md transition-all cursor-pointer ${
              touchGraphLocked
                ? "badge-tone-warning"
                : "omnis-hud-pill text-[var(--text-secondary)]"
            }`}
            title="Toggle between vertical page scroll and 1-finger canvas pan/zoom"
          >
            <span>{touchGraphLocked ? "Pan/Zoom Locked" : "Scroll-Safe Touch"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
