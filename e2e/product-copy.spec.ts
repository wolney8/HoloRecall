import { expect, navigate, openApp, test } from './helpers';

const prohibitedLearnerCopy = /local prototype|local workspace|loading local workspace/i;

test('HR-COPY-01 uses finished local-first copy across learner routes', async ({ page }) => {
  await openApp(page);
  const disclosure = page.locator('.sidebar-footer');
  await expect(disclosure.getByText('Stored on this device', { exact: true })).toBeVisible();
  await expect(disclosure).toContainText('No cloud account or sync.');
  await expect(disclosure).toContainText('Export backups from Settings.');
  for (const destination of ['Decks', 'Focus', 'Collection', 'Design Studio', 'Progress', 'Exchange', 'Settings']) {
    await navigate(page, destination);
    await expect(page.locator('body')).not.toContainText(prohibitedLearnerCopy);
  }
});

test('HR-COPY-01 @ios-compact keeps local-data disclosure usable at 200% text', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await openApp(page);
  await page.addStyleTag({ content: 'html{font-size:200%;-webkit-text-size-adjust:200%;text-size-adjust:200%}' });
  await navigate(page, 'Settings');
  const disclosure = page.getByText(/stored on this device and is not synced to a cloud account/i);
  await expect(disclosure).toBeVisible();
  await expect(page.locator('body')).not.toContainText(prohibitedLearnerCopy);
  expect(await disclosure.evaluate(element => {
    const box = element.getBoundingClientRect();
    return box.left >= 0 && box.right <= document.documentElement.clientWidth && element.scrollWidth <= element.clientWidth;
  })).toBe(true);
});

test('HR-COPY-01 presents an actionable product-level storage error', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: undefined }));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Local data storage is unavailable. Enable storage for HoloRecall on this device, then reload.');
  await expect(page.getByRole('button', { name: 'Reload local data' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Loading HoloRecall', exact: true })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(prohibitedLearnerCopy);
});
