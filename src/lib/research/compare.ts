import {
  formatMultipleOrGap,
  formatPopulationHuman,
  formatSignedPct,
  formatUsdBnCompact,
  getEffectiveGdpUsdBn,
  hasSectorMetricValue,
} from "@/lib/formatters";
import type { CountryIntelligenceProfile } from "@/types/omnis";

export type ComparisonCategory = "economy" | "tech_energy";
export type ComparisonScaleGroup = "fair_per_capita" | "national_scale";

export interface SovereignComparisonRow {
  label: string;
  leftVal: number;
  rightVal: number;
  unit: string;
  category: ComparisonCategory;
  scaleGroup: ComparisonScaleGroup;
  scaleNote: "Total Scale" | "Per Person" | "Rate";
  deltaKind: "ratio" | "pp" | "diff";
  leftMissing?: boolean;
  rightMissing?: boolean;
}

function isMissingGrowth(country: CountryIntelligenceProfile): boolean {
  return Boolean(
    country.provenance.missingData &&
      country.gdpGrowthPct === 0 &&
      getEffectiveGdpUsdBn(country) === 0
  );
}

function isMissingRenewable(country: CountryIntelligenceProfile): boolean {
  return Boolean(country.provenance.missingData && country.energyProfile.renewableSharePct === 0);
}

/**
 * Builds the normalized comparison indicator rows for two country profiles,
 * categorizing indicators cleanly and preserving null-safety for missing upstream telemetry.
 */
export function buildSovereignComparisonMatrix(
  leftCountry: CountryIntelligenceProfile,
  rightCountry: CountryIntelligenceProfile
): SovereignComparisonRow[] {
  const leftGdp = getEffectiveGdpUsdBn(leftCountry);
  const rightGdp = getEffectiveGdpUsdBn(rightCountry);
  return [
    {
      label: "Nominal GDP ($B)",
      leftVal: leftGdp,
      rightVal: rightGdp,
      unit: "$B",
      category: "economy",
      scaleGroup: "national_scale",
      scaleNote: "Total Scale",
      deltaKind: "ratio",
      leftMissing: leftCountry.provenance.missingData && leftGdp === 0,
      rightMissing: rightCountry.provenance.missingData && rightGdp === 0,
    },
    {
      label: "GDP Per Capita ($)",
      leftVal: leftCountry.gdpPerCapitaUsd,
      rightVal: rightCountry.gdpPerCapitaUsd,
      unit: "$",
      category: "economy",
      scaleGroup: "fair_per_capita",
      scaleNote: "Per Person",
      deltaKind: "ratio",
      leftMissing: !hasSectorMetricValue(leftCountry, leftCountry.gdpPerCapitaUsd) || leftCountry.gdpPerCapitaUsd === 0,
      rightMissing: !hasSectorMetricValue(rightCountry, rightCountry.gdpPerCapitaUsd) || rightCountry.gdpPerCapitaUsd === 0,
    },
    {
      label: "Real GDP Growth (%)",
      leftVal: leftCountry.gdpGrowthPct,
      rightVal: rightCountry.gdpGrowthPct,
      unit: "%",
      category: "economy",
      scaleGroup: "fair_per_capita",
      scaleNote: "Rate",
      deltaKind: "pp",
      leftMissing: isMissingGrowth(leftCountry),
      rightMissing: isMissingGrowth(rightCountry),
    },
    {
      label: "Renewable Electricity (%)",
      leftVal: leftCountry.energyProfile.renewableSharePct,
      rightVal: rightCountry.energyProfile.renewableSharePct,
      unit: "%",
      category: "tech_energy",
      scaleGroup: "fair_per_capita",
      scaleNote: "Rate",
      deltaKind: "pp",
      leftMissing: isMissingRenewable(leftCountry),
      rightMissing: isMissingRenewable(rightCountry),
    },
    {
      label: "AI Readiness Index",
      leftVal: leftCountry.technologyProfile.aiReadinessIndex,
      rightVal: rightCountry.technologyProfile.aiReadinessIndex,
      unit: "/100",
      category: "tech_energy",
      scaleGroup: "fair_per_capita",
      scaleNote: "Rate",
      deltaKind: "diff",
      leftMissing: !hasSectorMetricValue(leftCountry, leftCountry.technologyProfile.aiReadinessIndex),
      rightMissing: !hasSectorMetricValue(rightCountry, rightCountry.technologyProfile.aiReadinessIndex),
    },
    {
      label: "R&D Intensity (% GDP)",
      leftVal: leftCountry.technologyProfile.rdSpendPctGdp,
      rightVal: rightCountry.technologyProfile.rdSpendPctGdp,
      unit: "%",
      category: "tech_energy",
      scaleGroup: "fair_per_capita",
      scaleNote: "Rate",
      deltaKind: "pp",
      leftMissing: !hasSectorMetricValue(leftCountry, leftCountry.technologyProfile.rdSpendPctGdp),
      rightMissing: !hasSectorMetricValue(rightCountry, rightCountry.technologyProfile.rdSpendPctGdp),
    },
    {
      label: "Internet Penetration (%)",
      leftVal: leftCountry.technologyProfile.internetPenetrationPct,
      rightVal: rightCountry.technologyProfile.internetPenetrationPct,
      unit: "%",
      category: "tech_energy",
      scaleGroup: "fair_per_capita",
      scaleNote: "Rate",
      deltaKind: "pp",
      leftMissing: !hasSectorMetricValue(leftCountry, leftCountry.technologyProfile.internetPenetrationPct),
      rightMissing: !hasSectorMetricValue(rightCountry, rightCountry.technologyProfile.internetPenetrationPct),
    },
    {
      label: "Life Expectancy (Years)",
      leftVal: leftCountry.lifeExpectancyYears,
      rightVal: rightCountry.lifeExpectancyYears,
      unit: "yrs",
      category: "tech_energy",
      scaleGroup: "fair_per_capita",
      scaleNote: "Per Person",
      deltaKind: "diff",
      leftMissing: !hasSectorMetricValue(leftCountry, leftCountry.lifeExpectancyYears) || leftCountry.lifeExpectancyYears < 25,
      rightMissing: !hasSectorMetricValue(rightCountry, rightCountry.lifeExpectancyYears) || rightCountry.lifeExpectancyYears < 25,
    },
    {
      label: "Total Population",
      leftVal: leftCountry.population,
      rightVal: rightCountry.population,
      unit: "pop",
      category: "economy",
      scaleGroup: "national_scale",
      scaleNote: "Total Scale",
      deltaKind: "ratio",
      leftMissing: leftCountry.population <= 0,
      rightMissing: rightCountry.population <= 0,
    },
    {
      label: "Total Electricity Output",
      leftVal: leftCountry.energyProfile.electricityGenerationTwh,
      rightVal: rightCountry.energyProfile.electricityGenerationTwh,
      unit: "TWh",
      category: "tech_energy",
      scaleGroup: "national_scale",
      scaleNote: "Total Scale",
      deltaKind: "ratio",
      leftMissing: !hasSectorMetricValue(leftCountry, leftCountry.energyProfile.electricityGenerationTwh),
      rightMissing: !hasSectorMetricValue(rightCountry, rightCountry.energyProfile.electricityGenerationTwh),
    },
    {
      label: "Total CO2 Emissions",
      leftVal: leftCountry.environmentProfile.co2EmissionsMt,
      rightVal: rightCountry.environmentProfile.co2EmissionsMt,
      unit: "Mt",
      category: "tech_energy",
      scaleGroup: "national_scale",
      scaleNote: "Total Scale",
      deltaKind: "ratio",
      leftMissing: !hasSectorMetricValue(leftCountry, leftCountry.environmentProfile.co2EmissionsMt),
      rightMissing: !hasSectorMetricValue(rightCountry, rightCountry.environmentProfile.co2EmissionsMt),
    },
  ];
}

