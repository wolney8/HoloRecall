import { test, expect, openApp, revealCard, snapshot } from './helpers';

test('HR-MOBILE-UX-01B wide Study keeps equal rating actions and bounded shared help', async ({ page }) => {
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
  const group=page.getByRole('group',{name:'Rate your recall'}),choices=group.getByRole('button');
  await expect(choices).toHaveCount(5);
  for(const name of ['1, Forgot','2, Hard','3, Hesitant','4, Confident','5, Easy'])await expect(group.getByRole('button',{name,exact:true})).toBeVisible();
  const geometry=await choices.evaluateAll(items=>items.map(item=>{const box=item.getBoundingClientRect(),number=item.querySelector('.rating-number')!.getBoundingClientRect(),label=item.querySelector('.rating-label')!.getBoundingClientRect();return{y:Math.round(box.y),width:Math.round(box.width),height:Math.round(box.height),numberY:Math.round(number.y),labelY:Math.round(label.y)};}));
  expect(new Set(geometry.map(item=>`${item.y}:${item.width}:${item.height}:${item.numberY}:${item.labelY}`)).size).toBe(1);
  expect(await group.locator('small,.rating-grade').count()).toBe(0);

  const help=page.getByRole('button',{name:'About the ratings',exact:true});
  await help.click();
  const dialog=page.getByRole('dialog',{name:'About the ratings'});
  await expect(dialog).toBeVisible();
  for(const wording of ["Couldn't recall the answer.",'Recalled only with significant effort.','Recalled with some hesitation.','Recalled clearly.','Recalled immediately and effortlessly.'])await expect(dialog.getByText(wording,{exact:true})).toBeVisible();
  expect((await snapshot(page)).events).toHaveLength(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(help).toBeFocused();
});

test('HR-UX-14 accepted feedback retains the rated card before the next deal', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: /Start studying/ }).click();
  await page.getByRole('button', { name: /Check answer/ }).click();
  const answer = page.locator('.study-card-area .answer h3, .study-card-area .answer-text').first();
  const original = await answer.textContent();
  const rating = page.getByRole('button', { name: /4, Confident/ });
  await rating.click();
  await expect.poll(async () => (await snapshot(page)).events.length).toBe(1);
  await expect(page.locator('.study-card-area .rating-facets.rating-4 i')).toHaveCount(4);await expect(page.locator('.confidence-feedback')).toHaveCount(0);
  await expect(answer).toContainText(original!.trim());
  await expect(rating).toBeDisabled();
  await page.waitForTimeout(500);
  await expect(answer).toContainText(original!.trim());
  await expect(page.locator('.study-layout')).toHaveAttribute('data-study-transition', 'feedback');
  await expect(page.getByRole('progressbar',{name:'Study progress, 1 of 10 cards'})).toBeVisible({timeout:4_000});
  await expect(page.locator('.study-layout')).toHaveAttribute('data-study-transition', 'idle');
});

