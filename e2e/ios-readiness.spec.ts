import { test, expect, expectNoOverflow, navigate, openApp, snapshot } from './helpers';

test('HR-IOS lifecycle interruption checkpoints time and never duplicates an accepted review', async ({ page }) => {
  await openApp(page);
  await navigate(page, 'Settings');
  await page.getByLabel('New cards per day').fill('1');
  await page.getByRole('button', { name: 'Save study settings' }).click();
  await navigate(page, 'Dashboard');
  await page.getByRole('button', { name: /Start studying/ }).click();
  // Two complete timer intervals avoid coupling the assertion to the interval's
  // phase relative to route entry.
  await page.waitForTimeout(2_200);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect.poll(async () => (await snapshot(page)).session?.activeMs ?? 0).toBeGreaterThan(1_000);
  const pausedAt = (await snapshot(page)).session!.activeMs;
  await page.waitForTimeout(1_100);
  expect((await snapshot(page)).session!.activeMs).toBe(pausedAt);
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await page.getByRole('button', { name: /Reveal answer/ }).click();
  await page.getByRole('button', { name: /4 Good Confident/ }).click();
  await expect(page.getByRole('heading', { name: 'Nice work' })).toBeVisible();
  const accepted = await snapshot(page);
  expect(accepted.events.filter(event => event.kind === 'review')).toHaveLength(1);
  await page.evaluate(() => { window.dispatchEvent(new Event('pagehide')); window.dispatchEvent(new Event('pageshow')); });
  await expect(page.locator('.motion-waiting')).toHaveCount(0);
  await page.reload();
  const recovered = await snapshot(page);
  expect(recovered.events).toEqual(accepted.events);
  expect(recovered.rewardEvents).toEqual(accepted.rewardEvents);
});

test('HR-IOS loaded-page offline Study remains usable in WebKit and recovery keeps its review @ios-large', async ({ page, context }) => {
  await openApp(page);
  await navigate(page, 'Settings');
  await page.getByLabel('New cards per day').fill('1');
  await page.getByRole('button', { name: 'Save study settings' }).click();
  await navigate(page, 'Dashboard');
  await page.getByRole('button', { name: /Start studying/ }).click();
  await context.setOffline(true);
  await page.getByTestId('study-deck-stage').locator('[role="button"]').click({ position: { x: 100, y: 100 } });
  await page.getByRole('button', { name: /4 Good Confident/ }).click();
  expect((await snapshot(page)).events.filter(event => event.kind === 'review')).toHaveLength(1);
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Nice work' })).toBeVisible();
});

test('HR-IOS compact portrait preserves safe-area layout, stable reveal and touch targets @ios-compact', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: /Start studying/ }).click();
  const stage = page.getByTestId('study-deck-stage');
  const reveal = stage.locator('[role="button"]');
  await reveal.scrollIntoViewIfNeeded();
  const before = await stage.boundingBox();
  const scrollBefore = await page.evaluate(() => scrollY);
  expect((await reveal.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await reveal.click();
  await page.waitForTimeout(180);
  const during = await stage.boundingBox();
  await page.waitForTimeout(650);
  const after = await stage.boundingBox();
  for (const bounds of [during, after]) {
    expect(Math.abs(bounds!.x - before!.x)).toBeLessThanOrEqual(.5);
    expect(Math.abs(bounds!.y - before!.y)).toBeLessThanOrEqual(.5);
    expect(Math.abs(bounds!.width - before!.width)).toBeLessThanOrEqual(.5);
    expect(Math.abs(bounds!.height - before!.height)).toBeLessThanOrEqual(.5);
  }
  expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
  expect(await page.evaluate(() => CSS.supports('padding-top', 'env(safe-area-inset-top)'))).toBe(true);
  await expectNoOverflow(page);
  expect((await page.getByRole('button', { name: /1 Again Forgot/ }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test('HR-IOS large portrait supports 200 percent text and keyboard-sized viewport changes @ios-large', async ({ page }) => {
  await openApp(page);
  await navigate(page, 'Decks');
  await page.getByRole('button', { name: /Create a card/ }).click();
  await page.evaluate(() => document.documentElement.style.setProperty('-webkit-text-size-adjust', '200%'));
  const front = page.getByLabel('Front text / library prompt');
  await front.focus();
  await page.setViewportSize({ width: 430, height: 500 });
  await page.waitForTimeout(100);
  const field = await front.boundingBox();
  expect(field).toBeTruthy();
  expect(field!.y + field!.height).toBeLessThanOrEqual(500);
  await front.fill('A long but valid enlarged-text prompt');
  await expectNoOverflow(page);
  await expect(page.getByRole('button', { name: 'Save card' })).toBeAttached();
});

test('HR-IOS landscape keeps Collection and Design Studio usable without hover @ios-landscape', async ({ page }, testInfo) => {
  await openApp(page);
  await navigate(page, 'Collection');
  const card = page.locator('.inspection-card .card-motion');
  await card.tap();
  await expect(card).toHaveAttribute('aria-label', 'Show card answer');
  await expectNoOverflow(page);
  await navigate(page, 'Design Studio');
  await expect(page.getByRole('heading', { name: 'Design Suite' })).toBeVisible();
  await expectNoOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('design-suite-landscape.png'), fullPage: true });
  const firstInput = page.locator('input').first();
  if (await firstInput.count()) { await firstInput.focus(); await expect(firstInput).toBeFocused(); }
});

test('HR-IOS reduced motion remains static in WebKit while theme choice survives reload @ios-compact', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await openApp(page);
  await navigate(page, 'Settings');
  await page.getByRole('radio', { name: 'Dark' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await navigate(page, 'Collection');
  const card = page.locator('.inspection-card .card-motion');
  await card.tap();
  await expect(card).toHaveAttribute('aria-label', 'Show card answer');
  expect(await page.locator('.inspection-card .card-turn').evaluate(node => node.getAnimations().length)).toBe(0);
});
