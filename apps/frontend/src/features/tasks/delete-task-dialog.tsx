import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../app/routes';
import { ApiError } from '../../shared/api/client';
import { ErrorMessage } from '../../shared/components/feedback';
import { useSession } from '../auth/session-context';
import { todoApi } from './todo-api';
import type { Todo } from './todo-api';

export function DeleteTaskDialog({ todo, onDismiss }: { todo: Todo; onDismiss: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const { state, refresh } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  function dismiss() {
    dialogRef.current?.close();
    onDismiss();
  }

  async function handleDelete() {
    if (deleting || state.status !== 'authenticated') return;
    setDeleting(true);
    setError('');
    try {
      await todoApi.remove(todo.id, state.session.csrfToken);
      navigate(routes.tasks, { replace: true });
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        await refresh();
      } else {
        setError(cause instanceof Error ? cause.message : 'Could not delete the task. Please try again.');
      }
    } finally {
      setDeleting(false);
    }
  }

  return <dialog ref={dialogRef} className="delete-dialog" aria-labelledby="delete-title" aria-describedby="delete-description"
    onCancel={(event) => { event.preventDefault(); if (!deleting) dismiss(); }}>
    <div className="delete-dialog-content">
      <h2 id="delete-title">Delete this task?</h2>
      <p id="delete-description">“{todo.title}” will be permanently removed. This cannot be undone.</p>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <div className="delete-dialog-actions">
        <button className="button button-secondary" type="button" autoFocus disabled={deleting} onClick={dismiss}>Cancel</button>
        <button className="button button-danger" type="button" disabled={deleting} onClick={() => void handleDelete()}>
          {deleting ? 'Deleting…' : 'Delete task'}
        </button>
      </div>
    </div>
  </dialog>;
}
