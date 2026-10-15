import { expect, test } from '@playwright/test';

test.describe('Visual Effects Lab v2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#effects-lab');
    await expect(page.getByRole('heading', { name: 'Visual Effects Lab' })).toBeVisible();
  });

  test('is directly reachable but absent from product navigation', async ({ page }) => {
    await expect(page.locator('nav[aria-label="Main navigation"]')).not.toContainText('Visual Effects Lab');
    await expect(page.locator('nav[aria-label="Primary navigation"]')).not.toContainText('Visual Effects Lab');
    await page.goto('/#dashboard');
    await expect(page.getByRole('heading', { name: 'Study dashboard' })).toBeVisible();
    await expect(page.locator('nav[aria-label="Main navigation"]')).not.toContainText('Visual Effects Lab');
    await expect(page.locator('nav[aria-label="Primary navigation"]')).not.toContainText('Visual Effects Lab');
  });

  test('runs pennant to sticker to peel to pennant without a collision', async ({ page }) => {
    const card = page.locator('.peel-card');
    await expect(card).toHaveAttribute('data-clue-state', 'hidden');
    await page.getByRole('button', { name: 'Show pennant' }).click();
    await expect(card).toHaveAttribute('data-clue-state', 'rolled');
    await page.getByRole('button', { name: 'Unfurl pennant' }).click();
    await expect(card).toHaveAttribute('data-clue-state', 'visible');
    const pennant = await page.locator('.clue-pennant').boundingBox();
    const magnifier = await page.locator('.magnifier-sample').boundingBox();
    expect(pennant).not.toBeNull(); expect(magnifier).not.toBeNull();
    expect(pennant!.y).toBeGreaterThanOrEqual(magnifier!.y + magnifier!.height + 5);

    await page.getByRole('button', { name: 'Open clue', exact: true }).first().click();
    await expect(card).toHaveAttribute('data-clue-state', 'sticker');
    const sticker = page.locator('.peel-object');
    const size = await sticker.boundingBox();
    const sheetWidth = await sticker.evaluate(element => parseFloat(getComputedStyle(element).width));
    expect(sheetWidth).toBe(268);
    // The resting peel includes a slight physical rotation, so its transformed
    // bounding box is intentionally a few pixels wider than the sheet geometry.
    expect(size!.width).toBeLessThanOrEqual(274);
    expect(size!.width).toBeGreaterThanOrEqual(250);
    expect(parseFloat(await page.locator('.clue-copy').evaluate(element => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
    await sticker.click({ position: { x: size!.width / 2, y: size!.height / 2 } });
    await expect(card).toHaveAttribute('data-clue-state', 'visible');
    await expect(card).toHaveAttribute('data-peel-progress', '1.000');
    expect(Number(await card.getAttribute('data-geometric-frames'))).toBeGreaterThan(2);
  });

  test('motion policy keeps reduced geometry static and effects independent', async ({ page }) => {
    const motion = page.locator('[aria-label="Motion policy"]');
    await motion.getByRole('button', { name: 'Reduced' }).click();
    await expect(motion.getByRole('button', { name: 'Reduced' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('Reduced Motion')).toBeChecked();
    await page.getByRole('button', { name: 'Show pennant' }).click();
    await page.getByRole('button', { name: 'Unfurl pennant' }).click();
    await page.getByRole('button', { name: 'Open clue', exact: true }).first().click();
    const card = page.locator('.peel-card');
    const frames = Number(await card.getAttribute('data-geometric-frames'));
    await page.locator('.peel-object').click();
    await expect(card).toHaveAttribute('data-clue-state', 'visible');
    expect(Number(await card.getAttribute('data-geometric-frames'))).toBe(frames);
    await page.getByRole('button', { name: 'Effects Off' }).click();
    await expect(page.locator('.surface-card')).toHaveAttribute('data-effects', 'false');
    await expect(motion.getByRole('button', { name: 'Reduced' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('previews Light Dark and System with continuous surface-linked reflection', async ({ page }) => {
    const appearance = page.locator('[aria-label="Appearance"]');
    const stage = page.locator('.theme-stage');
    await appearance.getByRole('button', { name: 'Dark' }).click();
    await expect(stage).toHaveAttribute('data-preview-theme', 'dark');
    await appearance.getByRole('button', { name: 'Light' }).click();
    await expect(stage).toHaveAttribute('data-preview-theme', 'light');
    await appearance.getByRole('button', { name: 'System' }).click();
    await expect(stage).toHaveAttribute('data-theme-choice', 'system');
    await expect(stage).not.toHaveAttribute('data-preview-theme', /.+/);

    const card = page.locator('.surface-card');
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    await card.hover({ position: { x: box!.width * .8, y: box!.height * .25 } });
    await expect.poll(() => card.evaluate(element => getComputedStyle(element).getPropertyValue('--lab-spec-strength').trim())).not.toBe('0.000');
    const first = await card.evaluate(element => getComputedStyle(element).getPropertyValue('--lab-spec-x').trim());
    await card.hover({ position: { x: box!.width * .2, y: box!.height * .75 } });
    await expect.poll(() => card.evaluate(element => getComputedStyle(element).getPropertyValue('--lab-spec-x').trim())).not.toBe(first);
  });

  test('keeps rarity materials and the Answer halo distinct', async ({ page }) => {
    const card = page.locator('.surface-card');
    for (const rarity of ['Common', 'Holo Rare', 'Ultra Rare']) {
      await page.locator('[aria-label="Rarity"]').getByRole('button', { name: rarity, exact: true }).click();
      await expect(card).toHaveAttribute('data-rarity', rarity.toLowerCase().replace(' ', '-'));
    }
    await page.locator('[aria-label="Card face"]').getByRole('button', { name: 'Answer' }).click();
    await expect(card).toHaveAttribute('data-signature', 'answer-halo');
    const background = await page.locator('.answer-halo').evaluate(element => getComputedStyle(element).backgroundImage);
    expect(background).toContain('radial-gradient');
    expect(background).not.toContain('linear-gradient');
  });

  test('demonstrates press release and pressure-to-flip', async ({ page }) => {
    const card = page.locator('.press-card');
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await expect(card).toHaveAttribute('data-press-state', 'pressed');
    await page.mouse.up();
    await expect(card).toHaveAttribute('data-press-state', 'rest');
    await page.getByRole('button', { name: 'Press + flip' }).click();
    await expect(card).toHaveAttribute('data-face', 'answer');
    await expect(card).toHaveAttribute('data-press-state', 'rest');
  });

  test('runs deterministic rarity reveal phases with reduced alternative', async ({ page }) => {
    const card = page.locator('.unlock-card');
    await page.locator('[aria-label="Unlock rarity"]').getByRole('button', { name: 'Ultra Rare' }).click();
    await page.getByRole('button', { name: 'Reveal earned card' }).click();
    await expect(card).toHaveAttribute('data-phase', 'settled');
    await expect(card).toHaveAttribute('data-phase-trace', 'idle>rise>edge>flip>bloom>settled');
    await page.locator('[aria-label="Motion policy"]').getByRole('button', { name: 'Reduced' }).click();
    await page.getByRole('button', { name: 'Reveal earned card' }).click();
    await expect(card).toHaveAttribute('data-reduced-motion', 'true');
    await expect(card).toHaveAttribute('data-phase', 'settled');
  });

  test('keeps Prestige promotion separate from unlock', async ({ page }) => {
    const card = page.locator('.prestige-card');
    await page.getByRole('button', { name: 'Promote to P III' }).click();
    await expect(card).toHaveAttribute('data-prestige-phase', 'settled');
    await expect(card.getByText('P III')).toBeVisible();
    await expect(page.locator('.unlock-card')).toHaveAttribute('data-phase', 'idle');
  });

  test('compares generic and card-local rating feedback', async ({ page }) => {
    const grid = page.locator('.feedback-grid');
    await page.locator('.rating-buttons').getByRole('button', { name: '5', exact: true }).click();
    await expect(grid).toHaveAttribute('data-rating', '5');
    await expect(grid).toHaveAttribute('data-rating-phase', 'settled');
    await expect(page.locator('.generic-feedback')).toHaveCount(1);
    await expect(page.locator('.local-feedback')).toHaveCount(1);
  });

  test('retains approved pronunciation semantics and cleans up on destroy', async ({ page }) => {
    await expect(page.locator('[data-secondary-kind="pronunciation"] .sample-secondary')).toHaveText('“l”');
    await expect(page.locator('[data-secondary-kind="generic"] .sample-secondary')).toHaveText('Used before a vowel');
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.getByRole('button', { name: 'Press + flip' }).click();
    await page.goto('/#dashboard');
    await expect(page.getByRole('heading', { name: 'Study dashboard' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('remains inspectable at tablet and compact widths without page overflow', async ({ page }) => {
    for (const viewport of [{ width: 1024, height: 768 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Visual Effects Lab' })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      await expect(page.getByRole('heading', { name: 'Pennant, sticker and layered peel' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Approved semantic distinction' })).toBeAttached();
    }
  });
});
