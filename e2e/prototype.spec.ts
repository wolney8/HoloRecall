import { test, expect, openApp, snapshot, confidentReview, navigate, revealCard, selectMaterial, expectNoOverflow } from './helpers';
import { readFile } from 'node:fs/promises';
import type { State } from '../src/domain/models';

test('visual reveal, five-point rating and FSRS state survive a reload', async ({ page }) => {
  await openApp(page);
  await expect(page.getByText('0 due reviews', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Start studying', exact: false }).click();
  const flashcard = page.getByRole('region', { name: 'Current flashcard' });
  await expect(flashcard.locator('img')).toHaveAttribute('src', '/art/limone.svg');
  await expect(flashcard.getByText('il limone', { exact: true })).toHaveCount(0);
  await expect(flashcard.locator('img')).not.toHaveAttribute('alt', /lemon|limone/i);
  await expect(page.getByRole('button', { name: /4 Good Confident/ })).toHaveCount(0);

  await confidentReview(page);
  await expect(page.locator('.session-bar')).toContainText('1 / 10');
  await expect(flashcard.locator('img')).toHaveAttribute('src', '/art/caffe.svg');
  const saved = await snapshot(page);
  expect(saved.events).toHaveLength(1);
  expect(saved.events[0]).toMatchObject({ kind: 'review', cardId: 'it-limone', rating: 4, grade: 3 });
  expect(saved.states['it-limone'].reps).toBe(1);
  expect(saved.states['it-limone'].version).toBe(1);
  expect(Date.parse(saved.states['it-limone'].due)).toBeGreaterThan(Date.parse(saved.events[0].timestamp));

  await page.getByRole('button', { name: 'End session', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
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
  await page.getByLabel('Front text / library prompt').fill('Say “thank you” in Italian.');
  await page.getByLabel('Back text / answer', { exact: true }).fill('grazie');
  await page.getByLabel('Approximate pronunciation').fill('GRAHT-see-eh');
  await page.getByLabel('Meaning', { exact: true }).fill('thank you');
  await page.getByLabel(/Tags/).fill('courtesy, everyday');
  await page.getByRole('button', { name: 'Save card', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Card saved.');
  await page.getByRole('button', { name: 'Edit grazie', exact: true }).click();
  await page.getByLabel('Front text / library prompt').fill('Say “thank you very much” in Italian.');
  await page.getByLabel('Back text / answer', { exact: true }).fill('grazie mille');
  await page.getByLabel('Meaning', { exact: true }).fill('thank you very much');
  await page.getByRole('button', { name: 'Save card', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'grazie mille', exact: true })).toBeVisible();
  await page.reload();
  await navigate(page, 'Decks');
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
  await page.getByRole('button', { name: /Undo/ }).click();
  await expect(page.locator('.session-bar')).toContainText('0 / 10');
  await expect(page.getByRole('region', { name: 'Current flashcard' }).locator('img')).toHaveAttribute('src', '/art/limone.svg');
  const saved = await snapshot(page);
  expect(saved.events).toHaveLength(2);
  expect(saved.events[0].kind).toBe('review');
  expect(saved.events[1]).toMatchObject({ kind: 'reversal', reviewEventId: saved.events[0].id });
  expect(saved.states['it-limone'].reps).toBe(0);
  await page.getByRole('button', { name: 'End session', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByTestId('today-count')).toContainText('0');
  await page.reload();
  await expect(page.getByTestId('today-count')).toContainText('0');
  expect((await snapshot(page)).events).toEqual(saved.events);
});

test('collection explicitly previews seven tiers and effects preference persists', async ({ page }) => {
  await openApp(page); await navigate(page, 'Collection');
  await expect(page.getByRole('heading', { name: 'Design samples', exact: true })).toBeVisible();
  await expect(page.locator('.sample-button')).toHaveCount(7);
  for (const rarity of ['common', 'uncommon', 'rare', 'holo-rare', 'ultra-rare', 'secret-rare', 'relic']) {
    await page.locator(`.sample-button[data-rarity="${rarity}"]`).click();
    await expect(page.locator('.inspection-card .memory-card')).toHaveAttribute('data-rarity', rarity);
    await expect(page.getByText('Design sample · not earned', { exact: true })).toBeVisible();
  }
  const motion = page.locator('.inspection-card .card-motion');
  await motion.evaluate(element => element.scrollIntoView({behavior:'instant',block:'center'}));
  await expect(motion).toHaveClass(/motion-enabled/);
  await motion.hover({ position: { x: 25, y: 30 } });
  await expect.poll(() => motion.evaluate(element => (element as HTMLElement).style.getPropertyValue('--px'))).not.toBe('');
  expect((await snapshot(page)).events).toEqual([]);
  expect((await snapshot(page)).rewardEvents).toEqual([]);
  await navigate(page, 'Settings');
  await page.getByRole('switch', { name: 'Card effects' }).click();
  await expect(page.getByRole('switch', { name: 'Card effects' })).not.toBeChecked();
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Card effects' })).not.toBeChecked();
  await navigate(page, 'Collection');
  await expect(page.locator('.inspection-card .memory-card')).not.toHaveClass(/effects/);
  expect((await snapshot(page)).preferences.effects).toBe(false);
});

test('mobile layout and reduced motion suppress shimmer, reveal and pointer animations', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page); await expectNoOverflow(page);
  await page.getByRole('button', { name: /Start studying/ }).click(); await expectNoOverflow(page);
  await revealCard(page);
  await expect(page.locator('.card-motion')).not.toHaveClass(/motion-enabled/);
  expect(await page.locator('.card-turn').evaluate(element => element.getAnimations().length)).toBe(0);
  await expectNoOverflow(page); await navigate(page, 'Collection');
  await page.locator('.sample-button[data-rarity="holo-rare"]').click();
  await expect(page.locator('.inspection-card .memory-card')).not.toHaveClass(/effects/);
  await page.locator('.inspection-card .card-motion').hover({ position: { x: 25, y: 30 } });
  expect(await page.locator('.inspection-card .card-motion').evaluate(element => (element as HTMLElement).style.getPropertyValue('--px'))).toBe('');
  await expectNoOverflow(page); await navigate(page, 'Decks'); await expectNoOverflow(page);
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
  await navigate(page, 'Dashboard');
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
  await expect(page.locator('.session-bar')).toContainText('1 / 10');
  const saved = await snapshot(page);
  expect(saved.events).toHaveLength(1);
  expect(saved.events[0]).toMatchObject({ rating: 3, grade: 3 });
});

test('converting a visual card to text removes its image and restores the text prompt', async ({ page }) => {
  await openApp(page);
  await navigate(page, 'Decks');
  await page.getByRole('button', { name: 'Edit il limone', exact: true }).click();
  await selectMaterial(page, 'Card type', 'Text prompt with optional image');
  await page.getByText('Advanced presentation and media', { exact: true }).click();
  await page.getByRole('button', { name: 'Remove front image', exact: true }).click();
  await page.getByLabel('Front text / library prompt').fill('Translate “the lemon” into Italian.');
  await page.getByRole('button', { name: 'Save card', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Card saved.');
  await page.reload();
  await navigate(page, 'Dashboard');
  await page.getByRole('button', { name: /Start studying/ }).click();
  const flashcard = page.getByRole('region', { name: 'Current flashcard' });
  await expect(flashcard.getByRole('heading', { name: 'Translate “the lemon” into Italian.', exact: true })).toBeVisible();
  await expect(flashcard.locator('img')).toHaveCount(0);
  await expect(flashcard.getByText('il limone', { exact: true })).toHaveCount(0);
  const card = (await snapshot(page)).cards.find(item => item.id === 'it-limone');
  expect(card).toMatchObject({ kind: 'text', revision: 2 });
  expect(card?.image).toBeUndefined();
  expect(card?.imageDescription).toBeTruthy();
});

test('JSON download restores cards and review history into an untouched browser context', async ({ page, browser }) => {
  await openApp(page);
  await page.getByRole('button', { name: /Start studying/ }).click();
  await confidentReview(page);
  const source = await snapshot(page);
  await navigate(page, 'Settings');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Download JSON backup/ }).click(),
  ]);
  const path = await download.path();
  expect(path).toBeTruthy();
  const buffer = await readFile(path!);
  const backup = JSON.parse(buffer.toString()) as { format: string; version: number; state: State };
  expect(backup).toMatchObject({ format: 'holorecall-backup', version: 6 });
  expect(backup.state.events).toEqual(source.events);
  expect(backup.state.cards).toEqual(source.cards);

  const context = await browser.newContext();
  const restoredPage = await context.newPage();
  const errors: string[] = [];
  restoredPage.on('pageerror', error => errors.push(error.message));
  try {
    await restoredPage.goto('http://127.0.0.1:4200/');
    await expect(restoredPage.getByTestId('today-count')).toContainText('0');
    await navigate(restoredPage, 'Settings');
    await restoredPage.getByLabel('Restore full backup').setInputFiles({
      name: download.suggestedFilename(), mimeType: 'application/json', buffer,
    });
    await expect(restoredPage.getByRole('status')).toContainText('Backup restored.');
    await restoredPage.reload();
    await navigate(restoredPage, 'Dashboard');
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
