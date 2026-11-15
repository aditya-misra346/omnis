# OMNIS — The Intelligence of Everything

> **Mission:** Understand Anything. Connect Everything. Discover What Comes Next.

OMNIS is a next-generation AI-powered global intelligence, scientific research, and knowledge discovery ecosystem. Instead of returning static walls of text, OMNIS transforms complex global, economic, historical, scientific, and geopolitical information into interactive, source-traceable intelligence experiences.

---

## Core Architecture & Six Flagship Modules

1. **Module 01 — Global Intelligence Globe (`/atlas`)**
   - Interactive 3D WebGL/Three.js Earth with realistic atmospheric scattering, day/night cycle, country markers, and 7 toggleable intelligence overlays (Geography, Economics, Demographics, Energy, Environment, Technology, International Relations).
   - Dedicated **Country Intelligence Profiles** powered by live **World Bank Open Data API** (`api.worldbank.org/v2`) and **REST Countries v3.1** (`restcountries.com/v3.1`), complete with multi-indicator comparison charts and explicit data provenance metadata (source, retrieval timestamp, units, coverage, and methodology).

2. **Module 02 — Infinite Knowledge Graph (`/knowledge-graph`)**
   - Dynamic semantic network engine built on D3.js and HTML5 Canvas/SVG with 6 viewing layouts: **Force-Directed**, **Radial**, **Hierarchical**, **Circular**, **Tree**, and **Clustered**.
   - Typed semantic relationships (`Causes`, `Influences`, `Depends on`, `Competes with`, `Developed by`, `Related to`, `Historically preceded`, `Part of`, `Regulates`, `Supports`, `Contradicts`) with provenance badges distinguishing **Verified** relationships from **AI-Generated Hypotheses**.
   - Progressive infinite node expansion, duplicate-node prevention, relationship filtering, node inspector drawer, and SVG/JSON export.

3. **Module 03 — What-If Simulation Engine (`/simulations`)**
   - Quantitative scenario exploration workspace across **Economics**, **Demographics**, **Energy**, **Technology**, and **Environment**.
   - Powered by reproducible mathematical models (Solow-Swan Macroeconomic Growth, Cohort-Component Demographic Projection, Levelized Grid Decarbonisation, Logistic S-Curve Technology Diffusion, and IPCC-aligned 2-Box Carbon & Radiative Forcing Differential Equations) with 1,000-path Monte Carlo uncertainty bands (`P10`, `P50`, `P90`) and Tornado Sensitivity Analysis.
   - Strictly separates historical observations, measured baselines, model assumptions, and simulated outputs.

4. **Module 04 — Reality Timeline (`/timeline`)**
   - Chronological and cross-regional event exploration spanning **Ancient**, **Medieval**, **Modern**, and **Contemporary** eras across science, economics, geopolitics, and technology.
   - Horizontal and vertical timeline views, era zooming, multi-dimensional filtering, primary/secondary source citations, causal chain tracking, and 1-click transition into the Infinite Knowledge Graph.

5. **Module 05 — Deep Research Intelligence (`/research`)**
   - Multi-step research orchestration engine supporting 6 modes: **Quick**, **Deep**, **Comparative**, **Historical**, **Scientific**, and **Economic**.
   - Retrieves real academic literature from **OpenAlex** (`api.openalex.org`), **Crossref** (`api.crossref.org`), macroeconomic series from **World Bank**, and encyclopedic context from **Wikimedia REST API**.
   - Produces structured reports with Executive Summary, Key Findings, Supporting & Contradictory Evidence, Source Credibility Inspector, and Verification Status tags (`Verified`, `Single-Source`, `Conflicting`, `Reasonable Interpretation`, `AI Hypothesis`).

6. **Module 06 — Digital World Laboratory (`/laboratory`)**
   - Interactive scientific & engineering sandbox across **Physics**, **Space**, **Chemistry**, **Biology**, **Climate**, and **Engineering**.
   - Live mathematical simulations including N-Body Orbital Mechanics, Wave Interference & Harmonic Oscillators, 3D Molecular Bonding Inspector, Lotka-Volterra Ecosystem Dynamics, Planetary Radiative Energy Balance, and Truss Bridge Structural Load Analysis — complete with governing equations and explicit simplified-model disclosures.

---

## Additional Premium Capabilities

- **Home — Intelligence Command Center (`/command`)**: Customisable widget grid (rearrange, hide, restore), universal natural-language command bar, live global indicators, and quick workspace access.
- **Universal Search & Knowledge Explorer (`/explore`)**: Natural-language query intent classifier, semantic filtering across 10 entity categories, typo tolerance, and saved searches.
- **Intelligence Compare (`/intelligence`)**: Side-by-side entity and country comparison engine with radar charts, historical trajectories, percentage deltas, and personalised topic feeds.
- **Universal Context-Aware AI Assistant**: Persistent assistant (`⌘J`) aware of the active module, inspected country, knowledge graph node, or simulation scenario.
- **My Workspace & Export Centre (`/workspace`)**: Persistent collections, tags, folders, notes, bookmarks, and multi-format export (PDF/Print, Markdown, CSV, JSON, SVG).
- **Dual Bespoke Theme System (`/settings`)**: Engineered **Obsidian Dark** (`#07090E`) and **Alabaster Light** (`#F8FAFC`) themes, privacy controls, and live Data Provider health diagnostics.

---

## Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript (Strict), Tailwind CSS v4, Framer Motion, Three.js, D3.js, MapLibre GL, TanStack Query, Zustand, Zod.
- **Backend**: Python 3.12+ FastAPI service (`backend/`) with Pydantic v2, SQLAlchemy 2.0, Alembic migrations, NumPy numerical simulation routines, and Next.js Fluid Compute API routes (`src/app/api/v1/`) for zero-latency hybrid cloud deployment.
- **Database**: PostgreSQL (with `pgvector` support) in production, with automatic SQLite/IndexedDB persistence fallback for local and edge environments.
- **Quality Assurance**: Vitest (Frontend & API integration), Pytest (Python FastAPI & numerical simulations), GitHub Actions CI, and Vercel Automated Continuous Deployment.

---

## Quick Start

### 1. Frontend & Hybrid Cloud Server (Next.js)

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

### 2. Python FastAPI Backend Service

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

FastAPI interactive OpenAPI docs are served at `http://127.0.0.1:8000/docs`.

### 3. Running Tests

```bash
# Run Frontend & API Unit/Integration Tests
npm test

# Run TypeScript Strict Check
npm run typecheck

# Run Python FastAPI & Simulation Engine Tests
npm run test:backend
```

---

## Project Documentation Index

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design, hybrid runtime topology, and module boundaries
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) — Relational schema, indexes, and entity relationships
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) — REST API endpoints, schemas, and provenance contracts
- [SECURITY.md](./SECURITY.md) — Authentication, API hardening, prompt-injection defence, and privacy controls
- [DEPLOYMENT.md](./DEPLOYMENT.md) — GitHub Actions CI and Vercel continuous deployment pipeline
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) — Complete configuration reference
- [TESTING.md](./TESTING.md) — Unit, integration, visual, and failure testing methodologies
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Engineering standards and conventional commit workflow
- [CHANGELOG.md](./CHANGELOG.md) — Release history
- [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) — Phase 0–9 completion matrix and roadmap
