import { test, expect, openApp, navigate, snapshot, ownCards } from './helpers';

test('HR-UX-01 overlays span the card face above surfaces and below readable content', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await openApp(page);
  await ownCards(page,1);
  await navigate(page, 'Collection');await page.getByRole('tab',{name:'Cards'}).click();
  await expect(page.locator('.sample-button')).toHaveCount(0);await page.getByRole('button',{name:/Inspect /}).first().click();
    const card = page.locator('.inspection-card .memory-card');
    const layers = await card.evaluate(element => {
      const query = (selector: string) => getComputedStyle(element.querySelector(selector)!);
      return {
        illustration: Number(query('.illustration-layer').zIndex),
        effects: Number(query('.effects-layer').zIndex),
        frame: Number(query('.frame-layer').zIndex),
        text: Number(query('.card-heading > span').zIndex),
        pointerEvents: query('.effects-layer').pointerEvents,
      };
    });
    expect(layers).toEqual({ illustration: 1, effects: 3, frame: 4, text: 6, pointerEvents: 'none' });
  const motion = page.locator('.inspection-card .card-motion');
  await motion.hover({ position: { x: 250, y: 220 } });
  await expect.poll(() => motion.evaluate(node => (node as HTMLElement).style.getPropertyValue('--ambient-x'))).not.toBe('');
  await motion.click();
  await expect(motion).toHaveAttribute('aria-label', 'Show card front');
  await page.screenshot({ path: testInfo.outputPath('collection-system-dark-effects.png'), fullPage: true });
});

test('HR-UX-02 and 03 Collection card click, keyboard, drag and reduced motion are coherent', async ({ page }) => {
  await openApp(page);
  await ownCards(page,2);
  await navigate(page, 'Collection');await page.getByRole('tab',{name:'Cards'}).click();
  await page.getByRole('button',{name:/Inspect /}).first().click();
  const motion = page.locator('.inspection-card .card-motion');
  const before=await snapshot(page);
  await expect(motion).toHaveAttribute('aria-label', 'Show card answer');
  await motion.click();
  await expect.poll(() => page.locator('.inspection-card .card-turn').evaluate(node => node.getAnimations()[0]?.effect?.getTiming().duration)).toBe(360);
  await expect(motion).toHaveAttribute('aria-label', 'Show card front');
  await motion.focus();
  await motion.press('Enter');
  await expect(motion).toHaveAttribute('aria-label', 'Show card answer');

  const box = await motion.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 45, box!.y + box!.height / 2);
  await page.mouse.up();
  await expect(motion).toHaveAttribute('aria-label', 'Show card answer');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await motion.press('Space');
  await expect(motion).toHaveAttribute('aria-label', 'Show card front');
  expect(await page.locator('.inspection-card .card-turn').evaluate(node =>
    node.getAnimations().filter(animation => animation.playState === 'running' || animation.playState === 'pending').length,
  )).toBe(0);
  const inspectButtons=page.getByRole('button',{name:/Inspect /});
  if(await inspectButtons.count()>1){await inspectButtons.nth(1).click();await expect(motion).toHaveAttribute('aria-label','Show card answer');}
  const after=await snapshot(page);expect(after.events).toEqual(before.events);expect(after.rewardEvents).toEqual(before.rewardEvents);
});

