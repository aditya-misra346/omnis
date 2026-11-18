import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hydrateVerifiedEvidence,
  orchestrateAddyIntelligence,
  planAddyQuery,
} from "../src/lib/ai/addyIntelligence";
import { clearLiveCountryCacheForTests } from "../src/lib/providers/live-data";
import { AddyBriefChart } from "../src/components/ai/AddyBriefChart";
import { AddyCitationDrawer } from "../src/components/ai/AddyCitationDrawer";
import { AddyIntelligenceView } from "../src/components/ai/AddyIntelligenceView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  clearLiveCountryCacheForTests();
});

describe("AddyIntelligence Multi-Source Orchestrator & UI Suite", () => {
  it("batches World Bank WDI indicators with mrnev=12&footnote=y and carries footnotes into readings", async () => {
    const requestedUrls: string[] = [];
    const batchFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url.includes("api.worldbank.org/v2/country/") && url.includes(";")) {
        expect(url).toContain("mrnev=12");
        expect(url).toContain("footnote=y");
        expect(url).toContain("source=2");
        return new Response(
          JSON.stringify([
            { page: 1 },
            [
              {
                date: "2025",
                value: 4_125_000_000_000,
                footnote: "Official annual national accounts revision.",
                country: { value: "India" },
                countryiso3code: "IND",
                indicator: { id: "NY.GDP.MKTP.CD" },
              },
              {
                date: "2014",
                value: 2_039_000_000_000,
                country: { value: "India" },
                countryiso3code: "IND",
                indicator: { id: "NY.GDP.MKTP.CD" },
              },
              {
                date: "2025",
                value: 2840,
                country: { value: "India" },
                countryiso3code: "IND",
                indicator: { id: "NY.GDP.PCAP.CD" },
              },
              {
                date: "2025",
                value: 6.5,
                country: { value: "India" },
                countryiso3code: "IND",
                indicator: { id: "NY.GDP.MKTP.KD.ZG" },
              },
            ],
          ]),
          { status: 200 }
        );
      }
      if (url.includes("api.openalex.org/works")) {
        expect(url).toContain("has_abstract:true");
        expect(url).toContain("select=");
        return new Response(
          JSON.stringify({
            results: [
              {
                id: "https://openalex.org/W42",
                title: "India Public Infrastructure and Growth",
                publication_year: 2025,
                doi: "https://doi.org/10.1000/ind-growth",
                cited_by_count: 85,
                primary_location: { source: { display_name: "Journal of Development Economics" } },
                authorships: [{ author: { display_name: "R. Kapoor" } }],
                abstract_inverted_index: { Capital: [0], investment: [1], expanded: [2], output: [3] },
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response("{}", { status: 404 });
    }) as unknown as typeof fetch;

    const plan = planAddyQuery("Explain India's economic growth and infrastructure since 2014");
    const pack = await hydrateVerifiedEvidence(plan, { fetchFn: batchFetch });

    const gdpReading = pack.wbReadings.find(
      (r) => r.iso3 === "IND" && r.indicator.code === "NY.GDP.MKTP.CD"
    );
    expect(gdpReading?.latestYear).toBe(2025);
    expect(gdpReading?.footnote).toContain("Official annual national accounts revision");
    expect(pack.entries.some((e) => e.excerptOrIndicator.includes("Official annual national accounts revision"))).toBe(true);

    // Ensure single-indicator duplicate World Bank WDI calls were skipped after batch succeeded
    const fallbackSingleWbCalls = requestedUrls.filter(
      (u) => u.includes("api.worldbank.org/v2/country/") && !u.includes("mrnev=12")
    );
    expect(fallbackSingleWbCalls).toHaveLength(0);

    const { brief } = await orchestrateAddyIntelligence(
      "Explain India's economic growth and infrastructure since 2014",
      "deep",
      { fetchFn: batchFetch }
    );
    expect(brief.engineName).toBe("AddyIntelligence");
    expect(brief.sources.length).toBeGreaterThan(0);
  });

  it("skips duplicate single-indicator WDI fetches when batched request aborts/times out", async () => {
    const requestedUrls: string[] = [];
    const timeoutFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url.includes("api.worldbank.org")) {
        const abortErr = new Error("Aborted");
        abortErr.name = "AbortError";
        throw abortErr;
      }
      return new Response("{}", { status: 404 });
    }) as unknown as typeof fetch;

    const plan = planAddyQuery("India GDP growth");
    const pack = await hydrateVerifiedEvidence(plan, { fetchFn: timeoutFetch });

    expect(pack.failedProviders).toContain("World Bank WDI");
    const wbCalls = requestedUrls.filter((u) => u.includes("api.worldbank.org"));
    // Batched in chunks of 4 (`mrnev=12`), zero single-indicator retries on AbortError
    expect(wbCalls.length).toBe(Math.ceil(plan.indicators.length / 4));
    expect(wbCalls.every((u) => u.includes("mrnev=12"))).toBe(true);
    expect(pack.wbReadings.length).toBeGreaterThan(0);
  });

  it("renders AddyAssistantDrawer, AddyBriefChart (table), and AddyCitationDrawer with AddyIntelligence identity", async () => {
    const { AddyAssistantDrawer } = await import("../src/components/ai/AddyAssistantDrawer");
    const sampleSource = {
      id: "SRC-1",
      title: "World Bank WDI — India Nominal GDP",
      publisher: "World Bank Open Data API v2",
      year: "2025",
      url: "https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=IND",
      sourceType: "Official Dataset" as const,
      excerptOrIndicator: "NY.GDP.MKTP.CD: $4.1T in 2025",
    };
    const sourcesMap = new Map([["SRC-1", sampleSource]]);

    const chartHtml = renderToStaticMarkup(
      React.createElement(AddyBriefChart, {
        visual: {
          type: "breakdown_table",
          takeawayTitle: "Sector Breakdown",
          unitSubtitle: "Share (%)",
          series: [{ Category: "Solar & Wind", Value: "22.4%" }],
          sourceIds: ["SRC-1"],
        },
        sourcesById: sourcesMap,
        onSelectSource: vi.fn(),
      })
    );
    expect(chartHtml).toContain("Sector Breakdown");
    expect(chartHtml).toContain("Solar &amp; Wind");
    expect(chartHtml).toContain("[SRC-1]");

    const citationHtml = renderToStaticMarkup(
      React.createElement(AddyCitationDrawer, {
        source: sampleSource,
        onClose: vi.fn(),
      })
    );
    expect(citationHtml).toContain("AddyIntelligence · Verified Excerpt");
    expect(citationHtml).toContain("Open Original Source");

    const drawerHtml = renderToStaticMarkup(
      React.createElement(AddyAssistantDrawer, {
        open: true,
        onClose: vi.fn(),
        drawerRef: { current: null },
        activeContextLabel: "Global Atlas",
        activeContextTopic: "India",
        assistantMessages: [
          {
            id: "m1",
            role: "assistant",
            content: "India economy reached $4.1T.",
            timestamp: "2026-11-15T00:00:00Z",
          },
        ],
        assistantInput: "",
        assistantLoading: false,
        setAssistantInput: vi.fn(),
        onSend: vi.fn(),
        onClear: vi.fn(),
      })
    );
    expect(drawerHtml).toContain("AddyIntelligence");
    expect(drawerHtml).toContain("Context: Global Atlas (India)");

    const viewHtml = renderToStaticMarkup(
      React.createElement(AddyIntelligenceView, {
        brief: {
          engineName: "AddyIntelligence",
          query: "India growth",
          intent: "development_trend",
          bottomLine: "India output grew steadily [SRC-1].",
          keyMetrics: [
            {
              label: "Nominal GDP",
              value: "$4.1T",
              benchmark: "Top 5 globally",
              everydayMeaning: "Size of annual output.",
              sourceId: "SRC-1",
            },
          ],
          sections: [],
          practicalTakeaway: {
            whatItMeansInPractice: "Broad urban jobs growth.",
            keyRisksOrTradeOffs: "Energy transition costs.",
            dataLimitations: "Annual official series.",
          },
          sources: [sampleSource],
          suggestedFollowUps: ["Compare India and China"],
        },
      })
    );
    expect(viewHtml).toContain("AddyIntelligence");
    expect(viewHtml).toContain("Official &amp; Verified Sources");
  });
});
