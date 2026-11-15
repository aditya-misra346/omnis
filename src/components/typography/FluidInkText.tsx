"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import {
  getSharedFluidInkEngine,
  type CachedGlyphMetric,
  type GlyphSpringTransform,
} from "@/lib/typography/fluid-ink-engine";

export interface FluidInkTextProps {
  text: string;
  className?: string;
  glyphClassName?: string;
  /** Render using OMNIS editorial serif italic font */
  editorial?: boolean;
  /** Optional external per-glyph transforms synced from an enclosing ElasticMagneticText */
  externalTransformsRef?: React.MutableRefObject<GlyphSpringTransform[]>;
  /** Callback to expose per-glyph DOM spans to a parent spring controller */
  onGlyphElementsReady?: (elements: HTMLSpanElement[]) => void;
  /** Accessible label for the enclosing text phrase */
  ariaLabel?: string;
}

const DEFAULT_TRANSFORMS: GlyphSpringTransform[] = [];

export function FluidInkText({
  text,
  className = "",
  glyphClassName = "",
  editorial = false,
  externalTransformsRef,
  onGlyphElementsReady,
  ariaLabel,
}: FluidInkTextProps) {
  const reactId = useId();
  const targetId = `fluid-ink-${reactId}`;
  const { theme, motionPaused } = useOmnisStore();

  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const mirrorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const glyphSpanRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const metricsCacheRef = useRef<CachedGlyphMetric[]>([]);
  const measureCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const fallbackTransformsRef = useRef<GlyphSpringTransform[]>(DEFAULT_TRANSFORMS);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const onGlyphElementsReadyRef = useRef(onGlyphElementsReady);
  onGlyphElementsReadyRef.current = onGlyphElementsReady;

  const [inkReady, setInkReady] = useState(false);

  const words = useMemo(() => text.split(" "), [text]);

  const flatChars = useMemo(() => {
    const out: { wordIndex: number; char: string; flatIndex: number }[] = [];
    let flatIdx = 0;
    words.forEach((word, wIdx) => {
      for (const char of Array.from(word)) {
        out.push({ wordIndex: wIdx, char, flatIndex: flatIdx++ });
      }
    });
    return out;
  }, [words]);

  const computeMetrics = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    if (!measureCtxRef.current && typeof document !== "undefined") {
      const scratch = document.createElement("canvas");
      measureCtxRef.current = scratch.getContext("2d");
    }
    const mCtx = measureCtxRef.current;
    if (!mCtx) return;

    const spans = glyphSpanRefs.current.filter((el): el is HTMLSpanElement => el !== null);
    if (spans.length === 0) return;

    const savedTransforms = spans.map((s) => s.style.transform);
    for (const s of spans) {
      s.style.transform = "";
    }

    const wrapRect = wrapper.getBoundingClientRect();
    const firstCs = window.getComputedStyle(spans[0]);
    const fontString = `${firstCs.fontStyle} ${firstCs.fontWeight} ${firstCs.fontSize} ${firstCs.fontFamily}`;
    const fontSizePx = parseFloat(firstCs.fontSize) || 48;

    mCtx.font = fontString;
    mCtx.textBaseline = "alphabetic";
    const sampleMetrics = mCtx.measureText("Mpg");
    const fontAscent = sampleMetrics.fontBoundingBoxAscent || fontSizePx * 0.82;
    const fontDescent = sampleMetrics.fontBoundingBoxDescent || fontSizePx * 0.22;

    const nextMetrics: CachedGlyphMetric[] = spans.map((el) => {
      const r = el.getBoundingClientRect();
      const baseLeft = r.left - wrapRect.left;
      const baseTop = r.top - wrapRect.top;
      const pivotX = baseLeft + r.width * 0.5;
      const pivotY = baseTop + r.height * 0.75;
      const baselineOffsetY = (fontAscent - fontDescent) * 0.5 - r.height * 0.25;

      return {
        char: el.textContent ?? "",
        pivotX,
        pivotY,
        baselineOffsetY,
        fontString,
      };
    });

    spans.forEach((s, idx) => {
      s.style.transform = savedTransforms[idx] ?? "";
    });

    metricsCacheRef.current = nextMetrics;
  }, []);

  // Expose mounted glyph elements to enclosing ElasticMagneticText
  useEffect(() => {
    glyphSpanRefs.current.length = flatChars.length;
    const cb = onGlyphElementsReadyRef.current;
    if (!cb) return;
    const elements = glyphSpanRefs.current.filter((el): el is HTMLSpanElement => el !== null);
    cb(elements);
  }, [text, flatChars.length]);

  // Register target with shared reference-counted WebGL2 fluid ink engine
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const mirror = mirrorCanvasRef.current;
    if (!wrapper || !mirror) return;

    const engine = getSharedFluidInkEngine();
    computeMetrics();

    const unregister = engine.register({
      id: targetId,
      wrapperEl: wrapper,
      mirrorCanvas: mirror,
      getGlyphMetrics: () => metricsCacheRef.current,
      getTransforms: () =>
        externalTransformsRef ? externalTransformsRef.current : fallbackTransformsRef.current,
      onReadyChange: (ready) => setInkReady(ready),
    });

    const onFontAndResize = () => {
      computeMetrics();
      engine.notifyLayoutChanged(targetId);
    };

    const ro = new ResizeObserver(onFontAndResize);
    ro.observe(wrapper);

    let cancelled = false;
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) onFontAndResize();
      });
    }

    return () => {
      cancelled = true;
      ro.disconnect();
      unregister();
    };
  }, [targetId, text, computeMetrics, externalTransformsRef]);

  // Keep shared fluid ink theme & motion pause synced
  useEffect(() => {
    const engine = getSharedFluidInkEngine();
    engine.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    const engine = getSharedFluidInkEngine();
    engine.setMotionPaused(motionPaused);
  }, [motionPaused]);

  const baseGlyphOffsetByWord = useMemo(() => {
    const offsets: number[] = [];
    let acc = 0;
    for (const w of words) {
      offsets.push(acc);
      acc += Array.from(w).length;
    }
    return offsets;
  }, [words]);

  const handleTouchPulse = useCallback(
    (e: React.TouchEvent<HTMLSpanElement>, isStart: boolean) => {
      if (motionPaused) return;
      const touch = e.touches[0];
      const wrapper = wrapperRef.current;
      if (!touch || !wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const u = (touch.clientX - rect.left) / rect.width;
      const v = 1.0 - (touch.clientY - rect.top) / rect.height;
      const prev = lastTouchRef.current;
      const dx = !isStart && prev ? Math.max(-18, Math.min(18, touch.clientX - prev.x)) * 0.16 : 0.45;
      const dy = !isStart && prev ? Math.max(-18, Math.min(18, -(touch.clientY - prev.y))) * 0.16 : 0.35;
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };

      getSharedFluidInkEngine().pulseTouchWave(u, v, dx, dy);
    },
    [motionPaused]
  );

  return (
    <span
      ref={wrapperRef}
      data-ink="fluid"
      data-ink-ready={inkReady && !motionPaused ? "true" : "false"}
      aria-label={ariaLabel ?? text}
      onTouchStart={(e) => handleTouchPulse(e, true)}
      onTouchMove={(e) => handleTouchPulse(e, false)}
      onTouchEnd={() => {
        lastTouchRef.current = null;
      }}
      className={`relative inline-block pr-[0.08em] ${
        editorial ? "omnis-editorial text-[1.09em] leading-[1.02]" : ""
      } ${className}`}
    >
      {/* Real selectable DOM glyphs with crisp CSS gradient fallback */}
      <span className="omnis-ink-glyphs relative z-10 inline">
        {words.map((word, wIdx) => {
          const chars = Array.from(word);
          const startIdx = baseGlyphOffsetByWord[wIdx] ?? 0;
          return (
            <React.Fragment key={`${wIdx}-${word}`}>
              <span className="inline-block whitespace-nowrap">
                {chars.map((char, cIdx) => {
                  const globalIdx = startIdx + cIdx;
                  return (
                    <span
                      key={`${globalIdx}-${char}`}
                      ref={(el) => {
                        glyphSpanRefs.current[globalIdx] = el;
                      }}
                      aria-hidden="true"
                      className={`inline-block origin-[50%_75%] will-change-transform omnis-gradient-text ${glyphClassName}`}
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

      {/* Scoped 2D mirror canvas strictly bound inside this phrase's container */}
      <canvas
        ref={mirrorCanvasRef}
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-20 w-full h-full transition-opacity duration-200 ${
          inkReady && !motionPaused ? "opacity-100" : "opacity-0"
        }`}
      />
    </span>
  );
}

export type { FluidInkTextProps as OmnisFluidInkTextProps };
