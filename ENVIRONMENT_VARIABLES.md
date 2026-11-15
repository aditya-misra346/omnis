# OMNIS — Environment Variables Reference (`ENVIRONMENT_VARIABLES.md`)

| Variable | Scope | Required | Default / Fallback | Description |
|---|---|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | Public | No | `"OMNIS"` | Application display name |
| `NEXT_PUBLIC_APP_URL` | Public | No | `"http://localhost:3000"` | Canonical base URL |
| `FASTAPI_BACKEND_URL` | Server-only | No | `""` (Uses built-in Fluid Compute engine) | URL of standalone Python FastAPI cluster |
| `DATABASE_URL` | Server-only | No | `"sqlite:///./omnis.db"` | PostgreSQL (`postgresql+psycopg://...`) or SQLite connection string |
| `REDIS_URL` | Server-only | No | In-memory LRU TTL cache | Redis instance URL for caching and rate limiting |
| `OMNIS_AUTH_SECRET` | Server-only | Yes (Prod) | Ephemeral dev secret | 64-character hex secret for signing session tokens |
| `OPENALEX_POLITE_EMAIL` | Server-only | No | `"research@omnis-intelligence.org"` | Polite pool identifier for OpenAlex academic API |
| `WORLD_BANK_API_BASE` | Server-only | No | `"https://api.worldbank.org/v2"` | World Bank Open Data API endpoint |
| `REST_COUNTRIES_API_BASE` | Server-only | No | `"https://restcountries.com/v3.1"` | REST Countries v3.1 API endpoint |
| `WIKIMEDIA_API_BASE` | Server-only | No | `"https://en.wikipedia.org/api/rest_v1"` | Wikimedia REST API endpoint |

## Security Rules
1. Never commit `.env` or `.env.local` files to Git.
2. Never prefix server secrets (`OMNIS_AUTH_SECRET`, `DATABASE_URL`, `AI_PROVIDER_API_KEY`) with `NEXT_PUBLIC_`.
