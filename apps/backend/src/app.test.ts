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
    async findTodo(userId, id) {
      const todo = todos.get(id);
      return todo?.userId === userId ? todo : null;
    },
    async updateTodo(userId, id, changes) {
      const todo = todos.get(id);
      if (!todo || todo.userId !== userId) return null;
      const updated = { ...todo, ...changes };
      todos.set(id, updated);
      return updated;
    },
    async deleteTodo(userId, id) {
      const todo = todos.get(id);
      return todo?.userId === userId ? todos.delete(id) : false;
    },
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
  it('publishes an OpenAPI contract and Swagger UI matching the authenticated routes', async () => {
    const app = await buildApp(memoryStore());
    try {
      const response = await app.inject({ method: 'GET', url: '/api/docs/json' });
      expect(response.statusCode).toBe(200);
      const spec = response.json();
      expect(spec.openapi).toMatch(/^3\./);
      expect(Object.keys(spec.paths)).toEqual([
        '/api/health', '/api/auth/register', '/api/auth/login', '/api/auth/me',
        '/api/auth/logout', '/api/todos', '/api/todos/{id}',
      ]);
      expect(spec.paths['/api/auth/register'].post.requestBody.content['application/json'].schema.required).toContain('password');
      expect(spec.paths['/api/auth/login'].post.responses['200'].content['application/json'].schema.properties).toHaveProperty('csrfToken');
      expect(spec.paths['/api/auth/me'].get.security).toEqual([{ sessionCookie: [] }]);
      expect(spec.paths['/api/todos'].post.security).toEqual([{ sessionCookie: [], csrfToken: [] }]);
      expect(spec.paths['/api/todos/{id}'].patch.security).toEqual([{ sessionCookie: [], csrfToken: [] }]);
      expect(spec.components.securitySchemes.sessionCookie.name).toBe('foci_session');
      expect(spec.components.securitySchemes.csrfToken.name).toBe('X-CSRF-Token');
      expect((await app.inject({ method: 'GET', url: '/api/docs/' })).statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });

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

  it('supports the full task lifecycle and keeps each task private', async () => {
    const app = await buildApp(memoryStore());
    try {
      const alice = await signIn(app, 'alice@example.com');
      const bob = await signIn(app, 'bob@example.com');
      const auth = (person: typeof alice) => ({ cookie: person.cookie, 'x-csrf-token': person.csrf });
      const create = await app.inject({ method: 'POST', url: '/api/todos', headers: auth(alice), payload: { title: 'First task', description: 'Details' } });
      const id = create.json().todo.id as string;
      const url = `/api/todos/${id}`;

      expect((await app.inject({ method: 'GET', url, headers: auth(alice) })).json().todo.title).toBe('First task');
      expect((await app.inject({ method: 'GET', url, headers: auth(bob) })).statusCode).toBe(404);
      expect((await app.inject({ method: 'PATCH', url, headers: auth(bob), payload: { title: 'Hijacked' } })).statusCode).toBe(404);
      expect((await app.inject({ method: 'DELETE', url, headers: auth(bob) })).statusCode).toBe(404);

      const update = await app.inject({ method: 'PATCH', url, headers: auth(alice), payload: { title: '  Updated task  ', description: null, dueDate: '2026-10-10', isCompleted: true } });
      expect(update.statusCode).toBe(200);
      expect(update.json().todo).toMatchObject({ title: 'Updated task', description: null, dueDate: '2026-10-10', isCompleted: true });

      const incomplete = await app.inject({ method: 'PATCH', url, headers: auth(alice), payload: { isCompleted: false } });
      expect(incomplete.json().todo).toMatchObject({ title: 'Updated task', dueDate: '2026-10-10', isCompleted: false });
      const repeat = await app.inject({ method: 'PATCH', url, headers: auth(alice), payload: { isCompleted: false } });
      expect(repeat.json().todo.isCompleted).toBe(false);

      const clearDueDate = await app.inject({ method: 'PATCH', url, headers: auth(alice), payload: { dueDate: null } });
      expect(clearDueDate.json().todo.dueDate).toBeNull();

      expect((await app.inject({ method: 'PATCH', url, headers: auth(alice), payload: {} })).statusCode).toBe(400);
      expect((await app.inject({ method: 'PATCH', url, headers: auth(alice), payload: { title: '  ' } })).statusCode).toBe(400);
      expect((await app.inject({ method: 'PATCH', url, headers: auth(alice), payload: { dueDate: '2026-02-30' } })).statusCode).toBe(400);
      expect((await app.inject({ method: 'PATCH', url, headers: { cookie: alice.cookie }, payload: { isCompleted: true } })).statusCode).toBe(403);
      expect((await app.inject({ method: 'DELETE', url, headers: { cookie: alice.cookie } })).statusCode).toBe(403);

      expect((await app.inject({ method: 'DELETE', url, headers: auth(alice) })).statusCode).toBe(204);
      expect((await app.inject({ method: 'GET', url, headers: auth(alice) })).statusCode).toBe(404);
      expect((await app.inject({ method: 'GET', url: '/api/todos', headers: auth(alice) })).json().todos).toEqual([]);
    } finally {
      await app.close();
    }
  });
});
