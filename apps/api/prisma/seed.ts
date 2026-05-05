import { PrismaClient, type StudentStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Entity
  const entity = await prisma.entity.upsert({
    where: { external_id: 'ENT-MCG' },
    update: {},
    create: { external_id: 'ENT-MCG', name: 'MCG Career College' },
  });

  // Campuses
  const campusSpecs = [
    { external_id: 'CAM-CGY', name: 'Calgary Campus', city: 'Calgary' },
    { external_id: 'CAM-RD', name: 'Red Deer Campus', city: 'Red Deer' },
    { external_id: 'CAM-EDM', name: 'Edmonton Campus', city: 'Edmonton' },
  ];
  const campuses = [];
  for (const c of campusSpecs) {
    campuses.push(
      await prisma.campus.upsert({
        where: { external_id: c.external_id },
        update: {},
        create: { ...c, entity_id: entity.id },
      }),
    );
  }

  // Programs (one per campus)
  const programs = [];
  for (const campus of campuses) {
    programs.push(
      await prisma.program.upsert({
        where: { external_id: `PROG-${campus.external_id}-MA` },
        update: {},
        create: {
          external_id: `PROG-${campus.external_id}-MA`,
          name: 'Medical Office Assistant',
          campus_id: campus.id,
          entity_id: entity.id,
        },
      }),
    );
  }

  // Users — one per role
  const passwordHash = await bcrypt.hash('changeme123', 12);
  const users = [
    { email: 'rep@mcg.example', role: 'rep' as const, first_name: 'Riley', last_name: 'Rep' },
    { email: 'coordinator@mcg.example', role: 'coordinator' as const, first_name: 'Casey', last_name: 'Coordinator' },
    { email: 'manager@mcg.example', role: 'manager' as const, first_name: 'Morgan', last_name: 'Manager' },
    { email: 'admin@mcg.example', role: 'admin' as const, first_name: 'Alex', last_name: 'Admin' },
    { email: 'auditor@mcg.example', role: 'auditor' as const, first_name: 'Avery', last_name: 'Auditor' },
  ];
  const userRows = [];
  for (const u of users) {
    userRows.push(
      await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          ...u,
          password_hash: passwordHash,
          campus_ids:
            u.role === 'rep' || u.role === 'coordinator' ? [campuses[0]!.id] : campuses.map((c) => c.id),
          program_ids: [],
          entity_ids: [entity.id],
        },
      }),
    );
  }

  // Engagement & risk config defaults
  await prisma.engagementScoreConfig.create({ data: { active: true } });
  await prisma.riskRuleConfig.create({ data: { active: true } });

  // Connect rooms (1 per campus)
  for (const campus of campuses) {
    await prisma.connectRoom.upsert({
      where: { id: `00000000-0000-0000-0000-000000000${campus.external_id.length}` },
      update: {},
      create: { campus_id: campus.id, name: `Connect Room — ${campus.name}` },
    }).catch(async () => {
      await prisma.connectRoom.create({ data: { campus_id: campus.id, name: `Connect Room — ${campus.name}` } });
    });
  }

  // Intervention playbooks
  for (const t of ['academic', 'attendance', 'personal'] as const) {
    await prisma.interventionPlaybook.create({
      data: {
        type: t,
        name: `${t} default playbook`,
        body_md: `# ${t} playbook\n\n1. Reach out within 24h\n2. Schedule support session\n3. Follow up at 7d`,
      },
    });
  }

  // 50 demo students across statuses
  const STATUSES: StudentStatus[] = [
    'start',
    'stay',
    'at_risk',
    'withdrawn',
    'on_practicum',
    'graduated',
    're_entry',
    'alumni',
  ];
  const coordinator = userRows.find((u) => u.role === 'coordinator')!;
  const rep = userRows.find((u) => u.role === 'rep')!;

  const studentIds: string[] = [];
  for (let i = 0; i < 50; i++) {
    const campus = campuses[i % campuses.length]!;
    const program = programs[i % programs.length]!;
    const status = STATUSES[i % STATUSES.length]!;
    const intake = new Date();
    intake.setDate(intake.getDate() - (i % 120));
    const dob = new Date('2000-01-01');
    dob.setFullYear(dob.getFullYear() - (18 + (i % 50)));

    const sid = randomUUID();
    studentIds.push(sid);
    await prisma.student.create({
      data: {
        id: sid,
        student_external_id: `CL-${20000 + i}`,
        sis_source: 'campuslogin',
        first_name: `Student${i}`,
        last_name: 'Demo',
        email: `demo${i}@students.mcg.example`,
        phone: '+15875550000',
        dob,
        program_id: program.id,
        campus_id: campus.id,
        entity_id: entity.id,
        intake_date: intake,
        status,
        assigned_program_coordinator_id: coordinator.id,
        assigned_student_services_rep_id: rep.id,
        flags: {
          create: {
            engagement_score: 30 + ((i * 7) % 70),
            engagement_tier: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
            risk_score: status === 'at_risk' ? 60 + (i % 40) : i % 30,
            at_risk_flag: status === 'at_risk',
            orientation_complete_flag: status !== 'start',
          },
        },
      },
    });
  }

  // 3 student logins linked to first 3 students.
  for (let i = 0; i < 3; i++) {
    const sid = studentIds[i]!;
    await prisma.user.upsert({
      where: { email: `student${i}@mcg.example` },
      update: {},
      create: {
        email: `student${i}@mcg.example`,
        password_hash: passwordHash,
        first_name: `Student${i}`,
        last_name: 'Demo',
        role: 'student',
        student_id: sid,
        campus_ids: [campuses[i % campuses.length]!.id],
        program_ids: [],
        entity_ids: [entity.id],
      },
    });
  }

  // Counselor + tutor + peer-tutor
  await prisma.user.upsert({
    where: { email: 'counselor@mcg.example' },
    update: {},
    create: {
      email: 'counselor@mcg.example',
      password_hash: passwordHash,
      first_name: 'Camille',
      last_name: 'Counselor',
      role: 'counselor',
      is_counselor: true,
      campus_ids: campuses.map((c) => c.id),
      program_ids: [],
      entity_ids: [entity.id],
    },
  });
  await prisma.user.upsert({
    where: { email: 'tutor@mcg.example' },
    update: {},
    create: {
      email: 'tutor@mcg.example',
      password_hash: passwordHash,
      first_name: 'Toby',
      last_name: 'Tutor',
      role: 'tutor',
      tutoring_subjects: ['Anatomy', 'Pharmacology', 'Clinical Skills'],
      campus_ids: campuses.map((c) => c.id),
      program_ids: [],
      entity_ids: [entity.id],
    },
  });

  // Resources — incl. crisis hotlines
  await prisma.resource.createMany({
    data: [
      {
        kind: 'hotline',
        topic: 'mental_health',
        title: 'Talk Suicide Canada — 1-833-456-4566 (24/7)',
        body_md:
          'Free, confidential support across Canada. Text 45645 (4 PM – midnight ET).',
        url: 'tel:18334564566',
        is_crisis: true,
        tags: ['crisis', '24/7', 'free', 'canada'],
      },
      {
        kind: 'hotline',
        topic: 'mental_health',
        title: 'AHS Mental Health Help Line — 1-877-303-2642 (24/7)',
        body_md: 'Alberta Health Services 24/7 mental health support.',
        url: 'tel:18773032642',
        is_crisis: true,
        tags: ['crisis', '24/7', 'alberta'],
      },
      {
        kind: 'article',
        topic: 'study_skills',
        title: '5-Step Study Plan for Practicum Exams',
        body_md: 'Break the syllabus into weekly sprints. Use spaced repetition…',
        tags: ['study', 'practicum'],
      },
      {
        kind: 'article',
        topic: 'time_management',
        title: 'Beating Procrastination — the 2-minute rule',
        body_md:
          'If a task takes less than 2 minutes, do it now. For larger tasks, commit to just 2 minutes of starting.',
        tags: ['productivity', 'procrastination'],
      },
      {
        kind: 'video',
        topic: 'technology',
        title: 'Logging into Moodle — 90 second walkthrough',
        url: 'https://example.com/moodle-howto',
        tags: ['moodle'],
      },
    ],
  });

  // Courses (one per program, with prerequisites)
  const courses = [];
  for (let i = 0; i < programs.length; i++) {
    const p = programs[i]!;
    courses.push(
      await prisma.course.upsert({
        where: { external_id: `CRS-${p.external_id}-101` },
        update: {},
        create: {
          external_id: `CRS-${p.external_id}-101`,
          code: 'MOA-101',
          name: 'Medical Office Fundamentals',
          description: 'Anatomy, terminology, ethics in healthcare administration.',
          campus_id: p.campus_id,
          program_id: p.id,
          credits: 3,
        },
      }),
    );
    courses.push(
      await prisma.course.upsert({
        where: { external_id: `CRS-${p.external_id}-201` },
        update: {},
        create: {
          external_id: `CRS-${p.external_id}-201`,
          code: 'MOA-201',
          name: 'Clinical Procedures',
          description: 'Vital signs, sterilization, basic clinical procedures.',
          campus_id: p.campus_id,
          program_id: p.id,
          credits: 4,
        },
      }),
    );
  }

  // Bookable resources — 1 study room + 1 lab per campus
  for (const campus of campuses) {
    await prisma.bookableResource.create({
      data: {
        campus_id: campus.id,
        kind: 'study_room',
        name: `${campus.city} Study Room A`,
        location: '2nd floor',
        capacity: 6,
      },
    });
    await prisma.bookableResource.create({
      data: {
        campus_id: campus.id,
        kind: 'lab',
        name: `${campus.city} Clinical Lab`,
        location: 'Ground floor',
        capacity: 1,
      },
    });
  }

  // Sample study group on first campus
  await prisma.studyGroup.create({
    data: {
      campus_id: campuses[0]!.id,
      name: 'Anatomy Study Crew',
      description: 'Tuesdays 6pm — review the chapter, quiz each other.',
      meeting_pattern: 'Tue 6pm',
      max_members: 8,
      members: {
        create: [{ student_id: studentIds[0]!, role: 'leader' }],
      },
    },
  });

  // Sample staff availability for the coordinator: M/W/F 10:00-12:00, 30-min advising slots
  for (const day of [1, 3, 5]) {
    await prisma.staffAvailability.create({
      data: {
        user_id: coordinator.id,
        day_of_week: day,
        start_minute: 600,
        end_minute: 720,
        slot_minutes: 30,
        appointment_kinds: ['advising', 'tutoring'],
      },
    });
  }
  // And the counselor: T/Th 13:00-16:00, 45-min counseling slots
  const counselorUser = await prisma.user.findUnique({ where: { email: 'counselor@mcg.example' } });
  if (counselorUser) {
    for (const day of [2, 4]) {
      await prisma.staffAvailability.create({
        data: {
          user_id: counselorUser.id,
          day_of_week: day,
          start_minute: 780,
          end_minute: 960,
          slot_minutes: 45,
          appointment_kinds: ['counseling'],
        },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    'Seed complete: entity, 3 campuses, 50 students, 3 student logins, counselor + tutor, resources, courses, bookable resources, study group, staff availability.',
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