test('HR-COLLECTION-DETAIL-01 stays top-aligned without page overflow at 1280×720',async({page},testInfo)=>{
  await page.setViewportSize({width:1280,height:720});await openApp(page);await ownCards(page,1);await navigate(page,'Collection');await page.getByRole('tab',{name:'Cards'}).click();await page.getByRole('button',{name:/Inspect /}).first().click();
  const showcase=page.locator('#collection-inspection'),card=showcase.locator('.inspection-card'),details=showcase.locator('.inspection-details');
  await showcase.scrollIntoViewIfNeeded();
  await expect(showcase).toHaveAttribute('data-reveal-state','settled');
  const [cardBox,detailsBox]=await Promise.all([card.boundingBox(),details.boundingBox()]);expect(cardBox).toBeTruthy();expect(detailsBox).toBeTruthy();expect(Math.abs(cardBox!.y-detailsBox!.y)).toBeLessThanOrEqual(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
  await page.screenshot({path:testInfo.outputPath('collection-detail-1280x720.png'),fullPage:true});
});

test('HR-UX-05 and 06 completed results persist and focused Study stays quiet', async ({ page }, testInfo) => {
  await openApp(page);
  await navigate(page, 'Settings');
  await page.getByLabel('New cards per day').fill('1');
  await page.getByRole('button', { name: 'Save study settings' }).click();
  await navigate(page, 'Dashboard');
  await page.getByRole('button', { name: /Start studying/ }).click();
  await expect(page.locator('.sidebar')).toBeHidden();
  await expect(page.locator('.deck-shadow.previous')).toBeHidden();
  await expect(page.locator('.deck-shadow.next')).toBeHidden();
  await page.waitForTimeout(1100);
  await page.getByRole('button', { name: /Check answer/ }).click();
  await page.getByRole('button', { name: /4, Confident/ }).click();
  await expect(page.getByRole('heading', { name: 'Nice work', exact: true })).toBeVisible();
  await expect(page.locator('.sidebar')).toBeVisible();
  await expect(page.getByText('1 review · 1 unique card', { exact: true })).toBeVisible();
  await expect(page.getByText('+1 eligible day', { exact: false })).toBeVisible();
  await page.locator('.unlock-reveal').scrollIntoViewIfNeeded();
  await expect(page.locator('.unlock-reveal')).toContainText('Unlocked');
  await expect(page.getByText('1 timed reveal', { exact: true })).toBeVisible();
  await expect(page.locator('.toast')).toHaveCount(0);
  const completed = await snapshot(page);
  expect(completed.session).toMatchObject({ completed: 1, queue: [], partial: false });
  expect(completed.session?.endedAt).toBeTruthy();
  expect(completed.events[0].kind === 'review' && completed.events[0].recallMs! > 0).toBe(true);
  const eventCount = completed.events.length, rewardCount = completed.rewardEvents.length;
  await expect(page.getByRole('button', { name: 'Replay', exact: true })).toHaveCount(0);
  expect((await snapshot(page)).events).toHaveLength(eventCount);
  expect((await snapshot(page)).rewardEvents).toHaveLength(rewardCount);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Nice work', exact: true })).toBeVisible();
  expect((await snapshot(page)).events).toHaveLength(eventCount);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: testInfo.outputPath('completed-results.png'), fullPage: true });
});

test('HR-UX-05 and 06 early end is persisted as partial and restores the shell', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: /Start studying/ }).click();
  await expect(page.locator('.sidebar')).toBeHidden();
  await expect(page.locator('.deck-shadow.next')).toBeVisible();
  await page.getByRole('button', { name: 'End session', exact: true }).click();
  await expect(page.getByText('PARTIAL SESSION', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Study saved', exact: true })).toBeVisible();
  await expect(page.locator('.sidebar')).toBeVisible();
  const state = await snapshot(page);
  expect(state.session).toMatchObject({ completed: 0, queue: [], total: 0, plannedTotal: 10, partial: true });
  expect(state.events).toEqual([]);
  expect(state.rewardEvents).toEqual([]);
  await page.reload();
  await expect(page.getByText('PARTIAL SESSION', { exact: true })).toBeVisible();
});

test('HR-UX-06 a real stale-save failure remains visible and actionable in Study', async ({ page, context }) => {
  await openApp(page);
  const stale = await context.newPage();
  try {
    await openApp(stale);
    await navigate(page, 'Settings');
    await page.getByRole('switch', { name: 'Card effects' }).click();
    await stale.getByRole('button', { name: /Start studying/ }).click();
    const alert = stale.locator('.error-banner');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/changed in another tab|refresh|stale/i);
    await expect(stale.getByRole('heading', { name: 'Study dashboard', exact: true })).toBeVisible();
  } finally {
    await stale.close();
  }
});
