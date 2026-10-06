import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import logOutIcon from '../../assets/icons/log-out.svg';
import { useSession } from '../auth/session-context';
import { Brand } from '../../shared/components/brand';
import { ErrorMessage } from '../../shared/components/feedback';

export function TaskShell() {
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
      <header className="site-header">
        <Brand />
        <button className="text-action sign-out" type="button" onClick={() => void handleLogout()}>
          <img src={logOutIcon} alt="" />Sign out
        </button>
      </header>
      {error && <div className="shell-feedback"><ErrorMessage>{error}</ErrorMessage></div>}
      <Outlet />
    </div>
  );
}
