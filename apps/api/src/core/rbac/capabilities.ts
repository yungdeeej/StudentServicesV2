import type { UserRole } from '@prisma/client';

export const Capabilities = {
  // Staff — student records
  StudentRead: 'student.read',
  StudentUpdate: 'student.update',
  StudentExport: 'student.export',

  // Casework
  CaseRead: 'case.read',
  CaseOpen: 'case.open',
  CaseClose: 'case.close',
  CaseAssign: 'case.assign',
  // Wellness/counseling cases (confidential=true) require this distinct capability.
  CaseConfidentialAccess: 'case.confidential_access',

  InterventionRun: 'intervention.run',
  InterventionComplete: 'intervention.complete',

  // Dashboards
  DashboardKpiView: 'dashboard.kpi.view',
  DashboardKpiViewAll: 'dashboard.kpi.viewAll',
  DashboardOpsView: 'dashboard.operational.view',
  DashboardAuditView: 'dashboard.audit.view',
  DashboardWellnessView: 'dashboard.wellness.view',

  // Configuration
  RiskRulesRead: 'riskRules.read',
  RiskRulesEdit: 'riskRules.edit',
  AutomationRulesEdit: 'automation.rules.edit',
  IntegrationsConfigure: 'integrations.configure',

  AuditRead: 'audit.read',

  ReportsExportScoped: 'reports.export.scoped',
  ReportsExportAll: 'reports.export.all',

  // Messaging (staff side)
  MessagingStaffRead: 'messaging.staff.read',
  MessagingStaffSend: 'messaging.staff.send',

  // Appointments (staff side)
  AppointmentManageOwn: 'appointment.manage_own',
  AppointmentManageAll: 'appointment.manage_all',

  // Document hub (staff side)
  DocumentReview: 'document.review',

  // Wellness staff
  WellnessTriage: 'wellness.triage',
  WellnessRead: 'wellness.read',
  AnonymousReportTriage: 'anon_report.triage',

  // Tutoring staff
  TutoringMatch: 'tutoring.match',
  TutoringDeliver: 'tutoring.deliver',

  // Resources
  ResourcePublish: 'resource.publish',

  // Workload + ML
  WorkloadView: 'workload.view',
  MlExportRun: 'ml.export.run',

  // ----- Student-side (role=student) -----
  SelfRead: 'self.read',
  SelfMessage: 'self.message',
  SelfBookAppointment: 'self.book_appointment',
  SelfUploadDocument: 'self.upload_document',
  SelfWellnessCheckin: 'self.wellness.checkin',
  SelfBookCounseling: 'self.book_counseling',
  SelfRequestTutoring: 'self.request_tutoring',
  SelfJoinStudyGroup: 'self.study_group',
  SelfBookResource: 'self.book_resource',
  SelfCourseView: 'self.course.view',
  SelfTranscriptRequest: 'self.transcript_request',
  SelfResourceRead: 'self.resource.read',
} as const;

export type Capability = (typeof Capabilities)[keyof typeof Capabilities];

const REP: Capability[] = [
  Capabilities.StudentRead,
  Capabilities.StudentUpdate,
  Capabilities.StudentExport,
  Capabilities.CaseRead,
  Capabilities.CaseOpen,
  Capabilities.CaseClose,
  Capabilities.CaseAssign,
  Capabilities.DashboardKpiView,
  Capabilities.DashboardOpsView,
  Capabilities.RiskRulesRead,
  Capabilities.ReportsExportScoped,
  Capabilities.MessagingStaffRead,
  Capabilities.MessagingStaffSend,
  Capabilities.AppointmentManageOwn,
  Capabilities.DocumentReview,
  Capabilities.TutoringMatch,
];

const COORDINATOR: Capability[] = [
  ...REP,
  Capabilities.InterventionRun,
  Capabilities.InterventionComplete,
];

const COUNSELOR: Capability[] = [
  Capabilities.StudentRead,
  Capabilities.CaseRead,
  Capabilities.CaseOpen,
  Capabilities.CaseClose,
  Capabilities.CaseConfidentialAccess,
  Capabilities.MessagingStaffRead,
  Capabilities.MessagingStaffSend,
  Capabilities.AppointmentManageOwn,
  Capabilities.WellnessRead,
  Capabilities.WellnessTriage,
  Capabilities.AnonymousReportTriage,
  Capabilities.DashboardWellnessView,
  Capabilities.ReportsExportScoped,
];

const TUTOR_ROLE: Capability[] = [
  Capabilities.StudentRead,
  Capabilities.MessagingStaffRead,
  Capabilities.MessagingStaffSend,
  Capabilities.AppointmentManageOwn,
  Capabilities.TutoringDeliver,
];

const MANAGER: Capability[] = [
  ...COORDINATOR,
  Capabilities.DashboardKpiViewAll,
  Capabilities.DashboardAuditView,
  Capabilities.AuditRead,
  Capabilities.ReportsExportAll,
  Capabilities.AppointmentManageAll,
  Capabilities.AnonymousReportTriage,
  Capabilities.WorkloadView,
  Capabilities.ResourcePublish,
];

const ADMIN: Capability[] = [
  ...MANAGER,
  Capabilities.RiskRulesEdit,
  Capabilities.AutomationRulesEdit,
  Capabilities.IntegrationsConfigure,
  Capabilities.MlExportRun,
  Capabilities.CaseConfidentialAccess,
  Capabilities.DashboardWellnessView,
  Capabilities.WellnessRead,
  Capabilities.WellnessTriage,
];

const AUDITOR: Capability[] = [
  Capabilities.StudentRead,
  Capabilities.CaseRead,
  Capabilities.DashboardKpiView,
  Capabilities.DashboardKpiViewAll,
  Capabilities.DashboardAuditView,
  Capabilities.AuditRead,
  Capabilities.ReportsExportScoped,
  Capabilities.ReportsExportAll,
  Capabilities.RiskRulesRead,
  // Auditors do NOT get CaseConfidentialAccess by default — enable explicitly per audit.
];

const STUDENT: Capability[] = [
  Capabilities.SelfRead,
  Capabilities.SelfMessage,
  Capabilities.SelfBookAppointment,
  Capabilities.SelfUploadDocument,
  Capabilities.SelfWellnessCheckin,
  Capabilities.SelfBookCounseling,
  Capabilities.SelfRequestTutoring,
  Capabilities.SelfJoinStudyGroup,
  Capabilities.SelfBookResource,
  Capabilities.SelfCourseView,
  Capabilities.SelfTranscriptRequest,
  Capabilities.SelfResourceRead,
];

const ROLE_CAPS: Record<UserRole, Set<Capability>> = {
  rep: new Set(REP),
  coordinator: new Set(COORDINATOR),
  manager: new Set(MANAGER),
  admin: new Set(ADMIN),
  auditor: new Set(AUDITOR),
  counselor: new Set(COUNSELOR),
  tutor: new Set(TUTOR_ROLE),
  student: new Set(STUDENT),
};

export function roleHasCapability(role: UserRole, cap: Capability): boolean {
  return ROLE_CAPS[role].has(cap);
}

export function capabilitiesForRole(role: UserRole): Capability[] {
  return Array.from(ROLE_CAPS[role]);
}

export function isStudentRole(role: UserRole): boolean {
  return role === 'student';
}
