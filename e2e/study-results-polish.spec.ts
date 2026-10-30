import { test, expect, openApp, navigate, snapshot, expectNoOverflow } from './helpers';
import type { Page } from '@playwright/test';

async function installStructuredLegacyCase(page:Page):Promise<string>{
  return page.evaluate(()=>new Promise<string>((resolve,reject)=>{
    const request=indexedDB.open('holorecall-local-v1',2);request.onerror=()=>reject(request.error);request.onsuccess=()=>{
      const db=request.result,tx=db.transaction('local-study','readwrite'),store=tx.objectStore('local-study'),read=store.get('snapshot');read.onerror=()=>reject(read.error);read.onsuccess=()=>{
        const state=read.result,card=state.cards[0],snapshotId='support-source',noteGuid='support-note';
        const roles='<div class="tiles"><div class="word-tile"><span>lui</span><small>subject pronoun</small></div><div class="word-tile"><span>è</span><small>verb</small></div></div>';
        const rule='<p>sono → sei → è</p><h3>Forms to notice</h3><p><strong>essere — to be</strong><br>ES-seh-reh</p><p>Full present-tense reference. Plural forms are additional study support.</p><table><tr><th>Italian + pronunciation</th><th>English</th></tr><tr><td><strong>io sono</strong><br>EE-oh SOH-noh</td><td>I am</td></tr><tr><td><strong>tu sei</strong><br>too say</td><td>You are — informal</td></tr><tr><td><strong>lui / lei è</strong><br>LOO-ee / lay eh</td><td>He is / she is</td></tr></table>';
        card.front='Use essere to say: he is / she is';card.answer='lui è / lei è';card.pronunciation='LOO-ee eh / lay eh';card.meaning='he is / she is';
        card.details=[{label:'Word jobs',content:'lui\nsubject pronoun\nè\nverb'},{label:'Rule or pattern',content:'sono → sei → è\nForms to notice\nessere — to be\nES-seh-reh\nFull present-tense reference. Plural forms are additional study support.\nItalian + pronunciation\nEnglish\nio sono\nEE-oh SOH-noh\nI am\ntu sei\ntoo say\nYou are — informal\nlui / lei è\nLOO-ee / lay eh\nHe is / she is'}];
        card.ankiSource={kind:'anki',noteGuid,noteId:'1',templateOrdinal:0,modelName:'Structured support',templateName:'Card 1',modelSignature:'anki-model-v1-12345678',sourceSnapshotId:snapshotId,sourceTemplateId:'m:0',importedContentHash:'00000000',linkState:'linked'};card.revision+=1;
        state.ankiSources=state.ankiSources.filter((item:any)=>item.id!==snapshotId);state.ankiSources.push({id:snapshotId,version:2,packageVariant:'legacy-anki2',sourceDecks:[{id:'d',path:'Support'}],noteTypes:[{id:'m',name:'Structured support',cloze:false,fields:[{id:'f1',name:'Roles',ordinal:0},{id:'f2',name:'Rule',ordinal:1}],templates:[{id:'m:0',name:'Card 1',ordinal:0,question:'{{Prompt}}',answer:'{{FrontSide}}<hr id="answer">{{Rule}}'}],signature:'anki-model-v1-12345678'}],notes:[{id:'1',guid:noteGuid,noteTypeId:'m',fields:{Roles:roles,Rule:rule},tags:[]}],cards:[{id:'c',noteId:'1',templateId:'m:0',templateOrdinal:0,sourceDeckId:'d'}],media:[],contentHash:'anki-source-snapshot-v2-12345678'});
        state.version+=1;store.put(state,'snapshot');tx.oncomplete=()=>{db.close();resolve(card.id)};tx.onerror=()=>reject(tx.error);
      };
    };
  }));
}

async function startFixturePractice(page:Page):Promise<void>{
  await navigate(page,'Collection');
  await page.locator('.inspection-details .practice-card-actions').getByRole('button',{name:'Practice this card'}).click();
  await expect(page.getByTestId('study-deck-stage')).toBeVisible();
}

const geometry=(page:Page)=>page.evaluate(()=>{const layout=document.querySelector('.study-layout')!.getBoundingClientRect();return{innerWidth,clientWidth:document.documentElement.clientWidth,x:Math.round(layout.x),width:Math.round(layout.width)};});

