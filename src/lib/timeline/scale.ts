import type { HistoricalEventItem } from "@/types/omnis";

/**
 * Piecewise temporal compression across 5,000+ years (-3000 BCE to 2026 CE):
 * - 3000 BCE .. 500 CE   ->  0% .. 22%
 * - 500 CE   .. 1800 CE  -> 22% .. 45%
 * - 1800 CE  .. 2026 CE  -> 45% .. 100% (expanded modern resolution)
 */
export function mapYearToTimelinePercent(yearNumeric: number): number {
  const y = Math.max(-3000, Math.min(2026, yearNumeric));
  if (y <= 500) {
    return ((y - -3000) / 3500) * 22;
  }
  if (y <= 1800) {
    return 22 + ((y - 500) / 1300) * 23;
  }
  return 45 + ((y - 1800) / 226) * 55;
}

export function findNearestEventByPercent<T extends Pick<HistoricalEventItem, "yearNumeric">>(
  events: T[],
  percent: number
): T | null {
  if (events.length === 0) return null;
  const clamped = Math.max(0, Math.min(100, percent));
  let best = events[0];
  let bestDist = Infinity;
  for (const evt of events) {
    const pos = mapYearToTimelinePercent(evt.yearNumeric);
    const d = Math.abs(pos - clamped);
    if (d < bestDist) {
      bestDist = d;
      best = evt;
    }
  }
  return best;
}
