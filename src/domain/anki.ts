import type { CardContent, ContentImport, Deck, LocalAsset, Rarity, State } from './models';
import { inspectZip, makePreview, type ImportPreview } from './exchange';

export type AnkiVariant = 'legacy-anki2' | 'legacy-anki21' | 'modern-anki21b';
export interface AnkiIssue { kind: 'unsupported' | 'missing-media' | 'warning'; message: string; count: number; examples: string[] }
export interface AnkiAnalysis {
  variant: AnkiVariant; sourceNotes: number; generatedCards: number; decks: Deck[]; cards: CardContent[]; assets: LocalAsset[];
  issues: AnkiIssue[]; proposedRarities: Record<Rarity, number>; packageName: string;
}
export interface AnkiProgress { stage: 'archive' | 'database' | 'content' | 'media'; percent: number }

const MAX_NOTES = 10_000, MAX_MEDIA = 1_000, MAX_CELL = 100_000;
const RARITY_BUCKETS: [number, Rarity][] = [[55, 'common'], [75, 'uncommon'], [87, 'rare'], [94, 'holo-rare'], [98, 'ultra-rare'], [99, 'secret-rare'], [100, 'relic']];
const abort = (signal?: AbortSignal) => { if (signal?.aborted) throw new DOMException('Anki import cancelled.', 'AbortError'); };
function hash(value: string): number { let result = 2166136261; for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619); return result >>> 0; }
export function suggestedRarity(identity: string): Rarity { const value = hash(identity) % 100; return RARITY_BUCKETS.find(([limit]) => value < limit)![1]; }
function stable(value: string): string { return `anki-${value.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 78)}`; }
function bytesText(bytes: Uint8Array): string { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
function varint(bytes: Uint8Array, start = 0): [number, number] { let value = 0, shift = 0, offset = start; while (offset < bytes.length && shift < 70) { const byte = bytes[offset++]!; value += (byte & 127) * 2 ** shift; if (!(byte & 128)) return [value, offset]; shift += 7; } throw new Error('Malformed protobuf metadata.'); }
function proto(bytes: Uint8Array): Map<number, (number | Uint8Array)[]> { const fields = new Map<number, (number | Uint8Array)[]>(); for (let i = 0; i < bytes.length;) { const [tag, next] = varint(bytes, i); i = next; const field = Math.floor(tag / 8), wire = tag & 7; let value: number | Uint8Array | undefined; if (wire === 0) [value, i] = varint(bytes, i); else if (wire === 2) { const [length, after] = varint(bytes, i); i = after; if (i + length > bytes.length) throw new Error('Malformed protobuf metadata.'); value = bytes.subarray(i, i + length); i += length; } else if (wire === 1) i += 8; else if (wire === 5) i += 4; else throw new Error('Unsupported protobuf wire type.'); if (i > bytes.length) throw new Error('Malformed protobuf metadata.'); if (value !== undefined) fields.set(field, [...fields.get(field) ?? [], value]); } return fields; }
function protoString(bytes: Uint8Array, field: number): string { const value = proto(bytes).get(field)?.[0]; return value instanceof Uint8Array ? bytesText(value) : ''; }
function packageVersion(meta?: Uint8Array): number { if (!meta?.length) return 0; const value = proto(meta).get(1)?.[0]; return typeof value === 'number' ? value : 0; }
function plain(input: string): string {
  return input.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&').trim();
}
function conditionals(template: string, fields: Record<string, string>): string {
  return template.replace(/{{#([^}]+)}}([\s\S]*?){{\/\1}}/g, (_, name, body) => fields[name]?.trim() ? body : '').replace(/{{\^([^}]+)}}([\s\S]*?){{\/\1}}/g, (_, name, body) => fields[name]?.trim() ? '' : body);
}
function cloze(text: string, index: number, answer: boolean): string {
  return text.replace(/{{c(\d+)::(.*?)(?:::(.*?))?}}/g, (_, number, value, hint) => Number(number) === index ? answer ? value : `[${hint || '…'}]` : value);
}
function render(template: string, fields: Record<string, string>, front: string, clozeIndex?: number, answer = false): string {
  let output = conditionals(template, fields).replace(/{{FrontSide}}/g, front);
  output = output.replace(/{{cloze:([^}]+)}}/g, (_, name) => cloze(fields[name] ?? '', clozeIndex ?? 1, answer));
  output = output.replace(/{{(?:text:|type:)?([^}:]+)}}/g, (_, name) => fields[name] ?? '');
  return plain(output.replace(/\[sound:[^\]]+]/g, ''));
}
function imageNames(html: string): string[] { return [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(match => match[1]!).filter(name => !/^https?:/i.test(name)); }
function imageSize(bytes: Uint8Array, mime: LocalAsset['mime']): { width: number; height: number } | null {
  if (mime === 'image/png' && bytes.length > 24) { const view = new DataView(bytes.buffer, bytes.byteOffset); return { width: view.getUint32(16), height: view.getUint32(20) }; }
  if (mime === 'image/webp' && bytes.length > 30 && bytesText(bytes.subarray(12, 16)) === 'VP8X') return { width: 1 + bytes[24]! + (bytes[25]! << 8) + (bytes[26]! << 16), height: 1 + bytes[27]! + (bytes[28]! << 8) + (bytes[29]! << 16) };
  if (mime === 'image/jpeg') for (let i = 2; i + 9 < bytes.length;) { if (bytes[i] !== 255) { i++; continue; } const marker = bytes[i + 1]!, length = (bytes[i + 2]! << 8) + bytes[i + 3]!; if (marker >= 192 && marker <= 195) return { height: (bytes[i + 5]! << 8) + bytes[i + 6]!, width: (bytes[i + 7]! << 8) + bytes[i + 8]! }; i += 2 + Math.max(2, length); }
  return null;
}
function mimeFor(name: string): LocalAsset['mime'] | null { return /\.png$/i.test(name) ? 'image/png' : /\.webp$/i.test(name) ? 'image/webp' : /\.jpe?g$/i.test(name) ? 'image/jpeg' : null; }
function b64(bytes: Uint8Array): string { let result = ''; for (let i = 0; i < bytes.length; i += 8192) result += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(result); }

export async function analyseAnkiPackage(bytes: Uint8Array, packageName: string, signal?: AbortSignal, progress?: (value: AnkiProgress) => void): Promise<AnkiAnalysis> {
  if (/^(collection|backup)(?:-|\.|$)/i.test(packageName)) throw new Error('This looks like a collection backup. Export the intended deck from Anki as an .apkg, then import that deck. HoloRecall never replaces a collection.');
  inspectZip(bytes); abort(signal); progress?.({ stage: 'archive', percent: 10 });
  const [{ default: JSZip }, { default: initSqlJs }] = await Promise.all([import('jszip'), import('sql.js/dist/sql-wasm-browser.js')]);
  const zip = await JSZip.loadAsync(bytes); const meta = zip.file('meta') ? await zip.file('meta')!.async('uint8array') : undefined; const version = packageVersion(meta);
  const variant: AnkiVariant = version >= 3 ? 'modern-anki21b' : zip.file('collection.anki21') ? 'legacy-anki21' : 'legacy-anki2';
  const collectionName = variant === 'modern-anki21b' ? 'collection.anki21b' : variant === 'legacy-anki21' ? 'collection.anki21' : 'collection.anki2';
  const collection = zip.file(collectionName); if (!collection) throw new Error(`Package metadata selects ${collectionName}, but that database is missing. Compatibility placeholders are not imported.`);
  let database = await collection.async('uint8array'); if (variant === 'modern-anki21b') { const { decompress } = await import('fzstd'); try { database = decompress(database); } catch { throw new Error('Modern Anki package uses unsupported or malformed zstd database compression.'); } }
  if (database.byteLength > 60 * 1024 * 1024) throw new Error('Expanded Anki database exceeds the 60 MiB limit.');
  abort(signal); progress?.({ stage: 'database', percent: 30 }); const SQL = await initSqlJs({ locateFile: () => '/runtime/sql-wasm-browser.wasm' }); const db = new SQL.Database(database);
  try {
    const tables = new Set((db.exec("select name from sqlite_master where type='table'")[0]?.values ?? []).map(row => String(row[0])));
    if (!tables.has('notes') || !tables.has('cards')) throw new Error('The selected database does not contain Anki notes and cards.');
    const modernSchema = tables.has('notetypes') && tables.has('fields') && tables.has('templates');
    const models = new Map<number, { name: string; fields: string[]; templates: { name: string; q: string; a: string }[]; cloze: boolean }>(); const deckNames = new Map<number, string>();
    if (modernSchema) {
      for (const row of db.exec('select id,name,config from notetypes')[0]?.values ?? []) { const id = Number(row[0]), config = proto(new Uint8Array(row[2] as Uint8Array)); models.set(id, { name: String(row[1]), fields: [], templates: [], cloze: config.get(1)?.[0] === 1 }); }
      for (const row of db.exec('select ntid,name,ord from fields order by ntid,ord')[0]?.values ?? []) models.get(Number(row[0]))?.fields.push(String(row[1]));
      for (const row of db.exec('select ntid,name,config from templates order by ntid,ord')[0]?.values ?? []) { const target = models.get(Number(row[0])); const config = new Uint8Array(row[2] as Uint8Array); target?.templates.push({ name: String(row[1]), q: protoString(config, 1), a: protoString(config, 2) }); }
      for (const row of db.exec('select id,name from decks')[0]?.values ?? []) deckNames.set(Number(row[0]), String(row[1]));
    } else {
      const col = db.exec('select models,decks from col limit 1')[0]?.values?.[0]; if (!col) throw new Error('Legacy Anki metadata is missing.');
      const rawModels = JSON.parse(String(col[0])), rawDecks = JSON.parse(String(col[1]));
      for (const [key, value] of Object.entries(rawModels) as [string, any][]) models.set(Number(key), { name: String(value.name ?? key), fields: (value.flds ?? []).map((field: any) => String(field.name)), templates: (value.tmpls ?? []).map((template: any) => ({ name: String(template.name ?? ''), q: String(template.qfmt ?? ''), a: String(template.afmt ?? '') })), cloze: Number(value.type) === 1 });
      for (const [key, value] of Object.entries(rawDecks) as [string, any][]) deckNames.set(Number(key), String(value.name ?? key));
    }
    const rows = db.exec('select n.id,n.guid,n.mid,n.tags,n.flds,c.id,c.did,c.ord from notes n join cards c on c.nid=n.id order by c.id')[0]?.values ?? [];
    const noteIds = new Set(rows.map(row => String(row[0]))); if (noteIds.size > MAX_NOTES) throw new Error(`Package exceeds the ${MAX_NOTES.toLocaleString()} note limit.`);
    const decks = new Map<number, Deck>(), cards: CardContent[] = [], issues: AnkiIssue[] = []; const wantedMedia = new Set<string>();
    const addIssue = (kind: AnkiIssue['kind'], message: string, example: string) => { let issue = issues.find(item => item.kind === kind && item.message === message); if (!issue) issues.push(issue = { kind, message, count: 0, examples: [] }); issue.count++; if (issue.examples.length < 3) issue.examples.push(example); };
    for (const row of rows) { abort(signal); const [noteId, guid, modelId, rawTags, rawFields, cardId, deckId, ordinal] = row; const model = models.get(Number(modelId)); if (!model) { addIssue('unsupported', 'Unknown note type', String(noteId)); continue; }
      const values = String(rawFields).split('\x1f'); if (values.some(value => value.length > MAX_CELL)) { addIssue('unsupported', 'Field exceeds 100,000 characters', String(noteId)); continue; }
      const fields = Object.fromEntries(model.fields.map((name, index) => [name, values[index] ?? ''])); const template = model.templates[Number(ordinal)] ?? model.templates[0]; if (!template) { addIssue('unsupported', 'Note type has no usable card template', model.name); continue; }
      if (/<script|on\w+\s*=|{{type:/i.test(template.q + template.a)) { addIssue('unsupported', 'Script-dependent or answer-checking template requires exclusion or manual mapping', model.name); continue; }
      const sourceMarkup = `${template.q}\n${template.a}\n${values.join('\n')}`;
      for (const match of sourceMarkup.matchAll(/\[sound:([^\]]+)]/gi)) addIssue('unsupported', 'Bundled audio is not supported in this build', match[1]!);
      for (const match of sourceMarkup.matchAll(/(?:src|href)=["'](https?:\/\/[^"']+)/gi)) addIssue('unsupported', 'Remote resources are never fetched', match[1]!);
      const clozeIndex = model.cloze ? Number(ordinal) + 1 : undefined; const front = render(template.q, fields, '', clozeIndex, false); const answer = render(template.a, fields, front, clozeIndex, true); if (!answer) { addIssue('unsupported', 'Generated card has no answer after safe conversion', model.name); continue; }
      const images = [...imageNames(template.q), ...imageNames(template.a), ...Object.values(fields).flatMap(imageNames)]; images.forEach(name => wantedMedia.add(name)); const image = images[0];
      const id = stable(`${guid}-${ordinal}`), deckKey = Number(deckId); if (!decks.has(deckKey)) decks.set(deckKey, { id: stable(`deck-${deckKey}`), name: deckNames.get(deckKey) ?? `Imported deck ${deckKey}`, description: `Imported from ${packageName}. Scheduling and review history were not imported.`, suspended: false });
      const rawMetadata = model.fields.filter(name => !front.includes(plain(fields[name] ?? '')) && !answer.includes(plain(fields[name] ?? ''))).map(name => `${name}: ${plain(fields[name] ?? '')}`).filter(line => !line.endsWith(': '));
      cards.push({ id, deckId: decks.get(deckKey)!.id, kind: image && !front ? 'visual' : 'text', front: front || `Recall from the illustration`, answer, pronunciation: '', meaning: '', notes: [`Source note ${noteId} · ${model.name} / ${template.name}`, ...rawMetadata].join('\n'), tags: String(rawTags).trim().split(/\s+/).filter(Boolean).slice(0, 30), revision: 1, suspended: false, rarity: suggestedRarity(`${guid}-${ordinal}`), ...(image ? { image: `asset:${stable(`media-${image}`)}`, backImage: `asset:${stable(`media-${image}`)}`, imageDescription: 'Imported illustration. Reveal for the answer.' } : {}) });
    }
    progress?.({ stage: 'content', percent: 65 }); abort(signal);
    const mediaEntry = zip.file('media'); let mediaMap: Record<string, string> = {}; if (mediaEntry) {
      if (variant === 'modern-anki21b') {
        try { const { decompress } = await import('fzstd'); const mediaBytes = decompress(await mediaEntry.async('uint8array')); const entries = proto(mediaBytes).get(1) ?? []; entries.forEach((entry, index) => { if (entry instanceof Uint8Array) mediaMap[String(index)] = protoString(entry, 1); }); }
        catch { addIssue('unsupported', 'Modern protobuf media map is malformed', 'media'); }
      } else { try { mediaMap = JSON.parse(await mediaEntry.async('string')); } catch { addIssue('unsupported', 'Legacy JSON media map is malformed', 'media'); } }
    }
    const assets: LocalAsset[] = []; for (const name of wantedMedia) { const key = Object.entries(mediaMap).find(([, filename]) => filename === name)?.[0], entry = key ? zip.file(key) : null, mime = mimeFor(name); if (!entry || !mime) { addIssue(mime ? 'missing-media' : 'unsupported', mime ? 'Bundled media is missing' : 'Only PNG, WebP and JPEG Anki media is currently imported', name); cards.forEach(card => { if (card.image === `asset:${stable(`media-${name}`)}`) { delete card.image; delete card.backImage; card.kind = card.front ? 'text' : 'text'; } }); continue; }
      if (assets.length >= MAX_MEDIA) throw new Error(`Package exceeds the ${MAX_MEDIA.toLocaleString()} media-file limit.`); let data = await entry.async('uint8array'); if (variant === 'modern-anki21b') { try { const { decompress } = await import('fzstd'); data = decompress(data); } catch { addIssue('unsupported', 'Modern media compression is malformed', name); continue; } } if (data.byteLength > 5 * 1024 * 1024) { addIssue('unsupported', 'Media item exceeds 5 MiB', name); continue; } const dimensions = imageSize(data, mime); if (!dimensions || dimensions.width > 4096 || dimensions.height > 4096) { addIssue('unsupported', 'Image dimensions are unsupported or exceed 4096 px', name); continue; } assets.push({ id: stable(`media-${name}`), name, mime, dataUrl: `data:${mime};base64,${b64(data)}`, ...dimensions, source: packageName, credit: 'Imported Anki package media', license: 'Source deck terms apply' }); }
    const validAssets = new Set(assets.map(asset => `asset:${asset.id}`)); cards.forEach(card => { if (card.image && !validAssets.has(card.image)) { delete card.image; delete card.backImage; card.kind = 'text'; } });
    const proposedRarities = Object.fromEntries((['common','uncommon','rare','holo-rare','ultra-rare','secret-rare','relic'] as Rarity[]).map(rarity => [rarity, cards.filter(card => card.rarity === rarity).length])) as Record<Rarity, number>;
    progress?.({ stage: 'media', percent: 100 }); return { variant, sourceNotes: noteIds.size, generatedCards: cards.length, decks: [...decks.values()], cards, assets, issues, proposedRarities, packageName };
  } finally { db.close(); }
}

export function previewAnkiImport(analysis: AnkiAnalysis, state: State, preserveLocalEdits = true): ImportPreview {
  const cards = preserveLocalEdits ? analysis.cards.filter(card => !state.cards.some(existing => existing.id === card.id)) : analysis.cards;
  const bundle: ContentImport = { decks: analysis.decks, cards, designs: [], assets: analysis.assets };
  return makePreview(bundle, state);
}
