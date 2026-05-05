# MCG Student Services Portal — Architecture

> 1–2 page architecture summary. Full requirements live in the root `README.md`.

## Purpose

Replace MCG Career College's spreadsheet-and-email patchwork with a single
event-driven SaaS that surfaces at-risk students earlier, reduces
registration-to-start leakage, and gives leadership real-time KPI visibility
across campuses (Calgary, Red Deer, Cold Lake, Edmonton) and sister entities
(InFocus Film School, CollegeAdmissions.ca, CGA Medical Imaging).

## Shape of the System

The portal is a TypeScript monorepo with two deployables (`apps/api`,
`apps/web`) and two shared libraries (`packages/shared-types`,
`packages/rules-engine`). The API is event-driven: every state change emits a
domain event onto a BullMQ-backed bus, every workflow subscribes to events,
and cron jobs do nothing but enqueue events. The frontend is a React + Vite
app that talks to the API over REST plus a small set of Socket.IO channels
for live dashboard tiles.

```
React (Vite, TanStack Query, Zustand, shadcn/ui)
        │  REST + WebSocket (Socket.IO)
        ▼
Express API ── Zod validation ── RBAC middleware ── Audit middleware
        │
        ├── Modules (intake, engagement, risk, support, practicum, reporting)
        ├── Core (StudentProfile aggregate, EventBus, RBAC, AuditLog)
        ├── Integrations (ISisAdapter, IMoodleAdapter, IBbbAdapter, …)
        └── Jobs (BullMQ workers + scheduled timeline)
        │
        ├── PostgreSQL (Prisma) — system of record for app data
        └── Redis — BullMQ queues + cache
```

## Core Concepts

- **Student Profile aggregate.** `students` is the single aggregate root.
  Every module reads and writes through it; ad-hoc joins from feature code
  are forbidden.
- **Derived flags.** `student_flags` (at-risk, re-entry, practicum-ready,
  engagement tier, risk score, …) are never set directly. They are produced
  by the pure functions in `packages/rules-engine` and recomputed by a
  `RecomputeFlagsJob` whenever a relevant input event lands.
- **Events as the spine.** Every domain transition (`student.created`,
  `risk.flagged`, `case.opened`, …) emits an event with `event_id`,
  `event_type`, `student_id`, `actor_id`, `payload`, `occurred_at`,
  `correlation_id`. Events are persisted in `event_store` to allow replay.
- **Adapters for everything external.** `ISisAdapter`, `IMoodleAdapter`,
  `IBbbAdapter`, `ITwilioAdapter`, `IClaudeAdapter`, `IPandaDocAdapter`,
  `IJustCallAdapter`, `IGoogleAdapter`, `IFalAdapter`. Each has an `Http`
  implementation and a `Mock` implementation; the active one is chosen by
  env var.
- **SIS abstraction is load-bearing.** MCG runs CampusLogin today and is
  migrating to Salesforce. `CampusLoginAdapter` ships in MVP; the
  Salesforce adapter is scaffolded behind the same interface so the swap is
  an env-var change. Field mapping is documented in `SIS_MIGRATION.md`.
- **Multi-tenant by campus.** `campus_id` is on every queryable entity.
  Prisma middleware applies row-level filters so a Calgary rep cannot see a
  Red Deer student even by guessing IDs.
- **Audit + comms are universal.** Every write produces an `audit_log`
  entry; every external comm (email, SMS, call, voicemail) produces a
  `communications` entry — regardless of which module sent it.

## Tech Stack (fixed by README §3)

Node 20 LTS · TypeScript strict · Express 4 · Zod · Prisma · PostgreSQL 15 ·
BullMQ + Redis · Socket.IO · JWT (access + refresh) · React 18 + Vite ·
Tailwind + shadcn/ui · TanStack Query + Zustand · Vitest + Supertest +
Playwright · pino + OpenTelemetry · Replit primary, Docker fallback.

## Module Map

| # | Module             | Owns                                                |
|---|--------------------|------------------------------------------------------|
| 1 | Intake & Onboarding| Orientation, welcome comms, Moodle enrollment, surveys |
| 2 | Engagement         | Timeline scheduler, Connect Rooms, newsletters, score  |
| 3 | Early Alert & Risk | Risk rules, cases, escalations, history                |
| 4 | Academic Support   | Interventions, class audits, accommodations, re-entry  |
| 5 | Practicum          | Placements, hours, supervisors, evaluations (skeleton) |
| 6 | Data & Reporting   | KPI / Operational / Survey / Engagement dashboards     |

Each module has matching `apps/api/src/modules/<name>` and
`apps/web/src/modules/<name>` folders plus a dedicated dashboard route.

## Cross-Module Rules (`apps/api/src/core/cross-module-rules.ts`)

- Status sync: `withdrawn` pauses engagement + practicum workflows;
  `graduated` migrates the student to the alumni retention policy.
- Universal comms logging: every email/SMS/call/voicemail emits
  `communication.logged` and lands in the `communications` table.
- Universal task management: every workflow action that needs a human emits
  `task.created` and surfaces in that user's "My Queue".

## Non-Functional Posture

Idempotent handlers · forward-only migrations · secrets via env only ·
PIPEDA-aware PII tagging + soft delete · structured pino logs with
correlation IDs · OpenTelemetry hooks · k6 load target 500 concurrent users
in the Phase 9 hardening pass.

## Build Plan

Phase 0 bootstrap (this commit) → Phase 1 core (students, events, RBAC,
audit) → Phases 2–6 modules end-to-end → Phase 7 reporting → Phase 8 AI
layer → Phase 9 hardening. MVP is Phases 0–4 plus 7 per README §15.

## Student-facing portal layer (added beyond the original brief)

Students are now first-class auth principals: `User.role = 'student'`
with a `student_id` FK linking to the `Student` aggregate. Everything
they touch goes through the same Prisma row-level filter, which clamps
queries to their own row. Two extra staff roles were added: `counselor`
(wellness triage + confidential cases) and `tutor` (peer or staff
tutoring). The `Case.confidential` flag lets the row-level filter hide
sensitive wellness cases from the rest of the staff body.

New backend modules: `student/` (self-service `/me`, grades, attendance,
cases, tasks), `messaging/` (threaded conversations + read receipts +
sentiment analysis), `appointments/` (staff availability + slot search +
booking with collision detection + Google Calendar push),
`documents/` (presigned-URL upload metadata + staff review),
`wellness/` (PHQ-2 + stress check-in with crisis-phrase detection,
counselor triage queue, crisis hotline directory, automated
confidential-case handoff workflow), `anonymous-reports/` (public
token-based submission for harassment/safety/mental-health reports +
staff triage), `resources/` (resource library), `tutoring/`,
`study-groups/`, `bookable-resources/` (rooms/labs), `courses/`
(catalog + prerequisites + self-enrollment), `transcripts/` (PandaDoc
release-form workflow). Cross-cutting: a 6-hourly workload-balancer
job that scores each staff member 0–100 on burnout and a weekly
ML-training-set export feeding the predictive risk model.

Frontend: a separate student layout + 13 student-facing pages (Home,
Grades, Attendance, Courses, Transcripts, Messages, Appointments,
Wellness check-in, Tutoring, Documents, Study groups, Book a room,
Resources). The shell is dark-mode-first and ships as a PWA with a
service worker that caches the app shell while explicitly bypassing
sensitive endpoints (auth, messaging, wellness).
