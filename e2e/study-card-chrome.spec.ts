import {expect,test,navigate,openApp,snapshot} from './helpers';
import type {State} from '../src/domain/models';

async function updateState(page:Parameters<typeof openApp>[0],mutate:(state:State)=>void):Promise<void>{
  await page.evaluate(async source=>{
    const database=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('holorecall-local-v1',2);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    const state=await new Promise<State>((resolve,reject)=>{const request=database.transaction('local-study','readonly').objectStore('local-study').get('snapshot');request.onsuccess=()=>resolve(request.result as State);request.onerror=()=>reject(request.error);});
    // The supplied function is test-owned and receives only the serialisable state.
    const transform=(0,eval)(`(${source})`) as (value:State)=>void;transform(state);
    await new Promise<void>((resolve,reject)=>{const transaction=database.transaction('local-study','readwrite');transaction.objectStore('local-study').put(state,'snapshot');transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);});
    database.close();
  },mutate.toString());
}

async function seedStudyClue(page:Parameters<typeof openApp>[0]):Promise<void>{
  await updateState(page,state=>{for(const card of state.cards){card.presentation={...(card.presentation??{}),title:'LEARNING CATEGORY',hint:'Look for the defining relationship.',artRole:card.image?'instructional':'hidden',studyArtPolicy:card.image?'image-first':'text-first'};card.revision+=1;}});
  await page.reload();
  await expect(page.getByRole('heading',{name:'Study dashboard',exact:true})).toBeVisible();
}

test('shared card chrome uses title, derived capabilities and accessible non-text face state',async({page})=>{
  await openApp(page);await navigate(page,'Decks');await page.getByRole('button',{name:/Create a card/}).click();
  const preview=page.locator('.author-preview');
  await page.getByLabel('Front text / library prompt').fill('What is being recalled?');await page.getByLabel('Back text / answer').fill('A concise answer');
  await expect(preview.locator('.card-chrome-title')).not.toBeEmpty();await expect(preview.locator('.card-chrome-title')).not.toHaveText(/^(?:Cloze|Image Occlusion)$/);await expect(preview.locator('.capability-list')).toHaveCount(0);
  await expect(preview).not.toContainText('RECALL');await expect(preview).not.toContainText('Front side');
  await expect(preview.getByRole('img',{name:'Recall face'})).toBeVisible();
  await page.getByLabel('Title / category · optional').fill('SCIENCE');await page.getByLabel('Clue / hint').fill('Think about cells.');
  await expect(preview.locator('.card-chrome-title')).toHaveText('SCIENCE');await expect(preview.getByLabel('Clue')).toBeVisible();
  await expect(page.locator('.clue-pennant')).toHaveCount(0);
  await page.getByRole('button',{name:'Answer',exact:true}).click();await expect(preview.getByRole('img',{name:'Answer face'})).toBeVisible();await expect(preview).not.toContainText('Answer side');
  await expect(preview.locator('.memory-card')).toHaveAttribute('data-face','answer');
});

test('Study clue waits for ten active Recall seconds and inspection pauses its remaining delay',async({page})=>{
  await openApp(page);await seedStudyClue(page);await page.getByRole('button',{name:/Start studying/}).click();
  const card=page.locator('.study-card-area hr-card'),expand=card.getByRole('button',{name:'Expand Recall image'}),flag=page.getByRole('button',{name:/Need a clue/});
  await expect(card.locator('.recall-hint')).toHaveCount(0);await expect(flag).toHaveCount(0);await page.waitForTimeout(3_500);
  await expand.click();await expect(page.getByRole('dialog')).toBeVisible();await page.waitForTimeout(3_000);await expect(flag).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button',{name:'Close'}).click();await page.waitForTimeout(2_500);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForTimeout(3_000);await expect(flag).toHaveCount(0);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(4_600);await expect(flag).toBeVisible();await expect(page.getByTestId('clue-announcement')).toHaveText('Clue available.');const flagBox=await flag.boundingBox(),expandBoxBefore=await expand.boundingBox();expect(flagBox!.y).toBeGreaterThan(expandBoxBefore!.y+expandBoxBefore!.height);
  const before=await snapshot(page);await flag.click();const sticker=card.getByRole('status').filter({hasText:'Look for the defining relationship.'});await expect(sticker).toBeVisible();await expect(card.locator('.memory-card')).toHaveAttribute('data-face','recall');await expect(card.getByRole('button',{name:'Remove clue'})).toBeFocused();
  await expect(sticker).toHaveAttribute('data-safe-zone','image-left');expect(await sticker.evaluate(node=>!!node.closest('.card-motion'))).toBe(true);const stickerBox=await sticker.boundingBox(),copyBox=await card.locator('.card-copy').boundingBox();expect(stickerBox!.y+stickerBox!.height).toBeLessThanOrEqual(copyBox!.y+2);
  const afterClue=await snapshot(page);expect(afterClue.events).toEqual(before.events);expect(afterClue.states).toEqual(before.states);expect(afterClue.rewardEvents).toEqual(before.rewardEvents);
  await card.getByRole('button',{name:'Remove clue'}).click();await expect(sticker).toHaveClass(/removing/);await expect(flag).toBeVisible();await expect(page.getByTestId('clue-announcement')).toHaveText('Clue removed. Clue available again.');await expect(flag).toBeFocused();await flag.click();await expect(sticker).toBeVisible();await card.getByRole('button',{name:'Remove clue'}).click();await expect(flag).toBeVisible();
  await page.getByRole('button',{name:'Check answer',exact:true}).click();await expect(page.getByRole('heading',{name:'Rate your recall'})).toBeVisible();await expect(flag).toHaveCount(0);await expect(page.locator('.clue-sticker')).toHaveCount(0);await expect(page.getByTestId('clue-announcement')).toHaveCount(0);
});

