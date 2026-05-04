# MCG STUDENT SERVICES PORTAL — CLAUDE CODE BUILD PROMPT

> **Paste this entire file into Claude Code as the initial project brief.**
> Treat it as the source of truth. Anything not specified here defaults to the conventions in Section 14 (Engineering Standards).

---

## 0. ROLE & EXECUTION MODE

You are acting as the **Senior Full-Stack Engineer + Architect** for MCG Career College's Student Services Portal. Your job is to scaffold, build, and ship a production-grade event-driven SaaS platform.

**Mode of operation:**
- Build MVP → harden → scale.
- After every major step, output: (a) what you built, (b) what's next, (c) any assumptions you made, (d) any risks/blockers.
- Do NOT ask permission to proceed between sub-steps within a phase. Ask only at phase boundaries (end of Phase 1, end of Phase 2, etc.).
- If a requirement is ambiguous, pick the highest-ROI interpretation, log the assumption in `/docs/ASSUMPTIONS.md`, and proceed.
- Optimize for: clarity > cleverness, modularity > monolith, observability > silent failure.

---

## 1. SYSTEM CONTEXT

**Org:** MCG Career College (parent: family-owned multi-entity edu group). Multi-campus: Calgary, Red Deer, Cold Lake, Edmonton. Sister entities: InFocus Film School, CollegeAdmissions.ca, CGA Medical Imaging.

**Why this exists:** Replace the patchwork of spreadsheets, CampusLogin exports, and manual coordinator follow-ups with a single event-driven system that catches at-risk students earlier, reduces registration-to-start leakage, and gives leadership real-time KPI visibility.

**Primary users (RBAC personas):**
1. **Student Services Rep** — daily operator: handles outreach, intake, surveys, engagement.
2. **Program Coordinator** — owns at-risk cases, interventions, academic decisions.
3. **Manager / Dean of Operations** — escalations, KPI dashboards, cross-campus reporting.
4. **System Admin** — full access, integrations, automation rules editing.
5. **Read-Only Auditor** — compliance / PTIB-style external review.

**Integrations already in our stack (must be hooked or stubbed with adapter pattern):**
- **CampusLogin** (current SIS — students, programs, attendance, grades) — *MCG's current system of record*
- **Salesforce** (planned future SIS + institutional CRM — migration target from CampusLogin)
- **Moodle** (LMS — enrollment + activity)
- **PandaDoc** (signed enrollment / accommodation / re-entry documents)
- **BigBlueButton (BBB)** (live-class attendance — primary attendance source)
- **JustCall** (CTI — calls/SMS logging)
- **Twilio** (programmatic SMS)
- **Google Workspace** (calendar, gmail for staff, docs)
- **Claude API** (Anthropic) — for predictive risk + AI-assisted nudges
- **FAL.ai** — only if visual generation needed (newsletters, etc.)

> **Critical architecture note — SIS abstraction:** MCG is currently on **CampusLogin** but plans to migrate to **Salesforce** as the system of record. The SIS adapter (`ISisAdapter`) MUST be designed so that swapping `CampusLoginAdapter` → `SalesforceAdapter` requires zero changes in calling code. All SIS reads/writes go through the interface. Build `CampusLoginAdapter` for MVP, scaffold `SalesforceAdapter` skeleton, document the field-mapping diff in `/docs/SIS_MIGRATION.md`.

> **Adapter rule:** Every external integration is implemented behind an `IIntegrationAdapter` interface in `/src/integrations/`. Build real **CampusLogin + Moodle + BBB + Twilio + Claude** in MVP; stub the rest (Salesforce, PandaDoc, JustCall, Google Workspace, FAL.ai) with mock adapters returning fixture data, but the calling code must not know the difference.

---

## 2. ARCHITECTURE PRINCIPLES (NON-NEGOTIABLE)

1. **Event-driven core.** Every state change emits a domain event. Workflows subscribe to events. No cron-only triggers in business logic — cron only enqueues events.
2. **Centralized Student Profile Object** as the single aggregate root. All modules read/write through it.
3. **Modular dashboards** sharing a common data layer. Each module is a feature folder, not a separate service.
4. **Real-time flags** computed from a deterministic rules engine (no flag is set by ad-hoc code in 5 places).
5. **Audit everything.** Every write produces an `audit_log` entry. Every external comm produces a `communication_log` entry.
6. **Idempotency.** Every event handler must be safe to re-run.
7. **Multi-campus aware.** `campus_id` is on every queryable entity. RBAC scopes by campus + entity.
8. **PIPEDA / Canadian privacy compliant.** PII fields tagged. Encryption at rest. Soft-delete with retention windows.

