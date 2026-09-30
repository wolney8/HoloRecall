import { test as base, expect, type Page } from '@playwright/test';
import type { State } from '../src/domain/models';

export const test = base.extend<{ runtimeErrors: void }>({
  runtimeErrors: [async ({ page }, use, testInfo) => {
    const pageErrors: string[] = [], consoleErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await use();
    if (consoleErrors.length) await testInfo.attach('browser-console-errors', { body: consoleErrors.join('\n'), contentType: 'text/plain' });
    expect(pageErrors, 'No unhandled application errors').toEqual([]);
    if (!testInfo.title.includes('offline')) expect(consoleErrors, 'No online console errors').toEqual([]);
  }, { auto: true }],
});
export { expect };
export async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Study dashboard', exact: true })).toBeVisible();
  await expect(page.getByTestId('today-count')).toContainText('0');
}
export async function navigate(page: Page, name: string): Promise<void> {
  const button = page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name, exact: false });
  if (await button.isVisible()) { await button.click(); return; }
  // Focused Study intentionally hides navigation. End it explicitly so tests follow the real user path.
  if (name === 'Study' && await page.getByRole('heading', { name: 'Study', exact: true }).isVisible()) return;
  const end = page.getByRole('button', { name: 'End session', exact: true });
  if (await end.isVisible()) {
    await end.click();
    await expect(page.getByRole('heading', { name: /Study saved|Nice work/ })).toBeVisible();
    await button.click();
    return;
  }
  await button.click();
}
export async function selectMaterial(page: Page, label: string, option: string): Promise<void> {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}
export async function snapshot(page: Page): Promise<State> {
  return page.evaluate(() => new Promise<State>((resolve, reject) => {
    const request = indexedDB.open('holorecall-local-v1', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, transaction = db.transaction('local-study', 'readonly'), read = transaction.objectStore('local-study').get('snapshot');
      read.onsuccess = () => resolve(read.result as State); read.onerror = () => reject(read.error); transaction.oncomplete = () => db.close();
    };
  }));
}
export async function confidentReview(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Reveal answer/ }).click();
  await expect(page.getByRole('heading', { name: 'il limone', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /4 Good Confident/ }).click();
  await expect(page.locator('.session-bar')).toContainText('1 / 10');
}
export async function expectNoOverflow(page: Page): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
}
