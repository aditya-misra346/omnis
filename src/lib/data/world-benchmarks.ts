export type BenchmarkMetricKey =
  | "gdpPerCapitaUsd"
  | "gdpGrowthPct"
  | "inflationPct"
  | "publicDebtPctGdp"
  | "renewableSharePct"
  | "rdSpendPctGdp"
  | "internetPenetrationPct"
  | "lifeExpectancyYears"
  | "pm25AirQualityUgM3";

export interface GlobalBenchmarkMeta {
  label: string;
  referenceValue: number;
  unit: string;
  benchmarkText: string;
  source: string;
  kind: "ratio_currency" | "pp" | "years" | "who_pm25";
  higherIsBetter: boolean;
}

export const WORLD_BENCHMARKS: Record<BenchmarkMetricKey, GlobalBenchmarkMeta> = {
  gdpPerCapitaUsd: {
    label: "Income per person",
    referenceValue: 13900,
    unit: "USD",
    benchmarkText: "~$13,900 world average",
    source: "World Bank WDI",
    kind: "ratio_currency",
    higherIsBetter: true,
  },
  gdpGrowthPct: {
    label: "Annual GDP growth",
    referenceValue: 3.2,
    unit: "%",
    benchmarkText: "3.2% global average",
    source: "IMF World Economic Outlook",
    kind: "pp",
    higherIsBetter: true,
  },
  inflationPct: {
    label: "Annual inflation (CPI)",
    referenceValue: 4.5,
    unit: "%",
    benchmarkText: "4.5% global median",
    source: "IMF / World Bank",
    kind: "pp",
    higherIsBetter: false,
  },
  publicDebtPctGdp: {
    label: "Public debt",
    referenceValue: 64.0,
    unit: "% of GDP",
    benchmarkText: "64% global median",
    source: "IMF Fiscal Monitor",
    kind: "pp",
    higherIsBetter: false,
  },
  renewableSharePct: {
    label: "Clean electricity share",
    referenceValue: 30.2,
    unit: "%",
    benchmarkText: "30.2% global grid average",
    source: "Ember / IEA",
    kind: "pp",
    higherIsBetter: true,
  },
  rdSpendPctGdp: {
    label: "R&D spending",
    referenceValue: 2.1,
    unit: "% of GDP",
    benchmarkText: "2.1% global average",
    source: "UNESCO / World Bank",
    kind: "pp",
    higherIsBetter: true,
  },
  internetPenetrationPct: {
    label: "Internet access",
    referenceValue: 67.5,
    unit: "%",
    benchmarkText: "67.5% global average",
    source: "ITU / World Bank",
    kind: "pp",
    higherIsBetter: true,
  },
  lifeExpectancyYears: {
    label: "Life expectancy",
    referenceValue: 73.3,
    unit: "years",
    benchmarkText: "73.3 years world average",
    source: "UN DESA / World Bank",
    kind: "years",
    higherIsBetter: true,
  },
  pm25AirQualityUgM3: {
    label: "PM2.5 fine dust",
    referenceValue: 5.0,
    unit: "µg/m³",
    benchmarkText: "5 µg/m³ WHO clean-air guideline",
    source: "World Health Organization (WHO)",
    kind: "who_pm25",
    higherIsBetter: false,
  },
};

export interface BenchmarkComparisonResult {
  summary: string;
  tone: "verified" | "warning" | "neutral" | "blue";
  referenceLabel: string;
}

/**
 * Explains how a national figure compares to its global average or WHO guideline.
 */
