import type { CountryIntelligenceProfile } from "@/types/omnis";

export interface SovereignComparisonRow {
  label: string;
  leftVal: number;
  rightVal: number;
  unit: string;
}

/**
 * Builds the normalized comparison indicator rows for two sovereign profiles,
 * keeping each indicator strictly scoped to its respective country.
 */
export function buildSovereignComparisonMatrix(
  leftCountry: CountryIntelligenceProfile,
  rightCountry: CountryIntelligenceProfile
): SovereignComparisonRow[] {
  return [
    {
      label: "Nominal GDP ($B)",
      leftVal: leftCountry.gdpUsdBn,
      rightVal: rightCountry.gdpUsdBn,
      unit: "$B",
    },
    {
      label: "GDP Per Capita ($)",
      leftVal: leftCountry.gdpPerCapitaUsd,
      rightVal: rightCountry.gdpPerCapitaUsd,
      unit: "$",
    },
    {
      label: "Real GDP Growth (%)",
      leftVal: leftCountry.gdpGrowthPct,
      rightVal: rightCountry.gdpGrowthPct,
      unit: "%",
    },
    {
      label: "Renewable Electricity (%)",
      leftVal: leftCountry.energyProfile.renewableSharePct,
      rightVal: rightCountry.energyProfile.renewableSharePct,
      unit: "%",
    },
    {
      label: "AI Readiness Index",
      leftVal: leftCountry.technologyProfile.aiReadinessIndex,
      rightVal: rightCountry.technologyProfile.aiReadinessIndex,
      unit: "/100",
    },
    {
      label: "R&D Intensity (% GDP)",
      leftVal: leftCountry.technologyProfile.rdSpendPctGdp,
      rightVal: rightCountry.technologyProfile.rdSpendPctGdp,
      unit: "%",
    },
    {
      label: "Internet Penetration (%)",
      leftVal: leftCountry.technologyProfile.internetPenetrationPct,
      rightVal: rightCountry.technologyProfile.internetPenetrationPct,
      unit: "%",
    },
    {
      label: "Life Expectancy (Years)",
      leftVal: leftCountry.lifeExpectancyYears,
      rightVal: rightCountry.lifeExpectancyYears,
      unit: "yrs",
    },
  ];
}
