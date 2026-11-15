import { geoCentroid } from "d3-geo";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";
import { COUNTRIES_DATA } from "@/lib/data/global-intelligence";
import type { CountryIntelligenceProfile } from "@/types/omnis";

export const ISO3_TO_NUMERIC: Record<string, string> = {
  AFG: "004",
  AGO: "024",
  ALB: "008",
  ARE: "784",
  ARG: "032",
  ARM: "051",
  AUS: "036",
  AUT: "040",
  AZE: "031",
  BEL: "056",
  BGD: "050",
  BGR: "100",
  BIH: "070",
  BLR: "112",
  BOL: "068",
  BRA: "076",
  BWA: "072",
  CAN: "124",
  CHE: "756",
  CHL: "152",
  CHN: "156",
  CIV: "384",
  CMR: "120",
  COD: "180",
  COG: "178",
  COL: "170",
  CRI: "188",
  CUB: "192",
  CYP: "196",
  CZE: "203",
  DEU: "276",
  DNK: "208",
  DOM: "214",
  DZA: "012",
  ECU: "218",
  EGY: "818",
  ESP: "724",
  EST: "233",
  ETH: "231",
  FIN: "246",
  FJI: "242",
  FRA: "250",
  GBR: "826",
  GEO: "268",
  GHA: "288",
  GRC: "300",
  GRL: "304",
  GTM: "320",
  HND: "340",
  HRV: "191",
  HUN: "348",
  IDN: "360",
  IND: "356",
  IRL: "372",
  IRN: "364",
  IRQ: "368",
  ISL: "352",
  ISR: "376",
  ITA: "380",
  JAM: "388",
  JOR: "400",
  JPN: "392",
  KAZ: "398",
  KEN: "404",
  KHM: "116",
  KOR: "410",
  KWT: "414",
  LAO: "418",
  LBN: "422",
  LBY: "434",
  LKA: "144",
  LTU: "440",
  LUX: "442",
  LVA: "428",
  MAR: "504",
  MDA: "498",
  MDG: "450",
  MEX: "484",
  MLI: "466",
  MMR: "104",
  MNG: "496",
  MOZ: "508",
  MYS: "458",
  NAM: "516",
  NER: "562",
  NGA: "566",
  NLD: "528",
  NOR: "578",
  NPL: "524",
  NZL: "554",
  OMN: "512",
  PAK: "586",
  PAN: "591",
  PER: "604",
  PHL: "608",
  PNG: "598",
  POL: "616",
  PRK: "408",
  PRT: "620",
  PRY: "600",
  QAT: "634",
  ROU: "642",
  RUS: "643",
  RWA: "646",
  SAU: "682",
  SDN: "729",
  SEN: "686",
  SGP: "702",
  SRB: "688",
  SVK: "703",
  SVN: "705",
  SWE: "752",
  SYR: "760",
  THA: "764",
  TUN: "788",
  TUR: "792",
  TWN: "158",
  TZA: "834",
  UGA: "800",
  UKR: "804",
  URY: "858",
  USA: "840",
  UZB: "860",
  VEN: "862",
  VNM: "704",
  YEM: "887",
  ZAF: "710",
  ZMB: "894",
  ZWE: "716",
};

export const NUMERIC_TO_ISO3: Record<string, string> = Object.fromEntries(
  Object.entries(ISO3_TO_NUMERIC).map(([iso3, numId]) => [numId, iso3])
);

