import { test, expect, expectNoOverflow, navigate, openApp } from './helpers';

async function animationSample(locator: import('@playwright/test').Locator): Promise<{ current: number; duration: number; delay: number }> {
  return locator.evaluate(element => {
    const animation = element.getAnimations()[0];
    const timing = animation.effect!.getTiming();
    return { current: Number(animation.currentTime), duration: Number(timing.duration), delay: Number(timing.delay) };
  });
}

test('HR-UX-12 visible blocks animate, offscreen progress waits, and settled blocks do not replay', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 520 });
  await openApp(page);
  await navigate(page, 'Progress');

  const heading = page.locator('hr-progress .page-heading.hr-reveal');
  await expect(heading).toHaveAttribute('data-reveal-state', 'active');
  const headingMotion = await animationSample(heading);
  expect(headingMotion.current).toBeGreaterThanOrEqual(0);
  expect(headingMotion.current).toBeLessThan(headingMotion.duration + headingMotion.delay);
  expect(headingMotion.duration).toBeGreaterThanOrEqual(350);
  expect(headingMotion.duration).toBeLessThanOrEqual(550);

  const cosmetics = page.getByRole('heading', { name: 'Earned cosmetics' }).locator('xpath=ancestor::section[1]');
  await expect(cosmetics).toHaveAttribute('data-reveal-state', 'waiting');
  await page.waitForTimeout(650);
  await expect(cosmetics).toHaveAttribute('data-reveal-state', 'waiting');
  expect(await cosmetics.evaluate(element => element.getAnimations().length)).toBe(0);

  await cosmetics.scrollIntoViewIfNeeded();
  await expect(cosmetics).toHaveAttribute('data-reveal-state', 'active');
  await page.waitForTimeout(90);
  const sectionMotion = await animationSample(cosmetics);
  expect(sectionMotion.current).toBeGreaterThan(0);
  expect(sectionMotion.current).toBeLessThan(sectionMotion.duration);
  const decorativeProgress = cosmetics.locator('mat-progress-bar').first();
  if (await decorativeProgress.count()) expect(await decorativeProgress.evaluate(element => element.getAnimations().length)).toBeGreaterThan(0);
  await page.waitForTimeout(650);
  await expect(cosmetics).toHaveAttribute('data-reveal-state', 'settled');
  await page.evaluate(() => scrollTo(0, 0));
  await cosmetics.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await expect(cosmetics).toHaveAttribute('data-reveal-state', 'settled');
  expect(await cosmetics.evaluate(element => element.getAnimations().length)).toBe(0);
});

test('HR-UX-12 page inventory uses shared block motion without touching Study or Results ownership', async ({ page }) => {
  await openApp(page);
  const coverage: Array<[string, string, number]> = [
    ['Dashboard', '.page-heading.hr-reveal,.study-summary.hr-reveal,.metrics.hr-reveal,.deck-tile.hr-reveal', 4],
    ['Decks', '.deck-journey.hr-reveal', 1],
    ['Collection', 'hr-collection .hr-reveal', 5],
    ['Design Studio', 'hr-design-studio .hr-reveal', 3],
    ['Progress', 'hr-progress .hr-reveal', 10],
    // Exchange renders one heading and one focused active view; inactive Import/Export/Templates views are not mounted together.
    ['Import / export', 'hr-exchange .hr-reveal', 2],
    ['Settings', '.settings-grid .hr-reveal', 2],
  ];
  const headings: Record<string, string> = { Decks: 'Decks', Collection: 'Collection', 'Design Studio': 'Design Suite', Progress: 'Progress', 'Import / export': 'Exchange', Settings: 'Settings' };
  for (const [pageName, selector, minimum] of coverage) {
    if (pageName !== 'Dashboard') { await navigate(page, pageName); await expect(page.getByRole('heading', { name: headings[pageName], exact: true })).toBeVisible(); }
    await expect.poll(()=>page.locator(selector).count(),{message:`${pageName} shared reveal coverage`}).toBeGreaterThanOrEqual(minimum);
    if (process.env['HOLORECALL_VIDEO'] === '1') {
      await page.waitForTimeout(260);
      await page.evaluate(() => scrollBy({ top: 620, behavior: 'smooth' }));
      await page.waitForTimeout(560);
    } else {
      await page.mouse.wheel(0, 420);
      await page.waitForTimeout(120);
    }
  }

  await navigate(page, 'Dashboard');
  await page.getByRole('button', { name: /Start studying/ }).click();
  await expect(page.getByTestId('study-deck-stage')).toBeVisible();
  await expect(page.locator('.study-card-area.hr-reveal,.study-controls.hr-reveal')).toHaveCount(0);
  await page.getByRole('button', { name: 'End session' }).click();
  await expect(page.getByRole('heading', { name: 'Study saved' })).toBeVisible();
  await expect(page.locator('.results [data-result-section].hr-reveal')).toHaveCount(0);
});

