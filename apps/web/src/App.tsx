import { useEffect, useState } from 'react';
import { Layout } from './components/Layout.js';
import { Login } from './pages/Login.js';
import { Dashboard } from './pages/Dashboard.js';
import { Students } from './pages/Students.js';
import { AtRisk } from './pages/AtRisk.js';
import { Engagement } from './pages/Engagement.js';
import { Reporting } from './pages/Reporting.js';
import { auth } from './lib/auth.js';

type Page = 'dashboard' | 'students' | 'at-risk' | 'engagement' | 'reporting';

export function App(): JSX.Element {
  const [authed, setAuthed] = useState<boolean>(auth.isAuthenticated());
  const [page, setPage] = useState<Page>('dashboard');

  useEffect(() => {
    return auth.subscribe(() => setAuthed(auth.isAuthenticated()));
  }, []);

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  return (
    <Layout active={page} onNavigate={(p) => setPage(p as Page)} onLogout={() => auth.logout()}>
      {page === 'dashboard' && <Dashboard />}
      {page === 'students' && <Students />}
      {page === 'at-risk' && <AtRisk />}
      {page === 'engagement' && <Engagement />}
      {page === 'reporting' && <Reporting />}
    </Layout>
  );
}