export function describeVsBenchmark(
  metricKey: BenchmarkMetricKey,
  value: number | null | undefined
): BenchmarkComparisonResult {
  const meta = WORLD_BENCHMARKS[metricKey];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 && metricKey !== "gdpGrowthPct" && metricKey !== "inflationPct") {
    return {
      summary: `Reference: ${meta.benchmarkText}`,
      tone: "neutral",
      referenceLabel: meta.benchmarkText,
    };
  }

  if (metricKey === "gdpPerCapitaUsd" && value <= 0) {
    return {
      summary: `Reference: ${meta.benchmarkText}`,
      tone: "neutral",
      referenceLabel: meta.benchmarkText,
    };
  }

  if (meta.kind === "who_pm25") {
    if (value <= 0) {
      return {
        summary: `Reference: ${meta.benchmarkText}`,
        tone: "neutral",
        referenceLabel: meta.benchmarkText,
      };
    }
    const multiple = value / meta.referenceValue;
    if (multiple <= 1.05) {
      return {
        summary: "Meets WHO clean-air guideline (≤5 µg/m³)",
        tone: "verified",
        referenceLabel: meta.benchmarkText,
      };
    }
    if (multiple < 2.0) {
      return {
        summary: `${multiple.toFixed(1)}× WHO clean-air limit (${meta.referenceValue} µg/m³)`,
        tone: "blue",
        referenceLabel: meta.benchmarkText,
      };
    }
    return {
      summary: `${multiple.toFixed(1)}× WHO clean-air limit (${meta.referenceValue} µg/m³)`,
      tone: "warning",
      referenceLabel: meta.benchmarkText,
    };
  }

  if (meta.kind === "ratio_currency") {
    const ratio = value / meta.referenceValue;
    if (ratio >= 0.92 && ratio <= 1.08) {
      return {
        summary: `Near world avg (~$${meta.referenceValue.toLocaleString()})`,
        tone: "blue",
        referenceLabel: meta.benchmarkText,
      };
    }
    if (ratio > 1.08) {
      const label = ratio >= 1.45 ? `${ratio.toFixed(1)}× world avg` : `${Math.round((ratio - 1) * 100)}% above world avg`;
      return {
        summary: `${label} ($${meta.referenceValue.toLocaleString()})`,
        tone: "verified",
        referenceLabel: meta.benchmarkText,
      };
    }
    const belowRatio = meta.referenceValue / value;
    const label = belowRatio >= 1.45 ? `${belowRatio.toFixed(1)}× below world avg` : `${Math.round((1 - ratio) * 100)}% below world avg`;
    return {
      summary: `${label} ($${meta.referenceValue.toLocaleString()})`,
      tone: "neutral",
      referenceLabel: meta.benchmarkText,
    };
  }

  const diff = value - meta.referenceValue;
  if (meta.kind === "years") {
    if (Math.abs(diff) < 0.5) {
      return {
        summary: `Near world avg (${meta.referenceValue} yrs)`,
        tone: "blue",
        referenceLabel: meta.benchmarkText,
      };
    }
    const absYrs = Math.abs(diff).toFixed(1);
    return {
      summary: `${absYrs} yrs ${diff > 0 ? "above" : "below"} world avg (${meta.referenceValue})`,
      tone: diff > 0 ? "verified" : "warning",
      referenceLabel: meta.benchmarkText,
    };
  }

  // Percentage-point indicators
  if (Math.abs(diff) < 0.25) {
    return {
      summary: `Matches world avg (${meta.referenceValue}%)`,
      tone: "blue",
      referenceLabel: meta.benchmarkText,
    };
  }

  const sign = diff > 0 ? "+" : "";
  const formattedDiff = metricKey === "rdSpendPctGdp" ? diff.toFixed(2) : diff.toFixed(1);
  const favorable = meta.higherIsBetter ? diff > 0 : diff < 0;

  if (metricKey === "publicDebtPctGdp") {
    return {
      summary: `${sign}${formattedDiff} pp vs global median (${meta.referenceValue}%)`,
      tone: value > 95 ? "warning" : value <= 64 ? "verified" : "neutral",
      referenceLabel: meta.benchmarkText,
    };
  }

  return {
    summary: `${sign}${formattedDiff} pp vs world avg (${meta.referenceValue}%)`,
    tone: favorable ? "verified" : "warning",
    referenceLabel: meta.benchmarkText,
  };
}

export type GlossaryTermKey =
  | "CPI / Inflation"
  | "GDP Per Capita"
  | "Public Debt (% of GDP)"
  | "Foreign Investment (FDI)"
  | "Basis Points (bps)"
  | "R&D Intensity"
  | "PM2.5 Air Pollution"
  | "Index (2026 = 100)"
  | "Confidence Band (P10–P90)";

export interface GlossaryEntry {
  term: GlossaryTermKey;
  shortLabel: string;
  definition: string;
  example: string;
}

