import type { CardContent, Deck, DesignSet, LocalAsset, Rarity, State } from './models';
import { validateAsset, validateCard, validateDeck, validateDesign } from './backup';

/** Content exchange deliberately has no learner, event, schedule, reward, or session fields. */
export interface ContentBundle { decks: Deck[]; cards: CardContent[]; designs: DesignSet[]; assets: LocalAsset[] }
export interface ImportPreview {
  bundle: ContentBundle; expectedVersion: number; errors: string[];
  newCards: string[]; updatedCards: string[]; duplicateCards: string[];
  newDecks: string[]; updatedDecks: string[]; duplicateDecks: string[];
  newDesigns: string[]; updatedDesigns: string[]; duplicateDesigns: string[];
}
export const FORMAT_VERSION = '2';
export const EXCHANGE_RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'holo-rare', 'ultra-rare', 'secret-rare', 'relic'];
export const HEADERS = {
  Metadata: ['key', 'value'],
  Decks: ['deck_id', 'title', 'description', 'design_set_id', 'suspended'],
  Cards: ['card_id', 'deck_id', 'card_type', 'front_text', 'back_text', 'pronunciation', 'meaning', 'notes', 'tags', 'rarity', 'design_set_id', 'front_media', 'back_media', 'image_description', 'suspended', 'finish'],
  Designs: ['design_set_id', 'name', 'background', 'frame', 'common_frame', 'uncommon_frame', 'rare_frame', 'holo_rare_frame', 'ultra_rare_frame', 'secret_rare_frame', 'relic_frame', 'background_fit', 'background_position_x', 'background_position_y', 'frame_fit', 'credit', 'source', 'license', 'base_finish', 'rarity_finishes', 'layout', 'texture'],
  Assets: ['asset_id', 'file', 'name', 'mime', 'width', 'height', 'credit', 'source', 'license'],
} as const;
const LEGACY_HEADERS = {
  ...HEADERS,
  Cards: HEADERS.Cards.slice(0, 15),
  Designs: HEADERS.Designs.slice(0, 18),
} as const;
type SheetName = keyof typeof HEADERS;
type Tables = Record<SheetName, string[][]>;
export const MAX_FILE_BYTES = 30 * 1024 * 1024;
export const MAX_ASSET_BYTES = 5 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 60 * 1024 * 1024;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const BUNDLED_ART = new Set(['limone', 'caffe', 'casa', 'libro', 'tavolo', 'mela', 'libri', 'mani', 'sono', 'sei', 'siamo', 'ho', 'ha', 'abbiamo', 'parlo', 'parliamo', 'italian-still-life'].map(name => `/art/${name}.svg`));
const emptyBundle = (): ContentBundle => ({ decks: [], cards: [], designs: [], assets: [] });
const normalize = (value: unknown): unknown => Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== '').sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalize(item)])) : value;
export const sameContent = (first: unknown, second: unknown): boolean => JSON.stringify(normalize(first)) === JSON.stringify(normalize(second));
export function contentFromState(state: State): ContentBundle { return structuredClone({ decks: state.decks, cards: state.cards, designs: state.designs, assets: state.assets }); }
export function makePreview(bundle: ContentBundle, state: State, errors: string[] = []): ImportPreview {
  const result: ImportPreview = { bundle, expectedVersion: state.version, errors: [...errors], newCards: [], updatedCards: [], duplicateCards: [], newDecks: [], updatedDecks: [], duplicateDecks: [], newDesigns: [], updatedDesigns: [], duplicateDesigns: [] };
  for (const card of bundle.cards) {
    const old = state.cards.find(item => item.id === card.id);
    (!old ? result.newCards : sameContent({ rarity: 'common', ...old, revision: 0 }, { rarity: 'common', ...card, revision: 0 }) ? result.duplicateCards : result.updatedCards).push(card.id);
  }
  for (const deck of bundle.decks) {
    const old = state.decks.find(item => item.id === deck.id);
    (!old ? result.newDecks : sameContent(old, deck) ? result.duplicateDecks : result.updatedDecks).push(deck.id);
  }
  for (const design of bundle.designs) {
    const old = state.designs.find(item => item.id === design.id);
    (!old ? result.newDesigns : sameContent(old, design) ? result.duplicateDesigns : result.updatedDesigns).push(design.id);
  }
  return result;
}

