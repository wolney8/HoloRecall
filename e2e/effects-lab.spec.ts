import { expect, test } from '@playwright/test';

test.describe('Visual Effects Lab v4', () => {
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

  test('simulates timer unfurl and runs pennant to sticker to peel to pennant without a collision', async ({ page }) => {
    const card = page.locator('.peel-card');
    await expect(card).toHaveAttribute('data-clue-state', 'hidden');
    await page.getByRole('button', { name: 'Simulate timer complete' }).click();
    await expect(card).toHaveAttribute('data-clue-state', 'visible');
    await expect(card).toHaveAttribute('data-pennant-unfurls', '1');
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
    await expect(card).toHaveAttribute('data-pennant-unfurls', '2');
    expect(Number(await card.getAttribute('data-geometric-frames'))).toBeGreaterThan(2);
    await page.getByRole('button', { name: 'Reset clue' }).click();
    await expect(card).toHaveAttribute('data-clue-state', 'hidden');
  });

  test('overlaps peel layers and keeps the separation shadow below the underside', async ({ page }) => {
    const card = page.locator('.peel-card');
    await page.getByRole('button', { name: 'Simulate timer complete' }).click();
    await page.getByRole('button', { name: 'Open clue', exact: true }).first().click();
    await expect(card).toHaveAttribute('data-fold-overlap', '2');
    await expect(card).toHaveAttribute('data-seam-gap', '0');
    const layers = await page.locator('.peel-geometry > *:not(defs)').evaluateAll(elements => elements.map(element => element.getAttribute('class')));
    expect(layers).toEqual(['peel-shadow', 'peel-boundary', 'peel-underside']);
    const boundaryColour = await page.locator('.peel-boundary').evaluate(element => getComputedStyle(element).stroke);
    expect(boundaryColour).not.toBe('rgb(33, 61, 53)');
  });

  test('motion policy keeps reduced geometry static and effects independent', async ({ page }) => {
    const motion = page.locator('[aria-label="Motion policy"]');
    await motion.getByRole('button', { name: 'Reduced' }).click();
    await expect(motion.getByRole('button', { name: 'Reduced' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('Reduced Motion')).toBeChecked();
    await page.getByRole('button', { name: 'Simulate timer complete' }).click();
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
    await expect.poll(() => card.evaluate(element => getComputedStyle(element).getPropertyValue('--lab-ambient-strength').trim())).not.toBe('0.000');
    const firstAmbient = await card.evaluate(element => getComputedStyle(element).getPropertyValue('--lab-ambient-x').trim());
    const firstShimmer = await card.evaluate(element => getComputedStyle(element).getPropertyValue('--lab-shimmer-phase').trim());
    await card.hover({ position: { x: box!.width * .2, y: box!.height * .75 } });
    await expect.poll(() => card.evaluate(element => getComputedStyle(element).getPropertyValue('--lab-ambient-x').trim())).not.toBe(firstAmbient);
    await expect.poll(() => card.evaluate(element => getComputedStyle(element).getPropertyValue('--lab-shimmer-phase').trim())).not.toBe(firstShimmer);
    await expect(card.locator('.surface-ambient')).toHaveCount(1);
    await expect(card.locator('.surface-shimmer')).toHaveCount(1);
    const ambientMask = await card.locator('.surface-ambient').evaluate(element => getComputedStyle(element).maskImage);
    expect(ambientMask).toContain('118%');
  });

  test('keeps functional tilt when decorative effects are off', async ({ page }) => {
    await page.locator('[aria-label="Motion policy"]').getByRole('button', { name: 'Full' }).click();
    await page.getByRole('button', { name: 'Effects Off' }).click();
    const card = page.locator('.surface-card');
    const box = await card.boundingBox();
    await card.hover({ position: { x: box!.width * .82, y: box!.height * .24 } });
    await expect.poll(() => card.evaluate(element => getComputedStyle(element).getPropertyValue('--lab-tilt-y').trim())).not.toBe('0.00deg');
    await expect(card).toHaveCSS('--lab-shimmer-strength', '0.000');
  });

  test('keeps rarity materials and the Answer halo distinct', async ({ page }) => {
    const card = page.locator('.surface-card');
    for (const rarity of ['Common', 'Holo Rare', 'Ultra Rare']) {
      await page.locator('[aria-label="Rarity"]').getByRole('button', { name: rarity, exact: true }).click();
      await expect(card).toHaveAttribute('data-rarity', rarity.toLowerCase().replace(' ', '-'));
    }
    await page.locator('[aria-label="Card face"]').getByRole('button', { name: 'Answer' }).click();
    await expect(card).toHaveAttribute('data-signature', 'answer-halo');
    const background = await card.locator('.answer-halo').evaluate(element => getComputedStyle(element).backgroundImage);
    expect(background).toContain('radial-gradient');
    expect(background).not.toContain('linear-gradient');
  });

  test('distinguishes resting Common Holo and Ultra material in Light and Dark', async ({ page }) => {
    const appearance = page.locator('[aria-label="Appearance"]');
    const common = page.locator('.material-swatch[data-rarity="common"] .surface-substrate');
    const holo = page.locator('.material-swatch[data-rarity="holo-rare"] .surface-substrate');
    const ultra = page.locator('.material-swatch[data-rarity="ultra-rare"] .surface-substrate');
    await appearance.getByRole('button', { name: 'Light' }).click();
    const light = await Promise.all([common, holo, ultra].map(layer => layer.evaluate(element => Number(getComputedStyle(element).opacity))));
    expect(light[0]).toBe(0);
    expect(light[1]).toBeGreaterThan(0);
    expect(light[2]).toBeGreaterThan(light[1]!);
    expect(await holo.evaluate(element => getComputedStyle(element).mixBlendMode)).toBe('multiply');
    await appearance.getByRole('button', { name: 'Dark' }).click();
    await expect(page.locator('.theme-stage')).toHaveAttribute('data-preview-theme', 'dark');
    await expect.poll(() => holo.evaluate(element => getComputedStyle(element).mixBlendMode)).toBe('screen');
    expect(Number(await holo.evaluate(element => getComputedStyle(element).opacity))).toBeGreaterThan(0);
  });

  test('preserves surface orientation through damped press release and pressure-to-flip', async ({ page }) => {
    const card = page.locator('.press-card');
    await expect(card).toHaveAttribute('data-surface-model', 'shared');
    await expect(card).toHaveAttribute('data-release-model', 'critically-damped');
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    await page.mouse.move(box!.x + box!.width * .8, box!.y + box!.height * .3);
    await expect.poll(() => card.evaluate(element => getComputedStyle(element).getPropertyValue('--lab-shimmer-strength').trim())).not.toBe('0.000');
    const orientation = await card.evaluate(element => ({
      x: getComputedStyle(element).getPropertyValue('--lab-tilt-x').trim(),
      y: getComputedStyle(element).getPropertyValue('--lab-tilt-y').trim(),
    }));
    await page.mouse.down();
    await expect(card).toHaveAttribute('data-press-state', 'pressed');
    await page.mouse.up();
    await expect(card).toHaveAttribute('data-press-state', 'rest');
    await expect(card).toHaveCSS('--lab-press-y', '0px');
    await expect(card).toHaveCSS('--lab-press-scale', '1');
    expect(await card.evaluate(element => getComputedStyle(element).getPropertyValue('--lab-tilt-x').trim())).toBe(orientation.x);
    expect(await card.evaluate(element => getComputedStyle(element).getPropertyValue('--lab-tilt-y').trim())).toBe(orientation.y);
    await page.getByRole('button', { name: 'Press + flip' }).click();
    await expect(card).toHaveAttribute('data-face', 'answer');
    await expect(card).toHaveAttribute('data-press-state', 'rest');
  });

  test('runs deterministic rarity reveal phases with reduced alternative', async ({ page }) => {
    const card = page.locator('.unlock-card');
    const rarityControls = page.locator('[aria-label="Unlock rarity"]');
    for (const [rarity, fragments] of [['Common', '2'], ['Rare', '5'], ['Holo Rare', '9'], ['Ultra Rare', '14']] as const) {
      await rarityControls.getByRole('button', { name: rarity, exact: true }).click();
      await page.getByRole('button', { name: 'Reveal earned card' }).click();
      await expect(card).toHaveAttribute('data-fragment-count', fragments);
      if (rarity !== 'Ultra Rare') await page.locator('.unlock-section').getByRole('button', { name: 'Reset', exact: true }).click();
    }
    await expect(card).toHaveAttribute('data-phase', 'settled');
    await expect(card).toHaveAttribute('data-reward-metaphor', 'earned-card');
    await expect(card).toHaveAttribute('data-timeline-mode', 'coordinated');
    await expect(card).toHaveAttribute('data-face-swap-angle', '90');
    await expect(card).toHaveAttribute('data-fanfare-after-face', 'true');
    await expect(card).toHaveAttribute('data-phase-trace', 'idle>rise>edge>tilt>flip>resolve>bloom>digital>settled');
    await expect(card).toHaveAttribute('data-event-order', 'back>midpoint>face-resolved>fanfare>settled');
    await expect(card).toHaveAttribute('data-face-state', 'visible');
    await expect(card.locator('.unlock-revealed-content')).toHaveCSS('opacity', '1');
    await expect(page.locator('.unlock-stage')).not.toContainText(/pack|wrapper/i);
    await expect(page.locator('.unlock-stage [class*="pack"], .unlock-stage [class*="wrapper"]')).toHaveCount(0);
    const box = await card.boundingBox();
    await card.hover({ position: { x: box!.width * .78, y: box!.height * .25 } });
    await expect.poll(() => card.evaluate(element => getComputedStyle(element).getPropertyValue('--lab-shimmer-strength').trim())).not.toBe('0.000');
    await page.locator('.unlock-section').getByRole('button', { name: 'Reset', exact: true }).click();
    await page.locator('[aria-label="Motion policy"]').getByRole('button', { name: 'Reduced' }).click();
    await page.getByRole('button', { name: 'Reveal earned card' }).click();
    await expect(card).toHaveAttribute('data-reduced-motion', 'true');
    await expect(card).toHaveAttribute('data-phase', 'settled');
    await expect(card).toHaveAttribute('data-fragment-count', '0');
  });

  test('keeps Prestige promotion separate from unlock', async ({ page }) => {
    const card = page.locator('.prestige-card');
    await page.getByRole('button', { name: 'Promote to P III' }).click();
    await expect(card).toHaveAttribute('data-prestige-phase', 'settled');
    await expect(card.getByText('P III')).toBeVisible();
    await expect(page.locator('.unlock-card')).toHaveAttribute('data-phase', 'idle');
  });

  test('varies card-local digital feedback with rating', async ({ page }) => {
    const grid = page.locator('.feedback-grid');
    await page.locator('.rating-buttons').getByRole('button', { name: '1', exact: true }).click();
    await expect(grid).toHaveAttribute('data-rating-phase', 'settled');
    await expect(grid).toHaveAttribute('data-fragment-count', '0');
    await page.locator('.rating-buttons').getByRole('button', { name: '3', exact: true }).click();
    await expect(grid).toHaveAttribute('data-rating-phase', 'settled');
    await expect(grid).toHaveAttribute('data-fragment-count', '2');
    await page.locator('.rating-buttons').getByRole('button', { name: '5', exact: true }).click();
    await expect(grid).toHaveAttribute('data-rating', '5');
    await expect(grid).toHaveAttribute('data-rating-phase', 'settled');
    await expect(grid).toHaveAttribute('data-fragment-count', '6');
    await expect(page.locator('.generic-feedback')).toHaveCount(1);
    await expect(page.locator('.local-feedback')).toHaveCount(1);
    await page.locator('[aria-label="Motion policy"]').getByRole('button', { name: 'Reduced' }).click();
    await page.locator('.rating-buttons').getByRole('button', { name: '5', exact: true }).click();
    await expect(grid).toHaveAttribute('data-fragment-count', '0');
  });

  test('classifies Unicode micro answers and retains approved pronunciation semantics', async ({ page }) => {
    const section = page.locator('.micro-section');
    await expect(section).toHaveAttribute('data-unicode-grapheme-probe', '1');
    for (const [answer, count] of [['L’', '2'], ['CE', '2'], ['x=4', '3']] as const) {
      const card = page.locator('.micro-answer-card').filter({ has: page.locator('strong', { hasText: answer }) });
      await expect(card).toHaveAttribute('data-answer-band', 'micro');
      await expect(card).toHaveAttribute('data-graphemes', count);
      expect(parseFloat(await card.locator('strong').evaluate(element => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(62);
    }
    await expect(page.locator('[data-secondary-kind="pronunciation"] .sample-secondary')).toHaveText('“l”');
    await expect(page.locator('[data-secondary-kind="generic"] .sample-secondary')).toHaveText('Used before a vowel');
  });

  test('cleans GSAP activity up when the lab is destroyed', async ({ page }) => {
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
      await expect(page.getByRole('heading', { name: 'Potential micro-answer scale' })).toBeAttached();
    }
  });
});
