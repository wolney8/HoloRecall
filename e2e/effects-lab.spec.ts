import { expect, test } from '@playwright/test';

test.describe('Visual Effects Lab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#effects-lab');
    await expect(page.getByRole('heading', { name: 'Visual Effects Lab' })).toBeVisible();
  });

  test('is directly reachable but absent from normal navigation', async ({ page }) => {
    await expect(page.locator('nav[aria-label="Main navigation"]')).not.toContainText('Visual Effects Lab');
    await expect(page.locator('nav[aria-label="Primary navigation"]')).not.toContainText('Visual Effects Lab');
    await page.goto('/#dashboard');
    await expect(page.getByRole('heading', { name: 'Study dashboard' })).toBeVisible();
    await expect(page.locator('nav[aria-label="Main navigation"]')).not.toContainText('Visual Effects Lab');
    await expect(page.locator('nav[aria-label="Primary navigation"]')).not.toContainText('Visual Effects Lab');
  });

  test('peels with normalized geometry and resets to the resting state', async ({ page }) => {
    const sticker = page.locator('.peel-object');
    await expect(sticker).toHaveAttribute('data-peel-progress', '0.180');
    const initialClip = await page.locator('.peel-front').evaluate(element => getComputedStyle(element).clipPath);
    expect(initialClip).toContain('polygon');

    await page.getByRole('button', { name: 'Peel', exact: true }).click();
    await expect(sticker).toHaveAttribute('data-peel-progress', '1.000');
    expect(Number(await sticker.getAttribute('data-geometric-frames'))).toBeGreaterThan(2);

    await page.getByRole('button', { name: 'Reset', exact: true }).first().click();
    await expect(sticker).toHaveAttribute('data-peel-progress', '0.180');
    await expect(sticker).toBeEnabled();
  });

  test('reduced motion removes by dissolve without geometric travel', async ({ page }) => {
    const sticker = page.locator('.peel-object');
    await page.getByLabel('Reduced Motion').check();
    const framesBefore = Number(await sticker.getAttribute('data-geometric-frames'));
    await page.getByRole('button', { name: 'Peel', exact: true }).click();
    await expect(sticker).toHaveAttribute('data-peel-progress', '1.000');
    expect(Number(await sticker.getAttribute('data-geometric-frames'))).toBe(framesBefore);
  });

  test('surface variables respond continuously and settle without centre glare', async ({ page }) => {
    const card = page.locator('.surface-card');
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    await card.hover({ position: { x: box!.width * .82, y: box!.height * .24 } });
    await expect.poll(() => card.evaluate(element => getComputedStyle(element).getPropertyValue('--lab-spec-strength').trim())).not.toBe('0.000');
    const moved = await card.evaluate(element => ({
      x: getComputedStyle(element).getPropertyValue('--lab-spec-x').trim(),
      tilt: getComputedStyle(element).getPropertyValue('--lab-tilt-y').trim(),
    }));
    expect(moved.x).not.toBe('50.00%');
    expect(moved.tilt).not.toBe('0.00deg');
    await page.mouse.move(1, 1);
    await expect.poll(() => card.evaluate(element => getComputedStyle(element).getPropertyValue('--lab-spec-strength').trim())).toBe('0.000');
  });

  test('rarity, face and semantic secondary samples stay distinct', async ({ page }) => {
    const card = page.locator('.surface-card');
    await page.getByRole('button', { name: 'Ultra Rare' }).click();
    await expect(card).toHaveAttribute('data-rarity', 'ultra-rare');
    await page.getByRole('button', { name: 'Answer', exact: true }).click();
    await expect(card).toHaveAttribute('data-signature', 'answer-halo');
    const haloBackground = await page.locator('.answer-halo').evaluate(element => getComputedStyle(element).backgroundImage);
    expect(haloBackground).toContain('radial-gradient');
    expect(haloBackground).not.toContain('linear-gradient');

    await expect(page.locator('[data-secondary-kind="pronunciation"] .sample-secondary')).toHaveText('“l”');
    await expect(page.locator('[data-secondary-kind="generic"] .sample-secondary')).toHaveText('Used before a vowel');
  });

  test('destroys and recreates without leaked animation errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.getByRole('button', { name: 'Peel', exact: true }).click();
    await page.goto('/#dashboard');
    await expect(page.getByRole('heading', { name: 'Study dashboard' })).toBeVisible();
    await page.goto('/#effects-lab');
    await expect(page.getByRole('heading', { name: 'Visual Effects Lab' })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
