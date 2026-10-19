import { expect,expectNoOverflow,navigate,openApp,snapshot,test } from './helpers';
import { installCollectionFixture } from './collection-fixture';

test('Collection Desk routes through subordinate stack and set states',async({page})=>{
  await openApp(page);await installCollectionFixture(page);await navigate(page,'Collection');
  await page.getByRole('button',{name:'Open Collection Desk'}).click();
  await expect(page).toHaveURL(/#collection\/desk$/);await expect(page.getByRole('heading',{name:'Your collection on the table'})).toBeVisible();
  const stack=page.getByRole('button',{name:'Lesson, 4 of 10 collected'});await expect(stack.locator('.stack-backs i')).toHaveCount(4);await stack.click();
  await expect(page).toHaveURL(/#collection\/desk\/set\/lesson$/);await expect(page.getByRole('heading',{name:'Lesson'})).toBeVisible();
  await page.reload();await expect(page.getByText('10 cards',{exact:true})).toBeVisible();await page.goBack();await expect(page).toHaveURL(/#collection\/desk$/);await page.goForward();await expect(page).toHaveURL(/#collection\/desk\/set\/lesson$/);
});

test('Desk lays out real owned cards and privacy-safe locked slots without state mutation',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await openApp(page);await installCollectionFixture(page);await page.goto('/#collection/desk/set/lesson');
  const before=await snapshot(page);await page.getByRole('button',{name:'Lay out set'}).first().click();
  await expect(page.locator('[data-placement-kind="owned"] hr-card')).toHaveCount(4);await expect(page.locator('[data-placement-kind="locked"] hr-locked-collectible')).toHaveCount(6);
  const lockedMarkup=await page.locator('[data-placement-kind="locked"]').evaluateAll(elements=>elements.map(element=>element.outerHTML).join(''));for(const secret of ['SECRET PROMPT 4','SECRET ANSWER 4','SECRET SOUND 4','SECRET MEANING 4','SECRET CLUE 4','/art/limone.svg'])expect(lockedMarkup).not.toContain(secret);
  await expect(page.locator('[data-placement-kind="locked"] hr-card')).toHaveCount(0);
  const owned=page.locator('[data-placement-kind="owned"]').first();await owned.focus();const xBefore=Number(await owned.evaluate(element=>parseFloat(getComputedStyle(element).left)));await owned.press('Shift+ArrowRight');await expect.poll(()=>owned.evaluate(element=>parseFloat(getComputedStyle(element).left))).toBe(xBefore+24);
  await page.getByRole('button',{name:'Flip'}).click();await expect(owned.locator('.memory-card')).toHaveAttribute('data-face','answer');
  const after=await snapshot(page);expect(after.events).toEqual(before.events);expect(after.rewardEvents).toEqual(before.rewardEvents);expect(after.states).toEqual(before.states);
  await expectNoOverflow(page);
});

test('Desk drag stays bounded, raises selection, and keeps whole-page overflow stable',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await openApp(page);await installCollectionFixture(page);await page.goto('/#collection/desk/set/lesson');await page.getByRole('button',{name:'Lay out set'}).first().click();
  const metrics=()=>page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,y:window.scrollY}));const before=await metrics(),card=page.locator('[data-placement-kind="owned"]').first(),box=await card.boundingBox();expect(box).not.toBeNull();
  await page.mouse.move(box!.x+90,box!.y+120);await page.mouse.down();await page.mouse.move(box!.x+250,box!.y+210,{steps:8});await page.mouse.up();await expect(card).toHaveClass(/selected/);expect(await metrics()).toEqual(before);
  await page.getByRole('button',{name:'Gather cards'}).click();await expect(page.locator('[data-placement-kind="owned"]')).toHaveCount(0);expect(await metrics()).toEqual(before);
});

