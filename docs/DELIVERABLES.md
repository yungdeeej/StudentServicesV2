# Deliverables — All Phases

## What shipped (every phase)

### Phase 0 — Bootstrap
Repo skeleton, tooling (eslint/prettier/husky/commitlint),
docker-compose (Postgres 15 + Redis 7), `.env.example`, Prisma init,
all six Phase 0 docs.

### Phase 1 — Core
Full Prisma schema; auth (JWT + refresh, bcrypt 12); RBAC capability
registry + middleware + Prisma row-level scope; audit log helper;
event bus on BullMQ with EventStore; HTTP middleware (request context,
Zod validation, error handler); health + admin/health; adapter framework
covering CampusLogin, Salesforce skeleton, Moodle, BBB, Twilio,
JustCall, PandaDoc, Google Workspace, FAL.ai, Claude, SMTP email — every
adapter has a Mock and an Http variant selectable by env var.

### Phase 2 — Module 1 Intake & Onboarding
`orientation_records`, `welcome_communications`,
`moodle_enrollment_status`, `post_orientation_surveys` tables;
`OnStudentCreated`, `OnOrientationAttended`, `SurveyReminderSent`
workflows; routes for the orientation list, mark-attendance, and the
intake funnel KPI.

### Phase 3 — Module 2 Engagement
Connect rooms, student leader assignments, event participation,
newsletter deliveries, timeline progress, engagement score config;
`ScheduledTimelineService` driving Week-0/+7d/+30d/+60d/+90d steps;
engagement-score recompute hooked into every relevant event;
newsletter open-tracking pixel.

### Phase 4 — Module 3 Early Alert & Risk
Attendance, grades, withdrawals, risk assessments, early alerts, cases,
risk rule config; deterministic risk scoring in `packages/rules-engine`;
auto-open case + auto-assign intervention on flag; escalation sweep
every 5 min; full at-risk dashboard + heatmap + historical trend
endpoints; admin-only risk-rules editing endpoint.

### Phase 5 — Module 4 Academic Support
Interventions + playbooks, class audits, accommodation requests,
re-entry plans + weekly checks; re-entry auto-creation on status flip;
withdrawal init + confirm + status sync.

### Phase 6 — Module 5 Practicum (scaffold per README §7 Module 5)
Placements, supervisors, hours logs, evaluations tables;
`recomputePracticumFlags()` driving `completed_hours_flag` and
`practicum_ready_flag`; status flips to `on_practicum` on placement
start; merge plan documented in `docs/PRACTICUM_INTEGRATION.md`.

### Phase 7 — Module 6 Data & Reporting
KPI overview (retention, at-risk %, onboarding completion, engagement
avg), operational dashboard, survey dashboard, engagement heatmap,
CSV export.

### Phase 8 — AI Layer
`aiService` with cache + kill-switch; risk-summary and draft-nudge
endpoints calling `claude-opus-4-7` (mock when key absent).

### Phase 9 — Hardening
`docs/HARDENING.md` with k6 load-test plan, OWASP Top 10 mitigation
mapping, backup + restore runbook, Replit + Docker deployment runbook,
pen-test pre-flight checklist.

### Cross-cutting
Universal `communication.logged` and `task.created` event handlers;
status-change rules pausing engagement on withdraw + alumni migration
on graduate; Socket.IO broadcasts of key events; sis-sync incremental
poll every 15 min via BullMQ scheduler.

### Frontend
Vite + React 18 + TanStack Query app with dark-mode Tailwind theme
matching the MCG palette. Pages: Login, Dashboard, Students,
At-Risk, Engagement, Reporting.

### Tests
- `packages/rules-engine`: engagement + risk score unit tests.
- `apps/api`: RBAC capability matrix tests.

### Seed
1 entity, 3 campuses, 3 programs, 5 users (one per role, password
`changeme123`), 3 connect rooms, 3 default intervention playbooks,
50 demo students across all statuses.

---

## How to run / test it

```bash
# 1. Install
pnpm install

# 2. Bring up dependencies
docker compose up -d postgres redis

# 3. Configure env
cp .env.example .env
# fill in JWT_ACCESS_SECRET / JWT_REFRESH_SECRET (any 16+ char string)

# 4. Migrate + seed
pnpm --filter @mcg/api prisma:migrate
pnpm --filter @mcg/api prisma:seed

# 5. Run the API
pnpm --filter @mcg/api dev

# 6. Run the web app (separate terminal)
pnpm --filter @mcg/web dev
# Open http://localhost:5173 — sign in as admin@mcg.example / changeme123

# 7. Tests
pnpm --filter @mcg/rules-engine test
pnpm --filter @mcg/api test
```

---

## Demo script (5-step click-through)

1. **Sign in** as `admin@mcg.example` / `changeme123`. The Executive
   Dashboard tiles populate from `/api/v1/reporting/kpi/overview`.
2. **Click Students.** Browse the seeded 50, see RAG pills and risk
   scores. Sort by risk descending visually.
3. **Click At-Risk.** See cards for every flagged student grouped by
   risk score. Empty state shows the celebration emoji when zero.
4. **Click Engagement.** See the high/medium/low tier distribution
   tiles populated from the rules-engine's recomputed scores.
5. **Click Reporting.** Open cases, escalations, intervention/task
   counts. Click "Export students.csv" — the API streams a CSV scoped
   to your campus access.

To exercise workflows: `POST /api/v1/students` (admin token) → creates
a student → `OnStudentCreated` schedules orientation → `POST
/api/v1/intake/orientation/:id { attended: true }` → email + Moodle
enroll + survey events fire end-to-end.

---

## Known gaps (next iteration)

- HTTP rate-limit on `/auth/login` (Phase 9 §4).
- Helmet / strict CSP headers.
- Real Salesforce object-model wiring (blocked on MCG IT confirmation —
  see `ASSUMPTIONS.md` J-002).
- Real PandaDoc / JustCall / Google Workspace / FAL adapters (skeletons
  only, mocks deterministic).
- E2E tests via Playwright (only unit/integration currently green).
- Pretty PDF export — currently CSV only.

---

## Updated docs in this commit

- `/docs/ARCHITECTURE.md`
- `/docs/ASSUMPTIONS.md`
- `/docs/EVENT_CATALOG.md`
- `/docs/RBAC_MATRIX.md`
- `/docs/SIS_MIGRATION.md`
- `/docs/INTEGRATIONS.md`
- `/docs/PRACTICUM_INTEGRATION.md`
- `/docs/HARDENING.md`
- `/docs/CHANGELOG.md`
- `/docs/DELIVERABLES.md` (this file)
