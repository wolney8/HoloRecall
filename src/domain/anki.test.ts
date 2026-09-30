import { beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import initSqlJs from 'sql.js';
import JSZip from 'jszip';
import { analyseAnkiPackage, previewAnkiImport, suggestedRarity } from './anki';
import { createInitialState } from './study';

beforeAll(async () => {
  const wasm = await readFile('node_modules/sql.js/dist/sql-wasm-browser.wasm');
  const original = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => String(input).endsWith('/runtime/sql-wasm-browser.wasm') ? Promise.resolve(new Response(wasm, { headers: { 'content-type': 'application/wasm' } })) : original(input, init)) as typeof fetch;
});

async function legacyPackage(): Promise<Uint8Array> {
  const SQL = await initSqlJs(); const db = new SQL.Database();
  db.run('create table col (models text, decks text)'); db.run('create table notes (id integer, guid text, mid integer, tags text, flds text)'); db.run('create table cards (id integer, nid integer, did integer, ord integer)');
  const models = {
    1: { name: 'Basic (and reversed card)', type: 0, flds: [{ name: 'Front' }, { name: 'Back' }], tmpls: [{ name: 'Card 1', qfmt: '{{Front}}', afmt: '{{FrontSide}}<hr>{{Back}}' }, { name: 'Card 2', qfmt: '{{Back}}', afmt: '{{Front}}' }] },
    2: { name: 'Cloze', type: 1, flds: [{ name: 'Text' }], tmpls: [{ name: 'Cloze', qfmt: '{{cloze:Text}}', afmt: '{{cloze:Text}}' }] },
  };
  db.run('insert into col values (?,?)', [JSON.stringify(models), JSON.stringify({ 10: { name: 'Italian::Tiny' } })]);
  db.run('insert into notes values (?,?,?,?,?)', [100, 'basic-guid', 1, 'accent café', 'ciao\x1fhello']);
  db.run('insert into notes values (?,?,?,?,?)', [101, 'cloze-guid', 2, 'cloze', '{{c1::sono}} pronto']);
  db.run('insert into cards values (?,?,?,?)', [200, 100, 10, 0]); db.run('insert into cards values (?,?,?,?)', [201, 100, 10, 1]); db.run('insert into cards values (?,?,?,?)', [202, 101, 10, 0]);
  const zip = new JSZip(); zip.file('collection.anki2', db.export()); zip.file('media', '{}'); db.close(); return zip.generateAsync({ type: 'uint8array' });
}

describe('Anki content-only import', () => {
  it('analyses a legacy schema package as notes and generated cards, including reversed and cloze cards', async () => {
    const analysis = await analyseAnkiPackage(await legacyPackage(), 'tiny.apkg');
    expect(analysis.variant).toBe('legacy-anki2'); expect(analysis.sourceNotes).toBe(2); expect(analysis.generatedCards).toBe(3);
    expect(analysis.cards.map(card => [card.front, card.answer])).toEqual(expect.arrayContaining([['ciao', expect.stringContaining('hello')], ['hello', 'ciao'], ['[…] pronto', 'sono pronto']]));
    expect(analysis.cards.every(card => card.notes.includes('Source note'))).toBe(true);
  });
  it('uses stable identities and deterministic authored rarity without importing learning state', async () => {
    const first = await analyseAnkiPackage(await legacyPackage(), 'first-name.apkg'), second = await analyseAnkiPackage(await legacyPackage(), 'renamed.apkg');
    expect(second.cards.map(card => card.id)).toEqual(first.cards.map(card => card.id)); expect(suggestedRarity('basic-guid-0')).toBe(suggestedRarity('basic-guid-0'));
    const state = createInitialState([], []), preview = previewAnkiImport(first, state);
    expect(preview.bundle.cards).toHaveLength(3); expect(preview.bundle).not.toHaveProperty('events');
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
