import { expect, test, openApp, snapshot } from './helpers';
import initSqlJs from 'sql.js';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';

async function warningApkg():Promise<Buffer>{
  const SQL=await initSqlJs(),db=new SQL.Database();
  db.run('create table col (models text, decks text)');db.run('create table notes (id integer, guid text, mid integer, tags text, flds text)');db.run('create table cards (id integer, nid integer, did integer, ord integer)');
  const models={1:{name:'TTS reference',type:0,flds:[{name:'Front'},{name:'Back'}],tmpls:[{name:'Spoken card',qfmt:'{{Front}} {{tts en_US voices=Apple_Samantha:Front}} <a href="https://www.treccani.it/vocabolario/ciao">Treccani</a>',afmt:'{{Back}} [anki:tts lang=en_US]{{Back}}[/anki:tts]'}]},2:{name:'Remote image',type:0,flds:[{name:'Front'},{name:'Back'}],tmpls:[{name:'Remote card',qfmt:'{{Front}}<img src="https://example.test/reference.png">',afmt:'{{Back}}'}]},3:{name:'Remote-only prompt',type:0,flds:[{name:'Back'}],tmpls:[{name:'Remote only',qfmt:'<img src="https://example.test/only.png">',afmt:'{{Back}}'}]}};
  db.run('insert into col values (?,?)',[JSON.stringify(models),JSON.stringify({10:{name:'Italian lesson::01 Greetings'}})]);
  db.run('insert into notes values (?,?,?,?,?)',[100,'tts-browser',1,'','ciao\x1fhello']);db.run('insert into cards values (?,?,?,?)',[200,100,10,0]);
  db.run('insert into notes values (?,?,?,?,?)',[101,'remote-browser',2,'','salve\x1fgreetings']);db.run('insert into cards values (?,?,?,?)',[201,101,10,0]);
  db.run('insert into notes values (?,?,?,?,?)',[102,'remote-only-browser',3,'','unavailable image']);db.run('insert into cards values (?,?,?,?)',[202,102,10,0]);
  const zip=new JSZip();zip.file('collection.anki2',db.export());zip.file('media','{}');db.close();return Buffer.from(await zip.generateAsync({type:'uint8array'}));
}

async function languageMetadataApkg(answer='Mi chiamo'):Promise<Buffer>{
  const SQL=await initSqlJs(),db=new SQL.Database();
  db.run('create table col (models text, decks text)');db.run('create table notes (id integer, guid text, mid integer, tags text, flds text)');db.run('create table cards (id integer, nid integer, did integer, ord integer)');
  const models={1:{name:'Language-labelled prompt',type:0,flds:[{name:'Prompt'},{name:'Language'},{name:'Pronunciation'},{name:'Italian'}],tmpls:[{name:'Italian answer',qfmt:'{{Prompt}}',afmt:'{{FrontSide}}<hr>{{Italian}}<div>{{Pronunciation}}</div>'}]}};
  db.run('insert into col values (?,?)',[JSON.stringify(models),JSON.stringify({10:{name:'Italian Lesson::02 Introductions'}})]);
  db.run('insert into notes values (?,?,?,?,?)',[100,'introductions-browser-guid',1,'introduction',`Introduce yourself\x1fit\x1fmee KYAH-moh\x1f${answer}`]);db.run('insert into cards values (?,?,?,?)',[200,100,10,0]);
  const zip=new JSZip();zip.file('collection.anki2',db.export());zip.file('media','{}');db.close();return Buffer.from(await zip.generateAsync({type:'uint8array'}));
}

async function importOfficial(page:Parameters<typeof openApp>[0]):Promise<void>{
  await page.getByRole('button',{name:'Import / export'}).click();
  await page.locator('#anki-import').setInputFiles({name:'anki-26.9.3-legacy.apkg',mimeType:'application/zip',buffer:await readFile('e2e/fixtures/anki-26.9.3-legacy.apkg')});
  await expect(page.getByText('legacy-anki21')).toBeVisible();
  await page.getByRole('button',{name:'Import 7 supported cards'}).click();
  await expect(page.getByText(/Imported 7 new and 0 changed Anki cards/)).toBeVisible();
}

