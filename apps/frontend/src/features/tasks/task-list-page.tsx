import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import checkIcon from '../../assets/icons/check.svg';
import chevronIcon from '../../assets/icons/chevron-right.svg';
import circleIcon from '../../assets/icons/circle.svg';
import circleCheckIcon from '../../assets/icons/circle-check.svg';
import plusIcon from '../../assets/icons/plus.svg';
import { routes } from '../../app/routes';
import { ApiError } from '../../shared/api/client';
import { ErrorMessage } from '../../shared/components/feedback';
import { useSession } from '../auth/session-context';
import { formatCalendarDate } from './date-format';
import { todoApi } from './todo-api';
import type { Todo, TodoSort, TodoStatus } from './todo-api';

function NewTaskLink() {
  return <Link className="button button-primary new-task-link" to={routes.newTask}><img src={plusIcon} alt="" />New task</Link>;
}

function TaskRow({ todo, pending, onCompletion }: {
  todo: Todo;
  pending: boolean;
  onCompletion: (todo: Todo) => void;
}) {
  const action = todo.isCompleted ? 'Reopen' : 'Mark complete';
  return (
    <li className="task-row">
      <button
        className="completion-control"
        type="button"
        aria-label={`${action}: ${todo.title}`}
        aria-pressed={todo.isCompleted}
        disabled={pending}
        onClick={() => onCompletion(todo)}
      >
        <span className={`completion-box${todo.isCompleted ? ' is-complete' : ''}`}>
          {todo.isCompleted && <img src={checkIcon} alt="" />}
        </span>
      </button>
      <Link className="task-row-link" to={routes.task(todo.id)}>
        <span className="task-row-main">
          <span className={`task-row-title${todo.isCompleted ? ' is-complete' : ''}`}>{todo.title}</span>
          <span className="task-row-meta">
            <span className={`status-label${todo.isCompleted ? ' is-complete' : ''}`}>
              <img src={todo.isCompleted ? circleCheckIcon : circleIcon} alt="" />
              {todo.isCompleted ? 'Completed' : 'Incomplete'}
            </span>
            <span>{todo.dueDate ? `Due ${formatCalendarDate(todo.dueDate)}` : 'No due date'}</span>
          </span>
        </span>
        <img className="task-row-chevron" src={chevronIcon} alt="" />
      </Link>
    </li>
  );
}

export function TaskListPage() {
  const [todos, setTodos] = useState<Todo[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [status, setStatus] = useState<TodoStatus>('all');
  const [sort, setSort] = useState<TodoSort>('newest');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pageSize: 20, totalPages: 1 });
  const [reloadVersion, setReloadVersion] = useState(0);
  const { state, refresh } = useSession();

  const loadTodos = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await todoApi.list({ status, sort, page }, signal);
      if (!signal?.aborted) {
        setTodos(result.todos);
        setPagination({ total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages });
        if (result.page !== page) setPage(result.page);
      }
    } catch (cause) {
      if (signal?.aborted) return;
      if (cause instanceof ApiError && cause.status === 401) {
        await refresh();
      } else {
        setLoadError(cause instanceof Error ? cause.message : 'Could not load your tasks.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [page, refresh, sort, status]);

  useEffect(() => {
    const controller = new AbortController();
    void loadTodos(controller.signal);
    return () => controller.abort();
  }, [loadTodos, reloadVersion]);

  async function handleCompletion(todo: Todo) {
    if (state.status !== 'authenticated' || pendingId) return;
    setPendingId(todo.id);
    setActionError('');
    try {
      await todoApi.setCompleted(todo.id, !todo.isCompleted, state.session.csrfToken);
      setReloadVersion((current) => current + 1);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        await refresh();
      } else {
        setActionError(cause instanceof Error ? cause.message : 'Could not update the task.');
      }
    } finally {
      setPendingId(null);
    }
  }

  return (
    <main className="tasks-main">
      <div className="tasks-column">
        <div className="tasks-introduction">
          <div><h1>My tasks</h1><p>A clear place for what’s next.</p></div>
          <NewTaskLink />
        </div>

        <div className="task-list-controls" aria-label="Task list controls">
          <div className="task-list-control">
            <label htmlFor="task-status-filter">Show</label>
            <select id="task-status-filter" value={status} onChange={(event) => { setStatus(event.target.value as TodoStatus); setPage(1); }}>
              <option value="all">All tasks</option>
              <option value="active">Incomplete</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="task-list-control">
            <label htmlFor="task-sort">Sort by</label>
            <select id="task-sort" value={sort} onChange={(event) => { setSort(event.target.value as TodoSort); setPage(1); }}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="dueSoon">Due date, soonest</option>
              <option value="title">Title A–Z</option>
            </select>
          </div>
        </div>

        {actionError && <div className="tasks-feedback"><ErrorMessage>{actionError}</ErrorMessage></div>}
        {loading && <div className="task-skeleton" role="status" aria-label="Loading tasks">
          {[0, 1, 2].map((item) => <div className="task-skeleton-row" key={item}><span /><div><span /><span /></div></div>)}
        </div>}
        {!loading && loadError && <div className="tasks-load-error"><ErrorMessage>{loadError}</ErrorMessage><button className="button button-secondary" onClick={() => setReloadVersion((current) => current + 1)}>Try again</button></div>}
        {!loading && !loadError && todos?.length === 0 && <div className="tasks-empty">
          {status === 'all' ? <>
            <h2>A little more focus.</h2>
            <p>Your task list is ready. Start with one thing you want to get done.</p>
            <NewTaskLink />
          </> : <>
            <h2>No matching tasks.</h2>
            <p>{status === 'completed' ? 'Completed tasks will appear here.' : 'No incomplete tasks right now.'}</p>
            <button className="button button-secondary" type="button" onClick={() => { setStatus('all'); setPage(1); }}>Show all tasks</button>
          </>}
        </div>}
        {!loading && !loadError && todos && todos.length > 0 && <>
          <p className="task-results-summary" role="status">
            Showing {(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} {pagination.total === 1 ? 'task' : 'tasks'}
          </p>
          <ul className="task-list">{todos.map((todo) => <TaskRow key={todo.id} todo={todo} pending={pendingId === todo.id} onCompletion={(item) => void handleCompletion(item)} />)}</ul>
          {pagination.totalPages > 1 && <nav className="task-pagination" aria-label="Task pages">
            <button className="button button-secondary" type="button" disabled={pagination.page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <button className="button button-secondary" type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
          </nav>}
          <p className="tasks-help">Open a task to see its details. Use the checkbox to mark it complete or reopen it.</p>
        </>}
      </div>
    </main>
  );
}
