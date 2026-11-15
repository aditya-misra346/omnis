"use client";

import React from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";

export interface OmnisParameterSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  baselineValue?: number;
  description?: string;
  accent?: "blue" | "violet";
  onChange: (nextValue: number) => void;
  onReset?: () => void;
  className?: string;
}

function roundToStep(raw: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, raw));
  const decimals = (step.toString().split(".")[1] ?? "").length;
  const snapped = Math.round((clamped - min) / step) * step + min;
  return Number(Math.min(max, Math.max(min, snapped)).toFixed(decimals));
}

export function OmnisParameterSlider({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  baselineValue,
  description,
  accent = "blue",
  onChange,
  onReset,
  className = "",
}: OmnisParameterSliderProps) {
  const span = Math.max(1e-6, max - min);
  const currentPct = ((value - min) / span) * 100;
  const baselinePct =
    baselineValue !== undefined ? ((baselineValue - min) / span) * 100 : 0;

  const fillLeft = Math.min(currentPct, baselinePct);
  const fillWidth = Math.abs(currentPct - baselinePct);
  const isModifiedFromBaseline =
    baselineValue !== undefined && Math.abs(value - baselineValue) > step * 0.25;

  const fillColor =
    accent === "violet" ? "var(--accent-violet)" : "var(--accent-blue-solid)";
  const valueToneClass = accent === "violet" ? "tone-violet" : "tone-blue";

  return (
    <div
      className={`p-3.5 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] space-y-2.5 ${className}`}
    >
      <div className="flex items-start justify-between gap-2 text-xs">
        <span className="font-semibold text-[var(--text-primary)] leading-snug">{label}</span>
        <div className="flex items-center gap-1 shrink-0">
          {onReset && isModifiedFromBaseline ? (
            <button
              type="button"
              onClick={onReset}
              title={`Reset ${label} to baseline`}
              aria-label={`Reset ${label}`}
              className="p-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-graphite)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onChange(roundToStep(value - step, min, max, step))}
            aria-label={`Decrease ${label}`}
            className="w-5 h-5 rounded flex items-center justify-center border border-[var(--border-subtle)] bg-[var(--bg-graphite)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span
            className={`px-2 py-0.5 rounded bg-[var(--bg-graphite)] border border-[var(--border-subtle)] font-bold omnis-mono omnis-tabular text-[11px] ${valueToneClass}`}
          >
            {value}
            {unit ? ` ${unit}` : ""}
          </span>
          <button
            type="button"
            onClick={() => onChange(roundToStep(value + step, min, max, step))}
            aria-label={`Increase ${label}`}
            className="w-5 h-5 rounded flex items-center justify-center border border-[var(--border-subtle)] bg-[var(--bg-graphite)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Precision track with baseline tick & accessible overlaid range input */}
      <div className="relative h-6 flex items-center">
        <div className="w-full h-1.5 rounded-full bg-[var(--bg-graphite)] border border-[var(--border-subtle)] relative overflow-hidden">
          <div
            className="absolute top-0 bottom-0 transition-all duration-100"
            style={{
              left: `${fillLeft}%`,
              width: `${fillWidth}%`,
              backgroundColor: fillColor,
            }}
          />
        </div>

        {baselineValue !== undefined ? (
          <span
            aria-hidden="true"
            title={`Baseline: ${baselineValue}${unit ? ` ${unit}` : ""}`}
            className="pointer-events-none absolute top-1 bottom-1 w-0.5 rounded-full bg-[var(--text-muted)]"
            style={{ left: `calc(${baselinePct}% - 1px)` }}
          />
        ) : null}

        <span
          aria-hidden="true"
          className="pointer-events-none absolute w-3.5 h-3.5 rounded-full bg-[var(--bg-graphite)] border-2 shadow-sm transition-transform"
          style={{
            left: `calc(${currentPct}% - 7px)`,
            borderColor: fillColor,
          }}
        />

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <div className="flex justify-between text-[10px] text-[var(--text-muted)] omnis-mono omnis-tabular">
        <span>Min: {min}</span>
        {baselineValue !== undefined ? <span>Base: {baselineValue}</span> : null}
        <span>Max: {max}</span>
      </div>

      {description ? (
        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{description}</p>
      ) : null}
    </div>
  );
}
