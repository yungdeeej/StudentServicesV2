# SIS Migration — CampusLogin → Salesforce

> MCG runs **CampusLogin** today and is migrating to **Salesforce**. This
> doc defines the `ISisAdapter` contract and the field-mapping plan so the
> swap is an env-var change, not a refactor.

## Goal

Calling code never imports `CampusLoginAdapter` or `SalesforceAdapter`
directly. It depends on `ISisAdapter`, resolved by a factory keyed on
`SIS_ADAPTER` (`campuslogin` | `salesforce` | `mock`). Adding the
Salesforce adapter is a build-time concern; downstream modules ship
unchanged.

## `ISisAdapter` contract

```ts
// packages/shared-types/src/sis.ts
export type SisStudent = {
  external_id: string;          // unique stable ID in the source SIS
  source: 'campuslogin' | 'salesforce';
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;         // E.164 when present
  dob: string;                  // ISO date
  program_external_id: string;
  campus_external_id: string;
  entity_external_id: string;
  intake_date: string;          // ISO date
  expected_graduation_date: string | null;
  practicum_start_date: string | null;
  status: 'start' | 'stay' | 'at_risk' | 'withdrawn'
        | 'on_practicum' | 'graduated' | 're_entry' | 'alumni';
  custom: Record<string, unknown>; // adapter-specific fields, opaque to core
};

export type SisAttendance = {
  student_external_id: string;
  session_id: string;
  occurred_at: string;
  present: boolean;
};

export type SisGrade = {
  student_external_id: string;
  course_external_id: string;
  assessment_id: string;
  value: number;
  recorded_at: string;
};

export interface ISisAdapter {
  health(): Promise<{ ok: boolean; latency_ms: number }>;

  // Pull
  listStudents(args: { since?: string; campus_id?: string }): Promise<SisStudent[]>;
  getStudent(externalId: string): Promise<SisStudent | null>;
  listAttendance(args: { since: string }): Promise<SisAttendance[]>;
  listGrades(args: { since: string }): Promise<SisGrade[]>;

  // Push (best-effort; not all SIS support every write)
  upsertStudent?(student: Partial<SisStudent> & { external_id: string }): Promise<void>;
  recordStatusChange?(externalId: string, status: SisStudent['status']): Promise<void>;
}
```

Rules:

- The interface is the contract. New methods require a major version bump
  of `packages/shared-types`.
- `listStudents({ since })` is the canonical incremental sync. The polling
  job stores `last_synced_at` per resource per adapter.
- `custom` is the escape hatch for adapter-specific extras. Core code
  must NEVER read from `custom`; module code may, but only inside the
  module's own integration translator.

## Field mapping (initial)

| Internal field            | CampusLogin source                         | Salesforce target (proposed)            | Notes |
|---------------------------|---------------------------------------------|-----------------------------------------|-------|
| `external_id`             | `Student.StudentNumber`                     | `Contact.Student_External_Id__c`        | stable, never reused |
| `first_name`              | `Student.FirstName`                         | `Contact.FirstName`                     | |
| `last_name`               | `Student.LastName`                          | `Contact.LastName`                      | |
| `email`                   | `Student.PrimaryEmail`                      | `Contact.Email`                         | unique per campus, not global |
| `phone`                   | `Student.PrimaryPhone`                      | `Contact.MobilePhone`                   | normalize to E.164 in adapter |
| `dob`                     | `Student.DOB`                               | `Contact.Birthdate`                     | |
| `program_external_id`     | `Enrollment.ProgramCode`                    | `Program__c.External_Id__c`             | latest active enrollment |
| `campus_external_id`      | `Enrollment.CampusCode`                     | `Campus__c.External_Id__c`              | |
| `entity_external_id`      | inferred from `CampusCode` mapping table    | `Entity__c.External_Id__c`              | static seed |
| `intake_date`             | `Enrollment.StartDate`                      | `Enrollment__c.Start_Date__c`           | |
| `expected_graduation_date`| `Enrollment.ExpectedEndDate`                | `Enrollment__c.Expected_End_Date__c`    | nullable |
| `practicum_start_date`    | `Enrollment.PracticumStartDate`             | `Practicum__c.Start_Date__c`            | nullable |
| `status`                  | `Enrollment.Status` (mapped via lookup)     | `Enrollment__c.Status__c`               | enum mapping table below |

### Status enum mapping

| Internal       | CampusLogin string     | Salesforce picklist (proposed) |
|----------------|------------------------|--------------------------------|
| `start`        | `New / Active`         | `Active`                       |
| `stay`         | `Active`               | `Active`                       |
| `at_risk`      | (computed, not in SIS) | `At Risk`                      |
| `withdrawn`    | `Withdrawn`            | `Withdrawn`                    |
| `on_practicum` | `Practicum`            | `On Practicum`                 |
| `graduated`    | `Graduated`            | `Graduated`                    |
| `re_entry`     | `Re-Entry`             | `Re-Entry`                     |
| `alumni`       | `Alumni`               | `Alumni`                       |

`at_risk` is intentionally a portal-derived state. The portal owns the
flag; the SIS only needs to know whether the student is active.

## Migration runbook (high level)

1. **Dual-write, single-read.** Once the Salesforce skeleton can write,
   set `SIS_ADAPTER=campuslogin` (read+write) and an additional
   `SIS_SHADOW_ADAPTER=salesforce` (write-only) so the new system is
   warmed up.
2. **Cutover read.** Flip `SIS_ADAPTER=salesforce`; CampusLogin becomes
   shadow.
3. **Decommission.** Remove CampusLogin once 30 days of clean parity
   reports.

## Open items (track in `ASSUMPTIONS.md` J-002)

- Final Salesforce custom-object naming.
- API limits for the chosen Salesforce edition (governs poll cadence).
- Whether MCG wants to keep CampusLogin as the gradebook system after
  cutover.