test('HR-UX-12 stable filtering, focus, theme changes and backgrounding do not replay or hide content', async ({ page }) => {
  await openApp(page);
  await navigate(page, 'Decks');
  await page.getByRole('tab',{name:'Search cards'}).click();
  const firstRow = page.locator('.card-list-row').first();
  await firstRow.scrollIntoViewIfNeeded();
  await expect(firstRow).toHaveAttribute('data-reveal-state', /active|settled/);
  await page.waitForTimeout(600);
  const answer = (await firstRow.locator('h3').textContent())!.trim();
  await page.getByLabel('Search decks and cards').fill(answer);
  await expect(firstRow).toHaveAttribute('data-reveal-state', 'settled');
  expect(await firstRow.evaluate(element => element.getAnimations().length)).toBe(0);

  await firstRow.getByRole('button', { name: new RegExp(`Edit ${answer}`) }).click();
  const editor = page.locator('.authoring-panel.hr-reveal');
  await expect(page.getByLabel('Front text / library prompt')).toBeFocused();
  await expect(editor).toHaveAttribute('data-reveal-state', 'settled');

  await navigate(page, 'Progress');
  const heading = page.locator('hr-progress .page-heading.hr-reveal');
  await expect(heading).toHaveAttribute('data-reveal-state', 'active');
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect(heading).toHaveAttribute('data-reveal-state', 'settled');
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await page.locator('html').evaluate(element=>element.setAttribute('data-theme','dark'));
  await page.locator('html').evaluate(element=>element.setAttribute('data-theme','system'));
  await expect(heading).toHaveAttribute('data-reveal-state', 'settled');
  expect(await heading.evaluate(element => element.getAnimations().length)).toBe(0);
});

test('HR-UX-12 reduced motion and disabled effects settle every block immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  await navigate(page, 'Collection');
  await expect(page.locator('hr-collection .hr-reveal[data-reveal-state="waiting"]')).toHaveCount(0);
  await expect(page.locator('hr-collection .hr-reveal[data-reveal-state="active"]')).toHaveCount(0);
  expect(await page.locator('hr-collection .hr-reveal').evaluateAll(elements => elements.every(element => element.getAnimations().length === 0))).toBe(true);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await navigate(page, 'Settings');
  await page.getByRole('switch', { name: 'Card effects' }).click();
  await expect(page.locator('.hr-reveal[data-reveal-state="waiting"],.hr-reveal[data-reveal-state="active"]')).toHaveCount(0);
  await navigate(page, 'Progress');
  await expect(page.locator('hr-progress .hr-reveal[data-reveal-state="settled"]')).not.toHaveCount(0);
  expect(await page.locator('hr-progress .hr-reveal').evaluateAll(elements => elements.every(element => element.getAnimations().length === 0))).toBe(true);
});

test('HR-UX-12 compact pages keep touch scrolling and enlarged blocks usable @ios-compact', async ({ page }) => {
  await openApp(page);
  await navigate(page, 'Collection');
  await page.locator('.sample-section').scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  await expectNoOverflow(page);
  const visible = page.locator('hr-collection .hr-reveal').filter({ visible: true });
  expect(await visible.count()).toBeGreaterThan(0);
  await navigate(page, 'Progress');
  await page.evaluate(() => document.documentElement.style.setProperty('-webkit-text-size-adjust', '200%'));
  await page.getByRole('heading', { name: 'Self-reported recall' }).scrollIntoViewIfNeeded();
  await expectNoOverflow(page);
  await expect(page.getByRole('heading', { name: 'Self-reported recall' })).toBeAttached();
});

test('HR-UX-12 landscape navigation settles visible Design Studio blocks @ios-landscape', async ({ page }) => {
  await openApp(page);
  await navigate(page, 'Design Studio');
  const preview = page.locator('.studio-preview.hr-reveal');
  await preview.scrollIntoViewIfNeeded();
  await expect(preview).toHaveAttribute('data-reveal-state', /active|settled/);
  await expectNoOverflow(page);
  await page.getByLabel('Design Set name').focus();
  await expect(page.locator('.studio-editor.hr-reveal')).toHaveAttribute('data-reveal-state', 'settled');
});
