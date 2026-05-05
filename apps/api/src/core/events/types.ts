export const EVENT_TYPES = {
  StudentCreated: 'student.created',
  StudentStatusChanged: 'student.status_changed',
  StudentGraduated: 'student.graduated',

  OrientationAttended: 'orientation.attended',
  OrientationMissed: 'orientation.missed',

  SurveySent: 'survey.sent',
  SurveySubmitted: 'survey.submitted',
  SurveyReminderSent: 'survey.reminder_sent',

  MoodleEnrolled: 'moodle.enrolled',
  MoodleActivityRecorded: 'moodle.activity_recorded',

  ConnectRoomAssigned: 'connect_room.assigned',
  StudentLeaderAssigned: 'student_leader.assigned',
  EngagementEventAttended: 'engagement.event_attended',
  NewsletterSent: 'newsletter.sent',
  NewsletterOpened: 'newsletter.opened',

  AttendanceRecorded: 'attendance.recorded',
  AttendanceMissing: 'attendance.missing',

  GradeRecorded: 'grade.recorded',
  GradeBelowThreshold: 'grade.below_threshold',

  RiskFlagged: 'risk.flagged',
  RiskCleared: 'risk.cleared',
  RiskEscalated: 'risk.escalated',

  CaseOpened: 'case.opened',
  CaseAssigned: 'case.assigned',
  CaseClosed: 'case.closed',
  CaseActionLogged: 'case.action_logged',

  InterventionAssigned: 'intervention.assigned',
  InterventionCompleted: 'intervention.completed',

  ClassAuditLogged: 'class_audit.logged',
  ClassAuditResolved: 'class_audit.resolved',

  AccommodationRequested: 'accommodation.requested',
  AccommodationApproved: 'accommodation.approved',

  ReentryInitiated: 'reentry.initiated',
  ReentryWeeklyCheck: 'reentry.weekly_check',

  WithdrawalInitiated: 'withdrawal.initiated',
  WithdrawalConfirmed: 'withdrawal.confirmed',

  PracticumStarted: 'practicum.started',
  PracticumCompleted: 'practicum.completed',

  CommunicationLogged: 'communication.logged',
  TaskCreated: 'task.created',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES] | `system.${string}`;

export type DomainEvent<T = unknown> = {
  event_id: string;
  event_type: EventType;
  student_id: string | null;
  actor_id: string;
  payload: T;
  occurred_at: string;
  correlation_id: string;
};
