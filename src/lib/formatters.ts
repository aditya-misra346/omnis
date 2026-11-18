import type { CountryIntelligenceProfile } from "@/types/omnis";

/**
 * Shared numeric, signed-delta, macroeconomic currency, and provenance-truthfulness formatters.
 * Prevents double-sign artifacts (e.g. `+-1.2%`), scale-ambiguous `$k` axis ticks,
 * stale GDP displays when live WDI overrides exist, and synthetic `0` / `100% Thermal` values.
 */

function normalizeZero(value: number): number {
  return Object.is(value, -0) || Math.abs(value) < 1e-9 ? 0 : value;
}

/** Formats a signed percentage (`+6.8%`, `-1.4%`, `+0%`), guarding against `-0` and `+-` strings. */
export function formatSignedPct(value: number, decimals?: number): string {
  const safe = Number.isFinite(value) ? normalizeZero(value) : 0;
  const formatted =
    typeof decimals === "number" ? safe.toFixed(decimals) : String(Number(safe.toFixed(2)));
  return safe >= 0 ? `+${formatted}%` : `${formatted}%`;
}

/** Formats a signed scalar value with an optional unit suffix (e.g. `+1.32°C`, `-0.4`). */
export function formatSignedValue(value: number, suffix = "", decimals?: number): string {
  const safe = Number.isFinite(value) ? normalizeZero(value) : 0;
  const formatted =
    typeof decimals === "number" ? safe.toFixed(decimals) : String(Number(safe.toFixed(2)));
  return safe >= 0 ? `+${formatted}${suffix}` : `${formatted}${suffix}`;
}

/** Formats sovereign GDP expressed in USD billions compactly (`$3.9T` or `$412.5B`). */
export function formatUsdBnCompact(usdBn: number, decimals = 1): string {
  if (!Number.isFinite(usdBn)) return "$0B";
  const abs = Math.abs(usdBn);
  const sign = usdBn < 0 ? "-" : "";
  if (abs >= 1000) {
    return `${sign}$${(abs / 1000).toFixed(decimals)}T`;
  }
  return `${sign}$${abs.toLocaleString(undefined, { maximumFractionDigits: decimals })}B`;
}

/** Formats Y-axis monetary ticks cleanly without mixing `$B` trillions into `k` notation. */
export function formatMonetaryAxisTick(
  value: number,
  metric: "gdpUsdBn" | "gdpPerCapitaUsd",
  tickStep: number
): string {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (metric === "gdpUsdBn") {
    if (abs >= 1000) {
      const decimals = tickStep < 500 ? 2 : 1;
      return `${sign}$${(abs / 1000).toFixed(decimals)}T`;
    }
    const decimals = tickStep < 2 ? 1 : 0;
    return `${sign}$${abs.toFixed(decimals)}B`;
  }
  if (abs >= 1000) {
    const decimals = tickStep < 500 ? 2 : 1;
    return `${sign}$${(abs / 1000).toFixed(decimals)}k`;
  }
  return `${sign}$${abs.toFixed(tickStep < 2 ? 1 : 0)}`;
}

const CSV_FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

/**
 * Formats a CSV cell using RFC-4180 escaping and formula-injection neutralization
 * on string values while keeping finite negative numeric telemetry uncorrupted.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  const raw = String(value);
  const safe = CSV_FORMULA_PREFIX_RE.test(raw) ? `'${raw}` : raw;
  if (safe !== raw || /[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Returns the canonical nominal GDP in USD billions, preferring verified live World Bank
 * API v2 telemetry when `liveWorldBankOverride.retrievedFromApi` is present.
 */
export function getEffectiveGdpUsdBn(country: CountryIntelligenceProfile): number {
  const override = country.liveWorldBankOverride;
  if (
    override?.retrievedFromApi &&
    typeof override.gdpUsdBn === "number" &&
    Number.isFinite(override.gdpUsdBn) &&
    override.gdpUsdBn > 0
  ) {
    return override.gdpUsdBn;
  }
  return country.gdpUsdBn;
}

/**
 * Returns the latest year of verified live World Bank GDP telemetry when `retrievedFromApi` is active.
 */