test('HR-STUDY-RESULTS stable viewport, close support and structured legacy source',async({page},testInfo)=>{
  await openApp(page);await installStructuredLegacyCase(page);await page.reload();await startFixturePractice(page);
  const before=await geometry(page),motion=page.locator('.study-card-area .card-motion');
  await motion.click({position:{x:70,y:70}});await expect(motion).toHaveAttribute('aria-label','Show card front');
  const after=await geometry(page);expect(after).toEqual(before);
  const support=page.locator('.study-answer-support');await expect(support).toBeVisible();
  const [card,controls,supportBox]=await Promise.all([page.locator('.study-card-area').boundingBox(),page.locator('.study-controls').boundingBox(),support.boundingBox()]);
  const gap=supportBox!.y-Math.max(card!.y+card!.height,controls!.y+controls!.height);expect(gap).toBeGreaterThanOrEqual(10);expect(gap).toBeLessThanOrEqual(18);
  await support.getByText('Card Details',{exact:true}).click();
  await expect(support.locator('.support-pairs dt')).toHaveText(['lui','è']);await expect(support.locator('.support-pairs dd')).toHaveText(['subject pronoun','verb']);
  const table=support.getByRole('table');await expect(table).toBeVisible();await expect(table.getByRole('columnheader')).toHaveText(['Italian + pronunciation','English']);const termCell=table.getByRole('cell').first();await expect(termCell.locator('.semantic-primary')).toHaveText('io sono');await expect(termCell.locator('.semantic-secondary')).toHaveText('EE-oh SOH-noh');await expect(termCell.locator('.semantic-secondary')).toHaveCSS('display','block');
  expect(await geometry(page)).toEqual(before);await expectNoOverflow(page);await page.screenshot({path:testInfo.outputPath('structured-support-stable-study.png'),fullPage:true});
});

test('HR-STUDY-RESULTS revealed card supports temporary Recall Peek without learner-state mutation',async({page})=>{
  await openApp(page);await installStructuredLegacyCase(page);await page.reload();await startFixturePractice(page);
  const motion=page.locator('.study-card-area .card-motion');await expect(motion).toHaveAttribute('aria-label','Show card answer');await page.waitForTimeout(2700);await expect(motion).toHaveAttribute('aria-label','Show card answer');await motion.click({position:{x:70,y:70}});await expect(motion).toHaveAttribute('aria-label','Show card front');
  const revealed=await snapshot(page);await motion.click();await expect(motion).toHaveAttribute('aria-label','Show card answer');await expect(page.getByRole('heading',{name:'Rate your recall'})).toBeVisible();
  await expect(motion).toHaveAttribute('aria-label','Show card front',{timeout:3500});expect((await snapshot(page)).events).toEqual(revealed.events);expect((await snapshot(page)).practiceEvents).toEqual(revealed.practiceEvents);
  await motion.focus();await motion.press('Space');await expect(motion).toHaveAttribute('aria-label','Show card answer');await motion.press('Enter');await expect(motion).toHaveAttribute('aria-label','Show card front');await page.waitForTimeout(2700);await expect(motion).toHaveAttribute('aria-label','Show card front');
  await motion.click();await expect(motion).toHaveAttribute('aria-label','Show card answer');await page.getByRole('button',{name:/3, Hesitant/}).click();await expect(page.getByRole('heading',{name:'Practice complete'})).toBeVisible({timeout:5000});expect((await snapshot(page)).practiceEvents.length).toBe(revealed.practiceEvents.length+1);
});

test('HR-STUDY-RESULTS structured support and Recall Peek reflow @ios-compact @ios-landscape',async({page})=>{
  await openApp(page);await installStructuredLegacyCase(page);await page.reload();await startFixturePractice(page);
  const motion=page.locator('.study-card-area .card-motion');await motion.click({position:{x:60,y:60}});await expect(motion).toHaveAttribute('aria-label','Show card front');
  const support=page.locator('.study-answer-support');await support.getByText('Card Details',{exact:true}).click();await expect(support.getByRole('table')).toBeVisible();
  const order=await Promise.all([page.locator('.study-card-area').boundingBox(),page.locator('.study-controls').boundingBox(),support.boundingBox()]);if(page.viewportSize()!.width<=580)expect(order[1]!.y).toBeGreaterThanOrEqual(order[0]!.y+order[0]!.height-1);expect(order[2]!.y).toBeGreaterThanOrEqual(Math.max(order[0]!.y+order[0]!.height,order[1]!.y+order[1]!.height)-1);
  await expectNoOverflow(page);await page.addStyleTag({content:'html{font-size:200%}'});await expectNoOverflow(page);await motion.focus();await motion.press('Enter');await expect(motion).toHaveAttribute('aria-label','Show card answer');await expect(page.getByRole('heading',{name:'Rate your recall'})).toBeVisible();
});
