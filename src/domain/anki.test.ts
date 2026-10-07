import { beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import initSqlJs from 'sql.js';
import JSZip from 'jszip';
import { analyseAnkiPackage, plainAnkiText, previewAnkiImport, suggestedAnkiFieldTarget, suggestedRarity } from './anki';
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

async function languageMetadataPackage(answer = 'Mi chiamo'): Promise<Uint8Array> {
  const SQL = await initSqlJs(); const db = new SQL.Database();
  db.run('create table col (models text, decks text)'); db.run('create table notes (id integer, guid text, mid integer, tags text, flds text)'); db.run('create table cards (id integer, nid integer, did integer, ord integer)');
  const models = { 1: { name: 'Language-labelled prompt', type: 0, flds: [{name:'Prompt'},{name:'Language'},{name:'Pronunciation'},{name:'Italian'}], tmpls: [{name:'Italian answer',qfmt:'{{Prompt}}',afmt:'{{FrontSide}}<hr>{{Italian}}<div>{{Pronunciation}}</div>'}] } };
  db.run('insert into col values (?,?)',[JSON.stringify(models),JSON.stringify({10:{name:'Italian Lesson::02 Introductions'}})]);
  db.run('insert into notes values (?,?,?,?,?)',[100,'introductions-guid',1,'introduction',`Introduce yourself\x1fit\x1fmee KYAH-moh\x1f${answer}`]);
  db.run('insert into cards values (?,?,?,?)',[200,100,10,0]);
  const zip=new JSZip();zip.file('collection.anki2',db.export());zip.file('media','{}');db.close();return zip.generateAsync({type:'uint8array'});
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

  it('never guesses a positional answer and blocks a metadata field mapped against the answer template', async () => {
    expect(suggestedAnkiFieldTarget('Language')).toBe('ignore');
    expect(suggestedAnkiFieldTarget('Italian')).toBe('ignore');
    const bytes=await languageMetadataPackage();
    const safe=await analyseAnkiPackage(bytes,'introductions.apkg');
    expect(safe.cards[0]).toMatchObject({front:'Introduce yourself',answer:'Mi chiamo',pronunciation:'mee KYAH-moh'});
    expect(safe.cards[0]!.ankiSource?.contentProvenance).toMatchObject({front:'mapping',answer:'mapping',frontFields:['Prompt'],answerFields:['Italian']});
    const schema=safe.modelSchemas[0]!;
    const invalid={id:'language-map',version:1 as const,name:'Bad positional mapping',sourceSignature:schema.signature,modelName:schema.name,fields:{Prompt:'front',Language:'answer',Pronunciation:'pronunciation',Italian:'ignore'} as const};
    const blocked=await analyseAnkiPackage(bytes,'introductions.apkg',undefined,undefined,[invalid]);
    expect(blocked.cards).toHaveLength(0);
    expect(blocked.conversion.excluded).toBe(1);
    expect(blocked.issues.find(issue=>issue.message==='Field mapping requires review before conversion')?.examples[0]).toContain('Answer mapping does not match');

    const repaired={...invalid,name:'Reviewed mapping',fields:{Prompt:'front',Language:'ignore',Pronunciation:'pronunciation',Italian:'answer'} as const};
    const corrected=await analyseAnkiPackage(bytes,'introductions.apkg',undefined,undefined,[repaired]);
    expect(corrected.cards[0]).toMatchObject({answer:'Mi chiamo',pronunciation:'mee KYAH-moh'});
    expect(corrected.cards[0]!.ankiSource?.contentProvenance).toMatchObject({answer:'mapping',answerFields:['Italian']});
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

    const locallyEdited=structuredClone(state);locallyEdited.cards[0]!.notes+='\n\nMy local note.';locallyEdited.cards.push({...structuredClone(initial.cards[0]!),id:'anki-removed-source',ankiSource:{...initial.cards[0]!.ankiSource!,noteGuid:'removed-guid'}});
    const protectedPreview=previewAnkiImport(changed,locallyEdited,true,root);
    expect(protectedPreview.update.conflicts).toEqual([initial.cards[0]!.id]);
    expect(protectedPreview.updatedCards).toEqual([]);
    expect(protectedPreview.update.removedSourceCards).toEqual(['anki-removed-source']);
    expect(previewAnkiImport(changed,locallyEdited,false,root).updatedCards).toEqual([initial.cards[0]!.id]);

    const legacy=structuredClone(state);delete legacy.cards[0]!.ankiSource;
    const legacyPreview=previewAnkiImport(changed,legacy,true,root);
    expect(legacyPreview.update.legacyReviewRequired).toEqual([initial.cards[0]!.id]);
    expect(legacyPreview.updatedCards).toEqual([]);
  });
  it('analyses a legacy schema package as notes and generated cards, including reversed and cloze cards', async () => {
    const analysis = await analyseAnkiPackage(await legacyPackage(), 'tiny.apkg');
    expect(analysis.variant).toBe('legacy-anki2'); expect(analysis.sourceNotes).toBe(2); expect(analysis.generatedCards).toBe(3);
    expect(analysis.cards.map(card => [card.front, card.answer])).toEqual(expect.arrayContaining([['ciao', expect.stringContaining('hello')], ['hello', 'ciao'], ['[…] pronto', 'sono pronto']]));
    expect(analysis.cards.every(card => card.notes.includes('Imported source'))).toBe(true);
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
    expect(changed.cards.find(card => card.id.includes('basic-guid-0'))?.pronunciation).toBe('');
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
