import { beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import initSqlJs from 'sql.js';
import JSZip from 'jszip';
import { ANKI_DERIVED_FIELDS, ANKI_MAPPING_POLICY_VERSION, analyseAnkiPackage, analyseAnkiSourceSnapshot, ankiFieldHash, ankiImportedContentHash, eligibleAnkiMappings, markAnkiLocalEdits, plainAnkiText, previewAnkiImport, renderAnkiSnapshotCard, suggestedAnkiFieldTarget, suggestedRarity } from './anki';
import { createInitialState } from './study';

beforeAll(async () => {
  const wasm = await readFile('node_modules/sql.js/dist/sql-wasm-browser.wasm');
  const original = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => String(input).endsWith('/runtime/sql-wasm-browser.wasm') ? Promise.resolve(new Response(wasm, { headers: { 'content-type': 'application/wasm' } })) : original(input, init)) as typeof fetch;
});

async function legacyPackage(schemaExtra = false): Promise<Uint8Array> {
  const SQL = await initSqlJs(); const db = new SQL.Database();
  db.run('create table col (models text, decks text)'); db.run('create table notes (id integer, guid text, mid integer, tags text, flds text)'); db.run('create table cards (id integer, nid integer, did integer, ord integer)');
  const models = {
    1: { name: 'Basic (and reversed card)', type: 0, flds: [{ name: 'Front' }, { name: 'Back' }, ...(schemaExtra ? [{ name: 'Pronunciation' }] : [])], tmpls: [{ name: 'Card 1', qfmt: '{{Front}}', afmt: '{{FrontSide}}<hr>{{Back}}' }, { name: 'Card 2', qfmt: '{{Back}}', afmt: '{{Front}}' }] },
    2: { name: 'Cloze', type: 1, flds: [{ name: 'Text' }], tmpls: [{ name: 'Cloze', qfmt: '{{cloze:Text}}', afmt: '{{cloze:Text}}' }] },
  };
  db.run('insert into col values (?,?)', [JSON.stringify(models), JSON.stringify({ 10: { name: 'Italian::Tiny' } })]);
  db.run('insert into notes values (?,?,?,?,?)', [100, 'basic-guid', 1, 'accent café', `ciao\x1fhello${schemaExtra ? '\x1fCHEE-ah-oh' : ''}`]);
  db.run('insert into notes values (?,?,?,?,?)', [101, 'cloze-guid', 2, 'cloze', '{{c1::sono}} pronto']);
  db.run('insert into cards values (?,?,?,?)', [200, 100, 10, 0]); db.run('insert into cards values (?,?,?,?)', [201, 100, 10, 1]); db.run('insert into cards values (?,?,?,?)', [202, 101, 10, 0]);
  const zip = new JSZip(); zip.file('collection.anki2', db.export()); zip.file('media', '{}'); db.close(); return zip.generateAsync({ type: 'uint8array' });
}

async function warningPackage(): Promise<Uint8Array> {
  const SQL = await initSqlJs(); const db = new SQL.Database();
  db.run('create table col (models text, decks text)'); db.run('create table notes (id integer, guid text, mid integer, tags text, flds text)'); db.run('create table cards (id integer, nid integer, did integer, ord integer)');
  const models = {
    1: { name: 'TTS reference', type: 0, flds: [{ name: 'Front' }, { name: 'Back' }], tmpls: [{ name: 'Spoken card', qfmt: '{{Front}} {{tts en_US voices=Apple_Samantha:Front}} <a href="https://www.treccani.it/vocabolario/ciao">Treccani</a>', afmt: '{{Back}} [anki:tts lang=en_US]{{Back}}[/anki:tts]' }] },
    2: { name: 'Remote image', type: 0, flds: [{ name: 'Front' }, { name: 'Back' }], tmpls: [{ name: 'Remote', qfmt: '{{Front}}<img src="https://example.test/required.png">', afmt: '{{Back}}' }] },
    3: { name: 'Remote-only prompt', type: 0, flds: [{ name: 'Back' }], tmpls: [{ name: 'Remote only', qfmt: '<img src="https://example.test/only.png">', afmt: '{{Back}}' }] },
  };
  db.run('insert into col values (?,?)', [JSON.stringify(models), JSON.stringify({ 10: { name: 'Italian Lesson::01 Greetings' } })]);
  db.run('insert into notes values (?,?,?,?,?)', [100, 'tts-guid', 1, '', 'ciao\x1fhello']); db.run('insert into cards values (?,?,?,?)', [200, 100, 10, 0]);
  db.run('insert into notes values (?,?,?,?,?)', [101, 'remote-guid', 2, '', 'salve\x1fgreetings']); db.run('insert into cards values (?,?,?,?)', [201, 101, 10, 0]);
  db.run('insert into notes values (?,?,?,?,?)', [102, 'remote-only-guid', 3, '', 'unavailable image']); db.run('insert into cards values (?,?,?,?)', [202, 102, 10, 0]);
  const zip = new JSZip(); zip.file('collection.anki2', db.export()); zip.file('media', '{}'); db.close(); return zip.generateAsync({ type: 'uint8array' });
}

