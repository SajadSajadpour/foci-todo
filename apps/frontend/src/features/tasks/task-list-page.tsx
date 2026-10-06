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
import type { Todo } from './todo-api';

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
  const { state, refresh } = useSession();

  const loadTodos = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await todoApi.list(signal);
      if (!signal?.aborted) setTodos(result.todos);
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
  }, [refresh]);

  useEffect(() => {
    const controller = new AbortController();
    void loadTodos(controller.signal);
    return () => controller.abort();
  }, [loadTodos]);

  async function handleCompletion(todo: Todo) {
    if (state.status !== 'authenticated' || pendingId) return;
    setPendingId(todo.id);
    setActionError('');
    try {
      const result = await todoApi.setCompleted(todo.id, !todo.isCompleted, state.session.csrfToken);
      setTodos((current) => current?.map((item) => item.id === todo.id ? result.todo : item) ?? null);
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

        {actionError && <div className="tasks-feedback"><ErrorMessage>{actionError}</ErrorMessage></div>}
        {loading && <div className="task-skeleton" role="status" aria-label="Loading tasks">
          {[0, 1, 2].map((item) => <div className="task-skeleton-row" key={item}><span /><div><span /><span /></div></div>)}
        </div>}
        {!loading && loadError && <div className="tasks-load-error"><ErrorMessage>{loadError}</ErrorMessage><button className="button button-secondary" onClick={() => void loadTodos()}>Try again</button></div>}
        {!loading && !loadError && todos?.length === 0 && <div className="tasks-empty">
          <h2>A little more focus.</h2>
          <p>Your task list is ready. Start with one thing you want to get done.</p>
          <NewTaskLink />
        </div>}
        {!loading && !loadError && todos && todos.length > 0 && <>
          <ul className="task-list">{todos.map((todo) => <TaskRow key={todo.id} todo={todo} pending={pendingId === todo.id} onCompletion={(item) => void handleCompletion(item)} />)}</ul>
          <p className="tasks-help">Open a task to see its details. Use the checkbox to mark it complete or reopen it.</p>
        </>}
      </div>
    </main>
  );
}