export function getEffectiveGdpYear(country: CountryIntelligenceProfile): string | undefined {
  const override = country.liveWorldBankOverride;
  if (!override?.retrievedFromApi) return undefined;
  const trimmed = override.latestYear?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Returns true when a country has measured total grid generation telemetry so fossil/thermal
 * remainder shares can be derived truthfully without inventing `100% Thermal`.
 */
export function hasEnergyProfileData(country: CountryIntelligenceProfile): boolean {
  return (
    country.energyProfile.electricityGenerationTwh > 0 && !country.provenance.missingData
  );
}

/**
 * Returns true when a sector indicator represents an actual measured value rather than a
 * zero-filled placeholder on a `provenance.missingData` live skeleton profile.
 */
export function hasSectorMetricValue(
  country: CountryIntelligenceProfile,
  value: number
): boolean {
  if (!Number.isFinite(value)) return false;
  if (!country.provenance.missingData) return true;
  return value !== 0;
}

/**
 * Formats a country metric or returns `"N/A"` when the field is an unpopulated placeholder zero.
 */
export function formatCountryMetricOrNa(
  country: CountryIntelligenceProfile,
  value: number,
  formatFn: (v: number) => string,
  naLabel = "N/A"
): string {
  return hasSectorMetricValue(country, value) ? formatFn(value) : naLabel;
}

/**
 * Formats a population headcount with natural B / M scaling (`"1.44B"`, `"67.5M"`, `"480,000"`)
 * or full words in `"long"` style (`"1.44 billion"`, `"67.5 million"`).
 */
export function formatPopulationHuman(
  pop: number,
  style: "compact" | "long" = "compact"
): string {
  if (!Number.isFinite(pop) || pop <= 0) return "N/A";
  if (pop >= 1e9) {
    const billions = (pop / 1e9).toFixed(2);
    return style === "long" ? `${billions} billion` : `${billions}B`;
  }
  if (pop >= 1e6) {
    const millions = (pop / 1e6).toFixed(1);
    return style === "long" ? `${millions} million` : `${millions}M`;
  }
  return Math.round(pop).toLocaleString("en-US");
}

/**
 * Translates raw comparisons into human-readable multiples or point gaps
 * (`"4.7× larger"`, `"+2.0 percentage points faster"`, `"+11.2 pts higher"`).
 */
export function formatMultipleOrGap(
  a: number,
  b: number,
  kind: "ratio" | "pp" | "diff",
  unit = ""
): string {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return "N/A";

  if (kind === "ratio" && a > 0 && b > 0) {
    const larger = Math.max(a, b);
    const smaller = Math.min(a, b);
    const ratio = larger / smaller;
    if (ratio < 1.04) return "Roughly equal";
    if (ratio >= 1.45) {
      return `${ratio.toFixed(1)}× ${a >= b ? "larger" : "smaller"}`;
    }
    const pct = Math.round((a >= b ? a / b - 1 : 1 - a / b) * 100);
    return `${pct}% ${a >= b ? "larger" : "smaller"}`;
  }

  const delta = normalizeZero(a - b);
  if (kind === "pp") {
    if (Math.abs(delta) < 0.05) return "Same rate";
    const trimmedUnit = unit.trim();
    const resolvedUnit =
      delta < 0 && trimmedUnit === "faster"
        ? "slower"
        : delta < 0 && trimmedUnit === "higher"
          ? "lower"
          : trimmedUnit;
    const sign = delta > 0 ? "+" : "";
    return `${sign}${delta.toFixed(1)} percentage points${resolvedUnit ? ` ${resolvedUnit}` : ""}`;
  }

  if (Math.abs(delta) < 0.05) return "No gap";
  const cleanUnit = unit.trim() || "pts";
  const sign = delta > 0 ? "+" : "";
  const dir = delta >= 0 ? "higher" : "lower";
  return `${sign}${delta.toFixed(1)} ${cleanUnit} ${dir}`;
}

/**
 * Translates baseline vs modified projection index values into plain-English output deltas.
 */
export function formatIndexContext(
  baselineVal: number,
  modifiedVal: number,
  baseYear = 2026
): string {
  if (!Number.isFinite(baselineVal) || !Number.isFinite(modifiedVal) || baselineVal <= 0) {
    return "Projection unavailable";
  }
  const pctDiff = ((modifiedVal - baselineVal) / baselineVal) * 100;
  if (Math.abs(pctDiff) < 0.15) {
    return `Roughly matches baseline (${baseYear} = 100)`;
  }
  const absPct = Math.abs(pctDiff).toFixed(1);
  return pctDiff < 0
    ? `${absPct}% smaller output than staying on baseline`
    : `${absPct}% larger output than staying on baseline`;
}

/** Formats basis-point rate shifts into both percentage points and bps (`"+1.25% (+125 bps)"`). */
export function formatBasisPointsHuman(bps: number): string {
  if (!Number.isFinite(bps)) return "0.00% (0 bps)";
  const safe = normalizeZero(bps);
  if (safe === 0) return "0.00% (0 bps)";
  const sign = safe > 0 ? "+" : "";
  return `${sign}${(safe / 100).toFixed(2)}% (${sign}${Math.round(safe)} bps)`;
}

const RELATIONSHIP_LABELS: Record<string, { label: string; verb: string }> = {
  DEPENDS_ON: { label: "Depends on", verb: "depends on" },
  CAUSES: { label: "Causes", verb: "causes" },
  INFLUENCES: { label: "Influences", verb: "influences" },
  REGULATES: { label: "Regulates", verb: "regulates" },
  COMPETES_WITH: { label: "Competes with", verb: "competes with" },
  PART_OF: { label: "Part of", verb: "is part of" },
  SUPPORTS: { label: "Supports", verb: "supports" },
  DEVELOPED_BY: { label: "Built by", verb: "was built by" },
  HISTORICALLY_PRECEDED: { label: "Led to", verb: "preceded" },
  RELATED_TO: { label: "Related to", verb: "relates to" },
  REQUIRES: { label: "Requires", verb: "requires" },
  AMPLIFIES: { label: "Amplifies", verb: "amplifies" },
  MITIGATES: { label: "Mitigates", verb: "mitigates" },
  ACCELERATES: { label: "Accelerates", verb: "accelerates" },
  CONSTRAINS: { label: "Limits", verb: "limits" },
};

/** Converts uppercase graph relationship enums into plain English pill labels. */
export function formatRelationshipLabel(relType: string): string {
  const key = relType.trim().toUpperCase();
  if (RELATIONSHIP_LABELS[key]) return RELATIONSHIP_LABELS[key].label;
  const spaced = key.replace(/_/g, " ").toLowerCase();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : "Related to";
}

/** Formats a directed graph edge as a readable English sentence. */
export function formatRelationshipSentence(
  sourceLabel: string,
  relType: string,
  targetLabel: string
): string {
  const key = relType.trim().toUpperCase();
  const verb = RELATIONSHIP_LABELS[key]?.verb ?? key.replace(/_/g, " ").toLowerCase();
  return `${sourceLabel.trim()} ${verb || "relates to"} ${targetLabel.trim()}`;
}