---

## 3. TECH STACK (FIXED)

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node.js 20 LTS | TypeScript everywhere, strict mode |
| API | Express 4 + Zod for validation | REST + a few WebSocket channels for live dashboards |
| Frontend | React 18 + Vite + TypeScript | Tailwind + shadcn/ui, dark mode default (matches MCG Exec Dashboard) |
| State (FE) | TanStack Query + Zustand | No Redux |
| DB | PostgreSQL 15 | Hosted on Replit / Neon / Supabase — abstract via DATABASE_URL |
| ORM | Prisma | Migrations checked into `/prisma/migrations` |
| Queue | BullMQ (Redis) | For event bus + scheduled jobs |
| Auth | JWT access + refresh, bcrypt | SSO-ready (OIDC adapter stub for Google Workspace) |
| Real-time | Socket.IO | Dashboard live tiles + alert toasts |
| Tests | Vitest + Supertest + Playwright (E2E smoke) | |
| Observability | pino logger → JSON logs; OpenTelemetry hooks | Sentry-ready |
| Deploy | Replit primary, Docker-ready Dockerfile | `docker-compose.yml` for local dev with Postgres + Redis |

---

## 4. REPO LAYOUT

```
/mcg-student-services/
├── apps/
│   ├── api/                  # Express backend
│   │   ├── src/
│   │   │   ├── modules/      # 1 folder per module (intake, engagement, etc.)
│   │   │   ├── core/         # student profile, events, rbac, audit
│   │   │   ├── integrations/ # adapter pattern
│   │   │   ├── jobs/         # BullMQ workers
│   │   │   ├── http/         # routes, middleware, controllers
│   │   │   └── server.ts
│   │   └── prisma/
│   └── web/                  # React frontend
│       ├── src/
│       │   ├── modules/      # mirrors backend modules
│       │   ├── components/   # shared shadcn-based primitives
│       │   ├── pages/
│       │   ├── lib/          # api client, auth, hooks
│       │   └── main.tsx
├── packages/
│   ├── shared-types/         # Zod schemas + TS types shared FE/BE
│   └── rules-engine/         # risk scoring + engagement scoring (pure functions, fully tested)
├── docs/
│   ├── ARCHITECTURE.md
│   ├── ASSUMPTIONS.md
│   ├── EVENT_CATALOG.md
│   ├── RBAC_MATRIX.md
│   └── INTEGRATIONS.md
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 5. DATA MODEL — STUDENT PROFILE (MASTER RECORD)

**Table: `students` (aggregate root)**

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | Internal |
| `student_external_id` | string unique | SIS ID (CampusLogin currently, Salesforce post-migration) — primary lookup |
| `sis_source` | enum | `campuslogin` / `salesforce` — tracks origin during migration |
| `first_name` | string | PII |
| `last_name` | string | PII |
| `email` | string | PII, unique within campus |
| `phone` | string | PII, E.164 |
| `dob` | date | PII — used to compute `age` |
| `program_id` | uuid FK | |
| `campus_id` | uuid FK | RBAC scope |
| `entity_id` | uuid FK | MCG / InFocus / etc. |
| `intake_date` | date | |
| `expected_graduation_date` | date | |
| `practicum_start_date` | date | nullable |
| `status` | enum | `start`, `stay`, `at_risk`, `withdrawn`, `on_practicum`, `graduated`, `re_entry`, `alumni` |
| `assigned_program_coordinator_id` | uuid FK users | |
| `assigned_student_services_rep_id` | uuid FK users | |
| `created_at`, `updated_at`, `deleted_at` | timestamps | soft delete |

**Computed/Flag Table: `student_flags` (1:1 with student, recomputed on event)**

| Field | Type |
|---|---|
| `student_id` | uuid PK |
| `at_risk_flag` | boolean |
| `re_entry_flag` | boolean |
| `practicum_ready_flag` | boolean |
| `completed_hours_flag` | boolean |
| `orientation_complete_flag` | boolean |
| `risk_score` | int (0–100+) |
| `engagement_score` | int (0–100) |
| `engagement_tier` | enum `high`/`medium`/`low` |
| `last_recomputed_at` | timestamp |

> **Rule:** Flags are NEVER set directly. They are derived by `packages/rules-engine` from raw events/records. A `RecomputeFlagsJob` is enqueued whenever a relevant input changes.

---

## 6. EVENT CATALOG (BUILD INTO `/docs/EVENT_CATALOG.md`)

Every event has: `event_id`, `event_type`, `student_id`, `actor_id` (user or `system`), `payload`, `occurred_at`, `correlation_id`.

**Core domain events (MVP):**
- `student.created`
- `student.status_changed`
- `orientation.attended`
- `orientation.missed`
- `survey.sent`, `survey.submitted`, `survey.reminder_sent`
- `moodle.enrolled`, `moodle.activity_recorded`
- `connect_room.assigned`
- `student_leader.assigned`
- `engagement.event_attended`
- `newsletter.sent`, `newsletter.opened`
- `attendance.recorded`, `attendance.missing`
- `grade.recorded`, `grade.below_threshold`
- `risk.flagged`, `risk.cleared`, `risk.escalated`
- `case.opened`, `case.assigned`, `case.closed`
- `intervention.assigned`, `intervention.completed`
- `class_audit.logged`, `class_audit.resolved`
- `accommodation.requested`, `accommodation.approved`
- `reentry.initiated`, `reentry.weekly_check`
- `withdrawal.initiated`, `withdrawal.confirmed`
- `practicum.started`, `practicum.completed`
- `student.graduated`
- `communication.logged` (email/sms/call/voicemail)

---

## 7. MODULE SPECS

Each module = backend folder under `/apps/api/src/modules/<module>` + frontend folder under `/apps/web/src/modules/<module>` + dedicated dashboard route.

### MODULE 1 — Intake & Onboarding

**Tables:** `orientation_records`, `welcome_communications`, `moodle_enrollment_status`, `post_orientation_surveys`.

**Workflows:**
- `OnStudentCreated` → schedule orientation invite, mark `orientation_complete_flag=false`.
- `OnOrientationAttended` →
  1. Send Welcome Email (template: `welcome_v1`)
  2. Trigger Moodle enrollment (via adapter)
  3. Send Post-Orientation Survey
  4. Set `orientation_complete_flag=true`
- `OnSurveyNotSubmitted +3 days` → Send reminder (max 2 reminders, then flag for human review).

**KPI Outputs:** Onboarding Completion %, Time-to-Onboard (intake_date → orientation_complete_flag=true).

**Dashboard widgets:** funnel (created → orientated → enrolled in Moodle → survey done), time-to-onboard distribution, list of students stuck >7 days at any stage.

---

### MODULE 2 — Engagement

**Tables:** `connect_rooms`, `connect_room_assignments`, `student_leader_assignments`, `event_participation`, `newsletter_deliveries`.

**Timeline Engine:**
| Trigger | Action |
|---|---|
| Intake Date (Week 0) | Send "Intro to Student Services" |
| +7 days | Assign Connect Room + 2 Student Leaders + log Enriched Academy training |
| +30 days | "Stay Email" + Newsletter #1 + log engagement events |
| +60 days | Newsletter #2 |
| +90 days | Newsletter #3 |

> Implement as a `ScheduledTimelineService` driven by `intake_date`. Idempotent: if a step has been executed, skip (track in `student_timeline_progress` table).

**Engagement Score Formula** (configurable, store weights in `engagement_score_config` table):
```
score = 0.30*event_attendance_pct
      + 0.25*newsletter_open_rate
      + 0.25*connect_room_activity_score
      + 0.20*outreach_response_rate
