import { expect, expectNoOverflow, test, navigate, openApp, revealCard, snapshot } from './helpers';
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

async function languageMetadataApkg(answer='Mi chiamo',multiple=false):Promise<Buffer>{
  const SQL=await initSqlJs(),db=new SQL.Database();
  db.run('create table col (models text, decks text)');db.run('create table notes (id integer, guid text, mid integer, tags text, flds text)');db.run('create table cards (id integer, nid integer, did integer, ord integer)');
  const models={1:{name:'Language-labelled prompt',type:0,flds:[{name:'Prompt'},{name:'Language'},{name:'Pronunciation'},{name:'Italian'},{name:'Meaning'},{name:'Examples'}],tmpls:[{name:'Italian answer',qfmt:'{{Prompt}}',afmt:'{{FrontSide}}<hr>{{Italian}}<div>{{Pronunciation}}</div><div>{{Meaning}}</div><div>{{Examples}}</div>'}]}};
  db.run('insert into col values (?,?)',[JSON.stringify(models),JSON.stringify({10:{name:'Italian Lesson::02 Introductions'}})]);
  db.run('insert into notes values (?,?,?,?,?)',[100,'introductions-browser-guid',1,'introduction',`Introduce yourself\x1fit\x1fmee KYAH-moh\x1f${answer}\x1fMy name is\x1fMi chiamo Laura.`]);db.run('insert into cards values (?,?,?,?)',[200,100,10,0]);
  if(multiple){db.run('insert into notes values (?,?,?,?,?)',[101,'greetings-browser-guid',1,'greeting','Say good evening\x1fit\x1fbwoh-nah-SEH-rah\x1fBuonasera!\x1fGood evening\x1fBuonasera, Marco!']);db.run('insert into cards values (?,?,?,?)',[201,101,10,0]);}
  const zip=new JSZip();zip.file('collection.anki2',db.export());zip.file('media','{}');db.close();return Buffer.from(await zip.generateAsync({type:'uint8array'}));
}

