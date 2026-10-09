import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { routes } from '../../app/routes';
import { ErrorMessage } from '../../shared/components/feedback';
import { authApi } from './auth-api';
import { AuthLayout } from './auth-layout';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await authApi.register({ email: email.trim(), password });
      navigate(routes.login, { replace: true, state: { registered: true } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout variant="register">
      <div className="auth-introduction">
        <p className="eyebrow">Welcome to Foci Tasks</p>
        <h1>A fresh start.</h1>
        <p>Create an account for your private tasks.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div className="field">
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
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
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="Choose a password"
            required
            minLength={12}
            maxLength={1024}
            aria-describedby="password-guidance"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting}
          />
          <p className="field-guidance" id="password-guidance">
            Use at least 12 characters.
          </p>
        </div>
        <div className="field">
          <label htmlFor="register-confirmation">Confirm password</label>
          <input
            id="register-confirmation"
            type="password"
            name="confirmation"
            autoComplete="new-password"
            placeholder="Enter your password again"
            required
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            disabled={submitting}
          />
        </div>
        <button className="button button-primary button-full" type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="auth-note">After creating your account, you’ll sign in with your email and password.</p>
      <div className="auth-alternative">
        <p>Already have an account?</p>
        <Link to={routes.login}>Sign in</Link>
      </div>
    </AuthLayout>
  );
}
