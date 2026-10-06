import { useState } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { routes } from './routes';
import { LoginPage } from '../features/auth/login-page';
import { RegisterPage } from '../features/auth/register-page';
import { useSession } from '../features/auth/session-context';
import { Brand } from '../shared/components/brand';
import { ErrorMessage } from '../shared/components/feedback';

function SessionGate({ protectedRoute }: { protectedRoute: boolean }) {
  const { state, refresh } = useSession();
  if (state.status === 'loading') return <main className="session-message" role="status">Loading your workspace…</main>;
  if (state.status === 'error') {
    return <main className="session-message"><ErrorMessage>Could not check your session.</ErrorMessage><button className="button button-secondary" onClick={() => void refresh()}>Try again</button></main>;
  }
  if (protectedRoute && state.status === 'anonymous') return <Navigate to={routes.login} replace />;
  if (!protectedRoute && state.status === 'authenticated') return <Navigate to={routes.tasks} replace />;
  return <Outlet />;
}

function TasksHome() {
  const { logout } = useSession();
  const [error, setError] = useState('');
  async function handleLogout() {
    setError('');
    try {
      await logout();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign out. Please try again.');
    }
  }
  return (
    <div className="page-shell">
      <header className="site-header"><Brand /><button className="text-action" type="button" onClick={() => void handleLogout()}>Sign out</button></header>
      <main className="task-content">
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <h1>My tasks</h1>
        <p>The task views are the next frontend step. Your account session is connected.</p>
      </main>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<SessionGate protectedRoute={false} />}>
        <Route path={routes.login} element={<LoginPage />} />
        <Route path={routes.register} element={<RegisterPage />} />
      </Route>
      <Route element={<SessionGate protectedRoute />}>
        <Route path={routes.tasks} element={<TasksHome />} />
      </Route>
      <Route path="*" element={<Navigate to={routes.tasks} replace />} />
    </Routes>
  );
}
