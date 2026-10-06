import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import arrowLeftIcon from '../../assets/icons/arrow-left.svg';
import { routes } from '../../app/routes';
import { ApiError } from '../../shared/api/client';
import { ErrorMessage } from '../../shared/components/feedback';
import { useSession } from '../auth/session-context';
import { TaskEditor } from './task-editor';
import { todoApi } from './todo-api';
import type { Todo } from './todo-api';

export function EditTaskPage() {
  const { id } = useParams<{ id: string }>();
  const [todo, setTodo] = useState<Todo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const { refresh } = useSession();

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('Task not found.');
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setTodo(null);
    setError('');
    void todoApi.get(id, controller.signal).then(({ todo: loaded }) => {
      if (!controller.signal.aborted) setTodo(loaded);
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return;
      if (cause instanceof ApiError && cause.status === 401) void refresh();
      else setError(cause instanceof ApiError && cause.status === 404 ? 'Task not found.' : 'Could not load this task.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, refresh, attempt]);

  if (loading || error || !todo) {
    return <main className="task-form-main"><div className="task-form-column">
      <Link className="back-link" to={routes.tasks}><img src={arrowLeftIcon} alt="" />Back to My tasks</Link>
      {loading ? <div className="detail-loading" role="status">Loading task…</div> : <div className="tasks-load-error">
        <ErrorMessage>{error || 'Task not found.'}</ErrorMessage>
        {error !== 'Task not found.' && <button className="button button-secondary" type="button" onClick={() => setAttempt((value) => value + 1)}>Try again</button>}
      </div>}
    </div></main>;
  }

  return <TaskEditor key={todo.id} mode="edit" todo={todo} />;
}
