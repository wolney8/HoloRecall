import { test, expect, navigate, openApp, selectMaterial, snapshot } from './helpers';

test('HR-AUTH-01 creates cards quickly, retains safe defaults and protects drafts', async ({ page }) => {
  await openApp(page);
  await navigate(page, 'Decks');
  const journey=page.locator('.deck-journey').first();await journey.getByRole('button',{name:'More deck actions'}).click();await journey.getByRole('menuitem',{name:'Add card',exact:true}).click();
  await expect(page.getByRole('heading', { name: 'Create card' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Deck', exact: true })).toContainText('Italian essentials');
  await page.getByLabel('Front text / library prompt').fill('la sera');
  await page.getByLabel('Back text / answer').fill('the evening');
  await page.getByLabel('Approximate pronunciation').fill('lah SEH-rah');
  await page.getByRole('button', { name: 'Front', exact: true }).click();
  await expect(page.locator('.author-preview .memory-card')).not.toHaveClass(/revealed/);
  await page.getByRole('button', { name: 'Answer', exact: true }).click();
  await expect(page.locator('.author-preview .memory-card')).toHaveClass(/revealed/);
  await page.getByRole('button', { name: 'Save and add another' }).click();
  await expect(page.getByLabel('Front text / library prompt')).toHaveValue('');
  await expect(page.getByLabel('Back text / answer')).toHaveValue('');
  await expect(page.getByRole('combobox', { name: 'Deck', exact: true })).toContainText('Italian essentials');
  expect((await snapshot(page)).cards.some(card => card.front === 'la sera')).toBe(true);

  await page.getByLabel('Front text / library prompt').fill('unsaved prompt');
  page.once('dialog', dialog => dialog.dismiss());
  await navigate(page, 'Progress');
  await expect(page.getByLabel('Front text / library prompt')).toHaveValue('unsaved prompt');
  page.once('dialog', dialog => dialog.accept());
  await navigate(page, 'Progress');
  await expect(page.getByRole('heading', { name: 'Progress', exact: true })).toBeVisible();
});

test('HR-AUTH-01 reversible preset, duplicate and explicit bulk presentation preserve learning state', async ({ page }) => {
  await openApp(page);
  const before = await snapshot(page);
  await navigate(page, 'Decks');
  await page.getByRole('button', { name: /Create a card/ }).click();
  await selectMaterial(page, 'Creation preset', 'Reversible pair');
  await page.getByLabel('Front text / library prompt').fill('buongiorno');
  await page.getByLabel('Back text / answer').fill('good morning');
  await page.getByRole('button', { name: 'Save card', exact: true }).click();
  const paired = await snapshot(page);
  expect(paired.cards.filter(card => card.front === 'buongiorno' || card.front === 'good morning')).toHaveLength(2);
  expect(paired.events).toEqual(before.events); expect(paired.states).toEqual(before.states); expect(paired.rewardEvents).toEqual(before.rewardEvents);

  await page.getByRole('tab',{name:'Search cards'}).click();
  await page.locator('.card-list-row').filter({has:page.getByRole('heading',{name:'il limone',exact:true})}).getByRole('button',{name:'Duplicate il limone',exact:true}).click();
  await expect(page.getByLabel('Front text / library prompt')).toHaveValue('Name what you see, with its Italian article.');
  await page.getByLabel('Front text / library prompt').fill('il limone · copy');
  await page.getByRole('button', { name: 'Save card', exact: true }).click();
  await page.getByRole('tab',{name:'Search cards'}).click();
  await page.locator('.card-list-row[data-card-id="it-limone"]').getByRole('checkbox',{name:'Select il limone',exact:true}).check();
  await expect(page.getByRole('region', { name: 'Bulk card changes' })).toBeVisible();
  await selectMaterial(page, 'Authored rarity', 'Rare');
  await page.getByRole('button', { name: 'Apply changes' }).click();
  await expect(page.getByText('cards updated. Review history and earned cosmetics were preserved.')).toBeVisible();
  const after = await snapshot(page);
  expect(after.events).toEqual(before.events); expect(after.states).toEqual(before.states); expect(after.rewardEvents).toEqual(before.rewardEvents);
  expect(after.cards.find(card => card.id === 'it-limone')?.rarity).toBe('rare');
});

test('HR-AUTH-01 @ios-landscape authoring actions and live preview remain reachable', async ({ page }) => {
  await openApp(page);
  await navigate(page, 'Decks');
  await page.getByRole('button', { name: /Create a card/ }).click();
  await expect(page.getByRole('button', { name: 'Save and add another' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Preview card face' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});
