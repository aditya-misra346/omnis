import { getEffectiveGdpUsdBn, hasSectorMetricValue } from "@/lib/formatters";
import type { CountryIntelligenceProfile } from "@/types/omnis";

export interface SovereignComparisonRow {
  label: string;
  leftVal: number;
  rightVal: number;
  unit: string;
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
 * Builds the normalized comparison indicator rows for two sovereign profiles,
 * keeping each indicator strictly scoped to its respective country and marking unfetched missing fields.
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
      leftMissing: leftCountry.provenance.missingData && leftGdp === 0,
      rightMissing: rightCountry.provenance.missingData && rightGdp === 0,
    },
    {
      label: "GDP Per Capita ($)",
      leftVal: leftCountry.gdpPerCapitaUsd,
      rightVal: rightCountry.gdpPerCapitaUsd,
      unit: "$",
      leftMissing: !hasSectorMetricValue(leftCountry, leftCountry.gdpPerCapitaUsd) || leftCountry.gdpPerCapitaUsd === 0,
      rightMissing: !hasSectorMetricValue(rightCountry, rightCountry.gdpPerCapitaUsd) || rightCountry.gdpPerCapitaUsd === 0,
    },
    {
      label: "Real GDP Growth (%)",
      leftVal: leftCountry.gdpGrowthPct,
      rightVal: rightCountry.gdpGrowthPct,
      unit: "%",
      leftMissing: isMissingGrowth(leftCountry),
      rightMissing: isMissingGrowth(rightCountry),
    },
    {
      label: "Renewable Electricity (%)",
      leftVal: leftCountry.energyProfile.renewableSharePct,
      rightVal: rightCountry.energyProfile.renewableSharePct,
      unit: "%",
      leftMissing: isMissingRenewable(leftCountry),
      rightMissing: isMissingRenewable(rightCountry),
    },
    {
      label: "AI Readiness Index",
      leftVal: leftCountry.technologyProfile.aiReadinessIndex,
      rightVal: rightCountry.technologyProfile.aiReadinessIndex,
      unit: "/100",
      leftMissing: !hasSectorMetricValue(leftCountry, leftCountry.technologyProfile.aiReadinessIndex),
      rightMissing: !hasSectorMetricValue(rightCountry, rightCountry.technologyProfile.aiReadinessIndex),
    },
    {
      label: "R&D Intensity (% GDP)",
      leftVal: leftCountry.technologyProfile.rdSpendPctGdp,
      rightVal: rightCountry.technologyProfile.rdSpendPctGdp,
      unit: "%",
      leftMissing: !hasSectorMetricValue(leftCountry, leftCountry.technologyProfile.rdSpendPctGdp),
      rightMissing: !hasSectorMetricValue(rightCountry, rightCountry.technologyProfile.rdSpendPctGdp),
    },
    {
      label: "Internet Penetration (%)",
      leftVal: leftCountry.technologyProfile.internetPenetrationPct,
      rightVal: rightCountry.technologyProfile.internetPenetrationPct,
      unit: "%",
      leftMissing: !hasSectorMetricValue(leftCountry, leftCountry.technologyProfile.internetPenetrationPct),
      rightMissing: !hasSectorMetricValue(rightCountry, rightCountry.technologyProfile.internetPenetrationPct),
    },
    {
      label: "Life Expectancy (Years)",
      leftVal: leftCountry.lifeExpectancyYears,
      rightVal: rightCountry.lifeExpectancyYears,
      unit: "yrs",
      leftMissing: !hasSectorMetricValue(leftCountry, leftCountry.lifeExpectancyYears) || leftCountry.lifeExpectancyYears < 25,
      rightMissing: !hasSectorMetricValue(rightCountry, rightCountry.lifeExpectancyYears) || rightCountry.lifeExpectancyYears < 25,
    },
  ];
}
