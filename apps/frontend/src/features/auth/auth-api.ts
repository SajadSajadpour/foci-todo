import { apiRequest } from '../../shared/api/client';

export type Session = { userId: string; csrfToken: string };
type Credentials = { email: string; password: string };

export const authApi = {
  register: (credentials: Credentials) =>
    apiRequest<{ user: { id: string; email: string } }>('/api/auth/register', { method: 'POST', body: credentials }),
  login: (credentials: Credentials) =>
    apiRequest<{ user: { id: string; email: string }; csrfToken: string }>('/api/auth/login', { method: 'POST', body: credentials }),
  me: (signal?: AbortSignal) => apiRequest<Session>('/api/auth/me', { signal }),
  logout: (csrfToken: string) => apiRequest<void>('/api/auth/logout', { method: 'POST', csrfToken }),
};
