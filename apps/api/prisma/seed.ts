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

  for (let i = 0; i < 50; i++) {
    const campus = campuses[i % campuses.length]!;
    const program = programs[i % programs.length]!;
    const status = STATUSES[i % STATUSES.length]!;
    const intake = new Date();
    intake.setDate(intake.getDate() - (i % 120));
    const dob = new Date('2000-01-01');
    dob.setFullYear(dob.getFullYear() - (18 + (i % 50)));

    const sid = randomUUID();
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

  // eslint-disable-next-line no-console
  console.log('Seed complete: entity, 3 campuses, 5 users, 50 students.');
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
