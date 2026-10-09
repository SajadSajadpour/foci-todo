import { and, asc, count, desc, eq, gt, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { TODO_PAGE_SIZE } from '../features/todo-list.js';
import type { Session, Store, Todo, TodoChanges, User } from '../features/types.js';
import { sessions, todos, users } from './schema.js';

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
      const [row] = await db
        .select({ userId: sessions.userId, csrfToken: sessions.csrfToken, expiresAt: sessions.expiresAt })
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
    async listTodos(userId, options) {
      const where = and(
        eq(todos.userId, userId),
        options.status === 'all' ? undefined : eq(todos.isCompleted, options.status === 'completed'),
      );
      const [{ total }] = await db.select({ total: count() }).from(todos).where(where);
      const totalPages = Math.max(1, Math.ceil(total / TODO_PAGE_SIZE));
      const page = Math.min(options.page, totalPages);
      const order =
        options.sort === 'oldest'
          ? [asc(todos.createdAt), asc(todos.id)]
          : options.sort === 'dueSoon'
            ? [sql`${todos.dueDate} ASC NULLS LAST`, asc(todos.id)]
            : options.sort === 'title'
              ? [sql`lower(${todos.title}) ASC`, asc(todos.id)]
              : [desc(todos.createdAt), desc(todos.id)];
      const rows = await db
        .select()
        .from(todos)
        .where(where)
        .orderBy(...order)
        .limit(TODO_PAGE_SIZE)
        .offset((page - 1) * TODO_PAGE_SIZE);
      return { todos: rows, total, page, pageSize: TODO_PAGE_SIZE, totalPages };
    },
    async findTodo(userId, id): Promise<Todo | null> {
      const [row] = await db
        .select()
        .from(todos)
        .where(and(eq(todos.userId, userId), eq(todos.id, id)))
        .limit(1);
      return row ?? null;
    },
    async updateTodo(userId, id, changes: TodoChanges): Promise<Todo | null> {
      const [row] = await db
        .update(todos)
        .set(changes)
        .where(and(eq(todos.userId, userId), eq(todos.id, id)))
        .returning();
      return row ?? null;
    },
    async deleteTodo(userId, id): Promise<boolean> {
      const rows = await db
        .delete(todos)
        .where(and(eq(todos.userId, userId), eq(todos.id, id)))
        .returning({ id: todos.id });
      return rows.length > 0;
    },
  };

  return { store, close: () => pool.end() };
}
