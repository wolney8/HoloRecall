import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';
import { SEED_CARDS, SEED_DECKS } from '../app/seed';
import { createInitialState } from './study';
import { bundleTables, contentFromState, inspectZip, makePortableBundle, makePreview, parseTables, readContentFile, writePortableZip, writeWorkbook } from './exchange';
import type { ContentBundle } from './exchange';
import type { LocalAsset, State } from './models';

const state = (): State => createInitialState(SEED_DECKS, SEED_CARDS);
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aamkAAAAASUVORK5CYII=';
const asset: LocalAsset = { id: 'test-art', name: 'test.png', mime: 'image/png', dataUrl: `data:image/png;base64,${png}`, width: 1, height: 1, credit: 'Artist', source: '', license: 'Original' };
function sample(): ContentBundle {
  return {
    decks: [{ id: 'exchange-italian', name: 'Italiano: caffè e città', description: 'Prima riga\nSeconda riga', suspended: false, designSetId: 'warm-frame' }],
    cards: [{ ...SEED_CARDS[1], id: 'exchange-caffe', deckId: 'exchange-italian', front: 'Di’ “il caffè”\ncon l’articolo.', notes: '=1+1\nLiteral text stays literal.', rarity: 'secret-rare', finish: 'aurora', image: 'asset:test-art', backImage: 'asset:test-art', designSetId: 'warm-frame', tags: ['caffè', 'Due parole'] }],
    designs: [{ id: 'warm-frame', name: 'Warm frame', background: 'asset:test-art', texture: 'asset:test-art', frames: { 'secret-rare': 'asset:test-art' }, finish: 'metallic', finishes: { 'secret-rare': 'starfield' }, layout: 'ornate', backgroundFit: 'cover', backgroundPositionX: 25, backgroundPositionY: 60, frameFit: 'contain', credit: 'Artist', source: 'Local', license: 'Original' }],
    assets: [asset],
  };
}

