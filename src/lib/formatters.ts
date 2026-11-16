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
