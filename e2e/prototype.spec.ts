import { test as base, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { State } from '../src/domain/models';

const test = base.extend<{ runtimeErrors: void }>({
  runtimeErrors: [async ({ page }, use, testInfo) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    await use();
    if (consoleErrors.length) {
      await testInfo.attach('browser-console-errors', {
        body: consoleErrors.join('\n'), contentType: 'text/plain',
      });
    }
    expect(pageErrors, 'The browser must not raise unhandled application errors').toEqual([]);
    if (!testInfo.title.includes('offline')) {
      expect(consoleErrors, 'Online browser checks must not log console errors').toEqual([]);
    }
  }, { auto: true }],
});

async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Make a little room for learning/ })).toBeVisible();
  await expect(page.getByTestId('today-count')).toContainText('0');
}

async function snapshot(page: Page): Promise<State> {
  return page.evaluate(() => new Promise<State>((resolve, reject) => {
    const request = indexedDB.open('holorecall-local-v1', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('local-study', 'readonly');
      const read = transaction.objectStore('local-study').get('snapshot');
      read.onsuccess = () => resolve(read.result as State);
      read.onerror = () => reject(read.error);
      transaction.oncomplete = () => db.close();
    };
  }));
}

async function confidentReview(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Reveal answer/ }).click();
  await expect(page.getByRole('heading', { name: 'il limone', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /4 Confident Correct and confident Good/ }).click();
  await expect(page.getByRole('status')).toContainText('Review saved on this device.');
}

test('visual reveal, five-point rating and FSRS state survive a reload', async ({ page }) => {
  await openApp(page);
  await expect(page.getByText('0 due reviews', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Start studying', exact: false }).click();
  const flashcard = page.getByRole('region', { name: 'Current flashcard' });
  await expect(flashcard.locator('img')).toHaveAttribute('src', '/art/limone.svg');
  await expect(flashcard.getByText('il limone', { exact: true })).toHaveCount(0);
  await expect(flashcard.locator('img')).not.toHaveAttribute('alt', /lemon|limone/i);
  await expect(page.getByRole('button', { name: /4 Confident/ })).toHaveCount(0);

  await confidentReview(page);
  await expect(page.locator('.session-bar')).toContainText('1 / 10');
  await expect(flashcard.locator('img')).toHaveAttribute('src', '/art/caffe.svg');
  const saved = await snapshot(page);
  expect(saved.events).toHaveLength(1);
  expect(saved.events[0]).toMatchObject({ kind: 'review', cardId: 'it-limone', rating: 4, grade: 3 });
  expect(saved.states['it-limone'].reps).toBe(1);
  expect(saved.states['it-limone'].version).toBe(1);
  expect(Date.parse(saved.states['it-limone'].due)).toBeGreaterThan(Date.parse(saved.events[0].timestamp));

  await page.getByRole('button', { name: 'Back to overview' }).click();
  await expect(page.getByTestId('today-count')).toContainText('1');
  await page.reload();
  await expect(page.getByTestId('today-count')).toContainText('1');
  const reloaded = await snapshot(page);
  expect(reloaded.events).toEqual(saved.events);
  expect(reloaded.states).toEqual(saved.states);
  expect(reloaded.cards.find(card => card.id === 'it-limone')?.image).toBe('/art/limone.svg');
});

test('create and edit a basic card persist its content and revision', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: /Create a card/ }).click();
  await page.getByLabel(/Prompt/).fill('Say “thank you” in Italian.');
  await page.getByLabel('Answer', { exact: true }).fill('grazie');
  await page.getByLabel('Approximate pronunciation').fill('GRAHT-see-eh');
  await page.getByLabel('Natural English meaning').fill('thank you');
  await page.getByLabel(/Tags/).fill('courtesy, everyday');
  await page.getByRole('button', { name: 'Save card', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Card saved.');
  await page.getByRole('button', { name: 'Edit grazie', exact: true }).click();
  await page.getByLabel(/Prompt/).fill('Say “thank you very much” in Italian.');
  await page.getByLabel('Answer', { exact: true }).fill('grazie mille');
  await page.getByLabel('Natural English meaning').fill('thank you very much');
  await page.getByRole('button', { name: 'Save card', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'grazie mille', exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /My decks/ }).click();
  await expect(page.getByRole('heading', { name: 'grazie mille', exact: true })).toBeVisible();
  const saved = await snapshot(page);
  const card = saved.cards.find(item => item.answer === 'grazie mille');
  expect(card).toMatchObject({ revision: 2, front: 'Say “thank you very much” in Italian.', tags: ['courtesy', 'everyday'] });
  expect(saved.cards).toHaveLength(17);
  expect(saved.events).toHaveLength(0);
});

test('undo preserves the review and appends a reversal while correcting counts', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: /Start studying/ }).click();
  await confidentReview(page);
  await page.getByRole('button', { name: /Undo last review/ }).click();
  await expect(page.getByRole('status')).toContainText('Review reversed.');
  await expect(page.locator('.session-bar')).toContainText('0 / 10');
  await expect(page.getByRole('region', { name: 'Current flashcard' }).locator('img')).toHaveAttribute('src', '/art/limone.svg');
  const saved = await snapshot(page);
  expect(saved.events).toHaveLength(2);
  expect(saved.events[0].kind).toBe('review');
  expect(saved.events[1]).toMatchObject({ kind: 'reversal', reviewEventId: saved.events[0].id });
  expect(saved.states['it-limone'].reps).toBe(0);
  await page.getByRole('button', { name: 'Back to overview' }).click();
  await expect(page.getByTestId('today-count')).toContainText('0');
  await page.reload();
  await expect(page.getByTestId('today-count')).toContainText('0');
  expect((await snapshot(page)).events).toEqual(saved.events);
});

