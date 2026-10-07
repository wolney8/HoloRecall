import { test, expect, openApp, revealCard, snapshot } from './helpers';

test('HR-UX-13 wide Study reserves an aligned right-hand rating panel with accessible help', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openApp(page);
  await page.getByRole('button', { name: /Start studying/ }).click();
  const stage = page.getByTestId('study-deck-stage');
  const controls = page.locator('.study-controls');
  const before = await stage.boundingBox();
  const reserved = await controls.boundingBox();
  expect(before).toBeTruthy(); expect(reserved).toBeTruthy();
  expect(reserved!.x).toBeGreaterThan(before!.x + before!.width);
  await revealCard(page);
  const after = await stage.boundingBox();
  expect(after).toEqual(before);
  const rows = page.locator('.rating-row');
  await expect(rows).toHaveCount(5);
  const columns = await rows.evaluateAll(items => items.map(item => {
    const button = item.querySelector('.rating-choice')!, number = item.querySelector('.rating-number')!, grade = item.querySelector('.rating-grade')!, label = item.querySelector('.rating-label')!, info = item.querySelector('.rating-info')!;
    return [button, number, grade, label, info].map(node => Math.round(node.getBoundingClientRect().x));
  }));
  expect(new Set(columns.map(value => value.join(':'))).size).toBe(1);
  expect(await page.locator('.rating-content small').count()).toBe(0);

  const info = page.getByRole('button', { name: 'About rating 4: Confident' });
  await info.hover();
  await expect(page.locator('.mat-mdc-tooltip')).toContainText('Correct and confident.');
  await page.mouse.move(20, 20);
  await info.focus();
  await expect(page.locator('.mat-mdc-tooltip')).toContainText('Correct and confident.');
  await info.click();
  expect((await snapshot(page)).events).toHaveLength(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.mat-mdc-tooltip')).toBeHidden();
});

test('HR-UX-14 accepted feedback retains the rated card before the next deal', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: /Start studying/ }).click();
  await page.getByRole('button', { name: /Reveal answer/ }).click();
  const answer = page.locator('.study-card-area .answer h3, .study-card-area .answer-text').first();
  const original = await answer.textContent();
  const rating = page.getByRole('button', { name: /4 Good Confident/ });
  await rating.click();
  await expect.poll(async () => (await snapshot(page)).events.length).toBe(1);
  await expect(page.locator('.confidence-feedback[data-rating="4"]')).toBeVisible();
  await expect(answer).toContainText(original!.trim());
  await expect(rating).toBeDisabled();
  await page.waitForTimeout(500);
  await expect(answer).toContainText(original!.trim());
  await expect(page.locator('.study-layout')).toHaveAttribute('data-study-transition', 'feedback');
  await expect.poll(async () => (await page.locator('.session-bar').textContent()) ?? '', { timeout: 4_000 }).toContain('1 / 10');
  await expect(page.locator('.study-layout')).toHaveAttribute('data-study-transition', 'idle');
});