describe('versioned content exchange', () => {
  it('ships valid downloadable workbooks and a self-contained sixteen-illustration example', async () => {
    const blank = await readContentFile(new Uint8Array(await readFile('public/downloads/holorecall-blank-v1.xlsx')), 'blank.xlsx', state());
    expect(blank.errors).toEqual([]); expect(blank.bundle.cards).toHaveLength(0);
    const example = await readContentFile(new Uint8Array(await readFile('public/downloads/holorecall-italian-v1.xlsx')), 'example.xlsx', state());
    expect(example.errors).toEqual([]); expect(example.bundle.cards).toHaveLength(16); expect(example.bundle.cards.every(card => card.image?.startsWith('/art/'))).toBe(true);
    const portable = await readContentFile(new Uint8Array(await readFile('public/downloads/holorecall-italian-v1.zip')), 'portable.zip', state());
    expect(portable.errors).toEqual([]); expect(portable.bundle.assets).toHaveLength(16); expect(portable.bundle.cards.every(card => card.image?.startsWith('asset:'))).toBe(true);
  });
  it('exports only content and identifies unchanged cards by stable IDs, ignoring revision', async () => {
    const data = state(); const bundle = contentFromState(data); bundle.cards[0].revision += 4;
    const preview = await readContentFile(await writeWorkbook(bundle), 'deck.xlsx', data);
    expect(preview.errors).toEqual([]); expect(preview.duplicateCards).toHaveLength(16); expect(preview.updatedCards).toEqual([]);
    expect(Object.keys(preview.bundle).sort()).toEqual(['assets', 'cards', 'decks', 'designs']);
  });
  it('round trips accented, multiline, literal formula-looking text, rarity, design settings and image bytes through ZIP', async () => {
    const original = sample(); const preview = await readContentFile(await writePortableZip(original), 'deck.zip', state());
    expect(preview.errors).toEqual([]); expect(preview.newCards).toEqual(['exchange-caffe']);
    expect(preview.bundle.cards[0]).toEqual(original.cards[0]); expect(preview.bundle.designs).toEqual(original.designs);
    expect(preview.bundle.assets).toEqual(original.assets); expect(preview.bundle.decks).toEqual(original.decks);
  });
  it('preserves repeated tags already permitted by the card editor', async () => {
    const data = state(); const bundle = contentFromState(data); bundle.cards[0].tags = ['Verbs', 'Verbs'];
    const preview = await readContentFile(await writeWorkbook(bundle), 'deck.xlsx', data);
    expect(preview.errors).toEqual([]); expect(preview.bundle.cards[0].tags).toEqual(['Verbs', 'Verbs']);
  });
  it('rejects missing workbook media while allowing already-local references', async () => {
    const bytes = await writeWorkbook(sample());
    expect((await readContentFile(bytes, 'deck.xlsx', state())).errors[0]).toContain('not available');
    const local = state(); local.assets = [asset];
    expect((await readContentFile(bytes, 'deck.xlsx', local)).errors).toEqual([]);
  });
  it('rejects formula cells and defined names without executing them', async () => {
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await writeWorkbook(contentFromState(state())) as never);
    workbook.getWorksheet('Cards')!.getCell('E2').value = { formula: 'HYPERLINK("https://invalid.example", "answer")', result: 'answer' };
    expect((await readContentFile(new Uint8Array(await workbook.xlsx.writeBuffer()), 'deck.xlsx', state())).errors[0]).toContain('Formula');
    workbook.getWorksheet('Cards')!.getCell('E2').value = 'answer'; workbook.definedNames.add('Cards!$E$2', 'Untrusted');
    expect((await readContentFile(new Uint8Array(await workbook.xlsx.writeBuffer()), 'deck.xlsx', state())).errors[0]).toContain('defined names');
  });
  it('explicitly rejects embedded worksheet images', async () => {
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await writeWorkbook(contentFromState(state())) as never);
    const imageId = workbook.addImage({ base64: asset.dataUrl, extension: 'png' }); workbook.getWorksheet('Cards')!.addImage(imageId, 'A1:B2');
    expect((await readContentFile(new Uint8Array(await workbook.xlsx.writeBuffer()), 'deck.xlsx', state())).errors[0]).toContain('Embedded worksheet images');
  });
  it.each([
    ['rarity', (tables: ReturnType<typeof bundleTables>) => { tables.Cards[0][9] = 'legendary'; }, 'unknown rarity'],
    ['card type', (tables: ReturnType<typeof bundleTables>) => { tables.Cards[0][2] = 'executable'; }, 'card_type'],
    ['missing deck', (tables: ReturnType<typeof bundleTables>) => { tables.Cards[0][1] = 'missing-deck'; }, 'missing deck'],
    ['missing answer', (tables: ReturnType<typeof bundleTables>) => { tables.Cards[0][4] = ''; }, 'required'],
    ['duplicate IDs', (tables: ReturnType<typeof bundleTables>) => { tables.Cards[1][0] = tables.Cards[0][0]; }, 'duplicate ID'],
    ['URL reference', (tables: ReturnType<typeof bundleTables>) => { tables.Cards[0][11] = 'https://example.org/image.png'; }, 'invalid media reference'],
    ['unknown bundled asset', (tables: ReturnType<typeof bundleTables>) => { tables.Cards[0][11] = '/art/missing.svg'; }, 'missing or unsupported'],
    ['malformed tags', (tables: ReturnType<typeof bundleTables>) => { tables.Cards[0][8] = 'one,two'; }, 'JSON array'],
  ])('rejects %s before applying', (_, alter, message) => {
    const tables = bundleTables(contentFromState(state())); alter(tables);
    expect(() => parseTables(tables, state())).toThrow(message);
  });
  it('blocks mismatched or executable design definitions in ZIP', async () => {
    const zip = await JSZip.loadAsync(await writePortableZip(sample())); zip.file('designs.json', '[{"script":"alert(1)"}]');
    expect((await readContentFile(await zip.generateAsync({ type: 'uint8array' }), 'test.zip', state())).errors[0]).toContain('exactly match');
  });
  it('blocks active SVG and mismatched image signatures in a portable ZIP', async () => {
    const zip = await JSZip.loadAsync(await writePortableZip(sample())); zip.file('media/test-art.png', '<svg onload="alert(1)"></svg>');
    expect((await readContentFile(await zip.generateAsync({ type: 'uint8array' }), 'test.zip', state())).errors[0]).toContain('raster image');
  });
  it('rejects archive traversal paths and oversized expanded entries before decompression', async () => {
    const zip = new JSZip(); zip.file('../escape.txt', 'bad');
    expect(() => inspectZip(Uint8Array.from([]))).toThrow('Invalid ZIP');
    const bytes = await zip.generateAsync({ type: 'uint8array' }); expect(() => inspectZip(bytes)).toThrow('unsafe');
    const ordinary = new JSZip(); ordinary.file('file', 'data'); const expanded = await ordinary.generateAsync({ type: 'uint8array' });
    const view = new DataView(expanded.buffer); for (let index = 0; index < expanded.length - 46; index++) if (view.getUint32(index, true) === 0x02014b50) { view.setUint32(index + 24, 100 * 1024 * 1024, true); break; }
    expect(() => inspectZip(expanded)).toThrow('expanded limit');
  });
  it('keeps new/update/duplicate previews distinct and bound to inspected state version', () => {
    const data = state(); data.version = 12; const bundle = contentFromState(data); bundle.cards[0].answer = 'updated answer'; bundle.cards.push({ ...bundle.cards[1], id: 'new-card' });
    const preview = makePreview(bundle, data); expect(preview.expectedVersion).toBe(12); expect(preview.updatedCards).toEqual([SEED_CARDS[0].id]); expect(preview.newCards).toEqual(['new-card']); expect(preview.duplicateCards).toHaveLength(15);
  });
  it('rasterizes each bundled source once and reuses durable asset references', async () => {
    const original = contentFromState(state()); original.cards = [original.cards[0], { ...original.cards[0], id: 'second', backImage: original.cards[0].image }];
    const calls: string[] = []; const portable = await makePortableBundle(original, async ref => { calls.push(ref); return { dataUrl: asset.dataUrl, width: 1, height: 1 }; });
    expect(calls).toHaveLength(1); expect(portable.assets).toHaveLength(1); expect(portable.cards[0].image).toBe('asset:bundled-limone'); expect(portable.cards[1].backImage).toBe('asset:bundled-limone'); expect(original.cards[0].image).toBe('/art/limone.svg');
  });
});
