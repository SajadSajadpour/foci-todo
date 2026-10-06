import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { routes } from './routes';
import { LoginPage } from '../features/auth/login-page';
import { RegisterPage } from '../features/auth/register-page';
import { useSession } from '../features/auth/session-context';
import { ErrorMessage } from '../shared/components/feedback';
import { TaskShell } from '../features/tasks/task-shell';
import { TaskListPage } from '../features/tasks/task-list-page';
import { NewTaskPage } from '../features/tasks/new-task-page';
import { TaskDetailPage } from '../features/tasks/task-detail-page';
import { EditTaskPage } from '../features/tasks/edit-task-page';

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

export function App() {
  return (
    <Routes>
      <Route element={<SessionGate protectedRoute={false} />}>
        <Route path={routes.login} element={<LoginPage />} />
        <Route path={routes.register} element={<RegisterPage />} />
      </Route>
      <Route element={<SessionGate protectedRoute />}>
        <Route element={<TaskShell />}>
          <Route path={routes.tasks} element={<TaskListPage />} />
          <Route path={routes.newTask} element={<NewTaskPage />} />
          <Route path="/tasks/:id" element={<TaskDetailPage />} />
          <Route path="/tasks/:id/edit" element={<EditTaskPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={routes.tasks} replace />} />
    </Routes>
  );
}