test('Shuffle and Deal progressively instantiate owned cards and inspection returns to Desk',async({page})=>{
  await openApp(page);await installCollectionFixture(page);await page.goto('/#collection/desk/set/lesson');
  await page.getByRole('button',{name:'Shuffle collected'}).click();await expect(page.locator('[data-placement-kind="owned"]')).toHaveCount(0);await page.getByRole('button',{name:/Deal/}).first().click();await expect(page.locator('[data-placement-kind="owned"]')).toHaveCount(4);
  const placement=page.locator('[data-placement-kind="owned"]').first();await placement.focus();await placement.press('Enter');await page.getByRole('button',{name:'Inspect'}).click();await expect(page).toHaveURL(/#collection\/cards\/card\//);await expect(page.locator('#collection-inspection')).toBeVisible();await page.getByRole('button',{name:'Back to Cards'}).click();await expect(page).toHaveURL(/#collection\/desk\/set\/lesson$/);await expect(page.locator('[data-placement-kind="owned"]')).toHaveCount(4);
});

test('large sets remain stack-first and progressive instead of creating all card surfaces',async({page})=>{
  await openApp(page);await installCollectionFixture(page);
  await page.evaluate(async()=>{const open=indexedDB.open('holorecall-local-v1',2);const db=await new Promise<IDBDatabase>((resolve,reject)=>{open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);});const read=db.transaction('local-study','readonly').objectStore('local-study').get('snapshot');const state=await new Promise<any>((resolve,reject)=>{read.onsuccess=()=>resolve(read.result);read.onerror=()=>reject(read.error);});const original=state.cards[9];for(let index=10;index<135;index++)state.cards.push({...original,id:`large-locked-${index}`,front:`PRIVATE FRONT ${index}`,answer:`PRIVATE ANSWER ${index}`});await new Promise<void>((resolve,reject)=>{const transaction=db.transaction('local-study','readwrite');transaction.objectStore('local-study').put(state,'snapshot');transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);});db.close();});
  await page.goto('/#collection/desk/set/lesson');await page.reload();await expect(page.locator('hr-card,hr-locked-collectible')).toHaveCount(0);await expect(page.locator('.loose-stack i')).toHaveCount(4);await page.getByRole('button',{name:'Lay out set'}).first().click();await expect(page.locator('[data-placement-id]')).toHaveCount(18);await expect(page.getByText('Showing 18 of 135 set positions')).toBeVisible();
});

test('Desk remains responsive at compact and enlarged text profiles @ios-compact @ios-large @ios-landscape',async({page})=>{
  await openApp(page);await installCollectionFixture(page);await page.goto('/#collection/desk/set/lesson');await page.addStyleTag({content:'html{font-size:200%}'});await page.getByRole('button',{name:'Lay out set'}).first().click();await expect(page.locator('[data-testid="desk-canvas"]')).toBeVisible();await expectNoOverflow(page);
});

test('Desk obeys shared Reduced Motion and Effects Off preferences',async({page})=>{
  await openApp(page);await installCollectionFixture(page);await page.evaluate(async()=>{const open=indexedDB.open('holorecall-local-v1',2),db=await new Promise<IDBDatabase>((resolve,reject)=>{open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);}),read=db.transaction('local-study','readonly').objectStore('local-study').get('snapshot'),state=await new Promise<any>((resolve,reject)=>{read.onsuccess=()=>resolve(read.result);read.onerror=()=>reject(read.error);});state.preferences.motion='reduced';state.preferences.effects=false;await new Promise<void>((resolve,reject)=>{const transaction=db.transaction('local-study','readwrite');transaction.objectStore('local-study').put(state,'snapshot');transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);});db.close();});await page.goto('/#collection/desk/set/lesson');await page.reload();await page.getByRole('button',{name:'Lay out set'}).first().click();const surface=page.locator('[data-placement-kind="owned"] .card-motion').first(),card=surface.locator('.memory-card');await expect(surface).toHaveAttribute('data-motion','reduced');await expect(card).not.toHaveClass(/effects/);
});
