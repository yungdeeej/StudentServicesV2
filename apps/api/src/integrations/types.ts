export type Health = { ok: boolean; latency_ms: number; detail?: string };

export interface IIntegrationAdapter {
  health(): Promise<Health>;
}

// Re-export the SIS contract from shared-types so all adapters live here.
export type {
  ISisAdapter,
  SisStudent,
  SisAttendance,
  SisGrade,
  SisSource,
  StudentStatus,
} from '@mcg/shared-types';

// ----------------------------------------------------------------------------
// Moodle
// ----------------------------------------------------------------------------

export interface IMoodleAdapter extends IIntegrationAdapter {
  enrollStudent(args: {
    student_external_id: string;
    course_external_ids: string[];
  }): Promise<{ enrolled_at: string }>;
  listActivity(args: { since: string }): Promise<MoodleActivity[]>;
}
export type MoodleActivity = {
  student_external_id: string;
  course_external_id: string;
  activity_type: string;
  occurred_at: string;
};

// ----------------------------------------------------------------------------
// BigBlueButton
// ----------------------------------------------------------------------------

export interface IBbbAdapter extends IIntegrationAdapter {
  fetchAttendanceSince(args: { since: string }): Promise<BbbAttendance[]>;
  recordingUrl(meeting_id: string): Promise<string | null>;
}
export type BbbAttendance = {
  student_external_id: string;
  meeting_id: string;
  joined_at: string;
  left_at: string | null;
};

// ----------------------------------------------------------------------------
// Twilio (SMS)
// ----------------------------------------------------------------------------

export interface ITwilioAdapter extends IIntegrationAdapter {
  sendSms(args: { to: string; body: string }): Promise<{ external_id: string }>;
}

// ----------------------------------------------------------------------------
// JustCall (CTI)
// ----------------------------------------------------------------------------

export interface IJustCallAdapter extends IIntegrationAdapter {
  fetchCallEventsSince(since: string): Promise<JustCallEvent[]>;
}
export type JustCallEvent = {
  external_id: string;
  type: 'call' | 'sms' | 'voicemail';
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  occurred_at: string;
  recording_url?: string;
};

// ----------------------------------------------------------------------------
// PandaDoc
// ----------------------------------------------------------------------------

export interface IPandaDocAdapter extends IIntegrationAdapter {
  createDocument(args: { template: string; recipient_email: string; vars: Record<string, string> }): Promise<{ external_id: string; status: string }>;
  getDocumentStatus(external_id: string): Promise<{ status: string }>;
}

// ----------------------------------------------------------------------------
// Google Workspace
// ----------------------------------------------------------------------------

export interface IGoogleAdapter extends IIntegrationAdapter {
  createCalendarEvent(args: {
    summary: string;
    start: string;
    end: string;
    attendees: string[];
  }): Promise<{ event_id: string; html_link: string }>;
  sendEmail(args: { to: string; subject: string; body: string }): Promise<{ message_id: string }>;
}

// ----------------------------------------------------------------------------
// FAL.ai
// ----------------------------------------------------------------------------

export interface IFalAdapter extends IIntegrationAdapter {
  generateImage(args: { prompt: string; size?: string }): Promise<{ url: string }>;
}

// ----------------------------------------------------------------------------
// Claude API
// ----------------------------------------------------------------------------

export interface IClaudeAdapter extends IIntegrationAdapter {
  summarizeRisk(args: {
    student_id: string;
    risk_score: number;
    timeline: Array<{ event_type: string; occurred_at: string; payload?: unknown }>;
  }): Promise<{ predicted_risk: number; top_factors: string[]; recommended_action: string }>;
  draftNudge(args: {
    student_first_name: string;
    context: string;
    voice_sample?: string;
  }): Promise<{ draft: string }>;
  analyzeSentiment(args: { text: string }): Promise<{
    label: 'positive' | 'neutral' | 'negative' | 'distressed';
    score: number;            // -1 to 1
    crisis_signal: boolean;
    rationale?: string;
  }>;
}

// ----------------------------------------------------------------------------
// SMTP / email — used as the canonical email channel for transactional mail
// ----------------------------------------------------------------------------

export interface IEmailAdapter extends IIntegrationAdapter {
  send(args: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    headers?: Record<string, string>;
  }): Promise<{ message_id: string }>;
}
