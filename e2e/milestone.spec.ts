import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import type { State } from '../src/domain/models';
import { test, expect, openApp, snapshot, confidentReview, navigate, selectMaterial, expectNoOverflow } from './helpers';

async function localArtwork(page: Page): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 120; canvas.height = 180;
    const context = canvas.getContext('2d')!; context.fillStyle = '#d2a764'; context.fillRect(0, 0, 120, 180);
    context.fillStyle = '#315744'; context.fillRect(10, 10, 100, 160); context.clearRect(20, 30, 80, 100);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  return { name: 'original-test-frame.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') };
}
const appearance = (page: Page) => page.getByRole('radiogroup', { name: 'Appearance', exact: true });

test('System follows device; explicit themes persist and dark startup paints before Angular loads', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' }); await openApp(page);
  await expect(appearance(page).getByRole('radio', { name: 'System', exact: true })).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'system');
  const darkBackground = await page.locator('body').evaluate(element => getComputedStyle(element).backgroundColor);
  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(() => page.locator('body').evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(darkBackground);
  await appearance(page).getByRole('radio', { name: 'Dark', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect((await snapshot(page)).preferences.theme).toBe('dark');
  expect(await page.evaluate(() => localStorage.getItem('holorecall-theme'))).toBe('dark');
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  await page.route(/\/main\.js(?:\?.*)?$/, async route => { await blocked; await route.continue(); });
  try {
    await page.reload({ waitUntil: 'commit' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const rgb = await page.locator('body').evaluate(element => getComputedStyle(element).backgroundColor.match(/\d+/g)!.map(Number));
    expect(Math.max(...rgb.slice(0, 3)), 'Pre-app background stays dark').toBeLessThan(70);
    expect(await page.locator('app-root').textContent()).toBe('');
  } finally { release(); }
  await expect(page.getByRole('heading', { name: 'Study dashboard', exact: true })).toBeVisible();
  await expect(appearance(page).getByRole('radio', { name: 'Dark', exact: true })).toBeChecked();
  await appearance(page).getByRole('radio', { name: 'Light', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(appearance(page).getByRole('radio', { name: 'Light', exact: true })).toBeChecked();
});

test('uploaded design artwork survives assignment, reload and a portable full-progress backup', async ({ page }) => {
  await openApp(page); const original = await snapshot(page); await navigate(page, 'Design Studio');
  await page.getByLabel('Design name', { exact: true }).fill('Family forest frames');
  await page.getByLabel('Artist / attribution').fill('Original family artwork');
  await page.getByLabel('Licence / permission').fill('Permission for personal study');
  const artwork = await localArtwork(page);
  await page.getByLabel('Upload or replace background').setInputFiles(artwork);
  await expect(page.getByRole('status')).toContainText('Artwork uploaded locally');
  await expect(page.getByRole('button', { name: 'Save design', exact: true })).toBeEnabled();
  await page.getByLabel('Upload or replace frame').setInputFiles(artwork);
  await expect(page.locator('.studio-card .frame-layer img')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await selectMaterial(page, 'Background fit', 'Fit entire image');
  await page.getByLabel('Horizontal crop').focus(); await page.getByLabel('Horizontal crop').press('ArrowRight');
  await selectMaterial(page, 'Deck', 'Italian essentials');
  await page.getByRole('button', { name: 'Save and assign', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Design saved and assigned');
  const saved = await snapshot(page);
  expect(saved.designs).toHaveLength(1); expect(saved.assets).toHaveLength(1);
  expect(saved.decks[0].designSetId).toBe(saved.designs[0].id);
  expect(saved.designs[0]).toMatchObject({ backgroundFit: 'contain', backgroundPositionX: 51, credit: 'Original family artwork' });
  expect(saved.cards).toEqual(original.cards); expect(saved.events).toEqual([]); expect(saved.rewardEvents).toEqual([]);
  expect(saved.assets.every(asset => asset.dataUrl.startsWith('data:image/png;base64,'))).toBe(true);
  await page.reload(); await selectMaterial(page, 'Saved design', 'Family forest frames');
  await expect(page.locator('.studio-card .background-layer img')).toHaveAttribute('src', saved.assets[0].dataUrl);
  await page.getByRole('radiogroup', { name: 'Preview theme' }).getByRole('radio', { name: 'Dark', exact: true }).click();
  await expect(page.locator('.studio-preview')).toHaveAttribute('data-preview-theme', 'dark');
  await page.getByRole('combobox', { name: 'Preview rarity', exact: true }).click();
  await page.getByRole('option', { name: /Relic$/ }).click();
  await expect(page.locator('.studio-card .memory-card')).toHaveAttribute('data-rarity', 'relic');
  await navigate(page, 'Dashboard'); await page.getByRole('button', { name: /Start studying/ }).click();
  await expect(page.locator('.study-card-area .frame-layer img')).toHaveAttribute('src', saved.assets[0].dataUrl);
  await navigate(page, 'Settings');
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: /Download JSON backup/ }).click();
  const backupPath = await (await download).path();
  const backup = JSON.parse((await readFile(backupPath!)).toString()) as { version: number; state: State };
  expect(backup.version).toBe(6); expect(backup.state.assets).toEqual(saved.assets); expect(backup.state.designs).toEqual(saved.designs);
});

test('revealed session and selected scheduler order recover from reload without double reviews', async ({ page }) => {
  await openApp(page); await page.getByRole('button', { name: /Start studying/ }).click();
  const start = await snapshot(page); await page.getByRole('button', { name: /Reveal answer/ }).click();
  await expect(page.getByRole('heading', { name: 'il limone', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'il limone', exact: true })).toBeVisible();
  expect((await snapshot(page)).session).toMatchObject({ id: start.session!.id, revealed: true, queue: start.session!.queue });
  await page.locator('body').press('4'); await page.locator('body').press('4');
  await expect(page.locator('.session-bar')).toContainText('1 / 10');
  const graded = await snapshot(page);
  expect(graded.events).toHaveLength(1); expect(graded.session!.queue).toEqual(start.session!.queue.slice(1));
  expect(graded.rewardEvents.filter(event => event.kind === 'contribution')).toHaveLength(1);
  await page.reload();
  await expect(page.locator('.study-card-area .illustration-layer img')).toHaveAttribute('src', '/art/caffe.svg');
  await expect(page.getByRole('button', { name: /Reveal answer/ })).toBeVisible();
  expect((await snapshot(page)).events).toEqual(graded.events);
  expect((await snapshot(page)).session!.queue).toEqual(graded.session!.queue);
});

test('Progress uses real outcomes, active time and filters, and undo removes the contribution', async ({ page }) => {
  await openApp(page); await page.getByRole('button', { name: /Start studying/ }).click(); await page.bringToFront();
  // Allow one actual foreground timer tick; no fabricated review time is injected.
  await page.waitForTimeout(1200); await confidentReview(page);
  const reviewed = await snapshot(page); expect(reviewed.events[0]).toMatchObject({ rating: 4, mode: 'scheduled' });
  expect(reviewed.events[0].kind === 'review' && reviewed.events[0].activeMs! > 0).toBe(true);
  await navigate(page, 'Progress');
  await expect(page.getByText('1 scheduled reviews in the period', { exact: true })).toBeVisible();
  await expect(page.getByText('1 timed reviews · legacy reviews have no time data', { exact: true })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Rating 4: 1 reviews', exact: true })).toBeVisible();
  await expect(page.getByText('1 cards unlocked', { exact: true })).toBeVisible();
  const future = new Date(Date.now() + 86400000 * 10).toISOString().slice(0, 10);
  await page.getByLabel('From date', { exact: true }).fill(future);
  await expect(page.getByText('0 scheduled reviews in the period', { exact: true })).toBeVisible();
  await expect(page.getByText('1 cards unlocked', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'All time', exact: true }).click(); await navigate(page, 'Study');
  await page.getByRole('button', { name: /Undo/ }).click(); await navigate(page, 'Progress');
  await expect(page.getByText('0 scheduled reviews in the period', { exact: true })).toBeVisible();
  await expect(page.getByText('0 cards unlocked', { exact: true })).toBeVisible();
  await expect(page.getByText('Complete a scheduled review to see your outcomes.', { exact: true })).toBeVisible();
  const undone = await snapshot(page); expect(undone.events).toHaveLength(2); expect(undone.rewardEvents.at(-1)?.kind).toBe('reward-reversal');
});

test('real IndexedDB v1 upgrade preserves its original snapshot and review history', async ({ page }) => {
  await openApp(page); await page.getByRole('button', { name: /Start studying/ }).click(); await confidentReview(page); await navigate(page, 'Dashboard');
  const reviewed = await snapshot(page);
  const legacy = structuredClone(reviewed) as unknown as Record<string, unknown>; legacy['schemaVersion'] = 1;
  for (const key of ['assets', 'designs', 'rewardEvents', 'rewardConfig', 'session', 'ankiMappings']) delete legacy[key];
  for (const card of legacy['cards'] as State['cards']) { delete card.rarity; if (card.kind === 'text') { delete card.image; delete card.imageDescription; } }
  await page.evaluate(value => new Promise<void>((resolve, reject) => {
    const open = indexedDB.open('holorecall-local-v1', 2); open.onerror = () => reject(open.error);
    open.onsuccess = () => { const db = open.result, tx = db.transaction('local-study', 'readwrite'); tx.objectStore('local-study').put(value, 'snapshot'); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
  }), legacy);
  await page.reload(); await expect(page.getByTestId('today-count')).toContainText('1');
  const upgraded = await snapshot(page);
  expect(upgraded.schemaVersion).toBe(6); expect(upgraded.ankiMappings).toEqual([]); expect(upgraded.practiceEvents).toEqual([]); expect(upgraded.focusPresets).toEqual([]); expect(upgraded.events).toEqual(reviewed.events); expect(upgraded.states).toEqual(reviewed.states);
  expect(upgraded.rewardEvents).toEqual([]); expect(upgraded.cards.every(card => card.image?.startsWith('/art/'))).toBe(true);
  expect(upgraded.cards.every(card => card.revision === 1)).toBe(true);
  const preserved = await page.evaluate(() => new Promise<unknown>((resolve, reject) => {
    const open = indexedDB.open('holorecall-local-v1', 2); open.onerror = () => reject(open.error);
    open.onsuccess = () => { const db = open.result, tx = db.transaction('local-study'), request = tx.objectStore('local-study').get('migration-v1-original'); request.onsuccess = () => resolve(request.result); tx.oncomplete = () => db.close(); };
  }));
  expect(preserved).toEqual(legacy);
});

test('all 16 Italian subjects display distinct intended illustrations on both faces', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await openApp(page); const data = await snapshot(page);
  expect(data.cards).toHaveLength(16); expect(new Set(data.cards.map(card => card.image)).size).toBe(16);
  await navigate(page, 'Collection');
  for (const card of data.cards) {
    await page.getByRole('button', { name: `Inspect ${card.answer}`, exact: true }).click();
    const image = page.locator('.inspection-card .illustration-layer img');
    await expect(image).toHaveAttribute('src', `/art/${card.id.replace('it-', '')}.svg`);
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator('.inspection-card').getByRole('heading', { name: card.answer, exact: true })).toBeVisible();
    await page.locator('.inspection-card .card-motion').click();
    await expect(image).toHaveAttribute('src', card.image!);
    if (card.kind === 'visual') await expect(page.locator('.inspection-card').getByText(card.answer, { exact: true })).toHaveCount(0);
    else await expect(page.locator('.inspection-card').getByRole('heading', { name: card.front, exact: true })).toBeVisible();
  }
  expect((await snapshot(page)).events).toEqual([]); expect((await snapshot(page)).rewardEvents).toEqual([]);
});

for (const theme of ['Light', 'Dark']) test(`mobile ${theme.toLowerCase()} layout fits Study, Collection, Design Studio and Progress`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await openApp(page);
  await appearance(page).getByRole('radio', { name: theme, exact: true }).click(); await expectNoOverflow(page);
  await page.getByRole('button', { name: /Start studying/ }).click(); await page.getByRole('button', { name: /Reveal answer/ }).click();
  for (const screen of ['Study', 'Collection', 'Design Studio', 'Progress']) {
    await navigate(page, screen); await expect(page.getByRole('heading', { name: screen, exact: true })).toBeVisible();
    await expectNoOverflow(page);
    if (screen === 'Design Studio') await page.getByRole('radiogroup', { name: 'Preview theme' }).getByRole('radio', { name: theme, exact: true }).click();
    await page.waitForTimeout(850);
    await page.screenshot({ path: testInfo.outputPath(`${screen.replaceAll(' ', '-').toLowerCase()}-${theme.toLowerCase()}.png`), fullPage: true });
  }
});
