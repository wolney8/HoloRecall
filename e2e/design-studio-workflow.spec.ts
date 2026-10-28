import { expect, expectNoOverflow, navigate, openApp, snapshot, test } from './helpers';

test('HR-DESIGN-17 protects drafts and provides bounded undo, redo and revert', async ({ page, browserName }) => {
  await openApp(page); await navigate(page, 'Design Studio');
  const name=page.getByLabel('Design Set name',{exact:true});
  await name.fill('Safe draft'); await expect(page.getByText('Unsaved changes',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Undo Design Set change'}).click(); await expect(name).toHaveValue('');
  await page.getByRole('button',{name:'Redo Design Set change'}).click(); await expect(name).toHaveValue('Safe draft');
  await name.press('Control+z'); await expect(name).toHaveValue('');
  await name.press('Control+Shift+z'); await expect(name).toHaveValue('Safe draft');
  await navigate(page,'Dashboard'); await expect(page.getByRole('heading',{name:'Unsaved Design Set changes'})).toBeVisible();
  await page.getByRole('button',{name:'Keep editing'}).click(); await expect(page.getByRole('heading',{name:'Design Suite'})).toBeVisible(); await expect(name).toHaveValue('Safe draft');
  if(browserName==='chromium'){await page.goBack();}else{await navigate(page,'Dashboard');}await expect(page.getByRole('heading',{name:'Unsaved Design Set changes'})).toBeVisible();await page.getByRole('button',{name:'Discard changes'}).click();if(browserName==='chromium')await page.waitForURL(url=>url.hash==='');await expect(page.getByRole('heading',{name:'Study dashboard',exact:true})).toBeVisible();
  await navigate(page,'Design Studio'); await name.fill('Saved design'); await page.getByRole('button',{name:'Save Design Set',exact:true}).click(); await expect(page.getByText('Saved',{exact:true})).toBeVisible();
  await name.fill('Temporary name'); await page.getByRole('region',{name:'Design Set editor'}).getByRole('button',{name:'Revert'}).click(); await expect(page.getByRole('heading',{name:'Revert Design Set?'})).toBeVisible(); await page.getByRole('dialog').getByRole('button',{name:'Revert',exact:true}).click(); await expect(name).toHaveValue('Saved design');
});

test('HR-DESIGN-17 duplicates safely and deletion returns references to inheritance', async ({ page }) => {
  await openApp(page); const before=await snapshot(page); await navigate(page,'Design Studio');
  await page.getByLabel('Design Set name',{exact:true}).fill('Forest family'); await page.getByRole('button',{name:'Save Design Set',exact:true}).click(); await expect(page.getByText('Saved',{exact:true})).toBeVisible();
  await page.getByLabel('Design Set name',{exact:true}).fill('Unsaved rename'); await expect(page.getByText('Unsaved changes',{exact:true})).toBeVisible(); await page.getByRole('button',{name:'Duplicate',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Unsaved Design Set changes'})).toBeVisible(); await page.getByRole('button',{name:'Keep editing'}).click(); await expect(page.getByLabel('Design Set name',{exact:true})).toHaveValue('Unsaved rename');
  await page.getByRole('button',{name:'Duplicate',exact:true}).click(); await page.getByRole('button',{name:'Discard changes'}).click(); await expect(page.getByLabel('Design Set name',{exact:true})).toHaveValue('Forest family copy');
  let state=await snapshot(page); expect(state.designs).toHaveLength(2); const copy=state.designs.find(design=>design.name==='Forest family copy')!;expect(copy.id).toMatch(/^design-/);expect(state.decks.some(deck=>deck.designSetId===copy.id)).toBe(false);expect(state.cards.some(card=>card.designSetId===copy.id)).toBe(false);
  await page.getByLabel('Deck',{exact:true}).click();await page.getByRole('option').first().click();await page.getByRole('button',{name:'Save and assign'}).click();await expect(page.getByText(/Direct assignment/)).toContainText('Forest family copy');
  await page.getByRole('button',{name:'Delete',exact:true}).click();await expect(page.getByRole('heading',{name:'Delete “Forest family copy”?'})).toBeVisible();await expect(page.getByText(/1 deck assignments/)).toBeVisible();await page.getByRole('button',{name:'Delete Design Set'}).click();await expect(page.getByText('Design Set deleted.')).toBeVisible();
  state=await snapshot(page);expect(state.designs.map(design=>design.id)).not.toContain(copy.id);expect(state.decks.some(deck=>deck.designSetId===copy.id)).toBe(false);expect(state.cards).toEqual(before.cards);expect(state.events).toEqual(before.events);expect(state.states).toEqual(before.states);expect(state.rewardEvents).toEqual(before.rewardEvents);expect(state.assets).toEqual(before.assets);
});

test('HR-DESIGN-17 editor controls reflow at 200% text @ios-compact', async ({ page }) => {
  await openApp(page);await navigate(page,'Design Studio');await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  await expect(page.getByRole('button',{name:'Save Design Set',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Undo Design Set change'})).toBeVisible();await expectNoOverflow(page);
});
