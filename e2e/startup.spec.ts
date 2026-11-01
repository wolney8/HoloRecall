import { expect, test } from '@playwright/test';
import { replaceSnapshot, snapshot } from './helpers';
import { acceptScheduledReview } from '../src/test/scheduled-review';

async function readyTiming(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => performance.getEntriesByName('holorecall-ready').at(-1)?.startTime ?? -1);
}

test('pre-Angular and application loading surfaces transition to the ready shell', async ({ page }) => {
  let delayed = false;
  await page.route(/main(?:-[^/]+)?\.js$/, async route => {
    delayed = true;
    await new Promise(resolve => setTimeout(resolve, 250));
    await route.continue();
  });
  const navigation = page.goto('/');
  await expect(page.getByText('Loading HoloRecall', { exact: true })).toBeVisible();
  await navigation;
  expect(delayed).toBe(true);
  await expect(page.getByRole('heading', { name: 'Study dashboard', exact: true })).toBeVisible();
  await expect(page.locator('[data-boot-state]')).toHaveCount(0);
});

test('known storage failure becomes visible and retry reaches ready without learner mutation', async ({ page }) => {
  await page.addInitScript(() => {
    const original = globalThis.indexedDB;
    let firstRead = true;
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      get: () => { if (firstRead) { firstRead = false; return undefined; } return original; },
    });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: "HoloRecall couldn't finish starting." })).toBeVisible();
  await expect(page.getByText('Your data remains on this device.')).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Study dashboard', exact: true })).toBeVisible();
  const snapshot = await page.evaluate(async () => new Promise<unknown>((resolve, reject) => {
    const request = indexedDB.open('holorecall-local-v1', 2);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction('local-study', 'readonly');
      const get = transaction.objectStore('local-study').get('snapshot');
      get.onerror = () => reject(get.error);
      get.onsuccess = () => resolve(get.result);
    };
  })) as { events: unknown[]; practiceEvents: unknown[]; rewardEvents: unknown[] };
  expect(snapshot.events).toHaveLength(0);
  expect(snapshot.practiceEvents).toHaveLength(0);
  expect(snapshot.rewardEvents).toHaveLength(0);
});

test('startup surface owns Light, Dark and reduced-motion presentation', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('holorecall-theme', 'dark'));
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.route(/main(?:-[^/]+)?\.js$/, async route => {
    await new Promise(resolve => setTimeout(resolve, 250));
    await route.continue();
  });
  const navigation = page.goto('/');
  const loader = page.locator('.boot-screen, .preboot').first();
  await expect(loader).toBeVisible();
  const presentation = await loader.evaluate(element => ({
    background: getComputedStyle(element).backgroundColor,
    activityAnimations: element.querySelector('.boot-activity, i')?.getAnimations().length ?? 0,
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  expect(presentation.activityAnimations).toBe(0);
  expect(presentation.width).toBeLessThanOrEqual(presentation.viewport);
  expect(presentation.background).not.toBe('rgb(255, 255, 255)');
  await navigation;
  await expect(page.getByRole('heading', { name: 'Study dashboard', exact: true })).toBeVisible();
});

test('empty, 254-card and learner-activity profiles reach ready with measured timings', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Study dashboard', exact: true })).toBeVisible();
  const emptyMs = await readyTiming(page);
  const base = await snapshot(page);

  const large = structuredClone(base);
  large.decks = [large.decks[0]!,
    { id: 'root-2', name: 'Root 2', description: '', suspended: false },
    { id: 'root-3', name: 'Root 3', description: '', suspended: false },
    ...Array.from({ length: 21 }, (_, index) => ({
      id: `child-${index + 1}`,
      name: `Child ${index + 1}`,
      description: '',
      suspended: false,
      parentId: index < 7 ? large.decks[0]!.id : index < 14 ? 'root-2' : 'root-3',
    })),
  ];
  const source = large.cards[0]!;
  large.cards.push(...Array.from({ length: 254 - large.cards.length }, (_, index) => ({
    ...structuredClone(source),
    id: `startup-card-${index + 1}`,
    deckId: `child-${(index % 21) + 1}`,
    answer: `Startup answer ${index + 1}`,
  })));
  await replaceSnapshot(page, large);
  await page.reload();
  await expect(page.getByText('254 cards across 24 decks.')).toBeVisible();
  const largeMs = await readyTiming(page);

  const activity = acceptScheduledReview(await snapshot(page), {
    id: 'startup-existing-review',
    cardId: source.id,
    sessionId: 'startup-existing-session',
    rating: 4,
    now: new Date('2026-10-30T12:00:00Z'),
  });
  await replaceSnapshot(page, activity);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Study dashboard', exact: true })).toBeVisible();
  const activityMs = await readyTiming(page);
  expect((await snapshot(page)).events).toHaveLength(1);
  expect(emptyMs).toBeGreaterThan(0);
  expect(largeMs).toBeGreaterThan(0);
  expect(activityMs).toBeGreaterThan(0);
  console.log(`HR_BOOT_TIMINGS_MS empty=${emptyMs.toFixed(1)} cards254=${largeMs.toFixed(1)} activity=${activityMs.toFixed(1)}`);
});