test('collection explicitly shows four sample treatments and pointer effects can be disabled', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: /Collection/ }).click();
  await expect(page.getByText(/These are sample treatments, not earned rewards/)).toBeVisible();
  await expect(page.getByText('SAMPLE STATE · NOT EARNED', { exact: true })).toHaveCount(4);
  for (const name of ['Standard', 'Foil', 'Holo', 'Relic']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  const holo = page.locator('.memory-card.holo');
  await holo.hover({ position: { x: 25, y: 30 } });
  expect(await holo.evaluate(element => (element as HTMLElement).style.getPropertyValue('--px'))).not.toBe('');
  await page.getByRole('button', { name: /Effects on/ }).click();
  await expect(page.getByRole('button', { name: 'Effects off', exact: true })).toBeVisible();
  await expect(holo.locator('.shine')).toBeHidden();
  await page.reload();
  await expect(page.getByTestId('today-count')).toContainText('0');
  expect((await snapshot(page)).preferences.effects).toBe(false);
});

test('mobile layout fits and reduced motion suppresses shimmer and reveal animation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  const fitsViewport = async () => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  };
  await fitsViewport();
  await page.getByRole('button', { name: /Start studying/ }).click();
  await fitsViewport();
  await page.getByRole('button', { name: /Reveal answer/ }).click();
  await expect(page.locator('.card-copy.answer')).toHaveCSS('animation-name', 'none');
  await fitsViewport();
  await page.getByRole('button', { name: /Collection/ }).click();
  await expect(page.locator('.collection-item')).toHaveCount(4);
  await expect(page.locator('.memory-card.holo .shine')).toBeHidden();
  const holo = page.locator('.memory-card.holo');
  await holo.hover({ position: { x: 25, y: 30 } });
  expect(await holo.evaluate(element => (element as HTMLElement).style.getPropertyValue('--px'))).toBe('');
  await fitsViewport();
  await page.getByRole('button', { name: /My decks/ }).click();
  await fitsViewport();
});

