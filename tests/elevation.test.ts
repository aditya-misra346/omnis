import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COUNTRIES_DATA } from "@/lib/data/global-intelligence";
import { buildSovereignComparisonMatrix } from "@/lib/research/compare";
import { buildInfiniteKnowledgeGraph } from "@/lib/graph/engine";
import { executeWhatIfSimulation } from "@/lib/simulations/engine";
import {
  clearLiveCountryCacheForTests,
  fetchLiveCountryIntelligence,
} from "@/lib/providers/live-data";
import { orchestrateDeepResearch } from "@/lib/research/engine";
import {
  clearHealthCacheForTests,
  probeUpstreamProviders,
} from "@/lib/providers/health";
import { OmnisModuleHeader } from "@/components/ui/OmnisPrimitives";
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
  });
});
