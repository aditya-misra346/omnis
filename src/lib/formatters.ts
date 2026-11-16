/**
 * Shared numeric, signed-delta, and macroeconomic currency formatters.
 * Prevents double-sign artifacts (e.g. `+-1.2%`) and scale-ambiguous `$k` axis ticks.
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
