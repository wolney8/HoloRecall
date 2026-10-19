import type { Page } from '@playwright/test';
import type { State } from '../src/domain/models';
import { expect, expectNoOverflow, navigate, openApp, snapshot, test } from './helpers';

async function installCollectionFixture(page:Page):Promise<void>{
  await page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('holorecall-local-v1',2);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    const state=await new Promise<State>((resolve,reject)=>{const request=db.transaction('local-study','readonly').objectStore('local-study').get('snapshot');request.onsuccess=()=>resolve(request.result as State);request.onerror=()=>reject(request.error);});
    state.decks=[{id:'lesson',name:'Lesson',description:'',suspended:false},{id:'a',name:'A',description:'',suspended:false,parentId:'lesson'},{id:'b',name:'B',description:'',suspended:false,parentId:'lesson'}];
    state.cards=Array.from({length:10},(_,index)=>({id:`locked-fixture-${index}`,deckId:index<4?'a':'b',kind:'text' as const,front:`SECRET PROMPT ${index}`,answer:`SECRET ANSWER ${index}`,pronunciation:`SECRET SOUND ${index}`,meaning:`SECRET MEANING ${index}`,notes:`SECRET CLUE ${index}`,tags:['fixture'],rarity:'common' as const,revision:1,suspended:false}));
    Object.assign(state.cards[0]!,{kind:'visual',image:'/art/limone.svg',backImage:'/art/limone.svg',imageDescription:'Owned fixture illustration'});
    state.states={};state.events=[];state.rewardEvents=[];state.session=null;
    for(let index=0;index<7;index++){
      const cardId=`locked-fixture-${index}`,timestamp=`2026-10-${String(index+1).padStart(2,'0')}T10:00:00Z`,previous={due:timestamp,stability:0,difficulty:0,elapsed_days:0,scheduled_days:0,learning_steps:0,reps:0,lapses:0,state:0,version:0},result={...previous,due:`2026-11-${String(index+1).padStart(2,'0')}T10:00:00Z`,last_review:timestamp,reps:1,version:1};
      state.events.push({kind:'review',id:`review-${index}`,userId:state.userId,cardId,sessionId:'fixture-session',contentRevision:1,timestamp,rating:4,grade:3,previousStateVersion:0,previousState:previous,resultingState:result,schedulerVersion:'ts-fsrs@5.4.2',configVersion:'holorecall-fsrs-v1',mode:'scheduled'});
      state.states[cardId]=result;
      state.rewardEvents.push({kind:'contribution',id:`contribution-${index}`,reviewEventId:`review-${index}`,cardId,timestamp,studyDay:`2026-10-${String(index+1).padStart(2,'0')}`,timeZone:'Europe/London',configVersion:'confidence-days-v1'});
      if(index<4)state.rewardEvents.push({kind:'unlock',id:`unlock-${index}`,reviewEventId:`review-${index}`,cardId,timestamp,rarity:'common',required:1,contributionIds:[`contribution-${index}`]});
    }
    state.version+=1;
    await new Promise<void>((resolve,reject)=>{const transaction=db.transaction('local-study','readwrite');transaction.objectStore('local-study').put(state,'snapshot');transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);});db.close();
  });
  await page.reload();
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
  await page.getByRole('button',{name:'Clear filters'}).click();await page.getByRole('button',{name:'Filters',exact:true}).click();await page.getByLabel('Tag').selectOption('fixture');await expect(page.locator('.owned-section hr-card')).toHaveCount(4);await page.getByLabel('Rarity').selectOption('rare');await expect(page.locator('.owned-section hr-card')).toHaveCount(0);await page.getByRole('button',{name:'Clear filters'}).click();const before=await snapshot(page);await page.locator('.owned-section hr-card').first().getByRole('button',{name:'Expand Recall image'}).click();await expect(page.getByRole('dialog',{name:'Expanded Recall image'})).toBeVisible();await page.getByRole('dialog').getByRole('button',{name:'Close'}).click();const after=await snapshot(page);expect(after.events).toEqual(before.events);expect(after.rewardEvents).toEqual(before.rewardEvents);
  await expectNoOverflow(page);
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
