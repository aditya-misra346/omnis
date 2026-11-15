# OMNIS — REST API Documentation (`API_DOCUMENTATION.md`)

All endpoints return JSON responses wrapped in a consistent provenance-aware envelope and support both the Next.js Fluid Compute API (`/api/v1/*`) and the standalone Python FastAPI server (`http://127.0.0.1:8000/api/v1/*`).

---

## 1. System & Health

### `GET /api/v1/health`
Returns live service status, active runtime, database connectivity, and registered external data provider health.

---

## 2. Universal Search Engine

### `GET /api/v1/search?q=<query>&category=<all|countries|technologies|events|research|organizations>`
- Performs natural-language intent classification (`country_profile`, `comparison`, `research_synthesis`, `causal_graph`, `historical_timeline`, `general_discovery`).
- Executes typo-tolerant semantic and lexical search across countries, knowledge entities, historical events, and live OpenAlex/Wikimedia records.
- Returns categorised results with provenance attribution.

---

## 3. Global Atlas & Country Intelligence

### `GET /api/v1/countries`
Returns the global registry of countries with coordinates, macroeconomic baseline metrics, energy/environment/technology layer values, and provenance metadata.

### `GET /api/v1/countries/[iso3]`
Fetches a comprehensive Country Intelligence Profile for the requested ISO-3 code (e.g., `IND`, `USA`, `CHN`, `DEU`, `JPN`, `GBR`, `BRA`, `FRA`, or any valid ISO-3 code via live **REST Countries v3.1** + **World Bank Open Data API** `api.worldbank.org/v2`):
- Geography & Demographics
- Live World Bank Time-Series Indicators (`NY.GDP.MKTP.CD`, `NY.GDP.PCAP.CD`, `FP.CPI.TOTL.ZG`, `SL.UEM.TOTL.ZS`, `SP.POP.TOTL`, `SP.DYN.LE00.IN`, `EG.FEC.RNEW.ZS`, `IT.NET.USER.ZS`, `GB.XPD.RSDV.GD.ZS`)
- Government, Infrastructure, Energy Profile, International Relations, Historical Milestones, and Current Developments
- Every metric includes `source`, `lastUpdated`, `units`, `coverage`, `methodology`, and `missingData` flags.

---

## 4. Infinite Knowledge Graph

### `POST /api/v1/graph`
Generates or expands a structured semantic network around a topic or entity.
- **Request Body**: `{ "topic": "Artificial Intelligence", "depth": 2, "maxNodes": 36, "existingNodeIds": [] }`
- **Response**: Typed nodes and directed edges with semantic relationship types (`CAUSES`, `INFLUENCES`, `DEPENDS_ON`, `COMPETES_WITH`, `DEVELOPED_BY`, `RELATED_TO`, `HISTORICALLY_PRECEDED`, `PART_OF`, `REGULATES`, `SUPPORTS`, `CONTRADICTS`), evidence summaries, source URLs, and `verificationStatus` (`verified` vs `ai_hypothesis`).

---

## 5. Deep Research Intelligence

### `POST /api/v1/research`
Executes multi-step research orchestration across 6 modes (`quick`, `deep`, `comparative`, `historical`, `scientific`, `economic`).
- **Request Body**: `{ "query": "How are semiconductor manufacturing and geopolitics connected?", "mode": "deep" }`
- **Workflow**:
  1. Decomposes the query into sub-tasks.
  2. Queries **OpenAlex API** (`api.openalex.org/works`), **Wikimedia REST API**, and curated macroeconomic/geopolitical datasets.
  3. Extracts claims, identifies supporting vs contradictory evidence, and attaches source-level traceability.
  4. Returns Executive Summary, Key Findings, Detailed Analysis, Statistics, Visualisation series, Limitations, Conclusions, and full Source Credibility metadata.

---

## 6. What-If Simulation Engine

### `POST /api/v1/simulate`
Runs deterministic and Monte Carlo scenario simulations across Economics, Demographics, Energy, Technology, and Environment.
- **Request Body**:
  ```json
  {
    "scenarioId": "macro-oil-inflation",
    "category": "economics",
    "horizonYears": 15,
    "parameters": {
      "oilPriceShockPct": 35,
      "interestRateDeltaBps": 125,
      "fiscalStimulusPctGdp": 1.5,
      "tariffRatePct": 10,
      "aiProductivityBoostPct": 1.2
    }
  }
  ```
- **Response**: Initial assumptions, baseline trajectory, modified scenario trajectory with `P10` / `P50` / `P90` Monte Carlo uncertainty bands, tornado sensitivity rankings, model equations, limitations, and input data sources.

---

## 7. Reality Timeline

### `GET /api/v1/timeline?era=<all|ancient|medieval|modern|contemporary>&category=<all|...>&country=<iso3>&q=<search>`
Returns chronological historical and contemporary events with dates, locations, participants, causal links (`causes`, `consequences`), primary/secondary citations, and connected Knowledge Graph entities.

---

## 8. Universal Context-Aware AI Assistant

### `POST /api/v1/assistant`
- **Request Body**: `{ "message": "...", "context": { "currentPath": "/atlas", "activeEntity": "IND" } }`
- Applies prompt-injection sanitization, grounds responses in the active page context and verified data providers, and returns structured citations and follow-up actions.
