"use client";

import React from "react";
import { RotateCcw, Sun } from "lucide-react";
import {
  dateFromUtcMinutes,
  formatUtcClock,
  getCountrySolarState,
  getTimeZoneForCountry,
  useLiveUtcClock,
  type SolarPhase,
} from "@/lib/solarTime";

const PHASE_SYMBOL_COLOR: Record<SolarPhase, string> = {
  Daylight: "tone-warning",
  "Golden Hour": "tone-warning",
  "Civil Twilight": "tone-blue",
  "Nautical Dusk": "tone-violet",
  Night: "text-[var(--text-muted)]",
};

interface SolarSyncHudControlProps {
  isScrubbing: boolean;
  scrubMinutes: number;
  utcScrubberOpen: boolean;
  onToggleExpand: () => void;
  onScrubMinutes: (mins: number) => void;
  onResetToLive: () => void;
}

export const SolarSyncHudControl = React.memo(function SolarSyncHudControl({
  isScrubbing,
  scrubMinutes,
  utcScrubberOpen,
  onToggleExpand,
  onScrubMinutes,
  onResetToLive,
}: SolarSyncHudControlProps) {
  const liveNow = useLiveUtcClock(1000);

  const sliderValue = isScrubbing
    ? scrubMinutes
    : liveNow
      ? liveNow.getUTCHours() * 60 + liveNow.getUTCMinutes()
      : 720;

  const displayClock = isScrubbing
    ? formatUtcClock(dateFromUtcMinutes(scrubMinutes, liveNow ?? new Date()), false)
    : liveNow
      ? formatUtcClock(liveNow, true)
      : "--:--:-- UTC";

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-lg bg-[var(--bg-slate)]/85 border border-[var(--border-subtle)] backdrop-blur-md">
      <button
        type="button"
        onClick={onToggleExpand}
        title={
          isScrubbing
            ? "24h Solar Scrub active (Click to toggle timeline slider)"
            : "Live astronomical UTC solar terminator sync (Click to scrub 24h orbit)"
        }
        aria-label="Orbital UTC Solar Terminator Scrubber"
        className="min-h-[44px] sm:min-h-[30px] inline-flex items-center gap-1.5 px-1 rounded-md hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
      >
        <span
          aria-hidden="true"
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            isScrubbing ? "bg-amber-400" : "bg-emerald-500 animate-pulse"
          }`}
        />
        <Sun className="w-3.5 h-3.5 tone-warning shrink-0" />
        <span className="hidden @[780px]:inline text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] omnis-mono whitespace-nowrap">
          {isScrubbing ? "24h Solar Scrub" : "Live Solar Sync"} ·
        </span>
        <span className="text-xs omnis-mono omnis-tabular font-semibold text-[var(--text-primary)] whitespace-nowrap">
          {displayClock}
        </span>
      </button>

      <input
        type="range"
        min={0}
        max={1425}
        step={15}
        value={sliderValue}
        onChange={(e) => onScrubMinutes(Number(e.target.value))}
        aria-label="Orbital UTC Time Angle"
        title={`24h UTC solar longitude scrubber (${Math.floor(sliderValue / 60)
          .toString()
          .padStart(2, "0")}:${(sliderValue % 60).toString().padStart(2, "0")} UTC)`}
        className={`${
          utcScrubberOpen || isScrubbing
            ? "block w-16 sm:w-20 min-h-[44px] sm:min-h-0 py-3 sm:py-0"
            : "hidden md:block w-14 @[780px]:w-20"
        } h-1.5 cursor-pointer accent-amber-400`}
      />

      {isScrubbing ? (
        <button
          type="button"
          onClick={onResetToLive}
          aria-label="Reset solar terminator to live UTC"
          title="Reset to Live UTC"
          className="min-h-[44px] min-w-[44px] sm:min-h-[26px] sm:min-w-0 inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-md badge-tone-warning hover:opacity-90 text-[11px] font-bold cursor-pointer transition-opacity whitespace-nowrap"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Live UTC</span>
        </button>
      ) : null}
    </div>
  );
});

interface CountrySolarClockBadgeProps {
  iso3: string;
  lat: number;
  lng: number;
  overrideDate?: Date | null;
  variant?: "pill" | "compact";
  className?: string;
}

export const CountrySolarClockBadge = React.memo(function CountrySolarClockBadge({
  iso3,
  lat,
  lng,
  overrideDate = null,
  variant = "pill",
  className = "",
}: CountrySolarClockBadgeProps) {
  const liveNow = useLiveUtcClock(overrideDate ? 60_000 : 1000);
  const effectiveDate = overrideDate ?? liveNow;

  if (!effectiveDate) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 omnis-mono omnis-tabular text-[var(--text-secondary)] ${
          variant === "pill"
            ? "px-2.5 py-0.5 rounded-md bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs"
            : "text-[11px]"
        } ${className}`}
      >
        <span aria-hidden="true">☀</span>
        <span>--:-- · Solar Sync</span>
      </span>
    );
  }

  const timeZone = getTimeZoneForCountry(iso3, lng);
  const solar = getCountrySolarState(lat, lng, timeZone, effectiveDate);
  const symbolTone = PHASE_SYMBOL_COLOR[solar.phase];
  const zoneTag =
    solar.tzShortName !== solar.utcOffsetLabel
      ? `${solar.tzShortName} · ${solar.utcOffsetLabel}`
      : solar.utcOffsetLabel;

  if (variant === "compact") {
    return (
      <div
        className={`inline-flex flex-wrap items-center gap-1.5 text-[11px] omnis-mono omnis-tabular text-[var(--text-secondary)] ${className}`}
      >
        <span aria-hidden="true" className={`font-bold ${symbolTone}`}>
          {solar.symbol}
        </span>
        <span className="font-semibold text-[var(--text-primary)]">{solar.formattedTime}</span>
        <span className="text-[var(--text-muted)]">{solar.utcOffsetLabel}</span>
        <span className="text-[var(--text-muted)]">•</span>
        <span className="font-medium">{solar.phase}</span>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs omnis-mono omnis-tabular text-[var(--text-primary)] ${className}`}
      title={`Local astronomical clock (${solar.timeZone}, solar altitude ${solar.altitudeDeg.toFixed(1)}°)`}
    >
      <span aria-hidden="true" className={`font-bold ${symbolTone}`}>
        {solar.symbol}
      </span>
      <span className="font-bold">{solar.formattedTime}</span>
      <span className="text-[var(--text-secondary)]">{zoneTag}</span>
      <span className="text-[var(--text-muted)]">·</span>
      <span className="font-semibold text-[var(--text-secondary)]">{solar.phase}</span>
    </span>
  );
});