function extension(asset: LocalAsset): string { return asset.mime === 'image/jpeg' ? 'jpg' : asset.mime === 'image/webp' ? 'webp' : 'png'; }
export function bundleTables(bundle: ContentBundle): Tables {
  return {
    Metadata: [['format_version', FORMAT_VERSION], ['content_only', 'true']],
    Decks: bundle.decks.map(deck => [deck.id, deck.name, deck.description, deck.designSetId ?? '', String(deck.suspended)]),
    Cards: bundle.cards.map(card => [card.id, card.deckId, card.kind, card.front, card.answer, card.pronunciation, card.meaning, card.notes, JSON.stringify(card.tags), card.rarity ?? 'common', card.designSetId ?? '', card.image ?? '', card.backImage ?? '', card.imageDescription ?? '', String(card.suspended), card.finish ?? '']),
    Designs: bundle.designs.map(design => [design.id, design.name, design.background ?? '', design.frame ?? '', ...EXCHANGE_RARITIES.map(rarity => design.frames?.[rarity] ?? ''), design.backgroundFit, String(design.backgroundPositionX), String(design.backgroundPositionY), design.frameFit, design.credit, design.source, design.license, design.finish ?? '', design.finishes ? JSON.stringify(design.finishes) : '', design.layout ?? '', design.texture ?? '']),
    Assets: bundle.assets.map(asset => [asset.id, `media/${asset.id}.${extension(asset)}`, asset.name, asset.mime, String(asset.width), String(asset.height), asset.credit ?? '', asset.source ?? '', asset.license ?? '']),
  };
}

export async function writeWorkbook(bundle: ContentBundle = emptyBundle()): Promise<Uint8Array> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HoloRecall';
  const tables = bundleTables(bundle);
  for (const name of Object.keys(HEADERS) as SheetName[]) {
    const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet.addRow([...HEADERS[name]]);
    // Explicit strings keep values such as =1+1, accents, and newlines literal; never create formula objects.
    for (const values of tables[name]) sheet.addRow(values.map(value => String(value)));
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF315C49' } };
    sheet.columns.forEach((column, index) => { column.width = Math.min(40, Math.max(18, HEADERS[name][index]?.length ?? 18)); });
    sheet.eachRow(row => { row.alignment = { vertical: 'top', wrapText: true }; });
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: sheet.rowCount, column: HEADERS[name].length } };
  }
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

/** Check central-directory sizes and raw names before JSZip allocates decompressed entries. */
export function inspectZip(bytes: Uint8Array): void {
  if (bytes.byteLength > MAX_FILE_BYTES) throw new Error('File exceeds the 30 MiB compressed limit.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 65557); index--) if (view.getUint32(index, true) === 0x06054b50) { end = index; break; }
  if (end < 0) throw new Error('Invalid ZIP container.');
  const count = view.getUint16(end + 10, true); let cursor = view.getUint32(end + 16, true); let total = 0;
  if (count > 1024 || count === 0 || view.getUint16(end + 4, true) !== 0 || view.getUint16(end + 6, true) !== 0) throw new Error('ZIP must be a single archive with 1–1024 entries; ZIP64 is unsupported.');
  const names = new Set<string>();
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== 0x02014b50) throw new Error('Invalid ZIP directory.');
    const size = view.getUint32(cursor + 24, true); total += size;
    if (size > MAX_FILE_BYTES || total > MAX_UNCOMPRESSED_BYTES || view.getUint16(cursor + 8, true) & 1) throw new Error('Archive is encrypted or exceeds the 60 MiB expanded limit.');
    const length = view.getUint16(cursor + 28, true);
    const name = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(cursor + 46, cursor + 46 + length));
    if (!name || name.startsWith('/') || name.includes('\\') || name.includes(':') || name.split('/').includes('..') || /[\x00-\x1f]/.test(name) || names.has(name)) throw new Error('Archive has an unsafe or duplicate file path.');
    names.add(name); cursor += 46 + length + view.getUint16(cursor + 30, true) + view.getUint16(cursor + 32, true);
  }
}

