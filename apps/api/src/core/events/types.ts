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

  // Student-facing portal additions
  MessageSent: 'message.sent',
  MessageRead: 'message.read',

  AppointmentRequested: 'appointment.requested',
  AppointmentConfirmed: 'appointment.confirmed',
  AppointmentCancelled: 'appointment.cancelled',
  AppointmentCompleted: 'appointment.completed',

  DocumentUploaded: 'document.uploaded',
  DocumentReviewed: 'document.reviewed',

  WellnessCheckinSubmitted: 'wellness.checkin_submitted',
  WellnessCrisisDetected: 'wellness.crisis_detected',
  AnonymousReportSubmitted: 'anon_report.submitted',

  TutoringRequested: 'tutoring.requested',
  TutoringMatched: 'tutoring.matched',
  TutoringSessionCompleted: 'tutoring.session_completed',

  StudyGroupCreated: 'study_group.created',
  StudyGroupJoined: 'study_group.joined',
  StudyGroupLeft: 'study_group.left',

  ResourceBooked: 'resource.booked',
  ResourceBookingCancelled: 'resource.booking_cancelled',

  CourseEnrolled: 'course.enrolled',
  CourseCompleted: 'course.completed',
  CourseDropped: 'course.dropped',

  TranscriptRequested: 'transcript.requested',
  TranscriptDelivered: 'transcript.delivered',

  StaffWorkloadAlert: 'staff.workload_alert',
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
