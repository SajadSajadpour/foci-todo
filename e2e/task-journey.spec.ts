import { randomUUID } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

async function expectAccessible(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
}

test('sign-in and registration pages meet accessibility checks', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await expectAccessible(page);

  await page.getByRole('link', { name: 'Create an account' }).click();
  await expect(page.getByRole('heading', { name: 'A fresh start.' })).toBeVisible();
  await expectAccessible(page);
});

test('a user can create, edit, complete, and delete a task', async ({ page }) => {
  const email = `e2e-${randomUUID()}@example.com`;
  const password = 'LocalE2ePassword123!';

  await page.goto('/register');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Account created. Sign in to get started.')).toBeVisible();

  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'My tasks' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your list starts here.' })).toBeVisible();
  await expectAccessible(page);

  await page.getByRole('link', { name: 'Create your first task' }).click();
  await page.getByRole('textbox', { name: 'Title (required)' }).fill('Plan client handoff');
  await page.getByRole('textbox', { name: 'Description (optional)' }).fill('Draft a clear handoff note.');
  await page.getByLabel('Due date (optional)').fill('2026-10-15');
  const titleBounds = await page.getByRole('textbox', { name: 'Title (required)' }).boundingBox();
  const dateBounds = await page.getByLabel('Due date (optional)').boundingBox();
  if (!titleBounds || !dateBounds) throw new Error('A task form field has no visible bounds.');
  const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(Math.abs(dateBounds.x + dateBounds.width - (titleBounds.x + titleBounds.width))).toBeLessThan(1);
  expect(dateBounds.x + dateBounds.width).toBeLessThanOrEqual(viewportWidth);
  await page.getByRole('button', { name: 'Create task' }).click();
  await expect(page.getByRole('heading', { name: 'Plan client handoff' })).toBeVisible();
  await expect(page.getByText('Oct 15, 2026')).toBeVisible();

  await page.getByRole('link', { name: 'Edit task' }).click();
  const title = page.getByRole('textbox', { name: 'Title (required)' });
  await expect(title).toHaveValue('Plan client handoff');
  await title.fill('  ');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Enter a title for your task.')).toBeVisible();
  await expect(title).toBeFocused();
  await title.fill('Share client handoff');
  await page.getByRole('textbox', { name: 'Description (optional)' }).fill('Updated handoff notes.');
  await page.getByLabel('Due date (optional)').fill('2026-10-16');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: 'Share client handoff' })).toBeVisible();
  await expect(page.getByText('Updated handoff notes.')).toBeVisible();
  await expect(page.getByText('Oct 16, 2026')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Share client handoff' })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Mark complete' }).click();
  await expect(page.getByText('Completed', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reopen task' }).click();
  await expect(page.getByText('Incomplete', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Delete task' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete this task?' });
  await expect(dialog).toBeVisible();
  await expectAccessible(page);
  await dialog.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Delete task' })).toBeFocused();

  await page.getByRole('button', { name: 'Delete task' }).click();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('heading', { name: 'Share client handoff' })).toBeVisible();

  await page.getByRole('button', { name: 'Delete task' }).click();
  await dialog.getByRole('button', { name: 'Delete task' }).click();
  await expect(page.getByRole('heading', { name: 'My tasks' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your list starts here.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(
    true,
  );
});

test('task filters, sort order, and pagination use the persisted task list', async ({ page }) => {
  test.setTimeout(60_000);
  const email = `e2e-list-${randomUUID()}@example.com`;
  const password = 'LocalE2ePassword123!';
  const registration = await page.request.post('/api/auth/register', { data: { email, password } });
  expect(registration.status()).toBe(201);
  const login = await page.request.post('/api/auth/login', { data: { email, password } });
  expect(login.status()).toBe(200);
  const { csrfToken } = await login.json();
  const ids: string[] = [];

  for (let number = 1; number <= 25; number += 1) {
    const response = await page.request.post('/api/todos', {
      headers: { 'X-CSRF-Token': csrfToken },
      data: {
        title: `Task ${String(number).padStart(2, '0')}`,
        dueDate: number === 1 ? '2026-10-20' : number === 2 ? '2026-10-11' : null,
      },
    });
    expect(response.status()).toBe(201);
    ids.push((await response.json()).todo.id);
  }
  for (const id of ids.slice(0, 2)) {
    const response = await page.request.patch(`/api/todos/${id}`, {
      headers: { 'X-CSRF-Token': csrfToken },
      data: { isCompleted: true },
    });
    expect(response.status()).toBe(200);
  }

  await page.goto('/tasks');
  await expect(page.getByRole('heading', { name: 'My tasks' })).toBeVisible();
  await expect(page.locator('.task-row')).toHaveCount(20);
  await expect(page.getByText('Showing 1–20 of 25 tasks')).toBeVisible();
  await expectAccessible(page);

  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('.task-row')).toHaveCount(5);
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await page.getByLabel('Sort by').selectOption('dueSoon');
  await expect(page.getByText('Page 1 of 2')).toBeVisible();
  await expect(page.locator('.task-row-title').first()).toHaveText('Task 02');

  await page.getByRole('button', { name: 'Completed', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Completed', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.task-row')).toHaveCount(2);
  await expect(page.locator('.task-row-title').first()).toHaveText('Task 02');
  await expect(page.getByText('Showing 1–2 of 2 tasks')).toBeVisible();
  await page.getByRole('button', { name: 'Incomplete', exact: true }).click();
  await expect(page.locator('.task-row')).toHaveCount(20);
  await expect(page.getByText('Showing 1–20 of 23 tasks')).toBeVisible();
  await expect(page.getByText('Page 1 of 2')).toBeVisible();

  await page.getByRole('button', { name: 'Completed', exact: true }).click();
  await expect(page.locator('.task-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'Reopen: Task 02' }).click();
  await expect(page.locator('.task-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Reopen: Task 01' }).click();
  await expect(page.getByRole('heading', { name: 'No completed tasks yet.' })).toBeVisible();
  await expect(page.getByText('0 completed tasks')).toBeVisible();
  await expectAccessible(page);
  await page.locator('.tasks-empty').getByRole('button', { name: 'Show all tasks' }).click();
  await expect(page.getByRole('button', { name: 'All tasks', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.task-row')).toHaveCount(20);
});
