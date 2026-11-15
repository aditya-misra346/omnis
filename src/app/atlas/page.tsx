"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Globe2,
  Layers,
  Bookmark,
  Check,
  ArrowLeftRight,
  TrendingUp,
  Zap,
  Cpu,
  Shield,
  Users,
  Landmark,
  FileSearch,
  Network,
  ArrowRight,
} from "lucide-react";
import { COUNTRIES_DATA } from "@/lib/data/global-intelligence";
import { InteractiveGlobe3D } from "@/components/globe/InteractiveGlobe3D";
import { HistoricalTrajectoryChart } from "@/components/charts/OmnisCharts";
import { ProvenancePanel } from "@/components/ui/ProvenancePanel";
import { OmnisLoader } from "@/components/brand/OmnisLogo";
import {
  OmnisButton,
  OmnisModuleHeader,
  OmnisSegmentedControl,
} from "@/components/ui/OmnisPrimitives";
import { OmnisSelect } from "@/components/ui/OmnisSelect";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import type { CountryIntelligenceProfile, IntelligenceLayerId } from "@/types/omnis";

const LAYERS: { id: IntelligenceLayerId; label: string; desc: string }[] = [
  { id: "geography", label: "Geography", desc: "Borders, capitals, cities, rivers, mountains & oceans" },
  { id: "economics", label: "Economics", desc: "GDP, GDP/capita, inflation, debt, FDI & trade balance" },
  { id: "demographics", label: "Demographics", desc: "Population, density, median age, urbanisation & life expectancy" },
  { id: "energy", label: "Energy", desc: "Oil, gas, coal, renewables, nuclear & electricity TWh" },
  { id: "environment", label: "Environment", desc: "Temp anomaly, CO2 emissions, PM2.5, forest & water" },
  { id: "technology", label: "Technology", desc: "Semiconductors, AI readiness, R&D spend & digital rails" },
  { id: "international", label: "Diplomacy & Ties", desc: "Treaties, trade partners & contextual diplomacy" },
];