test('HR-UX-14 last-card feedback completes before Results and reduced motion settles promptly', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Settings', exact: false }).click();
  await page.getByLabel('New cards per day').fill('1');
  await page.getByRole('button', { name: 'Save study settings' }).click();
  await page.getByRole('button', { name: 'Dashboard', exact: false }).click();
  await page.getByRole('button', { name: /Start studying/ }).click();
  await page.getByRole('button', { name: /Reveal answer/ }).click();
  await page.getByRole('button', { name: /5 Easy Effortless/ }).click();
  await expect(page.locator('.confidence-feedback[data-rating="5"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nice work', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Nice work', exact: true })).toBeVisible({ timeout: 4_000 });
  const persisted = await snapshot(page);
  expect(persisted.events).toHaveLength(1);
  const activeMs = persisted.events[0].kind === 'review' ? persisted.events[0].activeMs! : -1;
  await page.waitForTimeout(1_000);
  const after = await snapshot(page);
  expect(after.events).toHaveLength(1);
  expect(after.events[0].kind === 'review' ? after.events[0].activeMs : -2).toBe(activeMs);
});

test('HR-UX-15 real unlock waits for completed progress and Skip/Replay stay presentation-only', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Settings', exact: false }).click();
  await page.getByLabel('New cards per day').fill('1');
  await page.getByRole('button', { name: 'Save study settings' }).click();
  await page.getByRole('button', { name: 'Dashboard', exact: false }).click();
  await page.getByRole('button', { name: /Start studying/ }).click();
  await page.getByRole('button', { name: /Reveal answer/ }).click();
  await page.getByRole('button', { name: /4 Good Confident/ }).click();
  await expect(page.getByRole('heading', { name: 'Nice work', exact: true })).toBeVisible();
  const stored = await snapshot(page), eventCount = stored.events.length, rewardCount = stored.rewardEvents.length;
  const progress = page.locator('[data-result-section="cosmetics"]');
  await page.locator('.unlock-reveal').evaluate(node=>{const phases:string[]=[];(window as unknown as {__unlockPhases:string[]}).__unlockPhases=phases;const record=()=>phases.push((node as HTMLElement).dataset['unlockPhase']??'');record();new MutationObserver(record).observe(node,{attributes:true,attributeFilter:['data-unlock-phase']});});
  await progress.scrollIntoViewIfNeeded();
  await expect(page.locator('.unlock-reveal')).toHaveAttribute('data-unlock-phase', 'waiting');
  await expect.poll(() => page.locator('.result-bar i').first().evaluate(node => getComputedStyle(node).width), { timeout: 2_000 }).not.toBe('0px');
  await expect(page.locator('.unlock-reveal')).toHaveAttribute('data-unlock-phase', 'revealed', { timeout: 3_000 });
  expect(await page.evaluate(()=>(window as unknown as {__unlockPhases:string[]}).__unlockPhases)).toEqual(expect.arrayContaining(['waiting','complete','pack','revealed']));
  const bar = page.locator('.result-bar').first();
  const fill = page.locator('.result-bar i').first();
  expect(Math.abs((await fill.boundingBox())!.width - (await bar.boundingBox())!.width)).toBeLessThan(2);
  await expect(page.locator('.unlock-feature')).toContainText('Unlocked');
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await page.getByRole('button', { name: 'Skip animation', exact: true }).click();
  await expect(page.locator('.unlock-reveal')).toHaveAttribute('data-unlock-phase', 'settled');
  expect((await snapshot(page)).events).toHaveLength(eventCount);
  expect((await snapshot(page)).rewardEvents).toHaveLength(rewardCount);
});

test('HR-UX-15 queues multiple real unlocks and Collection reuses their persisted events', async ({ page }) => {
  await openApp(page); await page.getByRole('button', { name: 'Settings', exact: false }).click();
  await page.getByLabel('New cards per day').fill('2'); await page.getByRole('button', { name: 'Save study settings' }).click();
  await page.getByRole('button', { name: 'Dashboard', exact: false }).click(); await page.getByRole('button', { name: /Start studying/ }).click();
  for (let review = 0; review < 2; review++) { await page.getByRole('button', { name: /Reveal answer/ }).click(); await page.getByRole('button', { name: /4 Good Confident/ }).click(); if (!review) await expect(page.locator('.session-bar')).toContainText('1 / 2'); }
  await expect(page.getByRole('heading', { name: 'Nice work' })).toBeVisible(); const before = await snapshot(page); expect(before.rewardEvents.filter(event => event.kind === 'unlock')).toHaveLength(2);
  await page.locator('[data-result-section="cosmetics"]').scrollIntoViewIfNeeded(); await expect(page.locator('.unlock-reveal')).toContainText('UNLOCK 1 OF 2'); await expect(page.locator('.unlock-reveal')).toHaveAttribute('data-unlock-phase', 'revealed', { timeout: 5_000 });
  await page.getByRole('button', { name: 'Continue', exact: true }).click(); await expect(page.locator('.unlock-reveal')).toContainText('UNLOCK 2 OF 2'); await expect(page.locator('.unlock-reveal')).toHaveAttribute('data-unlock-phase', 'revealed', { timeout: 5_000 });
  await page.getByRole('button', { name: 'View in Collection' }).click(); await expect(page.getByRole('heading', { name: 'Recently unlocked' })).toBeVisible(); await expect(page.locator('.recent-unlocks .collection-item')).toHaveCount(2); expect((await snapshot(page)).rewardEvents).toEqual(before.rewardEvents);
});

test('HR-UX-13 @ios-compact stacks readable controls below the stable card at 200% text', async ({ page }) => {
  await openApp(page);
  await page.addStyleTag({ content: 'html{font-size:200%}' });
  await page.getByRole('button', { name: /Start studying/ }).click();
  const stageBottom = await page.getByTestId('study-deck-stage').evaluate(node => node.getBoundingClientRect().bottom + scrollY);
  await revealCard(page);
  const controlsTop = await page.locator('.study-controls').evaluate(node => node.getBoundingClientRect().top + scrollY);
  expect(controlsTop).toBeGreaterThan(stageBottom - 2);
  await expect(page.locator('.rating-row')).toHaveCount(5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});
