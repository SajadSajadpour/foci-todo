import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { routes } from '../../app/routes';
import { ErrorMessage, SuccessMessage } from '../../shared/components/feedback';
import { AuthLayout } from './auth-layout';
import { useSession } from './session-context';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { login } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const registered = (location.state as { registered?: boolean } | null)?.registered === true;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await login(email.trim(), password);
      navigate(routes.tasks, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="auth-introduction">
        <p className="eyebrow">Your personal task space</p>
        <h1>Welcome back.</h1>
        <p>Sign in to make space for your next task.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {registered && <SuccessMessage>Account created. Sign in to get started.</SuccessMessage>}
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting}
          />
        </div>
        <button className="button button-primary button-full" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="auth-alternative">
        <p>New to Foci Tasks?</p>
        <Link to={routes.register}>Create an account</Link>
      </div>
    </AuthLayout>
  );
}
