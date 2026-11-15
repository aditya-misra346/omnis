# OMNIS — Security & Privacy Architecture (`SECURITY.md`)

## 1. Security-First Design Principles

OMNIS treats security, epistemic integrity, and user privacy as core architectural requirements.

---

## 2. Authentication & Session Management

- **Session Security**: Password hashing via PBKDF2-HMAC-SHA256 with per-user cryptographic salts; session tokens signed with HMAC-SHA256 (`OMNIS_AUTH_SECRET`).
- **Account Lifecycle**: Supports registration, login, logout, password reset, email verification workflow, and instant session revocation.
- **User Isolation**: Workspace items, saved research reports, knowledge graphs, and simulation runs are strictly scoped to the authenticated user context.

---

## 3. API Hardening & Transport Security

- **Input & Output Validation**: All API payloads are validated through strict **Zod** schemas (TypeScript) and **Pydantic v2** models (Python FastAPI) with explicit string length and payload size limits.
- **Rate Limiting**: Token-bucket rate limiting per client IP protects `/api/v1/*` endpoints against abuse and automated scraping.
- **HTTP Security Headers**: Configured in `next.config.ts` and FastAPI middleware:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- **SQL Injection & XSS Prevention**: Parameterised SQLAlchemy 2.0 ORM queries (`select()`, bound parameters) and React automatic DOM escaping.
- **Secret Hygiene**: Zero private API credentials are exposed via `NEXT_PUBLIC_*` variables.

---

## 4. AI Security & Prompt-Injection Defence

 Implemented in `src/lib/security/guardrails.ts` and `backend/app/core/security.py`:
1. **Prompt-Injection Detection**: Inspects user queries and retrieved external documents for instruction-override patterns (`ignore previous instructions`, `system prompt`, `reveal api key`, `jailbreak`, etc.).
2. **Untrusted Content Quarantine**: External snippets retrieved from OpenAlex, Crossref, or Wikimedia are treated strictly as passive data quotations—never interpolated as executable instructions or raw HTML.
3. **Deterministic Citation Enforcement**: The synthesis engine cannot attach a citation URL or DOI unless that source object was actually retrieved in the current pipeline execution.

---

## 5. Privacy & Data Governance

- **User-Controlled Data**: Users can inspect, export (JSON/Markdown/CSV), delete individual research items, or wipe their entire workspace and account from `/settings`.
- **No Sensitive Profiling**: The Personalised Intelligence Feed uses only topics explicitly followed by the user.