test('desktop guidance and Z inspect the settled face while Expand is unavailable during its owned flip',async({page})=>{
  await openApp(page);await seedStudyClue(page);await page.getByRole('button',{name:/Start studying/}).click();
  const card=page.locator('.study-card-area hr-card'),motion=card.locator('.card-motion'),expand=card.getByRole('button',{name:'Expand Recall image'});
  await expect(page.getByLabel('Keyboard shortcuts')).toContainText(/Space or Enter to flip and recall\.\s*Z to inspect image\./);
  const before=await snapshot(page);await page.keyboard.press('z');await expect(page.getByRole('dialog',{name:'Expanded Recall image'})).toBeVisible();expect((await snapshot(page)).session?.revealed).toBe(false);await page.keyboard.press('Escape');await expect(expand).toBeFocused();
  await page.evaluate(()=>{const audit:{disabled:boolean;hidden:string|null;tabindex:string|null;focus:string}[]=[];(window as unknown as {__motionAudit:typeof audit}).__motionAudit=audit;const button=document.querySelector<HTMLButtonElement>('.study-card-area .expand-image')!;new MutationObserver(()=>audit.push({disabled:button.disabled,hidden:button.getAttribute('aria-hidden'),tabindex:button.getAttribute('tabindex'),focus:(document.activeElement as HTMLElement)?.className||''})).observe(button,{attributes:true});document.addEventListener('focusin',()=>audit.push({disabled:button.disabled,hidden:button.getAttribute('aria-hidden'),tabindex:button.getAttribute('tabindex'),focus:(document.activeElement as HTMLElement)?.className||''}));});
  await page.getByRole('button',{name:'Check answer',exact:true}).evaluate(element=>(element as HTMLElement).click());
  const answerExpand=card.getByRole('button',{name:'Expand Answer image'});await expect(answerExpand).toBeEnabled();const audit=await page.evaluate(()=>(window as unknown as {__motionAudit:{disabled:boolean;hidden:string|null;tabindex:string|null;focus:string}[]}).__motionAudit);expect(audit.some(entry=>entry.disabled&&entry.hidden==='true'&&entry.tabindex==='-1')).toBe(true);expect(audit.some(entry=>entry.focus.includes('card-motion'))).toBe(true);await expect(page.getByLabel('Keyboard shortcuts')).toContainText(/1–5 rate your recall\.\s*Z to inspect image\./);
  const after=await snapshot(page);expect(after.events).toEqual(before.events);expect(after.rewardEvents).toEqual(before.rewardEvents);
});

test('compact coarse-pointer Study hides keyboard guidance but keeps clue touch target @ios-compact',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await openApp(page);await seedStudyClue(page);await page.addStyleTag({content:'html{font-size:200%;-webkit-text-size-adjust:200%;text-size-adjust:200%}'});await page.getByRole('button',{name:/Start studying/}).click();
  await expect(page.getByLabel('Keyboard shortcuts')).toHaveCount(0);
  await page.waitForTimeout(10_200);const flag=page.getByRole('button',{name:/Need a clue/});await expect(flag).toBeVisible();expect((await flag.boundingBox())!.height).toBeGreaterThanOrEqual(44);await expect(flag).not.toHaveCSS('animation-name','clue-pennant-unfurl');await flag.focus();await page.keyboard.press('Enter');const remove=page.getByRole('button',{name:'Remove clue'});await expect(remove).toBeFocused();await expect(page.locator('.clue-sticker')).not.toHaveCSS('animation-name','clue-sticker-place');await page.keyboard.press('Space');await expect(flag).toBeVisible();expect(Number.parseFloat(await page.locator('.study-card-area .face-signature').evaluate(element=>getComputedStyle(element).opacity))).toBeGreaterThan(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
});

test('Study renders a concise course context without mutating the hierarchy',async({page})=>{
  await openApp(page);await updateState(page,state=>{const leaf=state.decks.find(deck=>deck.id===state.cards[0]!.deckId)!;leaf.name='05 Gender, number & definite articles';leaf.parentId='lesson-2';state.decks.push({id:'lesson-2',name:'Italian - Lesson 2 - Alphabet, C-G Sounds & Articles - 29 September 2026',description:'',suspended:false});for(const card of state.cards)card.deckId=leaf.id;});await page.reload();await page.getByRole('button',{name:/Start studying/}).click();await expect(page.getByTestId('study-context-title')).toHaveText('Lesson 2 · Gender, number & definite articles');const state=await snapshot(page);expect(state.decks.find(deck=>deck.id==='lesson-2')?.name).toBe('Italian - Lesson 2 - Alphabet, C-G Sounds & Articles - 29 September 2026');
});
