import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import type { Session, Store, Todo, User } from './features/types.js';

function memoryStore(): Store {
  const users = new Map<string, User>();
  const sessions = new Map<string, Session>();
  const todos = new Map<string, Todo>();
  return {
    async findUserByEmail(email) { return users.get(email) ?? null; },
    async createUser(email, passwordHash) {
      const user = { id: randomUUID(), email, passwordHash, createdAt: new Date() };
      users.set(email, user);
      return user;
    },
    async createSession(userId, tokenHash, csrfToken, expiresAt) {
      sessions.set(tokenHash, { userId, csrfToken, expiresAt });
    },
    async findSession(tokenHash) {
      const session = sessions.get(tokenHash);
      return session && session.expiresAt > new Date() ? session : null;
    },
    async deleteSession(tokenHash) { sessions.delete(tokenHash); },
    async createTodo(userId, title, description, dueDate) {
      const todo = { id: randomUUID(), userId, title, description, dueDate, isCompleted: false, createdAt: new Date() };
      todos.set(todo.id, todo);
      return todo;
    },
    async listTodos(userId) { return [...todos.values()].filter((todo) => todo.userId === userId); },
  };
}

const credentials = (email: string) => ({ email, password: 'correct horse battery staple' });

async function signIn(app: Awaited<ReturnType<typeof buildApp>>, email: string) {
  const register = await app.inject({ method: 'POST', url: '/api/auth/register', payload: credentials(email) });
  expect(register.statusCode).toBe(201);
  expect(register.json().user).toEqual({ id: expect.any(String), email });
  expect(register.body).not.toContain('passwordHash');

  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: credentials(email) });
  expect(login.statusCode).toBe(200);
  return {
    cookie: login.headers['set-cookie']?.toString().split(';')[0] ?? '',
    csrf: login.json().csrfToken as string,
  };
}

describe('account and first task slice', () => {
  it('registers, signs in, creates a task, and isolates each user’s list', async () => {
    const app = await buildApp(memoryStore());
    try {
      const alice = await signIn(app, 'alice@example.com');
      const bob = await signIn(app, 'bob@example.com');

      const create = await app.inject({
        method: 'POST', url: '/api/todos', headers: { cookie: alice.cookie, 'x-csrf-token': alice.csrf },
        payload: { title: '  Review assessment  ', dueDate: '2026-10-09' },
      });
      expect(create.statusCode).toBe(201);
      expect(create.json().todo).toMatchObject({ title: 'Review assessment', dueDate: '2026-10-09', isCompleted: false });
      expect(create.json().todo).not.toHaveProperty('userId');

      const aliceList = await app.inject({ method: 'GET', url: '/api/todos', headers: { cookie: alice.cookie } });
      expect(aliceList.json().todos).toHaveLength(1);

      const bobList = await app.inject({ method: 'GET', url: '/api/todos', headers: { cookie: bob.cookie } });
      expect(bobList.json().todos).toEqual([]);

      const anonymousList = await app.inject({ method: 'GET', url: '/api/todos' });
      expect(anonymousList.statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });

  it('rejects invalid task input and state changes without the CSRF token', async () => {
    const app = await buildApp(memoryStore());
    try {
      const alice = await signIn(app, 'alice@example.com');
      const request = (payload: object, csrf = alice.csrf) => app.inject({
        method: 'POST', url: '/api/todos', headers: { cookie: alice.cookie, 'x-csrf-token': csrf }, payload,
      });
      expect((await request({ title: '  ' })).statusCode).toBe(400);
      expect((await request({ title: 'Task', dueDate: '2026-02-30' })).statusCode).toBe(400);
      expect((await request({ title: 'Task', unknown: true })).statusCode).toBe(400);
      expect((await request({ title: 'Task' }, '')).statusCode).toBe(403);
      expect((await app.inject({ method: 'GET', url: '/api/todos', headers: { cookie: alice.cookie } })).json().todos).toEqual([]);
    } finally {
      await app.close();
    }
  });

  it('invalidates the session on logout', async () => {
    const app = await buildApp(memoryStore());
    try {
      const alice = await signIn(app, 'alice@example.com');
      const logout = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie: alice.cookie, 'x-csrf-token': alice.csrf } });
      expect(logout.statusCode).toBe(204);
      expect((await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: alice.cookie } })).statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });
});
