import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError } from '../../shared/api/client';
import { authApi } from './auth-api';
import type { Session } from './auth-api';

type SessionState =
  | { status: 'loading' | 'anonymous' | 'error'; session: null }
  | { status: 'authenticated'; session: Session };

type SessionContextValue = {
  state: SessionState;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading', session: null });

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setState({ status: 'loading', session: null });
    try {
      const session = await authApi.me(signal);
      if (!signal?.aborted) setState({ status: 'authenticated', session });
    } catch (error) {
      if (signal?.aborted) return;
      if (error instanceof ApiError && error.status === 401) {
        setState({ status: 'anonymous', session: null });
      } else {
        setState({ status: 'error', session: null });
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const result = await authApi.login({ email, password });
    setState({ status: 'authenticated', session: { userId: result.user.id, csrfToken: result.csrfToken } });
  };

  const logout = async () => {
    if (state.status !== 'authenticated') return;
    try {
      await authApi.logout(state.session.csrfToken);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    }
    setState({ status: 'anonymous', session: null });
  };

  return <SessionContext.Provider value={{ state, refresh, login, logout }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider');
  return context;
}
