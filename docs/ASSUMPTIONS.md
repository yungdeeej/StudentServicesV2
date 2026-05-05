# Assumptions Log

> Append-only. Every ambiguity in the README that we resolved by judgement
> lives here so reviewers can disagree later. Format: ID · scope ·
> assumption · rationale.

## A. Time, locale, formatting

- **A-001 · Timezone.** All scheduling, "+7 days" timeline math, and
  business-day calculations use **`America/Edmonton`** (matches MCG HQ
  region and covers all four campuses, which are all on Mountain Time).
- **A-002 · Business days.** Mon–Fri, observing **Alberta statutory
  holidays**. Source list will be a static config seed (`config/holidays.ts`)
  refreshed yearly.
- **A-003 · Locale.** `en-CA` for date formatting, currency in CAD where
  applicable.

## B. Academic thresholds (configurable; these are the seeded defaults)

- **B-001 · Passing grade.** Default **70 %**. Stored in
  `risk_rule_config` so non-devs can tune per program.
- **B-002 · Attendance threshold.** Default **80 %** of recorded sessions in
  the rolling 30-day window.
- **B-003 · Missing-grade overdue window.** **N = 7 days** past the
  expected entry date.
- **B-004 · ESL / computer-skills threshold.** Default **60 %** on the
  intake assessment.
- **B-005 · "Older learner" rule.** Age **≥ 65** triggers the +10 risk
  weight per README §7 Module 3.
- **B-006 · Auto-flag rule.** `at_risk_flag = TRUE` if any single hard
  condition is met OR cumulative `risk_score ≥ 50`. Hard conditions:
  withdrawal initiated, grade below threshold (after grace), attendance
  below threshold.

## C. Engagement scoring

- **C-001 · Default weights** match README §7 Module 2 verbatim
  (0.30 / 0.25 / 0.25 / 0.20).
- **C-002 · Tier thresholds.** High ≥ 70, Medium 40–69, Low < 40.
- **C-003 · Newsletter open** is counted via 1×1 tracking-pixel hit. One
  open per delivery max. Pixel served from API host, no third-party tracker.
- **C-004 · "Connect room activity score"** is `messages_posted_30d +
  reactions_30d` normalized to 0–100 against the cohort's 90th percentile.

## D. Workflow timing

- **D-001 · Survey reminders.** Sent at +3 days and +7 days after the
  initial send; after the second reminder a `task.created` is raised for
  human follow-up.
- **D-002 · Escalation timer.** 5 **business** days (per A-002) of no
  `case.action_logged` event triggers `risk.escalated`.
- **D-003 · Re-entry plan length.** 4 weeks, with a `reentry.weekly_check`
  event every 7 calendar days.
- **D-004 · Timeline idempotency.** A row in `student_timeline_progress`
  with `completed_at NOT NULL` short-circuits a re-execution.

## E. Identity, auth, RBAC

- **E-001 · JWT.** Access token TTL **15 min**, refresh TTL **30 days**,
  rotation on use.
- **E-002 · Password hashing.** bcrypt cost **12**.
- **E-003 · SSO.** OIDC adapter scaffolded for Google Workspace; full SSO
  is Phase 9.
- **E-004 · Email uniqueness.** Unique **per campus**, not globally — a
  shared family email may be reused across campuses (PII rule from §5).

## F. Data & retention

- **F-001 · Soft delete.** `deleted_at` on every PII-bearing table; hard
  purge job runs at retention horizon (default 7 years for academic
  records, configurable per entity).
- **F-002 · Encryption at rest.** Provided by hosted Postgres
  (Replit/Neon/Supabase). PII columns additionally tagged with a `@pii`
  comment for downstream tooling.
- **F-003 · Audit immutability.** `audit_log` is append-only at the
  application layer; no DELETE statements are emitted by any service.

## G. Integrations

- **G-001 · CampusLogin pull cadence.** Every **15 min** for students,
  attendance, grades. Webhook support unknown — assume polling, switch to
  push if the vendor enables it.
- **G-002 · BBB attendance** is the **primary** attendance source;
  manually-entered attendance is a fallback and tagged `source='manual'`.
- **G-003 · Twilio + JustCall.** Twilio handles programmatic SMS;
  JustCall is logging only in MVP (CTI events). Both surface as
  `communication.logged`.
- **G-004 · Claude API model.** `claude-opus-4-7` for risk summaries and
  nudge drafts (per README §11). 24 h response cache.
- **G-005 · Mock-mode default.** `*_ADAPTER=mock` for everything outside
  CampusLogin / Moodle / BBB / Twilio / Claude during local dev.

## H. UX / UI

- **H-001 · Default theme.** Dark, matching the MCG Executive Dashboard
  palette in README §10. Light mode is a Phase 9 nice-to-have.
- **H-002 · Pagination.** 25 rows per page server-side default; user can
  raise to 100.
- **H-003 · Saved views.** Stored per-user in `saved_views` table, scoped
  to module + dashboard.

## I. Build & ops

- **I-001 · Package manager.** **pnpm** (workspace) — README §13 names it
  as preferred.
- **I-002 · Node version.** **20 LTS** (`.nvmrc` pinned to `20`).
- **I-003 · Conventional Commits** enforced via commitlint.
- **I-004 · Migration policy.** Forward-only. A reverted change is a new
  migration, never an edit to a shipped one.

## J. Open questions (resolve at phase boundaries)

- **J-001** Does CampusLogin expose webhooks? If yes, drop polling.
- **J-002** Final Salesforce object model for students — confirm with
  MCG IT before Phase 6 wiring.
- **J-003** Practicum tracker ownership boundary — confirm against the
  standalone "Career Services / Practicum Tracker" spec referenced in
  README §7 Module 5 before Phase 6.
- **J-004** Confirm the legal retention horizon per province (PTIB vs.
  CARI vs. interprovincial agreements).
