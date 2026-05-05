import { useEffect, useState } from 'react';
import { Layout } from './components/Layout.js';
import { StudentLayout } from './components/StudentLayout.js';
import { Login } from './pages/Login.js';
import { Dashboard } from './pages/Dashboard.js';
import { Students } from './pages/Students.js';
import { AtRisk } from './pages/AtRisk.js';
import { Engagement } from './pages/Engagement.js';
import { Reporting } from './pages/Reporting.js';
import { StaffMessaging } from './pages/StaffMessaging.js';
import { StaffWellnessQueue } from './pages/StaffWellnessQueue.js';
import { StaffWorkload } from './pages/StaffWorkload.js';
import { StaffAnonReports } from './pages/StaffAnonReports.js';

import { StudentDashboard } from './pages/student/StudentDashboard.js';
import { StudentGrades } from './pages/student/StudentGrades.js';
import { StudentAttendance } from './pages/student/StudentAttendance.js';
import { StudentMessages } from './pages/student/StudentMessages.js';
import { StudentAppointments } from './pages/student/StudentAppointments.js';
import { StudentDocuments } from './pages/student/StudentDocuments.js';
import { StudentWellness } from './pages/student/StudentWellness.js';
import { StudentTutoring } from './pages/student/StudentTutoring.js';
import { StudentStudyGroups } from './pages/student/StudentStudyGroups.js';
import { StudentResources } from './pages/student/StudentResources.js';
import { StudentCourses } from './pages/student/StudentCourses.js';
import { StudentTranscripts } from './pages/student/StudentTranscripts.js';
import { StudentBookings } from './pages/student/StudentBookings.js';

import { auth } from './lib/auth.js';

type StaffPage =
  | 'dashboard'
  | 'students'
  | 'at-risk'
  | 'engagement'
  | 'reporting'
  | 'messaging'
  | 'wellness-queue'
  | 'workload'
  | 'anon-reports';

type StudentPage =
  | 's-dashboard'
  | 's-grades'
  | 's-attendance'
  | 's-messages'
  | 's-appointments'
  | 's-documents'
  | 's-wellness'
  | 's-tutoring'
  | 's-study-groups'
  | 's-resources'
  | 's-courses'
  | 's-transcripts'
  | 's-bookings';

export function App(): JSX.Element {
  const [authed, setAuthed] = useState<boolean>(auth.isAuthenticated());
  const [staffPage, setStaffPage] = useState<StaffPage>('dashboard');
  const [studentPage, setStudentPage] = useState<StudentPage>('s-dashboard');

  useEffect(() => {
    return auth.subscribe(() => setAuthed(auth.isAuthenticated()));
  }, []);

  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  if (auth.isStudent()) {
    return (
      <StudentLayout
        active={studentPage}
        onNavigate={(p) => setStudentPage(p as StudentPage)}
        onLogout={() => auth.logout()}
      >
        {studentPage === 's-dashboard' && <StudentDashboard />}
        {studentPage === 's-grades' && <StudentGrades />}
        {studentPage === 's-attendance' && <StudentAttendance />}
        {studentPage === 's-messages' && <StudentMessages />}
        {studentPage === 's-appointments' && <StudentAppointments />}
        {studentPage === 's-documents' && <StudentDocuments />}
        {studentPage === 's-wellness' && <StudentWellness />}
        {studentPage === 's-tutoring' && <StudentTutoring />}
        {studentPage === 's-study-groups' && <StudentStudyGroups />}
        {studentPage === 's-resources' && <StudentResources />}
        {studentPage === 's-courses' && <StudentCourses />}
        {studentPage === 's-transcripts' && <StudentTranscripts />}
        {studentPage === 's-bookings' && <StudentBookings />}
      </StudentLayout>
    );
  }

  return (
    <Layout active={staffPage} onNavigate={(p) => setStaffPage(p as StaffPage)} onLogout={() => auth.logout()}>
      {staffPage === 'dashboard' && <Dashboard />}
      {staffPage === 'students' && <Students />}
      {staffPage === 'at-risk' && <AtRisk />}
      {staffPage === 'engagement' && <Engagement />}
      {staffPage === 'reporting' && <Reporting />}
      {staffPage === 'messaging' && <StaffMessaging />}
      {staffPage === 'wellness-queue' && <StaffWellnessQueue />}
      {staffPage === 'workload' && <StaffWorkload />}
      {staffPage === 'anon-reports' && <StaffAnonReports />}
    </Layout>
  );
}