async function readTables(bytes: Uint8Array): Promise<Tables> {
  inspectZip(bytes);
  const [{ default: ExcelJS }, { default: JSZip }] = await Promise.all([import('exceljs'), import('jszip')]);
  const archive = await JSZip.loadAsync(bytes);
  for (const entry of Object.values(archive.files)) {
    if (/^xl\/(media|drawings|externalLinks)\//.test(entry.name) || /vbaProject\.bin$/i.test(entry.name)) throw new Error('Embedded worksheet images, drawings, external links and macros are unsupported. Use media references and a portable ZIP.');
    if (/^xl\/.*\.xml$/.test(entry.name)) {
      const xml = await entry.async('string');
      if (/<(?:\w+:)?(?:f|formula|formula1|formula2|definedNames)(?:\s|>)/.test(xml)) throw new Error('Formula cells and defined names are not allowed; export literal values only.');
    }
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as never);
  const result = {} as Tables;
  for (const sheet of workbook.worksheets) if (!Object.hasOwn(HEADERS, sheet.name)) throw new Error(`Unsupported worksheet: ${sheet.name}.`);
  for (const name of Object.keys(HEADERS) as SheetName[]) {
    const sheet = workbook.getWorksheet(name);
    if (!sheet) { if (['Metadata', 'Decks', 'Cards'].includes(name)) throw new Error(`Missing ${name} worksheet.`); result[name] = []; continue; }
    if (sheet.rowCount === 0 || sheet.rowCount > 5001 || sheet.columnCount > HEADERS[name].length) throw new Error(`${name}: missing headers, too many rows or unexpected columns (maximum 5,000 data rows).`);
    if (sheet.getImages().length) throw new Error('Embedded worksheet images are unsupported.');
    const rows: string[][] = [];
    sheet.eachRow({ includeEmpty: true }, (row, number) => {
      const values = HEADERS[name].map((_, index) => {
        const value = row.getCell(index + 1).value;
        if (value == null) return '';
        if (!['string', 'number', 'boolean'].includes(typeof value)) throw new Error(`${name}!${row.getCell(index + 1).address}: only literal text, numbers and booleans are supported.`);
        const text = String(value); if (text.length > 20000) throw new Error(`${name}: cell exceeds 20,000 characters.`); return text;
      });
      if (number === 1) {
        const actual = values.slice(0, sheet.columnCount);
        const current = [...HEADERS[name]], legacy = [...LEGACY_HEADERS[name]];
        const matches = (expected: readonly string[]) => actual.slice(0, expected.length).every((value, index) => value === expected[index]) && actual.slice(expected.length).every(value => value === '');
        if (!matches(current) && !matches(legacy)) throw new Error(`${name}: headers must exactly match a supported version-1 or version-2 template.`);
      }
      else if (values.some(value => value !== '')) rows.push(values);
    });
    result[name] = rows;
  }
  return result;
}

function optional(value: string | undefined): string | undefined { return value || undefined; }
function bool(value: string, label: string): boolean { if (!value || value === 'false') return false; if (value === 'true') return true; throw new Error(`${label}: use true or false.`); }
function boundedNumber(value: string, fallback: number, label: string, min = 0, max = 100): number { const result = value === '' ? fallback : Number(value); if (!Number.isFinite(result) || result < min || result > max) throw new Error(`${label}: expected a number ${min}–${max}.`); return result; }
function id(value: string, label: string): string { if (!ID_PATTERN.test(value)) throw new Error(`${label}: use 1–100 letters, digits, dots, underscores or hyphens, beginning with a letter or digit.`); return value; }
function required(value: string, label: string): string { if (!value.trim()) throw new Error(`${label} is required.`); return value; }
function validRef(ref: string | undefined, assets: Set<string>, label: string): void { if (ref && !(BUNDLED_ART.has(ref) || ref.startsWith('asset:') && assets.has(ref.slice(6)))) throw new Error(`${label}: missing or unsupported media reference "${ref}". Use a bundled /art path or an available asset:id; URLs are not bundled assets.`); }
function duplicates(items: { id: string }[], name: string): void { const ids = new Set<string>(); for (const item of items) { if (ids.has(item.id)) throw new Error(`${name}: duplicate ID ${item.id} inside this file.`); ids.add(item.id); } }

export function parseTables(tables: Tables, state: State, incomingAssets: LocalAsset[] = []): ContentBundle {
  if (tables.Metadata.length !== 2 || tables.Metadata.filter(row => row[0] === 'format_version' && ['1', FORMAT_VERSION].includes(row[1])).length !== 1 || tables.Metadata.filter(row => row[0] === 'content_only' && row[1] === 'true').length !== 1) throw new Error('Metadata must contain a supported format_version (1 or 2) and content_only=true only.');
  const bundle = emptyBundle(); bundle.assets = incomingAssets;
  bundle.decks = tables.Decks.map(([deckId, title, description, designSetId, suspended]) => ({ id: id(deckId, 'Deck ID'), name: required(title, 'Deck title'), description, designSetId: optional(designSetId), suspended: bool(suspended, 'Deck suspended') }));
  bundle.designs = tables.Designs.map(row => {
    const [designId, name, background, frame] = row;
    const backgroundFit = row[11] || 'cover'; const frameFit = row[14] || 'contain';
    if (!['contain', 'cover'].includes(backgroundFit) || !['contain', 'cover'].includes(frameFit)) throw new Error('Design fit must be contain or cover.');
    const frames: Partial<Record<Rarity, string>> = {};
    EXCHANGE_RARITIES.forEach((rarity, index) => { if (row[index + 4]) frames[rarity] = row[index + 4]; });
    let finishes: Record<string, unknown> = {};
    try { finishes = row[19] ? JSON.parse(row[19]) : {}; } catch { throw new Error(`Design ${designId}: rarity_finishes must be a JSON object.`); }
    if (!finishes || Array.isArray(finishes) || typeof finishes !== 'object') throw new Error(`Design ${designId}: rarity_finishes must be a JSON object.`);
    return { id: id(designId, 'Design ID'), name: required(name, 'Design name'), background: optional(background), frame: optional(frame), frames, backgroundFit: backgroundFit as 'cover' | 'contain', backgroundPositionX: boundedNumber(row[12], 50, 'Background X'), backgroundPositionY: boundedNumber(row[13], 50, 'Background Y'), frameFit: frameFit as 'cover' | 'contain', credit: row[15], source: row[16], license: row[17], ...(row[18] ? { finish: row[18] as DesignSet['finish'] } : {}), ...(Object.keys(finishes).length ? { finishes: finishes as DesignSet['finishes'] } : {}), ...(row[20] ? { layout: row[20] as DesignSet['layout'] } : {}), ...(row[21] ? { texture: row[21] } : {}) };
  });
  bundle.cards = tables.Cards.map(([cardId, deckId, kind, front, answer, pronunciation, meaning, notes, tags, rarity, designSetId, image, backImage, imageDescription, suspended, finish]) => {
    if (kind !== 'text' && kind !== 'visual') throw new Error(`Card ${cardId}: card_type must be text or visual.`);
    if (!EXCHANGE_RARITIES.includes((rarity || 'common') as Rarity)) throw new Error(`Card ${cardId}: unknown rarity ${rarity}.`);
    let parsedTags: unknown; try { parsedTags = tags ? JSON.parse(tags) : []; } catch { throw new Error(`Card ${cardId}: tags must be a JSON array of strings.`); }
    if (!Array.isArray(parsedTags) || parsedTags.length > 30 || parsedTags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.length > 100)) throw new Error(`Card ${cardId}: tags must be up to 30 nonempty strings of at most 100 characters.`);
    if (kind === 'visual' && (!image || !imageDescription)) throw new Error(`Card ${cardId}: visual cards need front_media and an answer-safe image_description.`);
    if (kind === 'text') required(front, `Card ${cardId} front_text`);
    return { id: id(cardId, 'Card ID'), deckId: id(deckId, 'Card deck ID'), kind, front, answer: required(answer, `Card ${cardId} back_text`), pronunciation, meaning, notes, tags: parsedTags as string[], rarity: (rarity || 'common') as Rarity, designSetId: optional(designSetId), image: optional(image), backImage: optional(backImage), imageDescription: optional(imageDescription), finish: optional(finish) as CardContent['finish'], revision: 1, suspended: bool(suspended, 'Card suspended') };
  });
  duplicates(bundle.decks, 'Decks'); duplicates(bundle.cards, 'Cards'); duplicates(bundle.designs, 'Designs'); duplicates(bundle.assets, 'Assets');
  bundle.decks.forEach(validateDeck); bundle.cards.forEach(validateCard); bundle.designs.forEach(validateDesign); bundle.assets.forEach(validateAsset);
  for (const asset of bundle.assets) {
    const existing = state.assets.find(item => item.id === asset.id);
    if (existing && (existing.dataUrl !== asset.dataUrl || existing.mime !== asset.mime || existing.width !== asset.width || existing.height !== asset.height)) throw new Error(`Asset ${asset.id} already exists with different image bytes or dimensions. Assign a new asset ID and update its references.`);
  }
  const assetIds = new Set([...state.assets, ...bundle.assets].map(asset => asset.id));
  const designIds = new Set([...state.designs, ...bundle.designs].map(design => design.id));
  const deckIds = new Set([...state.decks, ...bundle.decks].map(deck => deck.id));
  for (const row of tables.Assets) {
    id(row[0], 'Asset ID');
    if (!assetIds.has(row[0])) throw new Error(`Asset ${row[0]} is not available. Import the portable ZIP containing its media, or first upload that asset locally.`);
    const asset = [...bundle.assets, ...state.assets].find(item => item.id === row[0])!;
    if (row[3] !== asset.mime || Number(row[4]) !== asset.width || Number(row[5]) !== asset.height) throw new Error(`Asset ${row[0]} metadata does not match its media.`);
  }
  if (new Set(tables.Assets.map(row => row[0])).size !== tables.Assets.length) throw new Error('Assets contains duplicate IDs.');
  for (const item of [...bundle.decks, ...bundle.cards]) if (item.designSetId && !designIds.has(item.designSetId)) throw new Error(`Missing design set ${item.designSetId}.`);
  for (const card of bundle.cards) { if (!deckIds.has(card.deckId)) throw new Error(`Card ${card.id}: missing deck ${card.deckId}.`); validRef(card.image, assetIds, `Card ${card.id} front`); validRef(card.backImage, assetIds, `Card ${card.id} back`); }
  for (const design of bundle.designs) for (const ref of [design.background, design.frame, design.texture, ...Object.values(design.frames ?? {})]) validRef(ref, assetIds, `Design ${design.id}`);
  return bundle;
}

