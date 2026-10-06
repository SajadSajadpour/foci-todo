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

export interface Store {
  findUserByEmail(email: string): Promise<User | null>;
  createUser(email: string, passwordHash: string): Promise<User>;
  createSession(userId: string, tokenHash: string, csrfToken: string, expiresAt: Date): Promise<void>;
  findSession(tokenHash: string): Promise<Session | null>;
  deleteSession(tokenHash: string): Promise<void>;
  createTodo(userId: string, title: string, description: string | null, dueDate: string | null): Promise<Todo>;
  listTodos(userId: string): Promise<Todo[]>;
}
