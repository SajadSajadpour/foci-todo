export const routes = {
  login: '/login',
  register: '/register',
  tasks: '/tasks',
  newTask: '/tasks/new',
  task: (id: string) => `/tasks/${id}`,
} as const;
