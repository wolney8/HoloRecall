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
  await page.getByRole('dialog').getByRole('button',{name:'Close'}).click();await page.waitForTimeout(2_500);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForTimeout(3_000);await expect(flag).toHaveCount(0);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(4_600);await expect(flag).toBeVisible();await expect(page.getByTestId('clue-announcement')).toHaveText('Clue available.');const flagBox=await flag.boundingBox(),expandBoxBefore=await expand.boundingBox();expect(flagBox!.y).toBeGreaterThan(expandBoxBefore!.y+expandBoxBefore!.height);const pennantTypography=await flag.evaluate(element=>({app:getComputedStyle(document.body).fontFamily,pennant:getComputedStyle(element).fontFamily}));expect(pennantTypography.pennant).toBe(pennantTypography.app);
  const before=await snapshot(page);await flag.click();const sticker=card.getByRole('button',{name:/^Clue: Look for the defining relationship\. Remove clue\.$/});await expect(sticker).toBeVisible();await expect(card.locator('.memory-card')).toHaveAttribute('data-face','recall');await expect(sticker).toBeFocused();await expect(card.locator('.clue-fold')).toHaveCount(0);
  await expect(sticker).toHaveAttribute('data-safe-zone','image-left');expect(await sticker.evaluate(node=>!!node.closest('.card-motion'))).toBe(true);const stickerBox=await sticker.boundingBox(),copyBox=await card.locator('.card-copy').boundingBox(),cardBox=await card.locator('.memory-card').boundingBox();expect(stickerBox!.y+stickerBox!.height).toBeLessThanOrEqual(copyBox!.y+2);expect(stickerBox!.width).toBeLessThan(cardBox!.width*.7);
  const material=await sticker.evaluate(element=>{const sheet=element.querySelector<HTMLElement>('.clue-sheet')!,peel=element.querySelector<HTMLElement>('.clue-peel')!;return{app:getComputedStyle(document.body).fontFamily,sticker:getComputedStyle(element.querySelector('.clue-sticker-text')!).fontFamily,overflow:getComputedStyle(element).overflowY,background:getComputedStyle(element).backgroundColor,sheetClip:getComputedStyle(sheet).clipPath,peelTransform:getComputedStyle(peel).transform,peelShadow:getComputedStyle(peel).filter};});expect(material.sticker).toBe(material.app);expect(material.overflow).toBe('visible');expect(material.background).toBe('rgba(0, 0, 0, 0)');expect(material.sheetClip).not.toBe('none');expect(material.peelTransform).not.toBe('none');expect(material.peelShadow).toContain('drop-shadow');
  const afterClue=await snapshot(page);expect(afterClue.events).toEqual(before.events);expect(afterClue.states).toEqual(before.states);expect(afterClue.rewardEvents).toEqual(before.rewardEvents);
  const peel=await sticker.evaluate(element=>new Promise<{removing:boolean;bodyAnimation:string;sheetAnimation:string;peelAnimation:string;pennantPresent:boolean}>(resolve=>{(element as HTMLButtonElement).click();requestAnimationFrame(()=>resolve({removing:element.classList.contains('removing'),bodyAnimation:getComputedStyle(element).animationName,sheetAnimation:getComputedStyle(element.querySelector('.clue-sheet')!).animationName,peelAnimation:getComputedStyle(element.querySelector('.clue-peel')!).animationName,pennantPresent:!!element.closest('hr-card')?.querySelector('.clue-pennant')}));}));expect(peel.removing).toBe(true);expect(peel.pennantPresent).toBe(false);expect(peel.bodyAnimation).toMatch(/clue-sticker-peel$/);expect(peel.sheetAnimation).toMatch(/clue-sheet-release$/);expect(peel.peelAnimation).toMatch(/clue-fold-lift$/);await expect(flag).toBeVisible();await expect(page.getByTestId('clue-announcement')).toHaveText('Clue removed. Clue available again.');await expect(flag).toBeFocused();await flag.click();await expect(sticker).toBeVisible();await sticker.locator('.clue-sticker-text').click();await expect(flag).toBeVisible();await flag.click();await expect(sticker).toBeFocused();await page.keyboard.press('Enter');await expect(flag).toBeVisible();
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

