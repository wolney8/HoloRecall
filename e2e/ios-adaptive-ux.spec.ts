import { test, expect, openApp, expectNoOverflow } from './helpers';

test('HR-IOS-UX phone navigation and tap-to-reveal keep Study stable @ios-large', async ({ page }) => {
  await openApp(page);
  const primary = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(primary.getByRole('button')).toHaveCount(5);
  const labels = (await primary.getByRole('button').allInnerTexts()).map(value => value.replace(/[^A-Za-z ]/g, '').trim());
  expect(labels).toEqual(['Decks', 'Study', 'Collection', 'Progress', 'More']);
  await primary.getByRole('button', { name: /More/ }).click();
  await expect(page.getByRole('navigation', { name: 'Secondary navigation' })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: /Start studying/ }).click();
  const stage = page.getByTestId('study-deck-stage');
  await expect(stage.locator('[role="button"]')).toHaveAttribute('aria-label', 'Show card answer');
  const before = await stage.boundingBox();
  const scrollBefore = await page.evaluate(() => scrollY);
  await stage.locator('[role="button"]').click({ position: { x: 120, y: 120 } });
  await expect(page.getByRole('button', { name: /1 Again Forgot/ })).toBeVisible();
  await page.waitForTimeout(850);
  const after = await stage.boundingBox();
  expect(after).toEqual(before);
  expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
  await expect(page.getByRole('button', { name: /Reveal answer/ })).toBeHidden();
  for (const rating of [1, 2, 3, 4, 5]) {
    const choice = page.getByRole('button', { name: new RegExp(`^${rating} `) });
    await expect(choice).toBeVisible();
    expect((await choice.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  }
  await expectNoOverflow(page);
  await page.getByRole('button', { name: /3 Good Some hesitation/ }).click();
  await expect(page.getByTestId('study-deck-stage').locator('[role="button"]')).toBeVisible();
  await page.getByRole('button', { name: 'End session' }).click();
  await expect(page.getByRole('heading', { name: /Study saved|Nice work/ })).toBeVisible();
  await expect(primary).toBeHidden();
  const done = (await page.getByRole('button', { name: 'Done', exact: true }).boundingBox())!;
  expect(done.y + done.height).toBeLessThanOrEqual(page.viewportSize()!.height);
});

test('HR-IOS-UX wide Study retains the right-hand controls and keyboard reveal', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openApp(page);
  await page.getByRole('button', { name: /Start studying/ }).click();
  await expect(page.getByText('Keyboard shortcuts')).toBeVisible();
  await expect(page.getByText(/Space.*Enter.*reveals/)).toBeAttached();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Rate your recall' })).toBeVisible();
  const stage = (await page.getByTestId('study-deck-stage').boundingBox())!;
  const ratings = (await page.locator('.ratings').boundingBox())!;
  expect(ratings.x).toBeGreaterThan(stage.x + stage.width);
});
