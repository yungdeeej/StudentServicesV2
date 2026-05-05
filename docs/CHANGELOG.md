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

## Student-facing portal expansion

### Added — Schema
- New roles on `UserRole`: `student`, `counselor`, `tutor`.
- `User.student_id` (unique nullable FK to `Student`) — links auth to
  the aggregate. `User.is_counselor`, `User.is_peer_tutor`,
  `User.tutoring_subjects` for finer-grained access.
- `Case.kind` and `Case.confidential` for wellness/counseling cases.
- 22 new models: `MessageThread`, `Message`, `StaffAvailability`,
  `Appointment`, `StudentDocument`, `WellnessCheckin`, `AnonymousReport`,
  `Resource`, `TutoringRequest`, `TutoringSession`, `StudyGroup`,
  `StudyGroupMember`, `BookableResource`, `ResourceBooking`, `Course`,
  `CoursePrerequisite`, `CourseEnrollment`, `TranscriptRequest`,
  `StaffWorkloadSnapshot`, `MlTrainingExport` (plus 19 supporting
  enums).

### Added — RBAC
- 28 new capabilities (see `docs/RBAC_MATRIX.md`).
- Row-level filter now also gates by `student_id` for `role=student` and
  by `confidential=false` for everyone except `case.confidential_access`
  holders. Confidential message threads follow the same lock.

### Added — Backend modules
- `modules/student/` — self-service `/me`, `/grades`, `/attendance`,
  `/cases`, `/tasks`.
- `modules/messaging/` — threaded conversations with read receipts.
  Sentiment analyzer subscribes to `message.sent` and emits
  `wellness.crisis_detected` on flagged messages.
- `modules/appointments/` — staff availability + slot search
  (`computeAvailableSlots`) + booking with collision check + optional
  Google Calendar push.
- `modules/documents/` — presigned-URL-based upload metadata +
  staff review.
- `modules/wellness/` — PHQ-2 + stress check-in scoring
  (`assessWellness`), crisis-phrase detection, automated handoff
  workflow that opens a confidential case + creates an urgent counselor
  task + opens a confidential message thread; counselor triage queue;
  crisis-resource directory.
- `modules/anonymous-reports/` — public token-based submission, hashed
  claim token, staff triage queue.
- `modules/resources/` — resource library with topic + crisis filters.
- `modules/tutoring/`, `modules/study-groups/`,
  `modules/bookable-resources/`, `modules/courses/`,
  `modules/transcripts/` — full self-service flows for each.
- `jobs/workload-balancer.ts` — 6-hourly snapshot, burnout score 0–100,
  manager-targeted task surfaced when ≥ 70.
- `jobs/ml-export.ts` — weekly anonymized training set for the
  predictive risk model.
- Wired into `jobs/scheduler.ts` and `server.ts`.

### Added — Integrations
- `IClaudeAdapter.analyzeSentiment(text)` — used by the messaging
  sentiment analyzer; mock impl uses keyword heuristics, http impl
  calls the Anthropic API.

### Added — Frontend
- Bifurcated Layout: staff vs `StudentLayout` based on role.
- 13 student pages: Dashboard, Grades, Attendance, Messages,
  Appointments, Documents, Wellness check-in, Tutoring, Study groups,
  Resources, Courses, Transcripts, Book a room.
- 4 new staff pages: Messaging, Wellness queue, Workload, Anonymous
  reports.
- PWA: `manifest.webmanifest` + `sw.js` (stale-while-revalidate for
  most GETs; bypasses auth + messaging + wellness for safety).

### Added — Tests
- `apps/api/src/modules/wellness/scoring.test.ts` — PHQ-2 thresholds,
  clamping, crisis-phrase escalation.

### Added — Seed
- 3 student logins (`student0..2@mcg.example`, password `changeme123`),
  counselor + tutor accounts, 5 resources (incl. two crisis hotlines:
  Talk Suicide Canada, AHS Mental Health Help Line), 6 courses with
  catalog metadata, 6 bookable resources (study rooms + clinical labs
  per campus), one sample study group with member, M/W/F + T/Th staff
  availability windows.
