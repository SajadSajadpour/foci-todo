export const TODO_PAGE_SIZE = 20;
export const TODO_STATUSES = ['all', 'active', 'completed'] as const;
export const TODO_SORTS = ['newest', 'oldest', 'dueSoon', 'title'] as const;

export type TodoStatus = typeof TODO_STATUSES[number];
export type TodoSort = typeof TODO_SORTS[number];

export type TodoListOptions = {
  status: TodoStatus;
  sort: TodoSort;
  page: number;
};

export type TodoListResult<T> = {
  todos: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
