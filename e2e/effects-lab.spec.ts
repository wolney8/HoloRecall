import { expect, test } from '@playwright/test';

test.describe('Visual Effects Lab v5', () => {
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
    expect(light[1]).toBeGreaterThanOrEqual(.3);
    expect(light[2]).toBeGreaterThanOrEqual(.43);
    expect(light[2]).toBeGreaterThan(light[1]!);
    expect(await holo.evaluate(element => getComputedStyle(element).mixBlendMode)).toBe('multiply');
    const card = page.locator('.surface-card');
    const shimmer = card.locator('.surface-shimmer');
    const box = await card.boundingBox();
    await page.locator('[aria-label="Rarity"]').getByRole('button', { name: 'Common', exact: true }).click();
    await card.hover({ position: { x: box!.width * .8, y: box!.height * .25 } });
    await expect.poll(() => card.evaluate(element => Number(getComputedStyle(element).getPropertyValue('--lab-shimmer-strength')))).toBeGreaterThan(0);
    const commonShimmer = Number(await shimmer.evaluate(element => getComputedStyle(element).opacity));
    await page.locator('[aria-label="Rarity"]').getByRole('button', { name: 'Holo Rare', exact: true }).click();
    await card.hover({ position: { x: box!.width * .8, y: box!.height * .25 } });
    const holoShimmer = Number(await shimmer.evaluate(element => getComputedStyle(element).opacity));
    await page.locator('[aria-label="Rarity"]').getByRole('button', { name: 'Ultra Rare', exact: true }).click();
    await card.hover({ position: { x: box!.width * .8, y: box!.height * .25 } });
    const ultraShimmer = Number(await shimmer.evaluate(element => getComputedStyle(element).opacity));
    expect(holoShimmer).toBeGreaterThan(commonShimmer * 4);
    expect(ultraShimmer).toBeGreaterThan(holoShimmer);
    await appearance.getByRole('button', { name: 'Dark' }).click();
    await expect(page.locator('.theme-stage')).toHaveAttribute('data-preview-theme', 'dark');
    await expect.poll(() => holo.evaluate(element => getComputedStyle(element).mixBlendMode)).toBe('screen');
    expect(Number(await holo.evaluate(element => getComputedStyle(element).opacity))).toBeGreaterThan(0);
  });

  test('interpolates pressure material and depth continuously without resetting tilt', async ({ page }) => {
    await page.locator('[aria-label="Motion policy"]').getByRole('button', { name: 'Full' }).click();
    const card = page.locator('.press-card');
    await expect(card).toHaveAttribute('data-surface-model', 'shared');
    await expect(card).toHaveAttribute('data-press-model', 'continuous-progress');
    await expect(card).toHaveAttribute('data-release-model', 'critically-damped');
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    await page.mouse.move(box!.x + box!.width * .8, box!.y + box!.height * .3);
    await expect.poll(() => card.evaluate(element => getComputedStyle(element).getPropertyValue('--lab-shimmer-strength').trim())).not.toBe('0.000');
    const read = () => card.evaluate(element => {
      const style = getComputedStyle(element);
      return {
        progress: Number((element as HTMLElement).dataset['pressProgress']),
        shimmer: Number(style.getPropertyValue('--lab-shimmer-strength')),
        shadow: Number.parseFloat(style.getPropertyValue('--lab-shadow-depth')),
        y: Number.parseFloat(style.getPropertyValue('--lab-press-y')),
        scale: Number(style.getPropertyValue('--lab-press-scale')),
        tiltX: style.getPropertyValue('--lab-tilt-x').trim(),
        tiltY: style.getPropertyValue('--lab-tilt-y').trim(),
      };
    });
    const rest = await read();
    await page.mouse.down();
    await expect(card).toHaveAttribute('data-press-state', 'pressed');
    await expect.poll(async () => (await read()).progress).toBeGreaterThanOrEqual(.999);
    const held = await read();
    const downTrace = (await card.getAttribute('data-press-down-trace'))!.split(',').map(Number);
    expect(downTrace[0]).toBe(0);
    expect(downTrace.at(-1)).toBe(1);
    expect(downTrace.some(value => value > 0 && value < 1)).toBe(true);
    expect(downTrace.every((value, index) => index === 0 || value >= downTrace[index - 1]!)).toBe(true);
    expect(held.shadow).toBeLessThan(rest.shadow);
    expect(held.scale).toBeLessThan(rest.scale);
    expect(held.y).toBeGreaterThan(rest.y);
    expect(held.shimmer).toBeGreaterThan(rest.shimmer);
    expect(held.tiltX).toBe(rest.tiltX);
    expect(held.tiltY).toBe(rest.tiltY);
    await page.mouse.up();
    await expect(card).toHaveAttribute('data-press-state', 'rest');
    const settled = await read();
    const releaseTrace = (await card.getAttribute('data-press-release-trace'))!.split(',').map(Number);
    expect(releaseTrace[0]).toBe(1);
    expect(releaseTrace.at(-1)).toBe(0);
    expect(releaseTrace.some(value => value > 0 && value < 1)).toBe(true);
    expect(releaseTrace.every((value, index) => index === 0 || value <= releaseTrace[index - 1]!)).toBe(true);
    expect(settled.progress).toBe(0);
    expect(settled.shadow).toBeCloseTo(rest.shadow, 2);
    expect(settled.shimmer).toBeCloseTo(rest.shimmer, 2);
    expect(settled.tiltX).toBe(rest.tiltX);
    expect(settled.tiltY).toBe(rest.tiltY);
  });

  test('handles interrupted repeated and cancelled presses from current progress', async ({ page }) => {
    await page.locator('[aria-label="Motion policy"]').getByRole('button', { name: 'Full' }).click();
    const card = page.locator('.press-card');
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    const progress = () => card.evaluate(element => Number((element as HTMLElement).dataset['pressProgress']));
    await page.mouse.move(box!.x + box!.width * .7, box!.y + box!.height * .35);
    const early = await card.evaluate(element => new Promise<number>(resolve => {
      element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7 }));
      window.setTimeout(() => {
        const value = Number((element as HTMLElement).dataset['pressProgress']);
        element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7 }));
        resolve(value);
      }, 35);
    }));
    expect(early).toBeGreaterThan(0); expect(early).toBeLessThan(1);
    const partialRelease = await card.evaluate(element => new Promise<number>(resolve => window.setTimeout(() => {
      const value = Number((element as HTMLElement).dataset['pressProgress']);
      element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 8 }));
      resolve(value);
    }, 25)));
    expect(partialRelease).toBeGreaterThan(0); expect(partialRelease).toBeLessThan(early);
    await expect.poll(progress).toBeGreaterThanOrEqual(.999);
    await card.dispatchEvent('pointerup', { pointerId: 8 });
    await expect.poll(progress).toBe(0);
    await page.mouse.down();
    await page.waitForTimeout(40);
    await card.dispatchEvent('pointercancel', { pointerId: 1 });
    await expect.poll(progress).toBe(0);
    await page.mouse.up();
    await card.hover({ position: { x: box!.width * .7, y: box!.height * .35 } });
    await page.mouse.down();
    await expect.poll(progress).toBeGreaterThan(.8);
    await page.mouse.move(box!.x + box!.width + 80, box!.y);
    await expect.poll(progress).toBe(0);
    await page.mouse.up();
  });

  test('carries current pressure into flip without a neutral frame', async ({ page }) => {
    const card = page.locator('.press-card');
    await page.getByRole('button', { name: 'Press + flip' }).click();
    await expect(card).toHaveAttribute('data-face', 'answer');
    await expect(card).toHaveAttribute('data-press-state', 'rest');
    expect(Number(await card.getAttribute('data-flip-pressure-start'))).toBeGreaterThan(.9);
    expect(Number(await card.getAttribute('data-face-switch-pressure'))).toBeGreaterThan(0);
    await expect(card).toHaveAttribute('data-press-progress', '0.000');
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
