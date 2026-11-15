"use client";

import React, { Suspense, useEffect, useState } from "react";
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
} from "lucide-react";
import { COUNTRIES_DATA } from "@/lib/data/global-intelligence";
import { InteractiveGlobe3D } from "@/components/globe/InteractiveGlobe3D";
import { HistoricalTrajectoryChart } from "@/components/charts/OmnisCharts";
import { ProvenancePanel } from "@/components/ui/ProvenancePanel";
import { OmnisLoader } from "@/components/brand/OmnisLogo";
import { OmnisButton, OmnisModuleHeader } from "@/components/ui/OmnisPrimitives";
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
  const [liveProfile, setLiveProfile] = useState<CountryIntelligenceProfile | null>(null);
  const [countryLookupStatus, setCountryLookupStatus] = useState<"idle" | "loading" | "missing">("idle");
  const [savedNotice, setSavedNotice] = useState(false);

  const { addWorkspaceItem, setActiveContext } = useOmnisStore();

  const countriesList = Object.values(COUNTRIES_DATA);
  const resolvedCountry =
    liveProfile && liveProfile.iso3 === selectedIso3
      ? liveProfile
      : COUNTRIES_DATA[selectedIso3] ?? null;
  const country = resolvedCountry ?? COUNTRIES_DATA.IND;
  const compareCountry = COUNTRIES_DATA[compareIso3] ?? COUNTRIES_DATA.CHN;

  useEffect(() => {
    setActiveContext("Global Atlas & Country Intelligence", `${country.name} (${country.iso3})`);
  }, [country.name, country.iso3, setActiveContext]);

  useEffect(() => {
    let cancelled = false;
    setCountryLookupStatus(COUNTRIES_DATA[selectedIso3] ? "idle" : "loading");
    fetch(`/api/v1/countries/${selectedIso3}`)
      .then((r) => {
        if (r.status === 404) {
          if (!cancelled) setCountryLookupStatus("missing");
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((data) => {
        if (!cancelled && data && data.iso3 === selectedIso3) {
          setLiveProfile(data);
          setCountryLookupStatus("idle");
        }
      })
      .catch(() => {
        if (!cancelled && !COUNTRIES_DATA[selectedIso3]) {
          setCountryLookupStatus("missing");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedIso3]);

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
              className="px-3.5 py-2 rounded-lg bg-[var(--bg-slate)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 transition-colors"
            >
              <FileSearch className="w-3.5 h-3.5 tone-blue" />
              <span>Deep Research</span>
            </Link>
            <Link
              href={`/knowledge-graph?topic=${encodeURIComponent(country.name)}`}
              className="px-3.5 py-2 rounded-lg bg-[var(--bg-slate)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 transition-colors"
            >
              <Network className="w-3.5 h-3.5 tone-violet" />
              <span>Knowledge Graph</span>
            </Link>
            <Link
              href={`/simulations?category=economics&country=${country.iso3}`}
              className="px-3.5 py-2 rounded-lg bg-[var(--bg-slate)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 transition-colors"
            >
              <TrendingUp className="w-3.5 h-3.5 tone-verified" />
              <span>Simulate Macro Shock</span>
            </Link>
          </>
        }
        secondaryControls={
          <div className="flex flex-wrap gap-1.5 pt-1">
            {LAYERS.map((layer) => {
              const active = activeLayer === layer.id;
              return (
                <button
                  key={layer.id}
                  type="button"
                  title={layer.desc}
                  onClick={() => setActiveLayer(layer.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-[var(--accent-blue-solid)] text-white border-transparent shadow-sm"
                      : "bg-[var(--bg-slate)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <Layers className={`w-3 h-3 shrink-0 ${active ? "text-white" : "tone-blue"}`} />
                  <span>{layer.label}</span>
                </button>
              );
            })}
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
        <div className="px-4 py-2.5 rounded-xl badge-tone-cyan text-xs omnis-mono">
          Hydrating live REST Countries &amp; World Bank telemetry for {selectedIso3}…
        </div>
      )}

      {countryLookupStatus === "missing" && (
        <div className="px-4 py-2.5 rounded-xl badge-tone-warning text-xs omnis-mono">
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
                <h2 className="omnis-display text-2xl font-extrabold text-[var(--text-primary)]">
                  {country.officialName} ({country.iso3})
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
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
            <div className="px-3 py-1.5 rounded-lg badge-tone-verified text-xs font-semibold omnis-mono">
              ✓ Live World Bank API v2 Synced (Latest Year: {country.liveWorldBankOverride.latestYear})
            </div>
          )}
        </div>

        {/* Provenance & Methodology Banner */}
        <ProvenancePanel provenance={country.provenance} />

        {/* Multi-Discipline Indicator Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. Macroeconomics */}
          <div className="omnis-surface-slate p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider tone-blue omnis-mono">
              <TrendingUp className="w-4 h-4" />
              <span>Macroeconomic Indicators</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Nominal GDP</div>
                <div className="text-base font-bold omnis-mono text-[var(--text-primary)]">
                  ${country.gdpUsdBn.toLocaleString()}B
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">GDP Per Capita</div>
                <div className="text-base font-bold omnis-mono text-[var(--text-primary)]">
                  ${country.gdpPerCapitaUsd.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Real GDP Growth</div>
                <div className="font-bold omnis-mono tone-verified">
                  +{country.gdpGrowthPct}% / yr
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">CPI Inflation / Unemp.</div>
                <div className="font-bold omnis-mono text-[var(--text-primary)]">
                  {country.inflationPct}% / {country.unemploymentPct}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Public Debt / Gov Exp</div>
                <div className="font-bold omnis-mono text-[var(--text-primary)]">
                  {country.publicDebtPctGdp}% / {country.govExpenditurePctGdp}% GDP
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">FDI Net Inflow / Trade</div>
                <div className="font-bold omnis-mono text-[var(--text-primary)]">
                  ${country.fdiNetInflowsUsdBn}B / ${country.tradeBalanceUsdBn}B
                </div>
              </div>
            </div>
          </div>

          {/* 2. Demographics & Social Indicators */}
          <div className="omnis-surface-slate p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider tone-violet omnis-mono">
              <Users className="w-4 h-4" />
              <span>Demographics, Education & Health</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Total Population</div>
                <div className="text-base font-bold omnis-mono text-[var(--text-primary)]">
                  {(country.population / 1e6).toFixed(2)}M
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Density / Median Age</div>
                <div className="font-bold omnis-mono text-[var(--text-primary)]">
                  {country.populationDensityPerSqKm}/km² • {country.medianAgeYears}y
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Urbanisation / Life Exp</div>
                <div className="font-bold omnis-mono text-[var(--text-primary)]">
                  {country.urbanisationPct}% • {country.lifeExpectancyYears} yrs
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Literacy / Tertiary Edu</div>
                <div className="font-bold omnis-mono text-[var(--text-primary)]">
                  {country.educationHealthcare.literacyRatePct}% /{" "}
                  {country.educationHealthcare.tertiaryEnrollmentPct}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Education Spend</div>
                <div className="font-bold omnis-mono text-[var(--text-primary)]">
                  {country.educationHealthcare.educationSpendPctGdp}% of GDP
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Healthcare Spend</div>
                <div className="font-bold omnis-mono text-[var(--text-primary)]">
                  {country.educationHealthcare.healthcareSpendPctGdp}% GDP (
                  {country.educationHealthcare.physiciansPer1000} MD/1k)
                </div>
              </div>
            </div>
          </div>

          {/* 3. Energy & Environment */}
          <div className="omnis-surface-slate p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider tone-verified omnis-mono">
              <Zap className="w-4 h-4" />
              <span>Energy & Environment Profile</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Electricity Generation</div>
                <div className="text-base font-bold omnis-mono text-[var(--text-primary)]">
                  {country.energyProfile.electricityGenerationTwh} TWh
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Renewable / Nuclear</div>
                <div className="font-bold omnis-mono tone-verified">
                  {country.energyProfile.renewableSharePct}% / {country.energyProfile.nuclearSharePct}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Oil / Natural Gas</div>
                <div className="font-bold omnis-mono text-[var(--text-primary)]">
                  {country.energyProfile.oilProductionMbpd} Mbpd / {country.energyProfile.naturalGasBcm} bcm
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">CO2 Total / Per Capita</div>
                <div className="font-bold omnis-mono text-[var(--text-primary)]">
                  {country.environmentProfile.co2EmissionsMt} Mt ({country.environmentProfile.co2PerCapitaTons}t)
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Forest Cover / PM2.5</div>
                <div className="font-bold omnis-mono text-[var(--text-primary)]">
                  {country.environmentProfile.forestCoveragePct}% / {country.environmentProfile.pm25AirQualityUgM3} µg/m³
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Temp Anomaly</div>
                <div className="font-bold omnis-mono tone-warning">
                  +{country.environmentProfile.tempAnomalyC}°C
                </div>
              </div>
            </div>

            {/* Segmented Generation Mix Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[10px] omnis-mono text-[var(--text-muted)]">
                <span>Grid Mix: {country.energyProfile.renewableSharePct}% Clean</span>
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
        </div>

        {/* Technology, Government & International Relations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="omnis-surface-slate p-5 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider tone-cyan omnis-mono">
              <Cpu className="w-4 h-4" />
              <span>Technological & Semiconductor Ecosystem</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Semiconductor Role:</span>{" "}
              <strong className="text-[var(--text-primary)]">
                {country.technologyProfile.semiconductorRole}
              </strong>
            </div>
            <div className="grid grid-cols-3 gap-2 py-1">
              <div className="p-2 rounded-lg bg-[var(--bg-graphite)] border border-[var(--border-subtle)]">
                <div className="text-[10px] text-[var(--text-muted)]">AI Index</div>
                <div className="font-bold omnis-mono text-[var(--text-primary)]">
                  {country.technologyProfile.aiReadinessIndex}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-[var(--bg-graphite)] border border-[var(--border-subtle)]">
                <div className="text-[10px] text-[var(--text-muted)]">R&D / GDP</div>
                <div className="font-bold omnis-mono text-[var(--text-primary)]">
                  {country.technologyProfile.rdSpendPctGdp}%
                </div>
              </div>
              <div className="p-2 rounded-lg bg-[var(--bg-graphite)] border border-[var(--border-subtle)]">
                <div className="text-[10px] text-[var(--text-muted)]">Internet</div>
                <div className="font-bold omnis-mono text-[var(--text-primary)]">
                  {country.technologyProfile.internetPenetrationPct}%
                </div>
              </div>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              {country.technologyProfile.digitalInfrastructureSummary}
            </p>
          </div>

          <div className="omnis-surface-slate p-5 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider tone-warning omnis-mono">
              <Landmark className="w-4 h-4" />
              <span>Government, Geography & Major Industries</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Constitutional System:</span>{" "}
              <strong className="text-[var(--text-primary)]">{country.governmentStructure}</strong>
            </div>
            <div className="text-[var(--text-secondary)]">
              <span className="text-[var(--text-muted)]">Geography:</span> Cities (
              {country.geographyFeatures.majorCities.slice(0, 4).join(", ")}) • Rivers (
              {country.geographyFeatures.majorRivers.slice(0, 3).join(", ")})
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {country.majorIndustries.map((ind) => (
                <span
                  key={ind}
                  className="px-2 py-0.5 rounded-md bg-[var(--bg-graphite)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-primary)]"
                >
                  {ind}
                </span>
              ))}
            </div>
          </div>

          <div className="omnis-surface-slate p-5 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider tone-violet omnis-mono">
              <Shield className="w-4 h-4" />
              <span>International Relations & Trade Context</span>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              {country.internationalRelations.diplomaticContext}
            </p>
            <div>
              <span className="text-[var(--text-muted)]">Top Trade Partners:</span>{" "}
              <strong className="text-[var(--text-primary)]">
                {country.internationalRelations.topTradePartners.join(", ")}
              </strong>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Treaty Memberships:</span>{" "}
              <span className="omnis-mono text-[var(--text-primary)]">
                {country.internationalRelations.treatyMemberships.join(" • ")}
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Historical Chart & Side-by-Side Country Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          <div className="lg:col-span-6 omnis-surface-slate p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {country.name} Multi-Metric Trajectory (1991–2026)
              </h3>
              <span className="text-[11px] text-[var(--text-muted)] omnis-mono">
                Hover points to inspect
              </span>
            </div>
            <HistoricalTrajectoryChart country={country} />
          </div>

          <div className="lg:col-span-6 omnis-surface-slate p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold flex items-center gap-2 text-[var(--text-primary)]">
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
              <table className="w-full text-left text-xs">
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
                <tbody className="divide-y divide-[var(--border-subtle)] omnis-mono text-[var(--text-primary)]">
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
              className="inline-flex items-center gap-1 text-xs font-semibold tone-blue hover:underline"
            >
              Open Full Multi-Axis Radar & Historical Comparison Engine →
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