test('active-page offline review persists through online recovery and reload', async ({ page, context }) => {
  await openApp(page);
  await page.getByRole('button', { name: /Start studying/ }).click();
  await expect(page.getByRole('region', { name: 'Current flashcard' }).locator('img')).toBeVisible();
  await context.setOffline(true);
  await confidentReview(page);
  expect((await snapshot(page)).events).toHaveLength(1);
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByTestId('today-count')).toContainText('1');
  expect((await snapshot(page)).events[0]).toMatchObject({ kind: 'review', cardId: 'it-limone', rating: 4 });
});

test('keyboard reveal and rating use the same persisted review path', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: /Start studying/ }).click();
  await expect(page.getByRole('button', { name: /Reveal answer/ })).toBeVisible();
  await page.locator('body').press('Space');
  await expect(page.getByRole('heading', { name: 'il limone', exact: true })).toBeVisible();
  await page.locator('body').press('3');
  await expect(page.getByRole('status')).toContainText('Review saved on this device.');
  const saved = await snapshot(page);
  expect(saved.events).toHaveLength(1);
  expect(saved.events[0]).toMatchObject({ rating: 3, grade: 3 });
});

test('converting a visual card to text removes its image and restores the text prompt', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: /My decks/ }).click();
  await page.getByRole('button', { name: 'Edit il limone', exact: true }).click();
  await page.getByLabel('Card type').selectOption('text');
  await page.getByLabel(/Prompt/).fill('Translate “the lemon” into Italian.');
  await page.getByRole('button', { name: 'Save card', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Card saved.');
  await page.reload();
  await page.getByRole('button', { name: /Start studying/ }).click();
  const flashcard = page.getByRole('region', { name: 'Current flashcard' });
  await expect(flashcard.getByRole('heading', { name: 'Translate “the lemon” into Italian.', exact: true })).toBeVisible();
  await expect(flashcard.locator('img')).toHaveCount(0);
  await expect(flashcard.getByText('il limone', { exact: true })).toHaveCount(0);
  const card = (await snapshot(page)).cards.find(item => item.id === 'it-limone');
  expect(card).toMatchObject({ kind: 'text', revision: 2 });
  expect(card?.image).toBeUndefined();
  expect(card?.imageDescription).toBeUndefined();
});

test('JSON download restores cards and review history into an untouched browser context', async ({ page, browser }) => {
  await openApp(page);
  await page.getByRole('button', { name: /Start studying/ }).click();
  await confidentReview(page);
  const source = await snapshot(page);
  await page.getByRole('button', { name: 'Study settings', exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Download JSON backup/ }).click(),
  ]);
  const path = await download.path();
  expect(path).toBeTruthy();
  const buffer = await readFile(path!);
  const backup = JSON.parse(buffer.toString()) as { format: string; version: number; state: State };
  expect(backup).toMatchObject({ format: 'holorecall-backup', version: 1 });
  expect(backup.state.events).toEqual(source.events);
  expect(backup.state.cards).toEqual(source.cards);

  const context = await browser.newContext();
  const restoredPage = await context.newPage();
  const errors: string[] = [];
  restoredPage.on('pageerror', error => errors.push(error.message));
  try {
    await restoredPage.goto(page.url());
    await expect(restoredPage.getByTestId('today-count')).toContainText('0');
    await restoredPage.getByRole('button', { name: 'Study settings', exact: true }).click();
    await restoredPage.getByLabel('Restore a backup').setInputFiles({
      name: download.suggestedFilename(), mimeType: 'application/json', buffer,
    });
    await expect(restoredPage.getByRole('status')).toContainText('Backup restored.');
    await restoredPage.reload();
    await expect(restoredPage.getByTestId('today-count')).toContainText('1');
    const restored = await snapshot(restoredPage);
    expect(restored.cards).toEqual(source.cards);
    expect(restored.events).toEqual(source.events);
    expect(restored.states).toEqual(source.states);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
