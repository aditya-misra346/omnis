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
import { ProvenancePanel } from "@/components/ui/ProvenancePanel";
import { useOmnisStore } from "@/lib/store/use-omnis-store";
import type { CountryIntelligenceProfile, IntelligenceLayerId } from "@/types/omnis";

const LAYERS: { id: IntelligenceLayerId; label: string; desc: string }[] = [
  { id: "geography", label: "Geography", desc: "Borders, capitals, cities, rivers, mountains & oceans" },
  { id: "economics", label: "Economics", desc: "GDP, GDP/capita, inflation, debt, FDI & trade balance" },
  { id: "demographics", label: "Demographics", desc: "Population, density, median age, urbanisation & life expectancy" },
  { id: "energy", label: "Energy", desc: "Oil, gas, coal, renewables, nuclear & electricity TWh" },
  { id: "environment", label: "Environment", desc: "Temp anomaly, CO2 emissions, PM2.5, forest & water" },
  { id: "technology", label: "Technology", desc: "Semiconductors, AI readiness, R&D spend & digital rails" },
  { id: "international", label: "International Relations", desc: "Treaties, trade partners & contextual diplomacy" },
];

function GlobalAtlasContent() {
  const searchParams = useSearchParams();
  const initialCountry = searchParams.get("country")?.toUpperCase() || "IND";

  const [selectedIso3, setSelectedIso3] = useState(
    COUNTRIES_DATA[initialCountry] ? initialCountry : "IND"
  );
  const [compareIso3, setCompareIso3] = useState("CHN");
  const [activeLayer, setActiveLayer] = useState<IntelligenceLayerId>("economics");
  const [liveProfile, setLiveProfile] = useState<CountryIntelligenceProfile | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  const { addWorkspaceItem, setActiveContext } = useOmnisStore();

  const countriesList = Object.values(COUNTRIES_DATA);
  const country =
    liveProfile && liveProfile.iso3 === selectedIso3
      ? liveProfile
      : COUNTRIES_DATA[selectedIso3] ?? COUNTRIES_DATA.IND;
  const compareCountry = COUNTRIES_DATA[compareIso3] ?? COUNTRIES_DATA.CHN;

  useEffect(() => {
    setActiveContext("Global Atlas & Country Intelligence", `${country.name} (${country.iso3})`);
  }, [country.name, country.iso3, setActiveContext]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/countries/${selectedIso3}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && data.iso3 === selectedIso3) {
          setLiveProfile(data);
        }
      })
      .catch(() => {
        // Keep verified baseline profile
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Layer Switcher */}
      <div className="omnis-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">
              <Globe2 className="w-3.5 h-3.5" />
              <span>MODULE 01 • GLOBAL INTELLIGENCE GLOBE & SOVEREIGN ATLAS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">
              Interactive 3D Earth & Country Intelligence Experience
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveCountry}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              {savedNotice ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              <span>{savedNotice ? "Saved to Workspace" : `Save ${country.name} Dossier`}</span>
            </button>
            <Link
              href={`/research?q=${encodeURIComponent(
                `Explain ${country.name}'s economic and technological development`
              )}`}
              className="px-3.5 py-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <FileSearch className="w-3.5 h-3.5 text-blue-400" />
              <span>Deep Research</span>
            </Link>
            <Link
              href={`/knowledge-graph?topic=${encodeURIComponent(country.name)}`}
              className="px-3.5 py-2 rounded-lg bg-[var(--bg-slate)] border border-[var(--border-subtle)] text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Network className="w-3.5 h-3.5 text-violet-400" />
              <span>Knowledge Graph</span>
            </Link>
          </div>
        </div>

        {/* 7 Intelligence Layers Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2">
          {LAYERS.map((layer) => {
            const active = activeLayer === layer.id;
            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => setActiveLayer(layer.id)}
                className={`text-left p-2.5 rounded-lg border transition-all ${
                  active
                    ? "bg-blue-600/20 border-blue-500 text-[var(--text-primary)]"
                    : "bg-[var(--bg-slate)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1">
                  <Layers className="w-3 h-3 text-blue-400 shrink-0" />
                  <span className="truncate">{layer.label}</span>
                </div>
                <div className="text-[10px] text-[var(--text-muted)] line-clamp-1 mt-0.5">
                  {layer.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

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
        heightClass="h-[460px]"
      />

      {/* Dedicated Country Intelligence Dossier */}
      <div className="omnis-card p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[var(--border-subtle)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">{country.flagEmoji}</span>
              <div>
                <h2 className="text-2xl font-extrabold">
                  {country.officialName} ({country.iso3})
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Capital: <strong>{country.capital}</strong> • Region: {country.region} (
                  {country.subregion}) • Currency: {country.currency}
                </p>
              </div>
            </div>
          </div>

          {country.liveWorldBankOverride?.retrievedFromApi && (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-400 omnis-mono">
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
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
              <TrendingUp className="w-4 h-4" />
              <span>Macroeconomic Indicators</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Nominal GDP</div>
                <div className="text-base font-bold omnis-mono">
                  ${country.gdpUsdBn.toLocaleString()}B
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">GDP Per Capita</div>
                <div className="text-base font-bold omnis-mono">
                  ${country.gdpPerCapitaUsd.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Real GDP Growth</div>
                <div className="font-bold omnis-mono text-emerald-400">
                  +{country.gdpGrowthPct}% / yr
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">CPI Inflation / Unemp.</div>
                <div className="font-bold omnis-mono">
                  {country.inflationPct}% / {country.unemploymentPct}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Public Debt / Gov Exp</div>
                <div className="font-bold omnis-mono">
                  {country.publicDebtPctGdp}% / {country.govExpenditurePctGdp}% GDP
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">FDI Net Inflow / Trade</div>
                <div className="font-bold omnis-mono">
                  ${country.fdiNetInflowsUsdBn}B / ${country.tradeBalanceUsdBn}B
                </div>
              </div>
            </div>
          </div>

          {/* 2. Demographics & Social Indicators */}
          <div className="omnis-surface-slate p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-400">
              <Users className="w-4 h-4" />
              <span>Demographics, Education & Health</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Total Population</div>
                <div className="text-base font-bold omnis-mono">
                  {(country.population / 1e6).toFixed(2)}M
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Density / Median Age</div>
                <div className="font-bold omnis-mono">
                  {country.populationDensityPerSqKm}/km² • {country.medianAgeYears}y
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Urbanisation / Life Exp</div>
                <div className="font-bold omnis-mono">
                  {country.urbanisationPct}% • {country.lifeExpectancyYears} yrs
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Literacy / Tertiary Edu</div>
                <div className="font-bold omnis-mono">
                  {country.educationHealthcare.literacyRatePct}% /{" "}
                  {country.educationHealthcare.tertiaryEnrollmentPct}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Education Spend</div>
                <div className="font-bold omnis-mono">
                  {country.educationHealthcare.educationSpendPctGdp}% of GDP
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Healthcare Spend</div>
                <div className="font-bold omnis-mono">
                  {country.educationHealthcare.healthcareSpendPctGdp}% GDP (
                  {country.educationHealthcare.physiciansPer1000} MD/1k)
                </div>
              </div>
            </div>
          </div>

          {/* 3. Energy & Environment */}
          <div className="omnis-surface-slate p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Zap className="w-4 h-4" />
              <span>Energy & Environment Profile</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Electricity Generation</div>
                <div className="text-base font-bold omnis-mono">
                  {country.energyProfile.electricityGenerationTwh} TWh
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Renewable / Nuclear</div>
                <div className="font-bold omnis-mono text-emerald-400">
                  {country.energyProfile.renewableSharePct}% / {country.energyProfile.nuclearSharePct}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Oil / Natural Gas</div>
                <div className="font-bold omnis-mono">
                  {country.energyProfile.oilProductionMbpd} Mbpd / {country.energyProfile.naturalGasBcm} bcm
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">CO2 Total / Per Capita</div>
                <div className="font-bold omnis-mono">
                  {country.environmentProfile.co2EmissionsMt} Mt ({country.environmentProfile.co2PerCapitaTons}t)
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Forest Cover / PM2.5</div>
                <div className="font-bold omnis-mono">
                  {country.environmentProfile.forestCoveragePct}% / {country.environmentProfile.pm25AirQualityUgM3} µg/m³
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--text-muted)]">Temp Anomaly</div>
                <div className="font-bold omnis-mono text-amber-400">
                  +{country.environmentProfile.tempAnomalyC}°C
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technology, Government & International Relations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="omnis-surface-slate p-5 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-sky-400">
              <Cpu className="w-4 h-4" />
              <span>Technological & Semiconductor Ecosystem</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Semiconductor Role:</span>{" "}
              <strong>{country.technologyProfile.semiconductorRole}</strong>
            </div>
            <div className="grid grid-cols-3 gap-2 py-1">
              <div className="p-2 rounded bg-[var(--bg-graphite)]">
                <div className="text-[10px] text-[var(--text-muted)]">AI Index</div>
                <div className="font-bold omnis-mono">{country.technologyProfile.aiReadinessIndex}</div>
              </div>
              <div className="p-2 rounded bg-[var(--bg-graphite)]">
                <div className="text-[10px] text-[var(--text-muted)]">R&D / GDP</div>
                <div className="font-bold omnis-mono">{country.technologyProfile.rdSpendPctGdp}%</div>
              </div>
              <div className="p-2 rounded bg-[var(--bg-graphite)]">
                <div className="text-[10px] text-[var(--text-muted)]">Internet</div>
                <div className="font-bold omnis-mono">{country.technologyProfile.internetPenetrationPct}%</div>
              </div>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              {country.technologyProfile.digitalInfrastructureSummary}
            </p>
          </div>

          <div className="omnis-surface-slate p-5 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-amber-400">
              <Landmark className="w-4 h-4" />
              <span>Government, Geography & Major Industries</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Constitutional System:</span>{" "}
              <strong>{country.governmentStructure}</strong>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Geography:</span> Cities (
              {country.geographyFeatures.majorCities.slice(0, 4).join(", ")}) • Rivers (
              {country.geographyFeatures.majorRivers.slice(0, 3).join(", ")})
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {country.majorIndustries.map((ind) => (
                <span
                  key={ind}
                  className="px-2 py-0.5 rounded bg-[var(--bg-graphite)] border border-[var(--border-subtle)] text-[11px]"
                >
                  {ind}
                </span>
              ))}
            </div>
          </div>

          <div className="omnis-surface-slate p-5 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-pink-400">
              <Shield className="w-4 h-4" />
              <span>International Relations & Trade Context</span>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              {country.internationalRelations.diplomaticContext}
            </p>
            <div>
              <span className="text-[var(--text-muted)]">Top Trade Partners:</span>{" "}
              <strong>{country.internationalRelations.topTradePartners.join(", ")}</strong>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Treaty Memberships:</span>{" "}
              <span className="omnis-mono">
                {country.internationalRelations.treatyMemberships.join(" • ")}
              </span>
            </div>
          </div>
        </div>

        {/* Historical Trajectory (1991–2026) & Side-by-Side Country Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* Historical GDP Trajectory Chart */}
          <div className="lg:col-span-6 omnis-surface-slate p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {country.name} Historical Economic Trajectory (1991–2026)
              </h3>
              <span className="text-[11px] text-[var(--text-muted)] omnis-mono">
                Nominal GDP ($B) & Renewable %
              </span>
            </div>
            <div className="space-y-2.5">
              {country.historicalSeries.map((pt) => {
                const maxGdp = Math.max(...country.historicalSeries.map((s) => s.gdpUsdBn), 1);
                const widthPct = Math.max(6, Math.round((pt.gdpUsdBn / maxGdp) * 100));
                return (
                  <div key={pt.year} className="space-y-1 text-xs">
                    <div className="flex justify-between omnis-mono text-[11px]">
                      <span className="font-bold">{pt.year}</span>
                      <span>
                        ${pt.gdpUsdBn.toLocaleString()}B (${pt.gdpPerCapitaUsd.toLocaleString()}/cap) •
                        Growth {pt.gdpGrowthPct >= 0 ? "+" : ""}
                        {pt.gdpGrowthPct}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-[var(--bg-graphite)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Direct Country vs Country Comparison Widget */}
          <div className="lg:col-span-6 omnis-surface-slate p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-blue-400" />
                Compare {country.name} vs {compareCountry.name}
              </h3>
              <select
                value={compareIso3}
                onChange={(e) => setCompareIso3(e.target.value)}
                aria-label="Select Comparison Country"
                className="px-2.5 py-1 rounded bg-[var(--bg-graphite)] border border-[var(--border-subtle)] text-xs font-semibold"
              >
                {countriesList
                  .filter((c) => c.iso3 !== country.iso3)
                  .map((c) => (
                    <option key={c.iso3} value={c.iso3}>
                      {c.flagEmoji} {c.name} ({c.iso3})
                    </option>
                  ))}
              </select>
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
                <tbody className="divide-y divide-[var(--border-subtle)] omnis-mono">
                  <tr>
                    <td className="py-2 font-sans text-[var(--text-secondary)]">Nominal GDP</td>
                    <td className="py-2 font-bold">${country.gdpUsdBn.toLocaleString()}B</td>
                    <td className="py-2 font-bold">${compareCountry.gdpUsdBn.toLocaleString()}B</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-sans text-[var(--text-secondary)]">GDP Per Capita</td>
                    <td className="py-2">${country.gdpPerCapitaUsd.toLocaleString()}</td>
                    <td className="py-2">${compareCountry.gdpPerCapitaUsd.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-sans text-[var(--text-secondary)]">Real GDP Growth</td>
                    <td className="py-2 text-emerald-400">+{country.gdpGrowthPct}%</td>
                    <td className="py-2 text-emerald-400">+{compareCountry.gdpGrowthPct}%</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-sans text-[var(--text-secondary)]">Renewable Grid Share</td>
                    <td className="py-2">{country.energyProfile.renewableSharePct}%</td>
                    <td className="py-2">{compareCountry.energyProfile.renewableSharePct}%</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-sans text-[var(--text-secondary)]">R&D Spend (% GDP)</td>
                    <td className="py-2">{country.technologyProfile.rdSpendPctGdp}%</td>
                    <td className="py-2">{compareCountry.technologyProfile.rdSpendPctGdp}%</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-sans text-[var(--text-secondary)]">Median Age / Life Exp</td>
                    <td className="py-2">
                      {country.medianAgeYears}y / {country.lifeExpectancyYears}y
                    </td>
                    <td className="py-2">
                      {compareCountry.medianAgeYears}y / {compareCountry.lifeExpectancyYears}y
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Link
              href={`/intelligence?left=${country.iso3}&right=${compareCountry.iso3}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:underline"
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
    <Suspense fallback={<div className="p-8 text-sm">Loading Global Intelligence Atlas...</div>}>
      <GlobalAtlasContent />
    </Suspense>
  );
}