```
Tier thresholds: High ≥ 70, Medium 40–69, Low < 40. (All thresholds configurable.)

**Recompute trigger:** any event that changes inputs.

---

### MODULE 3 — Early Alert & Risk

**Tables:** `early_alerts`, `attendance_records` (sources: BBB, manual), `grade_records`, `withdrawal_records`, `risk_assessments` (history of score over time — needed for trend lines).

**Risk Rules (config-driven, in DB so non-devs can tune):**

| Condition | Default Weight |
|---|---|
| Grade below passing threshold | +40 |
| Missing grades > N days overdue | +20 |
| Attendance < threshold % | +25 |
| No attendance recorded (BBB + manual missing) | +15 |
| ESL / computer-skills score below threshold | +10 |
| Age ≥ 65 | +10 |
| Withdrawal initiated | +50 (auto-flag regardless of total) |

**Auto-flag rule:** `at_risk_flag = TRUE` if **any single hard condition met** OR **score ≥ 50** (configurable).

**Automations:**
- On flag → open Case, notify assigned Program Coordinator (in-app + email), assign default Intervention Task (template by reason).
- **Escalation:** if Case has no `case.action_logged` event within 5 business days → `risk.escalated` → notify Manager.

**Outputs:** at-risk list (filterable by campus/program/reason), risk severity heatmap, intervention status tracker, **historical risk trend per student** (chart).

---

### MODULE 4 — Academic Support

**Tables:** `interventions`, `class_audits`, `accommodation_requests`, `reentry_plans`, `reentry_weekly_checks`.

**Workflows:**
1. **Class Audit Workflow** — weekly cron enqueues `class_audit.due` event per active class. Coordinator logs issues → resolution owner assigned → SLA timer.
2. **Intervention Workflow** — triggered by `risk.flagged`. Type auto-assigned by primary risk reason: `academic` / `attendance` / `personal`. Each intervention type has a default playbook (markdown template stored in `intervention_playbooks` table — editable by admins).
3. **Re-entry Workflow** — triggered when `re_entry_flag=TRUE` (status moves back from `withdrawn` to active). Auto-creates a 4-week support plan with weekly check-ins.

**Outputs:** Intervention Success Rate (% of interventions where student moved out of `at_risk` within 30 days), Re-entry Retention Rate (% of re-entry students still active at 90 days).

---

### MODULE 5 — Practicum

> Note: Per the architecture doc this module is named but not specified in detail. Per existing approved spec ("Career Services / Practicum Tracker — Claude Code build"), this module should integrate with that spec's data model. **Action for Claude Code:** scaffold the module skeleton (routes, tables `practicum_placements`, `practicum_hours_logs`, `practicum_supervisors`, `practicum_evaluations`), wire `practicum_ready_flag` and `completed_hours_flag` computation, and emit an `INTEGRATION_TODO` doc in `/docs/PRACTICUM_INTEGRATION.md` listing the merge points with the standalone tracker. Do NOT duplicate logic if the existing tracker will own it.

**Minimum viable wiring:**
- `practicum_ready_flag = TRUE` when: completed_hours_flag=TRUE AND status not in (at_risk, withdrawn) AND no open critical case.
- `student.status` flips to `on_practicum` when first placement starts.

---

### MODULE 6 — Data & Reporting

**Tables:** read-only views (`vw_kpi_*`) over operational tables — never write.

**Dashboards:**
1. **KPI Dashboard** — 90-Day Retention, Graduation Rate, Avg Engagement Score, At-Risk %, Time-to-Onboard avg. Filter by campus / program / cohort / date range.
2. **Operational Dashboard** — Open Cases, Avg Response Time, Intervention Load by staff, escalations this week.
3. **Survey Dashboard** — Orientation feedback NPS, Exit Survey breakdown, Satisfaction Scores trend.
4. **Engagement Analytics** — Event participation heatmap (by week × cohort), Connect Room activity, Communication channel performance (open/reply rates by channel).

**Export:** every dashboard supports CSV + PDF export (use `pdfkit` or Playwright print). PDF must include MCG header, generated-by, generated-at, filter criteria.

---

## 8. CROSS-MODULE AUTOMATION RULES

Implement as **central rules in `/apps/api/src/core/cross-module-rules.ts`**, subscribed to relevant events:

1. **Status Sync**
   - `student.status_changed → withdrawn` → disable engagement + practicum workflows for that student (set `workflows_paused=true`).
   - `student.status_changed → graduated` → migrate to `alumni` (separate retention policy).

2. **Communication Logging (UNIVERSAL)**
   - Every email send (via SMTP / SendGrid adapter) → `communication.logged`.
   - Every SMS (Twilio/JustCall) → `communication.logged`.
   - Every call (JustCall webhook) → `communication.logged`.
   - Every voicemail → `communication.logged` with audio URL ref.
   - Schema: `communications` table with `direction`, `channel`, `from`, `to`, `subject`, `body_or_summary`, `external_id`, `student_id`, `actor_id`, `occurred_at`.

3. **Task Management (UNIVERSAL)**
   - Every workflow trigger that requires human action emits `task.created` → `tasks` table (assigned_owner, due_date, priority, source_event_id, status).
   - Tasks surface in user's "My Queue" on every dashboard.

---

## 9. RBAC MATRIX (BUILD `/docs/RBAC_MATRIX.md`)

| Capability | Student Services Rep | Program Coordinator | Manager | System Admin | Auditor |
|---|---|---|---|---|---|
| View students (own campus) | ✅ | ✅ | ✅ all campuses | ✅ all | ✅ all (read) |
| Edit student profile | ✅ | ✅ | ✅ | ✅ | ❌ |
| Open / close cases | ✅ | ✅ | ✅ | ✅ | ❌ |
| Run interventions | ❌ | ✅ | ✅ | ✅ | ❌ |
| View KPI dashboards | Limited (own campus) | Limited (own program) | ✅ all | ✅ all | ✅ |
| Edit automation rules / weights | ❌ | ❌ | ❌ | ✅ | ❌ |
| Export reports | ✅ (own scope) | ✅ (own scope) | ✅ | ✅ | ✅ |
| View audit log | ❌ | ❌ | ✅ | ✅ | ✅ |

Enforce in middleware (`requirePermission('case.close', { campus, program })`) AND in DB row-level (campus filter automatically applied to queries via Prisma middleware).

---

## 10. UI / UX REQUIREMENTS

- **Design language:** dark-mode-first bento grid (matches MCG Executive Dashboard). Use existing MCG color tokens if available; otherwise: bg `#0A0A0B`, surface `#141416`, accent `#3B82F6`, success `#10B981`, warn `#F59E0B`, danger `#EF4444`.
- **RAG status pills** on every student row (at-risk = red, watch = amber, healthy = green).
- Every list view: server-side pagination, column filters, saved views, CSV export.
- Every dashboard tile: live-update via Socket.IO, click to drill into source list, export button.
- **Mock/Live toggle** in admin settings (when "mock" is on, integrations return fixture data — useful for demos).
- Loading states: skeleton, never spinners on >300ms ops.
- Empty states: helpful — "No at-risk students this week 🎉" + relevant link.

