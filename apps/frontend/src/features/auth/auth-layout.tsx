import type { ReactNode } from 'react';
import { Brand } from '../../shared/components/brand';

export function AuthLayout({ children, variant = 'login' }: { children: ReactNode; variant?: 'login' | 'register' }) {
  return (
    <div className="page-shell">
      <header className="site-header">
        <Brand />
      </header>
      <main className={`auth-content auth-content-${variant}`}>
        <div className="auth-column">{children}</div>
      </main>
    </div>
  );
}
