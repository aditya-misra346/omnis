"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  ArrowUpRight,
} from "lucide-react";
import { COUNTRIES_DATA } from "@/lib/data/global-intelligence";
import {
  WORLD_COUNTRIES_CATALOG,
  buildPlaceholderCountryProfile,
} from "@/lib/data/world-catalog";
import { describeGlobalScaleTier, describeVsBenchmark } from "@/lib/data/world-benchmarks";
import { computeHistoricalMultiple } from "@/lib/research/compare";
import {
  formatCountryMetricOrNa,
  formatPopulationHuman,
  formatSignedPct,
  formatSignedValue,
  formatUsdBnCompact,
  getEffectiveGdpUsdBn,
  getEffectiveGdpYear,
  hasEnergyProfileData,
  hasSectorMetricValue,
} from "@/lib/formatters";
import { InteractiveGlobe3D } from "@/components/globe/InteractiveGlobe3D";
import { CountrySolarClockBadge } from "@/components/solar/SolarBadges";
import { HistoricalTrajectoryChart } from "@/components/charts/OmnisCharts";
import { ProvenancePanel } from "@/components/ui/ProvenancePanel";
import { OmnisLoader } from "@/components/brand/OmnisLogo";
import {
  OmnisButton,
  OmnisGlossaryTip,
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCountryParam = searchParams.get("country")?.trim().toUpperCase() || "";
  const urlCompareParam = searchParams.get("compare")?.trim().toUpperCase() || "";
  const urlLayerParam = searchParams.get("layer")?.trim().toLowerCase() || "";
  const isValidLayer = (val: string): val is IntelligenceLayerId =>
    LAYERS.some((layer) => layer.id === val);

  const [selectedIso3, setSelectedIso3] = useState(
    /^[A-Z]{3}$/.test(urlCountryParam) ? urlCountryParam : "IND"
  );
  const [compareIso3, setCompareIso3] = useState(
    /^[A-Z]{3}$/.test(urlCompareParam) && urlCompareParam !== urlCountryParam
      ? urlCompareParam
      : "CHN"
  );
  const [activeLayer, setActiveLayer] = useState<IntelligenceLayerId>(
    isValidLayer(urlLayerParam) ? urlLayerParam : "economics"
  );

  const atlasUrlKey = `${urlCountryParam}::${urlCompareParam}::${urlLayerParam}`;
  const [prevAtlasUrlKey, setPrevAtlasUrlKey] = useState(atlasUrlKey);
  if (atlasUrlKey !== prevAtlasUrlKey) {
    setPrevAtlasUrlKey(atlasUrlKey);
    if (/^[A-Z]{3}$/.test(urlCountryParam)) {
      setSelectedIso3(urlCountryParam);
    }
    if (/^[A-Z]{3}$/.test(urlCompareParam) && urlCompareParam !== urlCountryParam) {
      setCompareIso3(urlCompareParam);
    }
    if (isValidLayer(urlLayerParam)) {
      setActiveLayer(urlLayerParam);
    }
  }

  const [hydratedCountries, setHydratedCountries] = useState<
    Record<string, CountryIntelligenceProfile>
  >({});
  const hydratedRef = useRef<Record<string, CountryIntelligenceProfile>>({});
  const [liveProfile, setLiveProfile] = useState<CountryIntelligenceProfile | null>(null);
  const [countryLookupStatus, setCountryLookupStatus] = useState<
    "idle" | "loading" | "missing" | "error"
  >("idle");
  const [savedNotice, setSavedNotice] = useState(false);

  const { addWorkspaceItem, setActiveContext, setFocusedSignal } = useOmnisStore();

  const resolvedCountry = useMemo(
    () =>
      (liveProfile && liveProfile.iso3 === selectedIso3 ? liveProfile : null) ??
      COUNTRIES_DATA[selectedIso3] ??
      hydratedCountries[selectedIso3] ??
      buildPlaceholderCountryProfile(selectedIso3) ??
      null,
    [liveProfile, selectedIso3, hydratedCountries]
  );
  const country = resolvedCountry ?? COUNTRIES_DATA.IND;
  const compareCountry = useMemo(
    () =>
      COUNTRIES_DATA[compareIso3] ??
      hydratedCountries[compareIso3] ??
      buildPlaceholderCountryProfile(compareIso3) ??
      COUNTRIES_DATA.CHN,
    [compareIso3, hydratedCountries]
  );

  const countriesList = useMemo(() => {
    const merged: Record<string, CountryIntelligenceProfile> = {
      ...COUNTRIES_DATA,
      ...hydratedCountries,
    };
    if (resolvedCountry && !merged[resolvedCountry.iso3]) {
      merged[resolvedCountry.iso3] = resolvedCountry;
    }
    if (compareCountry && !merged[compareCountry.iso3]) {
      merged[compareCountry.iso3] = compareCountry;
    }
    return Object.values(merged);
  }, [hydratedCountries, resolvedCountry, compareCountry]);

  useEffect(() => {
    setActiveContext("Global Atlas & Country Intelligence", `${country.name} (${country.iso3})`);
    setFocusedSignal({
      iso3: country.iso3,
      topic: country.name,
      label: `${country.name} (${country.iso3})`,
    });
  }, [country.name, country.iso3, setActiveContext, setFocusedSignal]);

  useEffect(() => {
    const cached = hydratedRef.current[selectedIso3];
    if (cached) {
      setLiveProfile(cached);
      setCountryLookupStatus("idle");
      return;
    }

    let cancelled = false;
    setCountryLookupStatus(COUNTRIES_DATA[selectedIso3] ? "idle" : "loading");
    fetch(`/api/v1/countries/${selectedIso3}`)
      .then((r) => {
        if (r.status === 404) {
          if (!cancelled) setCountryLookupStatus("missing");
          return null;
        }
        if (!r.ok) {
          if (!cancelled) {
            setCountryLookupStatus(COUNTRIES_DATA[selectedIso3] ? "idle" : "error");
          }
          return null;
        }
        return r.json();
      })
      .then((data: CountryIntelligenceProfile | null) => {
        if (cancelled) return;
        if (data && data.iso3 === selectedIso3) {
          hydratedRef.current[selectedIso3] = data;
          setLiveProfile(data);
          setHydratedCountries((prev) => ({ ...prev, [selectedIso3]: data }));
          setCountryLookupStatus("idle");
        } else {
          setCountryLookupStatus((prev) => (prev === "loading" ? "error" : prev));
        }
      })
      .catch(() => {
        if (!cancelled && !COUNTRIES_DATA[selectedIso3] && !hydratedRef.current[selectedIso3]) {
          setCountryLookupStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedIso3]);

  useEffect(() => {
    if (COUNTRIES_DATA[compareIso3] || hydratedRef.current[compareIso3]) return;
    let cancelled = false;
    fetch(`/api/v1/countries/${compareIso3}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CountryIntelligenceProfile | null) => {
        if (!cancelled && data && data.iso3 === compareIso3) {
          hydratedRef.current[compareIso3] = data;
          setHydratedCountries((prev) => ({ ...prev, [compareIso3]: data }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [compareIso3]);

  const syncAtlasUrl = (nextCountry: string, nextLayer: IntelligenceLayerId, nextCompare: string) => {
    const params = new URLSearchParams({
      country: nextCountry,
      layer: nextLayer,
      compare: nextCompare,
    });
    router.replace(`/atlas?${params.toString()}`, { scroll: false });
  };

  const selectCountry = (iso: string) => {
    const nextIso = iso.trim().toUpperCase();
    const nextCompare = nextIso === compareIso3 ? (nextIso === "IND" ? "CHN" : "IND") : compareIso3;
    setSelectedIso3(nextIso);
    if (nextCompare !== compareIso3) {
      setCompareIso3(nextCompare);
    }
    syncAtlasUrl(nextIso, activeLayer, nextCompare);
  };

  const handleLayerChange = (nextLayer: IntelligenceLayerId) => {
    setActiveLayer(nextLayer);
    syncAtlasUrl(selectedIso3, nextLayer, compareIso3);
  };

  const handleCompareChange = (nextCompareIso: string) => {
    const nextCompare = nextCompareIso.trim().toUpperCase();
    setCompareIso3(nextCompare);
    syncAtlasUrl(selectedIso3, activeLayer, nextCompare);
  };

  const effectiveGdpUsdBn = getEffectiveGdpUsdBn(country);
  const effectiveGdpYear = getEffectiveGdpYear(country);
  const compareEffectiveGdpUsdBn = getEffectiveGdpUsdBn(compareCountry);

  const handleSaveCountry = () => {
    const cleanGrowthLabel =
      country.provenance.missingData && country.gdpGrowthPct === 0 && effectiveGdpUsdBn === 0
        ? "N/A"
        : formatSignedPct(country.gdpGrowthPct);
    const cleanRenewLabel =
      !country.provenance.missingData || country.energyProfile.renewableSharePct > 0
        ? `${country.energyProfile.renewableSharePct}%`
        : "N/A";
    addWorkspaceItem({
      type: "country",
      title: `${country.name} (${country.iso3}) — Country Profile`,
      subtitle: `Economy ${
        effectiveGdpUsdBn > 0 ? formatUsdBnCompact(effectiveGdpUsdBn) : "N/A"
      } • ${cleanGrowthLabel} growth • ${cleanRenewLabel} renewable power`,
      folder: "Geopolitics & Macro",
      tags: [country.name, country.iso3, country.region, "World Bank"],
      href: `/atlas?country=${country.iso3}`,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const hasEnergyTelemetry = hasEnergyProfileData(country);
  const fossilShare = hasEnergyTelemetry
    ? Math.max(
        0,
        100 - country.energyProfile.renewableSharePct - country.energyProfile.nuclearSharePct
      )
    : null;
  const gdpDeltaVsBaseline = effectiveGdpUsdBn - country.gdpUsdBn;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Layer Switcher */}
      <OmnisModuleHeader
        moduleTag="World Atlas"
        title="Interactive 3D Earth & Country Profiles"
        subtitle="Explore accurate borders, live day/night sunlight, and country data across economy, population, clean energy, technology, and world affairs."
        icon={<Globe2 className="w-3.5 h-3.5" />}
        mobileFilterLabel={`Layer: ${LAYERS.find((l) => l.id === activeLayer)?.label ?? "Layers"}`}
        actions={
          <>
            <OmnisButton onClick={handleSaveCountry}>
              {savedNotice ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              <span>{savedNotice ? "Saved to Workspace" : `Save ${country.name} Profile`}</span>
            </OmnisButton>
            <Link
              href={`/research?q=${encodeURIComponent(
                `Explain ${country.name}'s economic and technological development`
              )}`}
              className="omnis-magnetic-arrow min-h-[44px] sm:min-h-0 px-3.5 py-2 rounded-lg bg-[var(--bg-slate)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[13px] font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 transition-colors"
            >
              <FileSearch className="w-3.5 h-3.5 tone-blue" />
              <span>AddyIntelligence</span>
              <ArrowRight className="omnis-arrow-glyph w-3 h-3 opacity-65" />
            </Link>
            <Link
              href={`/knowledge-graph?topic=${encodeURIComponent(country.name)}`}
              className="omnis-magnetic-arrow min-h-[44px] sm:min-h-0 px-3.5 py-2 rounded-lg bg-[var(--bg-slate)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[13px] font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 transition-colors"
            >
              <Network className="w-3.5 h-3.5 tone-violet" />
              <span>Topic Map</span>
              <ArrowRight className="omnis-arrow-glyph w-3 h-3 opacity-65" />
            </Link>
            <Link
              href={`/simulations?category=economics&country=${country.iso3}`}
              className="omnis-magnetic-arrow min-h-[44px] sm:min-h-0 px-3.5 py-2 rounded-lg bg-[var(--bg-slate)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-[13px] font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 transition-colors"
            >
              <TrendingUp className="w-3.5 h-3.5 tone-verified" />
              <span>Run What-If Scenario</span>
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
              onChange={(val) => handleLayerChange(val as IntelligenceLayerId)}
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
        onSelectCountry={selectCountry}
        activeLayer={activeLayer}
        heightClass="h-[340px] sm:h-[420px] xl:h-[480px]"
      />

      {countryLookupStatus === "loading" && (
        <div className="px-4 py-2.5 rounded-xl badge-tone-cyan text-[13.5px]">
          Updating World Bank data for {selectedIso3}…
        </div>
      )}

      {countryLookupStatus === "missing" && (
        <div className="px-4 py-2.5 rounded-xl badge-tone-warning text-[13.5px]">
          Detailed live data isn&apos;t available for &ldquo;{selectedIso3}&rdquo; right now. Basic geographic facts are shown below.
        </div>
      )}

      {countryLookupStatus === "error" && (
        <div className="px-4 py-2.5 rounded-xl badge-tone-warning text-[13.5px]">
          Live World Bank data timed out for {selectedIso3}. Showing saved geographic profile without guessed numbers.
        </div>
      )}

      {/* Dedicated Country Profile */}
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
                  </span>{" "}
                  <CountrySolarClockBadge
                    iso3={country.iso3}
                    lat={country.lat}
                    lng={country.lng}
                    variant="pill"
                    className="mt-1 sm:mt-0 sm:ml-1 align-middle"
                  />
                </p>
              </div>
            </div>
          </div>

          {country.liveWorldBankOverride?.retrievedFromApi && (
            <div className="px-3 py-1.5 rounded-lg badge-tone-verified text-[13px] font-semibold omnis-tabular">
              ✓ World Bank data synced: {country.liveWorldBankOverride.latestYear}
            </div>
          )}
        </div>

        {/* Plain-English 1-Sentence Snapshot */}
        {(() => {
          const scaleTier = describeGlobalScaleTier(effectiveGdpUsdBn);
          const histMult = computeHistoricalMultiple(country);
          return (
            <div
              className="border-l-2 border-[var(--accent-blue)] pl-4 py-1 text-[15px] sm:text-base text-[var(--text-primary)] leading-relaxed"
              style={{ fontFamily: "var(--font-editorial), Georgia, serif" }}
            >
              {effectiveGdpUsdBn > 0
                ? `${country.name} is a ${formatUsdBnCompact(effectiveGdpUsdBn)} economy${
                    scaleTier ? ` (${scaleTier})` : ""
                  }${
                    histMult ? ` that ${histMult.multipleText}` : ""
                  }${
                    country.population > 0
                      ? `, home to ${formatPopulationHuman(country.population, "long")} people`
                      : ""
                  }${
                    hasSectorMetricValue(country, country.gdpPerCapitaUsd) && country.gdpPerCapitaUsd > 0
                      ? ` averaging $${country.gdpPerCapitaUsd.toLocaleString()} per person`
                      : ""
                  } and growing at ${formatSignedPct(country.gdpGrowthPct)} a year.`
                : `${country.name} (${country.iso3}) currently has partial World Bank data returned; verified geographic identifiers and available indicators are listed below.`}
            </div>
          );
        })()}

        {/* Provenance & Methodology Banner */}
        <ProvenancePanel provenance={country.provenance} compact />

        {/* Promoted Historical Chart & Peer Comparison Matrix (Visual-First Above Detailed Sector Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2 pb-6 border-b border-[var(--border-subtle)]">
          <div className="lg:col-span-6 min-w-0 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                {country.name} vs {compareCountry.name} Historical Trajectory (1991–2026)
              </h3>
              <span className="text-xs text-[var(--text-muted)] font-medium">
                Dual-country interactive chart
              </span>
            </div>
            <HistoricalTrajectoryChart country={country} compareCountry={compareCountry} />
          </div>

          <div className="lg:col-span-6 min-w-0 space-y-4 lg:border-l lg:border-[var(--border-subtle)] lg:pl-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-bold flex items-center gap-2 text-[var(--text-primary)]">
                <ArrowLeftRight className="w-4 h-4 tone-blue" />
                Compare {country.name} vs {compareCountry.name}
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/intelligence?left=${country.iso3}&right=${compareCountry.iso3}`}
                  className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 rounded-lg border border-[var(--badge-cyan-border)] bg-[var(--badge-cyan-bg)] px-3 py-1.5 text-xs font-semibold tone-cyan transition-colors hover:brightness-105"
                >
                  <span>Full Comparison</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
                <OmnisSelect
                  value={compareIso3}
                  onChange={handleCompareChange}
                  ariaLabel="Select Comparison Country"
                  menuAlign="right"
                  options={WORLD_COUNTRIES_CATALOG.filter((c) => c.iso3 !== country.iso3).map(
                    (c) => ({
                      value: c.iso3,
                      label: `${c.flagEmoji} ${c.name} (${c.iso3})`,
                      hint: c.curated ? `${c.region} • Curated` : `${c.region} • Live WDI`,
                    })
                  )}
                />
              </div>
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
                    <td className="py-2.5 font-sans text-[var(--text-secondary)]">Total Economy</td>
                    <td
                      className="py-2.5 font-bold"
                      title={effectiveGdpUsdBn > 0 ? `$${effectiveGdpUsdBn.toLocaleString()}B` : "N/A"}
                    >
                      {effectiveGdpUsdBn > 0 ? formatUsdBnCompact(effectiveGdpUsdBn) : "N/A"}
                    </td>
                    <td
                      className="py-2.5 font-bold"
                      title={compareEffectiveGdpUsdBn > 0 ? `$${compareEffectiveGdpUsdBn.toLocaleString()}B` : "N/A"}
                    >
                      {compareEffectiveGdpUsdBn > 0
                        ? formatUsdBnCompact(compareEffectiveGdpUsdBn)
                        : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans text-[var(--text-secondary)]">GDP Per Capita</td>
                    <td className="py-2.5">
                      {hasSectorMetricValue(country, country.gdpPerCapitaUsd) && country.gdpPerCapitaUsd > 0
                        ? `$${country.gdpPerCapitaUsd.toLocaleString()}`
                        : "N/A"}
                    </td>
                    <td className="py-2.5">
                      {hasSectorMetricValue(compareCountry, compareCountry.gdpPerCapitaUsd) &&
                      compareCountry.gdpPerCapitaUsd > 0
                        ? `$${compareCountry.gdpPerCapitaUsd.toLocaleString()}`
                        : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans text-[var(--text-secondary)]">Real GDP Growth</td>
                    <td
                      className={`py-2.5 font-semibold ${
                        country.provenance.missingData &&
                        country.gdpGrowthPct === 0 &&
                        effectiveGdpUsdBn === 0
                          ? "text-[var(--text-muted)]"
                          : country.gdpGrowthPct >= 0
                            ? "tone-verified"
                            : "tone-warning"
                      }`}
                    >
                      {country.provenance.missingData &&
                      country.gdpGrowthPct === 0 &&
                      effectiveGdpUsdBn === 0
                        ? "N/A"
                        : formatSignedPct(country.gdpGrowthPct)}
                    </td>
                    <td
                      className={`py-2.5 font-semibold ${
                        compareCountry.provenance.missingData &&
                        compareCountry.gdpGrowthPct === 0 &&
                        compareEffectiveGdpUsdBn === 0
                          ? "text-[var(--text-muted)]"
                          : compareCountry.gdpGrowthPct >= 0
                            ? "tone-verified"
                            : "tone-warning"
                      }`}
                    >
                      {compareCountry.provenance.missingData &&
                      compareCountry.gdpGrowthPct === 0 &&
                      compareEffectiveGdpUsdBn === 0
                        ? "N/A"
                        : formatSignedPct(compareCountry.gdpGrowthPct)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans text-[var(--text-secondary)]">Renewable Grid Share</td>
                    <td className="py-2.5">
                      {!country.provenance.missingData || country.energyProfile.renewableSharePct > 0
                        ? `${country.energyProfile.renewableSharePct}%`
                        : "N/A"}
                    </td>
                    <td className="py-2.5">
                      {!compareCountry.provenance.missingData ||
                      compareCountry.energyProfile.renewableSharePct > 0
                        ? `${compareCountry.energyProfile.renewableSharePct}%`
                        : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans text-[var(--text-secondary)]">R&D Spend (% GDP)</td>
                    <td className="py-2.5">
                      {formatCountryMetricOrNa(
                        country,
                        country.technologyProfile.rdSpendPctGdp,
                        (v) => `${v}%`
                      )}
                    </td>
                    <td className="py-2.5">
                      {formatCountryMetricOrNa(
                        compareCountry,
                        compareCountry.technologyProfile.rdSpendPctGdp,
                        (v) => `${v}%`
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans text-[var(--text-secondary)]">Median Age / Life Exp</td>
                    <td className="py-2.5">
                      {formatCountryMetricOrNa(country, country.medianAgeYears, (v) => `${v}y`)} /{" "}
                      {formatCountryMetricOrNa(country, country.lifeExpectancyYears, (v) => `${v}y`)}
                    </td>
                    <td className="py-2.5">
                      {formatCountryMetricOrNa(
                        compareCountry,
                        compareCountry.medianAgeYears,
                        (v) => `${v}y`
                      )}{" "}
                      /{" "}
                      {formatCountryMetricOrNa(
                        compareCountry,
                        compareCountry.lifeExpectancyYears,
                        (v) => `${v}y`
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Link
              href={`/intelligence?left=${country.iso3}&right=${compareCountry.iso3}`}
              className="omnis-magnetic-arrow inline-flex items-center gap-1.5 text-[13.5px] font-semibold tone-blue hover:underline"
            >
              <span>Open Full Comparison &amp; Charts</span>
              <ArrowRight className="omnis-arrow-glyph w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Seamless Architectural 2x3 Country Discipline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border border-[var(--border-subtle)] rounded-2xl overflow-hidden bg-[var(--bg-graphite)]">
          {/* ECONOMY */}
          <div className="p-5 border-b border-[var(--border-subtle)] md:border-r space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold tone-blue">
              <TrendingUp className="w-4 h-4" />
              <span>Economy</span>
            </div>
            <div className="divide-y divide-[var(--border-subtle)] text-[13.5px] sm:text-sm">
              <div className="flex items-baseline justify-between py-2 gap-2">
                <span className="text-[var(--text-secondary)]">Total Economy (GDP)</span>
                <span className="inline-flex flex-wrap items-center justify-end gap-1.5 font-bold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  <span title={effectiveGdpUsdBn > 0 ? `$${effectiveGdpUsdBn.toLocaleString()} billion` : "N/A"}>
                    {effectiveGdpUsdBn > 0 ? formatUsdBnCompact(effectiveGdpUsdBn) : "N/A"}
                  </span>
                  {effectiveGdpUsdBn > 0 && (
                    <span className="text-xs font-normal text-[var(--text-muted)]">
                      (${effectiveGdpUsdBn.toLocaleString()}B)
                    </span>
                  )}
                  {effectiveGdpYear && Math.abs(gdpDeltaVsBaseline) >= 0.1 ? (
                    <span
                      title={`Static baseline: $${country.gdpUsdBn.toLocaleString()}B vs World Bank ${effectiveGdpYear}`}
                      className="px-1.5 py-0.5 rounded text-[11px] font-semibold badge-tone-verified"
                    >
                      World Bank {effectiveGdpYear}
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="py-2 space-y-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                    Average Income per Person
                    <OmnisGlossaryTip term="GDP Per Capita" />
                  </span>
                  <span className="font-bold omnis-mono omnis-tabular text-[var(--text-primary)]">
                    {hasSectorMetricValue(country, country.gdpPerCapitaUsd) && country.gdpPerCapitaUsd > 0
                      ? `$${country.gdpPerCapitaUsd.toLocaleString()}`
                      : "N/A"}
                  </span>
                </div>
                {hasSectorMetricValue(country, country.gdpPerCapitaUsd) && country.gdpPerCapitaUsd > 0 ? (
                  <div className="text-[11.5px] text-[var(--text-muted)] text-right">
                    Compared to world avg: {describeVsBenchmark("gdpPerCapitaUsd", country.gdpPerCapitaUsd).summary}
                  </div>
                ) : null}
              </div>
              <div className="py-2 space-y-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[var(--text-secondary)]">Annual Growth Rate</span>
                  <span
                    className={`font-bold omnis-mono omnis-tabular ${
                      country.provenance.missingData &&
                      country.gdpGrowthPct === 0 &&
                      effectiveGdpUsdBn === 0
                        ? "text-[var(--text-muted)]"
                        : country.gdpGrowthPct >= 0
                          ? "tone-verified"
                          : "tone-warning"
                    }`}
                  >
                    {country.provenance.missingData &&
                    country.gdpGrowthPct === 0 &&
                    effectiveGdpUsdBn === 0
                      ? "N/A"
                      : `${formatSignedPct(country.gdpGrowthPct)} / yr`}
                  </span>
                </div>
                {!(country.provenance.missingData && country.gdpGrowthPct === 0 && effectiveGdpUsdBn === 0) ? (
                  <div className="text-[11.5px] text-[var(--text-muted)] text-right">
                    {describeVsBenchmark("gdpGrowthPct", country.gdpGrowthPct).summary}
                  </div>
                ) : null}
              </div>
              <div className="flex items-baseline justify-between py-2 gap-2">
                <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                  Annual Price Rise (Inflation)
                  <OmnisGlossaryTip term="CPI / Inflation" />
                </span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {formatCountryMetricOrNa(country, country.inflationPct, (v) => `${v}%`)}
                </span>
              </div>
              <div className="flex items-baseline justify-between py-2 gap-2">
                <span className="text-[var(--text-secondary)]">Unemployment Rate</span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {formatCountryMetricOrNa(country, country.unemploymentPct, (v) => `${v}%`)}
                </span>
              </div>
              <div className="py-2 space-y-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                    Public Debt (% of Economy)
                    <OmnisGlossaryTip term="Public Debt (% of GDP)" />
                  </span>
                  <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                    {formatCountryMetricOrNa(country, country.publicDebtPctGdp, (v) => `${v}%`)}
                  </span>
                </div>
                {hasSectorMetricValue(country, country.publicDebtPctGdp) ? (
                  <div className="text-[11.5px] text-[var(--text-muted)] text-right">
                    {describeVsBenchmark("publicDebtPctGdp", country.publicDebtPctGdp).summary}
                  </div>
                ) : null}
              </div>
              <div className="flex items-baseline justify-between py-2 gap-2">
                <span className="text-[var(--text-secondary)]">Government Spending</span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {formatCountryMetricOrNa(country, country.govExpenditurePctGdp, (v) => `${v}% of GDP`)}
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-2 gap-2">
                <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                  Foreign Investment Inflow
                  <OmnisGlossaryTip term="Foreign Investment (FDI)" />
                </span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {formatCountryMetricOrNa(country, country.fdiNetInflowsUsdBn, (v) => `$${v}B`)}
                </span>
              </div>
            </div>
          </div>

          {/* PEOPLE & LIVING STANDARDS */}
          <div className="p-5 border-b border-[var(--border-subtle)] lg:border-r space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold tone-violet">
              <Users className="w-4 h-4" />
              <span>People &amp; Health</span>
            </div>
            <div className="divide-y divide-[var(--border-subtle)] text-[13.5px] sm:text-sm">
              <div className="flex items-baseline justify-between py-2 gap-2">
                <span className="text-[var(--text-secondary)]">Total Population</span>
                <span
                  title={country.population > 0 ? country.population.toLocaleString() : "N/A"}
                  className="font-bold omnis-mono omnis-tabular text-[var(--text-primary)]"
                >
                  {formatPopulationHuman(country.population, "long")}
                </span>
              </div>
              <div className="flex items-baseline justify-between py-2 gap-2">
                <span className="text-[var(--text-secondary)]">Life Expectancy</span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {formatCountryMetricOrNa(country, country.lifeExpectancyYears, (v) => `${v} yrs`)}
                </span>
              </div>
              <div className="flex items-baseline justify-between py-2 gap-2">
                <span className="text-[var(--text-secondary)]">Median Age</span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {formatCountryMetricOrNa(country, country.medianAgeYears, (v) => `${v} yrs`)}
                </span>
              </div>
              <div className="flex items-baseline justify-between py-2 gap-2">
                <span className="text-[var(--text-secondary)]">People per km²</span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {hasSectorMetricValue(country, country.populationDensityPerSqKm)
                    ? `${country.populationDensityPerSqKm.toLocaleString()}/km²`
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-baseline justify-between py-2 gap-2">
                <span className="text-[var(--text-secondary)]">Living in Cities</span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {formatCountryMetricOrNa(country, country.urbanisationPct, (v) => `${v}%`)}
                </span>
              </div>
              <div className="flex items-baseline justify-between py-2 gap-2">
                <span className="text-[var(--text-secondary)]">Adult Literacy Rate</span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {formatCountryMetricOrNa(country, country.educationHealthcare.literacyRatePct, (v) => `${v}%`)}
                </span>
              </div>
              <div className="flex items-baseline justify-between py-2 gap-2">
                <span className="text-[var(--text-secondary)]">Education Spending</span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {formatCountryMetricOrNa(
                    country,
                    country.educationHealthcare.educationSpendPctGdp,
                    (v) => `${v}% of GDP`
                  )}
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-2 gap-2">
                <span className="text-[var(--text-secondary)]">Healthcare Spending</span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)] text-right">
                  {hasSectorMetricValue(country, country.educationHealthcare.healthcareSpendPctGdp)
                    ? `${country.educationHealthcare.healthcareSpendPctGdp}% of GDP (${country.educationHealthcare.physiciansPer1000} ${
                        country.educationHealthcare.physiciansPer1000 === 1 ? "doctor" : "doctors"
                      } per 1,000 people)`
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* ENERGY & CLIMATE */}
          <div className="p-5 border-b border-[var(--border-subtle)] md:border-r lg:border-r-0 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold tone-verified">
              <Zap className="w-4 h-4" />
              <span>Energy &amp; Climate</span>
            </div>
            <div className="divide-y divide-[var(--border-subtle)] text-[13.5px] sm:text-sm">
              <div className="flex items-baseline justify-between py-2 gap-2">
                <span className="text-[var(--text-secondary)]">Annual Electricity Output</span>
                <span className="font-bold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {formatCountryMetricOrNa(
                    country,
                    country.energyProfile.electricityGenerationTwh,
                    (v) => `${v.toLocaleString()} TWh`
                  )}
                </span>
              </div>
              <div className="py-2 space-y-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[var(--text-secondary)]">Renewable Share</span>
                  <span className="font-bold omnis-mono omnis-tabular tone-verified">
                    {!country.provenance.missingData || country.energyProfile.renewableSharePct > 0
                      ? `${country.energyProfile.renewableSharePct}%`
                      : "N/A"}
                  </span>
                </div>
                {!country.provenance.missingData || country.energyProfile.renewableSharePct > 0 ? (
                  <div className="text-[11.5px] text-[var(--text-muted)] text-right">
                    {describeVsBenchmark("renewableSharePct", country.energyProfile.renewableSharePct).summary}
                  </div>
                ) : null}
              </div>
              <div className="flex items-baseline justify-between py-2 gap-2">
                <span className="text-[var(--text-secondary)]">Nuclear Share</span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {hasEnergyTelemetry
                    ? `${country.energyProfile.nuclearSharePct}%`
                    : formatCountryMetricOrNa(
                        country,
                        country.energyProfile.nuclearSharePct,
                        (v) => `${v}%`
                      )}
                </span>
              </div>
              <div className="flex items-baseline justify-between py-2 gap-2">
                <span className="text-[var(--text-secondary)]">Oil &amp; Gas Production</span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {hasSectorMetricValue(country, country.energyProfile.oilProductionMbpd) ||
                  hasSectorMetricValue(country, country.energyProfile.naturalGasBcm)
                    ? `${country.energyProfile.oilProductionMbpd} Mb/d • ${country.energyProfile.naturalGasBcm} bcm`
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-baseline justify-between py-2 gap-2">
                <span className="text-[var(--text-secondary)]">CO2 Emissions</span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {hasSectorMetricValue(country, country.environmentProfile.co2EmissionsMt)
                    ? `${country.environmentProfile.co2EmissionsMt} Mt • ${country.environmentProfile.co2PerCapitaTons} t per person`
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-baseline justify-between py-2 gap-2">
                <span className="text-[var(--text-secondary)]">Forest Cover</span>
                <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {formatCountryMetricOrNa(
                    country,
                    country.environmentProfile.forestCoveragePct,
                    (v) => `${v}%`
                  )}
                </span>
              </div>
              <div className="py-2 space-y-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                    Air Quality (PM2.5)
                    <OmnisGlossaryTip term="PM2.5 Air Pollution" />
                  </span>
                  <span className="font-semibold omnis-mono omnis-tabular text-[var(--text-primary)]">
                    {formatCountryMetricOrNa(
                      country,
                      country.environmentProfile.pm25AirQualityUgM3,
                      (v) => `${v} µg/m³`
                    )}
                  </span>
                </div>
                {hasSectorMetricValue(country, country.environmentProfile.pm25AirQualityUgM3) &&
                country.environmentProfile.pm25AirQualityUgM3 > 0 ? (
                  <div className="text-[11.5px] text-[var(--text-muted)] text-right">
                    {describeVsBenchmark("pm25AirQualityUgM3", country.environmentProfile.pm25AirQualityUgM3).summary}
                  </div>
                ) : null}
              </div>
              <div className="flex items-baseline justify-between py-2 gap-2">
                <span className="text-[var(--text-secondary)]">Local Warming</span>
                <span className="font-semibold omnis-mono omnis-tabular tone-warning">
                  {formatCountryMetricOrNa(
                    country,
                    country.environmentProfile.tempAnomalyC,
                    (v) => formatSignedValue(v, "°C")
                  )}
                </span>
              </div>
            </div>
            <div className="space-y-1 pt-1">
              {fossilShare !== null ? (
                <>
                  <div className="flex justify-between text-xs omnis-mono omnis-tabular text-[var(--text-muted)]">
                    <span>{country.energyProfile.renewableSharePct}% Clean</span>
                    <span>{country.energyProfile.nuclearSharePct}% Nuclear</span>
                    <span>{fossilShare.toFixed(0)}% Fossil fuels</span>
                  </div>
                  <div className="h-2 w-full rounded-full overflow-hidden flex bg-[var(--bg-graphite)] border border-[var(--border-subtle)]">
                    <div
                      style={{
                        width: `${country.energyProfile.renewableSharePct}%`,
                        backgroundColor: "var(--chart-emerald)",
                      }}
                      title="Renewable"
                    />
                    <div
                      style={{
                        width: `${country.energyProfile.nuclearSharePct}%`,
                        backgroundColor: "var(--chart-violet)",
                      }}
                      title="Nuclear"
                    />
                    <div
                      style={{
                        width: `${fossilShare}%`,
                        backgroundColor: "var(--chart-amber)",
                        opacity: 0.7,
                      }}
                      title="Fossil fuels"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-xs omnis-tabular text-[var(--text-muted)]">
                    <span>
                      {country.energyProfile.renewableSharePct > 0
                        ? `${country.energyProfile.renewableSharePct}% Clean`
                        : "Clean N/A"}
                    </span>
                    <span>Waiting on official data</span>
                  </div>
                  <svg
                    className="h-2.5 w-full rounded-full overflow-hidden border border-[var(--border-subtle)]"
                    viewBox="0 0 200 10"
                    preserveAspectRatio="none"
                    aria-label="Energy Mix Data Pending Upstream Telemetry"
                  >
                    <defs>
                      <pattern
                        id="omnis-na-hatch"
                        width="8"
                        height="8"
                        patternUnits="userSpaceOnUse"
                        patternTransform="rotate(45)"
                      >
                        <rect width="8" height="8" fill="var(--bg-slate)" />
                        <line
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="8"
                          stroke="var(--border-strong)"
                          strokeWidth="2.5"
                        />
                      </pattern>
                    </defs>
                    <rect width="200" height="10" fill="url(#omnis-na-hatch)" />
                    {country.energyProfile.renewableSharePct > 0 ? (
                      <rect
                        width={(country.energyProfile.renewableSharePct / 100) * 200}
                        height="10"
                        fill="var(--chart-emerald)"
                      />
                    ) : null}
                  </svg>
                </>
              )}
            </div>
          </div>

          {/* TECHNOLOGY & INNOVATION */}
          <div className="p-5 border-b lg:border-b-0 border-[var(--border-subtle)] lg:border-r space-y-3 text-[13.5px] sm:text-sm">
            <div className="flex items-center gap-2 text-sm font-bold tone-cyan">
              <Cpu className="w-4 h-4" />
              <span>Technology &amp; Innovation</span>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              <div className="flex items-baseline justify-between py-1.5 gap-2">
                <span className="text-[var(--text-muted)]">AI Readiness Index</span>
                <span className="font-bold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {formatCountryMetricOrNa(country, country.technologyProfile.aiReadinessIndex, String)}
                </span>
              </div>
              <div className="py-1.5 space-y-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
                    R&amp;D Intensity
                    <OmnisGlossaryTip term="R&D Intensity" />
                  </span>
                  <span className="font-bold omnis-mono omnis-tabular text-[var(--text-primary)]">
                    {formatCountryMetricOrNa(
                      country,
                      country.technologyProfile.rdSpendPctGdp,
                      (v) => `${v}% GDP`
                    )}
                  </span>
                </div>
                {hasSectorMetricValue(country, country.technologyProfile.rdSpendPctGdp) ? (
                  <div className="text-[11.5px] text-[var(--text-muted)] text-right">
                    {describeVsBenchmark("rdSpendPctGdp", country.technologyProfile.rdSpendPctGdp).summary}
                  </div>
                ) : null}
              </div>
              <div className="flex items-baseline justify-between py-1.5 gap-2">
                <span className="text-[var(--text-muted)]">Internet Penetration</span>
                <span className="font-bold omnis-mono omnis-tabular text-[var(--text-primary)]">
                  {formatCountryMetricOrNa(
                    country,
                    country.technologyProfile.internetPenetrationPct,
                    (v) => `${v}%`
                  )}
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

          {/* GOVERNMENT & GEOGRAPHY */}
          <div className="p-5 border-b md:border-b-0 border-[var(--border-subtle)] md:border-r space-y-3 text-[13.5px] sm:text-sm">
            <div className="flex items-center gap-2 text-sm font-bold tone-warning">
              <Landmark className="w-4 h-4" />
              <span>Government &amp; Land</span>
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

          {/* GLOBAL TRADE & TIES */}
          <div className="p-5 space-y-3 text-[13.5px] sm:text-sm">
            <div className="flex items-center gap-2 text-sm font-bold tone-violet">
              <Shield className="w-4 h-4" />
              <span>Trade &amp; Global Ties</span>
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
      </div>
    </div>
  );
}

export default function GlobalAtlasPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 max-w-7xl mx-auto">
          <OmnisLoader label="Loading World Earth Globe…" />
        </div>
      }
    >
      <GlobalAtlasContent />
    </Suspense>
  );
}
