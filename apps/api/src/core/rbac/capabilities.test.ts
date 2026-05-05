import { describe, expect, it } from 'vitest';
import { Capabilities, capabilitiesForRole, roleHasCapability } from './capabilities.js';

describe('rbac capabilities', () => {
  it('admin has every capability needed to edit risk rules', () => {
    expect(roleHasCapability('admin', Capabilities.RiskRulesEdit)).toBe(true);
    expect(roleHasCapability('admin', Capabilities.AutomationRulesEdit)).toBe(true);
  });

  it('rep cannot edit risk rules', () => {
    expect(roleHasCapability('rep', Capabilities.RiskRulesEdit)).toBe(false);
  });

  it('auditor can read but not write', () => {
    expect(roleHasCapability('auditor', Capabilities.StudentRead)).toBe(true);
    expect(roleHasCapability('auditor', Capabilities.StudentUpdate)).toBe(false);
    expect(roleHasCapability('auditor', Capabilities.CaseClose)).toBe(false);
    expect(roleHasCapability('auditor', Capabilities.AuditRead)).toBe(true);
  });

  it('manager can view kpi all but cannot edit rules', () => {
    expect(roleHasCapability('manager', Capabilities.DashboardKpiViewAll)).toBe(true);
    expect(roleHasCapability('manager', Capabilities.RiskRulesEdit)).toBe(false);
  });

  it('returns the capability list for a role', () => {
    const caps = capabilitiesForRole('coordinator');
    expect(caps).toContain(Capabilities.InterventionRun);
  });
});