export { formatPopulationHuman };

/**
 * Generates 3 plain-English key differences comparing two country profiles.
 */
export function buildComparisonTakeaways(
  leftCountry: CountryIntelligenceProfile,
  rightCountry: CountryIntelligenceProfile
): string[] {
  const leftGdp = getEffectiveGdpUsdBn(leftCountry);
  const rightGdp = getEffectiveGdpUsdBn(rightCountry);
  const leftHasGdp = leftGdp > 0 && !(leftCountry.provenance.missingData && leftGdp === 0);
  const rightHasGdp = rightGdp > 0 && !(rightCountry.provenance.missingData && rightGdp === 0);

  let sizeLine = `Comparing ${leftCountry.name} and ${rightCountry.name} shows contrasting national scale and income structure.`;
  if (leftHasGdp && rightHasGdp) {
    const big = leftGdp >= rightGdp ? leftCountry : rightCountry;
    const small = leftGdp >= rightGdp ? rightCountry : leftCountry;
    const sizeGap = formatMultipleOrGap(Math.max(leftGdp, rightGdp), Math.min(leftGdp, rightGdp), "ratio");
    const rich =
      leftCountry.gdpPerCapitaUsd >= rightCountry.gdpPerCapitaUsd ? leftCountry : rightCountry;
    const modest = rich === leftCountry ? rightCountry : leftCountry;
    const hasPerCap =
      leftCountry.gdpPerCapitaUsd > 0 && rightCountry.gdpPerCapitaUsd > 0;
    const perCapText = hasPerCap
      ? `, while ${rich.name} averages ${formatMultipleOrGap(
          rich.gdpPerCapitaUsd,
          modest.gdpPerCapitaUsd,
          "ratio"
        )} income per person ($${rich.gdpPerCapitaUsd.toLocaleString()} vs $${modest.gdpPerCapitaUsd.toLocaleString()})`
      : "";
    sizeLine = `${big.name} has a ${sizeGap} economy (${formatUsdBnCompact(
      getEffectiveGdpUsdBn(big)
    )} vs ${formatUsdBnCompact(getEffectiveGdpUsdBn(small))})${perCapText}.`;
  }

  const growthAvail = !isMissingGrowth(leftCountry) && !isMissingGrowth(rightCountry);
  let growthLine = `Annual GDP growth figures are still being updated for one of the two countries.`;
  if (growthAvail) {
    const faster =
      leftCountry.gdpGrowthPct >= rightCountry.gdpGrowthPct ? leftCountry : rightCountry;
    const slower = faster === leftCountry ? rightCountry : leftCountry;
    const ppGap = formatMultipleOrGap(
      faster.gdpGrowthPct,
      slower.gdpGrowthPct,
      "pp",
      "faster"
    );
    growthLine = `${faster.name} is expanding at ${formatSignedPct(
      faster.gdpGrowthPct
    )} a year compared with ${formatSignedPct(slower.gdpGrowthPct)} in ${
      slower.name
    } (${ppGap}).`;
  }

  const renAvail = !isMissingRenewable(leftCountry) && !isMissingRenewable(rightCountry);
  const rdAvail =
    hasSectorMetricValue(leftCountry, leftCountry.technologyProfile.rdSpendPctGdp) &&
    hasSectorMetricValue(rightCountry, rightCountry.technologyProfile.rdSpendPctGdp);
  let energyTechLine = `${leftCountry.name} and ${rightCountry.name} show complementary strengths across clean energy and innovation.`;
  if (renAvail && rdAvail) {
    const greener =
      leftCountry.energyProfile.renewableSharePct >= rightCountry.energyProfile.renewableSharePct
        ? leftCountry
        : rightCountry;
    const otherRen = greener === leftCountry ? rightCountry : leftCountry;
    const higherRd =
      leftCountry.technologyProfile.rdSpendPctGdp >= rightCountry.technologyProfile.rdSpendPctGdp
        ? leftCountry
        : rightCountry;
    const lowerRd = higherRd === leftCountry ? rightCountry : leftCountry;
    energyTechLine = `${greener.name} draws ${greener.energyProfile.renewableSharePct}% of its electricity from renewables (vs ${otherRen.energyProfile.renewableSharePct}% in ${otherRen.name}), while ${higherRd.name} invests ${higherRd.technologyProfile.rdSpendPctGdp}% of GDP in R&D (vs ${lowerRd.technologyProfile.rdSpendPctGdp}%).`;
  } else if (renAvail) {
    energyTechLine = `${leftCountry.name} generates ${leftCountry.energyProfile.renewableSharePct}% renewable power compared with ${rightCountry.energyProfile.renewableSharePct}% in ${rightCountry.name}.`;
  }

  return [sizeLine, growthLine, energyTechLine];
}