async function structuredItalianPackage(answer = 'Good evening'): Promise<Uint8Array> {
  const SQL = await initSqlJs(); const db = new SQL.Database();
  db.run('create table col (models text, decks text)'); db.run('create table notes (id integer, guid text, mid integer, tags text, flds text)'); db.run('create table cards (id integer, nid integer, did integer, ord integer)');
  const models = { 1: { name: 'Laura recap', type: 0, flds: [{name:'Prompt'},{name:'Response'},{name:'Pronunciation'},{name:'NaturalMeaning'},{name:'WordBreakdown'},{name:'EverydayUse'}], tmpls: [{name:'Recap',qfmt:'{{Prompt}}',afmt:'{{FrontSide}}<hr>{{Response}}<div>{{Pronunciation}}</div><h3>Meaning & notes</h3><b>Meaning in Laura\'s recap</b>{{NaturalMeaning}}<b>Added word breakdown</b>{{WordBreakdown}}<b>Everyday use</b>{{EverydayUse}}'}] } };
  db.run('insert into col values (?,?)',[JSON.stringify(models),JSON.stringify({10:{name:'Italian Lesson::01 Greetings'}})]);
  db.run('insert into notes values (?,?,?,?,?)',[100,'buonasera-guid',1,'greeting',`Buonasera!\x1f${answer}\x1fbwoh-nah-SEH-rah\x1fgood evening\x1fbuona = good; sera = evening.\x1fUsed from late afternoon.`]);
  db.run('insert into cards values (?,?,?,?)',[200,100,10,0]);
  const zip=new JSZip();zip.file('collection.anki2',db.export());zip.file('media','{}');db.close();return zip.generateAsync({type:'uint8array'});
}

async function languageMetadataPackage(answer = 'Mi chiamo',multiple=false): Promise<Uint8Array> {
  const SQL = await initSqlJs(); const db = new SQL.Database();
  db.run('create table col (models text, decks text)'); db.run('create table notes (id integer, guid text, mid integer, tags text, flds text)'); db.run('create table cards (id integer, nid integer, did integer, ord integer)');
  const models = { 1: { name: 'Language-labelled prompt', type: 0, flds: [{name:'Prompt'},{name:'Language'},{name:'Pronunciation'},{name:'Italian'},{name:'Meaning'},{name:'Examples'}], tmpls: [{name:'Italian answer',qfmt:'{{Prompt}}',afmt:'{{FrontSide}}<hr>{{Italian}}<div>{{Pronunciation}}</div><div>{{Meaning}}</div><div>{{Examples}}</div>'}] } };
  db.run('insert into col values (?,?)',[JSON.stringify(models),JSON.stringify({10:{name:'Italian Lesson::02 Introductions'}})]);
  db.run('insert into notes values (?,?,?,?,?)',[100,'introductions-guid',1,'introduction',`Introduce yourself\x1fit\x1fmee KYAH-moh\x1f${answer}\x1fMy name is\x1fMi chiamo Laura.`]);
  db.run('insert into cards values (?,?,?,?)',[200,100,10,0]);
  if(multiple){db.run('insert into notes values (?,?,?,?,?)',[101,'greetings-guid',1,'greeting','Say good evening\x1fit\x1fbwoh-nah-SEH-rah\x1fBuonasera!\x1fGood evening\x1fBuonasera, Marco!']);db.run('insert into cards values (?,?,?,?)',[201,101,10,0]);}
  const zip=new JSZip();zip.file('collection.anki2',db.export());zip.file('media','{}');db.close();return zip.generateAsync({type:'uint8array'});
}

async function templateFirstVisualPackage():Promise<Uint8Array>{
  const SQL=await initSqlJs(),db=new SQL.Database();db.run('create table col (models text, decks text)');db.run('create table notes (id integer, guid text, mid integer, tags text, flds text)');db.run('create table cards (id integer, nid integer, did integer, ord integer)');
  const fields=['Prompt','Language','Question','Picture','Options','Answer','Italian','Pronunciation','Meaning','Literal','Rule','Roles','Memory','Extra'];
  const q='<div>{{Picture}}{{#Options}}<div>{{Options}}</div>{{/Options}}</div><p>{{Prompt}}</p><div>{{Question}}</div>',a='<div class="answer-body"><div class="answer-tag">{{Answer}}</div><div class="italian">{{Italian}}</div><div>{{Pronunciation}}</div><div>{{Meaning}}</div><div>{{Literal}}</div><div>{{Rule}}</div></div>';
  const models={1:{name:'Arbitrary Italian',type:0,flds:fields.map(name=>({name})),tmpls:[{name:'Visual',qfmt:q,afmt:a}]}};db.run('insert into col values (?,?)',[JSON.stringify(models),JSON.stringify({10:{name:'Italian::Lesson 1::Greetings'}})]);
  const picture='<div class="panel-head"><span class="panel-badge">HELLO</span><div class="panel-title">Greetings</div><div class="panel-subtitle">Choose and say it</div></div>',options='<button onclick="globalThis.pwned=1">Ciao</button><button onclick="location=\'https://evil.test\'">Salve</button>',values=['Say this','it','Good evening',picture,options,'Greeting','Buonasera!','bwoh-nah-SEH-rah','Good evening','buona + sera','Use after lunch','','Remember the evening','Informal or formal'];
  db.run('insert into notes values (?,?,?,?,?)',[100,'visual-guid',1,'greeting',values.join('\x1f')]);db.run('insert into cards values (?,?,?,?)',[200,100,10,0]);const zip=new JSZip();zip.file('collection.anki2',db.export());zip.file('media','{}');db.close();return zip.generateAsync({type:'uint8array'});
}

