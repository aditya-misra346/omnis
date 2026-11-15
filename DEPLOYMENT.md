# OMNIS — Deployment & Continuous Delivery (`DEPLOYMENT.md`)

## 1. Automated GitHub & Vercel Pipeline

OMNIS uses an automated Git-driven Continuous Integration and Continuous Deployment (CI/CD) workflow:

1. **Repository**: `https://github.com/aditya-misra346/omnis` (Default branch: `main`)
2. **Continuous Integration (`.github/workflows/ci.yml`)**:
   - Runs automatically on every push and pull request.
   - Executes `npm run typecheck` (TypeScript strict validation), `npm test` (Vitest unit & integration suite), `npm run build` (Next.js production build), and `pytest` (Python FastAPI backend & numerical simulation suite).
3. **Continuous Deployment (Vercel)**:
   - Project: `omnis` connected directly to `aditya-misra346/omnis`.
   - Every verified push to `main` triggers an automatic production build and deployment on Vercel.
   - Feature branches and pull requests receive isolated Vercel Preview Deployments.

---

## 2. Hybrid Frontend + Backend Deployment Topology

- **Next.js Application & Fluid Compute API Routes (`/src/app/api/v1/*`)**: Deployed natively on Vercel Node.js Fluid Compute (300s duration limit on Hobby, up to 800s/1800s on Pro). All live external data adapters (World Bank, REST Countries, OpenAlex, Crossref, Wikimedia) and deterministic simulation engines run directly in Vercel Functions with zero external failure points.
- **Standalone Python FastAPI Service (`backend/`)**: Can be deployed as a containerised service (`Dockerfile` / Railway / Fly.io / AWS ECS / Vercel Services) and linked via the `FASTAPI_BACKEND_URL` environment variable.

---

## 3. Rollback & Incident Recovery Procedure

If a production deployment introduces a regression:

```bash
# 1. Inspect recent deployments
vercel ls

# 2. Inspect logs of a failing deployment
vercel logs --deployment <deployment-url>

# 3. Instant rollback to the last known good production deployment
vercel rollback <previous-deployment-url-or-id>

# 4. Once fixed on main, re-promote production deployment
vercel promote <new-verified-deployment-url>
```
