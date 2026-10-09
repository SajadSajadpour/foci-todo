import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import cookie from '@fastify/cookie';
import argon2 from 'argon2';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import Fastify from 'fastify';
import {
  errorResponse,
  loginResponse,
  mutationSecurity,
  registerApiDocs,
  sessionResponse,
  sessionSecurity,
  todoParams,
  todoResponse,
  todosResponse,
  userResponse,
} from './api-docs.js';
import { isValidCalendarDate } from './features/calendar-date.js';
import type { TodoListOptions } from './features/todo-list.js';
import { TODO_SORTS, TODO_STATUSES } from './features/todo-list.js';
import type { Session, Store, Todo } from './features/types.js';

const SESSION_COOKIE = 'foci_session';
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 5000;

type Credentials = { email: string; password: string };
type NewTodo = { title: string; description?: string | null; dueDate?: string | null };
type TodoUpdate = { title?: string; description?: string | null; dueDate?: string | null; isCompleted?: boolean };
type TodoParams = { id: string };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const credentialsSchema = {
  type: 'object',
  required: ['email', 'password'],
  additionalProperties: false,
  properties: {
    email: { type: 'string', minLength: 3, maxLength: 254, description: 'Email address, normalized to lowercase.' },
    password: { type: 'string', minLength: 12, maxLength: 1024, description: 'At least 12 characters.' },
  },
} as const;

const newTodoSchema = {
  type: 'object',
  required: ['title'],
  additionalProperties: false,
  properties: {
    title: { type: 'string', maxLength: TITLE_MAX, description: 'Nonblank after trimming whitespace.' },
    description: { type: 'string', nullable: true, maxLength: DESCRIPTION_MAX },
    dueDate: { type: 'string', nullable: true, description: 'Valid calendar date in YYYY-MM-DD format, or null.' },
  },
} as const;

const updateTodoSchema = {
  type: 'object',
  minProperties: 1,
  additionalProperties: false,
  properties: {
    title: { type: 'string', maxLength: TITLE_MAX, description: 'Nonblank after trimming whitespace.' },
    description: { type: 'string', nullable: true, maxLength: DESCRIPTION_MAX },
    dueDate: { type: 'string', nullable: true, description: 'Valid calendar date in YYYY-MM-DD format, or null.' },
    isCompleted: { type: 'boolean' },
  },
} as const;

const todoListQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string', enum: [...TODO_STATUSES], default: 'all', description: 'Filter by completion status.' },
    sort: {
      type: 'string',
      enum: [...TODO_SORTS],
      default: 'newest',
      description: 'Stable order; tasks without due dates come last for dueSoon.',
    },
    page: {
      type: 'integer',
      minimum: 1,
      maximum: 1000000,
      default: 1,
      description: 'One-based page number. Out-of-range pages resolve to the last available page.',
    },
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

