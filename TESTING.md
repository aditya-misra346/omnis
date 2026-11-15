# OMNIS — Testing, Verification & Quality Assurance (`TESTING.md`)

## 1. Multi-Layer Testing Strategy

### 1.1 Frontend & Fluid Compute Unit/Integration Tests (`tests/omnis.test.ts`)
Executed via **Vitest** (`npm test`):
- **Universal Search & Query Intent Classification**: Verifies natural language queries (`Explain India's economic development since 1991`, `Compare India and China economically`, `How are semiconductor manufacturing and geopolitics connected?`), typo tolerance, and category filtering.
- **What-If Simulation Mathematical Models**: Verifies baseline vs modified trajectories, Monte Carlo percentile ordering (`P10 <= P50 <= P90`), parameter sensitivity calculation, and reproducibility across all 5 categories.
- **Infinite Knowledge Graph Engine**: Verifies node generation, duplicate-node prevention, relationship deduplication, and provenance tagging (`verified` vs `ai_hypothesis`).
- **Deep Research & Provenance Integrity**: Verifies citation attachment, verification badges, and absence of fabricated URLs.
- **Security & Prompt-Injection Guardrails**: Verifies detection and rejection of prompt-injection payloads and rate-limiter enforcement.

### 1.2 Python FastAPI Backend & Numerical Suite (`backend/tests/test_api.py`)
Executed via **Pytest** (`npm run test:backend`):
- Tests `/api/v1/health`, `/api/v1/countries`, `/api/v1/simulate`, `/api/v1/graph`, `/api/v1/research`, `/api/v1/timeline`, SQLAlchemy relational persistence, and prompt-injection filtering.

### 1.3 End-to-End Browser & Visual Verification
- Verifies all 11 primary navigation routes, Light & Dark theme switching, 3D Globe interaction, Country Intelligence comparisons (India vs China, India vs USA, Germany vs Japan), Knowledge Graph layout switching, Simulation sliders, Digital World Laboratory interactive canvas experiments, and Workspace persistence across sessions.
