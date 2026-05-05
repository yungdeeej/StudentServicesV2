# Event Catalog

> Generated from README §6. Single source of truth for the event bus.
> Every event MUST conform to the envelope below. New events are appended
> here BEFORE code is shipped.

## Envelope (non-negotiable)

```ts
type DomainEvent<T = unknown> = {
  event_id: string;        // uuid v4
  event_type: string;      // dotted namespace, e.g. "risk.flagged"
  student_id: string | null; // null only for non-student events (e.g. system.*)
  actor_id: string;        // uuid of user OR the literal string "system"
  payload: T;              // typed per event below
  occurred_at: string;     // ISO-8601 UTC
  correlation_id: string;  // ties an entire workflow run together
};
```

Persistence rules:

- Every event lands in `event_store` (immutable, append-only).
- Handlers are idempotent — re-running on the same `event_id` MUST be a
  no-op.
- Handlers run inside a BullMQ worker; failures retry with exponential
  backoff (default 5 attempts).

## Lifecycle

| Phase            | Events                                                  |
|------------------|----------------------------------------------------------|
| Onboarding       | `student.created`, `orientation.attended`, `orientation.missed`, `survey.sent`, `survey.submitted`, `survey.reminder_sent`, `moodle.enrolled` |
| Engagement       | `connect_room.assigned`, `student_leader.assigned`, `engagement.event_attended`, `newsletter.sent`, `newsletter.opened`, `moodle.activity_recorded` |
| Academic signal  | `attendance.recorded`, `attendance.missing`, `grade.recorded`, `grade.below_threshold` |
| Risk             | `risk.flagged`, `risk.cleared`, `risk.escalated`         |
| Casework         | `case.opened`, `case.assigned`, `case.closed`, `intervention.assigned`, `intervention.completed`, `class_audit.logged`, `class_audit.resolved`, `accommodation.requested`, `accommodation.approved` |
| Re-entry & exit  | `reentry.initiated`, `reentry.weekly_check`, `withdrawal.initiated`, `withdrawal.confirmed` |
| Practicum        | `practicum.started`, `practicum.completed`               |
| Status           | `student.status_changed`, `student.graduated`            |
| Comms (universal)| `communication.logged`                                   |

## Event detail

### `student.created`
- Emitted by: SIS sync job when a new external_id appears, or POST `/students`.
- Payload: `{ student_external_id, sis_source, campus_id, entity_id, program_id, intake_date }`
- Triggers: `OnStudentCreated` workflow (schedule orientation invite, set `orientation_complete_flag=false`).

### `student.status_changed`
- Emitted by: status mutation in `students.status`.
- Payload: `{ from, to, reason? }`
- Cross-rule: `→ withdrawn` pauses engagement + practicum workflows;
  `→ graduated` migrates to alumni retention.

### `orientation.attended` / `orientation.missed`
- Payload: `{ orientation_id, attended_at? }`
- `attended` triggers welcome email, Moodle enrollment, post-orientation survey, sets `orientation_complete_flag=true`.

### `survey.sent` / `survey.submitted` / `survey.reminder_sent`
- Payload: `{ survey_id, template, channel }` plus `submitted_at` or `reminder_n`.
- After 2 reminders unsubmitted, `task.created` is raised for human follow-up.

### `moodle.enrolled` / `moodle.activity_recorded`
- Payload: `{ course_id, enrolled_at }` or `{ course_id, activity_type, recorded_at }`.

### `connect_room.assigned` / `student_leader.assigned`
- Payload: `{ connect_room_id }` or `{ leader_user_ids: string[] }`.

### `engagement.event_attended`
- Payload: `{ event_id, event_type, attended_at }`.
- Recompute trigger: engagement score.

### `newsletter.sent` / `newsletter.opened`
- Payload: `{ delivery_id, newsletter_id, sent_at }` / `{ delivery_id, opened_at }`.
- `opened` recomputes engagement score.

### `attendance.recorded` / `attendance.missing`
- Payload: `{ source: 'bbb' | 'manual', session_id, recorded_at, present }`.
- `missing` raised by the daily reconciliation job when neither BBB nor manual recorded.

### `grade.recorded` / `grade.below_threshold`
- Payload: `{ course_id, assessment_id, value, threshold }`.
- `below_threshold` adds risk weight per `risk_rule_config`.

### `risk.flagged` / `risk.cleared` / `risk.escalated`
- Payload: `{ risk_score, top_factors: string[], rule_versions: string[] }`.
- `flagged` opens a case + assigns default intervention by reason.
- `escalated` fires when no `case.action_logged` event in 5 business days.

### `case.opened` / `case.assigned` / `case.closed`
- Payload: `{ case_id, reason }`, `{ case_id, assignee_user_id }`, `{ case_id, resolution }`.

### `intervention.assigned` / `intervention.completed`
- Payload: `{ intervention_id, type, playbook_id }`, `{ intervention_id, outcome }`.

### `class_audit.logged` / `class_audit.resolved`
- Payload: `{ audit_id, class_id, issues: string[] }` / `{ audit_id, resolved_by, resolution }`.

### `accommodation.requested` / `accommodation.approved`
- Payload: `{ accommodation_id, type }`, `{ accommodation_id, approved_by }`.

### `reentry.initiated` / `reentry.weekly_check`
- Payload: `{ reentry_plan_id }` / `{ reentry_plan_id, week_n, summary }`.

### `withdrawal.initiated` / `withdrawal.confirmed`
- Payload: `{ reason, requested_by }` / `{ effective_date }`.
- `initiated` adds +50 to risk score (auto-flag) per README §7 Module 3.

### `practicum.started` / `practicum.completed`
- Payload: `{ placement_id, started_at }` / `{ placement_id, completed_at, hours_total }`.
- `started` flips `student.status` to `on_practicum`.

### `student.graduated`
- Payload: `{ graduation_date }`.
- Triggers alumni migration.

### `communication.logged`
- Payload: `{ direction: 'in' | 'out', channel: 'email' | 'sms' | 'call' | 'voicemail', from, to, subject?, body_or_summary, external_id?, attachments_url? }`.
- Universal — every adapter that sends or receives a message MUST emit it.

## Adding a new event

1. Append a row above with envelope + payload schema.
2. Add the Zod schema in `packages/shared-types`.
3. Add a typed handler signature in `apps/api/src/core/events/index.ts`.
4. Open a PR titled `feat(events): add <event_type>`.