function bytesBase64(bytes: Uint8Array): string { let raw = ''; for (let offset = 0; offset < bytes.length; offset += 8192) raw += String.fromCharCode(...bytes.subarray(offset, offset + 8192)); return btoa(raw); }
function assetBytes(asset: LocalAsset): Uint8Array { const raw = atob(asset.dataUrl.split(',')[1] ?? ''); return Uint8Array.from(raw, char => char.charCodeAt(0)); }
export function validateImageSignature(bytes: Uint8Array, mime: string): void {
  const matches = mime === 'image/png' ? [137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value) : mime === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : mime === 'image/webp' ? new TextDecoder().decode(bytes.subarray(0,4)) === 'RIFF' && new TextDecoder().decode(bytes.subarray(8,12)) === 'WEBP' : false;
  if (!matches || bytes.length > MAX_ASSET_BYTES) throw new Error('Media must be a matching PNG, JPEG or WebP raster image of at most 5 MiB. Active SVG uploads are unsupported.');
}

export async function readContentFile(bytes: Uint8Array, filename: string, state: State): Promise<ImportPreview> {
  try {
    let tables: Tables; const incomingAssets: LocalAsset[] = []; let jsonDesigns: unknown;
    if (/\.xlsx$/i.test(filename)) tables = await readTables(bytes);
    else if (/\.zip$/i.test(filename)) {
      inspectZip(bytes); const { default: JSZip } = await import('jszip'); const zip = await JSZip.loadAsync(bytes);
      const workbook = zip.file('deck.xlsx'); if (!workbook) throw new Error('Portable ZIP requires deck.xlsx at its root.');
      tables = await readTables(await workbook.async('uint8array'));
      const definitions = zip.file('designs.json'); if (!definitions) throw new Error('Portable ZIP requires designs.json at its root.');
      const definitionsText = await definitions.async('string'); if (definitionsText.length > 1000000) throw new Error('Design definitions are too large.');
      jsonDesigns = JSON.parse(definitionsText);
      const permitted = new Set(['deck.xlsx', 'designs.json', ...tables.Assets.map(row => row[1])]);
      for (const entry of Object.values(zip.files)) if (!entry.dir && !permitted.has(entry.name)) throw new Error(`Unexpected ZIP file ${entry.name}. Only declared media, deck.xlsx and designs.json are allowed.`);
      for (const [assetId, path, name, mime, width, height, credit, source, license] of tables.Assets) {
        id(assetId, 'Asset ID'); if (!/^media\/[A-Za-z0-9][A-Za-z0-9._-]*\.(png|jpg|jpeg|webp)$/i.test(path)) throw new Error(`Unsafe media path ${path}.`);
        const entry = zip.file(path); if (!entry) throw new Error(`Missing ZIP media file ${path}.`);
        const data = await entry.async('uint8array'); validateImageSignature(data, mime);
        incomingAssets.push({ id: assetId, name: required(name, 'Asset name'), mime: mime as LocalAsset['mime'], dataUrl: `data:${mime};base64,${bytesBase64(data)}`, width: boundedNumber(width, 0, 'Image width', 1, 8192), height: boundedNumber(height, 0, 'Image height', 1, 8192), credit, source, license });
      }
    } else throw new Error('Choose a supported version-1/version-2 .xlsx workbook or portable .zip archive.');
    const bundle = parseTables(tables, state, incomingAssets);
    if (jsonDesigns !== undefined && !sameContent(jsonDesigns, bundle.designs)) throw new Error('designs.json must exactly match the workbook Designs sheet. No executable design content is allowed.');
    return makePreview(bundle, state);
  } catch (error) { return makePreview(emptyBundle(), state, [error instanceof Error ? error.message : 'Unable to read this file.']); }
}

