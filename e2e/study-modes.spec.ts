import {expect,test,openApp,revealCard,selectMaterial,snapshot} from './helpers';

test('Anki mode repeats a failed learning card without changing the assigned Study preset',async({page})=>{
  await openApp(page);await selectMaterial(page,'Study mode','Anki mode');await page.getByRole('button',{name:/Start studying/}).click();
  await expect(page.locator('.session-bar')).toContainText('Anki mode');const before=await snapshot(page),cardId=before.session!.queue[0]!;
  await revealCard(page);await page.getByRole('button',{name:/1 Again Forgot/}).click();await expect.poll(async()=>(await snapshot(page)).events.length).toBe(1);
  const after=await snapshot(page);expect(after.session?.experienceMode).toBe('anki');expect(after.session?.queue.at(-1)).toBe(cardId);expect(after.session?.repetitionDue?.[cardId]).toBe(after.states[cardId]!.due);expect(after.decks.find(deck=>deck.id===after.cards.find(card=>card.id===cardId)!.deckId)?.studyPresetId).toBe(before.decks.find(deck=>deck.id===before.cards.find(card=>card.id===cardId)!.deckId)?.studyPresetId);
});

test('Mastery mode uses the genuine scheduled-review and collectible progression path',async({page})=>{
  await openApp(page);await selectMaterial(page,'Study mode','Mastery mode');await page.getByRole('button',{name:/Start studying/}).click();await expect(page.locator('.session-bar')).toContainText('Mastery mode');const cardId=(await snapshot(page)).session!.queue[0]!;
  await revealCard(page);await page.getByRole('button',{name:/2 Hard With effort/}).click();await expect.poll(async()=>(await snapshot(page)).events.length).toBe(1);
  const after=await snapshot(page);expect(after.session?.experienceMode).toBe('mastery');expect(after.practiceEvents).toEqual([]);expect(after.states[cardId]).toBeDefined();expect(after.session?.queue).not.toContain(cardId);
});

test('Free Revision is visibly practice-only and never mutates FSRS or rewards',async({page})=>{
  await openApp(page);await selectMaterial(page,'Study mode','Free revision');const before=await snapshot(page);await page.getByRole('button',{name:/Start studying/}).click();await expect(page.locator('.session-bar')).toContainText('Free revision');
  await revealCard(page);await page.getByRole('button',{name:/5 Easy Effortless/}).click();await expect.poll(async()=>(await snapshot(page)).practiceEvents.length).toBe(1);
  const after=await snapshot(page);expect(after.session?.mode).toBe('practice');expect(after.session?.experienceMode).toBe('free-revision');expect(after.events).toEqual(before.events);expect(after.states).toEqual(before.states);expect(after.rewardEvents).toEqual(before.rewardEvents);
});