test('HR-UX-14 last-card feedback completes before Results and reduced motion settles promptly', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Settings', exact: false }).click();
  await page.getByLabel('New cards per day').fill('1');
  await page.getByRole('button', { name: 'Save study settings' }).click();
  await page.getByRole('button', { name: 'Dashboard', exact: false }).click();
  await page.getByRole('button', { name: /Start studying/ }).click();
  await page.getByRole('button', { name: /Check answer/ }).click();
  await page.getByRole('button', { name: /5, Easy/ }).click();
  await expect(page.locator('.study-card-area .rating-facets.rating-5 i')).toHaveCount(6);await expect(page.locator('.confidence-feedback')).toHaveCount(0);
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

test('HR-UX-15 real unlock waits for completed progress and Results stay presentation-only', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Settings', exact: false }).click();
  await page.getByLabel('New cards per day').fill('1');
  await page.getByRole('button', { name: 'Save study settings' }).click();
  await page.getByRole('button', { name: 'Dashboard', exact: false }).click();
  await page.getByRole('button', { name: /Start studying/ }).click();
  await page.getByRole('button', { name: /Check answer/ }).click();
  await page.getByRole('button', { name: /4, Confident/ }).click();
  await expect(page.getByRole('heading', { name: 'Nice work', exact: true })).toBeVisible();
  const stored = await snapshot(page), eventCount = stored.events.length, rewardCount = stored.rewardEvents.length;
  const progress = page.locator('[data-result-section="cosmetics"]');
  await page.locator('.unlock-reveal').evaluate(node=>{const phases:string[]=[];(window as unknown as {__unlockPhases:string[]}).__unlockPhases=phases;const record=()=>phases.push((node as HTMLElement).dataset['unlockPhase']??'');record();new MutationObserver(record).observe(node,{attributes:true,attributeFilter:['data-unlock-phase']});});
  await progress.scrollIntoViewIfNeeded();
  await expect(page.locator('.unlock-reveal')).toHaveAttribute('data-unlock-phase', 'waiting');
  await expect.poll(() => page.locator('.result-bar i').first().evaluate(node => getComputedStyle(node).width), { timeout: 2_000 }).not.toBe('0px');
  await expect(page.locator('.unlock-reveal')).toHaveAttribute('data-unlock-phase', 'revealed', { timeout: 3_000 });
  expect(await page.evaluate(()=>(window as unknown as {__unlockPhases:string[]}).__unlockPhases)).toEqual(expect.arrayContaining(['waiting','complete','rise','turn','revealed']));
  const bar = page.locator('.result-bar').first();
  const fill = page.locator('.result-bar i').first();
  expect(Math.abs((await fill.boundingBox())!.width - (await bar.boundingBox())!.width)).toBeLessThan(2);
  await expect(page.locator('.unlock-feature')).toContainText('Unlocked');
  await expect(page.getByRole('button', { name: 'Replay', exact: true })).toHaveCount(0);
  const resultCard=page.locator('.unlock-feature hr-card .card-motion');
  await expect(resultCard).toHaveAttribute('aria-label','Show card answer');
  await resultCard.click();
  await expect(resultCard).toHaveAttribute('aria-label','Show card front');
  await resultCard.click();
  await expect(resultCard).toHaveAttribute('aria-label','Show card answer');
  await resultCard.focus();await resultCard.press('Enter');
  await expect(resultCard).toHaveAttribute('aria-label','Show card front');
  await page.getByRole('button',{name:'Keep cards'}).click();
  const settledCard=page.locator('.unlock-cards.static hr-card .card-motion');
  await expect(settledCard).toHaveAttribute('aria-label','Show card answer');
  await settledCard.click();await expect(settledCard).toHaveAttribute('aria-label','Show card front');
  await settledCard.press('Space');await expect(settledCard).toHaveAttribute('aria-label','Show card answer');
  expect((await snapshot(page)).events).toHaveLength(eventCount);
  expect((await snapshot(page)).rewardEvents).toHaveLength(rewardCount);
});

test('HR-UX-15 queues multiple real unlocks and Collection reuses their persisted events', async ({ page }) => {
  await openApp(page); await page.getByRole('button', { name: 'Settings', exact: false }).click();
  await page.getByLabel('New cards per day').fill('2'); await page.getByRole('button', { name: 'Save study settings' }).click();
  await page.getByRole('button', { name: 'Dashboard', exact: false }).click(); await page.getByRole('button', { name: /Start studying/ }).click();
  for (let review = 0; review < 2; review++) { await page.getByRole('button', { name: /Check answer/ }).click(); await page.getByRole('button', { name: /4, Confident/ }).click(); if (!review) await expect(page.getByRole('progressbar',{name:'Study progress, 1 of 2 cards'})).toBeVisible(); }
  await expect(page.getByRole('heading', { name: 'Nice work' })).toBeVisible(); const before = await snapshot(page); expect(before.rewardEvents.filter(event => event.kind === 'unlock')).toHaveLength(2);
  await page.locator('[data-result-section="cosmetics"]').scrollIntoViewIfNeeded(); await expect(page.locator('.unlock-reveal')).toContainText('UNLOCK 1 OF 2'); await expect(page.locator('.unlock-reveal')).toHaveAttribute('data-unlock-phase', 'revealed', { timeout: 5_000 });
  await page.getByRole('button', { name: 'Continue', exact: true }).click(); await expect(page.locator('.unlock-reveal')).toContainText('UNLOCK 2 OF 2'); await expect(page.locator('.unlock-reveal')).toHaveAttribute('data-unlock-phase', 'revealed', { timeout: 5_000 });
  await page.getByRole('button', { name: 'View in Collection' }).click(); await expect(page.getByRole('heading', { name: 'Recently unlocked' })).toBeVisible(); await expect(page.locator('.recent-unlocks > .mini-collection-grid > .overview-mini')).toHaveCount(1); expect((await snapshot(page)).rewardEvents).toEqual(before.rewardEvents);
});

test('HR-UX-13 @ios-compact stacks readable controls below the stable card at 200% text', async ({ page }) => {
  await openApp(page);
  await page.addStyleTag({ content: 'html{font-size:200%}' });
  await page.getByRole('button', { name: /Start studying/ }).click();
  const stageBottom = await page.getByTestId('study-deck-stage').evaluate(node => node.getBoundingClientRect().bottom + scrollY);
  await revealCard(page);
  const controlsTop = await page.locator('.study-controls').evaluate(node => node.getBoundingClientRect().top + scrollY);
  expect(controlsTop).toBeGreaterThan(stageBottom - 2);
  await expect(page.locator('.rating-choice')).toHaveCount(5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});
