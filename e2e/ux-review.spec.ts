import { test, expect, openApp, navigate, snapshot } from './helpers';

async function setNewLimit(page: import('@playwright/test').Page, limit: number): Promise<void> {
  await navigate(page, 'Settings');
  await page.getByLabel('New cards per day').fill(String(limit));
  await page.getByRole('button', { name: 'Save study settings' }).click();
  await navigate(page, 'Dashboard');
}

for (const size of [{ name: 'desktop', width: 1280, height: 820 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`HR-UX-07 and 08 ${size.name} reveal keeps the deck stage and scroll position stable`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await openApp(page);
    await page.getByRole('button', { name: /Start studying/ }).click();
    const stage = page.getByTestId('study-deck-stage');
    const reveal = size.name === 'mobile' ? stage.locator('[role="button"]') : page.getByRole('button', { name: /Reveal answer/ });
    await reveal.scrollIntoViewIfNeeded();
    const before = await stage.boundingBox();
    const scrollBefore = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
    expect(before).toBeTruthy();
    await reveal.click();
    await page.waitForTimeout(180);
    const during = await stage.boundingBox();
    await page.waitForTimeout(700);
    const after = await stage.boundingBox();
    const scrollAfter = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
    for (const measured of [during, after]) {
      expect(measured).toBeTruthy();
      expect(Math.abs(measured!.x - before!.x)).toBeLessThanOrEqual(.5);
      expect(Math.abs(measured!.y - before!.y)).toBeLessThanOrEqual(.5);
      expect(Math.abs(measured!.width - before!.width)).toBeLessThanOrEqual(.5);
      expect(Math.abs(measured!.height - before!.height)).toBeLessThanOrEqual(.5);
    }
    expect(scrollAfter).toEqual(scrollBefore);
    const revealStyle = await page.getByRole('button', { name: /1 Again Forgot/ }).evaluate(node => ({ overflow: document.documentElement.scrollWidth <= innerWidth, stageWidth: (node.closest('.study-controls') as HTMLElement).offsetWidth }));
    expect(revealStyle.overflow).toBe(true);
    expect(revealStyle.stageWidth).toBeGreaterThan(250);
  });
}

test('HR-UX-09 all five accepted ratings show distinct save-gated feedback once', async ({ page }) => {
  await openApp(page);
  await setNewLimit(page, 5);
  await page.getByRole('button', { name: /Start studying/ }).click();
  await page.evaluate(() => {
    (window as unknown as { __feedbackAdds: number }).__feedbackAdds = 0;
    new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node instanceof HTMLElement && (node.matches('.confidence-feedback') || node.querySelector('.confidence-feedback'))) (window as unknown as { __feedbackAdds: number }).__feedbackAdds++;
      }
    }).observe(document.querySelector('.app-shell')!, { childList: true, subtree: true });
  });
  const signatures = new Set<string>();
  for (const rating of [1, 2, 3, 4, 5] as const) {
    await page.getByRole('button', { name: /Reveal answer/ }).click();
    await page.getByRole('button', { name: new RegExp(`^${rating} `) }).click();
    const feedback = page.locator(`.confidence-feedback[data-rating="${rating}"]`);
    await expect(feedback).toBeVisible();
    const signature = await page.waitForFunction(value => {
      const node = document.querySelector(`.confidence-feedback[data-rating="${value}"]`);
      if (!node) return false;
      const durations = [...node.querySelectorAll<HTMLElement>('span')].flatMap(item => item.getAnimations().map(animation => (animation.effect as KeyframeEffect).getTiming().duration)).join(',');
      return durations || false;
    }, rating).then(handle => handle.jsonValue() as Promise<string>);
    expect(signature).not.toBe('');
    signatures.add(signature);
    await page.waitForTimeout(780);
  }
  expect(signatures.size).toBe(5);
  expect((await snapshot(page)).events.filter(event => event.kind === 'review')).toHaveLength(5);
  expect(await page.evaluate(() => (window as unknown as { __feedbackAdds: number }).__feedbackAdds)).toBe(5);
});

test('HR-UX-09 rapid and failed review attempts do not duplicate feedback or reviews', async ({ page, context }) => {
  await openApp(page);
  const stale = await context.newPage();
  await openApp(stale);
  try {
    await page.getByRole('button', { name: /Start studying/ }).click();
    await page.getByRole('button', { name: /Reveal answer/ }).click();
    await page.evaluate(() => new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('holorecall-local-v1', 2);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result, transaction = db.transaction('local-study', 'readwrite'), store = transaction.objectStore('local-study'), read = store.get('snapshot');
        read.onsuccess = () => store.put({ ...read.result, version: read.result.version + 1 }, 'snapshot');
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
    }));
    await page.getByRole('button', { name: /4 Good Confident/ }).dblclick();
    await expect(page.locator('.error-banner')).toBeVisible();
    await expect(page.locator('.confidence-feedback')).toHaveCount(0);
    expect((await snapshot(page)).events).toEqual([]);
  } finally { await stale.close(); }
});

