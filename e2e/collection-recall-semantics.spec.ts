import { existsSync } from 'node:fs';
import { resolveCardPresentation } from '../src/domain/card-presentation';
import { acceptScheduledReview } from '../src/test/scheduled-review';
import { expect, navigate, openApp, replaceSnapshot, snapshot, test } from './helpers';

const packagePath='/Users/will_work/Downloads/Italian_Lessons_1-3_Clear_Prompts_v3_UPDATE.apkg';

/** Exercises the persisted semantic defect: a stale projection labelled the Answer as recallTask. */
test('Collection renders imported language Recall semantics before explicit Answer reveal',async({page})=>{
  test.skip(!existsSync(packagePath),'Canonical development package unavailable.');
  await openApp(page);
  await navigate(page,'Exchange');
  await page.getByLabel('Anki · Import Anki .apkg decks').click();
  await page.locator('#anki-import').setInputFiles(packagePath);
  const importButton=page.getByRole('button',{name:/Import \d+ supported cards/});
  await expect(importButton).toBeVisible({timeout:30_000});
  await importButton.click();

  let state=await snapshot(page);
  const answers=['Ciao!','Buongiorno!','Buonasera!'];
  const targets=answers.map(answer=>state.cards.find(card=>card.answer===answer)).filter((card):card is NonNullable<typeof card>=>!!card);
  expect(targets).toHaveLength(3);
  const expected=new Map(targets.map(card=>[card.id,resolveCardPresentation(card,state.ankiSources,state.decks.find(deck=>deck.id===card.deckId)).primary]));

  for(const [cardIndex,target] of targets.entries()){
    // Reproduce the real CASE B failure shape found in persisted/imported state.
    target.presentation={...target.presentation,profile:'language',recallTask:target.answer};
    for(let day=0;day<state.rewardConfig[target.rarity??'common'];day++){
      const prior=state.states[target.id];
      const now=new Date(prior?Math.max(Date.parse(prior.due),Date.parse(prior.last_review!)+86_400_000):Date.parse(`2026-09-${String(day+1).padStart(2,'0')}T10:00:00.000Z`));
      state=acceptScheduledReview(state,{id:`recall-semantic-${cardIndex}-${day}`,cardId:target.id,sessionId:`recall-session-${cardIndex}-${day}`,rating:5,now,activeMs:1000,recallMs:500});
    }
  }
  await replaceSnapshot(page,state);
  await page.reload();
  await navigate(page,'Collection');
  await page.getByRole('tab',{name:'Cards'}).click();

  for(const target of targets){
    const item=page.locator('.collectible-item').filter({has:page.getByRole('button',{name:`Inspect ${target.answer}`})});
    const surface=item.locator('.memory-card'),primary=item.locator('.card-copy h3'),motion=item.locator('.card-motion');
    await expect(surface).toHaveAttribute('data-card-id',target.id);
    await expect(surface).toHaveAttribute('data-face','recall');
    await expect(primary).toHaveText(expected.get(target.id)!);
    await expect(primary).not.toHaveText(target.answer);
    await motion.click();
    await expect(surface).toHaveAttribute('data-face','answer');
    await expect(primary).toHaveText(target.answer);
    await motion.click();
    await expect(surface).toHaveAttribute('data-face','recall');
    await expect(primary).toHaveText(expected.get(target.id)!);
  }

  const first=targets[0]!,deckById=new Map(state.decks.map(deck=>[deck.id,deck] as const));
  let set=deckById.get(first.deckId)!;
  while(set.parentId&&deckById.has(set.parentId))set=deckById.get(set.parentId)!;
  await page.evaluate(()=>localStorage.clear());
  await page.goto(`/#collection/desk/set/${encodeURIComponent(set.id)}`);
  await page.reload();

  const preview=page.locator('.stack-preview-shell'),previewFace=preview.locator('.memory-card'),previewPrimary=preview.locator('.card-copy h3');
  await expect(previewFace).toHaveAttribute('data-card-id',first.id);
  await expect(previewFace).toHaveAttribute('data-face','recall');
  await expect(previewPrimary).toHaveText(expected.get(first.id)!);
  console.log('HR_RECALL_INITIAL',JSON.stringify({cardId:first.id,front:first.front,answer:first.answer,resolvedPrimary:expected.get(first.id),placementFace:null,revealed:false,dataFace:await previewFace.getAttribute('data-face'),visibleText:(await previewPrimary.textContent())?.trim()}));

  await page.locator('.stack-dock').click();
  const placement=page.locator(`[data-placement-id="owned-${first.id}"]`),surface=placement.locator('.memory-card'),primary=placement.locator('.card-copy h3');
  await expect(placement).toHaveAttribute('data-placement-face','recall');
  await expect(surface).toHaveAttribute('data-face','recall');
  await expect(primary).toHaveText(expected.get(first.id)!);
  await placement.dblclick();
  await expect(placement).toHaveAttribute('data-placement-face','answer');
  await expect(surface).toHaveAttribute('data-face','answer');
  await expect(primary).toHaveText(first.answer);
  console.log('HR_RECALL_AFTER_FLIP',JSON.stringify({cardId:first.id,dataFace:await surface.getAttribute('data-face'),visibleText:(await primary.textContent())?.trim()}));

  await page.getByRole('button',{name:'Return to stack'}).click();
  await expect(placement).toHaveCount(0);
  await expect(previewFace).toHaveAttribute('data-card-id',first.id);
  await expect(previewFace).toHaveAttribute('data-face','recall');
  await expect(previewPrimary).toHaveText(expected.get(first.id)!);
  await page.locator('.stack-dock').click();
  const redealt=page.locator(`[data-placement-id="owned-${first.id}"]`);
  await expect(redealt).toHaveAttribute('data-placement-face','recall');
  await expect(redealt.locator('.memory-card')).toHaveAttribute('data-face','recall');
  await expect(redealt.locator('.card-copy h3')).toHaveText(expected.get(first.id)!);
  console.log('HR_RECALL_REDEALT',JSON.stringify({cardId:first.id,dataFace:await redealt.locator('.memory-card').getAttribute('data-face'),visibleText:(await redealt.locator('.card-copy h3').textContent())?.trim()}));
});
