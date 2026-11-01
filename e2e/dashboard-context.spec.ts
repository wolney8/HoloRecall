import { acceptScheduledReview } from '../src/test/scheduled-review';
import type { State } from '../src/domain/models';
import { expect, expectNoOverflow, navigate, openApp, replaceSnapshot, snapshot, test } from './helpers';

function withHierarchy(state:State):{state:State;cardId:string}{
  const next=structuredClone(state),card=next.cards[0]!;
  next.decks.push(
    {id:'dashboard-course',name:'Italian course',description:'',suspended:false,coverImage:'art/caffe.svg'},
    {id:'dashboard-lesson',name:'Introductions',description:'',suspended:false,parentId:'dashboard-course'},
  );
  card.deckId='dashboard-lesson';
  return{state:next,cardId:card.id};
}

async function installRecentHierarchy(page:import('@playwright/test').Page,cover='art/caffe.svg'){
  const fixture=withHierarchy(await snapshot(page));
  fixture.state.decks.find(deck=>deck.id==='dashboard-course')!.coverImage=cover;
  let reviewed=acceptScheduledReview(fixture.state,{id:'dashboard-review',cardId:fixture.cardId,sessionId:'dashboard-session',rating:4,now:new Date('2026-10-26T12:00:00.000Z'),activeMs:1_200,recallMs:500});
  const due='2026-10-01T12:00:00.000Z',event=reviewed.events.find(item=>item.kind==='review'&&item.id==='dashboard-review');
  if(event?.kind==='review')event.resultingState={...event.resultingState,due};
  reviewed={...reviewed,session:null,states:{...reviewed.states,[fixture.cardId]:{...reviewed.states[fixture.cardId]!,due}}};
  await replaceSnapshot(page,reviewed);await page.reload();
  return fixture.cardId;
}

test('neutral Dashboard is truthful, deterministic and read-only',async({page})=>{
  await openApp(page);const state=await snapshot(page);
  state.events=[];state.session=null;state.practiceEvents=[];state.rewardEvents=[];
  await replaceSnapshot(page,state);await page.reload();
  const hero=page.getByTestId('dashboard-hero'),before=await snapshot(page);
  await expect(hero.getByRole('heading',{name:'Your study dashboard'})).toBeVisible();
  await expect(hero).not.toContainText('Italian essentials');
  await expect(hero.locator('.study-summary-neutral')).toBeVisible();
  await expect(hero.locator('.study-summary-neutral img')).toHaveAttribute('alt','');
  await navigate(page,'Decks');await navigate(page,'Dashboard');
  const after=await snapshot(page);
  expect({events:after.events,session:after.session,states:after.states,rewardEvents:after.rewardEvents,practiceEvents:after.practiceEvents}).toEqual({events:before.events,session:before.session,states:before.states,rewardEvents:before.rewardEvents,practiceEvents:before.practiceEvents});
  await page.goto('/');await expect(page.getByTestId('dashboard-hero').getByRole('heading',{name:'Your study dashboard'})).toBeVisible();
});

test('empty new profile keeps a functional neutral route into Decks',async({page})=>{
  await openApp(page);const state=await snapshot(page);
  state.decks=[];state.cards=[];state.states={};state.cardControls={};state.events=[];state.rewardEvents=[];state.practiceEvents=[];state.session=null;
  await replaceSnapshot(page,state);await page.reload();
  const hero=page.getByTestId('dashboard-hero');await expect(hero.getByRole('heading',{name:'Your study dashboard'})).toBeVisible();await expect(hero).toContainText('Choose a deck to study, or create a card to begin.');
  await hero.getByRole('button',{name:/View decks/}).click();await expect(page.getByRole('heading',{name:'Decks',exact:true})).toBeVisible();
});

test('recent child activity keeps one hierarchy-aware scope for artwork, counts and Study',async({page})=>{
  await openApp(page);const cardId=await installRecentHierarchy(page);
  const hero=page.getByTestId('dashboard-hero');
  await expect(hero.getByRole('heading',{name:'Introductions',exact:true})).toBeVisible();
  await expect(hero).toContainText('Italian course');
  await expect(hero).toContainText('1 due reviews');
  const image=hero.locator(':scope > img');await expect(image).toHaveAttribute('src',/art\/caffe\.svg$/);await expect(image).toHaveAttribute('alt','');
  await hero.getByRole('button',{name:/Start studying/}).click();
  await expect(page.getByRole('region',{name:'Current flashcard',exact:true})).toBeVisible();
  const started=await snapshot(page);expect(started.session?.scopeDeckId).toBe('dashboard-lesson');expect(started.session?.queue).toContain(cardId);
  expect(started.session?.queue.every(id=>started.cards.find(card=>card.id===id)?.deckId==='dashboard-lesson')).toBe(true);
});

test('active session wins and Resume preserves the existing session',async({page})=>{
  await openApp(page);const fixture=withHierarchy(await snapshot(page));
  fixture.state.session={id:'existing-dashboard-session',queue:[fixture.cardId],total:1,completed:0,revealed:false,activeMs:0,mode:'scheduled',scopeDeckId:'dashboard-lesson'};
  await replaceSnapshot(page,fixture.state);await page.reload();
  const hero=page.getByTestId('dashboard-hero');await expect(hero).toContainText('Current study session');await expect(hero.getByRole('heading',{name:'Introductions'})).toBeVisible();
  await hero.getByRole('button',{name:/Resume study/}).click();await expect(page.getByRole('region',{name:'Current flashcard',exact:true})).toBeVisible();
  expect((await snapshot(page)).session?.id).toBe('existing-dashboard-session');
});

test('missing deck media falls back to the neutral visual without losing recent scope',async({page})=>{
  await openApp(page);await installRecentHierarchy(page,'asset:missing-dashboard-cover');
  const hero=page.getByTestId('dashboard-hero');await expect(hero.getByRole('heading',{name:'Introductions'})).toBeVisible();await expect(hero.locator('.study-summary-neutral')).toBeVisible();
});

test('hero remains usable across medium and expanded light/dark layouts',async({page})=>{
  await openApp(page);const state=await snapshot(page);state.events=[];state.session=null;
  for(const theme of ['light','dark'] as const)for(const viewport of [{width:900,height:820},{width:1440,height:900}]){
    state.preferences={...state.preferences,theme};await replaceSnapshot(page,state);await page.setViewportSize(viewport);await page.reload();
    const hero=page.getByTestId('dashboard-hero');await expect(hero.getByRole('heading',{name:'Your study dashboard'})).toBeVisible();await expect(hero.getByRole('button',{name:/Start studying/})).toBeVisible();await expectNoOverflow(page);
  }
});

test('Dashboard hero remains reachable and unclipped at compact 200% text @ios-compact',async({page})=>{
  await openApp(page);const state=await snapshot(page);state.events=[];state.session=null;state.preferences={...state.preferences,theme:'dark'};await replaceSnapshot(page,state);await page.reload();
  await page.addStyleTag({content:'html{-webkit-text-size-adjust:200%;text-size-adjust:200%}'});
  const hero=page.getByTestId('dashboard-hero'),action=hero.getByRole('button',{name:/Start studying/});await expect(hero.getByRole('heading',{name:'Your study dashboard'})).toBeVisible();await expect(action).toBeVisible();await expectNoOverflow(page);
  await action.focus();await expect(action).toBeFocused();
});
