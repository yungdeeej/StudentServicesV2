# RBAC Matrix

> Mirror of README §9 with implementation notes. Authoritative permission
> table for the codebase.

## Personas

1. **Student Services Rep** (`role:rep`) — daily operator: outreach,
   intake, surveys, engagement.
2. **Program Coordinator** (`role:coordinator`) — owns at-risk cases,
   interventions, academic decisions.
3. **Manager / Dean of Operations** (`role:manager`) — escalations,
   cross-campus KPI dashboards.
4. **System Admin** (`role:admin`) — full access, integrations, automation
   rule editing.
5. **Read-Only Auditor** (`role:auditor`) — compliance / PTIB-style review.
6. **Counselor** (`role:counselor`) — wellness triage, confidential cases,
   counseling appointments. Confidential cases (`Case.confidential = true`)
   are visible ONLY to counselors and admins; even managers are denied by
   the row-level filter unless they hold `case.confidential_access`.
7. **Tutor** (`role:tutor`) — staff or peer tutor, sees only assigned
   tutoring requests/sessions. Peer tutors are also students; the
   `is_peer_tutor` flag on `User` plus `tutoring_subjects` controls which
   subjects they can be matched on.
8. **Student** (`role:student`) — first-class auth principal linked to a
   `Student` row via `User.student_id`. Self-service capabilities only;
   the row-level filter clamps every read to the student's own row.

## Capability matrix

| Capability                            | Rep              | Coordinator         | Manager     | Admin | Auditor       |
|---------------------------------------|------------------|---------------------|-------------|-------|---------------|
| View students                         | own campus       | own campus          | all campuses| all   | all (read)    |
| Edit student profile                  | yes              | yes                 | yes         | yes   | no            |
| Open / close cases                    | yes              | yes                 | yes         | yes   | no            |
| Run interventions                     | no               | yes                 | yes         | yes   | no            |
| View KPI dashboards                   | own campus only  | own program only    | all         | all   | all (read)    |
| Edit automation rules / weights       | no               | no                  | no          | yes   | no            |
| Export reports                        | own scope        | own scope           | yes         | yes   | yes           |
| View audit log                        | no               | no                  | yes         | yes   | yes           |

## Enforcement layers

1. **API middleware** — `requirePermission(capability, scope?)` runs after
   `requireAuth`. Capability strings live in
   `apps/api/src/core/rbac/capabilities.ts` and follow
   `<resource>.<action>` (e.g. `case.close`, `student.export`,
   `riskRules.edit`).
2. **Prisma row-level filter** — a Prisma client middleware reads
   `req.user.scope` and injects a `WHERE campus_id IN (...)` clause on
   every query against scoped tables. A rep cannot guess another campus's
   IDs out of the system.
3. **UI guards** — `useCan(capability)` hook hides actions the user
   cannot perform. UI guards are cosmetic; the API is the only authority.

## Capability registry

```
# Staff — student records
student.read
student.update
student.export

# Casework
case.read
case.open
case.close
case.assign
case.confidential_access     # counselor + admin only

intervention.run
intervention.complete

# Dashboards
dashboard.kpi.view
dashboard.kpi.viewAll        # cross-campus
dashboard.operational.view
dashboard.audit.view
dashboard.wellness.view      # counselor + admin

# Configuration
riskRules.read
riskRules.edit               # admin only
automation.rules.edit        # admin only
integrations.configure       # admin only

audit.read                   # manager/admin/auditor

reports.export.scoped
reports.export.all

# Messaging (staff side)
messaging.staff.read
messaging.staff.send

# Appointments
appointment.manage_own
appointment.manage_all       # manager+

# Documents
document.review

# Wellness
wellness.triage              # counselor + admin
wellness.read                # counselor + admin
anon_report.triage           # counselor + manager + admin

# Tutoring
tutoring.match               # rep+
tutoring.deliver             # tutor + coordinator

# Resources
resource.publish             # manager + admin

# Workload + ML
workload.view                # manager + admin
ml.export.run                # admin only

# Student-side (role=student)
self.read
self.message
self.book_appointment
self.upload_document
self.wellness.checkin
self.book_counseling
self.request_tutoring
self.study_group
self.book_resource
self.course.view
self.transcript_request
self.resource.read
```

## Scope model

- `scope.campus_ids: string[]` — campuses this user may read/write.
- `scope.program_ids: string[]` — used by Coordinator KPI scoping.
- `scope.entity_ids: string[]` — for cross-entity admins.

Empty `campus_ids` for `role:manager`/`role:admin`/`role:auditor` is
interpreted as "all" by middleware. Rep and Coordinator must have a
non-empty `campus_ids` set at user-creation time; the seed script enforces
this.

## Audit log

Every write goes through `auditMiddleware` which records:
`actor_id, action, resource_type, resource_id, before, after,
correlation_id, occurred_at`. The middleware reads RBAC context so denied
actions are also recorded with `outcome='denied'`.
