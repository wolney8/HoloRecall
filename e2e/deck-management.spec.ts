import { expect,expectNoOverflow,navigate,openApp,snapshot,test } from './helpers';
import { createInitialState } from '../src/domain/study';
import { acceptScheduledReview } from '../src/test/scheduled-review';
import type { CardContent,State } from '../src/domain/models';

const card=(id:string,deckId:string):CardContent=>({id,deckId,kind:'text',front:id,answer:`${id} answer`,pronunciation:'',meaning:'',notes:'',tags:[],revision:1,suspended:false});
async function replaceSnapshot(page:import('@playwright/test').Page,state:State):Promise<void>{await page.evaluate(next=>new Promise<void>((resolve,reject)=>{const open=indexedDB.open('holorecall-local-v1',2);open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,transaction=db.transaction('local-study','readwrite');transaction.objectStore('local-study').put(next,'snapshot');transaction.oncomplete=()=>{db.close();resolve();};transaction.onerror=()=>reject(transaction.error);};}),state);}
async function editFirstDeck(page:import('@playwright/test').Page):Promise<void>{await navigate(page,'Decks');await page.getByRole('button',{name:'More deck actions'}).first().click();await page.getByRole('menuitem',{name:'Edit deck'}).click();await expect(page.getByRole('heading',{name:'Deck details'})).toBeVisible();}

test('HR-DECK-MANAGEMENT-01 responsive editor keeps preview and routine actions separate',async({page})=>{
  await openApp(page);await editFirstDeck(page);
  for(const viewport of [{width:1920,height:1080},{width:1440,height:900},{width:1366,height:768},{width:1280,height:720},{width:1024,height:768}]){
    await page.setViewportSize(viewport);await expectNoOverflow(page);
    const preview=page.locator('.deck-design-preview'),previewCard=page.locator('.deck-preview-card'),save=page.getByRole('button',{name:'Save deck'}),routine=page.locator('.deck-routine-actions');
    await expect(preview).toBeVisible();await expect(save).toBeVisible();await expect(routine).toBeVisible();
    const [previewBox,saveBox,routineBox]=await Promise.all([preview.boundingBox(),save.boundingBox(),routine.boundingBox()]);
    expect(previewBox).not.toBeNull();expect((await previewCard.boundingBox())!.width).toBeLessThanOrEqual(250);
    const overlaps=(a:NonNullable<typeof previewBox>,b:NonNullable<typeof previewBox>)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
    expect(overlaps(previewBox!,saveBox!)).toBe(false);expect(overlaps(previewBox!,routineBox!)).toBe(false);
  }
  await page.addStyleTag({content:'html{-webkit-text-size-adjust:200%;text-size-adjust:200%}'});await expectNoOverflow(page);await expect(page.getByRole('button',{name:'Save deck'})).toBeVisible();await expect(page.getByRole('button',{name:'Delete deck…'})).toBeVisible();
});

test('HR-DECK-MANAGEMENT-01 dialog exposes scope, safe focus and parent-only promotion',async({page})=>{
  await openApp(page);let state=createInitialState([{id:'parent',name:'Parent',description:'',suspended:false},{id:'child',name:'Child',description:'',suspended:false,parentId:'parent'},{id:'grandchild',name:'Grandchild',description:'',suspended:false,parentId:'child'},{id:'other',name:'Other',description:'',suspended:false}],[card('parent-card','parent'),card('child-card','child'),card('grandchild-card','grandchild'),card('other-card','other')]);state.session={id:'session',mode:'scheduled',queue:['child-card'],total:1,completed:0,revealed:true,activeMs:10,scopeDeckId:'parent'};state=acceptScheduledReview(state,{id:'child-review',cardId:'child-card',sessionId:'session',rating:4,now:new Date('2026-10-12T12:00:00Z')});await replaceSnapshot(page,state);await page.reload();await editFirstDeck(page);
  const trigger=page.getByRole('button',{name:'Delete deck…'});await trigger.click();const dialog=page.getByRole('dialog',{name:'Delete “Parent”?' });await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'Cancel'})).toBeFocused();const deckOnly=dialog.getByRole('radio',{name:/Delete this deck only/}),branch=dialog.getByRole('radio',{name:/Delete this deck and all subdecks/});await expect(deckOnly).toBeChecked();await expect(branch).toBeVisible();await expect(dialog.getByText('1 card',{exact:true})).toBeVisible();await branch.check();await expect(dialog.getByText('3 decks',{exact:true})).toBeVisible();await expect(dialog.getByText('2 subdecks',{exact:true})).toBeVisible();await expect(dialog.getByText('3 cards',{exact:true})).toBeVisible();await deckOnly.check();await expect(dialog.getByRole('button',{name:'Delete permanently'})).toBeDisabled();
  await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
  await trigger.click();await page.getByRole('checkbox',{name:'I understand this cannot be undone.'}).check();await page.getByRole('button',{name:'Delete permanently'}).click();await expect(page.getByText(/Child decks were promoted/)).toBeVisible();
  const after=await snapshot(page);expect(after.decks.find(deck=>deck.id==='parent')).toBeUndefined();expect(after.decks.find(deck=>deck.id==='child')?.parentId).toBeUndefined();expect(after.decks.find(deck=>deck.id==='grandchild')?.parentId).toBe('child');expect(after.cards.map(item=>item.id)).toEqual(['child-card','grandchild-card','other-card']);
  await navigate(page,'Progress');await page.getByRole('tab',{name:'Deck progress'}).click();await expect(page.getByRole('heading',{name:'Current deck inventory'})).toBeVisible();await expect(page.getByRole('heading',{name:'Historical reviews by deck'})).toBeVisible();await expect(page.getByRole('row',{name:/Parent > Child/})).toBeVisible();
});

test('HR-DECK-MANAGEMENT-01 simple deck deletion and cancellation are explicit',async({page})=>{
  await openApp(page);await editFirstDeck(page);await page.getByRole('button',{name:'Delete deck…'}).click();const dialog=page.getByRole('dialog');await expect(dialog.getByRole('radio')).toHaveCount(0);await expect(dialog.getByText('16 cards',{exact:true})).toBeVisible();await dialog.getByRole('button',{name:'Cancel'}).click();const before=await snapshot(page);await page.getByRole('button',{name:'Delete deck…'}).click();await page.getByRole('checkbox',{name:'I understand this cannot be undone.'}).check();const confirm=page.getByRole('button',{name:'Delete permanently'});await expect(confirm).toBeEnabled();await confirm.click();await expect(page.getByText(/Deck branch and its learning records/)).toBeVisible();const after=await snapshot(page);expect(before.decks).toHaveLength(1);expect(after.decks).toHaveLength(0);expect(after.cards).toHaveLength(0);
});

test('HR-DECK-MANAGEMENT-01 editor and dialog reflow on compact WebKit @ios-compact',async({page})=>{
  await openApp(page);await editFirstDeck(page);await expectNoOverflow(page);const form=await page.locator('.deck-editor-form').boundingBox(),preview=await page.locator('.deck-design-preview').boundingBox(),danger=await page.locator('.deck-danger-zone').boundingBox();expect(form).not.toBeNull();expect(preview!.y).toBeGreaterThan(form!.y);expect(danger!.y).toBeGreaterThan(preview!.y);await page.addStyleTag({content:'html{-webkit-text-size-adjust:200%;text-size-adjust:200%}'});await expectNoOverflow(page);await page.getByRole('button',{name:'Delete deck…'}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await expectNoOverflow(page);await dialog.getByRole('button',{name:'Cancel'}).click();
});
