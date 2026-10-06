import argon2 from 'argon2';
import cookie from '@fastify/cookie';
import Fastify from 'fastify';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Session, Store, Todo } from './features/types.js';

const SESSION_COOKIE = 'foci_session';
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 5000;

type Credentials = { email: string; password: string };
type NewTodo = { title: string; description?: string | null; dueDate?: string | null };

const credentialsSchema = {
  type: 'object',
  required: ['email', 'password'],
  additionalProperties: false,
  properties: {
    email: { type: 'string', minLength: 3, maxLength: 254 },
    password: { type: 'string', minLength: 12, maxLength: 1024 },
  },
} as const;

const newTodoSchema = {
  type: 'object',
  required: ['title'],
  additionalProperties: false,
  properties: {
    title: { type: 'string', maxLength: TITLE_MAX },
    description: { anyOf: [{ type: 'string', maxLength: DESCRIPTION_MAX }, { type: 'null' }] },
    dueDate: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  },
} as const;

function publicTodo(todo: Todo) {
  return {
    id: todo.id,
    title: todo.title,
    description: todo.description,
    dueDate: todo.dueDate,
    isCompleted: todo.isCompleted,
    createdAt: todo.createdAt.toISOString(),
  };
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function equalToken(actual: string, expected: string): boolean {
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function buildApp(store: Store): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, bodyLimit: 16 * 1024, ajv: { customOptions: { removeAdditional: false } } });
  await app.register(cookie);

  app.setErrorHandler((error, _request, reply) => {
    if (error && typeof error === 'object' && 'validation' in error) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Please check the supplied fields.' } });
    }
    if ((error as Error & { code?: string }).code === '23505') {
      return reply.code(409).send({ error: { code: 'CONFLICT', message: 'An account with that email already exists.' } });
    }
    app.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
  });

  async function sessionFor(request: FastifyRequest, reply: FastifyReply, mutation = false): Promise<Session | null> {
    const token = request.cookies[SESSION_COOKIE];
    if (!token) {
      reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue.' } });
      return null;
    }
    const session = await store.findSession(hashToken(token));
    if (!session) {
      reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue.' } });
      return null;
    }
    if (mutation && !equalToken(String(request.headers['x-csrf-token'] ?? ''), session.csrfToken)) {
      reply.code(403).send({ error: { code: 'CSRF_FAILED', message: 'Refresh the page and try again.' } });
      return null;
    }
    return session;
  }

  app.get('/api/health', async () => ({ status: 'ok' }));

  app.post<{ Body: Credentials }>('/api/auth/register', { schema: { body: credentialsSchema } }, async (request, reply) => {
    const email = request.body.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Enter a valid email address.' } });
    }
    if (await store.findUserByEmail(email)) {
      return reply.code(409).send({ error: { code: 'CONFLICT', message: 'An account with that email already exists.' } });
    }
    const passwordHash = await argon2.hash(request.body.password, { type: argon2.argon2id });
    const user = await store.createUser(email, passwordHash);
    return reply.code(201).send({ user: { id: user.id, email: user.email } });
  });

  app.post<{ Body: Credentials }>('/api/auth/login', { schema: { body: credentialsSchema } }, async (request, reply) => {
    const email = request.body.email.trim().toLowerCase();
    const user = await store.findUserByEmail(email);
    if (!user || !(await argon2.verify(user.passwordHash, request.body.password))) {
      return reply.code(401).send({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });
    }
    const token = randomBytes(32).toString('hex');
    const csrfToken = randomBytes(32).toString('hex');
    await store.createSession(user.id, hashToken(token), csrfToken, new Date(Date.now() + SESSION_SECONDS * 1000));
    reply.setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api',
      maxAge: SESSION_SECONDS,
    });
    return { user: { id: user.id, email: user.email }, csrfToken };
  });

  app.get('/api/auth/me', async (request, reply) => {
    const session = await sessionFor(request, reply);
    if (!session) return;
    return { userId: session.userId, csrfToken: session.csrfToken };
  });

  app.post('/api/auth/logout', async (request, reply) => {
    const session = await sessionFor(request, reply, true);
    if (!session) return;
    const token = request.cookies[SESSION_COOKIE];
    if (token) await store.deleteSession(hashToken(token));
    reply.clearCookie(SESSION_COOKIE, { path: '/api' });
    return reply.code(204).send();
  });

  app.post<{ Body: NewTodo }>('/api/todos', { schema: { body: newTodoSchema } }, async (request, reply) => {
    const session = await sessionFor(request, reply, true);
    if (!session) return;
    const title = request.body.title.trim();
    const dueDate = request.body.dueDate ?? null;
    if (!title || (dueDate !== null && !validDate(dueDate))) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Provide a title and a valid due date.' } });
    }
    const todo = await store.createTodo(session.userId, title, request.body.description ?? null, dueDate);
    return reply.code(201).send({ todo: publicTodo(todo) });
  });

  app.get('/api/todos', async (request, reply) => {
    const session = await sessionFor(request, reply);
    if (!session) return;
    return { todos: (await store.listTodos(session.userId)).map(publicTodo) };
  });

  return app;
}