export interface HistoricalMultipleResult {
  multiple: number;
  multipleText: string;
  startYear: number;
  endYear: number;
  startGdpUsdBn: number;
  endGdpUsdBn: number;
}

/**
 * Computes multi-year economic expansion directly from a country's historical GDP series.
 */
export function computeHistoricalMultiple(
  country: CountryIntelligenceProfile
): HistoricalMultipleResult | null {
  const validPoints = country.historicalSeries
    .filter((pt) => Number.isFinite(pt.gdpUsdBn) && pt.gdpUsdBn > 0)
    .sort((a, b) => a.year - b.year);
  if (validPoints.length < 2) return null;

  const first = validPoints[0];
  const last = validPoints[validPoints.length - 1];
  if (last.year <= first.year || first.gdpUsdBn <= 0) return null;

  const multiple = last.gdpUsdBn / first.gdpUsdBn;
  let multipleText = "";
  if (multiple >= 1.15) {
    multipleText = `grew ${multiple.toFixed(1)}× since ${first.year}`;
  } else if (multiple <= 0.88) {
    const declinePct = Math.round((1 - multiple) * 100);
    multipleText = `shrank ${declinePct}% since ${first.year}`;
  } else {
    const pct = Math.round((multiple - 1) * 100);
    multipleText = `changed ${pct >= 0 ? "+" : ""}${pct}% since ${first.year}`;
  }

  return {
    multiple,
    multipleText,
    startYear: first.year,
    endYear: last.year,
    startGdpUsdBn: first.gdpUsdBn,
    endGdpUsdBn: last.gdpUsdBn,
  };
}
