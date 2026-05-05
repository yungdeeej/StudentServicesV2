import { prisma } from '../../core/db/prisma.js';
import { emit, on, EVENT_TYPES } from '../../core/events/bus.js';
import { logger } from '../../core/logger.js';
import { getIntegrations } from '../../integrations/factory.js';
import { recomputeFlags } from '../../core/flags.js';

export function registerIntakeWorkflows(): void {
  // OnStudentCreated → schedule orientation, set orientation_complete_flag=false
  on(EVENT_TYPES.StudentCreated, async (event) => {
    const { student_id } = event;
    if (!student_id) return;
    const intake = (event.payload as { intake_date: string }).intake_date;
    const scheduled = new Date(intake);
    scheduled.setDate(scheduled.getDate() + 3); // first orientation 3 days after intake

    await prisma.orientationRecord.create({
      data: { student_id, scheduled_at: scheduled },
    });
    await prisma.studentFlags.upsert({
      where: { student_id },
      update: { orientation_complete_flag: false },
      create: { student_id, orientation_complete_flag: false },
    });
    logger.info({ student_id }, 'intake.orientation_scheduled');
  });

  // OnOrientationAttended → welcome email + Moodle enroll + survey
  on(EVENT_TYPES.OrientationAttended, async (event) => {
    const { student_id } = event;
    if (!student_id) return;
    const student = await prisma.student.findUnique({ where: { id: student_id } });
    if (!student) return;
    const integrations = getIntegrations();

    // 1. Welcome Email
    const subject = 'Welcome to MCG Career College';
    const html = `<h1>Welcome, ${student.first_name}!</h1><p>We're excited to have you starting at our ${student.campus_id} campus.</p>`;
    const sent = await integrations.email.send({ to: student.email, subject, html });
    await prisma.welcomeCommunication.create({
      data: { student_id, template: 'welcome_v1', channel: 'email' },
    });
    await emit({
      event_type: EVENT_TYPES.CommunicationLogged,
      student_id,
      payload: {
        direction: 'outbound',
        channel: 'email',
        from_address: 'noreply@mcg.example',
        to_address: student.email,
        subject,
        body_or_summary: 'welcome_v1',
        external_id: sent.message_id,
      },
    });

    // 2. Moodle enroll
    try {
      await integrations.moodle.enrollStudent({
        student_external_id: student.student_external_id,
        course_external_ids: [],
      });
      await prisma.moodleEnrollmentStatus.upsert({
        where: { student_id },
        update: { enrolled: true, enrolled_at: new Date() },
        create: { student_id, enrolled: true, enrolled_at: new Date(), course_ids: [] },
      });
      await emit({
        event_type: EVENT_TYPES.MoodleEnrolled,
        student_id,
        payload: { course_id: null, enrolled_at: new Date().toISOString() },
      });
    } catch (err) {
      logger.warn({ err, student_id }, 'intake.moodle_enroll_failed');
    }

    // 3. Post-orientation survey
    const survey = await prisma.postOrientationSurvey.create({ data: { student_id } });
    await emit({
      event_type: EVENT_TYPES.SurveySent,
      student_id,
      payload: { survey_id: survey.id, template: 'post_orientation_v1', channel: 'email' },
    });

    // 4. Mark orientation complete
    await prisma.studentFlags.upsert({
      where: { student_id },
      update: { orientation_complete_flag: true },
      create: { student_id, orientation_complete_flag: true },
    });

    await recomputeFlags(student_id);
  });

  // Survey reminders. Triggered by a daily cron via SurveyReminderSent / a scheduler
  // calling this directly. Implementation below: when a survey is sent, schedule
  // reminders at +3d and +7d via delayed events.
  on(EVENT_TYPES.SurveySent, async (event) => {
    const studentId = event.student_id;
    if (!studentId) return;
    const surveyId = (event.payload as { survey_id: string }).survey_id;
    const day = 24 * 60 * 60 * 1000;
    await emit({
      event_type: EVENT_TYPES.SurveyReminderSent,
      student_id: studentId,
      delay_ms: 3 * day,
      payload: { survey_id: surveyId, reminder_n: 1 },
    });
    await emit({
      event_type: EVENT_TYPES.SurveyReminderSent,
      student_id: studentId,
      delay_ms: 7 * day,
      payload: { survey_id: surveyId, reminder_n: 2 },
    });
  });

  on(EVENT_TYPES.SurveyReminderSent, async (event) => {
    const p = event.payload as { survey_id: string; reminder_n: number };
    const survey = await prisma.postOrientationSurvey.findUnique({ where: { id: p.survey_id } });
    if (!survey || survey.submitted_at) return;
    await prisma.postOrientationSurvey.update({
      where: { id: p.survey_id },
      data: { reminders_sent: { increment: 1 } },
    });
    if (p.reminder_n >= 2) {
      await emit({
        event_type: EVENT_TYPES.TaskCreated,
        student_id: event.student_id,
        payload: {
          title: 'Follow up on outstanding orientation survey',
          description: 'Two reminders sent without response — manual outreach required.',
          priority: 'high',
          source_event_id: event.event_id,
        },
      });
    }
  });
}
