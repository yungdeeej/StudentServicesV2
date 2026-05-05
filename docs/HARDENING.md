# Phase 9 — Hardening

> Run before any production traffic. Each section has acceptance criteria.

## 1. Load test (k6) — target 500 concurrent users

Save as `loadtest/k6.js`:

```js
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  scenarios: {
    portal: {
      executor: 'constant-vus',
      vus: 500,
      duration: '5m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE = __ENV.BASE_URL;
const TOKEN = __ENV.TOKEN;

export default function () {
  const headers = { Authorization: `Bearer ${TOKEN}` };
  const r1 = http.get(`${BASE}/api/v1/students?page=1&page_size=25`, { headers });
  check(r1, { '200 students list': (r) => r.status === 200 });
  const r2 = http.get(`${BASE}/api/v1/reporting/kpi/overview`, { headers });
  check(r2, { '200 kpi overview': (r) => r.status === 200 });
  sleep(1);
}
```

Acceptance: p95 < 500 ms, error rate < 1 %, no DB connection-pool exhaustion.

## 2. OWASP Top 10 checklist

| # | Risk | Mitigation in this codebase |
|---|---|---|
| A01 | Broken Access Control | RBAC middleware (`requirePermission`) + Prisma row-level scope (`apps/api/src/core/rbac/row-level.ts`). |
| A02 | Cryptographic Failures | bcrypt cost 12; JWT signed with separate access + refresh secrets; HTTPS terminated at load balancer. |
| A03 | Injection | Prisma parameterized queries; Zod validation at every route entry. |
| A04 | Insecure Design | Event-driven core with idempotent handlers; audit log on every write. |
| A05 | Security Misconfiguration | `app.disable('x-powered-by')`; secrets via env only; `.env` git-ignored. |
| A06 | Vulnerable Components | `pnpm audit` weekly + Dependabot. |
| A07 | Identification & Auth | JWT TTL 15 min + rotating refresh tokens; account lockout TBD. |
| A08 | Software & Data Integrity | Forward-only migrations; commit signing recommended. |
| A09 | Logging & Monitoring | pino structured logs + correlation IDs + Sentry hook. |
| A10 | SSRF | All adapters use a fixed list of base URLs from env; no user-supplied URLs are fetched server-side. |

Outstanding (TBD before prod):
- Account lockout / rate-limit on `/api/v1/auth/login`.
- CSP + security headers via `helmet` middleware.
- WAF rules at the LB.

## 3. Backup & restore runbook

**What we back up:** Postgres (full DB), Redis (best-effort — queue state can
be reconstructed from `event_store`).

**Cadence:** automated nightly snapshot + 7-day retention; weekly off-site
copy with 90-day retention.

**Restore drill:**
1. Stop the API (`docker compose stop api`).
2. `psql -d <new-db> < snapshot.sql`.
3. `pnpm --filter @mcg/api prisma:deploy` — applies any newer migrations.
4. Start API. Confirm `/health` reports `db.ok=true`.
5. Confirm `event_store` row count matches the snapshot ± any in-flight
   events lost during the cutover (BullMQ at-least-once means duplicates
   are possible; idempotent handlers absorb them).

Schedule drill quarterly. Document deltas in `/docs/CHANGELOG.md`.

## 4. Deployment runbook (Replit primary, Docker alt)

### Replit
- One-click deploy from the `main` branch.
- Required secrets: every key in `.env.example`. `.env` provisioned via
  Replit secrets UI.
- Postgres: Replit DB or external Neon URL via `DATABASE_URL`.
- Redis: Upstash / Redis Cloud via `REDIS_URL`.
- Health: Replit's health check hits `/health`.

### Docker
- `docker compose -f docker-compose.yml up -d postgres redis` for
  dependencies.
- `docker build -f apps/api/Dockerfile -t mcg-api .` then
  `docker run --env-file .env -p 3001:3001 mcg-api`.
- For the web app: `pnpm --filter @mcg/web build` and serve `dist/` from
  any static host (Cloudflare Pages, Vercel, S3+CF).

### Cutover steps
1. Run `pnpm --filter @mcg/api prisma:deploy` against prod DB.
2. Deploy new API image.
3. Smoke test: `curl /health` + login + `/api/v1/students?page=1`.
4. If smoke fails → roll back via Replit revert / docker tag swap.
5. Tail logs for 30 min post-deploy.

## 5. Pen-test checklist

Before running an external test, confirm:
- All test accounts have `is_active=false` outside the test window.
- Mock-mode toggle is OFF; integrations point at sandboxes.
- Audit log volume budget is sized for ~10× normal write volume.
- Slack channel `#mcg-pentest` is on call.
