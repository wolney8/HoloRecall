import { test, expect, openApp, navigate, snapshot, expectNoOverflow } from './helpers';
import type { Page } from '@playwright/test';

async function installManualCase(page: Page): Promise<string> {
  return page.evaluate(() => new Promise<string>((resolve, reject) => {
    const request = indexedDB.open('holorecall-local-v1', 2);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('local-study', 'readwrite');
      const store = transaction.objectStore('local-study');
      const read = store.get('snapshot');
      read.onerror = () => reject(read.error);
      read.onsuccess = () => {
        const state = read.result;
        const card = state.cards[0];
        card.front = 'Five letters. How many vowel sounds?';
        card.answer = '5 lettere → 7 suoni vocalici';
        card.pronunciation = 'cinque lettere → sette suoni vocalici';
        card.meaning = 'Five written vowel letters → seven main vowel sounds.';
        card.details = [
          { label: 'Pattern / sound', content: 'A · E (open/closed) · I · O (open/closed) · U' },
          { label: 'Reference', content: '', blocks: [{ type: 'table', headers: ['Letter', 'Sounds'], rows: [['E', 'open / closed'], ['O', 'open / closed']] }] },
        ];
        card.presentation = { profile: 'language', recallTask: card.front, recallCue: 'A · E · I · O · U', taskGuidance: 'Check the pattern', artRole: 'decorative', studyArtPolicy: 'text-first' };
        card.revision += 1;
        state.version += 1;
        store.put(state, 'snapshot');
        transaction.oncomplete = () => { db.close(); resolve(card.id); };
        transaction.onerror = () => reject(transaction.error);
      };
    };
  }));
}

test('HR-PRESENTATION-01 text-first alignment, Collection spacing and real grid flip', async ({ page }, testInfo) => {
  await openApp(page);
  const cardId = await installManualCase(page);
  await page.reload();
  await navigate(page, 'Collection');

  const item = page.locator('.collectible-item').filter({ has: page.getByText('Five letters. How many vowel sounds?', { exact: true }) }).first();
  const motion = item.locator('.collectible-card .card-motion');
  await expect(item).toBeVisible();
  await expect(motion).toHaveAttribute('aria-label', 'Show card answer');
  await expect(motion).toHaveAttribute('aria-pressed', 'false');

  const alignment = await item.evaluate(element => {
    const read = (selector: string) => {
      const node = element.querySelector(selector) as HTMLElement;
      const style = getComputedStyle(node);
      return { center: node.getBoundingClientRect().left + node.getBoundingClientRect().width / 2, align: style.textAlign, width: node.getBoundingClientRect().width };
    };
    return [read('.card-copy h3'), read('.recall-cue'), read('.recall-guidance')];
  });
  expect(alignment.every(value => value.align === 'center')).toBe(true);
  expect(Math.max(...alignment.map(value => value.center)) - Math.min(...alignment.map(value => value.center))).toBeLessThanOrEqual(1);
  expect(Math.max(...alignment.map(value => value.width)) - Math.min(...alignment.map(value => value.width))).toBeLessThanOrEqual(1);

  const before = await snapshot(page);
  await motion.click();
  await expect(motion).toHaveAttribute('aria-label', 'Show card front');
  await motion.click();
  await expect(motion).toHaveAttribute('aria-label', 'Show card answer');
  await motion.focus();
  await motion.press('Space');
  await expect(motion).toHaveAttribute('aria-label', 'Show card front');
  await motion.press('Enter');
  await expect(motion).toHaveAttribute('aria-label', 'Show card answer');

  const box = await motion.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 48, box!.y + box!.height / 2);
  await page.mouse.up();
  await expect(motion).toHaveAttribute('aria-label', 'Show card answer');

  await item.getByRole('button', { name: /Inspect/ }).click();
  const support = page.locator('.inspection-details hr-answer-support');
  const practice = page.locator('.inspection-details .practice-card-actions');
  await expect(support).toBeVisible();
  const [supportBox, practiceBox] = await Promise.all([support.boundingBox(), practice.boundingBox()]);
  expect(supportBox).toBeTruthy(); expect(practiceBox).toBeTruthy();
  expect(practiceBox!.y - (supportBox!.y + supportBox!.height)).toBeGreaterThanOrEqual(20);

  const after = await snapshot(page);
  expect(after.events).toEqual(before.events);
  expect(after.rewardEvents).toEqual(before.rewardEvents);
  expect(after.cards.find(card => card.id === cardId)?.answer).toBe('5 lettere → 7 suoni vocalici');
  await expectNoOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('collection-grid-flip-and-spacing.png'), fullPage: true });
});