test('HR-BUG-ANKI-01 classifies TTS simplification separately from remote media and safe links',async({page},testInfo)=>{
  const requests:string[]=[];page.on('request',request=>requests.push(request.url()));
  await openApp(page);await page.getByRole('button',{name:'Import / export'}).click();
  await page.locator('#anki-import').setInputFiles({name:'warnings.apkg',mimeType:'application/zip',buffer:await warningApkg()});
  await expect(page.locator('.conversion-counts')).toContainText('0Import normally');
  await expect(page.locator('.conversion-counts')).toContainText('2With simplifications');
  await expect(page.locator('.conversion-counts')).toContainText('1Require exclusion');
  await expect(page.getByText('Excluded or unsupported content')).toHaveCount(0);
  await expect(page.getByLabel(/exclude only the 1 cards/)).toBeVisible();
  await page.getByText(/Anki presentation simplified/).click();
  await expect(page.getByText(/TTS, answer input or advanced field filters/)).toBeVisible();
  await page.getByText(/Content or media omitted/).click();
  await expect(page.getByText('https://example.test/reference.png')).toBeVisible();
  await expect(page.getByText(/treccani\.it/)).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Import 2 supported cards'})).toBeDisabled();await page.getByLabel(/exclude only the 1 cards/).check();await expect(page.getByRole('button',{name:'Import 2 supported cards'})).toBeEnabled();
  await page.getByRole('button',{name:'Import 2 supported cards'}).click();
  const data=await snapshot(page),spoken=data.cards.find(card=>card.id.includes('tts-browser'))!;
  expect(spoken.front).toContain('ciao');expect(spoken.front).toContain('Treccani');expect(spoken.front).not.toMatch(/{{|anki:tts/);expect(spoken.answer).toContain('hello');
  expect(requests.filter(url=>url.includes('treccani.it')||url.includes('example.test'))).toEqual([]);
  await page.screenshot({path:testInfo.outputPath('classified-import-preview.png'),fullPage:true});
});

test('HR-BUG-ANKI-02 imported parents are aggregate journeys with scoped subdecks',async({page},testInfo)=>{
  await openApp(page);await importOfficial(page);await page.getByRole('button',{name:'Decks',exact:true}).click();
  const parent=page.locator('.deck-journey').filter({has:page.getByRole('heading',{name:'HoloRecall Fixture',exact:true})});
  await expect(parent).toContainText('7 cards · 7 ready · 1 subdecks');
  await expect(parent.getByRole('heading',{name:'Italian',exact:true})).toHaveCount(0);
  await parent.getByRole('button',{name:'Show subdecks'}).click();
  await expect(parent.getByRole('heading',{name:'Italian',exact:true})).toBeVisible();
  await expect(parent.locator('.subdeck-row')).toContainText('7 cards · 7 ready');
  const data=await snapshot(page),root=data.decks.find(deck=>deck.name==='HoloRecall Fixture')!,child=data.decks.find(deck=>deck.name==='Italian')!;
  expect(child.parentId).toBe(root.id);expect(data.cards.filter(card=>card.id.startsWith('anki-')).every(card=>card.deckId===child.id)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('imported-deck-hierarchy.png'),fullPage:true});
  await parent.getByRole('button',{name:'Study journey'}).click();expect((await snapshot(page)).session?.queue).toHaveLength(7);
  await page.getByRole('button',{name:'End session'}).click();await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Decks',exact:true}).click();
  await parent.getByRole('button',{name:'Study subdeck'}).click();expect((await snapshot(page)).session?.queue).toHaveLength(7);
});

test('HR-BUG-STUDY-01 consecutive imported cards settle visible after every deal',async({page},testInfo)=>{
  await openApp(page);await importOfficial(page);await page.getByRole('button',{name:'Decks',exact:true}).click();
  const parent=page.locator('.deck-journey').filter({has:page.getByRole('heading',{name:'HoloRecall Fixture',exact:true})});await parent.getByRole('button',{name:'Study journey'}).click();
  let previousQueue=(await snapshot(page)).session!.queue;
  for(let review=0;review<2;review++){
    await page.getByRole('button',{name:/Reveal answer/}).click();await page.getByRole('button',{name:/4 Good Confident/}).click();
    await expect(page.locator('.study-layout')).toHaveAttribute('data-study-transition','feedback');
    await expect(page.locator('.study-layout')).toHaveAttribute('data-study-transition','idle',{timeout:4_000});
    const settled=await page.getByTestId('study-deck-stage').evaluate(stage=>{const style=getComputedStyle(stage);return{opacity:style.opacity,visibility:style.visibility,display:style.display,transform:style.transform,card:!!stage.querySelector('.memory-card'),stale:stage.getAnimations().some(animation=>animation.playState==='finished'&&animation.effect?.getTiming().fill==='forwards')};});
    expect(settled).toEqual({opacity:'1',visibility:'visible',display:'block',transform:'none',card:true,stale:false});
    const state=await snapshot(page),nextQueue=state.session!.queue;expect(nextQueue.length).toBeLessThan(previousQueue.length);expect(nextQueue).not.toContain(previousQueue[0]);expect(nextQueue[0]).not.toBe(previousQueue[0]);expect(state.events).toHaveLength(review+1);previousQueue=nextQueue;
  }
  await page.screenshot({path:testInfo.outputPath('second-imported-card-settled.png'),fullPage:true});
  const beforeReimport=await snapshot(page);await page.getByRole('button',{name:'End session'}).click();await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Decks',exact:true}).click();
  const chooserPromise=page.waitForEvent('filechooser');await parent.getByRole('button',{name:'Update from Anki package'}).click();const chooser=await chooserPromise;
  await chooser.setFiles({name:'anki-26.9.3-legacy.apkg',mimeType:'application/zip',buffer:await readFile('e2e/fixtures/anki-26.9.3-legacy.apkg')});
  await expect(page.locator('.update-summary')).toContainText('7Unchanged');
  await page.getByRole('button',{name:'Apply update 0 supported cards'}).click();const afterReimport=await snapshot(page);
  expect(afterReimport.decks.map(deck=>[deck.id,deck.parentId])).toEqual(beforeReimport.decks.map(deck=>[deck.id,deck.parentId]));expect(afterReimport.cards.map(card=>[card.id,card.rarity])).toEqual(beforeReimport.cards.map(card=>[card.id,card.rarity]));expect(afterReimport.states).toEqual(beforeReimport.states);expect(afterReimport.events).toEqual(beforeReimport.events);expect(afterReimport.rewardEvents).toEqual(beforeReimport.rewardEvents);
});

test('HR-BUG-ANKI-05/06 contextual update repairs structured answers without touching learner state',async({page})=>{
  await openApp(page);await page.getByRole('button',{name:'Import / export'}).click();
  await page.locator('#anki-import').setInputFiles({name:'introductions.apkg',mimeType:'application/zip',buffer:await languageMetadataApkg()});
  await expect(page.getByText('Mi chiamo',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Import 1 supported cards'}).click();
  await page.getByRole('button',{name:'Decks',exact:true}).click();
  const parent=page.locator('.deck-journey').filter({has:page.getByRole('heading',{name:'Italian Lesson',exact:true})});
  const before=await snapshot(page),beforeCard=before.cards.find(card=>card.id.includes('introductions-browser-guid'))!;
  expect(beforeCard).toMatchObject({answer:'Mi chiamo',pronunciation:'mee KYAH-moh'});
  const chooserPromise=page.waitForEvent('filechooser');await parent.getByRole('button',{name:'Update from Anki package'}).click();const chooser=await chooserPromise;
  await chooser.setFiles({name:'introductions-updated.apkg',mimeType:'application/zip',buffer:await languageMetadataApkg('Mi presento')});
  await expect(page.getByRole('heading',{name:'Update from Anki package'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Download'})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Import content'})).toHaveCount(0);
  const comparison=page.getByLabel('Representative before and after card preview');
  await expect(comparison).toContainText('Mi chiamo');await expect(comparison).toContainText('Mi presento');await expect(comparison).toContainText('mee KYAH-moh');
  await page.getByRole('button',{name:'Apply update 1 supported cards'}).click();
  await expect(page.getByRole('heading',{name:'Decks',exact:true})).toBeVisible();
  const after=await snapshot(page),afterCard=after.cards.find(card=>card.id===beforeCard.id)!;
  expect(afterCard).toMatchObject({answer:'Mi presento',pronunciation:'mee KYAH-moh'});expect(afterCard.answer).not.toBe('it');
  expect(after.states[beforeCard.id]).toEqual(before.states[beforeCard.id]);expect(after.events).toEqual(before.events);expect(after.rewardEvents).toEqual(before.rewardEvents);
});

test('HR-BUG-STUDY-01 background interruption settles the accepted imported review visibly once',async({page})=>{
  await openApp(page);await importOfficial(page);await page.getByRole('button',{name:'Decks',exact:true}).click();
  const parent=page.locator('.deck-journey').filter({has:page.getByRole('heading',{name:'HoloRecall Fixture',exact:true})});await parent.getByRole('button',{name:'Study journey'}).click();
  await page.getByRole('button',{name:/Reveal answer/}).click();await page.getByRole('button',{name:/4 Good Confident/}).click();await expect(page.locator('.confidence-feedback')).toBeVisible();
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow')));
  await expect(page.locator('.study-layout')).toHaveAttribute('data-study-transition','idle');
  const settled=await page.getByTestId('study-deck-stage').evaluate(stage=>{const style=getComputedStyle(stage);return{opacity:style.opacity,transform:style.transform,card:!!stage.querySelector('.memory-card'),animations:stage.getAnimations().length};});expect(settled).toEqual({opacity:'1',transform:'none',card:true,animations:0});expect((await snapshot(page)).events).toHaveLength(1);
});
