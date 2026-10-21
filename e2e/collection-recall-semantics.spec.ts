import { existsSync } from 'node:fs';
import { resolveCardPresentation } from '../src/domain/card-presentation';
import { acceptScheduledReview } from '../src/test/scheduled-review';
import { expect, navigate, openApp, replaceSnapshot, snapshot, test } from './helpers';

const packagePath='/Users/will_work/Downloads/Italian_Lessons_1-3_Clear_Prompts_v3_UPDATE.apkg';

/** Exercises persisted importer projections that displaced the canonical Anki front with back-side semantics. */
test('Study stays Recall-first while Collection showcases Answer and flips to canonical Recall',async({page})=>{
  test.skip(!existsSync(packagePath),'Canonical development package unavailable.');
  await openApp(page);
  await navigate(page,'Exchange');
  await page.getByLabel('Anki · Import Anki .apkg decks').click();
  await page.locator('#anki-import').setInputFiles(packagePath);
  const importButton=page.getByRole('button',{name:/Import \d+ supported cards/});
  await expect(importButton).toBeVisible({timeout:30_000});
  await importButton.click();

  let state=await snapshot(page);
  const answers=['Ciao!','Buongiorno!','Buonasera!','Piacere!'];
  const greetingDeckId=state.cards.find(card=>card.answer==='Ciao!'&&card.front.includes('short informal greeting'))?.deckId;
  const targets=answers.map(answer=>state.cards.find(card=>card.deckId===greetingDeckId&&card.answer===answer)).filter((card):card is NonNullable<typeof card>=>!!card);
  expect(targets).toHaveLength(4);
  const expected=new Map(targets.map(card=>[card.id,resolveCardPresentation(card,state.ankiSources,state.decks.find(deck=>deck.id===card.deckId)).primary]));

  for(const [cardIndex,target] of targets.entries()){
    // Reproduce the screenshot failure: an importer-derived English gloss survived
    // as recallTask and displaced the complete retained template front.
    target.presentation={...target.presentation,profile:'language',recallTask:target.meaning};
    target.ankiSource!.conversion!.fieldOrigins={...target.ankiSource!.conversion!.fieldOrigins,presentation:'derived'};
    for(let day=0;day<state.rewardConfig[target.rarity??'common'];day++){
      const prior=state.states[target.id];
      const now=new Date(prior?Math.max(Date.parse(prior.due),Date.parse(prior.last_review!)+86_400_000):Date.parse(`2026-09-${String(day+1).padStart(2,'0')}T10:00:00.000Z`));
      state=acceptScheduledReview(state,{id:`recall-semantic-${cardIndex}-${day}`,cardId:target.id,sessionId:`recall-session-${cardIndex}-${day}`,rating:5,now,activeMs:1000,recallMs:500});
    }
  }
  const first=targets[0]!;
  state.preferences={...state.preferences,studyMode:'free-revision',motion:'reduced'};
  state.session={id:'recall-parity-session',mode:'practice',experienceMode:'free-revision',label:'Free revision',queue:[first.id],total:1,plannedTotal:1,completed:0,revealed:false,activeMs:0,cardStartedAt:'2026-10-21T10:00:00.000Z',startedAt:'2026-10-21T10:00:00.000Z',autoAdvancePaused:false};
  await replaceSnapshot(page,state);
  expect((await snapshot(page)).session?.queue).toEqual([first.id]);
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Study dashboard',exact:true})).toBeVisible();
  await page.getByRole('button',{name:/Resume study/}).click();
  const studySurface=page.locator('.study-card-area .memory-card'),studyPrimary=page.locator('.study-card-area .card-copy h3');
  await expect(studySurface).toHaveAttribute('data-card-id',first.id);
  await expect(studySurface).toHaveAttribute('data-face','recall');
  await expect(studyPrimary).toHaveText(expected.get(first.id)!);
  await expect(studyPrimary).not.toHaveText(first.meaning);
  console.log('HR_RECALL_STUDY',JSON.stringify({cardId:first.id,front:first.front,answer:first.answer,staleRecallTask:first.presentation?.recallTask,dataFace:await studySurface.getAttribute('data-face'),visibleText:(await studyPrimary.textContent())?.trim()}));

  state.session=null;
  await replaceSnapshot(page,state);
  await page.goto('/#collection/overview');
  await expect(page.getByRole('heading',{name:'Collection',exact:true})).toBeVisible();
  const overviewFace=page.locator(`.overview-mini .memory-card[data-card-id="${first.id}"]`);
  await expect(overviewFace).toHaveAttribute('data-face','answer');
  await expect(overviewFace.locator('.card-copy h3')).toHaveText(first.answer);

  const deckById=new Map(state.decks.map(deck=>[deck.id,deck] as const));
  let set=deckById.get(first.deckId)!;
  while(set.parentId&&deckById.has(set.parentId))set=deckById.get(set.parentId)!;
  await page.goto(`/#collection/sets/deck/${encodeURIComponent(set.id)}`);
  const setFace=page.locator(`.set-slots .memory-card[data-card-id="${first.id}"]`);
  await expect(setFace).toHaveAttribute('data-face','answer');
  await expect(setFace.locator('.card-copy h3')).toHaveText(first.answer);

  await page.goto('/#collection/cards');
  await page.getByRole('tab',{name:'Cards'}).click();

  for(const target of targets){
    const item=page.locator('.collectible-item').filter({has:page.getByRole('button',{name:`Inspect ${target.answer}`})});
    const surface=item.locator('.memory-card'),primary=item.locator('.card-copy h3'),motion=item.locator('.card-motion');
    await expect(surface).toHaveAttribute('data-card-id',target.id);
    await expect(surface).toHaveAttribute('data-face','answer');
    await expect(primary).toHaveText(target.answer);
    await expect(primary).not.toHaveText(expected.get(target.id)!);
    await motion.click();
    await expect(surface).toHaveAttribute('data-face','recall');
    await expect(primary).toHaveText(expected.get(target.id)!);
    await motion.click();
    await expect(surface).toHaveAttribute('data-face','answer');
    await expect(primary).toHaveText(target.answer);
  }

  await page.evaluate(()=>localStorage.clear());
  await page.goto(`/#collection/desk/set/${encodeURIComponent(set.id)}`);
  await page.reload();

  const preview=page.locator('.stack-preview-shell'),previewFace=preview.locator('.memory-card'),previewPrimary=preview.locator('.card-copy h3');
  await expect(previewFace).toHaveAttribute('data-card-id',first.id);
  await expect(previewFace).toHaveAttribute('data-face','answer');
  await expect(previewPrimary).toHaveText(first.answer);
  console.log('HR_COLLECTION_INITIAL',JSON.stringify({cardId:first.id,front:first.front,answer:first.answer,resolvedRecallPrimary:expected.get(first.id),placementFace:null,revealed:true,dataFace:await previewFace.getAttribute('data-face'),visibleText:(await previewPrimary.textContent())?.trim()}));

  await page.locator('.stack-dock').click();
  const placement=page.locator(`[data-placement-id="owned-${first.id}"]`),surface=placement.locator('.memory-card'),primary=placement.locator('.card-copy h3');
  await expect(placement).toHaveAttribute('data-placement-face','answer');
  await expect(surface).toHaveAttribute('data-face','answer');
  await expect(primary).toHaveText(first.answer);
  const secondId=await previewFace.getAttribute('data-card-id');
  expect(secondId).not.toBe(first.id);
  expect(expected.has(secondId!)).toBe(true);
  await expect(previewFace).toHaveAttribute('data-face','answer');
  await expect(previewPrimary).toHaveText(targets.find(card=>card.id===secondId)!.answer);
  await placement.dblclick();
  await expect(placement).toHaveAttribute('data-placement-face','recall');
  await expect(surface).toHaveAttribute('data-face','recall');
  await expect(primary).toHaveText(expected.get(first.id)!);
  console.log('HR_COLLECTION_AFTER_FLIP_TO_RECALL',JSON.stringify({cardId:first.id,dataFace:await surface.getAttribute('data-face'),visibleText:(await primary.textContent())?.trim()}));

  await page.getByRole('button',{name:'Return to stack'}).click();
  await expect(placement).toHaveCount(0);
  await expect(previewFace).toHaveAttribute('data-card-id',first.id);
  await expect(previewFace).toHaveAttribute('data-face','answer');
  await expect(previewPrimary).toHaveText(first.answer);
  await page.locator('.stack-dock').click();
  const redealt=page.locator(`[data-placement-id="owned-${first.id}"]`);
  await expect(redealt).toHaveAttribute('data-placement-face','answer');
  await expect(redealt.locator('.memory-card')).toHaveAttribute('data-face','answer');
  await expect(redealt.locator('.card-copy h3')).toHaveText(first.answer);
  console.log('HR_COLLECTION_REDEALT',JSON.stringify({cardId:first.id,dataFace:await redealt.locator('.memory-card').getAttribute('data-face'),visibleText:(await redealt.locator('.card-copy h3').textContent())?.trim()}));
  await expect.poll(()=>page.evaluate(id=>Object.values(localStorage).some(value=>value.includes(id)),first.id)).toBe(true);
  await page.reload();
  const restored=page.locator(`[data-placement-id="owned-${first.id}"]`);
  await expect(restored).toHaveAttribute('data-placement-face','answer');
  await expect(restored.locator('.memory-card')).toHaveAttribute('data-face','answer');
  await expect(restored.locator('.card-copy h3')).toHaveText(first.answer);
});
