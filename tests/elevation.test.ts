import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COUNTRIES_DATA } from "@/lib/data/global-intelligence";
import { buildSovereignComparisonMatrix } from "@/lib/research/compare";
import { buildInfiniteKnowledgeGraph, findShortestCausalPath } from "@/lib/graph/engine";
import { executeWhatIfSimulation, parseSimulationQueryPrompt } from "@/lib/simulations/engine";
import {
  mapYearToTimelinePercent,
  findNearestEventByPercent,
} from "@/lib/timeline/scale";
import { ISO3_TO_NUMERIC } from "@/lib/data/world-catalog";
import {
  getSubsolarPoint,
  getSunVectorInEarthFrame,
  latLngToEarthVector,
  getCountrySolarState,
  getTimeZoneForCountry,
  wrapLongitude,
  ISO3_TIMEZONES,
} from "@/lib/solarTime";
import {
  clearLiveCountryCacheForTests,
  fetchLiveCountryIntelligence,
} from "@/lib/providers/live-data";
import {
  classifyQueryIntent,
  executeUniversalSearch,
  orchestrateDeepResearch,
} from "@/lib/research/engine";
import {
  formatMonetaryAxisTick,
  formatSignedPct,
  formatSignedValue,
  formatUsdBnCompact,
} from "@/lib/formatters";
import { SimulationRequestSchema } from "@/types/omnis";
import {
  clearHealthCacheForTests,
  probeUpstreamProviders,
} from "@/lib/providers/health";
import {
  OmnisMobileBottomSheet,
  OmnisModuleErrorFallback,
  OmnisModuleHeader,
} from "@/components/ui/OmnisPrimitives";
import { enforceRequestRateLimit, clampIntParam } from "@/lib/security/guardrails";
import {
  doesSignalMatchCandidate,
  matchCountryCatalogFromText,
} from "@/lib/intelligence/spatial-sync";
import { VerificationBadge } from "@/components/ui/ProvenancePanel";
import { OmnisMathBlock } from "@/components/ui/OmnisMathBlock";

afterEach(() => {
  vi.unstubAllGlobals();
  clearLiveCountryCacheForTests();
  clearHealthCacheForTests();
});

