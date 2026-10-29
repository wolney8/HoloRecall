import {expect,test,navigate,openApp,replaceSnapshot,revealCard,selectMaterial,snapshot} from './helpers';

test('Spaced Review repeats a failed learning card without changing the assigned Study preset',async({page})=>{
  await openApp(page);await selectMaterial(page,'Study mode','Spaced Review');await page.getByRole('button',{name:/Start studying/}).click();
  await expect(page.locator('.session-bar')).toContainText('Spaced Review');const before=await snapshot(page),cardId=before.session!.queue[0]!;
  await revealCard(page);await page.getByRole('button',{name:/1 Again Forgot/}).click();await expect.poll(async()=>(await snapshot(page)).events.length).toBe(1);
  const after=await snapshot(page);expect(after.session?.experienceMode).toBe('anki');expect(after.session?.queue.at(-1)).toBe(cardId);expect(after.session?.repetitionDue?.[cardId]).toBe(after.states[cardId]!.due);expect(after.decks.find(deck=>deck.id===after.cards.find(card=>card.id===cardId)!.deckId)?.studyPresetId).toBe(before.decks.find(deck=>deck.id===before.cards.find(card=>card.id===cardId)!.deckId)?.studyPresetId);
});

test('Confidence Study uses the genuine scheduled-review and collectible progression path',async({page})=>{
  await openApp(page);await selectMaterial(page,'Study mode','Confidence Study');await page.getByRole('button',{name:/Start studying/}).click();await expect(page.locator('.session-bar')).toContainText('Confidence Study');const cardId=(await snapshot(page)).session!.queue[0]!;
  await revealCard(page);await page.getByRole('button',{name:/2 Hard With effort/}).click();await expect.poll(async()=>(await snapshot(page)).events.length).toBe(1);
  const after=await snapshot(page);expect(after.session?.experienceMode).toBe('mastery');expect(after.practiceEvents).toEqual([]);expect(after.states[cardId]).toBeDefined();expect(after.session?.queue).not.toContain(cardId);
  const end=page.getByRole('button',{name:'End session',exact:true});await expect(end).toBeEnabled();await end.click();await expect(page.locator('.results-heading')).toContainText('Confidence Study');
});

test('Free Practice is visibly practice-only and never mutates FSRS or rewards',async({page})=>{
  await openApp(page);await selectMaterial(page,'Study mode','Free Practice');const before=await snapshot(page);await page.getByRole('button',{name:/Start studying/}).click();await expect(page.locator('.session-bar')).toContainText('Free Practice');
  await revealCard(page);await page.getByRole('button',{name:/5 Easy Effortless/}).click();await expect.poll(async()=>(await snapshot(page)).practiceEvents.length).toBe(1);
  const after=await snapshot(page);expect(after.session?.mode).toBe('practice');expect(after.session?.experienceMode).toBe('free-revision');expect(after.events).toEqual(before.events);expect(after.states).toEqual(before.states);expect(after.rewardEvents).toEqual(before.rewardEvents);
});

test('legacy generated labels use public terminology while custom Focus labels remain intact',async({page})=>{
  await openApp(page);await selectMaterial(page,'Study mode','Spaced Review');await page.getByRole('button',{name:/Start studying/}).click();
  const state=await snapshot(page),cardId=state.session!.queue[0]!;state.session!.label='Anki mode';
  await replaceSnapshot(page,state);await page.reload();await expect(page.locator('.session-bar')).toContainText('Spaced Review');await expect(page.locator('.session-bar')).not.toContainText('Anki mode');
  state.session={...state.session!,label:'Anki pronunciation intensive',focus:{mode:'scheduled',label:'Anki pronunciation intensive',criteria:{version:1,explicitCardIds:[cardId]},order:'due',limit:1}};
  await replaceSnapshot(page,state);await page.reload();await expect(page.locator('.session-bar')).toContainText('Anki pronunciation intensive');await expect(page.locator('.session-bar')).toContainText('Spaced Review');
});

test('mode selectors use one public vocabulary while Exchange retains Anki interoperability wording',async({page})=>{
  await openApp(page);const dashboard=page.getByRole('combobox',{name:'Study mode',exact:true});await dashboard.click();
  await expect(page.getByRole('option',{name:'Confidence Study',exact:true})).toBeVisible();await expect(page.getByRole('option',{name:'Spaced Review',exact:true})).toBeVisible();await expect(page.getByRole('option',{name:'Free Practice',exact:true})).toBeVisible();await page.keyboard.press('Escape');
  await navigate(page,'Decks');await expect(page.getByRole('combobox',{name:'Study mode',exact:true})).toHaveText(/Confidence Study/);
  await navigate(page,'Exchange');await expect(page.getByRole('button',{name:'Anki · Import Anki .apkg decks',exact:true})).toBeVisible();
});
