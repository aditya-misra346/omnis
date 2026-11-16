"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import type { GlyphSpringTransform } from "@/lib/typography/fluid-ink-engine";
import { FluidInkText } from "@/components/typography/FluidInkText";

export interface ElasticTextSegment {
  text: string;
  editorial?: boolean;
  fluidInk?: boolean;
  className?: string;
}

interface ElasticMagneticTextProps {
  as?: "h1" | "h2" | "h3" | "div" | "span";
  segments: ElasticTextSegment[];
  className?: string;
}

interface CachedGlyphCenter {
  cx: number;
  cy: number;
}

interface SpringState extends GlyphSpringTransform {
  vx: number;
  vy: number;
}

export function ElasticMagneticText({
  as: Tag = "h1",
  segments,
  className = "",
}: ElasticMagneticTextProps) {
  const { motionPaused } = useOmnisStore();
  const containerRef = useRef<HTMLElement | null>(null);

  // Store refs per segment cleanly so unified spring operates seamlessly across plain + ink segments
  const segmentGlyphElsRef = useRef<HTMLSpanElement[][]>(segments.map(() => []));
  const inkTransformsMatrixRef = useRef<GlyphSpringTransform[][]>(segments.map(() => []));
  const stepSpringsRef = useRef<(now: number) => void>(() => {});

  const glyphCentersRef = useRef<CachedGlyphCenter[]>([]);
  const fontSizeRef = useRef<number>(48);
  const springsRef = useRef<SpringState[]>([]);
  const pointerPagePosRef = useRef<{ x: number; y: number } | null>(null);
  const pointerNearRef = useRef(false);
  const rafIdRef = useRef(0);
  const lastFrameRef = useRef(0);
  const finePointerRef = useRef(true);
  const reducedMotionRef = useRef(false);
  const motionPausedRef = useRef(motionPaused);

  useEffect(() => {
    motionPausedRef.current = motionPaused;
  }, [motionPaused]);

  const fullAriaLabel = useMemo(
    () => segments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim(),
    [segments]
  );

  const getAllFlatGlyphs = useCallback(() => {
    const flat: { el: HTMLSpanElement; segmentIndex: number; localIndex: number }[] = [];
    segmentGlyphElsRef.current.forEach((els, sIdx) => {
      els.forEach((el, lIdx) => {
        if (el) flat.push({ el, segmentIndex: sIdx, localIndex: lIdx });
      });
    });
    return flat;
  }, []);

  const cacheGlyphCenters = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const flat = getAllFlatGlyphs();
    if (flat.length === 0) return;

    const saved = flat.map(({ el }) => el.style.transform);
    for (const { el } of flat) {
      el.style.transform = "";
    }

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const computedFontSize = parseFloat(window.getComputedStyle(container).fontSize) || 48;
    fontSizeRef.current = computedFontSize;

    glyphCentersRef.current = flat.map(({ el }) => {
      const r = el.getBoundingClientRect();
      return {
        cx: r.left + scrollX + r.width * 0.5,
        cy: r.top + scrollY + r.height * 0.5,
      };
    });

    while (springsRef.current.length < flat.length) {
      springsRef.current.push({ x: 0, y: 0, rot: 0, sx: 1, sy: 1, vx: 0, vy: 0 });
    }
    springsRef.current.length = flat.length;

    segments.forEach((seg, sIdx) => {
      const len = segmentGlyphElsRef.current[sIdx]?.length ?? 0;
      const matrix = inkTransformsMatrixRef.current;
      if (!matrix[sIdx]) matrix[sIdx] = [];
      const arr = matrix[sIdx];
      while (arr.length < len) {
        arr.push({ x: 0, y: 0, rot: 0, sx: 1, sy: 1 });
      }
      arr.length = len;
      void seg;
    });

    flat.forEach(({ el }, idx) => {
      el.style.transform = saved[idx] ?? "";
    });
  }, [getAllFlatGlyphs, segments]);

  const resetAllSprings = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
    pointerNearRef.current = false;
    pointerPagePosRef.current = null;
    const flat = getAllFlatGlyphs();
    flat.forEach(({ el, segmentIndex, localIndex }, i) => {
      el.style.transform = "";
      if (springsRef.current[i]) {
        springsRef.current[i] = { x: 0, y: 0, rot: 0, sx: 1, sy: 1, vx: 0, vy: 0 };
      }
      const inkArr = inkTransformsMatrixRef.current[segmentIndex];
      if (inkArr && inkArr[localIndex]) {
        inkArr[localIndex] = { x: 0, y: 0, rot: 0, sx: 1, sy: 1 };
      }
    });
  }, [getAllFlatGlyphs]);

  const stepSprings = useCallback(
    (now: number) => {
      rafIdRef.current = 0;

      if (motionPausedRef.current || reducedMotionRef.current || !finePointerRef.current) {
        resetAllSprings();
        return;
      }

      const rawDt = lastFrameRef.current ? (now - lastFrameRef.current) / 16.6667 : 1;
      const step = Math.min(2.2, Math.max(0.25, rawDt));
      lastFrameRef.current = now;

      const flat = getAllFlatGlyphs();
      const centers = glyphCentersRef.current;
      const fontSize = fontSizeRef.current;
      const radius = Math.min(150, Math.max(95, fontSize * 2.4));
      const radiusSq = radius * radius;
      const maxOffset = Math.min(6, fontSize * 0.11);
      const pointer = pointerNearRef.current ? pointerPagePosRef.current : null;

      let activeEnergy = 0;

      for (let i = 0; i < flat.length; i++) {
        const { el, segmentIndex, localIndex } = flat[i];
        const center = centers[i];
        const s = springsRef.current[i];
        if (!center || !s) continue;

        let tx = 0;
        let ty = 0;
        let influence = 0;

        if (pointer) {
          const dx = center.cx - pointer.x;
          const dy = center.cy - pointer.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < radiusSq * 2.6) {
            influence = Math.exp(-distSq / radiusSq);
            const rawTx = Math.max(-maxOffset, Math.min(maxOffset, dx * 0.08));
            const rawTy = Math.max(-maxOffset * 1.15, Math.min(maxOffset * 1.15, dy * 0.1));
            tx = rawTx * influence;
            ty = rawTy * influence;
          }
        }

        s.vx = (s.vx + (tx - s.x) * 0.09 * step) * Math.pow(0.72, step);
        s.vy = (s.vy + (ty - s.y) * 0.09 * step) * Math.pow(0.72, step);
        s.x += s.vx * step;
        s.y += s.vy * step;

        const targetSx = 1 + influence * 0.025;
        const targetSy = 1 + influence * 0.04;
        s.sx += (targetSx - s.sx) * Math.min(1, 0.25 * step);
        s.sy += (targetSy - s.sy) * Math.min(1, 0.25 * step);
        s.rot = s.x * 0.14;

        const mag =
          Math.abs(s.x) + Math.abs(s.y) + Math.abs(s.vx) + Math.abs(s.vy) + Math.abs(s.sx - 1);
        activeEnergy += mag;

        if (mag < 0.008 && !pointer) {
          s.x = 0;
          s.y = 0;
          s.vx = 0;
          s.vy = 0;
          s.rot = 0;
          s.sx = 1;
          s.sy = 1;
          el.style.transform = "";
        } else {
          el.style.transform = `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(
            2
          )}px, 0) rotate(${(s.rot).toFixed(2)}deg) scale(${s.sx.toFixed(3)}, ${s.sy.toFixed(3)})`;
        }

        const inkArr = inkTransformsMatrixRef.current[segmentIndex];
        if (inkArr && inkArr[localIndex]) {
          inkArr[localIndex] = {
            x: s.x,
            y: s.y,
            rot: s.rot,
            sx: s.sx,
            sy: s.sy,
          };
        }
      }

      if (pointerNearRef.current || activeEnergy > 0.02) {
        rafIdRef.current = requestAnimationFrame((ts) => stepSpringsRef.current(ts));
      } else {
        lastFrameRef.current = 0;
      }
    },
    [getAllFlatGlyphs, resetAllSprings]
  );

  useEffect(() => {
    stepSpringsRef.current = stepSprings;
  }, [stepSprings]);

  // Immediately reset if motion is paused
  useEffect(() => {
    if (motionPaused) {
      resetAllSprings();
    }
  }, [motionPaused, resetAllSprings]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;

    const coarseMq = window.matchMedia?.("(pointer: coarse)");
    const reducedMq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    finePointerRef.current = !coarseMq?.matches;
    reducedMotionRef.current = Boolean(reducedMq?.matches);

    cacheGlyphCenters();

    const ro = new ResizeObserver(() => cacheGlyphCenters());
    ro.observe(container);

    let cancelled = false;
    document.fonts?.ready?.then(() => {
      if (!cancelled) cacheGlyphCenters();
    });

    const onReducedChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
      if (e.matches) resetAllSprings();
    };
    const onCoarseChange = (e: MediaQueryListEvent) => {
      finePointerRef.current = !e.matches;
      if (e.matches) resetAllSprings();
    };
    reducedMq?.addEventListener?.("change", onReducedChange);
    coarseMq?.addEventListener?.("change", onCoarseChange);

    const onPointerMove = (e: PointerEvent) => {
      if (
        e.buttons !== 0 ||
        motionPausedRef.current ||
        reducedMotionRef.current ||
        !finePointerRef.current
      ) {
        return;
      }
      if (e.target instanceof Element && e.target.closest('[data-globe-stage="true"]')) {
        if (pointerNearRef.current) {
          pointerNearRef.current = false;
          if (!rafIdRef.current) rafIdRef.current = requestAnimationFrame(stepSprings);
        }
        return;
      }

      const pageX = e.clientX + window.scrollX;
      const pageY = e.clientY + window.scrollY;
      pointerPagePosRef.current = { x: pageX, y: pageY };

      const centers = glyphCentersRef.current;
      if (centers.length === 0) return;

      const minX = centers[0].cx - 160;
      const maxX = centers.reduce((acc, c) => Math.max(acc, c.cx), 0) + 160;
      const minY = centers.reduce((acc, c) => Math.min(acc, c.cy), Infinity) - 160;
      const maxY = centers.reduce((acc, c) => Math.max(acc, c.cy), 0) + 160;

      const isNear = pageX >= minX && pageX <= maxX && pageY >= minY && pageY <= maxY;
      pointerNearRef.current = isNear;

      if (isNear && !rafIdRef.current) {
        lastFrameRef.current = performance.now();
        rafIdRef.current = requestAnimationFrame(stepSprings);
      }
    };

    const onPointerLeave = () => {
      pointerNearRef.current = false;
      if (!rafIdRef.current && springsRef.current.some((s) => Math.abs(s.x) > 0.01 || Math.abs(s.y) > 0.01)) {
        rafIdRef.current = requestAnimationFrame(stepSprings);
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave, { passive: true });

    return () => {
      cancelled = true;
      ro.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      reducedMq?.removeEventListener?.("change", onReducedChange);
      coarseMq?.removeEventListener?.("change", onCoarseChange);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    };
  }, [cacheGlyphCenters, resetAllSprings, stepSprings]);

  const setContainerRef = (el: HTMLElement | null) => {
    containerRef.current = el;
  };

  return (
    <Tag
      ref={setContainerRef as React.Ref<never>}
      aria-label={fullAriaLabel}
      className={className}
    >
      {segments.map((seg, sIdx) => {
        if (seg.fluidInk) {
          return (
            <React.Fragment key={`${sIdx}-${seg.text}`}>
              {sIdx > 0 ? " " : null}
              <FluidInkText
                text={seg.text}
                editorial={seg.editorial}
                className={seg.className}
                ariaLabel={seg.text}
                getExternalTransforms={() => inkTransformsMatrixRef.current[sIdx] ?? []}
                onGlyphElementsReady={(els) => {
                  segmentGlyphElsRef.current[sIdx] = els;
                  cacheGlyphCenters();
                }}
              />
            </React.Fragment>
          );
        }

        const words = seg.text.split(" ");
        let glyphCursor = 0;

        return (
          <React.Fragment key={`${sIdx}-${seg.text}`}>
            {sIdx > 0 ? " " : null}
            <span className={seg.editorial ? "omnis-editorial" : seg.className}>
              {words.map((word, wIdx) => {
                const chars = Array.from(word);
                return (
                  <React.Fragment key={`${wIdx}-${word}`}>
                    <span className="inline-block whitespace-nowrap">
                      {chars.map((char) => {
                        const localIdx = glyphCursor++;
                        return (
                          <span
                            key={`${localIdx}-${char}`}
                            ref={(el) => {
                              if (el) segmentGlyphElsRef.current[sIdx][localIdx] = el;
                            }}
                            aria-hidden="true"
                            className="inline-block origin-[50%_75%] will-change-transform"
                          >
                            {char}
                          </span>
                        );
                      })}
                    </span>
                    {wIdx < words.length - 1 ? " " : null}
                  </React.Fragment>
                );
              })}
            </span>
          </React.Fragment>
        );
      })}
    </Tag>
  );
}
