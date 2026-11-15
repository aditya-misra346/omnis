# OMNIS — Database & Information Architecture (`DATABASE_SCHEMA.md`)

## 1. Overview

OMNIS uses **PostgreSQL** (with `pgvector` support for 1536-dimensional semantic embeddings) managed via **SQLAlchemy 2.0** and **Alembic** migrations in `backend/app/db/models.py`. For zero-dependency local testing and CI execution, SQLAlchemy automatically supports SQLite with strict foreign key enforcement.

---

## 2. Core Relational Entities

### 2.1 Identity, Access & Governance
- **`users`**: `id (UUID PK)`, `email (UNIQUE, INDEXED)`, `display_name`, `password_hash`, `role_id (FK)`, `is_verified`, `created_at`, `updated_at`.
- **`roles`** & **`permissions`**: Role-based access control (`researcher`, `analyst`, `admin`) with granular permission mappings.
- **`user_sessions`**: `id (UUID PK)`, `user_id (FK CASCADE)`, `token_hash (UNIQUE)`, `expires_at`, `ip_address`, `user_agent`, `revoked_at`.
- **`user_preferences`**: `user_id (PK/FK)`, `theme ('dark' | 'light')`, `followed_topics (JSONB)`, `dashboard_layout (JSONB)`, `default_research_mode`.
- **`audit_events`**: Immutable security and data-mutation audit log (`id`, `user_id`, `action`, `resource_type`, `resource_id`, `metadata_json`, `created_at`).

### 2.2 Global Atlas & Macroeconomic Intelligence
- **`geographic_regions`**: `id`, `code (UNIQUE)`, `name`, `parent_region_id`.
- **`countries`**: `iso3 (CHAR(3) PK)`, `iso2 (CHAR(2) UNIQUE)`, `name`, `official_name`, `capital`, `region_id (FK)`, `population`, `area_sq_km`, `currencies_json`, `languages_json`, `flag_svg_url`, `lat`, `lng`, `updated_at`.
- **`economic_indicators`**: `id (PK)`, `country_iso3 (FK INDEXED)`, `indicator_code (INDEXED)`, `indicator_name`, `category`, `year (INDEXED)`, `value (NUMERIC)`, `units`, `source_provider`, `source_url`, `methodology`, `retrieved_at`.
  - Unique constraint on `(country_iso3, indicator_code, year)`.

### 2.3 Infinite Knowledge Graph
- **`knowledge_entities`**: `id (PK)`, `slug (UNIQUE INDEXED)`, `label`, `category`, `summary`, `attributes_json`, `embedding_vector`, `source_provider`, `verification_status`.
- **`entity_relationships`**: `id (PK)`, `source_entity_id (FK)`, `target_entity_id (FK)`, `relationship_type` (`CAUSES`, `INFLUENCES`, `DEPENDS_ON`, `COMPETES_WITH`, `DEVELOPED_BY`, `RELATED_TO`, `HISTORICALLY_PRECEDED`, `PART_OF`, `REGULATES`, `SUPPORTS`, `CONTRADICTS`), `weight`, `evidence_summary`, `citation_url`, `is_hypothesis (BOOLEAN)`.
- **`knowledge_graphs`**, **`graph_nodes`**, **`graph_edges`**: User-saved graph snapshots with layout coordinates and custom visual clustering.

### 2.4 Deep Research Intelligence & Provenance
- **`research_projects`**: Workspace containers grouping related reports, graphs, and simulations.
- **`research_reports`**: `id (UUID PK)`, `user_id (FK)`, `project_id (FK)`, `query`, `mode`, `executive_summary`, `key_findings_json`, `analysis_markdown`, `limitations_markdown`, `conclusions_markdown`, `created_at`.
- **`research_sources`**: `id (UUID PK)`, `report_id (FK)`, `title`, `publisher`, `authors_json`, `published_date`, `retrieved_at`, `url`, `doi`, `source_type` (`primary`, `academic`, `institutional`, `journalism`), `credibility_tier`.
- **`extracted_claims`**: `id (UUID PK)`, `report_id (FK)`, `source_id (FK)`, `claim_text`, `excerpt`, `verification_status` (`verified`, `single_source`, `conflicting`, `interpretation`, `unverified`, `ai_hypothesis`).

### 2.5 What-If Simulation Engine
- **`simulation_models`**: Registered mathematical models (`id`, `slug`, `category`, `name`, `version`, `equations_latex`, `assumptions_json`, `limitations_text`).
- **`simulation_runs`**: `id (UUID PK)`, `user_id (FK)`, `model_id (FK)`, `scenario_name`, `horizon_years`, `monte_carlo_iterations`, `random_seed`, `created_at`.
- **`simulation_inputs`**: Parameter overrides recorded per run (`parameter_key`, `baseline_value`, `modified_value`, `units`).
- **`simulation_results`**: Time-series output trajectories (`year_offset`, `baseline_value`, `modified_p10`, `modified_p50`, `modified_p90`, `sensitivity_json`).

### 2.6 Reality Timeline & Workspace
- **`historical_events`**: `id (PK)`, `slug (UNIQUE)`, `title`, `date_display`, `year_numeric (INDEXED)`, `era`, `category`, `country_iso3`, `location_name`, `summary`, `historical_context`, `participants_json`, `causes_json`, `consequences_json`, `sources_json`.
- **`timelines`**: Custom user-curated event sequences.
- **`saved_collections`**, **`bookmarks`**, **`notifications`**, **`data_provider_records`**: Workspace organisation and external API health telemetry.

---

## 3. Data Isolation & Retention Policies

1. **Row-Level User Isolation**: Every query on `research_reports`, `knowledge_graphs`, `simulation_runs`, `saved_collections`, and `bookmarks` scopes by `WHERE user_id = :authenticated_user_id`.
2. **Cascade Deletion**: Deleting a user account (`DELETE FROM users WHERE id = :id`) cascades across all private sessions, preferences, saved collections, reports, and simulation runs.
3. **Secret Hygiene**: External API keys are strictly loaded from environment variables and never persisted in `data_provider_records` or `audit_events`.