export const GLOSSARY_DEFINITIONS: Record<GlossaryTermKey, GlossaryEntry> = {
  "CPI / Inflation": {
    term: "CPI / Inflation",
    shortLabel: "Cost-of-living rise",
    definition:
      "How fast everyday prices for groceries, fuel, rent, and services rise over one year.",
    example: "4.9% inflation means a $100 weekly basket costs about $104.90 next year.",
  },
  "GDP Per Capita": {
    term: "GDP Per Capita",
    shortLabel: "Average output per person",
    definition:
      "A country's total annual economic output divided evenly across its population—a broad guide to average living standards.",
    example: "India's ~$2,700 vs Switzerland's ~$99,000 highlights why total GDP and per-person income differ.",
  },
  "Public Debt (% of GDP)": {
    term: "Public Debt (% of GDP)",
    shortLabel: "Government debt vs economy size",
    definition:
      "How much money the government owes compared with one full year of the nation's total economic output.",
    example: "80% debt-to-GDP is like owing $80,000 while earning $100,000 per year.",
  },
  "Foreign Investment (FDI)": {
    term: "Foreign Investment (FDI)",
    shortLabel: "Long-term outside investment",
    definition:
      "Money international companies invest to build factories, data centers, or local operations for the long run.",
    example: "$71B in FDI means overseas firms committed $71B into local factories and businesses that year.",
  },
  "Basis Points (bps)": {
    term: "Basis Points (bps)",
    shortLabel: "Hundredths of a percentage point",
    definition:
      "Finance shorthand where 100 basis points equals exactly 1.00 percentage point—often used for central-bank interest rate moves.",
    example: "+125 bps means raising interest rates by +1.25 percentage points (e.g., 5.00% to 6.25%).",
  },
  "R&D Intensity": {
    term: "R&D Intensity",
    shortLabel: "Share invested in science & tech",
    definition:
      "The percentage of a country's total economy spent each year on scientific research, engineering, and new inventions.",
    example: "Spending 2.5% of GDP on R&D means setting aside $2.50 of every $100 earned for innovation.",
  },
  "PM2.5 Air Pollution": {
    term: "PM2.5 Air Pollution",
    shortLabel: "Microscopic lung-penetrating dust",
    definition:
      "Tiny airborne soot and exhaust particles narrower than 2.5 microns that travel deep into lungs and the bloodstream.",
    example: "The WHO advises ≤5 µg/m³ annually; 50 µg/m³ is 10× higher than that safe guideline.",
  },
  "Index (2026 = 100)": {
    term: "Index (2026 = 100)",
    shortLabel: "Starting scale set at 100",
    definition:
      "A clean way to track percentage changes over time by setting today's starting year to 100.",
    example: "An index of 155 means total output is 55% larger than the starting level; 92 means 8% smaller.",
  },
  "Confidence Band (P10–P90)": {
    term: "Confidence Band (P10–P90)",
    shortLabel: "Middle 80% of likely futures",
    definition:
      "After testing 500 random shocks, 8 out of 10 runs land between the lower (P10) and upper (P90) edges of the shaded band.",
    example: "Only 1 in 10 modeled futures turned out weaker than P10 or stronger than P90.",
  },
};

const GLOSSARY_ALIASES: Record<string, GlossaryTermKey> = {
  cpi: "CPI / Inflation",
  inflation: "CPI / Inflation",
  "per capita": "GDP Per Capita",
  "gdp per capita": "GDP Per Capita",
  "public debt": "Public Debt (% of GDP)",
  fdi: "Foreign Investment (FDI)",
  bps: "Basis Points (bps)",
  "basis points": "Basis Points (bps)",
  rd: "R&D Intensity",
  "r&d": "R&D Intensity",
  pm25: "PM2.5 Air Pollution",
  "pm2.5": "PM2.5 Air Pollution",
  index: "Index (2026 = 100)",
  p10: "Confidence Band (P10–P90)",
  p90: "Confidence Band (P10–P90)",
};

export function resolveGlossaryTerm(keyOrAlias: string): GlossaryEntry | null {
  if (keyOrAlias in GLOSSARY_DEFINITIONS) {
    return GLOSSARY_DEFINITIONS[keyOrAlias as GlossaryTermKey];
  }
  const normalized = keyOrAlias.trim().toLowerCase();
  const mapped = GLOSSARY_ALIASES[normalized];
  return mapped ? GLOSSARY_DEFINITIONS[mapped] : null;
}

/**
 * Translates raw nominal GDP ($B) into a calm plain-English global size tier.
 */
export function describeGlobalScaleTier(gdpUsdBn: number): string | null {
  if (!Number.isFinite(gdpUsdBn) || gdpUsdBn <= 0) return null;
  if (gdpUsdBn >= 12_000) return "one of the world's two largest economies";
  if (gdpUsdBn >= 3_200) return "among the world's 10 largest economies";
  if (gdpUsdBn >= 1_000) return "among the top 20 global economies";
  if (gdpUsdBn >= 300) return "among the top 50 economies worldwide";
  return "a growing regional economy";
}