async function importOfficial(page:Parameters<typeof openApp>[0]):Promise<void>{
  await navigate(page,'Exchange');
  await page.getByLabel('Anki · Import Anki .apkg decks').click();
  await page.locator('#anki-import').setInputFiles({name:'anki-26.9.3-legacy.apkg',mimeType:'application/zip',buffer:await readFile('e2e/fixtures/anki-26.9.3-legacy.apkg')});
  await expect(page.getByRole('heading',{name:'anki-26.9.3-legacy',exact:true})).toBeVisible();
  await expect(page.getByText('Cloze',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Import 7 supported cards'}).click();
  await expect(page.getByText(/Imported 7 new and 0 changed Anki cards/)).toBeVisible();
}

test('HR-BUG-ANKI-01 classifies TTS simplification separately from remote media and safe links',async({page},testInfo)=>{
  const requests:string[]=[];page.on('request',request=>requests.push(request.url()));
  await openApp(page);await navigate(page,'Exchange');
  await page.getByLabel('Anki · Import Anki .apkg decks').click();
  await page.locator('#anki-import').setInputFiles({name:'warnings.apkg',mimeType:'application/zip',buffer:await warningApkg()});
  await page.getByRole('button',{name:/Advanced details/}).click();
  await expect(page.locator('.conversion-counts')).toContainText('0Native conversion');
  await expect(page.locator('.conversion-counts')).toContainText('2Safe simplification');
  await expect(page.locator('.conversion-counts')).toContainText('1Excluded');
  await expect(page.getByText('Excluded or unsupported content')).toHaveCount(0);
  await expect(page.getByRole('checkbox',{name:/Import 1 ready card/})).toBeVisible();
  await expect(page.getByRole('region',{name:'Anki conversion review'})).toContainText('Source media is missing from the projected card.');
  await expect(page.getByText(/TTS, answer input or advanced field filters/)).toBeVisible();
  await expect(page.getByText(/Remote media, scripts and fonts are not fetched/i)).toBeVisible();
  await expect(page.getByText(/treccani\.it/)).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Import 2 supported cards'})).toBeDisabled();await page.getByRole('button',{name:'Approve this template conversion'}).click();await page.getByRole('checkbox',{name:/Import 2 ready cards/}).check();await expect(page.getByRole('button',{name:'Import 2 supported cards'})).toBeEnabled();
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
  await parent.getByRole('button',{name:'Show 1 subdecks'}).click();
  await expect(parent.getByRole('heading',{name:'Italian',exact:true})).toBeVisible();
  await expect(parent.locator('.subdeck-row')).toContainText('7 cards · 7 ready');
  const data=await snapshot(page),root=data.decks.find(deck=>deck.name==='HoloRecall Fixture')!,child=data.decks.find(deck=>deck.name==='Italian')!;
  expect(child.parentId).toBe(root.id);expect(data.cards.filter(card=>card.id.startsWith('anki-')).every(card=>card.deckId===child.id)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('imported-deck-hierarchy.png'),fullPage:true});
  await parent.getByRole('button',{name:'Study',exact:true}).first().click();expect((await snapshot(page)).session?.queue).toHaveLength(7);
  await page.getByRole('button',{name:'End session'}).click();await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Decks',exact:true}).click();
  await parent.locator('.subdeck-row').getByRole('button',{name:'Study',exact:true}).click();expect((await snapshot(page)).session?.queue).toHaveLength(7);
});

test('HR-BUG-STUDY-01 consecutive imported cards settle visible after every deal',async({page},testInfo)=>{
  await openApp(page);await importOfficial(page);await page.getByRole('button',{name:'Decks',exact:true}).click();
  const parent=page.locator('.deck-journey').filter({has:page.getByRole('heading',{name:'HoloRecall Fixture',exact:true})});await parent.getByRole('button',{name:'Study',exact:true}).first().click();
  let previousQueue=(await snapshot(page)).session!.queue;
  for(let review=0;review<2;review++){
    await page.getByRole('button',{name:/Check answer/}).click();await page.getByRole('button',{name:/4 Good Confident/}).click();
    await expect(page.locator('.study-layout')).toHaveAttribute('data-study-transition','feedback');
    await expect(page.locator('.study-layout')).toHaveAttribute('data-study-transition','idle',{timeout:4_000});
    const settled=await page.getByTestId('study-deck-stage').evaluate(stage=>{const style=getComputedStyle(stage);return{opacity:style.opacity,visibility:style.visibility,display:style.display,transform:style.transform,card:!!stage.querySelector('.memory-card'),stale:stage.getAnimations().some(animation=>animation.playState==='finished'&&animation.effect?.getTiming().fill==='forwards')};});
    expect(settled).toEqual({opacity:'1',visibility:'visible',display:'block',transform:'none',card:true,stale:false});
    const state=await snapshot(page),nextQueue=state.session!.queue;expect(nextQueue.length).toBeLessThan(previousQueue.length);expect(nextQueue).not.toContain(previousQueue[0]);expect(nextQueue[0]).not.toBe(previousQueue[0]);expect(state.events).toHaveLength(review+1);previousQueue=nextQueue;
  }
  await page.screenshot({path:testInfo.outputPath('second-imported-card-settled.png'),fullPage:true});
  const beforeReimport=await snapshot(page);await page.getByRole('button',{name:'End session'}).click();await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Decks',exact:true}).click();
  await parent.getByRole('button',{name:'Manage Anki source'}).click();const chooserPromise=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Update from Anki'}).click();const chooser=await chooserPromise;
  await chooser.setFiles({name:'anki-26.9.3-legacy.apkg',mimeType:'application/zip',buffer:await readFile('e2e/fixtures/anki-26.9.3-legacy.apkg')});
  await expect(page.locator('.update-summary')).toContainText('7Unchanged');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();const afterReimport=await snapshot(page);
  expect(afterReimport.decks.map(deck=>[deck.id,deck.parentId])).toEqual(beforeReimport.decks.map(deck=>[deck.id,deck.parentId]));expect(afterReimport.cards.map(card=>[card.id,card.rarity])).toEqual(beforeReimport.cards.map(card=>[card.id,card.rarity]));expect(afterReimport.states).toEqual(beforeReimport.states);expect(afterReimport.events).toEqual(beforeReimport.events);expect(afterReimport.rewardEvents).toEqual(beforeReimport.rewardEvents);
});

test('HR-BUG-ANKI-05/06 contextual update repairs structured answers without touching learner state',async({page})=>{
  await openApp(page);await navigate(page,'Exchange');
  await page.getByLabel('Anki · Import Anki .apkg decks').click();
  await page.locator('#anki-import').setInputFiles({name:'introductions.apkg',mimeType:'application/zip',buffer:await languageMetadataApkg()});
  await expect(page.getByText('Mi chiamo',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Import 1 supported cards'}).click();
  await page.getByRole('button',{name:'Decks',exact:true}).click();
  const parent=page.locator('.deck-journey').filter({has:page.getByRole('heading',{name:'Italian Lesson',exact:true})});
  const before=await snapshot(page),beforeCard=before.cards.find(card=>card.id.includes('introductions-browser-guid'))!;
  expect(beforeCard).toMatchObject({answer:'Mi chiamo',pronunciation:'mee KYAH-moh'});
  await parent.getByRole('button',{name:'Manage Anki source'}).click();const chooserPromise=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Update from Anki'}).click();const chooser=await chooserPromise;
  await chooser.setFiles({name:'introductions-updated.apkg',mimeType:'application/zip',buffer:await languageMetadataApkg('Mi presento')});
  await expect(page.getByRole('heading',{name:'Update from Anki'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Download'})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Import content'})).toHaveCount(0);
  const comparison=page.getByLabel('Representative before and after card preview');
  await expect(comparison).toContainText('Mi chiamo');await expect(comparison).toContainText('Mi presento');await expect(comparison).toContainText('mee KYAH-moh');
  await page.getByRole('button',{name:'Apply update 1 supported cards'}).click();
  await expect(page.locator('.completion-panel')).toContainText('UPDATE COMPLETE');
  await expect(page.getByRole('button',{name:'Review imported deck'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Search cards'})).toBeVisible();
  await page.getByRole('button',{name:'Go to deck'}).click();
  await expect(page.getByRole('heading',{name:'Decks',exact:true})).toBeVisible();
  const after=await snapshot(page),afterCard=after.cards.find(card=>card.id===beforeCard.id)!;
  expect(afterCard).toMatchObject({answer:'Mi presento',pronunciation:'mee KYAH-moh'});expect(afterCard.answer).not.toBe('it');
  expect(after.states[beforeCard.id]).toEqual(before.states[beforeCard.id]);expect(after.events).toEqual(before.events);expect(after.rewardEvents).toEqual(before.rewardEvents);
});

test('HR-BUG-ANKI-20–25 repair preview and apply share structured content without false conflicts',async({page},testInfo)=>{
  const packageBytes=await languageMetadataApkg('Mi chiamo',true);await openApp(page);await navigate(page,'Exchange');
  await page.getByLabel('Anki · Import Anki .apkg decks').click();
  await page.locator('#anki-import').setInputFiles({name:'introductions.apkg',mimeType:'application/zip',buffer:packageBytes});await page.getByRole('button',{name:'Import 2 supported cards'}).click();
  await page.evaluate(()=>new Promise<void>((resolve,reject)=>{const hash=(value:unknown)=>{let result=2166136261;for(const char of JSON.stringify(value)??'undefined')result=Math.imul(result^char.charCodeAt(0),16777619);return(result>>>0).toString(16).padStart(8,'0');},request=indexedDB.open('holorecall-local-v1',2);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,transaction=db.transaction('local-study','readwrite'),store=transaction.objectStore('local-study'),read=store.get('snapshot');read.onerror=()=>reject(read.error);read.onsuccess=()=>{const state=read.result,cards=state.cards.filter((item:{id:string})=>item.id.includes('browser-guid'));for(const card of cards){card.answer='it';card.pronunciation='';card.meaning='';card.notes='Imported source · Language-labelled prompt / Italian answer';const shape={deckId:card.deckId,kind:card.kind,front:card.front,answer:card.answer,pronunciation:card.pronunciation,meaning:card.meaning,notes:card.notes,tags:card.tags,image:card.image,backImage:card.backImage,imageDescription:card.imageDescription,frontAudio:card.frontAudio,backAudio:card.backAudio,siblingGroupId:card.siblingGroupId};card.ankiSource.importedContentHash=hash(shape);card.ankiSource.conversion={...card.ankiSource.conversion,mappingVersion:2,mappingPolicyVersion:0,mappingOrigin:'auto-inferred',mappingSignature:'anki-mapping-v1-stale',fieldBaselines:Object.fromEntries(Object.entries(shape).map(([field,value])=>[field,hash(value)]))};}const card=cards[0];const schema=card.ankiSource.modelSignature;state.ankiMappings=[{id:'legacy-positional',version:2,name:'Legacy positional mapping',sourceSignature:schema,modelName:card.ankiSource.modelName,fields:{Prompt:'front',Language:'answer',Pronunciation:'pronunciation',Italian:'ignore',Meaning:'ignore',Examples:'notes'},policyVersion:0,origin:'auto-inferred'}];state.version++;store.put(state,'snapshot');};transaction.oncomplete=()=>{db.close();resolve();};transaction.onerror=()=>reject(transaction.error);};}));
  await page.goto('/?repair-fixture=1#dashboard');await expect(page.getByRole('heading',{name:'Study dashboard',exact:true})).toBeVisible();await page.getByRole('button',{name:'Decks',exact:true}).click();
  const parent=page.locator('.deck-journey').filter({has:page.getByRole('heading',{name:'Italian Lesson',exact:true})});await expect(parent.getByRole('button',{name:'Manage Anki source'})).toBeVisible();await expect(parent.getByRole('button',{name:'Repair imported content'})).toHaveCount(0);await expect(parent.getByRole('button',{name:'Advanced field enrichment'})).toHaveCount(0);await parent.getByRole('button',{name:'Manage Anki source'}).click();await page.getByRole('button',{name:'Rebuild from retained source'}).click();
  await expect(page.getByRole('heading',{name:'Rebuild imported content'})).toBeVisible();await expect(page.getByText('Using the retained Anki source snapshot.')).toBeVisible();await expect(page.locator('.update-summary')).toContainText('0Source changed');await expect(page.locator('.update-summary')).toContainText('2Structured upgrades');await expect(page.locator('.update-summary')).toContainText('0Genuine local conflicts');
  await expect(page.locator('.mapping-panel')).toHaveCount(0);await page.getByRole('button',{name:/Advanced details/}).click();await expect(page.getByRole('button',{name:'Advanced mapping'})).toBeVisible();
  const comparison=page.getByLabel('Representative before and after card preview');await expect(comparison).toContainText('it');await expect(comparison).toContainText('Mi chiamo');await expect(comparison).toContainText('mee KYAH-moh');await expect(comparison).toContainText('My name is');await page.screenshot({path:testInfo.outputPath('same-source-conversion-repair.png'),fullPage:true});
  await page.getByRole('button',{name:'Apply structured repair · 2 cards'}).click();await expect(page.locator('.completion-panel')).toContainText('REPAIR COMPLETE');await expect(page.getByRole('button',{name:'Review imported deck'})).toBeVisible();const repaired=await snapshot(page),card=repaired.cards.find(item=>item.id.includes('introductions-browser-guid'))!;expect(card).toMatchObject({answer:'Mi chiamo',pronunciation:'mee KYAH-moh',meaning:'My name is',details:[{label:'Use / examples',content:'Mi chiamo Laura.'}]});expect(card.answer).not.toBe('it');expect(repaired.cards.filter(item=>item.id.includes('browser-guid')).every(item=>item.answer!=='it')).toBe(true);expect(card.ankiSource?.contentProvenance).toMatchObject({answer:'template',answerFields:['Italian','Pronunciation','Meaning','Examples']});expect(repaired.ankiSources.some(source=>source.notes.some(note=>note.fields.Language==='it'&&note.fields.Italian==='Mi chiamo'))).toBe(true);await page.getByRole('button',{name:'Go to deck'}).click();
  await page.getByRole('tab',{name:'Search cards'}).click();const row=page.locator(`[data-card-id="${card.id}"]`);await expect(row.getByRole('heading')).toHaveText('Mi chiamo');await expect(row.locator('.card-list-copy>p')).toContainText('My name is · mee KYAH-moh');await expect(row).not.toContainText('Mi chiamo Laura.');await row.getByRole('button',{name:/Edit Mi chiamo/}).click();await expect(page.getByLabel('Back text / answer')).toHaveValue('Mi chiamo');await expect(page.getByLabel('Approximate pronunciation')).toHaveValue('mee KYAH-moh');await expect(page.getByLabel('Meaning')).toHaveValue('My name is');await page.getByRole('button',{name:'Cancel',exact:true}).click();
  const search=page.getByRole('combobox',{name:'Search decks and cards'});await search.fill('My name is');await expect(page.getByRole('option').filter({hasText:'Mi chiamo'})).toBeVisible();await search.fill('');await navigate(page,'Collection');await expect(page.getByText('Mi chiamo',{exact:true}).first()).toBeVisible();await navigate(page,'Decks');await parent.getByRole('button',{name:'Study',exact:true}).first().click();await revealCard(page);await expect(page.getByRole('heading',{name:'Mi chiamo',exact:true})).toBeVisible();
});

test('HR-ANKI-LEGACY-01 captures the original package once for a pre-snapshot repair',async({page})=>{
  const packageBytes=await languageMetadataApkg();await openApp(page);await navigate(page,'Exchange');await page.getByLabel('Anki · Import Anki .apkg decks').click();await page.locator('#anki-import').setInputFiles({name:'legacy-introductions.apkg',mimeType:'application/zip',buffer:packageBytes});await page.getByRole('button',{name:'Import 1 supported cards'}).click();
  await page.evaluate(()=>new Promise<void>((resolve,reject)=>{const request=indexedDB.open('holorecall-local-v1',2);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,transaction=db.transaction('local-study','readwrite'),store=transaction.objectStore('local-study'),read=store.get('snapshot');read.onerror=()=>reject(read.error);read.onsuccess=()=>{const state=read.result,card=state.cards.find((item:{id:string})=>item.id.includes('introductions-browser-guid'));card.answer='it';card.pronunciation='';card.meaning='';card.ankiSource.sourceSnapshotId=undefined;card.ankiSource.conversion={...card.ankiSource.conversion,mappingPolicyVersion:0,mappingOrigin:'auto-inferred',fieldOrigins:{answer:'derived',pronunciation:'derived',meaning:'derived'}};state.ankiSources=[];state.ankiMappings=[{id:'legacy-positional',version:2,name:'Legacy mapping',sourceSignature:card.ankiSource.modelSignature,modelName:card.ankiSource.modelName,fields:{Prompt:'front',Language:'answer',Italian:'ignore'},policyVersion:0,origin:'auto-inferred'}];state.version++;store.put(state,'snapshot');};transaction.oncomplete=()=>{db.close();resolve();};transaction.onerror=()=>reject(transaction.error);};}));
  await page.reload();await page.getByRole('button',{name:'Decks',exact:true}).click();const parent=page.locator('.deck-journey').filter({has:page.getByRole('heading',{name:'Italian Lesson',exact:true})});await parent.getByRole('button',{name:'Manage Anki source'}).click();await expect(page.getByText('Original package required for rebuild')).toBeVisible();await page.getByRole('button',{name:'Repair legacy import'}).click();await page.locator('#anki-import').setInputFiles({name:'legacy-introductions.apkg',mimeType:'application/zip',buffer:packageBytes});await expect(page.getByLabel('Representative before and after card preview')).toContainText('Mi chiamo');await page.getByRole('button',{name:'Apply structured repair · 1 card'}).click();
  const repaired=await snapshot(page),card=repaired.cards.find(item=>item.id.includes('introductions-browser-guid'))!;expect(card.answer).toBe('Mi chiamo');expect(card.answer).not.toBe('it');expect(card.ankiSource?.sourceSnapshotId).toBeTruthy();expect(repaired.ankiSources.some(source=>source.id===card.ankiSource?.sourceSnapshotId)).toBe(true);
});

test('HR-DECK-UX-01 keeps deck and Anki-source actions in one hierarchy',async({page})=>{await openApp(page);await navigate(page,'Exchange');await page.getByLabel('Anki · Import Anki .apkg decks').click();await page.locator('#anki-import').setInputFiles({name:'introductions.apkg',mimeType:'application/zip',buffer:await languageMetadataApkg()});await page.getByRole('button',{name:'Import 1 supported cards'}).click();await navigate(page,'Decks');const parent=page.locator('.deck-journey').filter({has:page.getByRole('heading',{name:'Italian Lesson',exact:true})});await expect(parent.getByRole('button',{name:'Study',exact:true})).toHaveCount(1);await expect(parent.getByRole('button',{name:'Focus',exact:true})).toHaveCount(1);await expect(parent.getByRole('button',{name:'More deck actions'})).toHaveCount(1);await expect(parent.getByRole('button',{name:'Manage Anki source'})).toHaveCount(1);await expect(parent.getByRole('button',{name:'Update from Anki package'})).toHaveCount(0);await expect(parent.getByRole('button',{name:'Advanced field enrichment'})).toHaveCount(0);await parent.getByRole('button',{name:'More deck actions'}).focus();await page.keyboard.press('Enter');await expect(parent.getByRole('menuitem',{name:'Study settings'})).toBeVisible();await page.keyboard.press('Escape');await parent.getByRole('button',{name:'Manage Anki source'}).click();await expect(page.getByRole('heading',{name:'Manage Anki source'})).toBeVisible();await expect(page.getByRole('button',{name:'Update from Anki'})).toBeVisible();await expect(page.getByRole('button',{name:'Rebuild from retained source'})).toBeVisible();await expect(page.getByRole('button',{name:'Review conversion'})).toBeVisible();await expect(page.getByRole('heading',{name:'Download'})).toHaveCount(0);});

test('HR-CONTENT-LIST-01 @ios-compact @ios-large @ios-landscape card rows and deck actions reflow at enlarged text',async({page})=>{await openApp(page);await navigate(page,'Decks');await page.addStyleTag({content:'html{-webkit-text-size-adjust:200%;text-size-adjust:200%}'});const journey=page.locator('.deck-journey').first();await expect(journey.getByRole('button',{name:'Study',exact:true})).toBeVisible();await expect(journey.getByRole('button',{name:'More deck actions'})).toBeVisible();await page.getByRole('tab',{name:'Search cards'}).click();const row=page.locator('.card-list-row').first();await expect(row.getByRole('heading')).toBeVisible();await expect(row.getByRole('button',{name:/Edit/})).toBeVisible();await expectNoOverflow(page);});

test('HR-BUG-STUDY-01 background interruption settles the accepted imported review visibly once',async({page})=>{
  await openApp(page);await importOfficial(page);await page.getByRole('button',{name:'Decks',exact:true}).click();
  const parent=page.locator('.deck-journey').filter({has:page.getByRole('heading',{name:'HoloRecall Fixture',exact:true})});await parent.getByRole('button',{name:'Study',exact:true}).first().click();
  await page.getByRole('button',{name:/Check answer/}).click();await page.getByRole('button',{name:/4 Good Confident/}).click();await expect(page.locator('.confidence-feedback')).toBeVisible();
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow')));
  await expect(page.locator('.study-layout')).toHaveAttribute('data-study-transition','idle');
  const settled=await page.getByTestId('study-deck-stage').evaluate(stage=>{const style=getComputedStyle(stage);return{opacity:style.opacity,transform:style.transform,card:!!stage.querySelector('.memory-card'),animations:stage.getAnimations().length};});expect(settled).toEqual({opacity:'1',transform:'none',card:true,animations:0});expect((await snapshot(page)).events).toHaveLength(1);
});