export type Rasterize = (ref: string) => Promise<{ dataUrl: string; width: number; height: number }>;
/** Rasterize trusted app illustrations so the portable archive contains only supported inert media. */
export async function makePortableBundle(source: ContentBundle, rasterize: Rasterize): Promise<ContentBundle> {
  const bundle = structuredClone(source); const replacements = new Map<string, string>();
  const refs = [...bundle.cards.flatMap(card => [card.image, card.backImage]), ...bundle.designs.flatMap(design => [design.background, design.frame, design.texture, ...Object.values(design.frames ?? {})])].filter((ref): ref is string => !!ref && BUNDLED_ART.has(ref));
  for (const ref of new Set(refs)) {
    const rendered = await rasterize(ref); let assetId = `bundled-${ref.split('/').pop()!.replace('.svg', '')}`;
    while (bundle.assets.some(asset => asset.id === assetId && asset.dataUrl !== rendered.dataUrl)) assetId += '-copy';
    if (!bundle.assets.some(asset => asset.id === assetId)) bundle.assets.push({ id: assetId, name: ref.split('/').pop()!.replace('.svg', '.png'), mime: 'image/png', ...rendered, credit: 'HoloRecall original illustration', source: 'Bundled demonstration artwork', license: 'Original HoloRecall project artwork' });
    replacements.set(ref, `asset:${assetId}`);
  }
  const replace = (ref: string | undefined) => ref ? replacements.get(ref) ?? ref : undefined;
  bundle.cards = bundle.cards.map(card => ({ ...card, image: replace(card.image), backImage: replace(card.backImage) }));
  bundle.designs = bundle.designs.map(design => ({ ...design, background: replace(design.background), frame: replace(design.frame), texture: replace(design.texture), frames: Object.fromEntries(Object.entries(design.frames ?? {}).map(([rarity, ref]) => [rarity, replace(ref)])) }));
  return bundle;
}
export async function writePortableZip(bundle: ContentBundle): Promise<Uint8Array> {
  const { default: JSZip } = await import('jszip'); const zip = new JSZip();
  zip.file('deck.xlsx', await writeWorkbook(bundle)); zip.file('designs.json', JSON.stringify(bundle.designs, null, 2));
  for (const asset of bundle.assets) { const bytes = assetBytes(asset); validateImageSignature(bytes, asset.mime); zip.file(`media/${asset.id}.${extension(asset)}`, bytes); }
  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  // Never offer an archive that exceeds this prototype's own import boundary.
  inspectZip(bytes); return bytes;
}
