import { apiRequest } from '../../shared/api/client';

export type Todo = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  isCompleted: boolean;
  createdAt: string;
};

export type NewTodo = {
  title: string;
  description: string | null;
  dueDate: string | null;
};

export const todoApi = {
  list: (signal?: AbortSignal) => apiRequest<{ todos: Todo[] }>('/api/todos', { signal }),
  get: (id: string, signal?: AbortSignal) => apiRequest<{ todo: Todo }>(`/api/todos/${encodeURIComponent(id)}`, { signal }),
  create: (todo: NewTodo, csrfToken: string) =>
    apiRequest<{ todo: Todo }>('/api/todos', { method: 'POST', body: todo, csrfToken }),
  setCompleted: (id: string, isCompleted: boolean, csrfToken: string) =>
    apiRequest<{ todo: Todo }>(`/api/todos/${encodeURIComponent(id)}`, { method: 'PATCH', body: { isCompleted }, csrfToken }),
};
