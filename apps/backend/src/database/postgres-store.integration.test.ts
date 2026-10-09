import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createPostgresStore } from './postgres-store.js';

function testDatabaseUrl(): string {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) throw new Error('Run this test through npm run test:postgres from the repository root.');
  const url = new URL(value);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.port !== '5434' || url.pathname !== '/foci_todo_test') {
    throw new Error('The PostgreSQL integration test requires the isolated local test database.');
  }
  return value;
}

describe('PostgreSQL task store', () => {
  it('keeps tasks private and returns correctly filtered, sorted pages after reconnecting', async () => {
    const databaseUrl = testDatabaseUrl();
    const first = createPostgresStore(databaseUrl);
    let firstClosed = false;
    let reopened: ReturnType<typeof createPostgresStore> | undefined;

    try {
      const alice = await first.store.createUser(`alice-${randomUUID()}@example.com`, 'test-only-hash');
      const bob = await first.store.createUser(`bob-${randomUUID()}@example.com`, 'test-only-hash');
      const taskIds: string[] = [];

      for (let number = 1; number <= 25; number += 1) {
        const task = await first.store.createTodo(
          alice.id,
          `Task ${String(number).padStart(2, '0')}`,
          null,
          number === 1 ? '2026-10-20' : number === 2 ? '2026-10-11' : null,
        );
        taskIds.push(task.id);
      }
      await first.store.updateTodo(alice.id, taskIds[0], { isCompleted: true });
      await first.store.updateTodo(alice.id, taskIds[1], { isCompleted: true });
      await first.store.createTodo(bob.id, 'Bob private task', null, null);

      const allFirst = await first.store.listTodos(alice.id, { status: 'all', sort: 'title', page: 1 });
      const allSecond = await first.store.listTodos(alice.id, { status: 'all', sort: 'title', page: 2 });
      expect(allFirst).toMatchObject({ total: 25, page: 1, pageSize: 20, totalPages: 2 });
      expect(allFirst.todos.map((task) => task.title)).toEqual(
        Array.from({ length: 20 }, (_, index) => `Task ${String(index + 1).padStart(2, '0')}`),
      );
      expect(allSecond).toMatchObject({ total: 25, page: 2, totalPages: 2 });
      expect(allSecond.todos.map((task) => task.title)).toEqual([
        'Task 21',
        'Task 22',
        'Task 23',
        'Task 24',
        'Task 25',
      ]);
      expect((await first.store.listTodos(alice.id, { status: 'all', sort: 'title', page: 99 })).page).toBe(2);

      const completed = await first.store.listTodos(alice.id, { status: 'completed', sort: 'dueSoon', page: 1 });
      expect(completed.total).toBe(2);
      expect(completed.todos.map((task) => task.title)).toEqual(['Task 02', 'Task 01']);
      const active = await first.store.listTodos(alice.id, { status: 'active', sort: 'dueSoon', page: 1 });
      expect(active.total).toBe(23);
      expect(active.todos.every((task) => !task.isCompleted)).toBe(true);
      expect((await first.store.listTodos(bob.id, { status: 'all', sort: 'newest', page: 1 })).total).toBe(1);

      expect(await first.store.findTodo(bob.id, taskIds[0])).toBeNull();
      expect(await first.store.updateTodo(bob.id, taskIds[0], { title: 'Changed by Bob' })).toBeNull();
      expect(await first.store.deleteTodo(bob.id, taskIds[0])).toBe(false);

      await first.close();
      firstClosed = true;
      reopened = createPostgresStore(databaseUrl);
      expect((await reopened.store.findTodo(alice.id, taskIds[0]))?.title).toBe('Task 01');
      expect((await reopened.store.listTodos(alice.id, { status: 'all', sort: 'newest', page: 1 })).total).toBe(25);
    } finally {
      if (!firstClosed) await first.close();
      await reopened?.close();
    }
  });
});
