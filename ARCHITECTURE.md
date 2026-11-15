# OMNIS — System Architecture (`ARCHITECTURE.md`)

## 1. Architectural Philosophy

OMNIS is engineered as a **Modular Polyglot Intelligence Platform** combining a high-performance **Next.js 15 TypeScript Frontend & Fluid Compute API Layer** with a **Python FastAPI Scientific & Data Ingestion Backend**.

Key architectural principles:
1. **Strict Provenance & Epistemic Honesty**: Every statistic, chart, research claim, and knowledge graph edge carries a structured `ProvenanceRecord` (`source`, `publisher`, `url`, `retrievedAt`, `lastUpdated`, `units`, `coverage`, `methodology`, `verificationStatus`).
2. **Zero Silent Fabrication**: When an external data provider or indicator is unavailable for a specific country or period, OMNIS returns explicit `missingData: true` markers rather than interpolating or inventing numbers.
3. **Hybrid Execution Topology**:
   - **Standalone Python FastAPI Service (`backend/`)**: Runs SQLAlchemy 2.0 ORM, Alembic migrations, NumPy Monte Carlo/ODE simulations, and asynchronous `httpx` external data ingestion.
   - **Next.js Fluid Compute API Layer (`src/app/api/v1/*`)**: Proxies to `FASTAPI_BACKEND_URL` when the standalone Python cluster is attached, and executes deterministic live data provider adapters (World Bank, REST Countries, OpenAlex, Crossref, Wikimedia) and mathematical simulation engines natively on Vercel Node.js Fluid Compute so production and preview deployments operate with 100% reliability.
4. **High-Performance Computation Strategy**:
   - Rather than introducing premature microservice overhead for tasks handled efficiently in-memory, OMNIS uses vectorised NumPy routines in Python (`backend/app/services/simulation_engine.py`) and typed `Float64Array` / deterministic PRNG buffers in TypeScript (`src/lib/simulations/engine.ts`) for 1,000-path Monte Carlo simulations, matrix sensitivity calculations, and force-directed graph layouts.

---

## 2. System Topology Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        OMNIS CLIENT LAYER (Next.js 15)                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────────────┐  │
│  │ 3D Globe     │ │ Knowledge    │ │ What-If      │ │ Digital World     │  │
│  │ (Three.js)   │ │ Graph (D3)   │ │ Simulations  │ │ Laboratory (Canvas│  │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └─────────┬─────────┘  │
│         └────────────────┴────────┬───────┴───────────────────┘            │
│                    Zustand Store + TanStack Query + Zod                    │
└───────────────────────────────────┼────────────────────────────────────────┘
                                    │ HTTPS / JSON + Provenance Envelopes
┌───────────────────────────────────▼────────────────────────────────────────┐
│               API GATEWAY & FLUID COMPUTE (`/api/v1/*` + FastAPI)          │
│  • Rate Limiting & Security Headers   • Prompt-Injection Sanitizer         │
│  • TTL Response Cache                 • Schema Validation (Zod / Pydantic) │
└───────┬───────────────────────────┬────────────────────────────┬───────────┘
        │                           │                            │
┌───────▼───────────┐   ┌───────────▼───────────┐    ┌───────────▼───────────┐
│ LIVE DATA ADAPTERS│   │ NUMERICAL SIMULATION  │    │ PERSISTENCE & STORAGE │
│ • World Bank API  │   │ & GRAPH ENGINE        │    │ • PostgreSQL +        │
│ • REST Countries  │   │ • Solow-Swan Macro    │    │   SQLAlchemy 2.0      │
│ • OpenAlex Works  │   │ • Cohort Demographics │    │ • Alembic Migrations  │
│ • Crossref API    │   │ • 2-Box Carbon ODE    │    │ • Client Workspace    │
│ • Wikimedia REST  │   │ • 1,000-Path Monte    │    │   Sync & Export       │
└───────────────────┘   └───────────────────────┘    └───────────────────────┘
```

---

## 3. Directory Structure

```
omnis/
├── .github/workflows/ci.yml      # Automated CI pipeline (TypeScript, Vitest, Next Build, Pytest)
├── backend/                      # Python FastAPI Backend Service
│   ├── alembic/                  # Database migration scripts
│   ├── app/
│   │   ├── core/                 # Config, security, rate limiting, prompt-injection defence
│   │   ├── db/                   # SQLAlchemy 2.0 relational models & database session
│   │   ├── routers/              # FastAPI route controllers (countries, graph, research, simulate, timeline)
│   │   ├── schemas/              # Pydantic v2 request/response contracts
│   │   ├── services/             # Business logic, live API providers, NumPy simulation engine
│   │   └── main.py               # FastAPI application factory
│   ├── tests/                    # Pytest unit & integration suite
│   └── requirements.txt          # Locked Python dependencies
├── src/
│   ├── app/                      # Next.js App Router pages & API route handlers
│   │   ├── page.tsx              # Marketing Landing Page (12-section cinematic presentation)
│   │   ├── command/page.tsx      # Home — Intelligence Command Center
│   │   ├── intelligence/page.tsx # Personalised Intelligence Feed & Intelligence Compare Engine
│   │   ├── explore/page.tsx      # Universal Natural-Language Search & Knowledge Explorer
│   │   ├── knowledge-graph/      # Module 02: Infinite Knowledge Graph
│   │   ├── atlas/page.tsx        # Module 01: Global Intelligence Globe & Country Profiles
│   │   ├── research/page.tsx     # Module 05: Deep Research Intelligence
│   │   ├── simulations/page.tsx  # Module 03: What-If Simulation Engine
│   │   ├── timeline/page.tsx     # Module 04: Reality Timeline
│   │   ├── laboratory/page.tsx   # Module 06: Digital World Laboratory
│   │   ├── workspace/page.tsx    # My Workspace & Report/Export Centre
│   │   ├── settings/page.tsx     # Account, Theme, Followed Topics, Privacy & Data Provider Status
│   │   └── api/v1/               # REST API routes (health, search, countries, graph, research, simulate, timeline, assistant, auth)
│   ├── components/
│   │   ├── layout/               # AppShell, Collapsible Sidebar, Top Command Header, Mobile Drawer, AI Assistant
│   │   ├── globe/                # Interactive 3D Three.js Earth Globe with shaders & markers
│   │   ├── graph/                # Interactive D3 multi-layout Knowledge Graph canvas
│   │   └── ui/                   # Provenance badges, charts, modals, skeletons
│   ├── lib/
│   │   ├── data/                 # Baseline curated datasets, historical registry, scientific constants
│   │   ├── providers/            # Centralised live API provider clients (World Bank, OpenAlex, Wikimedia, REST Countries)
│   │   ├── simulations/          # Reproducible mathematical simulation & sensitivity engines
│   │   ├── security/             # Input sanitizers, rate limiters, prompt-injection filters
│   │   └── store/                # Zustand persistent state store (workspace, preferences, theme, auth)
│   └── types/                    # Strict TypeScript domain models & Zod schemas
└── tests/                        # Frontend & API Vitest unit/integration suite
```