describe("OMNIS Elevation & Credibility Regression Suite", () => {
  it("computes distinct renewable electricity shares for both left and right sovereigns", () => {
    const indVsChn = buildSovereignComparisonMatrix(COUNTRIES_DATA.IND, COUNTRIES_DATA.CHN);
    const renewableRow = indVsChn.find((row) => row.label === "Renewable Electricity (%)");
    expect(renewableRow).toBeDefined();
    expect(renewableRow?.leftVal).toBe(COUNTRIES_DATA.IND.energyProfile.renewableSharePct);
    expect(renewableRow?.rightVal).toBe(COUNTRIES_DATA.CHN.energyProfile.renewableSharePct);
    expect(renewableRow?.leftVal).not.toBe(renewableRow?.rightVal);

    const usaVsDeu = buildSovereignComparisonMatrix(COUNTRIES_DATA.USA, COUNTRIES_DATA.DEU);
    const usaDeuRenew = usaVsDeu.find((row) => row.label === "Renewable Electricity (%)");
    expect(usaDeuRenew?.leftVal).toBe(COUNTRIES_DATA.USA.energyProfile.renewableSharePct);
    expect(usaDeuRenew?.rightVal).toBe(COUNTRIES_DATA.DEU.energyProfile.renewableSharePct);
    expect(usaDeuRenew?.leftVal).not.toBe(usaDeuRenew?.rightVal);
  });

  it("synthesizes distinct domain graphs without falling back to AI Safety for unrelated topics", () => {
    const semiGraph = buildInfiniteKnowledgeGraph({ topic: "Semiconductors", maxNodes: 16 });
    const semiLabels = semiGraph.nodes.map((n) => n.label.toLowerCase()).join(" | ");
    expect(semiGraph.isSynthesizedFallback).toBe(false);
    expect(semiLabels).toMatch(/euv|lithography|tsmc|asml/);
    expect(semiLabels).not.toContain("rlhf");

    const energyGraph = buildInfiniteKnowledgeGraph({ topic: "Clean Energy", maxNodes: 16 });
    expect(energyGraph.isSynthesizedFallback).toBe(false);
    expect(energyGraph.nodes.map((n) => n.label.toLowerCase()).join(" ")).toMatch(/solar|battery|grid/);

    const climateGraph = buildInfiniteKnowledgeGraph({ topic: "Climate Carbon Cycle", maxNodes: 16 });
    expect(climateGraph.isSynthesizedFallback).toBe(false);
    expect(climateGraph.nodes.map((n) => n.label.toLowerCase()).join(" ")).toMatch(/carbon|methane|tcre|emissions/);

    const dpiGraph = buildInfiniteKnowledgeGraph({
      topic: "Digital Public Infrastructure",
      maxNodes: 16,
    });
    expect(dpiGraph.isSynthesizedFallback).toBe(false);
    expect(dpiGraph.nodes.map((n) => n.label.toLowerCase()).join(" ")).toMatch(/upi|aadhaar|dpi|payment/);

    const quantumGraph = buildInfiniteKnowledgeGraph({
      topic: "Quantum Computing",
      maxNodes: 16,
    });
    const quantumLabels = quantumGraph.nodes.map((n) => n.label.toLowerCase()).join(" | ");
    expect(quantumGraph.isSynthesizedFallback).toBe(true);
    expect(quantumLabels).toContain("quantum computing");
    expect(quantumLabels).not.toContain("ai safety");
    expect(quantumLabels).not.toContain("rlhf");
  });

  it("produces signed deterministic Tornado counterfactual deltas matching true parameter elasticities", () => {
    const econSim = executeWhatIfSimulation({
      scenarioId: "econ-macro-shock",
      category: "economics",
      horizonYears: 15,
      seed: 42,
      overrides: {
        oilPriceShockPct: 0,
        interestRateDeltaBps: 0,
        fiscalStimulusPctGdp: 0.5,
        tariffRatePct: 2,
      },
    });
    const rateSensitivity = econSim.sensitivity.find((s) => s.parameterKey === "interestRateDeltaBps");
    const fiscalSensitivity = econSim.sensitivity.find(
      (s) => s.parameterKey === "fiscalStimulusPctGdp"
    );
    expect(rateSensitivity).toBeDefined();
    expect(fiscalSensitivity).toBeDefined();
    // Higher interest rates dampen GDP -> highOutcomeDelta < 0, lowOutcomeDelta > 0
    expect(rateSensitivity!.highOutcomeDelta).toBeLessThan(0);
    expect(rateSensitivity!.lowOutcomeDelta).toBeGreaterThan(0);
    // Higher fiscal stimulus boosts GDP -> highOutcomeDelta > 0, lowOutcomeDelta < 0
    expect(fiscalSensitivity!.highOutcomeDelta).toBeGreaterThan(0);
    expect(fiscalSensitivity!.lowOutcomeDelta).toBeLessThan(0);

    const climateSim = executeWhatIfSimulation({
      scenarioId: "env-climate-carbon",
      category: "environment",
      horizonYears: 20,
      seed: 42,
      overrides: {
        annualEmissionsReductionPct: 2.0,
        methaneAbatementPct: 15,
        reforestationSinkGt: 2.0,
      },
    });
    const emissionsSensitivity = climateSim.sensitivity.find(
      (s) => s.parameterKey === "annualEmissionsReductionPct"
    );
    expect(emissionsSensitivity).toBeDefined();
    expect(emissionsSensitivity!.highOutcomeDelta).toBeLessThan(
      emissionsSensitivity!.lowOutcomeDelta
    );
  });

  it("hydrates non-curated sovereigns (CAN) via REST Countries & World Bank without falling back to IND, and returns null for invalid ZZZ", async () => {
    const mockFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("restcountries.com/v3.1/alpha/CAN")) {
        return new Response(
          JSON.stringify([
            {
              cca2: "CA",
              cca3: "CAN",
              flag: "🇨🇦",
              name: { common: "Canada", official: "Canada" },
              capital: ["Ottawa"],
              region: "Americas",
              subregion: "North America",
              latlng: [60, -95],
              population: 40_100_000,
              area: 9_984_670,
              languages: { eng: "English", fra: "French" },
              currencies: { CAD: { name: "Canadian dollar", symbol: "$" } },
              landlocked: false,
              borders: ["USA"],
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("api.worldbank.org/v2/country/CAN/indicator/NY.GDP.MKTP.CD")) {
        return new Response(
          JSON.stringify([
            { page: 1 },
            [
              { country: { value: "Canada" }, date: "2024", value: 2_140_000_000_000 },
              { country: { value: "Canada" }, date: "2023", value: 2_117_000_000_000 },
            ],
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("api.worldbank.org/v2/country/CAN/indicator/NY.GDP.MKTP.KD.ZG")) {
        return new Response(
          JSON.stringify([
            { page: 1 },
            [
              { country: { value: "Canada" }, date: "2024", value: 1.52 },
              { country: { value: "Canada" }, date: "2023", value: 1.24 },
            ],
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("api.worldbank.org/v2/country/CAN/indicator/EG.ELC.RNEW.ZS")) {
        return new Response(
          JSON.stringify([
            { page: 1 },
            [{ country: { value: "Canada" }, date: "2024", value: 66.8 }],
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ status: 404 }), { status: 404 });
    });

    const canada = await fetchLiveCountryIntelligence("CAN", mockFetch as unknown as typeof fetch);
    expect(canada).not.toBeNull();
    expect(canada?.iso3).toBe("CAN");
    expect(canada?.name).toBe("Canada");
    expect(canada?.name).not.toBe("India");
    expect(canada?.capital).toBe("Ottawa");
    expect(canada?.gdpUsdBn).toBe(2140);
    expect(canada?.energyProfile.renewableSharePct).toBe(66.8);
    expect(canada?.provenance.missingData).toBe(true);
    expect(canada?.historicalSeries.length).toBeGreaterThanOrEqual(2);

    const invalid = await fetchLiveCountryIntelligence("ZZZ", mockFetch as unknown as typeof fetch);
    expect(invalid).toBeNull();
  });

  it("grounds Deep Research telemetry in OpenAlex annual publication data rather than static dummy arrays", async () => {
    const DUMMY_SERIES = [100, 138, 196, 268, 332, 418, 492];

    const populatedFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("group_by=publication_year")) {
        return new Response(
          JSON.stringify({
            meta: { count: 14200 },
            group_by: [
              { key: "2020", count: 140 },
              { key: "2021", count: 195 },
              { key: "2022", count: 260 },
              { key: "2023", count: 310 },
              { key: "2024", count: 405 },
              { key: "2025", count: 470 },
            ],
          }),
          { status: 200 }
        );
      }
      if (url.includes("api.openalex.org/works")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: "https://openalex.org/W123",
                title: "Fault-Tolerant Surface Codes in Superconducting Qubits",
                publication_year: 2025,
                doi: "https://doi.org/10.1000/qec",
                cited_by_count: 145,
                primary_location: { source: { display_name: "Nature Physics" } },
                authorships: [{ author: { display_name: "A. Researcher" } }],
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          title: "Quantum error correction",
          extract: "Quantum error correction protects quantum information from decoherence.",
          content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Quantum_error_correction" } },
        }),
        { status: 200 }
      );
    });

    vi.stubGlobal("fetch", populatedFetch);
    clearLiveCountryCacheForTests();
    const report = await orchestrateDeepResearch("Quantum error correction", "deep");
    expect(report.visualisationSeries).toBeDefined();
    expect(report.visualisationSeries.source).toContain("OpenAlex");
    expect(report.visualisationSeries.data.map((p) => p.primaryValue)).toEqual([
      140, 195, 260, 310, 405, 470,
    ]);
    expect(report.visualisationSeries.data.map((p) => p.primaryValue)).not.toEqual(DUMMY_SERIES);

    // When upstream feeds return empty/offline responses, must explicitly abstain instead of inventing numbers
    const emptyFetch = vi.fn(async () => new Response("{}", { status: 503 }));
    vi.stubGlobal("fetch", emptyFetch);
    clearLiveCountryCacheForTests();
    const sparseReport = await orchestrateDeepResearch("Unobserved exotic query 99", "quick");
    expect(sparseReport.visualisationSeries.data.length).toBe(0);
    expect(sparseReport.visualisationSeries.source).toContain("no dummy series substituted");
  });

  it("reports real degraded/unreachable upstream statuses rather than hardcoded operational health", async () => {
    const failingFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("worldbank")) {
        return new Response("Server Error", { status: 500 });
      }
      if (url.includes("restcountries")) {
        throw new Error("ENOTFOUND");
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const report = await probeUpstreamProviders({
      fetchFn: failingFetch as unknown as typeof fetch,
      timeoutMs: 500,
      bypassCache: true,
    });

    const wb = report.providers.find((p) => p.id === "world-bank");
    const rc = report.providers.find((p) => p.id === "rest-countries");
    const openAlex = report.providers.find((p) => p.id === "openalex");
    expect(wb?.status).toBe("degraded");
    expect(wb?.httpStatus).toBe(500);
    expect(rc?.status).toBe("unreachable");
    expect(rc?.httpStatus).toBeNull();
    expect(openAlex?.status).toBe("operational");
    expect(report.status).toBe("degraded");

    const deprecatedFetch = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("restcountries")) {
        return new Response(
          JSON.stringify({ success: false, errors: [{ message: "API deprecated" }] }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    const depReport = await probeUpstreamProviders({
      fetchFn: deprecatedFetch as unknown as typeof fetch,
      timeoutMs: 500,
      bypassCache: true,
    });
    expect(depReport.providers.find((p) => p.id === "rest-countries")?.status).toBe("degraded");
  });

  it("hydrates ISO3 capital, flag emoji, and population from World Bank v2 when REST Countries is unavailable", async () => {
    const wbOnlyFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("restcountries")) {
        return new Response(JSON.stringify({ success: false, errors: [{ message: "Deprecated" }] }), {
          status: 200,
        });
      }
      if (url.includes("/v2/country/CAN?format=json")) {
        return new Response(
          JSON.stringify([
            { page: 1 },
            [
              {
                id: "CAN",
                iso2Code: "CA",
                name: "Canada",
                capitalCity: "Ottawa",
                region: { value: "North America" },
                incomeLevel: { value: "High income" },
                latitude: "45.4215",
                longitude: "-75.6919",
              },
            ],
          ]),
          { status: 200 }
        );
      }
      if (url.includes("SP.POP.TOTL")) {
        return new Response(JSON.stringify([{ page: 1 }, [{ date: "2024", value: 41_288_599 }]]), {
          status: 200,
        });
      }
      if (url.includes("NY.GDP.MKTP.CD")) {
        return new Response(
          JSON.stringify([{ page: 1 }, [{ country: { value: "Canada" }, date: "2024", value: 2_240_000_000_000 }]]),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify([{ page: 1 }, []]), { status: 200 });
    });

    const can = await fetchLiveCountryIntelligence("CAN", wbOnlyFetch as unknown as typeof fetch);
    expect(can?.name).toBe("Canada");
    expect(can?.flagEmoji).toBe("🇨🇦");
    expect(can?.capital).toBe("Ottawa");
    expect(can?.region).toBe("North America");
    expect(can?.population).toBe(41_288_599);
    expect(can?.gdpUsdBn).toBe(2240);
  });

  it("renders OmnisModuleHeader, distinct epistemic VerificationBadge tones, and KaTeX SSR math cleanly", () => {
    const headerHtml = renderToStaticMarkup(
      React.createElement(OmnisModuleHeader, {
        moduleTag: "TEST MODULE",
        title: "Compact Diagnostic Header",
        subtitle: "Open hairline baseline header",
        icon: React.createElement("span", null, "I"),
        secondaryControls: React.createElement("div", null, "Filter Controls"),
      })
    );
    expect(headerHtml).toContain("border-b border-[var(--border-subtle)]");
    expect(headerHtml).toContain('aria-expanded="false"');
    expect(headerHtml).not.toContain("omnis-card");

    const singleSourceHtml = renderToStaticMarkup(
      React.createElement(VerificationBadge, { status: "single_source" })
    );
    const hypothesisHtml = renderToStaticMarkup(
      React.createElement(VerificationBadge, { status: "ai_hypothesis" })
    );
    expect(singleSourceHtml).toContain("badge-tone-cyan");
    expect(hypothesisHtml).toContain("badge-tone-hypothesis");

    const mathHtml = renderToStaticMarkup(
      React.createElement(OmnisMathBlock, {
        latex: "E = mc^2",
        label: "Relativistic Energy",
      })
    );
    expect(mathHtml).toContain("katex");
    expect(mathHtml).toContain("Copy TeX");
  });

  it("supports the Global Geopolitics & Trade Corridors blueprint and grounds unmatched topics against tracked records", () => {
    const geoGraph = buildInfiniteKnowledgeGraph({
      topic: "Global Geopolitics & Trade Corridors",
      maxNodes: 16,
    });
    expect(geoGraph.isSynthesizedFallback).toBe(false);
    expect(geoGraph.domainMatched).toBe("Global Geopolitics & Trade Corridors");
    const geoLabels = geoGraph.nodes.map((n) => n.label.toLowerCase()).join(" | ");
    expect(geoLabels).toMatch(/malacca|tariff|corridor/);
    expect(geoLabels).not.toContain("rlhf");

    const qGraph = buildInfiniteKnowledgeGraph({
      topic: "Quantum Cryptography",
      maxNodes: 16,
    });
    const qLabels = qGraph.nodes.map((n) => n.label.toLowerCase()).join(" | ");
    expect(qGraph.isSynthesizedFallback).toBe(true);
    expect(qLabels).toContain("quantum computing");
  });

  it("enforces honest zero-match empty results in Universal Search instead of generic India fallback", async () => {
    const zero = executeUniversalSearch("zzzzxyznonexistenttoken999");
    expect(zero.countries).toHaveLength(0);
    expect(zero.historicalEvents).toHaveLength(0);
    expect(zero.technologiesAndOrganizations).toHaveLength(0);

    const curated = executeUniversalSearch("India", "overview", "curated");
    expect(curated.countries.some((c) => c.iso3 === "IND")).toBe(true);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ results: [] }), { status: 200 }))
    );
    const report = await orchestrateDeepResearch("Quantum Computing", "deep");
    expect(
      report.relevantStatistics.some((s) => s.metric.toLowerCase().includes("quantum"))
    ).toBe(true);
  });

  it("traces BFS shortest causal paths across knowledge graphs and handles disconnected nodes", () => {
    const semiGraph = buildInfiniteKnowledgeGraph({ topic: "Semiconductors", maxNodes: 16 });
    expect(semiGraph.edges.length).toBeGreaterThan(2);
    const firstEdge = semiGraph.edges[0];
    const direct = findShortestCausalPath(semiGraph.edges, firstEdge.source, firstEdge.target);
    expect(direct.reachable).toBe(true);
    expect(direct.hops).toBe(1);
    expect(direct.nodeIds).toEqual([firstEdge.source, firstEdge.target]);
    expect(direct.edgeIds).toEqual([firstEdge.id]);

    const selfPath = findShortestCausalPath(semiGraph.edges, firstEdge.source, firstEdge.source);
    expect(selfPath).toEqual({
      reachable: true,
      nodeIds: [firstEdge.source],
      edgeIds: [],
      hops: 0,
    });

    const disconnected = findShortestCausalPath(
      semiGraph.edges,
      firstEdge.source,
      "nonexistent-disconnected-node"
    );
    expect(disconnected).toEqual({
      reachable: false,
      nodeIds: [],
      edgeIds: [],
      hops: 0,
    });
  });

  it("anchors What-If simulations to sovereign country baselines and parses natural-language prompts", () => {
    const indEnergy = executeWhatIfSimulation({
      category: "energy",
      horizonYears: 15,
      seed: 42,
      countryIso3: "IND",
    });
    const braEnergy = executeWhatIfSimulation({
      category: "energy",
      horizonYears: 15,
      seed: 42,
      countryIso3: "BRA",
    });
    expect(indEnergy.summaryMetrics.baselineTerminal).not.toBe(
      braEnergy.summaryMetrics.baselineTerminal
    );
    expect(indEnergy.initialAssumptions.some((a) => a.includes("India"))).toBe(true);
    expect(braEnergy.initialAssumptions.some((a) => a.includes("Brazil"))).toBe(true);

    const parsed = parseSimulationQueryPrompt(
      "Model India oil shock +35% and 75 bps interest rate tightening"
    );
    expect(parsed.category).toBe("economics");
    expect(parsed.countryIso3).toBe("IND");
    expect(parsed.overrides.oilPriceShockPct).toBe(35);
    expect(parsed.overrides.interestRateDeltaBps).toBe(75);

    const canEcon = executeWhatIfSimulation({
      category: "economics",
      countryIso3: "CAN",
      horizonYears: 15,
      seed: 42,
    });
    expect(canEcon.analyticalExplanation).toContain("Canada (CAN) Sovereign Baseline");
    expect(canEcon.provenance.coverage).toContain("CAN");

    const parsedCan = parseSimulationQueryPrompt("Simulate Canada tariff 15%");
    expect(parsedCan.countryIso3).toBe("CAN");
    expect(parsedCan.overrides.tariffRatePct).toBe(15);

    const sgpDemo = executeWhatIfSimulation({
      category: "demographics",
      countryIso3: "SGP",
      horizonYears: 15,
      seed: 42,
    });
    expect(sgpDemo.initialAssumptions[0]).toContain("SGP");
    expect(Number.isFinite(sgpDemo.summaryMetrics.baselineTerminal)).toBe(true);
  });

  it("falls back to catalog dossier for valid ISO3 codes when upstream feeds fail while rejecting unknown ISO3 codes", async () => {
    const { GET } = await import("@/app/api/v1/countries/[iso3]/route");
    const offlineFetch = vi.fn(async () => new Response("{}", { status: 503 }));
    vi.stubGlobal("fetch", offlineFetch);
    clearLiveCountryCacheForTests();

    const canRes = await GET(new Request("http://localhost/api/v1/countries/CAN"), {
      params: Promise.resolve({ iso3: "CAN" }),
    });
    expect(canRes.status).toBe(200);
    const canBody = (await canRes.json()) as { iso3?: string; name?: string };
    expect(canBody.iso3).toBe("CAN");
    expect(canBody.name).toBe("Canada");

    const unknownRes = await GET(new Request("http://localhost/api/v1/countries/ZZZ"), {
      params: Promise.resolve({ iso3: "ZZZ" }),
    });
    expect(unknownRes.status).toBe(404);
  });

  it("maps 5,000-year historical coordinates piecewise monotonically and finds nearest events", () => {
    expect(mapYearToTimelinePercent(-3000)).toBeCloseTo(0, 5);
    expect(mapYearToTimelinePercent(500)).toBeCloseTo(22, 5);
    expect(mapYearToTimelinePercent(1800)).toBeCloseTo(45, 5);
    expect(mapYearToTimelinePercent(2026)).toBeCloseTo(100, 5);
    expect(mapYearToTimelinePercent(1950)).toBeGreaterThan(mapYearToTimelinePercent(1200));

    const sampleEvents = [
      { id: "indus", yearNumeric: -2500 },
      { id: "printing", yearNumeric: 1440 },
      { id: "transformer", yearNumeric: 2017 },
    ];
    expect(findNearestEventByPercent(sampleEvents, 2)?.id).toBe("indus");
    expect(findNearestEventByPercent(sampleEvents, 38)?.id).toBe("printing");
    expect(findNearestEventByPercent(sampleEvents, 98)?.id).toBe("transformer");
    expect(findNearestEventByPercent([], 50)).toBeNull();
  });

  it("ships extensioned, WhatsApp-sized (<300 KB) static social & icon assets", () => {
    const pub = path.resolve(process.cwd(), "public");
    const ogStats = fs.statSync(path.join(pub, "og-image.jpg"));
    const appleStats = fs.statSync(path.join(pub, "apple-touch-icon.png"));
    const icon192 = fs.statSync(path.join(pub, "icons/icon-192.png"));
    const icon512 = fs.statSync(path.join(pub, "icons/icon-512.png"));
    const favicon = fs.statSync(path.join(pub, "favicon.ico"));

    expect(ogStats.size).toBeGreaterThan(10_000);
    expect(ogStats.size).toBeLessThan(300_000);
    expect(appleStats.size).toBeGreaterThan(1_000);
    expect(icon192.size).toBeGreaterThan(1_000);
    expect(icon512.size).toBeGreaterThan(5_000);
    expect(favicon.size).toBeGreaterThan(500);

    const layoutSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/layout.tsx"),
      "utf8"
    );
    expect(layoutSrc).toContain("https://omnis-one.vercel.app/og-image.jpg");
    expect(layoutSrc).toContain("secureUrl:");
    expect(layoutSrc).toContain("/apple-touch-icon.png");
    expect(layoutSrc).not.toContain('url: "/opengraph-image"');
  });

  it("computes accurate NOAA solar declinations, subsolar longitudes, and Earth-frame unit vectors", () => {
    const juneSolstice = new Date("2026-06-21T12:00:00Z");
    const decSolstice = new Date("2026-12-21T12:00:00Z");
    const equinox = new Date("2026-03-20T15:00:00Z");

    const junePt = getSubsolarPoint(juneSolstice);
    expect(junePt.latDeg).toBeGreaterThan(23.0);
    expect(junePt.latDeg).toBeLessThan(23.6);
    expect(Math.abs(junePt.lngDeg)).toBeLessThan(2.0);

    const decPt = getSubsolarPoint(decSolstice);
    expect(decPt.latDeg).toBeLessThan(-23.0);
    expect(decPt.latDeg).toBeGreaterThan(-23.6);
    expect(Math.abs(decPt.lngDeg)).toBeLessThan(2.0);

    const eqPt = getSubsolarPoint(equinox);
    expect(Math.abs(eqPt.latDeg)).toBeLessThan(1.0);

    // Subsolar longitude remains strictly within [-180, 180] across 24 hours
    for (let h = 0; h < 24; h++) {
      const d = new Date(Date.UTC(2026, 5, 21, h, 30, 0));
      const p = getSubsolarPoint(d);
      expect(p.lngDeg).toBeGreaterThanOrEqual(-180);
      expect(p.lngDeg).toBeLessThanOrEqual(180);
      expect(wrapLongitude(p.lngDeg + 720)).toBeCloseTo(p.lngDeg, 8);
    }

    // Spherical sun vector aligns with solar elevation dot product sin(altitude)
    const indSolar = getCountrySolarState(28.61, 77.2, "Asia/Kolkata", new Date("2026-06-21T06:30:00Z"));
    const sunVec = getSunVectorInEarthFrame(new Date("2026-06-21T06:30:00Z"));
    const indNorm = latLngToEarthVector(28.61, 77.2, 1);
    const dot = sunVec.x * indNorm.x + sunVec.y * indNorm.y + sunVec.z * indNorm.z;
    const sunMag = Math.hypot(sunVec.x, sunVec.y, sunVec.z);
    expect(sunMag).toBeCloseTo(1.0, 6);
    expect(dot).toBeCloseTo(Math.sin((indSolar.altitudeDeg * Math.PI) / 180), 5);
  });

  it("maps every country in ISO3_TO_NUMERIC to a valid IANA zone with DST-aware local solar clocks", () => {
    for (const iso3 of Object.keys(ISO3_TO_NUMERIC)) {
      const tz = ISO3_TIMEZONES[iso3];
      expect(tz, `Missing ISO3_TIMEZONES mapping for ${iso3}`).toBeTruthy();
      expect(() => new Intl.DateTimeFormat("en-GB", { timeZone: tz })).not.toThrow();
    }
    expect(getTimeZoneForCountry("IND")).toBe("Asia/Kolkata");

    // 18:30 UTC in June -> 00:00 IST (Night) in India, 14:30 EDT (Daylight) in Washington D.C.
    const summerNightUtc = new Date("2026-06-21T18:30:00Z");
    const indNight = getCountrySolarState(20.59, 78.96, "Asia/Kolkata", summerNightUtc);
    const usaDay = getCountrySolarState(38.9, -77.03, "America/New_York", summerNightUtc);
    expect(indNight.formattedTime).toBe("00:00");
    expect(indNight.utcOffsetLabel).toBe("UTC+5:30");
    expect(indNight.phase).toBe("Night");
    expect(indNight.altitudeDeg).toBeLessThan(-18);

    expect(usaDay.formattedTime).toBe("14:30");
    expect(usaDay.utcOffsetLabel).toBe("UTC-4");
    expect(usaDay.phase).toBe("Daylight");
    expect(usaDay.altitudeDeg).toBeGreaterThan(40);

    // Winter DST regression: January 15 shifts New York from UTC-4 (EDT) to UTC-5 (EST) -> 13:30
    const winterUtc = new Date("2026-01-15T18:30:00Z");
    const usaWinter = getCountrySolarState(38.9, -77.03, "America/New_York", winterUtc);
    expect(usaWinter.formattedTime).toBe("13:30");
    expect(usaWinter.utcOffsetLabel).toBe("UTC-5");
  });

  it("formats signed percentages and monetary axes cleanly without double-sign or trillion k-suffix confusion", () => {
    expect(formatSignedPct(6.8)).toBe("+6.8%");
    expect(formatSignedPct(-1.5)).toBe("-1.5%");
    expect(formatSignedPct(-0)).toBe("+0%");
    expect(formatSignedValue(-0.32, "°C")).toBe("-0.32°C");
    expect(formatUsdBnCompact(28781)).toBe("$28.8T");
    expect(formatUsdBnCompact(420)).toBe("$420B");
    expect(formatMonetaryAxisTick(28781, "gdpUsdBn", 5000)).toBe("$28.8T");
    expect(formatMonetaryAxisTick(65400, "gdpPerCapitaUsd", 10000)).toBe("$65.4k");
  });

  it("prevents false ISO3 substring matches, searches all 130 nations, and labels comparison charts accurately", async () => {
    const windIntent = classifyQueryIntent("global wind energy transition");
    expect(windIntent.detectedEntities).not.toContain("India");
    expect(windIntent.suggestedModule).toBe("/research");

    const frameworkIntent = classifyQueryIntent("AI infrastructure framework governance");
    expect(frameworkIntent.detectedEntities).not.toContain("France");

    const canadaIntent = classifyQueryIntent("CAN");
    expect(canadaIntent.detectedEntities).toContain("Canada");
    expect(canadaIntent.suggestedModule).toBe("/atlas?country=CAN");

    const universal = executeUniversalSearch("Canada");
    expect(universal.countries.some((c) => c.iso3 === "CAN")).toBe(true);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 503 }))
    );
    clearLiveCountryCacheForTests();
    const cmpReport = await orchestrateDeepResearch("Compare India and China", "comparative");
    expect(cmpReport.visualisationSeries.title).toContain("Nominal GDP Trajectory ($B)");
    expect(cmpReport.visualisationSeries.title).not.toContain("Real Growth (%)");

    const parsedSim = SimulationRequestSchema.safeParse({
      scenarioId: "econ-macro-shock",
      category: "economics",
      horizonYears: 15,
      seed: 42,
      countryIso3: "CAN",
      parameters: { oilPriceShockPct: 25 },
    });
    expect(parsedSim.success).toBe(true);
  });

  it("hydrates non-curated nations (CAN/NOR) in Assistant API without false lowercase ISO3 matches", async () => {
    // Word-boundary check: lowercase "can" must not match Canada, while uppercase CAN / "Norway" match cleanly
    expect(matchCountryCatalogFromText("How can we improve nuclear grids?")).toBeNull();
    expect(matchCountryCatalogFromText("Compare renewable power in Norway")?.iso3).toBe("NOR");
    expect(matchCountryCatalogFromText("What is GDP growth?", "Canada (CAN)")?.iso3).toBe("CAN");

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const href = String(url);
        if (href.includes("restcountries.com")) {
          return new Response(
            JSON.stringify([
              {
                name: { common: "Canada", official: "Canada" },
                capital: ["Ottawa"],
                region: "Americas",
                subregion: "Northern America",
                population: 40_100_000,
                area: 9_984_670,
                latlng: [60, -95],
                currencies: { CAD: { name: "Canadian dollar" } },
                languages: { eng: "English", fra: "French" },
                flag: "🇨🇦",
              },
            ]),
            { status: 200 }
          );
        }
        if (href.includes("api.worldbank.org")) {
          const val = href.includes("NY.GDP.MKTP.CD")
            ? 2_140_000_000_000
            : href.includes("NY.GDP.MKTP.KD.ZG")
              ? 1.8
              : 14.5;
          return new Response(
            JSON.stringify([{ page: 1 }, [{ date: "2024", value: val, country: { value: "Canada" } }]]),
            { status: 200 }
          );
        }
        return new Response(JSON.stringify({ results: [] }), { status: 200 });
      })
    );
    clearLiveCountryCacheForTests();

    const { POST } = await import("@/app/api/v1/assistant/route");
    const res = await POST(
      new Request("http://localhost/api/v1/assistant", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.10" },
        body: JSON.stringify({
          message: "Summarize macro baseline and clean grid share",
          contextLabel: "Global Atlas",
          contextTopic: "Canada (CAN)",
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      reply?: string;
      citations?: { label: string; url: string }[];
    };
    expect(body.reply).toContain("Canada (CAN)");
    expect(body.reply).not.toContain("No pre-cached sovereign dossier directly matched");
    expect(body.reply).toContain("+1.8%");
    expect(body.citations?.some((c) => c.label.includes("Canada"))).toBe(true);
  });

  it("clamps GET graph/simulate parameters within strict bounds and enforces shared API rate limits", async () => {
    expect(clampIntParam("50000", 32, 5, 60)).toBe(60);
    expect(clampIntParam("-4", 32, 5, 60)).toBe(5);
    expect(clampIntParam("not-a-number", 32, 5, 60)).toBe(32);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ results: [] }), { status: 200 }))
    );

    const { GET: graphGet } = await import("@/app/api/v1/graph/route");
    const gRes = await graphGet(
      new Request("http://localhost/api/v1/graph?topic=Semiconductors&maxNodes=50000", {
        headers: { "x-forwarded-for": "198.51.100.42" },
      })
    );
    expect(gRes.status).toBe(200);
    const graphBody = (await gRes.json()) as { nodes?: unknown[] };
    expect((graphBody.nodes ?? []).length).toBeLessThanOrEqual(60);

    const { GET: simGet } = await import("@/app/api/v1/simulate/route");
    const sRes = await simGet(
      new Request("http://localhost/api/v1/simulate?horizonYears=9999", {
        headers: { "x-forwarded-for": "198.51.100.43" },
      })
    );
    expect(sRes.status).toBe(200);
    const simBody = (await sRes.json()) as {
      activeSimulation?: { trajectory?: { year: number }[] };
    };
    const yearsCount = simBody.activeSimulation?.trajectory?.length ?? 0;
    expect(yearsCount).toBe(54); // 3 historical + (clamped horizon 50 + base year)

    // Verify shared rate limiter trips cleanly on maxRequests + 1
    const r1 = enforceRequestRateLimit(
      new Request("http://localhost/api/v1/test", { headers: { "x-forwarded-for": "203.0.113.99" } }),
      "unit-test-rl",
      2,
      60_000
    );
    const r2 = enforceRequestRateLimit(
      new Request("http://localhost/api/v1/test", { headers: { "x-forwarded-for": "203.0.113.99" } }),
      "unit-test-rl",
      2,
      60_000
    );
    const r3 = enforceRequestRateLimit(
      new Request("http://localhost/api/v1/test", { headers: { "x-forwarded-for": "203.0.113.99" } }),
      "unit-test-rl",
      2,
      60_000
    );
    expect(r1).toBeNull();
    expect(r2).toBeNull();
    expect(r3?.status).toBe(429);
  });

  it("renders accessible Bottom Sheet & Isolated Error Fallback markup and matches Spatial Cross-Filter signals", () => {
    const errHtml = renderToStaticMarkup(
      React.createElement(OmnisModuleErrorFallback, {
        moduleName: "Knowledge Graph",
        error: new Error("Synthetic boundary check"),
        reset: () => {},
      })
    );
    expect(errHtml).toContain("Knowledge Graph • Isolated Recovery Boundary");
    expect(errHtml).toContain("Retry Knowledge Graph");

    const sheetHtml = renderToStaticMarkup(
      React.createElement(
        OmnisMobileBottomSheet,
        {
          open: true,
          onClose: () => {},
          eyebrow: "Geopolitics",
          title: "Semiconductor Fab Chokepoints",
          closeAriaLabel: "Close Node Inspector",
          children: React.createElement("p", null, "Inspector body"),
        }
      )
    );
    expect(sheetHtml).toContain('role="dialog"');
    expect(sheetHtml).toContain('aria-modal="true"');
    expect(sheetHtml).toContain("safe-area-inset-bottom");
    expect(sheetHtml).toContain("min-h-[44px] min-w-[44px]");

    // Spatial Cross-Filter Sync matching across Globe -> Graph/Timeline
    const indiaSignal = { iso3: "IND", topic: "India" };
    expect(
      doesSignalMatchCandidate(indiaSignal, {
        countryIso3: "IND",
        title: "1991 Economic Liberalisation",
      })
    ).toBe(true);
    expect(
      doesSignalMatchCandidate(indiaSignal, {
        label: "Indian Renewable Grid Expansion",
        summary: "Solar corridors across Gujarat and Rajasthan",
      })
    ).toBe(true);
    expect(
      doesSignalMatchCandidate(indiaSignal, {
        countryIso3: "NOR",
        title: "North Sea Hydroelectric Treaty",
      })
    ).toBe(false);
  });
});