async function reconstructedSourcePackage():Promise<Uint8Array>{
  const SQL=await initSqlJs(),db=new SQL.Database();db.run('create table col (models text, decks text)');db.run('create table notes (id integer, guid text, mid integer, tags text, flds text)');db.run('create table cards (id integer, nid integer, did integer, ord integer)');
  const fields=['Italian','Image','Pronunciation','Meaning','Literal','Usage','SoundNote','Sources','StableKey','Prompt'];
  const q='<div class="wrap"><div class="image">{{Image}}</div><div class="prompt">{{Prompt}}</div></div>',a='<div class="wrap">{{FrontSide}}<hr id="answer"><div class="answer" lang="it">{{Italian}}</div><div class="pronunciation">{{Pronunciation}}</div>{{#Meaning}}<div class="section"><div class="label">Meaning</div>{{Meaning}}</div>{{/Meaning}}{{#Literal}}<div class="section"><div class="label">Literal</div>{{Literal}}</div>{{/Literal}}{{#Usage}}<div class="section"><div class="label">Use / examples</div>{{Usage}}</div>{{/Usage}}{{#SoundNote}}<div class="section"><div class="label">Pattern / sound</div>{{SoundNote}}</div>{{/SoundNote}}{{#Sources}}<div class="meta">{{Sources}}</div>{{/Sources}}</div>';
  const models={1:{name:'Italian Visual - Image First v1',type:0,flds:fields.map(name=>({name})),tmpls:[{name:'Image to Italian',qfmt:q,afmt:a}]}};db.run('insert into col values (?,?)',[JSON.stringify(models),JSON.stringify({10:{name:'Italian Lesson 1::01 Greetings'}})]);
  const examples=[
    ['jY03zlP8xdb2','Ciao!','CHOW','Hi / Hello / Bye — informal','No useful word-for-word translation; ciao functions as a greeting or farewell.','Informal: Ciao, Marco!<br>Formal: use Buongiorno/Buonasera unless invited to use tu.','Pattern: CI + A begins with the soft C sound, like English ch in chair.','Session 1 handout · p. 1','italian-l1-greetings-ciao','Recall from the illustration'],
    ['xBZt1kaf4sHY','Buongiorno!','bwon-JOR-noh','Good morning / Good day','buon = good; giorno = day.','Informal: Buongiorno, Marco!','GI before O gives the soft G sound.','Session 1 handout · p. 1','italian-l1-greetings-buongiorno','Recall from the illustration'],
    ['a2gS66j05H64','Buonasera!','bwoh-nah-SEH-rah','Good evening','buona = good; sera = evening.','Formal: Buonasera, signore.','buona + sera.','Session 1 handout · p. 1','italian-l1-greetings-buonasera','Recall from the illustration'],
    ['625214c5cf9e626a','Come stai?','KOH-meh STY','How are you? — informal','Come = how; stai is the tu form of stare.','Ciao, Marco. Come stai?','tu → stai; formal Lei → sta.','Session 1 handout','italian-l1-come-stai','How are you?'],
  ];
  for(let index=4;index<42;index++)examples.push([`fixture-guid-${index}`,`Italian ${index}`,`pron ${index}`,`Meaning ${index}`,`Literal ${index}`,`Usage ${index}`,`Pattern ${index}`,`Source ${index}`,`stable-${index}`,`Prompt ${index}`]);
  examples.forEach((values,index)=>{db.run('insert into notes values (?,?,?,?,?)',[100+index,values[0],1,'lesson-1',[values[1],'<img src="fixture.png">',...values.slice(2)].join('\x1f')]);db.run('insert into cards values (?,?,?,?)',[200+index,100+index,10,0]);});
  const zip=new JSZip();zip.file('collection.anki2',db.export());zip.file('media',JSON.stringify({0:'fixture.png'}));zip.file('0',await readFile('public/downloads/frame-guide-transparent.png'));db.close();return zip.generateAsync({type:'uint8array'});
}