const ISO3_TO_ISO2: Record<string, string> = {
  AFG: "AF", AGO: "AO", ALB: "AL", ARE: "AE", ARG: "AR", ARM: "AM", AUS: "AU",
  AUT: "AT", AZE: "AZ", BEL: "BE", BGD: "BD", BGR: "BG", BIH: "BA", BLR: "BY",
  BOL: "BO", BRA: "BR", BWA: "BW", CAN: "CA", CHE: "CH", CHL: "CL", CHN: "CN",
  CIV: "CI", CMR: "CM", COD: "CD", COG: "CG", COL: "CO", CRI: "CR", CUB: "CU",
  CYP: "CY", CZE: "CZ", DEU: "DE", DNK: "DK", DOM: "DO", DZA: "DZ", ECU: "EC",
  EGY: "EG", ESP: "ES", EST: "EE", ETH: "ET", FIN: "FI", FJI: "FJ", FRA: "FR",
  GBR: "GB", GEO: "GE", GHA: "GH", GRC: "GR", GRL: "GL", GTM: "GT", HND: "HN",
  HRV: "HR", HUN: "HU", IDN: "ID", IND: "IN", IRL: "IE", IRN: "IR", IRQ: "IQ",
  ISL: "IS", ISR: "IL", ITA: "IT", JAM: "JM", JOR: "JO", JPN: "JP", KAZ: "KZ",
  KEN: "KE", KHM: "KH", KOR: "KR", KWT: "KW", LAO: "LA", LBN: "LB", LBY: "LY",
  LKA: "LK", LTU: "LT", LUX: "LU", LVA: "LV", MAR: "MA", MDA: "MD", MDG: "MG",
  MEX: "MX", MLI: "ML", MMR: "MM", MNG: "MN", MOZ: "MZ", MYS: "MY", NAM: "NA",
  NER: "NE", NGA: "NG", NLD: "NL", NOR: "NO", NPL: "NP", NZL: "NZ", OMN: "OM",
  PAK: "PK", PAN: "PA", PER: "PE", PHL: "PH", PNG: "PG", POL: "PL", PRK: "KP",
  PRT: "PT", PRY: "PY", QAT: "QA", ROU: "RO", RUS: "RU", RWA: "RW", SAU: "SA",
  SDN: "SD", SEN: "SN", SGP: "SG", SRB: "RS", SVK: "SK", SVN: "SI", SWE: "SE",
  SYR: "SY", THA: "TH", TUN: "TN", TUR: "TR", TWN: "TW", TZA: "TZ", UGA: "UG",
  UKR: "UA", URY: "UY", USA: "US", UZB: "UZ", VEN: "VE", VNM: "VN", YEM: "YE",
  ZAF: "ZA", ZMB: "ZM", ZWE: "ZW",
};

function iso2ToFlag(iso2: string): string {
  const clean = iso2.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(clean)) return "🌐";
  return String.fromCodePoint(
    0x1f1e6 + (clean.charCodeAt(0) - 65),
    0x1f1e6 + (clean.charCodeAt(1) - 65)
  );
}

export interface WorldCountryCatalogEntry {
  iso3: string;
  iso2: string;
  name: string;
  flagEmoji: string;
  region: string;
  lat: number;
  lng: number;
  curated: boolean;
}

const atlasCollection = feature(
  worldAtlas as unknown as Parameters<typeof feature>[0],
  (worldAtlas as unknown as { objects: { countries: Parameters<typeof feature>[1] } }).objects
    .countries
) as unknown as GeoJSON.FeatureCollection<GeoJSON.Geometry, { name?: string }>;

const catalogByIso3 = new Map<string, WorldCountryCatalogEntry>();

for (const c of Object.values(COUNTRIES_DATA)) {
  catalogByIso3.set(c.iso3, {
    iso3: c.iso3,
    iso2: c.iso2,
    name: c.name,
    flagEmoji: c.flagEmoji,
    region: c.region,
    lat: c.lat,
    lng: c.lng,
    curated: true,
  });
}

for (const feat of atlasCollection.features) {
  const numId = String(feat.id ?? "").padStart(3, "0");
  const iso3 = NUMERIC_TO_ISO3[numId];
  if (!iso3 || catalogByIso3.has(iso3)) continue;
  const [lng, lat] = geoCentroid(feat);
  const iso2 = ISO3_TO_ISO2[iso3] ?? iso3.slice(0, 2);
  catalogByIso3.set(iso3, {
    iso3,
    iso2,
    name: feat.properties?.name || iso3,
    flagEmoji: iso2ToFlag(iso2),
    region: "Global Atlas",
    lat: Number.isFinite(lat) ? lat : 0,
    lng: Number.isFinite(lng) ? lng : 0,
    curated: false,
  });
}

for (const [iso3, iso2] of Object.entries(ISO3_TO_ISO2)) {
  if (!catalogByIso3.has(iso3)) {
    catalogByIso3.set(iso3, {
      iso3,
      iso2,
      name: iso3,
      flagEmoji: iso2ToFlag(iso2),
      region: "Global Atlas",
      lat: 0,
      lng: 0,
      curated: false,
    });
  }
}

export const WORLD_COUNTRIES_CATALOG: WorldCountryCatalogEntry[] = Array.from(
  catalogByIso3.values()
).sort((a, b) => {
  if (a.curated !== b.curated) return a.curated ? -1 : 1;
  return a.name.localeCompare(b.name);
});

