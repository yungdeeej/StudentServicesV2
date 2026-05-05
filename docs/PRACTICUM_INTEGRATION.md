# Practicum Tracker — Integration TODO

> Per README §7 Module 5, this module is a scaffold. The standalone "Career
> Services / Practicum Tracker" spec is the system of record for placement
> logic. This portal owns flag computation and status transitions; the
> standalone tracker owns hour logging, evaluations, and supervisor
> management once it ships.

## What ships in this portal (this commit)

- Tables: `practicum_placements`, `practicum_supervisors`,
  `practicum_hours_logs`, `practicum_evaluations` — minimal columns for
  flag computation.
- Workflows: `PracticumStarted` → flips `student.status` to `on_practicum`.
- `recomputePracticumFlags(student_id)` — sets `completed_hours_flag` and
  `practicum_ready_flag` per the README rule (`completed_hours_flag &&
  status not in (at_risk, withdrawn) && no open critical case`).
- Routes for create-placement, log-hours, complete-placement (mounted at
  `/api/v1/practicum`).

## Merge points with the standalone tracker

When the tracker arrives, decide per-table:

| Table                    | Owner |
|--------------------------|-------|
| practicum_placements     | tracker — portal reads via shared DB or webhook |
| practicum_hours_logs     | tracker (gradebook integrates here) |
| practicum_supervisors    | tracker |
| practicum_evaluations    | tracker |

The portal continues to own:
- `student_flags.practicum_ready_flag`
- `student_flags.completed_hours_flag`
- `student.status` transitions to/from `on_practicum`

## Required signal

The tracker must publish (webhook or domain event) at least:
- `practicum.placement_started`
- `practicum.hours_logged`
- `practicum.evaluation_recorded`
- `practicum.placement_completed`

…all carrying `{ student_external_id, placement_id, ... }`. The portal
event handler will translate these into the existing `practicum.started`
and `practicum.completed` events.

## Open questions

- Will the tracker write directly to the portal DB or via API only?
- Does the tracker handle re-placement after a failed placement?
- Hour-target per program — owned in the tracker or in
  `programs.practicum_hours_target`?
