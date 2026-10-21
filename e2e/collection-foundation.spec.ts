import type { Page } from '@playwright/test';
import { expect, expectNoOverflow, navigate, openApp, snapshot, test } from './helpers';
import { installCollectionFixture } from './collection-fixture';
async function expectStableCardMotion(page:Page,selector:string):Promise<void>{
  const motion=page.locator(selector).first();await motion.scrollIntoViewIfNeeded();await page.waitForTimeout(80);
  const metrics=()=>page.evaluate(()=>({height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,y:window.scrollY,clientWidth:document.documentElement.clientWidth}));
  const before=await metrics(),box=await motion.boundingBox();expect(box).not.toBeNull();
  for(const[x,y]of [[.04,.04],[.96,.04],[.96,.96],[.04,.96],[.5,.5]] as const){await page.mouse.move(box!.x+box!.width*x,box!.y+box!.height*y);await page.waitForTimeout(55);expect(await metrics()).toEqual(before);const paint=await motion.evaluate(element=>{const surface=element.getBoundingClientRect(),viewport=element.closest('.card-motion-viewport')!.getBoundingClientRect(),style=getComputedStyle(element.closest('.card-motion-viewport')!),margin=Number.parseFloat(style.getPropertyValue('--card-motion-paint-margin'))||0;return{left:surface.left,top:surface.top,right:surface.right,bottom:surface.bottom,minLeft:viewport.left-margin,minTop:viewport.top-margin,maxRight:viewport.right+margin,maxBottom:viewport.bottom+margin};});expect(paint.left).toBeGreaterThanOrEqual(paint.minLeft-1);expect(paint.top).toBeGreaterThanOrEqual(paint.minTop-1);expect(paint.right).toBeLessThanOrEqual(paint.maxRight+1);expect(paint.bottom).toBeLessThanOrEqual(paint.maxBottom+1);}
  await page.mouse.move(Math.max(0,box!.x-20),Math.max(0,box!.y-20));await page.waitForTimeout(80);expect(await metrics()).toEqual(before);expect(before.width).toBeLessThanOrEqual(before.clientWidth);
}