export const WORLD_CATALOG_BY_ISO3: Record<string, WorldCountryCatalogEntry> =
  Object.fromEntries(WORLD_COUNTRIES_CATALOG.map((entry) => [entry.iso3, entry]));

/**
 * Construct a minimal honest placeholder CountryIntelligenceProfile for UI rendering
 * while /api/v1/countries/[iso3] hydrates live REST Countries + World Bank telemetry.
 */
export function buildPlaceholderCountryProfile(iso3: string): CountryIntelligenceProfile | null {
  const code = iso3.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return null;
  if (COUNTRIES_DATA[code]) return COUNTRIES_DATA[code];
  const entry = WORLD_CATALOG_BY_ISO3[code];
  const iso2 = entry?.iso2 ?? ISO3_TO_ISO2[code] ?? code.slice(0, 2);
  const name = entry?.name ?? code;
  const nowIso = new Date().toISOString();

  return {
    iso3: code,
    iso2,
    name,
    officialName: name,
    flagEmoji: entry?.flagEmoji ?? iso2ToFlag(iso2),
    capital: "Hydrating…",
    region: entry?.region ?? "Global",
    subregion: "Live Hydration Pending",
    lat: entry?.lat ?? 0,
    lng: entry?.lng ?? 0,
    population: 0,
    populationDensityPerSqKm: 0,
    medianAgeYears: 0,
    urbanisationPct: 0,
    lifeExpectancyYears: 0,
    netMigrationPer1000: 0,
    areaSqKm: 0,
    languages: [],
    currency: "Hydrating…",
    governmentStructure: "Awaiting live hydration",
    headOfStateNote: "Awaiting live hydration",
    gdpUsdBn: 0,
    gdpPerCapitaUsd: 0,
    gdpGrowthPct: 0,
    inflationPct: 0,
    unemploymentPct: 0,
    publicDebtPctGdp: 0,
    govExpenditurePctGdp: 0,
    fdiNetInflowsUsdBn: 0,
    tradeBalanceUsdBn: 0,
    majorIndustries: [],
    energyProfile: {
      oilProductionMbpd: 0,
      naturalGasBcm: 0,
      coalSharePct: 0,
      renewableSharePct: 0,
      nuclearSharePct: 0,
      electricityGenerationTwh: 0,
    },
    environmentProfile: {
      tempAnomalyC: 0,
      co2EmissionsMt: 0,
      co2PerCapitaTons: 0,
      pm25AirQualityUgM3: 0,
      forestCoveragePct: 0,
      renewableWaterPerCapitaM3: 0,
    },
    technologyProfile: {
      semiconductorRole: "Hydrating live telemetry…",
      aiReadinessIndex: 0,
      rdSpendPctGdp: 0,
      internetPenetrationPct: 0,
      digitalInfrastructureSummary: "Hydrating live World Bank & REST Countries profile.",
    },
    educationHealthcare: {
      literacyRatePct: 0,
      tertiaryEnrollmentPct: 0,
      educationSpendPctGdp: 0,
      healthcareSpendPctGdp: 0,
      physiciansPer1000: 0,
    },
    internationalRelations: {
      treatyMemberships: [],
      topTradePartners: [],
      diplomaticContext: `Hydrating live World Bank & REST Countries profile for ${name} (${code})…`,
      geopoliticalDevelopments: [],
    },
    geographyFeatures: {
      majorCities: [],
      mountainRanges: [],
      majorRivers: [],
      oceanAccess: [],
    },
    historicalMilestones: [],
    currentDevelopments: [],
    futureEconomicScenarios: {
      horizon: "Pending Hydration",
      baselineCagrPct: 0,
      acceleratedReformCagrPct: 0,
      headwindScenarioCagrPct: 0,
      keyDrivers: [],
    },
    historicalSeries: [],
    provenance: {
      source: "World Bank Open Data API v2 + REST Countries v3.1",
      publisher: "Federated Public Data Connectors",
      url: `https://api.worldbank.org/v2/country/${code}`,
      retrievedAt: nowIso,
      lastUpdated: String(new Date().getUTCFullYear()),
      units: "Multi-unit (USD, %, People, km²)",
      coverage: "Hydrating live telemetry",
      missingData: true,
      verificationStatus: "unverified",
    },
  };
}
