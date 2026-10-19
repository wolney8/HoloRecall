import { expect, navigate, openApp, revealCard, snapshot, test } from './helpers';
import type {Page} from '@playwright/test';
import type {State} from '../src/domain/models';
import {acceptScheduledReview} from '../src/test/scheduled-review';

async function ownFirstCard(page:Page):Promise<void>{let state=await snapshot(page);const card=state.cards[0]!;state={...state,cards:state.cards.map(item=>item.id===card.id?{...item,rarity:'common' as const}:item)};state=acceptScheduledReview(state,{id:'collection-owned',cardId:card.id,sessionId:'collection-owned-session',rating:4,now:new Date('2026-10-01T12:00:00Z'),activeMs:1200,recallMs:500});await page.evaluate(next=>new Promise<void>((resolve,reject)=>{const request=indexedDB.open('holorecall-local-v1',2);request.onsuccess=()=>{const db=request.result,transaction=db.transaction('local-study','readwrite');transaction.objectStore('local-study').put(next,'snapshot');transaction.oncomplete=()=>{db.close();resolve();};transaction.onerror=()=>reject(transaction.error);};request.onerror=()=>reject(request.error);}),state);await page.reload();}

test('HR-FOCUS practice from Collection never mutates FSRS, limits or rewards and recovers on reload',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await openApp(page);await ownFirstCard(page);const before=await snapshot(page);
  await page.getByRole('button',{name:'Collection',exact:true}).click();await page.getByRole('tab',{name:'Cards'}).click();await page.getByRole('button',{name:/Inspect /}).first().click();await page.getByRole('button',{name:'Practice this card'}).click();
  await expect(page.getByRole('heading',{name:'Practice',exact:true})).toBeVisible();await expect(page.locator('.session-bar')).toContainText('Collection cards');
  await revealCard(page);await page.getByRole('button',{name:/1 Again Forgot/}).click();
  await expect(page.getByRole('heading',{name:'Practice complete'})).toBeVisible();const after=await snapshot(page);
  expect(after.practiceEvents).toHaveLength(1);expect(after.events).toEqual(before.events);expect(after.states).toEqual(before.states);expect(after.rewardEvents).toEqual(before.rewardEvents);expect(after.cardControls).toEqual(before.cardControls);expect(after.todayOverrides).toEqual(before.todayOverrides);
  await expect(page.getByText(/1 card is still at Confidence 1 or 2/)).toBeVisible();await expect(page.getByRole('heading',{name:'Cosmetic progress'})).toHaveCount(0);
  await expect(page.getByLabel('Practice confidence distribution')).toContainText('Confidence 1');await expect(page.getByRole('button',{name:'View cards'})).toBeVisible();await expect(page.getByRole('button',{name:'Return to decks'})).toBeVisible();
  await page.reload();await expect(page.getByRole('heading',{name:'Practice complete'})).toBeVisible();expect((await snapshot(page)).practiceEvents).toHaveLength(1);
  await page.getByRole('button',{name:'Practice missed again'}).click();await expect(page.getByRole('heading',{name:'Focus',exact:true})).toBeVisible();
});

test('HR-FOCUS builder saves criteria, scheduled mode stays eligible, and today limit action is scoped',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await openApp(page);await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Focus',exact:true}).click();
  const initial=await snapshot(page),deck=initial.decks[0]!;await page.getByLabel('Deck or journey').click();await page.getByRole('option',{name:deck.name,exact:true}).click();
  const oldLimit=initial.studyPresets.find(item=>item.id===(deck.studyPresetId??'balanced'))!.newCardsPerDay;
  await page.getByLabel('Add cards').fill('2');await page.getByRole('button',{name:'Apply and study'}).first().click();
  await expect(page.getByRole('heading',{name:'Study',exact:true})).toBeVisible();const limited=await snapshot(page);expect(limited.session?.mode).toBe('scheduled');expect(limited.session?.label).toBe('More new cards today');expect(limited.todayOverrides.find(item=>item.deckId===deck.id)?.newCardsPerDay).toBe(oldLimit+2);
  await page.getByRole('button',{name:'End session'}).click();await page.getByRole('button',{name:'Focus',exact:true}).click();await page.getByLabel('Deck or journey').click();await page.getByRole('option',{name:deck.name,exact:true}).click();await page.getByRole('button',{name:'Build custom session'}).click();
  await page.getByLabel('Session name').fill('Italian weak cards');await page.getByLabel('Maximum cards').fill('3');await page.getByLabel('Focus preset name').fill('Italian weak cards');await page.getByRole('button',{name:'Save preset'}).click();
  await expect(page.getByText('Focus preset saved. It will rerun these criteria against current cards.')).toBeVisible();await expect(page.getByText('Practice · up to 3 cards')).toBeVisible();
  const saved=await snapshot(page);expect(saved.focusPresets).toHaveLength(1);expect(saved.focusPresets[0]).toMatchObject({name:'Italian weak cards',mode:'practice',limit:3,criteria:{version:1,deckId:deck.id}});
});

test('HR-FOCUS consecutive Practice ratings retain visible cards and never create scheduled reviews',async({page})=>{
  await openApp(page);await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Focus',exact:true}).click();await page.getByRole('button',{name:/Preview new cards/}).click();
  await expect(page.getByRole('heading',{name:'Practice',exact:true})).toBeVisible();
  const total=(await snapshot(page)).session!.total;
  for(let index=0;index<2;index++){await page.getByRole('button',{name:/Check answer/}).click();await page.getByRole('button',{name:/3 Good Some hesitation/}).click();await expect(page.locator('.session-bar')).toContainText(`${index+1} / ${total}`,{timeout:4_000});const stage=page.getByTestId('study-deck-stage');await expect(stage.locator('hr-card')).toBeVisible();expect(await stage.evaluate(node=>({opacity:getComputedStyle(node).opacity,visibility:getComputedStyle(node).visibility,display:getComputedStyle(node).display}))).toEqual({opacity:'1',visibility:'visible',display:'block'});}
  const state=await snapshot(page);expect(state.practiceEvents).toHaveLength(2);expect(state.events).toHaveLength(0);expect(state.rewardEvents).toHaveLength(0);
});

test('HR-FOCUS @ios-compact @ios-large @ios-landscape reflows quick actions and Practice player',async({page})=>{
  await openApp(page);await navigate(page,'Focus');await page.addStyleTag({content:'html{font-size:200%}'});
  await expect(page.getByRole('heading',{name:'Focus',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByRole('button',{name:/Preview new cards/}).click();await expect(page.getByRole('region',{name:'Current flashcard'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});