test('HR-UX-10 and 11 intro, scroll progress, zero glow, Skip and Replay are real and persistence-neutral', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 900, height: 520 });
  await openApp(page);
  await setNewLimit(page, 1);
  await page.getByRole('button', { name: /Start studying/ }).click();
  const stage = page.getByTestId('study-deck-stage');
  const reveal = page.getByRole('button', { name: /Reveal answer/ });
  await reveal.scrollIntoViewIfNeeded();
  const before = await stage.boundingBox();
  await reveal.click();
  await page.waitForTimeout(160);
  const during = await stage.boundingBox();
  expect(Math.abs(during!.x - before!.x)).toBeLessThanOrEqual(.5);
  expect(Math.abs(during!.y - before!.y)).toBeLessThanOrEqual(.5);
  expect(Math.abs(during!.width - before!.width)).toBeLessThanOrEqual(.5);
  expect(Math.abs(during!.height - before!.height)).toBeLessThanOrEqual(.5);
  await page.getByRole('button', { name: /1 Again Forgot/ }).click();
  await expect(page.getByRole('heading', { name: 'Nice work' })).toBeVisible();
  await page.waitForTimeout(80);
  const headingAnimation = await page.locator('.results-heading h1').evaluate(node => node.getAnimations()[0]?.currentTime);
  expect(Number(headingAnimation)).toBeGreaterThan(0);
  expect(Number(headingAnimation)).toBeLessThan(620);
  await expect(page.getByRole('button', { name: 'Skip animation' })).toBeVisible();
  const progress = page.locator('[data-result-section="cosmetics"]');
  await expect(progress).toHaveClass(/motion-waiting/);
  expect(await progress.evaluate(node => node.getAnimations().length)).toBe(0);
  await page.waitForTimeout(950);
  await expect(page.getByRole('button', { name: 'Skip animation' })).toHaveCount(0);
  await progress.scrollIntoViewIfNeeded();
  await expect(progress).toHaveClass(/motion-active/);
  await expect(page.getByRole('button', { name: 'Skip animation' })).toBeVisible();
  const zeroTrack = progress.locator('.zero-progress .result-bar');
  await expect(zeroTrack).toHaveCount(1);
  await page.waitForTimeout(260);
  const zeroMotion = await zeroTrack.evaluate(node => node.getAnimations().map(animation => ({ time: animation.currentTime, duration: (animation.effect as KeyframeEffect).getTiming().duration })));
  expect(zeroMotion.some(item => Number(item.time) > 0 && Number(item.time) < Number(item.duration))).toBe(true);
  const persisted = await snapshot(page);
  await page.getByRole('button', { name: 'Skip animation' }).click();
  await expect(progress).toHaveClass(/motion-settled/);
  await expect(page.locator('.motion-waiting')).toHaveCount(0);
  await page.waitForTimeout(900);
  expect(await zeroTrack.evaluate(node => node.getAnimations().length)).toBe(0);
  await page.evaluate(() => scrollTo(0, 0));
  await page.getByRole('button', { name: 'Replay' }).click();
  await expect(page.getByRole('button', { name: 'Skip animation' })).toBeVisible();
  await expect(progress).toHaveClass(/motion-waiting/);
  expect((await snapshot(page)).events).toEqual(persisted.events);
  expect((await snapshot(page)).rewardEvents).toEqual(persisted.rewardEvents);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Nice work' })).toBeVisible();
  expect((await snapshot(page)).events).toEqual(persisted.events);
  await testInfo.attach('results-motion-state', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

test('HR-UX-10 positive cosmetic gain visibly grows from its real starting balance', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 900, height: 560 });
  await openApp(page);
  await setNewLimit(page, 1);
  await page.getByRole('button', { name: /Start studying/ }).click();
  const reveal = page.getByRole('button', { name: /Reveal answer/ });
  await reveal.scrollIntoViewIfNeeded();
  const stage = page.getByTestId('study-deck-stage');
  const before = await stage.boundingBox();
  await page.waitForTimeout(450);
  await reveal.click();
  await page.waitForTimeout(180);
  const during = await stage.boundingBox();
  expect(Math.abs(during!.y - before!.y)).toBeLessThanOrEqual(.5);
  await page.waitForTimeout(650);
  await page.getByRole('button', { name: /4 Good Confident/ }).click();
  await expect(page.locator('.confidence-feedback[data-rating="4"]')).toBeVisible();
  const progress = page.locator('[data-result-section="cosmetics"]');
  await expect(progress).toHaveClass(/motion-waiting/);
  await page.waitForTimeout(950);
  await progress.scrollIntoViewIfNeeded();
  await expect(progress).toHaveClass(/motion-active/);
  await page.waitForTimeout(480);
  const widths = await progress.locator('.result-bar').evaluate(node => ({ track: node.getBoundingClientRect().width, fill: node.querySelector('i')!.getBoundingClientRect().width }));
  expect(widths.fill).toBeGreaterThan(0);
  expect(widths.fill).toBeLessThan(widths.track);
  await page.screenshot({ path: testInfo.outputPath('motion-review.png'), fullPage: true });
});

test('HR-UX-11 reduced motion is static and never offers a misleading Skip control', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  await setNewLimit(page, 1);
  await page.getByRole('button', { name: /Start studying/ }).click();
  await page.getByRole('button', { name: /Reveal answer/ }).click();
  await page.getByRole('button', { name: /1 Again Forgot/ }).click();
  await expect(page.getByRole('heading', { name: 'Nice work' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Skip animation' })).toHaveCount(0);
  await expect(page.locator('.confidence-feedback')).toHaveCount(0);
  await expect(page.locator('[data-result-section="cosmetics"]')).toHaveClass(/motion-settled/);
});