test('global Collection renders only owned cards and locked teasers leak no learning content',async({page})=>{
  await openApp(page);await installCollectionFixture(page);await navigate(page,'Collection');
  await expect(page.getByRole('heading',{name:'Close to unlocking'})).toBeVisible();
  await expect(page.locator('.near-unlock hr-locked-collectible')).toHaveCount(3);
  await expect(page.getByText('SECRET ANSWER 4',{exact:true})).toHaveCount(0);
  await expect(page.getByText('SECRET PROMPT 4',{exact:true})).toHaveCount(0);
  await expect(page.getByText('SECRET SOUND 4',{exact:true})).toHaveCount(0);
  await expect(page.getByText('SECRET MEANING 4',{exact:true})).toHaveCount(0);
  await expect(page.getByText('SECRET CLUE 4',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Design samples'})).toHaveCount(0);
  const labels=await page.locator('.near-unlock hr-locked-collectible button').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')).join(' '));
  expect(labels).not.toContain('SECRET');
  await page.getByRole('tab',{name:'Cards'}).click();await expect(page.locator('#collection-inspection')).toHaveCount(0);await expect(page.locator('.owned-section hr-card')).toHaveCount(4);
  await page.getByRole('textbox',{name:'Search your collection'}).fill('SECRET ANSWER 9');
  await expect(page.locator('.owned-section hr-card')).toHaveCount(0);
  await page.getByRole('button',{name:'Clear filters'}).click();await page.getByRole('button',{name:'Filters',exact:true}).click();await page.getByLabel('Tag').selectOption('fixture');await expect(page.locator('.owned-section hr-card')).toHaveCount(4);await page.getByLabel('Rarity').selectOption('rare');await expect(page.locator('.owned-section hr-card')).toHaveCount(0);await page.getByRole('button',{name:'Clear filters'}).click();const before=await snapshot(page);await page.locator('.owned-section hr-card').first().getByRole('button',{name:'Expand Answer image'}).click();await expect(page.getByRole('dialog',{name:'Expanded Answer image'})).toBeVisible();await page.getByRole('dialog').getByRole('button',{name:'Close'}).click();const after=await snapshot(page);expect(after.events).toEqual(before.events);expect(after.rewardEvents).toEqual(before.rewardEvents);
  await expectNoOverflow(page);
});

test('Collection physical cards enter every peer surface on Answer and flip to Recall',async({page})=>{
  await openApp(page);await installCollectionFixture(page);await navigate(page,'Collection');
  const overviewFirst=page.locator('.overview-mini .memory-card[data-card-id="locked-fixture-0"]');await expect(page.locator('.overview-mini .memory-card')).toHaveCount(4);await expect(page.locator('.overview-mini .memory-card[data-face="answer"]')).toHaveCount(4);await expect(overviewFirst.locator('.card-copy h3')).toHaveText('SECRET ANSWER 0');
  await page.getByRole('tab',{name:'Cards'}).click();const first=page.locator('.owned-section .memory-card[data-card-id="locked-fixture-0"]').locator('..');await expect(first.locator('.memory-card')).toHaveAttribute('data-face','answer');await expect(first.locator('.card-copy h3')).toHaveText('SECRET ANSWER 0');await first.click();await expect(first.locator('.memory-card')).toHaveAttribute('data-face','recall');await expect(first.locator('.card-copy h3')).toHaveText('SECRET PROMPT 0');
  await page.getByRole('tab',{name:'Sets'}).click();await page.locator('.progress-card').filter({hasText:'Lesson'}).click();const setFirst=page.locator('.set-slots .memory-card[data-card-id="locked-fixture-0"]');await expect(page.locator('.set-slots hr-card .memory-card[data-face="answer"]')).toHaveCount(4);await expect(setFirst.locator('.card-copy h3')).toHaveText('SECRET ANSWER 0');
  await page.getByRole('tab',{name:'Cards'}).click();await expect(page.locator('.owned-section hr-card .memory-card[data-face="answer"]')).toHaveCount(4);
  await page.goto('/#collection/cards/card/locked-fixture-0');const detail=page.locator('#collection-inspection .memory-card');await expect(detail).toHaveAttribute('data-face','answer');await expect(detail.locator('.card-copy h3')).toHaveText('SECRET ANSWER 0');
  await page.goto('/#collection/desk/set/lesson');await expect(page.locator('.stack-preview-shell .memory-card')).toHaveAttribute('data-face','answer');await expect(page.locator('.stack-preview-shell .card-copy h3')).toHaveText('SECRET ANSWER 0');
});

test('deck set progress aggregates descendants once and scoped view keeps stable safe slots',async({page})=>{
  await openApp(page);await installCollectionFixture(page);await navigate(page,'Collection');
  const lesson=page.locator('.progress-card').filter({hasText:'Lesson'});
  await expect(lesson).toContainText('4 / 10 collected');await expect(lesson).toContainText('40%');await lesson.click();
  await expect(page).toHaveURL(/#collection\/sets\/deck\/lesson$/);
  await expect(page.locator('.set-summary')).toContainText('4 / 10 collected');
  await expect(page.locator('.child-progress')).toContainText('A · 4 / 4');
  await expect(page.locator('.child-progress')).toContainText('B · 0 / 6');
  await expect(page.locator('.set-slots hr-card')).toHaveCount(4);
  await expect(page.locator('.set-slots hr-locked-collectible')).toHaveCount(6);
  const lockedText=await page.locator('.set-slots hr-locked-collectible').allTextContents();expect(lockedText.join(' ')).not.toContain('SECRET');
  await page.reload();await expect(page.locator('.set-summary')).toContainText('4 / 10 collected');
  const before=await snapshot(page);await page.locator('.set-slots hr-locked-collectible').first().getByRole('button').click();await expect(page.getByRole('heading',{name:/Card \d+ of 10/})).toBeVisible();const after=await snapshot(page);expect(after.rewardEvents).toEqual(before.rewardEvents);expect(after.events).toEqual(before.events);expect(after.states).toEqual(before.states);
});

test('Collection foundation stacks safely at 200% text @ios-compact @ios-large @ios-landscape',async({page})=>{
  await openApp(page);await installCollectionFixture(page);await navigate(page,'Collection');await page.addStyleTag({content:'html{font-size:200%}'});
  await expect(page.getByRole('heading',{name:'Close to unlocking'})).toBeVisible();await expect(page.locator('.near-unlock hr-locked-collectible').first()).toBeVisible();await expectNoOverflow(page);
});

test('Collection peer views and subordinate details are reload and Back safe',async({page})=>{
  await openApp(page);await installCollectionFixture(page);await navigate(page,'Collection');
  const tabs=page.getByRole('tablist',{name:'Collection sections'});await expect(tabs).toBeVisible();await expect(page.getByRole('tab',{name:'Overview'})).toHaveAttribute('aria-selected','true');
  await expect(page.locator('.owned-section')).toHaveCount(0);await expect(page.locator('.collection-tools')).toHaveCount(0);await expect(page.locator('.set-slots')).toHaveCount(0);
  await page.getByRole('tab',{name:'Sets'}).click();await expect(page).toHaveURL(/#collection\/sets$/);await page.locator('.progress-card').filter({hasText:'Lesson'}).click();await expect(page).toHaveURL(/#collection\/sets\/deck\/lesson$/);await expect(page.getByRole('tab',{name:'Sets'})).toHaveAttribute('aria-selected','true');await page.reload();await expect(page.locator('.set-summary')).toContainText('4 / 10');await page.goBack();await expect(page).toHaveURL(/#collection\/sets$/);
  await page.getByRole('tab',{name:'Cards'}).click();await expect(page.locator('#collection-inspection')).toHaveCount(0);const search=page.getByRole('textbox',{name:'Search your collection'});await search.fill('SECRET ANSWER 0');await page.getByRole('button',{name:'Inspect SECRET ANSWER 0'}).click();await expect(page).toHaveURL(/#collection\/cards\/card\/locked-fixture-0$/);await expect(page.locator('#collection-inspection')).toBeVisible();await page.goBack();await expect(search).toHaveValue('SECRET ANSWER 0');await expect(page.locator('#collection-inspection')).toHaveCount(0);
});

test('legacy Collection deck hash maps to Sets detail and tabs retain keyboard semantics',async({page})=>{
  await openApp(page);await installCollectionFixture(page);await page.goto('/#collection/deck/lesson');await expect(page.locator('.set-summary')).toContainText('4 / 10');await expect(page.getByRole('tab',{name:'Sets'})).toHaveAttribute('aria-selected','true');const overview=page.getByRole('tab',{name:'Overview'});await overview.focus();await overview.press('End');await expect(page.getByRole('tab',{name:'Cards'})).toHaveAttribute('aria-selected','true');await expect(page).toHaveURL(/#collection\/cards$/);const sticky=page.locator('.collection-subnav');await expect(sticky).toHaveCSS('position','sticky');
});

test('shared physical card viewports keep Collection scroll geometry stable',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await openApp(page);await installCollectionFixture(page);await navigate(page,'Collection');
  await expectStableCardMotion(page,'.recent-unlocks .card-motion');
  await expectStableCardMotion(page,'.near-unlock .locked-collectible');
  await page.getByRole('tab',{name:'Cards'}).click();await expectStableCardMotion(page,'.owned-section .card-motion');
  await page.getByRole('button',{name:'Inspect SECRET ANSWER 0'}).click();await expectStableCardMotion(page,'.inspection-card .card-motion');
  await page.getByRole('tab',{name:'Sets'}).click();await page.locator('.progress-card').filter({hasText:'Lesson'}).click();await expectStableCardMotion(page,'.set-slots .card-motion');
  await expectStableCardMotion(page,'.set-slots .locked-collectible');
});

test('Overview and set slots use matching portrait mini collectibles without locked-content leakage',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await openApp(page);await installCollectionFixture(page);await navigate(page,'Collection');
  const owned=page.locator('.overview-mini hr-card-motion-viewport .memory-card').first(),locked=page.locator('.near-unlock hr-locked-collectible .locked-collectible').first();
  const geometry=async(locator:ReturnType<Page['locator']>)=>{const box=await locator.boundingBox();expect(box).not.toBeNull();return box!;};const ownedBox=await geometry(owned),lockedBox=await geometry(locked);
  expect(ownedBox.width).toBeGreaterThanOrEqual(205);expect(ownedBox.width).toBeLessThanOrEqual(232);expect(Math.abs(ownedBox.width/ownedBox.height-2/3)).toBeLessThan(.03);expect(Math.abs(lockedBox.width/lockedBox.height-2/3)).toBeLessThan(.03);
  const lockedHost=page.locator('.near-unlock hr-locked-collectible').first(),lockedMarkup=await lockedHost.evaluate(element=>element.outerHTML);expect(lockedMarkup).not.toContain('SECRET');expect(lockedMarkup).not.toContain('<img');await expect(lockedHost.locator('hr-card')).toHaveCount(0);
  for(const size of [{width:1920,height:1080},{width:1280,height:720},{width:1024,height:768}]){await page.setViewportSize(size);await expectNoOverflow(page);const responsive=await geometry(page.locator('.overview-mini .memory-card').first());expect(Math.abs(responsive.width/responsive.height-2/3)).toBeLessThan(.03);expect(responsive.width).toBeLessThanOrEqual(232);}
  await page.getByRole('tab',{name:'Sets'}).click();await page.locator('.progress-card').filter({hasText:'Lesson'}).click();const slots=page.locator('.set-slots :is(.memory-card,.locked-collectible)');await expect(slots).toHaveCount(10);const slotBoxes=await slots.evaluateAll(nodes=>nodes.slice(0,5).map(node=>{const box=node.getBoundingClientRect();return{width:box.width,height:box.height};}));expect(slotBoxes.length).toBe(5);for(const box of slotBoxes)expect(Math.abs(box.width/box.height-2/3)).toBeLessThan(.03);
});
