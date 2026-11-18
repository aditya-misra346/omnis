# OMNIS — Changelog (`CHANGELOG.md`)

## [1.2.0] — 2026-11-18 — AddyIntelligence Launch

### Added & Upgraded
- **Rebranded & Upgraded Platform AI to `AddyIntelligence` (`src/lib/ai/addyIntelligence.ts`)**: Unified assistant copy, system prompts (`buildAssistantSystemPrompt`, `buildBriefSynthesisSystemPrompt`), API brief metadata (`engineName: "AddyIntelligence"`), command triggers, and UI drawers around **`AddyIntelligence`**.
- **Batched Live World Bank WDI & Scholarly Retrieval (`src/lib/providers/live-data.ts`)**: Added `fetchWorldBankBatchedIndicators` (`source=2&date=2014:2026&mrnev=12&footnote=y&format=json` in chunks of 4 indicators) with timeout-aware non-duplicating fallback and OpenAlex `filter=has_abstract:true&select=...` optimization.
- **Unified `src/components/ai/` Component Suite**: Replaced legacy intelligence components with `AddyIntelligenceView`, `AddyAssistantDrawer` (contextual starter chips, `16px` mobile-safe composer, `Verified Multi-Source` badges), `AddyBriefChart`, `AddyCitationDrawer`, and `AddyRetrievalStepper` wired across `/research`, `/command`, `/explore`, and `AppShell`.

## [1.1.0] — 2026-11-18

### Added & Upgraded
- **Verified Multi-Source AI Orchestrator (`src/lib/ai/orchestrator.ts`, `contracts.ts`, `stream-client.ts`)**: Replaced static/generic answer paths with a **Plan → Retrieve → Verify → Synthesize** pipeline combining structured query/entity/WDI-indicator planning (130+ sovereigns & 19 World Bank WDI series across `2014:2026`), REST Countries v3.1, OpenAlex (with inverted-index abstract reconstruction), Crossref DOI citations, and Wikimedia REST v1.
- **Zero-Hallucination Grounding & Citation Validator**: Enforced `[SRC-n]` claim-level provenance, explicit refusal on unretrieved/sub-national metrics, and programmatic stripping of any fabricated `[SRC-*]` references (`validateAndSanitizeBriefCitations`).
- **Editorial Intelligence Brief UI & Real-Time Streaming Progress**: Built `RetrievalProgressStepper`, `BriefChartRenderer` (trend line, side-by-side comparison bars, breakdown table with active readout strip), sticky desktop provenance rail, swipe-dismissible mobile `CitationDrawer`, and wired `/api/v1/brief` + `/api/v1/research` NDJSON streaming across `/research`, `/command`, and `/explore`.

## [1.0.0] — 2026-11-15

### Added
- **Phase 0 & 1 — Foundation & Architecture**: Next.js 15 TypeScript frontend, Python FastAPI backend (`backend/`), SQLAlchemy 2.0 relational schema, Alembic configuration, security headers, prompt-injection guardrails, and GitHub + Vercel CI/CD pipeline.
- **Phase 2 — Premium Design System**: Obsidian Dark and Alabaster Light themes, 12-section cinematic marketing landing page, collapsible desktop sidebar, responsive mobile navigation, and `⌘K` universal command palette.
- **Phase 3 — Core Intelligence**: Universal natural-language search engine, centralised live data provider adapters (World Bank Open Data, REST Countries v3.1, OpenAlex, Crossref, Wikimedia REST API), and persistent context-aware AI assistant (`⌘J`).
- **Phase 4 — Global Atlas & Infinite Knowledge Graph**:
  - Module 01: Interactive 3D WebGL/Three.js Earth Globe with 7 intelligence layers and Country Intelligence Profiles with live World Bank metrics.
  - Module 02: Infinite Knowledge Graph with 6 layout modes (Force-directed, Radial, Hierarchical, Circular, Tree, Clustered), typed semantic edges, and progressive expansion.
  - Intelligence Compare engine with multi-indicator radar, bar, and historical trajectory charts.
- **Phase 5 — Reality Timeline**: Module 04 chronological event explorer across Ancient, Medieval, Modern, and Contemporary eras with horizontal/vertical views and knowledge graph bridges.
- **Phase 6 — Deep Research & What-If Simulations**:
  - Module 05: Multi-step research orchestrator across 6 modes with live OpenAlex/Wikimedia citation extraction and credibility grading.
  - Module 03: Quantitative simulation engine across Economics, Demographics, Energy, Technology, and Environment with 1,000-path Monte Carlo confidence bands and tornado sensitivity analysis.
- **Phase 7 — Digital World Laboratory**: Module 06 interactive scientific experiments across Physics, Space, Chemistry, Biology, Climate, and Engineering with real-time mathematical models and LaTeX equations.
- **Phase 8 & 9 — Workspace, Export Centre & Production Verification**: Persistent collections, notes, bookmarks, multi-format exports (PDF/Print, Markdown, CSV, JSON, SVG), and comprehensive Vitest + Pytest verification suites.