---

## 11. AI / PREDICTIVE LAYER (Phase 2 — scaffold in Phase 1)

1. **Predictive Risk Model** — Phase 1: build the data export job (`exports/risk_training_set.csv` weekly) with anonymized historical features. Phase 2: train + deploy. Phase 1 feature: a Claude API call (`claude-opus-4-7`) that takes a student's flag + last 90-day event timeline and returns a JSON `{predicted_risk: 0-1, top_factors: [...], recommended_action: "..."}`. Cache 24h.

2. **AI Nudge Generator** — for any pending outreach task, "Suggest message" button calls Claude API, returns a draft personalized message in the staff member's voice. Store as draft, never auto-send.

3. **Engagement Heatmap** — D3 / Recharts visualization, program × week, color-coded by avg engagement score.

> All AI calls go through a single `aiService` with: prompt versioning, response caching, cost logging, and a kill-switch.

---

## 12. INTEGRATIONS — DETAIL

For each integration, build:
- `interface I<Name>Adapter`
- `<Name>HttpAdapter` (real)
- `<Name>MockAdapter` (fixtures)
- Selected by env var `<NAME>_ADAPTER=http|mock`
- All adapters expose health-check endpoint surfaced in `/admin/health`.

**MVP real adapters:** CampusLogin (students, attendance, grades sync — pull every 15min via job), Moodle (enroll + activity pull), BBB (attendance webhooks + meeting recordings ref), Twilio (send SMS + delivery webhook), Claude API.

