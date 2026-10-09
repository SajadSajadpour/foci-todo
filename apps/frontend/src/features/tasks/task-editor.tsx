import type { FormEvent } from 'react';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { routes } from '../../app/routes';
import arrowLeftIcon from '../../assets/icons/arrow-left.svg';
import calendarIcon from '../../assets/icons/calendar-days.svg';
import { ApiError } from '../../shared/api/client';
import { ErrorMessage } from '../../shared/components/feedback';
import { useSession } from '../auth/session-context';
import type { Todo } from './todo-api';
import { todoApi } from './todo-api';

type TaskEditorProps = { mode: 'create'; todo?: never } | { mode: 'edit'; todo: Todo };

export function TaskEditor({ mode, todo }: TaskEditorProps) {
  const [title, setTitle] = useState(todo?.title ?? '');
  const [description, setDescription] = useState(todo?.description ?? '');
  const [dueDate, setDueDate] = useState(todo?.dueDate ?? '');
  const [titleError, setTitleError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const { state, refresh } = useSession();
  const navigate = useNavigate();
  const isEditing = mode === 'edit';
  const cancelTo = isEditing ? routes.task(todo.id) : routes.tasks;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || state.status !== 'authenticated') return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError('Enter a title for your task.');
      titleRef.current?.focus();
      return;
    }
    setTitleError('');
    setError('');
    setSaving(true);
    try {
      const values = {
        title: trimmedTitle,
        description: description.trim() || null,
        dueDate: dueDate || null,
      };
      const result = isEditing
        ? await todoApi.update(todo.id, values, state.session.csrfToken)
        : await todoApi.create(values, state.session.csrfToken);
      navigate(routes.task(result.todo.id), { replace: true });
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        await refresh();
      } else {
        setError(cause instanceof Error ? cause.message : 'Could not save the task. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="task-form-main">
      <div className="task-form-column">
        <Link
          className="back-link"
          to={cancelTo}
          aria-disabled={saving}
          onClick={(event) => {
            if (saving) event.preventDefault();
          }}
        >
          <img src={arrowLeftIcon} alt="" />
          {isEditing ? 'Back to task' : 'Back to My tasks'}
        </Link>
        <div className="task-form-introduction">
          <h1>{isEditing ? 'Edit task' : 'New task'}</h1>
          <p>{isEditing ? 'Make the details work for you.' : 'Start with a title. The rest is up to you.'}</p>
        </div>
        <form className="task-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <div className="field">
            <label htmlFor="task-title">Title (required)</label>
            <input
              ref={titleRef}
              id="task-title"
              name="title"
              placeholder="What needs to get done?"
              maxLength={200}
              required
              aria-invalid={Boolean(titleError)}
              aria-describedby={titleError ? 'task-title-error' : undefined}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (titleError) setTitleError('');
              }}
              disabled={saving}
            />
            {titleError && (
              <p className="field-error" id="task-title-error">
                {titleError}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="task-description">Description (optional)</label>
            <textarea
              id="task-description"
              name="description"
              placeholder="Add a little context…"
              maxLength={5000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={saving}
            />
          </div>
          <div className="field">
            <label htmlFor="task-date">Due date (optional)</label>
            <span className="date-input-wrap">
              <input
                id="task-date"
                name="dueDate"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                disabled={saving}
              />
              <img src={calendarIcon} alt="" />
            </span>
            <p className="field-guidance">Calendar date only. Past dates are allowed.</p>
          </div>
          <div className="task-form-actions">
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? (isEditing ? 'Saving changes…' : 'Creating task…') : isEditing ? 'Save changes' : 'Create task'}
            </button>
            <Link
              className="button button-secondary"
              to={cancelTo}
              aria-disabled={saving}
              onClick={(event) => {
                if (saving) event.preventDefault();
              }}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
