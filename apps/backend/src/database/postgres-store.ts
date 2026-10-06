import { desc, eq, and, gt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sessions, todos, users } from './schema.js';
import type { Session, Store, Todo, User } from '../features/types.js';

export function createPostgresStore(databaseUrl: string): { store: Store; close: () => Promise<void> } {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  const store: Store = {
    async findUserByEmail(email): Promise<User | null> {
      const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return row ?? null;
    },
    async createUser(email, passwordHash): Promise<User> {
      const [row] = await db.insert(users).values({ email, passwordHash }).returning();
      return row;
    },
    async createSession(userId, tokenHash, csrfToken, expiresAt): Promise<void> {
      await db.insert(sessions).values({ userId, tokenHash, csrfToken, expiresAt });
    },
    async findSession(tokenHash): Promise<Session | null> {
      const [row] = await db.select({ userId: sessions.userId, csrfToken: sessions.csrfToken, expiresAt: sessions.expiresAt })
        .from(sessions)
        .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
        .limit(1);
      return row ?? null;
    },
    async deleteSession(tokenHash): Promise<void> {
      await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    },
    async createTodo(userId, title, description, dueDate): Promise<Todo> {
      const [row] = await db.insert(todos).values({ userId, title, description, dueDate }).returning();
      return row;
    },
    async listTodos(userId): Promise<Todo[]> {
      return db.select().from(todos).where(eq(todos.userId, userId)).orderBy(desc(todos.createdAt), desc(todos.id));
    },
  };

  return { store, close: () => pool.end() };
}
