import type { UserRole } from '@prisma/client';

export const Capabilities = {
  StudentRead: 'student.read',
  StudentUpdate: 'student.update',
  StudentExport: 'student.export',

  CaseRead: 'case.read',
  CaseOpen: 'case.open',
  CaseClose: 'case.close',
  CaseAssign: 'case.assign',

  InterventionRun: 'intervention.run',
  InterventionComplete: 'intervention.complete',

  DashboardKpiView: 'dashboard.kpi.view',
  DashboardKpiViewAll: 'dashboard.kpi.viewAll',
  DashboardOpsView: 'dashboard.operational.view',
  DashboardAuditView: 'dashboard.audit.view',

  RiskRulesRead: 'riskRules.read',
  RiskRulesEdit: 'riskRules.edit',

  AutomationRulesEdit: 'automation.rules.edit',
  IntegrationsConfigure: 'integrations.configure',

  AuditRead: 'audit.read',

  ReportsExportScoped: 'reports.export.scoped',
  ReportsExportAll: 'reports.export.all',
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
];

const COORDINATOR: Capability[] = [
  ...REP,
  Capabilities.InterventionRun,
  Capabilities.InterventionComplete,
];

const MANAGER: Capability[] = [
  ...COORDINATOR,
  Capabilities.DashboardKpiViewAll,
  Capabilities.DashboardAuditView,
  Capabilities.AuditRead,
  Capabilities.ReportsExportAll,
];

const ADMIN: Capability[] = [
  ...MANAGER,
  Capabilities.RiskRulesEdit,
  Capabilities.AutomationRulesEdit,
  Capabilities.IntegrationsConfigure,
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
];

const ROLE_CAPS: Record<UserRole, Set<Capability>> = {
  rep: new Set(REP),
  coordinator: new Set(COORDINATOR),
  manager: new Set(MANAGER),
  admin: new Set(ADMIN),
  auditor: new Set(AUDITOR),
};

export function roleHasCapability(role: UserRole, cap: Capability): boolean {
  return ROLE_CAPS[role].has(cap);
}

export function capabilitiesForRole(role: UserRole): Capability[] {
  return Array.from(ROLE_CAPS[role]);
}