test('HR-PRESENTATION-01 Study support owns a full stage row', async ({ page }, testInfo) => {
  await openApp(page);
  await installManualCase(page);
  await page.reload();
  await navigate(page, 'Collection');
  await page.locator('.inspection-details .practice-card-actions').getByRole('button', { name: 'Practice this card' }).click();
  await expect(page.getByRole('heading', { name: 'Practice', exact: true })).toBeVisible();
  await page.getByTestId('study-deck-stage').locator('[role="button"]').click({ position: { x: 70, y: 70 } });
  await expect(page.locator('.study-card-area .memory-card')).toHaveClass(/revealed/);
  const layout = page.locator('.study-layout');
  const support = layout.locator(':scope > .study-answer-support');
  await expect(support).toBeVisible();
  expect(await support.evaluate(node => node.parentElement?.classList.contains('study-layout'))).toBe(true);
  const [card, ratings, supportBox] = await Promise.all([
    layout.locator(':scope > .study-card-area').boundingBox(),
    layout.locator(':scope > .study-controls').boundingBox(),
    support.boundingBox(),
  ]);
  expect(card).toBeTruthy(); expect(ratings).toBeTruthy(); expect(supportBox).toBeTruthy();
  expect(supportBox!.x).toBeLessThanOrEqual(card!.x + 1);
  expect(supportBox!.x + supportBox!.width).toBeGreaterThanOrEqual(ratings!.x + ratings!.width - 1);
  expect(supportBox!.y).toBeGreaterThanOrEqual(Math.max(card!.y + card!.height, ratings!.y + ratings!.height) - 1);
  await support.getByText('Card Details', { exact: true }).click();
  await expect(support.getByRole('heading', { name: 'Pattern / sound' })).toBeVisible();
  await expect(support.getByRole('table')).toBeVisible();
  await expectNoOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('study-support-full-stage.png'), fullPage: true });
});

test('HR-PRESENTATION-01 compact Study stacks card, rating and support @ios-compact', async ({ page }) => {
  await openApp(page);
  await installManualCase(page);
  await page.reload();
  await navigate(page, 'Collection');
  await page.locator('.inspection-details .practice-card-actions').getByRole('button', { name: 'Practice this card' }).click();
  await page.getByTestId('study-deck-stage').locator('[role="button"]').click({ position: { x: 60, y: 60 } });
  await expect(page.locator('.study-card-area .memory-card')).toHaveClass(/revealed/);
  const layout = page.locator('.study-layout');
  const [card, ratings, support] = await Promise.all([
    layout.locator(':scope > .study-card-area').boundingBox(),
    layout.locator(':scope > .study-controls').boundingBox(),
    layout.locator(':scope > .study-answer-support').boundingBox(),
  ]);
  expect(card).toBeTruthy(); expect(ratings).toBeTruthy(); expect(support).toBeTruthy();
  expect(ratings!.y).toBeGreaterThanOrEqual(card!.y + card!.height - 1);
  expect(support!.y).toBeGreaterThanOrEqual(ratings!.y + ratings!.height - 1);
  await expectNoOverflow(page);
});

test('HR-PRESENTATION-01 corrected surfaces reflow across supported desktop widths and 200% text', async ({ page }) => {
  await openApp(page);
  await installManualCase(page);
  await page.reload();
  await navigate(page, 'Collection');
  for (const size of [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(size);
    await expectNoOverflow(page);
    await expect(page.locator('.collectible-card .card-motion').first()).toBeVisible();
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await page.setViewportSize({ width: 1024, height: 768 });
  await expectNoOverflow(page);
  await expect(page.locator('.collectible-card .card-motion').first()).toHaveAttribute('aria-label', 'Show card answer');
});
