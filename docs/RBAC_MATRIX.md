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

## Capability registry (initial)

```
student.read
student.update
student.export

case.read
case.open
case.close
case.assign

intervention.run
intervention.complete

dashboard.kpi.view
dashboard.kpi.viewAll        # cross-campus
dashboard.operational.view
dashboard.audit.view

riskRules.read
riskRules.edit               # admin only

automation.rules.edit        # admin only
integrations.configure       # admin only

audit.read                   # manager/admin/auditor

reports.export.scoped
reports.export.all
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
