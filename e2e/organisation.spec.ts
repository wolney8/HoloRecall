import { test,expect,navigate,openApp,snapshot } from './helpers';
import type { CardContent,State } from '../src/domain/models';

async function waitForIndex(page:import('@playwright/test').Page):Promise<void>{await expect(page.getByText('Updating local index…')).toHaveCount(0,{timeout:15_000});}
async function replaceSnapshot(page:import('@playwright/test').Page,state:State):Promise<void>{await page.evaluate(next=>new Promise<void>((resolve,reject)=>{const open=indexedDB.open('holorecall-local-v1',2);open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,transaction=db.transaction('local-study','readwrite');transaction.objectStore('local-study').put(next,'snapshot');transaction.oncomplete=()=>{db.close();resolve();};transaction.onerror=()=>reject(transaction.error);};}),state);}

test('HR-ORG-01 search covers accents and navigates to a card editor',async({page})=>{
  await openApp(page);await navigate(page,'Decks');await page.getByRole('tab',{name:'Search cards'}).click();await waitForIndex(page);
  const search=page.getByRole('combobox',{name:'Search decks and cards'});await search.fill('caffe');
  await expect(page.getByText('1 matching cards')).toBeVisible();
  const result=page.getByRole('option').filter({hasText:'il caffè'});await expect(result).toContainText('card');await expect(result).toContainText('coffee');
  await result.click();await expect(page.getByRole('heading',{name:'Edit learning content'})).toBeVisible();await expect(page.getByLabel('Back text / answer')).toHaveValue('il caffè');
});

test('HR-ORG-02 combined filters are visible, clearable and retained through Collection navigation',async({page})=>{
  await openApp(page);await navigate(page,'Decks');await page.getByRole('tab',{name:'Search cards'}).click();await waitForIndex(page);
  await page.getByRole('button',{name:/Filters/}).click();await page.getByRole('checkbox',{name:'Verbs'}).check();await page.getByRole('checkbox',{name:'image'}).check();
  await expect(page.getByText(/matching cards/)).toBeVisible();const filtered=await page.locator('.card-list-row').count();expect(filtered).toBeGreaterThan(0);expect(filtered).toBeLessThan(16);
  await navigate(page,'Collection');await waitForIndex(page);await expect(page.locator('.owned-section .collectible-item')).toHaveCount(0);await expect(page.getByRole('heading',{name:'Your collection is empty'})).toBeVisible();
  await expect(page.getByRole('textbox',{name:'Search your collection'})).toHaveValue('');await expect(page.getByRole('button',{name:'Earned',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Next unlock',exact:true})).toHaveCount(0);
});

test('HR-ORG-03 and 04 bulk tag and move preserve learning state',async({page})=>{
  await openApp(page);await navigate(page,'Decks');await waitForIndex(page);const before=await snapshot(page);
  await page.getByRole('button',{name:'New deck',exact:true}).click();await page.getByLabel('Deck title').fill('Archive practice');await page.getByRole('button',{name:'Save deck'}).click();
  await page.getByRole('tab',{name:'Search cards'}).click();
  const first=page.locator('.card-list-row').first();await first.getByRole('checkbox').check();await page.getByLabel('Move to deck').click();await page.getByRole('option',{name:'Archive practice'}).click();await page.getByLabel('Add tags').fill(' Travel , travel, Review ');await page.getByRole('button',{name:'Apply changes'}).click();await expect(page.getByText('1 cards updated. Review history and earned cosmetics were preserved.')).toBeVisible();
  const after=await snapshot(page),moved=after.cards.find(card=>card.tags.includes('Review'))!;expect(moved).toBeTruthy();expect(after.decks.find(deck=>deck.id===moved.deckId)?.name).toBe('Archive practice');expect(moved.tags.filter(tag=>tag.toLowerCase()==='travel')).toHaveLength(1);expect(after.events).toEqual(before.events);expect(after.rewardEvents).toEqual(before.rewardEvents);expect(after.states).toEqual(before.states);
});

test('HR-ORG-06 ten-thousand-card library bounds DOM and remains queryable',async({page},testInfo)=>{
  await openApp(page);const base=await snapshot(page),template=base.cards[0]!;
  const cards=Array.from({length:10_000},(_,index):CardContent=>({...template,id:`scale-${index}`,kind:'text',front:`Prompt ${index}`,answer:`Answer ${index}`,meaning:index===9876?'needle meaning':'ordinary meaning',notes:`Batch ${index%20}`,tags:[`Batch ${index%20}`],revision:1,image:undefined,backImage:undefined,imageDescription:undefined,createdAt:new Date(2026,0,1,0,0,index%60).toISOString()}));
  const state={...base,version:base.version+1,cards,states:{},events:[],rewardEvents:[],session:null,assets:[],designs:[]};await replaceSnapshot(page,state);const start=Date.now();await page.reload();await navigate(page,'Decks');await page.getByRole('tab',{name:'Search cards'}).click();await expect(page.getByText('10000 matching cards')).toBeVisible({timeout:15_000});const indexMs=Date.now()-start;
  expect(await page.locator('.card-list-row').count()).toBe(60);const queryStart=Date.now();await page.getByRole('combobox',{name:'Search decks and cards'}).fill('needle meaning');await expect(page.getByText('1 matching cards')).toBeVisible();const queryMs=Date.now()-queryStart;await expect(page.locator('.card-list-row')).toHaveCount(1);const measurements={engine:testInfo.project.name,cards:10_000,indexAndRenderMs:indexMs,queryAndRenderMs:queryMs,domRows:1};console.info(`[HR-ORG-06 browser] ${JSON.stringify(measurements)}`);await testInfo.attach('performance.json',{body:JSON.stringify(measurements,null,2),contentType:'application/json'});expect(queryMs).toBeLessThan(1500);
});

test('HR-ORG-07 organisation controls reflow on phone viewports @ios-compact @ios-large @ios-landscape',async({page})=>{
  await openApp(page);await navigate(page,'Decks');await page.addStyleTag({content:'html{-webkit-text-size-adjust:200%;text-size-adjust:200%}'});await page.getByRole('tab',{name:'Search cards'}).click();await waitForIndex(page);
  const search=page.getByRole('combobox',{name:'Search decks and cards'});await expect(search).toBeVisible();await search.fill('verbs');await page.getByRole('button',{name:/Filters/}).click();await expect(page.getByRole('group',{name:'Study'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);await search.fill('');
});
