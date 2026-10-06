export type User = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
};

export type Session = {
  userId: string;
  csrfToken: string;
  expiresAt: Date;
};

export type Todo = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  isCompleted: boolean;
  createdAt: Date;
};

export type TodoChanges = Partial<Pick<Todo, 'title' | 'description' | 'dueDate' | 'isCompleted'>>;

export interface Store {
  findUserByEmail(email: string): Promise<User | null>;
  createUser(email: string, passwordHash: string): Promise<User>;
  createSession(userId: string, tokenHash: string, csrfToken: string, expiresAt: Date): Promise<void>;
  findSession(tokenHash: string): Promise<Session | null>;
  deleteSession(tokenHash: string): Promise<void>;
  createTodo(userId: string, title: string, description: string | null, dueDate: string | null): Promise<Todo>;
  listTodos(userId: string): Promise<Todo[]>;
  findTodo(userId: string, id: string): Promise<Todo | null>;
  updateTodo(userId: string, id: string, changes: TodoChanges): Promise<Todo | null>;
  deleteTodo(userId: string, id: string): Promise<boolean>;
}
