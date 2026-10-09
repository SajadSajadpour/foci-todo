import { createReadStream } from 'node:fs';
import { createRequire } from 'node:module';
import swagger from '@fastify/swagger';
import type { FastifyInstance } from 'fastify';

const require = createRequire(import.meta.url);
const swaggerCss = require.resolve('swagger-ui-dist/swagger-ui.css');
const swaggerBundle = require.resolve('swagger-ui-dist/swagger-ui-bundle.js');

const swaggerHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Foci Tasks API · Swagger UI</title>
  <link rel="stylesheet" href="/api/docs/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/api/docs/swagger-ui-bundle.js" defer></script>
  <script src="/api/docs/init.js" defer></script>
</body>
</html>`;

const swaggerInit = `window.ui = SwaggerUIBundle({
  url: '/api/docs/json',
  dom_id: '#swagger-ui',
  deepLinking: true,
  displayRequestDuration: true,
  persistAuthorization: false,
  withCredentials: true,
  presets: [SwaggerUIBundle.presets.apis],
  layout: 'BaseLayout'
});`;

export const sessionSecurity = [{ sessionCookie: [] }];
export const mutationSecurity = [{ sessionCookie: [], csrfToken: [] }];

export const errorResponse = {
  type: 'object',
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
} as const;

const userSchema = {
  type: 'object',
  required: ['id', 'email'],
  properties: {
    id: { type: 'string' },
    email: { type: 'string' },
  },
} as const;

const todoSchema = {
  type: 'object',
  required: ['id', 'title', 'description', 'dueDate', 'isCompleted', 'createdAt'],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string', nullable: true },
    dueDate: { type: 'string', nullable: true, description: 'Calendar date in YYYY-MM-DD format.' },
    isCompleted: { type: 'boolean' },
    createdAt: { type: 'string', description: 'ISO 8601 timestamp.' },
  },
} as const;

export const userResponse = { type: 'object', required: ['user'], properties: { user: userSchema } } as const;
export const loginResponse = {
  type: 'object',
  required: ['user', 'csrfToken'],
  properties: { user: userSchema, csrfToken: { type: 'string' } },
} as const;
export const sessionResponse = {
  type: 'object',
  required: ['userId', 'csrfToken'],
  properties: { userId: { type: 'string' }, csrfToken: { type: 'string' } },
} as const;
export const todoResponse = { type: 'object', required: ['todo'], properties: { todo: todoSchema } } as const;
export const todosResponse = {
  type: 'object',
  required: ['todos', 'total', 'page', 'pageSize', 'totalPages'],
  properties: {
    todos: { type: 'array', items: todoSchema },
    total: { type: 'integer', minimum: 0 },
    page: { type: 'integer', minimum: 1 },
    pageSize: { type: 'integer', minimum: 1 },
    totalPages: { type: 'integer', minimum: 1 },
  },
} as const;
export const todoParams = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', description: 'Task UUID. An unknown or invalid ID returns 404.' } },
} as const;

export async function registerApiDocs(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Foci Tasks API',
        version: '1.0.0',
        description:
          'Personal task API. Log in to receive an HttpOnly session cookie and a CSRF token. Send the token in X-CSRF-Token for authenticated state-changing requests.',
      },
      tags: [
        { name: 'Health', description: 'Service status' },
        { name: 'Authentication', description: 'Account and session management' },
        { name: 'Tasks', description: 'Private task operations' },
      ],
      components: {
        securitySchemes: {
          sessionCookie: {
            type: 'apiKey',
            in: 'cookie',
            name: 'foci_session',
            description: 'HttpOnly session cookie set by login. The browser sends it automatically.',
          },
          csrfToken: {
            type: 'apiKey',
            in: 'header',
            name: 'X-CSRF-Token',
            description: 'Token returned by login or GET /api/auth/me. Required for authenticated mutations.',
          },
        },
      },
    },
  });
  // Only these named UI assets are served; no arbitrary filesystem path reaches the API.
  app.get('/api/docs', { schema: { hide: true } }, async (_request, reply) => reply.redirect('/api/docs/'));
  app.get('/api/docs/', { schema: { hide: true } }, async (_request, reply) =>
    reply.type('text/html; charset=utf-8').send(swaggerHtml),
  );
  app.get('/api/docs/json', { schema: { hide: true } }, async (_request, reply) => reply.send(app.swagger()));
  app.get('/api/docs/swagger-ui.css', { schema: { hide: true } }, async (_request, reply) =>
    reply.type('text/css; charset=utf-8').send(createReadStream(swaggerCss)),
  );
  app.get('/api/docs/swagger-ui-bundle.js', { schema: { hide: true } }, async (_request, reply) =>
    reply.type('application/javascript; charset=utf-8').send(createReadStream(swaggerBundle)),
  );
  app.get('/api/docs/init.js', { schema: { hide: true } }, async (_request, reply) =>
    reply.type('application/javascript; charset=utf-8').send(swaggerInit),
  );
}
