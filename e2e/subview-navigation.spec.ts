import { expect, navigate, openApp, test } from './helpers';

test('HR-NAVIGATION-01 Decks and Search cards are reload-safe peer views', async ({ page }) => {
  await openApp(page);
  await navigate(page, 'Decks');
  const navigation=page.getByRole('tablist',{name:'Deck sections'});
  await expect(navigation).toHaveAttribute('data-presentation','web-tabs');
  await expect(navigation.getByRole('tab',{name:'Decks'})).toHaveAttribute('aria-selected','true');
  await expect(page.getByRole('tabpanel',{name:'Decks'})).toBeVisible();
  await navigation.getByRole('tab',{name:'Search cards'}).click();
  await expect(page).toHaveURL(/#library\/search$/);
  await expect(page.getByRole('tabpanel',{name:'Search cards'})).toBeVisible();
  const search=page.getByRole('combobox',{name:'Search decks and cards'});
  await search.fill('caffe');
  await expect(page.getByText('1 matching cards')).toBeVisible();
  await navigation.getByRole('tab',{name:'Decks'}).click();
  await navigation.getByRole('tab',{name:'Search cards'}).click();
  await expect(search).toHaveValue('caffe');
  await page.reload();
  await expect(page.getByRole('tab',{name:'Search cards'})).toHaveAttribute('aria-selected','true');
});

test('HR-NAVIGATION-01 keyboard navigation changes one selected tab and browser Back restores it', async ({ page }) => {
  await page.goto('/#library/decks');
  const decks=page.getByRole('tab',{name:'Decks'}),search=page.getByRole('tab',{name:'Search cards'});
  await decks.focus();
  await decks.press('ArrowRight');
  await expect(search).toBeFocused();
  await expect(search).toHaveAttribute('aria-selected','true');
  await expect(decks).toHaveAttribute('aria-selected','false');
  await page.goBack();
  await expect(decks).toHaveAttribute('aria-selected','true');
});

test('HR-NAVIGATION-01 Exchange reuses compact tabs and retains route history', async ({ page }) => {
  await page.goto('/#exchange/import');
  const navigation=page.getByRole('tablist',{name:'Exchange sections'});
  await expect(navigation).toHaveAttribute('data-presentation','web-tabs');
  const width=await navigation.evaluate(element=>({control:element.getBoundingClientRect().width,parent:element.parentElement!.getBoundingClientRect().width,direction:getComputedStyle(element).flexDirection,rows:new Set([...element.querySelectorAll('button')].map(button=>Math.round(button.getBoundingClientRect().top))).size}));
  expect(width.control).toBeLessThan(width.parent);
  expect(width.direction).toBe('row');
  expect(width.rows).toBe(1);
  await navigation.getByRole('tab',{name:'Export'}).click();
  await expect(page).toHaveURL(/#exchange\/export$/);
  await navigation.getByRole('tab',{name:'Templates'}).click();
  await page.goBack();
  await expect(navigation.getByRole('tab',{name:'Export'})).toHaveAttribute('aria-selected','true');
});

test('HR-NAVIGATION-01 web tabs stay content-width and contained across desktop widths', async ({ page }) => {
  for (const viewport of [{width:1920,height:1080},{width:1440,height:900},{width:1280,height:720},{width:1024,height:768}]) {
    await page.setViewportSize(viewport);
    await page.goto('/#library/decks');
    const navigation=page.getByRole('tablist',{name:'Deck sections'});
    await expect(navigation).toHaveAttribute('data-presentation','web-tabs');
    const sizes=await navigation.evaluate(element=>({control:element.getBoundingClientRect().width,parent:element.parentElement!.getBoundingClientRect().width,page:document.documentElement.scrollWidth,direction:getComputedStyle(element).flexDirection,rows:new Set([...element.querySelectorAll('button')].map(button=>Math.round(button.getBoundingClientRect().top))).size}));
    expect(sizes.control).toBeLessThan(sizes.parent);
    expect(sizes.page).toBeLessThanOrEqual(viewport.width);
    expect(sizes.direction).toBe('row');
    expect(sizes.rows).toBe(1);
  }
  await page.addStyleTag({content:'html{font-size:200%}'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);
});

test('HR-UI-IDENTITY-01 scopes primary navigation, names Exchange and uses the Knowledge Stack mark',async({page})=>{
  await openApp(page);
  const main=page.getByRole('navigation',{name:'Main navigation'});
  await expect(main.getByRole('button',{name:'Exchange',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Import / export',exact:true})).toHaveCount(0);
  const primaryLayout=await main.evaluate(element=>({direction:getComputedStyle(element).flexDirection,buttonWidth:element.querySelector('button')!.getBoundingClientRect().width,width:element.getBoundingClientRect().width}));
  expect(primaryLayout.direction).toBe('column');
  expect(Math.abs(primaryLayout.buttonWidth-primaryLayout.width)).toBeLessThanOrEqual(1);
  const brand=page.locator('.brand img');
  await expect(brand).toHaveAttribute('src','brand/holorecall-mark.svg');
  await expect(brand).toHaveAttribute('alt','');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href','brand/holorecall-mark.svg');
  const source=await page.request.get('/brand/holorecall-mark.svg');
  expect(source.ok()).toBe(true);
  expect(await source.text()).toContain('knowledge-stack');

  await page.setViewportSize({width:390,height:844});
  await page.reload();
  const bottom=page.getByRole('navigation',{name:'Primary navigation'});
  await expect(bottom.getByRole('button',{name:'More',exact:true})).toBeVisible();
  await bottom.getByRole('button',{name:'More',exact:true}).click();
  await expect(page.getByRole('navigation',{name:'Secondary navigation'}).getByRole('button',{name:'Exchange',exact:true})).toBeVisible();
});

test('HR-NAVIGATION-01 subviews remain contained at 200% text @ios-compact @ios-landscape', async ({ page }) => {
  await page.goto('/#library/decks');
  await page.addStyleTag({content:'html{-webkit-text-size-adjust:200%;text-size-adjust:200%}'});
  await expect(page.getByRole('tablist',{name:'Deck sections'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.goto('/#exchange/import');
  await expect(page.getByRole('tablist',{name:'Exchange sections'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});
