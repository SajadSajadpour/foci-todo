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

export type TodoStatus = 'all' | 'active' | 'completed';
export type TodoSort = 'newest' | 'oldest' | 'dueSoon' | 'title';
export type TodoListQuery = { status: TodoStatus; sort: TodoSort; page: number };
export type TodoListResult = {
  todos: Todo[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const todoApi = {
  list: ({ status, sort, page }: TodoListQuery, signal?: AbortSignal) => {
    const query = new URLSearchParams({ status, sort, page: String(page) });
    return apiRequest<TodoListResult>(`/api/todos?${query}`, { signal });
  },
  get: (id: string, signal?: AbortSignal) => apiRequest<{ todo: Todo }>(`/api/todos/${encodeURIComponent(id)}`, { signal }),
  create: (todo: NewTodo, csrfToken: string) =>
    apiRequest<{ todo: Todo }>('/api/todos', { method: 'POST', body: todo, csrfToken }),
  setCompleted: (id: string, isCompleted: boolean, csrfToken: string) =>
    apiRequest<{ todo: Todo }>(`/api/todos/${encodeURIComponent(id)}`, { method: 'PATCH', body: { isCompleted }, csrfToken }),
  update: (id: string, changes: NewTodo, csrfToken: string) =>
    apiRequest<{ todo: Todo }>(`/api/todos/${encodeURIComponent(id)}`, { method: 'PATCH', body: changes, csrfToken }),
  remove: (id: string, csrfToken: string) =>
    apiRequest<void>(`/api/todos/${encodeURIComponent(id)}`, { method: 'DELETE', csrfToken }),
};