describe('Anki content-only import', () => {
  it('preserves block boundaries without inventing spacing between intentional inline text', () => {
    expect(plainAnkiText('<div>Come stai?</div><div>Molto bene</div>')).toBe('Come stai?\nMolto bene');
    expect(plainAnkiText('<span>Hello</span> <strong>world</strong>')).toBe('Hello world');
    expect(plainAnkiText('<span>日</span><span>本</span>')).toBe('日本');
  });

  it('keeps mapped Laura-style fields structured and removes FrontSide from the native answer', async () => {
    const first=await analyseAnkiPackage(await structuredItalianPackage(),'laura.apkg');
    expect(first.cards[0]).toMatchObject({front:'Buonasera!',answer:'Good evening',pronunciation:'bwoh-nah-SEH-rah',meaning:'good evening'});
    expect(first.cards[0]!.notes).toContain('buona = good; sera = evening.\n\nUsed from late afternoon.');
    const schema=first.modelSchemas[0]!;
    const mapping={id:'laura-map',version:1 as const,name:'Laura recap',sourceSignature:schema.signature,modelName:schema.name,fields:{Prompt:'front',Response:'answer',Pronunciation:'pronunciation',NaturalMeaning:'meaning',WordBreakdown:'notes',EverydayUse:'notes'} as const};
    const analysis=await analyseAnkiPackage(await structuredItalianPackage(),'laura.apkg',undefined,undefined,[mapping]);
    const card=analysis.cards[0]!;
    expect(card.front).toBe('Buonasera!');
    expect(card.answer).toBe('Good evening');
    expect(card.pronunciation).toBe('bwoh-nah-SEH-rah');
    expect(card.meaning).toBe('good evening');
    expect(card.notes).toContain('buona = good; sera = evening.\n\nUsed from late afternoon.');
    expect(card.answer).not.toContain('Meaning & notes');
    expect(card.ankiSource).toMatchObject({kind:'anki',noteGuid:'buonasera-guid',templateOrdinal:0,modelSignature:schema.signature});
    expect(card.ankiSource?.importedContentHash).toMatch(/^[a-f0-9]{8}$/);
  });

  it('uses template semantics even when an optional mapping points Language at Answer', async () => {
    expect(suggestedAnkiFieldTarget('Language')).toBe('ignore');
    expect(suggestedAnkiFieldTarget('Italian')).toBe('ignore');
    const bytes=await languageMetadataPackage();
    const safe=await analyseAnkiPackage(bytes,'introductions.apkg');
    expect(safe.cards[0]).toMatchObject({front:'Introduce yourself',answer:'Mi chiamo',pronunciation:'mee KYAH-moh',meaning:'My name is',details:[{label:'Use / examples',content:'Mi chiamo Laura.'}]});
    expect(safe.cards[0]!.ankiSource?.contentProvenance).toMatchObject({front:'template',answer:'template',frontFields:['Prompt'],answerFields:['Italian','Pronunciation','Meaning','Examples']});
    expect(safe.sourceSnapshot).toMatchObject({version:2,notes:[{guid:'introductions-guid',fields:{Language:'it',Italian:'Mi chiamo'}}]});
    expect(safe.sourceSnapshot.noteTypes[0]?.templates[0]).toMatchObject({question:'{{Prompt}}',answer:expect.stringContaining('{{Italian}}')});
    expect(safe.compatibility).toEqual({tierA:1,tierB:0,tierC:0,tierD:0});
    expect(renderAnkiSnapshotCard(safe.sourceSnapshot,'200')).toMatchObject({front:'Introduce yourself',answer:'Mi chiamo',answerFields:['Italian','Pronunciation','Meaning','Examples']});
    const schema=safe.modelSchemas[0]!;
    const invalid={id:'language-map',version:1 as const,name:'Bad positional mapping',sourceSignature:schema.signature,modelName:schema.name,fields:{Prompt:'front',Language:'answer',Pronunciation:'pronunciation',Italian:'ignore'} as const};
    const blocked=await analyseAnkiPackage(bytes,'introductions.apkg',undefined,undefined,[invalid]);
    expect(blocked.cards[0]).toMatchObject({answer:'Mi chiamo'});
    expect(blocked.compatibility.tierC).toBe(0);

    const repaired={...invalid,name:'Reviewed mapping',fields:{Prompt:'front',Language:'ignore',Pronunciation:'pronunciation',Italian:'answer'} as const};
    const corrected=await analyseAnkiPackage(bytes,'introductions.apkg',undefined,undefined,[repaired]);
    expect(corrected.cards[0]).toMatchObject({answer:'Mi chiamo',pronunciation:'mee KYAH-moh'});
    expect(corrected.cards[0]!.ankiSource?.contentProvenance).toMatchObject({answer:'template',answerFields:['Italian','Pronunciation','Meaning','Examples']});
  });
  it('turns visual panels and scripted source options into inert native content',async()=>{
    const analysis=await analyseAnkiPackage(await templateFirstVisualPackage(),'visual.apkg'),card=analysis.cards[0]!;
    expect(card).toMatchObject({front:'Say this\nGood evening',answer:'Buonasera!',answerLabel:'Greeting',pronunciation:'bwoh-nah-SEH-rah',meaning:'Good evening',art:{kind:'source-visual-panel',badge:'HELLO',title:'Greetings',subtitle:'Choose and say it'},choices:['Ciao','Salve']});
    expect(card.details).toEqual(expect.arrayContaining([{label:'Literal',content:'buona + sera'},{label:'Pattern / sound',content:'Use after lunch'}]));expect(JSON.stringify(card)).not.toMatch(/onclick|globalThis|javascript:|evil\.test/);expect(analysis.compatibility.tierC).toBe(0);
  });
  it('uses one structured proposal for fresh import, update, repair and legacy migration',async()=>{
    const analysis=await analyseAnkiPackage(await reconstructedSourcePackage(),'reconstructed.apkg'),byGuid=(guid:string)=>analysis.cards.find(card=>card.ankiSource?.noteGuid===guid)!;
    expect(analysis.cards).toHaveLength(42);
    expect(byGuid('jY03zlP8xdb2')).toMatchObject({front:'Recall from the illustration',answer:'Ciao!',pronunciation:'CHOW',meaning:'Hi / Hello / Bye — informal',details:[
      {label:'Literal',content:'No useful word-for-word translation; ciao functions as a greeting or farewell.'},
      {label:'Use / examples',content:'Informal: Ciao, Marco!\nFormal: use Buongiorno/Buonasera unless invited to use tu.'},
      {label:'Pattern / sound',content:'Pattern: CI + A begins with the soft C sound, like English ch in chair.'},
      {label:'Reference',content:'Session 1 handout · p. 1'},
    ],art:{kind:'imported-media'}});
    expect(byGuid('xBZt1kaf4sHY').answer).toBe('Buongiorno!');expect(byGuid('a2gS66j05H64').answer).toBe('Buonasera!');expect(byGuid('625214c5cf9e626a').answer).toBe('Come stai?');
    expect(JSON.stringify(analysis.cards)).not.toContain('English-friendly pronunciation · CAPS = stressed syllable');
    const state=createInitialState(analysis.decks,analysis.cards),root=analysis.decks.find(deck=>!deck.parentId)!.id;
    state.cards=state.cards.map(card=>{const old=structuredClone(card);old.answer=`${card.answer}\nEnglish-friendly pronunciation · CAPS = stressed syllable\nDetails\nMeaning${card.meaning}`;old.pronunciation='';old.meaning='';delete old.details;old.ankiSource!.conversion={...old.ankiSource!.conversion!,converterVersion:4,enrichmentVersion:1,fieldBaselines:{},fieldOrigins:{}};old.ankiSource!.conversion!.fieldBaselines=Object.fromEntries(ANKI_DERIVED_FIELDS.map(field=>[field,ankiFieldHash(old,field)]));old.ankiSource!.conversion!.fieldOrigins=Object.fromEntries(ANKI_DERIVED_FIELDS.map(field=>[field,'local'])) as any;return old;});
    const update=previewAnkiImport(analysis,state,true,root,'update'),repair=previewAnkiImport(analysis,state,true,root,'repair'),snapshot=analyseAnkiSourceSnapshot(analysis.sourceSnapshot),legacy=previewAnkiImport(snapshot,state,true,root,'repair');
    for(const preview of [update,repair,legacy]){expect(preview.update.conflicts).toEqual([]);expect(preview.update.conversionUpgradeCards).toHaveLength(42);const plan=preview.transaction.cards.find(item=>item.proposed.ankiSource?.noteGuid==='jY03zlP8xdb2')!;expect(plan.proposed).toMatchObject({answer:'Ciao!',pronunciation:'CHOW',meaning:'Hi / Hello / Bye — informal',details:expect.arrayContaining([{label:'Reference',content:'Session 1 handout · p. 1'}])});expect(plan.selected).toEqual(plan.proposed);expect(plan.proposed).toEqual(byGuid('jY03zlP8xdb2'));}
    const local=structuredClone(state),current=local.cards.find(card=>card.ankiSource?.noteGuid==='jY03zlP8xdb2')!,edited=structuredClone(current);edited.answer='My deliberate local answer';local.cards[local.cards.indexOf(current)]=markAnkiLocalEdits(current,edited);const protectedPlan=previewAnkiImport(analysis,local,true,root,'repair'),conflict=protectedPlan.transaction.cards.find(item=>item.cardId===edited.id)!;expect(protectedPlan.update.conflictFields[edited.id]).toEqual(['answer']);expect(conflict.proposed.answer).toBe('Ciao!');expect(conflict.selected.answer).toBe('My deliberate local answer');
  });
  it('replaces a stale auto-inferred Language answer and corrupt accepted baseline during explicit repair',async()=>{
    const bytes=await languageMetadataPackage('Mi chiamo',true),current=await analyseAnkiPackage(bytes,'introductions.apkg'),schema=current.modelSchemas[0]!;
    expect(schema.fieldSamples.Language).toEqual(['it']);expect(schema.fieldSamples.Italian).toEqual(['Mi chiamo','Buonasera!']);
    const stale={id:'legacy-positional',version:2 as const,name:'Legacy automatic mapping',sourceSignature:schema.signature,modelName:schema.name,fields:{Prompt:'front',Language:'answer',Pronunciation:'pronunciation',Italian:'ignore',Meaning:'ignore',Examples:'notes'} as const,policyVersion:0,origin:'auto-inferred' as const};
    expect(eligibleAnkiMappings([stale],'repair')).toEqual([]);
    const reviewed={...stale,origin:'user-confirmed' as const};expect(eligibleAnkiMappings([reviewed],'repair')[0]).toMatchObject({origin:'user-confirmed',policyVersion:0});
    const custom={...reviewed,version:3 as const,policyVersion:ANKI_MAPPING_POLICY_VERSION,fields:{Prompt:'front',Language:'ignore',Pronunciation:'pronunciation',Italian:'meaning',Meaning:'answer',Examples:'notes'} as const},customAnalysis=await analyseAnkiPackage(bytes,'introductions.apkg',undefined,undefined,eligibleAnkiMappings([custom],'repair'));expect(customAnalysis.cards[0]).toMatchObject({answer:'Mi chiamo',meaning:'Mi chiamo'});
    const state=createInitialState(current.decks,current.cards),before=structuredClone(state.cards[0]!);before.answer='it';before.pronunciation='';before.meaning='';before.notes='Imported source · Language-labelled prompt / Italian answer';before.ankiSource!.importedContentHash=ankiImportedContentHash(before);before.ankiSource!.conversion={...before.ankiSource!.conversion!,mappingVersion:2,mappingPolicyVersion:0,mappingOrigin:'auto-inferred',fieldBaselines:{},fieldOrigins:undefined};
    before.ankiSource!.conversion.fieldBaselines=Object.fromEntries(ANKI_DERIVED_FIELDS.map(field=>[field,ankiFieldHash(before,field)]));state.cards[0]=before;
    const root=current.decks.find(deck=>!deck.parentId)!.id,preview=previewAnkiImport(current,state,true,root,'repair'),repaired=preview.bundle.cards.find(card=>card.id===before.id)!;
    expect(preview.update.sourceChangedCards).toEqual([]);expect(preview.update.conversionUpgradeCards).toContain(before.id);expect(preview.update.conflicts).toEqual([]);
    expect(repaired).toMatchObject({id:before.id,answer:'Mi chiamo',pronunciation:'mee KYAH-moh',meaning:'My name is',details:[{label:'Use / examples',content:'Mi chiamo Laura.'}]});expect(repaired.answer).not.toBe('it');
    const unknown={...state,ankiMappings:[{...stale,origin:'legacy-unclassified' as const}]},blocked=previewAnkiImport(current,unknown,true,root,'repair');expect(blocked.update.mappingReviewCards).toEqual([]);expect(blocked.errors).not.toContain('A legacy field mapping has unknown authorship. Review the field mapping before applying this repair.');
  });
  it('keeps an explicitly locally edited answer during repair while repairing derived fields',async()=>{
    const analysis=await analyseAnkiPackage(await languageMetadataPackage(),'introductions.apkg'),state=createInitialState(analysis.decks,analysis.cards),original=state.cards[0]!,edited=structuredClone(original);edited.answer='My own Italian answer';state.cards[0]=markAnkiLocalEdits(original,edited);state.cards[0]!.pronunciation='corrupt derived pronunciation';state.cards[0]!.ankiSource!.conversion!.fieldOrigins!.pronunciation='derived';
    const root=analysis.decks.find(deck=>!deck.parentId)!.id,preview=previewAnkiImport(analysis,state,true,root,'repair'),repaired=preview.bundle.cards[0]!;
    expect(preview.update.conflicts).toEqual([]);expect(repaired.answer).toBe('My own Italian answer');expect(repaired.pronunciation).toBe('mee KYAH-moh');expect(repaired.ankiSource?.conversion?.fieldOrigins?.answer).toBe('local');
  });

  it('previews source updates, local conflicts, legacy reconversion and recoverable removals', async () => {
    const original=await analyseAnkiPackage(await structuredItalianPackage(),'original.apkg');
    const schema=original.modelSchemas[0]!,mapping={id:'laura-map',version:1 as const,name:'Laura recap',sourceSignature:schema.signature,modelName:schema.name,fields:{Prompt:'front',Response:'answer',Pronunciation:'pronunciation',NaturalMeaning:'meaning',WordBreakdown:'notes',EverydayUse:'notes'} as const};
    const initial=await analyseAnkiPackage(await structuredItalianPackage(),'original.apkg',undefined,undefined,[mapping]);
    const state=createInitialState(initial.decks,initial.cards),root=initial.decks.find(deck=>!deck.parentId)!.id;
    const changed=await analyseAnkiPackage(await structuredItalianPackage('Good evening!'),'renamed.apkg',undefined,undefined,[mapping]);
    const normal=previewAnkiImport(changed,state,true,root);
    expect(normal.update.changedCards).toEqual([initial.cards[0]!.id]);
    expect(normal.update.conflicts).toEqual([]);
    expect(normal.updatedCards).toEqual([initial.cards[0]!.id]);

    const locallyEdited=structuredClone(state),edited=structuredClone(locallyEdited.cards[0]!);edited.notes+='\n\nMy local note.';locallyEdited.cards[0]=markAnkiLocalEdits(locallyEdited.cards[0]!,edited);locallyEdited.cards.push({...structuredClone(initial.cards[0]!),id:'anki-removed-source',ankiSource:{...initial.cards[0]!.ankiSource!,noteGuid:'removed-guid'}});
    const protectedPreview=previewAnkiImport(changed,locallyEdited,true,root);
    expect(protectedPreview.update.conflicts).toEqual([]);
    expect(protectedPreview.updatedCards).toEqual([initial.cards[0]!.id]);
    expect(protectedPreview.bundle.cards[0]).toMatchObject({answer:'Good evening!',notes:expect.stringContaining('My local note.')});
    expect(protectedPreview.update.removedSourceCards).toEqual(['anki-removed-source']);
    expect(previewAnkiImport(changed,locallyEdited,false,root).updatedCards).toEqual([initial.cards[0]!.id]);

    const legacy=structuredClone(state);delete legacy.cards[0]!.ankiSource;
    const legacyPreview=previewAnkiImport(changed,legacy,true,root);
    expect(legacyPreview.update.legacyReviewRequired).toEqual([initial.cards[0]!.id]);
    expect(legacyPreview.updatedCards).toEqual([]);
  });
  it('reconverts unchanged source when the stored conversion contract is older', async () => {
    const analysis=await analyseAnkiPackage(await structuredItalianPackage(),'original.apkg');
    const state=createInitialState(analysis.decks,analysis.cards),card=state.cards[0]!;
    card.answer='it';card.meaning='MeaningGood evening';card.notes='Literalbuona = good; sera = evening.';
    card.ankiSource!.importedContentHash=ankiImportedContentHash(card);
    card.ankiSource!.conversion={...card.ankiSource!.conversion!,converterVersion:1,normalizerVersion:1,fieldBaselines:{}};
    const root=analysis.decks.find(deck=>!deck.parentId)!.id,preview=previewAnkiImport(analysis,state,true,root);
    expect(preview.update.sourceChangedCards).toEqual([]);
    expect(preview.update.conversionUpgradeCards).toEqual([card.id]);
    expect(preview.update.unchangedCards).not.toContain(card.id);
    expect(preview.bundle.cards[0]).toMatchObject({id:card.id,answer:'Good evening',meaning:'good evening'});
  });
  it.each(['templateEngineVersion','enrichmentVersion'] as const)('invalidates unchanged derived content when %s advances',async version=>{
    const analysis=await analyseAnkiPackage(await languageMetadataPackage(),'source.apkg'),state=createInitialState(analysis.decks,analysis.cards),card=state.cards[0]!;
    card.ankiSource!.conversion![version]=0;const root=analysis.decks.find(deck=>!deck.parentId)!.id,preview=previewAnkiImport(analysis,state,true,root);
    expect(preview.update.sourceChangedCards).toEqual([]);expect(preview.update.conversionUpgradeCards).toEqual([card.id]);
  });
  it('analyses a legacy schema package as notes and generated cards, including reversed and cloze cards', async () => {
    const analysis = await analyseAnkiPackage(await legacyPackage(), 'tiny.apkg');
    expect(analysis.variant).toBe('legacy-anki2'); expect(analysis.sourceNotes).toBe(2); expect(analysis.generatedCards).toBe(3);
    expect(analysis.cards.map(card => [card.front, card.answer])).toEqual(expect.arrayContaining([['ciao', expect.stringContaining('hello')], ['hello', 'ciao'], ['[…] pronto', 'sono pronto']]));
    expect(analysis.cards.every(card => card.notes.includes('Imported source'))).toBe(true);
    expect(analysis.effectiveMappings).toEqual([]);
  });
  it('uses stable identities and deterministic authored rarity without importing learning state', async () => {
    const first = await analyseAnkiPackage(await legacyPackage(), 'first-name.apkg'), second = await analyseAnkiPackage(await legacyPackage(), 'renamed.apkg');
    expect(second.cards.map(card => card.id)).toEqual(first.cards.map(card => card.id)); expect(suggestedRarity('basic-guid-0')).toBe(suggestedRarity('basic-guid-0'));
    const state = createInitialState([], []), preview = previewAnkiImport(first, state);
    expect(preview.bundle.cards).toHaveLength(3); expect(preview.bundle).not.toHaveProperty('events');
  });
  it('does not apply a saved field mapping when the source model signature changes', async () => {
    const original = await analyseAnkiPackage(await legacyPackage(), 'original.apkg');
    const source = original.modelSchemas.find(model => model.name.startsWith('Basic'))!;
    const mapping = { id: 'basic-map', version: 1 as const, name: 'Basic fields', sourceSignature: source.signature, modelName: source.name, fields: { Front: 'front' as const, Back: 'answer' as const } };
    const changed = await analyseAnkiPackage(await legacyPackage(true), 'changed.apkg', undefined, undefined, [mapping]);
    const changedSource = changed.modelSchemas.find(model => model.name.startsWith('Basic'))!;
    expect(changedSource.signature).not.toBe(source.signature);
    expect(changed.cards.find(card => card.id.includes('basic-guid-0'))?.pronunciation).toBe('CHEE-ah-oh');
  });
  it('keeps TTS/filter learning text, ignores safe hyperlinks and classifies remote media separately', async () => {
    const analysis=await analyseAnkiPackage(await warningPackage(),'warnings.apkg');
    const spoken=analysis.cards.find(card=>card.id.includes('tts-guid'))!;
    expect(spoken.front).toContain('ciao');expect(spoken.front).toContain('Treccani');expect(spoken.front).not.toMatch(/{{|anki:tts/);
    expect(spoken.answer).toContain('hello');expect(spoken.answer).not.toMatch(/{{|anki:tts/);
    expect(analysis.conversion).toEqual({normal:0,simplified:2,excluded:1,unsafe:0});
    const info=analysis.issues.find(issue=>issue.severity==='info'&&issue.message.includes('TTS'))!;expect(info).toMatchObject({count:1,occurrences:1});
    expect(info.examples).toContain('TTS reference / Spoken card');
    const remote=analysis.issues.find(issue=>issue.kind==='remote-dependency')!;expect(remote).toMatchObject({severity:'warning',count:2,occurrences:2});
    expect(remote.examples).toContain('https://example.test/required.png');
    expect(analysis.issues.flatMap(issue=>issue.examples)).not.toContain('https://www.treccani.it/vocabolario/ciao');
    expect(analysis.cards.some(card=>card.id.includes('remote-only-guid'))).toBe(false);expect(analysis.issues.some(issue=>issue.severity==='error'&&issue.message.includes('no usable prompt'))).toBe(true);
  });
  it('preserves the authoritative imported hierarchy with stable identities',async()=>{
    const first=await analyseAnkiPackage(await warningPackage(),'first.apkg'),second=await analyseAnkiPackage(await warningPackage(),'renamed.apkg');
    const parent=first.decks.find(deck=>deck.name==='Italian Lesson')!,child=first.decks.find(deck=>deck.name==='01 Greetings')!;
    expect(child.parentId).toBe(parent.id);expect(first.cards.every(card=>card.deckId===child.id)).toBe(true);
    expect(second.decks).toEqual(first.decks.map(deck=>({...deck,description:deck.description.replace('first.apkg','renamed.apkg')})));
  });
  it('rejects collection backups and malformed archives without mutation', async () => {
    await expect(analyseAnkiPackage(await legacyPackage(), 'collection.apkg')).rejects.toThrow(/collection backup/i);
    await expect(analyseAnkiPackage(new Uint8Array([1, 2, 3]), 'bad.apkg')).rejects.toThrow(/ZIP/i);
  });
  it.each([
    ['legacy-anki21', 'e2e/fixtures/anki-26.9.3-legacy.apkg'],
    ['modern-anki21b', 'e2e/fixtures/anki-26.9.3-modern.apkg'],
  ] as const)('imports a real Anki 26.9.3 %s export', async (variant, path) => {
    const bytes = new Uint8Array(await readFile(path)); const analysis = await analyseAnkiPackage(bytes, path.split('/').at(-1)!);
    expect(analysis.variant).toBe(variant); expect(analysis.sourceNotes).toBe(5); expect(analysis.generatedCards).toBe(7);
    expect(analysis.cards.some(card => card.front.includes('città') && card.answer.includes('city'))).toBe(true);
    expect(analysis.cards.filter(card => card.notes.includes('Cloze'))).toHaveLength(2);
    expect(analysis.assets).toHaveLength(2);
    expect(analysis.cards.some(card => card.kind === 'visual' && card.image?.startsWith('asset:') && card.answer.includes('la stella'))).toBe(true);
    const audio = analysis.cards.find(card => card.answer.includes('buonasera'))!;
    expect(audio.frontAudio).toHaveLength(1); expect(audio.backAudio).toHaveLength(1);
    expect(analysis.assets.find(asset => asset.mime === 'audio/mpeg')?.dataUrl).toMatch(/^data:audio\/mpeg;base64,/);
    const schema = analysis.modelSchemas.find(model => model.name === 'HoloRecall Custom Audio')!;
    const mapped = await analyseAnkiPackage(bytes, path.split('/').at(-1)!, undefined, undefined, [{ id: 'custom-audio', version: 1, name: 'Italian audio', sourceSignature: schema.signature, modelName: schema.name, fields: { Prompt: 'front', Response: 'answer', Pronunciation: 'pronunciation', NaturalMeaning: 'meaning', Context: 'notes', QuestionSound: 'front-media', AnswerSound: 'back-media' } }]);
    const mappedAudio = mapped.cards.find(card => card.answer === 'buonasera')!;
    expect(mappedAudio.pronunciation).toBe('bwoh-nah-SEH-rah'); expect(mappedAudio.meaning).toBe('good evening'); expect(mappedAudio.notes).toContain('Used later in the day.');
  });
});
