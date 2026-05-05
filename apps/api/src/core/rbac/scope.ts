import type { UserRole } from '@prisma/client';

export type Scope = {
  campus_ids: string[];
  program_ids: string[];
  entity_ids: string[];
  all_campuses: boolean;
  // For role=student: id of their Student row.
  student_id: string | null;
};

export type AuthContext = {
  user_id: string;
  role: UserRole;
  scope: Scope;
  correlation_id: string;
};

export function isAllCampusesRole(role: UserRole): boolean {
  return role === 'manager' || role === 'admin' || role === 'auditor';
}

export function buildScope(
  role: UserRole,
  user: {
    campus_ids: string[];
    program_ids: string[];
    entity_ids: string[];
    student_id?: string | null;
  },
): Scope {
  return {
    campus_ids: user.campus_ids ?? [],
    program_ids: user.program_ids ?? [],
    entity_ids: user.entity_ids ?? [],
    all_campuses: isAllCampusesRole(role),
    student_id: user.student_id ?? null,
  };
}

export function canAccessCampus(scope: Scope, campus_id: string | null | undefined): boolean {
  if (scope.all_campuses) return true;
  if (!campus_id) return false;
  return scope.campus_ids.includes(campus_id);
}

export function isOwnStudent(scope: Scope, student_id: string): boolean {
  return scope.student_id === student_id;
}
