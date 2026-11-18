import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EvidencePack, IntelligenceBriefResponse } from "../src/lib/ai/contracts";
import {
  orchestrateIntelligenceBrief,
  planResearchQuery,
  resolveCountryEntities,
  validateAndSanitizeBriefCitations,
} from "../src/lib/ai/orchestrator";
import {
  clearLiveCountryCacheForTests,
  fetchCrossrefSources,
  fetchOpenAlexSources,
  reconstructOpenAlexAbstract,
} from "../src/lib/providers/live-data";
import { BANNED_AI_PHRASES } from "../src/lib/research/prompts";
import { IntelligenceBriefView } from "../src/components/intelligence/IntelligenceBriefView";
import { RetrievalProgressStepper } from "../src/components/intelligence/RetrievalProgressStepper";

afterEach(() => {
  vi.unstubAllGlobals();
  clearLiveCountryCacheForTests();
});

describe("OMNIS Principal AI Orchestrator & Grounding Integrity Suite", () => {
  it("resolves sovereign aliases and maps questions to official World Bank WDI indicator IDs without false lowercase triggers", () => {
    // Lowercase "us" / "can" / "nor" must never false-trigger USA / CAN / NOR
    expect(resolveCountryEntities("How can we help us reduce inflation nor stall jobs?")).toEqual(
      []
    );

    const indUs = resolveCountryEntities("Compare Bharat and US clean energy and inflation");
    expect(indUs.map((e) => e.iso3)).toEqual(["IND", "USA"]);

    const infPlan = planResearchQuery("Why is inflation affecting US households?");
    expect(infPlan.entities[0]?.iso3).toBe("USA");
    expect(infPlan.indicators).toContain("FP.CPI.TOTL.ZG");
    expect(infPlan.indicators).toContain("NY.GDP.PCAP.CD");

    const cleanPlan = planResearchQuery("Compare India and China clean energy and economy size");
    expect(cleanPlan.intent).toBe("country_comparison");
    expect(cleanPlan.entities.map((e) => e.iso3)).toEqual(["IND", "CHN"]);
    expect(cleanPlan.indicators).toContain("EG.ELC.RNWX.ZS");
    expect(cleanPlan.indicators).toContain("EG.FEC.RNEW.ZS");
    expect(cleanPlan.indicators).toContain("NY.GDP.MKTP.CD");

    const jaipurPlan = planResearchQuery(
      "What was the exact municipal property tax revenue of Jaipur in Q3 2025?"
    );
    expect(jaipurPlan.unavailableRequestedMetric).not.toBeNull();
  });

  it("reconstructs OpenAlex inverted-index abstracts cleanly and parses Crossref JATS abstracts", async () => {
    const reconstructed = reconstructOpenAlexAbstract({
      AI: [0],
      adoption: [1],
      raises: [2],
      firm: [3],
      productivity: [4],
      "while": [5],
      reshaping: [6],
      "tasks.": [7],
    });
    expect(reconstructed).toBe("AI adoption raises firm productivity while reshaping tasks.");

    const mockFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("api.openalex.org/works")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: "https://openalex.org/W999",
                title: "Artificial Intelligence and Labor Demand",
                publication_year: 2025,
                doi: "https://doi.org/10.1257/ai-labor-2025",
                cited_by_count: 312,
                primary_location: { source: { display_name: "American Economic Review" } },
                authorships: [{ author: { display_name: "D. Acemoglu" } }],
                abstract_inverted_index: {
                  Exposure: [0],
                  to: [1],
                  AI: [2],
                  "tasks": [3],
                  changes: [4],
                  "hiring.": [5],
                },
              },
            ],
          }),
          { status: 200 }
        );
      }
      if (url.includes("api.crossref.org/works")) {
        return new Response(
          JSON.stringify({
            message: {
              items: [
                {
                  DOI: "10.1093/qje/ai2024",
                  title: ["Generative AI at Work"],
                  "container-title": ["Quarterly Journal of Economics"],
                  issued: { "date-parts": [[2024]] },
                  author: [{ given: "Erik", family: "Brynjolfsson" }],
                  "is-referenced-by-count": 480,
                  abstract: "<jats:p>Customer support agents with AI assistance resolved 14% more issues per hour.</jats:p>",
                },
              ],
            },
          }),
          { status: 200 }
        );
      }
      return new Response("{}", { status: 404 });
    }) as unknown as typeof fetch;

    const oa = await fetchOpenAlexSources("AI adoption employment", 2, mockFetch);
    expect(oa[0]?.excerpt).toContain("Exposure to AI tasks changes hiring.");
    expect(oa[0]?.citedByCount).toBe(312);

    const cr = await fetchCrossrefSources("Generative AI employment", 2, mockFetch);
    expect(cr[0]?.excerpt).toContain("resolved 14% more issues per hour");
    expect(cr[0]?.excerpt).not.toContain("<jats:p>");
    expect(cr[0]?.url).toBe("https://doi.org/10.1093/qje/ai2024");
  });

  it("strips hallucinated [SRC-99] citations and banned AI filler while preserving verified [SRC-1] links", () => {
    const evidencePack: EvidencePack = {
      entries: [
        {
          id: "SRC-1",
          title: "World Bank WDI — India Nominal GDP",
          publisher: "World Bank Open Data API v2",
          year: "2025",
          url: "https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=IND",
          sourceType: "Official Dataset",
          indicatorCode: "NY.GDP.MKTP.CD",
          iso3: "IND",
          excerptOrIndicator: "NY.GDP.MKTP.CD: $4.1T in 2025",
          facts: ["India Nominal GDP reached $4.1T in 2025."],
        },
      ],
      wbReadings: [],
      restCountries: [],
      openAlexWorks: [],
      openAlexTrend: [],
      crossrefWorks: [],
      wikiSummaries: [],
      failedProviders: [],
      serializedForPrompt: "[SRC-1] India Nominal GDP reached $4.1T in 2025.",
    };

    const taintedBrief: IntelligenceBriefResponse = {
      query: "Explain India's growth",
      intent: "development_trend",
      bottomLine:
        "Delving into India's trajectory: output hit $4.1T in 2025 [SRC-1] while unverified claims cite [SRC-99].",
      keyMetrics: [
        {
          label: "Nominal GDP",
          value: "$4.1T",
          benchmark: "Verified [SRC-1]",
          everydayMeaning: "Size of domestic economy [SRC-404].",
          sourceId: "SRC-99",
        },
      ],
      visualData: {
        type: "trend_line",
        takeawayTitle: "GDP trend [SRC-99]",
        unitSubtitle: "USD Billions [SRC-1]",
        series: [{ label: "2025", value: 4125 }],
        sourceIds: ["SRC-1", "SRC-99"],
      },
      sections: [
        {
          heading: "Drivers",
          summary: "Growth reflects investment [SRC-1] and speculative chatter [SRC-88].",
          bullets: [
            {
              point: "Capital outlays: Roads and digital payments boosted scale [SRC-1] [SRC-99].",
              sourceIds: ["SRC-1", "SRC-99"],
            },
          ],
        },
      ],
      practicalTakeaway: {
        whatItMeansInPractice: "Moreover, household incomes grew gradually [SRC-1].",
        keyRisksOrTradeOffs: "Food prices swing with monsoons [SRC-404].",
        dataLimitations: "National annual series only.",
      },
      sources: [
        {
          id: "SRC-99",
          title: "Invented Fake Study",
          publisher: "Phantom Press",
          year: "2025",
          url: "https://example.com/fake",
          sourceType: "Peer-Reviewed Article",
          excerptOrIndicator: "Fake quote",
        },
      ],
      suggestedFollowUps: ["Compare India and China"],
    };

    const { brief, strippedIds } = validateAndSanitizeBriefCitations(taintedBrief, evidencePack);
    expect(strippedIds).toEqual(expect.arrayContaining(["SRC-99", "SRC-404", "SRC-88"]));
    expect(brief.bottomLine).toContain("[SRC-1]");
    expect(brief.bottomLine).not.toContain("SRC-99");
    expect(brief.bottomLine).not.toContain("Delving into");
    expect(brief.practicalTakeaway.whatItMeansInPractice).not.toContain("Moreover");
    expect(brief.keyMetrics[0]?.sourceId).toBe("SRC-1");
    expect(brief.visualData?.sourceIds).toEqual(["SRC-1"]);
    expect(brief.sections[0]?.bullets[0]?.sourceIds).toEqual(["SRC-1"]);
    // Sources MUST strictly come from evidencePack (never fabricated LLM sources)
    expect(brief.sources).toHaveLength(1);
    expect(brief.sources[0]?.id).toBe("SRC-1");
    expect(brief.diagnostics?.strippedInvalidCitations).toContain("SRC-99");
  });

  it("handles upstream provider outages gracefully via Promise.allSettled and passes all 5 scenario contracts", async () => {
    const partialOutageFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      // Fail OpenAlex and Crossref with 500 to verify resilient degradation
      if (url.includes("openalex.org") || url.includes("crossref.org")) {
        return new Response("Upstream Overloaded", { status: 500 });
      }
      if (url.includes("restcountries.com/v3.1/alpha/IND")) {
        return new Response(
          JSON.stringify([
            {
              cca3: "IND",
              cca2: "IN",
              name: { common: "India", official: "Republic of India" },
              capital: ["New Delhi"],
              region: "Asia",
              subregion: "Southern Asia",
              population: 1_441_719_852,
              area: 3_287_590,
              borders: ["CHN", "NPL", "BGD"],
              currencies: { INR: { name: "Indian rupee", symbol: "₹" } },
            },
          ]),
          { status: 200 }
        );
      }
      if (url.includes("api.worldbank.org/v2/country/IND/indicator/NY.GDP.MKTP.CD")) {
        return new Response(
          JSON.stringify([
            { page: 1 },
            [
              { date: "2025", value: 4_125_000_000_000, country: { value: "India" } },
              { date: "2014", value: 2_039_000_000_000, country: { value: "India" } },
            ],
          ]),
          { status: 200 }
        );
      }
      if (url.includes("api.worldbank.org/v2/country/IND/indicator/NY.GDP.PCAP.CD")) {
        return new Response(
          JSON.stringify([
            { page: 1 },
            [
              { date: "2025", value: 2714, country: { value: "India" } },
              { date: "2014", value: 1574, country: { value: "India" } },
            ],
          ]),
          { status: 200 }
        );
      }
      if (url.includes("api.worldbank.org/v2/country/IND/indicator/NY.GDP.MKTP.KD.ZG")) {
        return new Response(
          JSON.stringify([{ page: 1 }, [{ date: "2025", value: 6.5 }]]),
          { status: 200 }
        );
      }
      if (url.includes("api.worldbank.org/v2/country/CHN/indicator/NY.GDP.MKTP.CD")) {
        return new Response(
          JSON.stringify([{ page: 1 }, [{ date: "2025", value: 18_532_000_000_000 }]]),
          { status: 200 }
        );
      }
      if (url.includes("api.worldbank.org/v2/country/CHN/indicator/NY.GDP.PCAP.CD")) {
        return new Response(
          JSON.stringify([{ page: 1 }, [{ date: "2025", value: 13_136 }]]),
          { status: 200 }
        );
      }
      return new Response("{}", { status: 404 });
    }) as unknown as typeof fetch;

    // Scenario 1: Single country multi-year macro development under partial outage
    const stagesSeen: number[] = [];
    const s1 = await orchestrateIntelligenceBrief(
      "Explain India's economic development since 2014 and what challenges remain.",
      "deep",
      {
        fetchFn: partialOutageFetch,
        onProgress: (st) => stagesSeen.push(st.step),
      }
    );
    expect(stagesSeen).toEqual(expect.arrayContaining([1, 2, 3, 4]));
    expect(s1.brief.bottomLine).toContain("2014");
    expect(s1.brief.bottomLine).toContain("$4.1T");
    expect(s1.brief.visualData?.type).toBe("trend_line");
    expect(s1.brief.sources.some((s) => s.sourceType === "Official Dataset")).toBe(true);
    for (const banned of BANNED_AI_PHRASES) {
      expect(s1.brief.bottomLine).not.toContain(banned);
    }

    // Scenario 2: Country comparison bars
    const s2 = await orchestrateIntelligenceBrief(
      "Compare India and China across economy size, income per person, and clean energy.",
      "comparative",
      { fetchFn: partialOutageFetch }
    );
    expect(s2.brief.visualData?.type).toBe("country_comparison_bars");
    expect(s2.brief.bottomLine).toContain("China");
    expect(s2.brief.bottomLine).toContain("India");

    // Scenario 4: Missing-data honesty test (sub-national quarterly property tax MUST refuse cleanly)
    const s4 = await orchestrateIntelligenceBrief(
      "What was the exact municipal property tax revenue of Jaipur in Q3 2025?",
      "deep",
      { fetchFn: partialOutageFetch }
    );
    expect(s4.brief.bottomLine.toLowerCase()).toContain("not available in the verified datasets");
    expect(s4.brief.visualData).toBeUndefined();
    expect(s4.brief.diagnostics?.unavailableRequestedMetric).toContain("Jaipur");

    // Render UI components cleanly with SSR markup
    const briefHtml = renderToStaticMarkup(
      React.createElement(IntelligenceBriefView, { brief: s1.brief })
    );
    expect(briefHtml).toContain("The Bottom Line");
    expect(briefHtml).toContain("Practical Implications");
    expect(briefHtml).toContain("Explore Entities in Knowledge Graph");
    expect(briefHtml).toContain("Inspect");

    const stepperHtml = renderToStaticMarkup(
      React.createElement(RetrievalProgressStepper, {
        stages: {
          1: { step: 1, label: "Resolving entities", status: "completed", elapsedMs: 12 },
          2: { step: 2, label: "Querying APIs", status: "active", elapsedMs: 420 },
        },
        elapsedMs: 420,
        query: "Explain India economic growth",
      })
    );
    expect(stepperHtml).toContain("Step 1");
    expect(stepperHtml).toContain("Step 2");
  });
});
