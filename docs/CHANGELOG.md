# Changelog

All notable changes to this project are documented here. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
the project uses [Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Phase 0 — Bootstrap
- Monorepo skeleton matching README §4 (`apps/api`, `apps/web`,
  `packages/shared-types`, `packages/rules-engine`, `docs/`).
- All Phase 0 docs: `ARCHITECTURE.md`, `ASSUMPTIONS.md`,
  `EVENT_CATALOG.md`, `RBAC_MATRIX.md`, `SIS_MIGRATION.md`,
  `INTEGRATIONS.md`, `PRACTICUM_INTEGRATION.md`, `HARDENING.md`.
- `pnpm-workspace.yaml` + root `package.json` + per-package `package.json`
  + `tsconfig.base.json` + `.eslintrc.cjs` + `.prettierrc.json` +
  `commitlint.config.cjs` + husky hooks (`pre-commit`, `commit-msg`).
- `docker-compose.yml` (Postgres 15 + Redis 7) and `.env.example`
  enumerating every env var.
- API `Dockerfile` (multi-stage, pnpm-aware).

### Phase 1 — Core
- Full Prisma schema (`apps/api/prisma/schema.prisma`) covering students,
  flags, users, refresh tokens, audit log, event store, communications,
  tasks, and every module table down through Practicum.
- Core utilities: env loader (Zod), pino logger with PII redaction,
  Prisma client wired with row-level scope middleware, Redis client,
  `AsyncLocalStorage`-backed request context.
- RBAC: capability registry with role → cap mapping, Zod-validated
  capabilities, `requirePermission` middleware, Prisma row-level filter
  enforcing per-campus scope on every read.
- Audit: `audit()` helper used from middleware + every mutating route.
- Auth: bcrypt password hashing, JWT access + rotating refresh tokens,
  login / refresh / logout / me routes.
- Event bus: BullMQ worker + queue, `EventStore` persistence, typed
  envelope, idempotent handlers, system events.
- HTTP middleware: request context, Zod validation, RBAC, error handler.
- Health: `/health` (db + redis) and `/admin/health` (every adapter).

### Phase 1 — Integrations / Adapter framework
- `IIntegrationAdapter` interfaces for **SIS** (CampusLogin / Salesforce),
  Moodle, BBB, Twilio, JustCall, PandaDoc, Google Workspace, FAL.ai,
  Claude, and SMTP email.
- Mock implementations for all 10; real HTTP implementations for
  CampusLogin, Moodle, BBB, Twilio, Claude.
- Factory chooses real vs mock from env vars (`SIS_ADAPTER`,
  `MOODLE_ADAPTER`, …).

### Phase 2 — Module 1 Intake & Onboarding
- Tables: `orientation_records`, `welcome_communications`,
  `moodle_enrollment_status`, `post_orientation_surveys`.
- Workflows: `OnStudentCreated`, `OnOrientationAttended`,
  `SurveyReminderSent` (+3d, +7d).
- Routes: list orientation records, mark attendance, intake funnel KPI.

### Phase 3 — Module 2 Engagement
- Tables: `connect_rooms`, `connect_room_assignments`,
  `student_leader_assignments`, `event_participation`,
  `newsletter_deliveries`, `engagement_score_config`,
  `student_timeline_progress`.
- `ScheduledTimelineService` (`runDueTimelineSteps`) runs every minute via
  scheduler.
- Engagement score recompute hooked into newsletter / event /
  connect-room / Moodle activity events.
- Newsletter open-tracking pixel (`/api/v1/engagement/newsletters/pixel/:id.gif`).

### Phase 4 — Module 3 Early Alert & Risk
- Tables: `attendance_records`, `grade_records`, `withdrawal_records`,
  `risk_assessments`, `early_alerts`, `cases`, `risk_rule_config`.
- Risk rules engine (`packages/rules-engine`) with default weights.
- On `RiskFlagged`: open Case + assign default Intervention by primary
  factor + create Task for the assigned coordinator.
- Escalation sweep every 5 min (`runEscalationSweep`) — cases with no
  action in 5 business days emit `risk.escalated` and surface as urgent
  tasks.
- Routes: at-risk list, risk heatmap, historical risk trend, case
  list/close/log-action, risk rules read/edit (admin-only).

### Phase 5 — Module 4 Academic Support
- Tables: `interventions`, `intervention_playbooks`, `class_audits`,
  `accommodation_requests`, `reentry_plans`, `reentry_weekly_checks`.
- Re-entry workflow: status-change `withdrawn → active` auto-creates a
  4-week plan with weekly checks; daily `runReentryWeeklyChecks` cron.
- Routes for interventions, class audits, accommodations, withdrawals.

### Phase 6 — Module 5 Practicum scaffold
- Tables: `practicum_placements`, `practicum_supervisors`,
  `practicum_hours_logs`, `practicum_evaluations`.
- Workflow: `PracticumStarted` flips status to `on_practicum`.
- `recomputePracticumFlags(student_id)` updates
  `completed_hours_flag` and `practicum_ready_flag`.
- Integration TODO doc enumerates merge points with the standalone
  Practicum Tracker.

### Phase 7 — Module 6 Data & Reporting
- KPI Overview (90-day retention, at-risk %, engagement avg, onboarding
  completion).
- Operational dashboard (open cases, escalations, interventions, tasks
  by owner).
- Survey dashboard (response rate, NPS).
- Engagement heatmap (program × week).
- CSV export route for students.

### Cross-module + jobs
- `core/cross-module-rules.ts`: status sync (withdrawn pauses workflows,
  graduated migrates to alumni), universal `task.created` →
  `tasks` table, universal `communication.logged` → `communications`
  table.
- `apps/api/src/jobs/scheduler.ts`: BullMQ-based cron runner for
  timeline / escalation / re-entry / SIS sync.
- `apps/api/src/jobs/sis-sync.ts`: incremental SIS pull every 15 min,
  emits `student.created` / `attendance.recorded` / `grade.recorded`.

### Phase 8 — AI Layer
- `aiService` with prompt versioning hooks, 24 h response cache,
  kill-switch toggle.
- Endpoints: `/api/v1/ai/students/:id/risk-summary` (Claude
  `claude-opus-4-7`) and `/api/v1/ai/students/:id/nudge` (draft outreach).
- AI kill-switch endpoint admin-only.

### Phase 9 — Hardening (docs only — execution at deploy time)
- `docs/HARDENING.md`: k6 load-test plan, OWASP Top 10 mitigation
  checklist with code citations, backup + restore runbook, deployment
  runbook for Replit + Docker, pen-test pre-flight.

### Frontend (apps/web)
- React 18 + Vite + TanStack Query + Zustand-ready stack with Tailwind
  dark-mode-first theme matching MCG palette.
- Pages: Login, Dashboard (KPI tiles), Students (table + RAG pills),
  At-Risk (cards), Engagement (tier distribution), Reporting (ops tiles
  + CSV export link).
- API client + auth helper with token persistence + logout cascading
  through React state.

### Tests
- `packages/rules-engine` engagement + risk score unit tests.
- `apps/api/src/core/rbac/capabilities.test.ts` for the capability matrix.

### Seed
- `apps/api/prisma/seed.ts`: 1 entity, 3 campuses, 3 programs, 5 users
  (one per role, password `changeme123`), 3 connect rooms, 3 default
  intervention playbooks, 50 demo students across all statuses with
  flags pre-populated.