**Stubbed for MVP:** Salesforce (skeleton only — see SIS migration note in Section 1), JustCall, PandaDoc, Google Workspace, FAL.ai. Build the interface; ship mock; document the real-integration TODO in `/docs/INTEGRATIONS.md` with API doc links and required scopes.

---

## 13. PHASED BUILD PLAN — EXECUTE IN THIS ORDER

### **PHASE 0 — Bootstrap (output before any code: `/docs/ARCHITECTURE.md` + `README.md`)**
- Confirm assumptions back to me in `/docs/ASSUMPTIONS.md` before writing code.
- Init monorepo (pnpm workspaces or npm workspaces — pnpm preferred).
- Wire ESLint + Prettier + Husky pre-commit + commitlint (Conventional Commits).
- `docker-compose.yml` with Postgres + Redis.
- `.env.example` complete.

### **PHASE 1 — Core (Student + Events + RBAC + Audit)**
- Prisma schema for students, users, roles, campuses, entities, audit_log, communications, tasks, events.
- Seed script: 3 campuses, 5 users (1 per role), 50 demo students across statuses.
- Event bus (BullMQ) + base event class + `EventStore` table for replay.
- RBAC middleware + Prisma row-level filter middleware.
- Audit log middleware (auto-log every write).
- Auth (JWT + refresh).
- Health check endpoints.
- 80%+ unit test coverage on `core/`.