test('coarse-pointer Study hides keyboard guidance but keeps clue touch target @ios-compact @ios-large @ios-landscape',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await openApp(page);await seedStudyClue(page);await page.addStyleTag({content:'html{font-size:200%;-webkit-text-size-adjust:200%;text-size-adjust:200%}'});await page.getByRole('button',{name:/Start studying/}).click();
  await expect(page.getByLabel('Keyboard shortcuts')).toHaveCount(0);
  await page.waitForTimeout(10_200);const flag=page.getByRole('button',{name:/Need a clue/});await expect(flag).toBeVisible();expect((await flag.boundingBox())!.height).toBeGreaterThanOrEqual(44);await expect(flag).not.toHaveCSS('animation-name','clue-pennant-unfurl');await flag.focus();await page.keyboard.press('Enter');const sticker=page.getByRole('button',{name:/^Clue: .* Remove clue\.$/});await expect(sticker).toBeFocused();await expect(sticker).not.toHaveCSS('animation-name','clue-sticker-place');await page.keyboard.press('Space');await expect(flag).toBeVisible();expect(Number.parseFloat(await page.locator('.study-card-area .face-signature').evaluate(element=>getComputedStyle(element).opacity))).toBeGreaterThan(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
});

test('long clue grows as readable card paper without nested scrolling',async({page})=>{
  await page.setViewportSize({width:1024,height:768});await openApp(page);await seedStudyClue(page);await updateState(page,state=>{const clue='Use the visible structure to compare the defining relationship, the surrounding context, and the most specific feature that separates this example from the alternatives. Read the whole prompt once more before choosing, then peel this note away to inspect the underlying card.';for(const card of state.cards){card.presentation={...(card.presentation??{}),hint:clue};card.revision+=1;}});await page.reload();await page.addStyleTag({content:'html{font-size:200%;-webkit-text-size-adjust:200%;text-size-adjust:200%}'});await page.getByRole('button',{name:/Start studying/}).click();await page.waitForTimeout(10_200);await page.getByRole('button',{name:/Need a clue/}).click();const sticker=page.locator('.study-card-area .clue-sticker');await expect(sticker).toHaveClass(/extended/);const fit=await sticker.evaluate(element=>({overflowX:getComputedStyle(element).overflowX,overflowY:getComputedStyle(element).overflowY,clientHeight:element.clientHeight,scrollHeight:element.scrollHeight,text:(element.textContent??'').trim()}));expect(fit.overflowX).toBe('visible');expect(fit.overflowY).toBe('visible');expect(fit.scrollHeight).toBeLessThanOrEqual(fit.clientHeight+1);expect(fit.text).toContain('peel this note away');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
});

test('Study renders a concise course context without mutating the hierarchy',async({page})=>{
  const source='Italian - Lesson 2 - Alphabet, C-G Sounds & Articles - 29 September 2026\n05 Gender, number & definite articles';await openApp(page);await updateState(page,state=>{const leaf=state.decks.find(deck=>deck.id===state.cards[0]!.deckId)!;leaf.name='Italian - Lesson 2 - Alphabet, C-G Sounds & Articles - 29 September 2026\n05 Gender, number & definite articles';for(const card of state.cards)card.deckId=leaf.id;});await page.reload();await page.getByRole('button',{name:/Start studying/}).click();await expect(page.getByTestId('study-context-title')).toHaveText('Lesson 2 · Gender, number & definite articles');const state=await snapshot(page);expect(state.decks.find(deck=>deck.id===state.cards[0]!.deckId)?.name).toBe(source);
});
