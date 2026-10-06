import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import arrowLeftIcon from '../../assets/icons/arrow-left.svg';
import checkIcon from '../../assets/icons/check.svg';
import circleIcon from '../../assets/icons/circle.svg';
import circleCheckIcon from '../../assets/icons/circle-check.svg';
import { routes } from '../../app/routes';
import { ApiError } from '../../shared/api/client';
import { ErrorMessage } from '../../shared/components/feedback';
import { useSession } from '../auth/session-context';
import { formatCalendarDate, formatCreatedAt } from './date-format';
import { todoApi } from './todo-api';
import type { Todo } from './todo-api';
import { DeleteTaskDialog } from './delete-task-dialog';

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [todo, setTodo] = useState<Todo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const { state, refresh } = useSession();

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setLoadError('Task not found.');
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setTodo(null);
    setLoadError('');
    setActionError('');
    void todoApi.get(id, controller.signal).then(({ todo: loaded }) => {
      if (!controller.signal.aborted) setTodo(loaded);
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return;
      if (cause instanceof ApiError && cause.status === 401) void refresh();
      else setLoadError(cause instanceof ApiError && cause.status === 404 ? 'Task not found.' : 'Could not load this task.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, refresh]);

  async function handleCompletion() {
    if (!todo || state.status !== 'authenticated' || saving) return;
    setSaving(true);
    setActionError('');
    try {
      const result = await todoApi.setCompleted(todo.id, !todo.isCompleted, state.session.csrfToken);
      setTodo(result.todo);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) await refresh();
      else setActionError(cause instanceof Error ? cause.message : 'Could not update the task.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="task-detail-main">
      <div className="task-detail-column">
        <Link className="back-link" to={routes.tasks}><img src={arrowLeftIcon} alt="" />Back to My tasks</Link>
        {loading && <div className="detail-loading" role="status">Loading task…</div>}
        {!loading && loadError && <ErrorMessage>{loadError}</ErrorMessage>}
        {!loading && todo && <>
          {actionError && <ErrorMessage>{actionError}</ErrorMessage>}
          <span className={`status-label${todo.isCompleted ? ' is-complete' : ''}`}>
            <img src={todo.isCompleted ? circleCheckIcon : circleIcon} alt="" />
            {todo.isCompleted ? 'Completed' : 'Incomplete'}
          </span>
          <h1>{todo.title}</h1>
          <dl className="task-detail-metadata">
            <div><dt>Due date</dt><dd>{todo.dueDate ? formatCalendarDate(todo.dueDate) : 'No due date'}</dd></div>
            <div><dt>Created</dt><dd>{formatCreatedAt(todo.createdAt)}</dd></div>
          </dl>
          <section className="task-detail-description">
            <h2>Description</h2>
            <p>{todo.description || 'No description added.'}</p>
          </section>
          <div className="task-detail-actions">
            <button className="button button-primary" type="button" disabled={saving} onClick={() => void handleCompletion()}>
              {todo.isCompleted ? 'Reopen task' : <><img src={checkIcon} alt="" />Mark complete</>}
            </button>
            <Link className="button button-secondary" to={routes.editTask(todo.id)}>Edit task</Link>
            <button ref={deleteButtonRef} className="button button-danger-quiet" type="button" onClick={() => setDeleteOpen(true)}>Delete task</button>
          </div>
          {deleteOpen && <DeleteTaskDialog todo={todo} onDismiss={() => { setDeleteOpen(false); deleteButtonRef.current?.focus(); }} />}
        </>}
      </div>
    </main>
  );
}
