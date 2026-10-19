import { test,expect,navigate,openApp,snapshot } from './helpers';
import type { State } from '../src/domain/models';
import { acceptScheduledReview } from '../src/test/scheduled-review';
import { PRESTIGE_CYCLE_THRESHOLDS, prestigeProgress } from '../src/domain/rewards';

async function replaceSnapshot(page:import('@playwright/test').Page,state:State):Promise<void>{await page.evaluate(next=>new Promise<void>((resolve,reject)=>{const open=indexedDB.open('holorecall-local-v1',2);open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,transaction=db.transaction('local-study','readwrite');transaction.objectStore('local-study').put(next,'snapshot');transaction.oncomplete=()=>{db.close();resolve();};transaction.onerror=()=>reject(transaction.error);};}),state);}
function atLevel(state:State,cardId:string,level:number):State{
  state={...state,cards:state.cards.map(card=>card.id===cardId?{...card,rarity:'common' as const}:card)};
  const count=1+PRESTIGE_CYCLE_THRESHOLDS.slice(0,level).reduce((sum,value)=>sum+value,0);
  let now=new Date('2026-01-01T12:00:00Z');
  for(let index=0;index<count;index++){
    const stored=state.states[cardId];if(stored)now=new Date(Math.max(Date.parse(stored.due),Date.parse(stored.last_review!)+86_400_000));
    state=acceptScheduledReview(state,{id:`prestige-${cardId}-${index}`,cardId,sessionId:`prestige-session-${cardId}-${index}`,rating:5,now,activeMs:1200,recallMs:500});
  }
  return state;
}

test('HR-PRESTIGE Collection distinguishes P1, P5 and P10 and Results reuses the persisted promotion',async({page},testInfo)=>{
  await openApp(page);let state=await snapshot(page);const cards=state.cards.slice(0,3);
  state=atLevel(state,cards[0]!.id,1);state=atLevel(state,cards[1]!.id,5);state=atLevel(state,cards[2]!.id,10);
  expect(cards.map(card=>prestigeProgress(state,card.id).level)).toEqual([1,5,10]);await replaceSnapshot(page,state);
  await page.goto('/?prestige=collection#collection/cards');await expect(page.getByRole('heading',{name:'Collection',exact:true})).toBeVisible();await page.getByRole('button',{name:'Sort by Prestige'}).click();
  const prestigeCards=page.locator('.owned-section hr-card .memory-card[data-prestige]');await expect(prestigeCards).toHaveCount(3);expect(await prestigeCards.evaluateAll(nodes=>nodes.map(node=>[node.getAttribute('data-prestige'),node.getAttribute('data-prestige-band')]))).toEqual(expect.arrayContaining([['1','edge'],['5','midpoint'],['10','capstone']]));
  await page.getByRole('tab',{name:'Overview'}).click();await expect(page.getByRole('heading',{name:'Recent Prestige'})).toBeVisible();await testInfo.attach('prestige-collection.png',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
  await page.goto('/?prestige=results#results');await expect(page.getByRole('heading',{name:'Nice work'})).toBeVisible();await page.locator('[data-result-section="cosmetics"]').scrollIntoViewIfNeeded();await expect(page.getByRole('progressbar',{name:/Prestige progress: 8 of 8/})).toBeVisible();await expect(page.locator('.unlock-reveal')).toContainText('Prestige X');
  const before=(await snapshot(page)).rewardEvents;await expect(page.getByRole('button',{name:'Replay'})).toHaveCount(0);expect((await snapshot(page)).rewardEvents).toEqual(before);
});

test('HR-PRESTIGE remains identifiable with reduced motion and effects off @ios-compact @ios-large @ios-landscape',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await openApp(page);let state=await snapshot(page),card=state.cards[0]!;state=atLevel({...state,preferences:{...state.preferences,effects:false}},card.id,1);await replaceSnapshot(page,state);await page.goto('/?prestige=collection#collection');
  await expect(page.locator('hr-collection .memory-card[data-prestige="1"] .prestige-crest').first()).toHaveText('P I');
  const layout=await page.evaluate(()=>({width:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll<HTMLElement>('*')].filter(node=>node.getBoundingClientRect().right>document.documentElement.clientWidth+1).map(node=>({tag:node.tagName,className:node.className,right:Math.round(node.getBoundingClientRect().right),width:Math.round(node.getBoundingClientRect().width)})).slice(0,12)}));
  expect(layout.width,JSON.stringify(layout.overflow)).toBeLessThanOrEqual(page.viewportSize()!.width);
});
