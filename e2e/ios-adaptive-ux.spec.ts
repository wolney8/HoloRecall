import { test, expect, openApp, expectNoOverflow } from './helpers';

test('HR-IOS-UX phone navigation and tap-to-reveal keep Study stable @ios-large', async ({ page }) => {
  await openApp(page);
  const primary = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(primary.getByRole('button')).toHaveCount(4);
  const labels = (await primary.getByRole('button').allInnerTexts()).map(value => value.replace(/[^A-Za-z ]/g, '').trim());
  expect(labels).toEqual(['Decks', 'Study', 'Collection', 'More']);
  const tracks = await primary.getByRole('button').evaluateAll(buttons => buttons.map(button => {
    const box = button.getBoundingClientRect(), label = button.querySelector('span:last-child') as HTMLElement;
    return { width: box.width, labelContained: label.scrollWidth <= label.clientWidth, whiteSpace: getComputedStyle(label).whiteSpace };
  }));
  expect(Math.max(...tracks.map(track => track.width)) - Math.min(...tracks.map(track => track.width))).toBeLessThan(1);
  expect(tracks.every(track => track.labelContained && track.whiteSpace === 'nowrap')).toBe(true);
  await primary.getByRole('button', { name: /More/ }).click();
  const secondary = page.getByRole('navigation', { name: 'Secondary navigation' });
  await expect(secondary).toBeVisible();
  await expect(secondary.getByRole('button', { name: /Progress/ })).toBeVisible();
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

test('HR-NAV-01 uses one semantic context trail on wide layouts', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openApp(page);
  await page.getByRole('button', { name: /Create a card/ }).click();
  const trail = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(trail).toBeVisible();
  await expect(trail).toContainText('Decks');
  await expect(trail).toContainText('New card');
  await expect(trail.locator('[aria-current="page"]')).toHaveText('New card');
  await trail.getByRole('button', { name: 'Decks', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Decks', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Create card' })).toBeHidden();
});

test('HR-IOS-UX-11 keeps compact navigation aligned at enlarged text @ios-compact @ios-large @ios-landscape', async ({ page }) => {
  await openApp(page);
  await page.addStyleTag({ content: 'html{font-size:200%;-webkit-text-size-adjust:200%;text-size-adjust:200%}' });
  const primary = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(primary.getByRole('button')).toHaveCount(4);
  const layout = await primary.getByRole('button').evaluateAll(buttons => buttons.map(button => {
    const box = button.getBoundingClientRect(), icon = button.querySelector('.nav-symbol')!.getBoundingClientRect(), label = button.querySelector('span:last-child') as HTMLElement;
    return { width: box.width, icon: [icon.width, icon.height], labelContained: label.scrollWidth <= label.clientWidth, whiteSpace: getComputedStyle(label).whiteSpace };
  }));
  expect(Math.max(...layout.map(item => item.width)) - Math.min(...layout.map(item => item.width))).toBeLessThan(1);
  expect(new Set(layout.map(item => item.icon.join('x'))).size).toBe(1);
  expect(layout.every(item => item.labelContained && item.whiteSpace === 'nowrap')).toBe(true);
  await expectNoOverflow(page);
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