### **PHASE 2 — Module 1 (Intake & Onboarding) end-to-end**
- Backend: tables, workflows, CampusLogin + Moodle adapters (real), email adapter (Nodemailer with SMTP env vars).
- Frontend: dashboard + student detail panel + manual orientation marking + survey link generator.
- Smoke E2E test.

### **PHASE 3 — Module 2 (Engagement) end-to-end**
- Timeline scheduler service.
- Engagement score rules engine (in `packages/rules-engine`).
- Newsletter delivery + open tracking (pixel).
- Frontend dashboard with score distribution + tier filters.

### **PHASE 4 — Module 3 (Early Alert & Risk) end-to-end**
- Risk rules engine (`packages/rules-engine`).
- Case + intervention models + escalation timer.
- At-risk dashboard with severity heatmap + historical trend chart.

### **PHASE 5 — Module 4 (Academic Support) end-to-end**
- Interventions, class audits, accommodations, re-entry workflows.
- Intervention success rate + re-entry retention KPIs.

### **PHASE 6 — Module 5 (Practicum scaffold)**
- Tables + flag computation + status transitions + integration doc.

### **PHASE 7 — Module 6 (Data & Reporting)**
- KPI views + 4 dashboards + CSV/PDF export.

### **PHASE 8 — AI Layer**
- Claude API risk-summary endpoint + nudge-draft endpoint.
- Engagement heatmap.

### **PHASE 9 — Hardening**
- Load test (k6) — target 500 concurrent users.
- Pen-test checklist (OWASP top 10).
- Backup + restore runbook.
- Deployment runbook (Replit + Docker alt).

---

## 14. ENGINEERING STANDARDS

- **TypeScript strict.** No `any` without `// eslint-disable-next-line` + comment.
- **No silent catches.** Every catch logs with `pino` + correlation_id.
- **Validation at the edge.** Zod on every request body / query / params.
- **Idempotency keys** on every write endpoint that may be retried.
- **Migrations forward-only.** Never edit a shipped migration.
- **Secrets via env only.** Never hardcoded. `.env.example` enumerates every required key.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`). One logical change per commit.
- **PR-style summaries** at end of each phase: what changed, why, how to test.
- **Testing:** unit for rules-engine + core, integration for module workflows, E2E smoke per module.
- **Naming:** snake_case in DB, camelCase in TS, PascalCase for types/classes.

---

## 15. ACCEPTANCE CRITERIA (MVP = Phase 0–4 + 7)

The MVP is shippable when:
1. A new student created via API or seed triggers the full onboarding workflow with email + Moodle + survey.
2. Manually marking orientation attended advances the workflow correctly.
3. A grade < threshold inserted via CampusLogin adapter triggers `risk.flagged`, opens a case, notifies the Program Coordinator, and creates an intervention task — all visible on the at-risk dashboard within 30 seconds.
4. No coordinator action in 5 business days → escalation event fires (test with a clock-skip helper).
5. Engagement score recomputes when a newsletter is opened or an event is logged.
6. KPI dashboard shows accurate 90-day retention and at-risk % filterable by campus.
7. Withdrawing a student pauses engagement workflows and marks status correctly.
8. Audit log shows every state change with actor + timestamp.
9. RBAC: Rep cannot see another campus's students; Auditor cannot edit anything; Admin can edit risk weights.
10. All MVP unit tests + at least one E2E smoke per module pass in CI.

---

## 16. DELIVERABLES PER PHASE

End of every phase, output:
1. **What shipped** (bullets).
2. **How to run / test it** (exact commands).
3. **Demo script** (5-step click-through a non-dev can follow).
4. **Known gaps + next phase preview**.
5. **Updated `/docs/CHANGELOG.md`**.

---

## 17. KICKOFF — START HERE

Begin with **Phase 0**. Specifically:

1. Create the repo structure from Section 4.
2. Generate `/docs/ARCHITECTURE.md` (a 1–2 page summary of this prompt, in your words).
3. Generate `/docs/ASSUMPTIONS.md` listing every assumption you're making (timezone = America/Edmonton, default passing grade = 70%, default attendance threshold = 80%, etc.).
4. Generate `/docs/EVENT_CATALOG.md` from Section 6.
5. Generate `/docs/RBAC_MATRIX.md` from Section 9.
6. Generate `/docs/SIS_MIGRATION.md` documenting CampusLogin → Salesforce field mapping plan and the `ISisAdapter` interface contract.
7. Init pnpm workspace + Docker Compose + `.env.example` + Prisma init.
8. Output the Phase 0 deliverables block (Section 16).
9. **STOP** and wait for go-ahead before Phase 1.

Begin now.