function equalToken(actual: string, expected: string): boolean {
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function buildApp(store: Store): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env.NODE_ENV === 'production',
    bodyLimit: 16 * 1024,
    ajv: { customOptions: { removeAdditional: false } },
  });
  await app.register(cookie);
  await registerApiDocs(app);

  app.setErrorHandler((error, _request, reply) => {
    if (error && typeof error === 'object' && 'validation' in error) {
      return reply
        .code(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Please check the supplied fields.' } });
    }
    if ((error as Error & { code?: string }).code === '23505') {
      return reply
        .code(409)
        .send({ error: { code: 'CONFLICT', message: 'An account with that email already exists.' } });
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

  app.get(
    '/api/health',
    {
      schema: {
        tags: ['Health'],
        summary: 'Check API process health',
        response: {
          200: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['ok'] } } },
        },
      },
    },
    async () => ({ status: 'ok' }),
  );

  app.post<{ Body: Credentials }>(
    '/api/auth/register',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Create an account',
        body: credentialsSchema,
        response: { 201: userResponse, 400: errorResponse, 409: errorResponse },
      },
    },
    async (request, reply) => {
      const email = request.body.email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Enter a valid email address.' } });
      }
      if (await store.findUserByEmail(email)) {
        return reply
          .code(409)
          .send({ error: { code: 'CONFLICT', message: 'An account with that email already exists.' } });
      }
      const passwordHash = await argon2.hash(request.body.password, { type: argon2.argon2id });
      const user = await store.createUser(email, passwordHash);
      return reply.code(201).send({ user: { id: user.id, email: user.email } });
    },
  );

  app.post<{ Body: Credentials }>(
    '/api/auth/login',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Start a session',
        description:
          'Sets an HttpOnly, SameSite=Strict session cookie and returns the CSRF token for later authenticated mutations.',
        body: credentialsSchema,
        response: { 200: loginResponse, 400: errorResponse, 401: errorResponse },
      },
    },
    async (request, reply) => {
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
    },
  );

  app.get(
    '/api/auth/me',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Read the current session and CSRF token',
        security: sessionSecurity,
        response: { 200: sessionResponse, 401: errorResponse },
      },
    },
    async (request, reply) => {
      const session = await sessionFor(request, reply);
      if (!session) return;
      return { userId: session.userId, csrfToken: session.csrfToken };
    },
  );

  app.post(
    '/api/auth/logout',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'End the current session',
        security: mutationSecurity,
        response: { 204: { type: 'null' }, 401: errorResponse, 403: errorResponse },
      },
    },
    async (request, reply) => {
      const session = await sessionFor(request, reply, true);
      if (!session) return;
      const token = request.cookies[SESSION_COOKIE];
      if (token) await store.deleteSession(hashToken(token));
      reply.clearCookie(SESSION_COOKIE, { path: '/api' });
      return reply.code(204).send();
    },
  );

  app.post<{ Body: NewTodo }>(
    '/api/todos',
    {
      schema: {
        tags: ['Tasks'],
        summary: 'Create a task',
        security: mutationSecurity,
        body: newTodoSchema,
        response: { 201: todoResponse, 400: errorResponse, 401: errorResponse, 403: errorResponse },
      },
    },
    async (request, reply) => {
      const session = await sessionFor(request, reply, true);
      if (!session) return;
      const title = request.body.title.trim();
      const dueDate = request.body.dueDate ?? null;
      if (!title || (dueDate !== null && !isValidCalendarDate(dueDate))) {
        return reply
          .code(400)
          .send({ error: { code: 'VALIDATION_ERROR', message: 'Provide a title and a valid due date.' } });
      }
      const todo = await store.createTodo(session.userId, title, request.body.description ?? null, dueDate);
      return reply.code(201).send({ todo: publicTodo(todo) });
    },
  );

  app.get<{ Querystring: TodoListOptions }>(
    '/api/todos',
    {
      schema: {
        tags: ['Tasks'],
        summary: 'List your tasks',
        security: sessionSecurity,
        querystring: todoListQuerySchema,
        response: { 200: todosResponse, 400: errorResponse, 401: errorResponse },
      },
    },
    async (request, reply) => {
      const session = await sessionFor(request, reply);
      if (!session) return;
      const result = await store.listTodos(session.userId, request.query);
      return { ...result, todos: result.todos.map(publicTodo) };
    },
  );

  app.get<{ Params: TodoParams }>(
    '/api/todos/:id',
    {
      schema: {
        tags: ['Tasks'],
        summary: 'Read one of your tasks',
        security: sessionSecurity,
        params: todoParams,
        response: { 200: todoResponse, 401: errorResponse, 404: errorResponse },
      },
    },
    async (request, reply) => {
      const session = await sessionFor(request, reply);
      if (!session) return;
      const todo = UUID_PATTERN.test(request.params.id)
        ? await store.findTodo(session.userId, request.params.id)
        : null;
      if (!todo) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Task not found.' } });
      return { todo: publicTodo(todo) };
    },
  );

  app.patch<{ Params: TodoParams; Body: TodoUpdate }>(
    '/api/todos/:id',
    {
      schema: {
        tags: ['Tasks'],
        summary: 'Update task fields or completion',
        security: mutationSecurity,
        params: todoParams,
        body: updateTodoSchema,
        response: { 200: todoResponse, 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse },
      },
    },
    async (request, reply) => {
      const session = await sessionFor(request, reply, true);
      if (!session) return;
      if (!UUID_PATTERN.test(request.params.id)) {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Task not found.' } });
      }
      const changes = { ...request.body };
      if (changes.title !== undefined) {
        changes.title = changes.title.trim();
        if (!changes.title)
          return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Title cannot be blank.' } });
      }
      if (changes.dueDate !== undefined && changes.dueDate !== null && !isValidCalendarDate(changes.dueDate)) {
        return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Provide a valid due date.' } });
      }
      const todo = await store.updateTodo(session.userId, request.params.id, changes);
      if (!todo) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Task not found.' } });
      return { todo: publicTodo(todo) };
    },
  );

  app.delete<{ Params: TodoParams }>(
    '/api/todos/:id',
    {
      schema: {
        tags: ['Tasks'],
        summary: 'Delete one of your tasks',
        security: mutationSecurity,
        params: todoParams,
        response: { 204: { type: 'null' }, 401: errorResponse, 403: errorResponse, 404: errorResponse },
      },
    },
    async (request, reply) => {
      const session = await sessionFor(request, reply, true);
      if (!session) return;
      const deleted =
        UUID_PATTERN.test(request.params.id) && (await store.deleteTodo(session.userId, request.params.id));
      if (!deleted) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Task not found.' } });
      return reply.code(204).send();
    },
  );

  return app;
}