function GlobalAtlasContent() {
  const searchParams = useSearchParams();
  const urlCountryParam = searchParams.get("country")?.trim().toUpperCase() || "";

  const [selectedIso3, setSelectedIso3] = useState(
    /^[A-Z]{3}$/.test(urlCountryParam) ? urlCountryParam : "IND"
  );
  const [compareIso3, setCompareIso3] = useState("CHN");

  useEffect(() => {
    if (/^[A-Z]{3}$/.test(urlCountryParam)) {
      setSelectedIso3(urlCountryParam);
    }
  }, [urlCountryParam]);
  const [activeLayer, setActiveLayer] = useState<IntelligenceLayerId>("economics");
  const [hydratedCountries, setHydratedCountries] = useState<
    Record<string, CountryIntelligenceProfile>
  >({});
  const [liveProfile, setLiveProfile] = useState<CountryIntelligenceProfile | null>(null);
  const [countryLookupStatus, setCountryLookupStatus] = useState<"idle" | "loading" | "missing">("idle");
  const [savedNotice, setSavedNotice] = useState(false);

  const { addWorkspaceItem, setActiveContext } = useOmnisStore();

  const countriesList = useMemo(
    () => Object.values({ ...COUNTRIES_DATA, ...hydratedCountries }),
    [hydratedCountries]
  );
  const resolvedCountry =
    (liveProfile && liveProfile.iso3 === selectedIso3 ? liveProfile : null) ??
    COUNTRIES_DATA[selectedIso3] ??
    hydratedCountries[selectedIso3] ??
    null;
  const country = resolvedCountry ?? COUNTRIES_DATA.IND;
  const compareCountry =
    COUNTRIES_DATA[compareIso3] ?? hydratedCountries[compareIso3] ?? COUNTRIES_DATA.CHN;

  useEffect(() => {
    setActiveContext("Global Atlas & Country Intelligence", `${country.name} (${country.iso3})`);
  }, [country.name, country.iso3, setActiveContext]);

  useEffect(() => {
    let cancelled = false;
    setCountryLookupStatus(
      COUNTRIES_DATA[selectedIso3] || hydratedCountries[selectedIso3] ? "idle" : "loading"
    );
    fetch(`/api/v1/countries/${selectedIso3}`)
      .then((r) => {
        if (r.status === 404) {
          if (!cancelled) setCountryLookupStatus("missing");
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((data: CountryIntelligenceProfile | null) => {
        if (!cancelled && data && data.iso3 === selectedIso3) {
          setLiveProfile(data);
          setHydratedCountries((prev) => ({ ...prev, [selectedIso3]: data }));
          setCountryLookupStatus("idle");
        }
      })
      .catch(() => {
        if (!cancelled && !COUNTRIES_DATA[selectedIso3] && !hydratedCountries[selectedIso3]) {
          setCountryLookupStatus("missing");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedIso3]);

  useEffect(() => {
    if (COUNTRIES_DATA[compareIso3] || hydratedCountries[compareIso3]) return;
    let cancelled = false;
    fetch(`/api/v1/countries/${compareIso3}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CountryIntelligenceProfile | null) => {
        if (!cancelled && data && data.iso3 === compareIso3) {
          setHydratedCountries((prev) => ({ ...prev, [compareIso3]: data }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [compareIso3, hydratedCountries]);

  const handleSaveCountry = () => {
    addWorkspaceItem({
      type: "country",
      title: `${country.name} (${country.iso3}) — Country Intelligence Dossier`,
      subtitle: `GDP $${country.gdpUsdBn}B • Growth +${country.gdpGrowthPct}% • Clean Grid ${country.energyProfile.renewableSharePct}%`,
      folder: "Geopolitics & Macro",
      tags: [country.name, country.iso3, country.region, "World Bank"],
      href: `/atlas?country=${country.iso3}`,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const fossilShare = Math.max(
    0,
    100 - country.energyProfile.renewableSharePct - country.energyProfile.nuclearSharePct
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Layer Switcher */}
      <OmnisModuleHeader
        moduleTag="MODULE 01 • GLOBAL INTELLIGENCE GLOBE & SOVEREIGN ATLAS"
        title="Interactive 3D Earth & Country Intelligence Experience"
        subtitle="Explore Natural Earth country geometry, day/night illumination, and deep sovereign indicators across 7 calibrated analytical lenses."
        icon={<Globe2 className="w-3.5 h-3.5" />}
        mobileFilterLabel={`Layer: ${LAYERS.find((l) => l.id === activeLayer)?.label ?? "Layers"}`}
        actions={
          <>
            <OmnisButton onClick={handleSaveCountry}>
              {savedNotice ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              <span>{savedNotice ? "Saved to Workspace" : `Save ${country.name} Dossier`}</span>
            </OmnisButton>
            <Link
              href={`/research?q=${encodeURIComponent(
                `Explain ${country.name}'s economic and technological development`
              )}`}
              className="omnis-magnetic-arrow px-3.5 py-2 rounded-lg bg-[var(--bg-slate)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[13px] font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 transition-colors"
            >
              <FileSearch className="w-3.5 h-3.5 tone-blue" />
              <span>Deep Research</span>
              <ArrowRight className="omnis-arrow-glyph w-3 h-3 opacity-65" />
            </Link>
            <Link
              href={`/knowledge-graph?topic=${encodeURIComponent(country.name)}`}
              className="omnis-magnetic-arrow px-3.5 py-2 rounded-lg bg-[var(--bg-slate)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[13px] font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 transition-colors"
            >
              <Network className="w-3.5 h-3.5 tone-violet" />
              <span>Knowledge Graph</span>
              <ArrowRight className="omnis-arrow-glyph w-3 h-3 opacity-65" />
            </Link>
            <Link
              href={`/simulations?category=economics&country=${country.iso3}`}
              className="omnis-magnetic-arrow px-3.5 py-2 rounded-lg bg-[var(--bg-slate)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[13px] font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 transition-colors"
            >
              <TrendingUp className="w-3.5 h-3.5 tone-verified" />
              <span>Simulate Macro Shock</span>
              <ArrowRight className="omnis-arrow-glyph w-3 h-3 opacity-65" />
            </Link>
          </>
        }
        secondaryControls={
          <div className="pt-1 overflow-x-auto max-w-full">
            <OmnisSegmentedControl
              groupId="atlas-layer-tabs"
              ariaLabel="Analytical Intelligence Lens"
              size="sm"
              value={activeLayer}
              onChange={(val) => setActiveLayer(val as IntelligenceLayerId)}
              options={LAYERS.map((layer) => ({
                value: layer.id,
                label: layer.label,
                icon: <Layers className="w-3 h-3" />,
              }))}
            />
          </div>
        }
      />

      {/* 3D Interactive Globe */}
      <InteractiveGlobe3D
        countries={countriesList}
        selectedIso3={selectedIso3}
        onSelectCountry={(iso) => {
          setSelectedIso3(iso);
          if (iso === compareIso3) {
            setCompareIso3(iso === "IND" ? "CHN" : "IND");
          }
        }}
        activeLayer={activeLayer}
        heightClass="h-[480px]"
      />

      {countryLookupStatus === "loading" && (
        <div className="px-4 py-2.5 rounded-xl badge-tone-cyan text-[13px] omnis-mono">
          Hydrating live REST Countries &amp; World Bank telemetry for {selectedIso3}…
        </div>
      )}

      {countryLookupStatus === "missing" && (
        <div className="px-4 py-2.5 rounded-xl badge-tone-warning text-[13px] omnis-mono">
          No federated sovereign profile resolved for &ldquo;{selectedIso3}&rdquo; (HTTP 404). Showing curated {country.name} ({country.iso3}) reference dossier below.
        </div>
      )}

      {/* Dedicated Country Intelligence Dossier */}
      <div className="omnis-card p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[var(--border-subtle)]">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{country.flagEmoji}</span>
              <div>
                <h2 className="omnis-display-section font-extrabold text-[var(--text-primary)]">
                  {country.officialName} ({country.iso3})
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Capital: <strong className="text-[var(--text-primary)]">{country.capital}</strong> •
                  Region: {country.region} ({country.subregion}) • Currency: {country.currency} •{" "}
                  <span className="omnis-mono omnis-tabular text-[var(--text-muted)]">
                    {Math.abs(country.lat).toFixed(2)}°{country.lat >= 0 ? "N" : "S"},{" "}
                    {Math.abs(country.lng).toFixed(2)}°{country.lng >= 0 ? "E" : "W"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {country.liveWorldBankOverride?.retrievedFromApi && (
            <div className="px-3 py-1.5 rounded-lg badge-tone-verified text-[13px] font-semibold omnis-mono">
              ✓ Live World Bank API v2 Synced (Latest Year: {country.liveWorldBankOverride.latestYear})
            </div>
          )}
        </div>

        {/* Provenance & Methodology Banner */}
        <ProvenancePanel provenance={country.provenance} />

        {/* Seamless Architectural 2x3 Sovereign Discipline Grid (De-boxed Hairline Matrix) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border border-[var(--border-subtle)] rounded-2xl overflow-hidden bg-[var(--bg-obsidian)]/30">
          {/* 01 / MACROECONOMICS */}
          <div className="p-5 border-b border-[var(--border-subtle)] md:border-r space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider tone-blue omnis-mono">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>01 / Macroeconomics</span>
            </div>
            <div className="divide-y divide-[var(--border-subtle)] text-[13.5px] sm:text-sm">
              <div className="flex items-baseline justify-between py-1.5 gap-2">
                <span className="text-[var(--text-muted)]">Nominal GDP</span>
                <span className="font-bold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  ${country.gdpUsdBn.toLocaleString()}B
                </span>
              </div>
              <div className="flex items-baseline justify-between py-1.5 gap-2">
                <span className="text-[var(--text-muted)]">GDP Per Capita</span>
                <span className="font-bold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  ${country.gdpPerCapitaUsd.toLocaleString()}
                </span>
              </div>
              <div className="flex items-baseline justify-between py-1.5 gap-2">
                <span className="text-[var(--text-muted)]">Real GDP Growth</span>
                <span className="font-bold omnis-mono omnis-tabular tone-verified">
                  +{country.gdpGrowthPct}% / yr
                </span>
              </div>
              <div className="flex items-baseline justify-between py-1.5 gap-2">
                <span className="text-[var(--text-muted)]">CPI Inflation / Unemp.</span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {country.inflationPct}% / {country.unemploymentPct}%
                </span>
              </div>
              <div className="flex items-baseline justify-between py-1.5 gap-2">
                <span className="text-[var(--text-muted)]">Public Debt / Gov Exp</span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {country.publicDebtPctGdp}% / {country.govExpenditurePctGdp}%
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-1.5 gap-2">
                <span className="text-[var(--text-muted)]">FDI Inflow / Trade</span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  ${country.fdiNetInflowsUsdBn}B / ${country.tradeBalanceUsdBn}B
                </span>
              </div>
            </div>
          </div>

          {/* 02 / DEMOGRAPHICS */}
          <div className="p-5 border-b border-[var(--border-subtle)] lg:border-r space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider tone-violet omnis-mono">
              <Users className="w-3.5 h-3.5" />
              <span>02 / Demographics</span>
            </div>
            <div className="divide-y divide-[var(--border-subtle)] text-[13.5px] sm:text-sm">
              <div className="flex items-baseline justify-between py-1.5 gap-2">
                <span className="text-[var(--text-muted)]">Total Population</span>
                <span className="font-bold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {(country.population / 1e6).toFixed(2)}M
                </span>
              </div>
              <div className="flex items-baseline justify-between py-1.5 gap-2">
                <span className="text-[var(--text-muted)]">Density / Median Age</span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {country.populationDensityPerSqKm}/km² • {country.medianAgeYears}y
                </span>
              </div>
              <div className="flex items-baseline justify-between py-1.5 gap-2">
                <span className="text-[var(--text-muted)]">Urbanisation / Life Exp</span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {country.urbanisationPct}% • {country.lifeExpectancyYears}y
                </span>
              </div>
              <div className="flex items-baseline justify-between py-1.5 gap-2">
                <span className="text-[var(--text-muted)]">Literacy / Tertiary</span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {country.educationHealthcare.literacyRatePct}% / {country.educationHealthcare.tertiaryEnrollmentPct}%
                </span>
              </div>
              <div className="flex items-baseline justify-between py-1.5 gap-2">
                <span className="text-[var(--text-muted)]">Education Spend</span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {country.educationHealthcare.educationSpendPctGdp}% GDP
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-1.5 gap-2">
                <span className="text-[var(--text-muted)]">Healthcare Spend</span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {country.educationHealthcare.healthcareSpendPctGdp}% ({country.educationHealthcare.physiciansPer1000}/1k)
                </span>
              </div>
            </div>
          </div>

          {/* 03 / ENERGY & CLIMATE */}
          <div className="p-5 border-b border-[var(--border-subtle)] md:border-r lg:border-r-0 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider tone-verified omnis-mono">
              <Zap className="w-3.5 h-3.5" />
              <span>03 / Energy & Climate</span>
            </div>
            <div className="divide-y divide-[var(--border-subtle)] text-[13.5px] sm:text-sm">
              <div className="flex items-baseline justify-between py-1.5 gap-2">
                <span className="text-[var(--text-muted)]">Electricity Gen</span>
                <span className="font-bold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {country.energyProfile.electricityGenerationTwh} TWh
                </span>
              </div>
              <div className="flex items-baseline justify-between py-1.5 gap-2">
                <span className="text-[var(--text-muted)]">Renewable / Nuclear</span>
                <span className="font-bold omnis-mono omnis-tabular tone-verified">
                  {country.energyProfile.renewableSharePct}% / {country.energyProfile.nuclearSharePct}%
                </span>
              </div>
              <div className="flex items-baseline justify-between py-1.5 gap-2">
                <span className="text-[var(--text-muted)]">Oil / Natural Gas</span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {country.energyProfile.oilProductionMbpd} Mbpd / {country.energyProfile.naturalGasBcm} bcm
                </span>
              </div>
              <div className="flex items-baseline justify-between py-1.5 gap-2">
                <span className="text-[var(--text-muted)]">CO2 Total / Per Capita</span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {country.environmentProfile.co2EmissionsMt} Mt ({country.environmentProfile.co2PerCapitaTons}t)
                </span>
              </div>
              <div className="flex items-baseline justify-between py-1.5 gap-2">
                <span className="text-[var(--text-muted)]">Forest / PM2.5 / Temp</span>
                <span className="font-semibold omnis-mono omnis-tabular tone-warning">
                  {country.environmentProfile.forestCoveragePct}% • +{country.environmentProfile.tempAnomalyC}°C
                </span>
              </div>
            </div>
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-xs omnis-mono omnis-tabular text-[var(--text-muted)]">
                <span>{country.energyProfile.renewableSharePct}% Clean</span>
                <span>{country.energyProfile.nuclearSharePct}% Nuclear</span>
                <span>{fossilShare.toFixed(0)}% Thermal</span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden flex bg-[var(--bg-graphite)] border border-[var(--border-subtle)]">
                <div
                  style={{ width: `${country.energyProfile.renewableSharePct}%`, backgroundColor: "var(--chart-emerald)" }}
                  title="Renewable"
                />
                <div
                  style={{ width: `${country.energyProfile.nuclearSharePct}%`, backgroundColor: "var(--chart-violet)" }}
                  title="Nuclear"
                />
                <div
                  style={{ width: `${fossilShare}%`, backgroundColor: "var(--chart-amber)", opacity: 0.7 }}
                  title="Fossil / Thermal"
                />
              </div>
            </div>
          </div>

          {/* 04 / TECHNOLOGY */}
          <div className="p-5 border-b lg:border-b-0 border-[var(--border-subtle)] lg:border-r space-y-3 text-[13.5px] sm:text-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider tone-cyan omnis-mono">
              <Cpu className="w-3.5 h-3.5" />
              <span>04 / Technology</span>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              <div className="flex items-baseline justify-between py-1.5 gap-2">
                <span className="text-[var(--text-muted)]">AI Readiness Index</span>
                <span className="font-bold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {country.technologyProfile.aiReadinessIndex}
                </span>
              </div>
              <div className="flex items-baseline justify-between py-1.5 gap-2">
                <span className="text-[var(--text-muted)]">R&D Intensity</span>
                <span className="font-bold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {country.technologyProfile.rdSpendPctGdp}% GDP
                </span>
              </div>
              <div className="flex items-baseline justify-between py-1.5 gap-2">
                <span className="text-[var(--text-muted)]">Internet Penetration</span>
                <span className="font-bold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {country.technologyProfile.internetPenetrationPct}%
                </span>
              </div>
              <div className="py-1.5 space-y-0.5">
                <div className="text-xs text-[var(--text-muted)]">Semiconductor Ecosystem</div>
                <div className="font-semibold text-[var(--text-primary)]">
                  {country.technologyProfile.semiconductorRole}
                </div>
              </div>
            </div>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              {country.technologyProfile.digitalInfrastructureSummary}
            </p>
          </div>

          {/* 05 / GOVERNANCE & GEOGRAPHY */}
          <div className="p-5 border-b md:border-b-0 border-[var(--border-subtle)] md:border-r space-y-3 text-[13.5px] sm:text-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider tone-warning omnis-mono">
              <Landmark className="w-3.5 h-3.5" />
              <span>05 / Governance & Geography</span>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              <div className="py-1.5 space-y-0.5">
                <div className="text-xs text-[var(--text-muted)]">Constitutional System</div>
                <div className="font-semibold text-[var(--text-primary)]">
                  {country.governmentStructure}
                </div>
              </div>
              <div className="py-1.5 space-y-0.5">
                <div className="text-xs text-[var(--text-muted)]">Key Cities & Hydrography</div>
                <div className="text-[13px] text-[var(--text-secondary)]">
                  {country.geographyFeatures.majorCities.slice(0, 4).join(", ")} • Rivers:{" "}
                  {country.geographyFeatures.majorRivers.slice(0, 3).join(", ")}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {country.majorIndustries.map((ind) => (
                <span
                  key={ind}
                  className="px-2 py-0.5 rounded-md bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs sm:text-[13px] text-[var(--text-primary)]"
                >
                  {ind}
                </span>
              ))}
            </div>
          </div>

          {/* 06 / INTERNATIONAL TRADE */}
          <div className="p-5 space-y-3 text-[13.5px] sm:text-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider tone-violet omnis-mono">
              <Shield className="w-3.5 h-3.5" />
              <span>06 / Trade & Diplomacy</span>
            </div>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              {country.internationalRelations.diplomaticContext}
            </p>
            <div className="divide-y divide-[var(--border-subtle)]">
              <div className="py-1.5 space-y-0.5">
                <div className="text-xs text-[var(--text-muted)]">Top Trade Partners</div>
                <div className="font-semibold text-[var(--text-primary)]">
                  {country.internationalRelations.topTradePartners.join(", ")}
                </div>
              </div>
              <div className="pt-1.5 space-y-0.5">
                <div className="text-xs text-[var(--text-muted)]">Treaty Memberships</div>
                <div className="omnis-mono text-[13px] text-[var(--text-primary)]">
                  {country.internationalRelations.treatyMemberships.join(" • ")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Open Interactive Historical Chart & Peer Comparison Matrix (De-boxed with Horizontal Rule) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 border-t border-[var(--border-subtle)]">
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                {country.name} vs {compareCountry.name} Historical Trajectory (1991–2026)
              </h3>
              <span className="text-xs text-[var(--text-muted)] omnis-mono">
                Dual-Country Interactive Overlay
              </span>
            </div>
            <HistoricalTrajectoryChart country={country} compareCountry={compareCountry} />
          </div>

          <div className="lg:col-span-6 space-y-4 lg:border-l lg:border-[var(--border-subtle)] lg:pl-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-bold flex items-center gap-2 text-[var(--text-primary)]">
                <ArrowLeftRight className="w-4 h-4 tone-blue" />
                Compare {country.name} vs {compareCountry.name}
              </h3>
              <OmnisSelect
                value={compareIso3}
                onChange={setCompareIso3}
                ariaLabel="Select Comparison Country"
                menuAlign="right"
                options={countriesList
                  .filter((c) => c.iso3 !== country.iso3)
                  .map((c) => ({
                    value: c.iso3,
                    label: `${c.flagEmoji} ${c.name} (${c.iso3})`,
                    hint: c.region,
                  }))}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13.5px] sm:text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                    <th className="py-2">Indicator</th>
                    <th className="py-2 omnis-mono">
                      {country.flagEmoji} {country.iso3}
                    </th>
                    <th className="py-2 omnis-mono">
                      {compareCountry.flagEmoji} {compareCountry.iso3}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] omnis-mono omnis-tabular text-[var(--text-primary)]">
                  <tr>
                    <td className="py-2.5 font-sans text-[var(--text-secondary)]">Nominal GDP</td>
                    <td className="py-2.5 font-bold">${country.gdpUsdBn.toLocaleString()}B</td>
                    <td className="py-2.5 font-bold">${compareCountry.gdpUsdBn.toLocaleString()}B</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans text-[var(--text-secondary)]">GDP Per Capita</td>
                    <td className="py-2.5">${country.gdpPerCapitaUsd.toLocaleString()}</td>
                    <td className="py-2.5">${compareCountry.gdpPerCapitaUsd.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans text-[var(--text-secondary)]">Real GDP Growth</td>
                    <td className="py-2.5 tone-verified font-semibold">+{country.gdpGrowthPct}%</td>
                    <td className="py-2.5 tone-verified font-semibold">+{compareCountry.gdpGrowthPct}%</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans text-[var(--text-secondary)]">Renewable Grid Share</td>
                    <td className="py-2.5">{country.energyProfile.renewableSharePct}%</td>
                    <td className="py-2.5">{compareCountry.energyProfile.renewableSharePct}%</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans text-[var(--text-secondary)]">R&D Spend (% GDP)</td>
                    <td className="py-2.5">{country.technologyProfile.rdSpendPctGdp}%</td>
                    <td className="py-2.5">{compareCountry.technologyProfile.rdSpendPctGdp}%</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans text-[var(--text-secondary)]">Median Age / Life Exp</td>
                    <td className="py-2.5">
                      {country.medianAgeYears}y / {country.lifeExpectancyYears}y
                    </td>
                    <td className="py-2.5">
                      {compareCountry.medianAgeYears}y / {compareCountry.lifeExpectancyYears}y
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Link
              href={`/intelligence?left=${country.iso3}&right=${compareCountry.iso3}`}
              className="omnis-magnetic-arrow inline-flex items-center gap-1.5 text-[13.5px] font-semibold tone-blue hover:underline"
            >
              <span>Open Full Multi-Axis Radar & Historical Comparison Engine</span>
              <ArrowRight className="omnis-arrow-glyph w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GlobalAtlasPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 max-w-7xl mx-auto">
          <OmnisLoader label="Initialising 3D Global Intelligence Atlas..." />
        </div>
      }
    >
      <GlobalAtlasContent />
    </Suspense>
  );
}
