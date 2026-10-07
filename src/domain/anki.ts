import type { AnkiFieldTarget, AnkiMappingPreset, CardContent, ContentImport, Deck, LocalAsset, Rarity, State } from './models';
import { inspectZip, makePreview, type ImportPreview } from './exchange';

export type AnkiVariant = 'legacy-anki2' | 'legacy-anki21' | 'modern-anki21b';
export type AnkiIssueSeverity = 'error' | 'warning' | 'info';
export interface AnkiIssue { severity: AnkiIssueSeverity; kind: 'unsupported' | 'missing-media' | 'simplification' | 'remote-dependency'; message: string; count: number; occurrences: number; examples: string[]; cardIds: string[] }
export interface AnkiModelSchema { signature: string; name: string; fields: string[]; templates: string[]; cloze: boolean }
export interface AnkiAnalysis {
  variant: AnkiVariant; sourceNotes: number; generatedCards: number; decks: Deck[]; cards: CardContent[]; assets: LocalAsset[];
  issues: AnkiIssue[]; conversion: { normal: number; simplified: number; excluded: number; unsafe: number }; proposedRarities: Record<Rarity, number>; packageName: string; modelSchemas: AnkiModelSchema[];
}
export type AnkiStage = 'archive' | 'database' | 'content' | 'media';
export interface AnkiProgress { stage: AnkiStage; label: string; completed?: number; total?: number }

const MAX_NOTES = 10_000, MAX_CARDS = 25_000, MAX_MEDIA = 1_000, MAX_CELL = 100_000;
const MAX_DATABASE_BYTES = 60 * 1024 * 1024, MAX_MEDIA_BYTES = 5 * 1024 * 1024;
const RARITY_BUCKETS: [number, Rarity][] = [[55, 'common'], [75, 'uncommon'], [87, 'rare'], [94, 'holo-rare'], [98, 'ultra-rare'], [99, 'secret-rare'], [100, 'relic']];
const abort = (signal?: AbortSignal) => { if (signal?.aborted) throw new DOMException('Anki import cancelled.', 'AbortError'); };
function hash(value: string): number { let result = 2166136261; for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619); return result >>> 0; }
function hashBytes(value: Uint8Array): number { let result = 2166136261; for (const byte of value) result = Math.imul(result ^ byte, 16777619); return result >>> 0; }
export function suggestedRarity(identity: string): Rarity { const value = hash(identity) % 100; return RARITY_BUCKETS.find(([limit]) => value < limit)![1]; }
function stable(value: string): string { return `anki-${value.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 78)}`; }
function bytesText(bytes: Uint8Array): string { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
function varint(bytes: Uint8Array, start = 0): [number, number] { let value = 0, shift = 0, offset = start; while (offset < bytes.length && shift < 70) { const byte = bytes[offset++]!; value += (byte & 127) * 2 ** shift; if (!(byte & 128)) return [value, offset]; shift += 7; } throw new Error('Malformed protobuf metadata.'); }
function proto(bytes: Uint8Array): Map<number, (number | Uint8Array)[]> { const fields = new Map<number, (number | Uint8Array)[]>(); for (let i = 0; i < bytes.length;) { const [tag, next] = varint(bytes, i); i = next; const field = Math.floor(tag / 8), wire = tag & 7; let value: number | Uint8Array | undefined; if (wire === 0) [value, i] = varint(bytes, i); else if (wire === 2) { const [length, after] = varint(bytes, i); i = after; if (i + length > bytes.length) throw new Error('Malformed protobuf metadata.'); value = bytes.subarray(i, i + length); i += length; } else if (wire === 1) i += 8; else if (wire === 5) i += 4; else throw new Error('Unsupported protobuf wire type.'); if (i > bytes.length) throw new Error('Malformed protobuf metadata.'); if (value !== undefined) fields.set(field, [...fields.get(field) ?? [], value]); } return fields; }
function protoString(bytes: Uint8Array, field: number): string { const value = proto(bytes).get(field)?.[0]; return value instanceof Uint8Array ? bytesText(value) : ''; }
function packageVersion(meta?: Uint8Array): number { if (!meta?.length) return 0; const value = proto(meta).get(1)?.[0]; return typeof value === 'number' ? value : 0; }
export function plainAnkiText(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(?:address|article|aside|blockquote|div|dl|dt|dd|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tbody|thead|tfoot|tr|ul)\b[^>]*>/gi, '\n')
    .replace(/<\/?(?:td|th)\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .split('\n').map(line => line.replace(/[\t ]+/g, ' ').trim()).filter(Boolean).join('\n');
}
function conditionals(template: string, fields: Record<string, string>): string { return template.replace(/{{#([^}]+)}}([\s\S]*?){{\/\1}}/g, (_, name, body) => fields[name]?.trim() ? body : '').replace(/{{\^([^}]+)}}([\s\S]*?){{\/\1}}/g, (_, name, body) => fields[name]?.trim() ? '' : body); }
function cloze(text: string, index: number, answer: boolean): string { return text.replace(/{{c(\d+)::(.*?)(?:::(.*?))?}}/g, (_, number, value, hint) => Number(number) === index ? answer ? value : `[${hint || '…'}]` : value); }
function renderMarkup(template: string, fields: Record<string, string>, front: string, clozeIndex?: number, answer = false): string {
  let output = conditionals(template, fields).replace(/{{FrontSide}}/g, front)
    .replace(/\[anki:tts[^\]]*]([\s\S]*?)\[\/anki:tts]/gi, '$1')
    .replace(/{{tts(?:\s+[^}:]+)*:([^}]+)}}/gi, (_, name) => fields[String(name).trim()] ?? '')
    .replace(/{{(?:hint|furigana|kana|kanji):([^}]+)}}/gi, (_, name) => fields[String(name).trim()] ?? '')
    .replace(/{{type:([^}]+)}}/gi, (_, name) => answer ? fields[String(name).trim()] ?? '' : '')
    .replace(/{{tts-voices:[^}]*}}/gi, '');
  output = output.replace(/{{cloze:([^}]+)}}/g, (_, name) => cloze(fields[name] ?? '', clozeIndex ?? 1, answer));
  return output.replace(/{{(?:text:|type:)?([^}:]+)}}/g, (_, name) => fields[name] ?? '');
}
function render(template: string, fields: Record<string, string>, front: string, clozeIndex?: number, answer = false): string { return plainAnkiText(renderMarkup(template, fields, front, clozeIndex, answer).replace(/\[sound:[^\]]+]/g, '')); }
function mediaNames(markup: string, type: 'image' | 'audio'): string[] {
  const found = type === 'audio' ? [...markup.matchAll(/\[sound:([^\]]+)]/gi)].map(match => match[1]!) : [...markup.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(match => match[1]!);
  return [...new Set(found.filter(name => !/^https?:/i.test(name)).map(name => { try { return decodeURIComponent(name); } catch { return name; } }))];
}
function imageSize(bytes: Uint8Array, mime: LocalAsset['mime']): { width: number; height: number } | null {
  if (mime === 'image/png' && bytes.length > 24) { const view = new DataView(bytes.buffer, bytes.byteOffset); return { width: view.getUint32(16), height: view.getUint32(20) }; }
  if (mime === 'image/webp' && bytes.length > 30 && bytesText(bytes.subarray(12, 16)) === 'VP8X') return { width: 1 + bytes[24]! + (bytes[25]! << 8) + (bytes[26]! << 16), height: 1 + bytes[27]! + (bytes[28]! << 8) + (bytes[29]! << 16) };
  if (mime === 'image/jpeg') for (let i = 2; i + 9 < bytes.length;) { if (bytes[i] !== 255) { i++; continue; } const marker = bytes[i + 1]!, length = (bytes[i + 2]! << 8) + bytes[i + 3]!; if (marker >= 192 && marker <= 195) return { height: (bytes[i + 5]! << 8) + bytes[i + 6]!, width: (bytes[i + 7]! << 8) + bytes[i + 8]! }; i += 2 + Math.max(2, length); }
  return null;
}
function mimeFor(name: string): LocalAsset['mime'] | null { return /\.png$/i.test(name) ? 'image/png' : /\.webp$/i.test(name) ? 'image/webp' : /\.jpe?g$/i.test(name) ? 'image/jpeg' : /\.mp3$/i.test(name) ? 'audio/mpeg' : /\.wav$/i.test(name) ? 'audio/wav' : null; }
function ascii(bytes: Uint8Array, offset: number, value: string): boolean {
  return value.length <= bytes.length - offset && [...value].every((character, index) => bytes[offset + index] === character.charCodeAt(0));
}
function audioSignature(bytes: Uint8Array, mime: LocalAsset['mime']): boolean {
  return mime === 'audio/mpeg'
    ? ascii(bytes, 0, 'ID3') || bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0
    : mime === 'audio/wav' && ascii(bytes, 0, 'RIFF') && ascii(bytes, 8, 'WAVE');
}
function b64(bytes: Uint8Array): string { let result = ''; for (let i = 0; i < bytes.length; i += 8192) result += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(result); }
async function decompressBounded(input: Uint8Array, limit: number): Promise<Uint8Array> {
  const { Decompress } = await import('fzstd'); const chunks: Uint8Array[] = []; let total = 0;
  const decoder = new Decompress(chunk => { total += chunk.byteLength; if (total > limit) throw new Error(`Expanded zstd data exceeds the ${Math.floor(limit / 1024 / 1024)} MiB limit.`); chunks.push(chunk.slice()); });
  for (let offset = 0; offset < input.length; offset += 64 * 1024) decoder.push(input.subarray(offset, offset + 64 * 1024), offset + 64 * 1024 >= input.length);
  const output = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; } return output;
}
function modelSignature(model: { fields: string[]; templates: { name: string; q: string; a: string }[]; cloze: boolean }): string { return `anki-model-v1-${hash(JSON.stringify({ cloze: model.cloze, fields: model.fields, templates: model.templates })).toString(16)}`; }
function mappedValue(mapping: AnkiMappingPreset | undefined, target: AnkiFieldTarget, fields: Record<string, string>): string { const name = Object.entries(mapping?.fields ?? {}).find(([, value]) => value === target)?.[0]; return name ? fields[name] ?? '' : ''; }

export async function analyseAnkiPackage(bytes: Uint8Array, packageName: string, signal?: AbortSignal, progress?: (value: AnkiProgress) => void, mappings: AnkiMappingPreset[] = [], wasmUrl = '/runtime/sql-wasm-browser.wasm'): Promise<AnkiAnalysis> {
  if (/^(collection|backup)(?:-|\.|$)/i.test(packageName)) throw new Error('This looks like a collection backup. Export the intended deck from Anki as an .apkg, then import that deck. HoloRecall never replaces a collection.');
  inspectZip(bytes); abort(signal); progress?.({ stage: 'archive', label: 'Opening archive' });
  const [{ default: JSZip }, { default: initSqlJs }] = await Promise.all([import('jszip'), import('sql.js/dist/sql-wasm-browser.js')]);
  const zip = await JSZip.loadAsync(bytes); const meta = zip.file('meta') ? await zip.file('meta')!.async('uint8array') : undefined; const version = packageVersion(meta);
  const variant: AnkiVariant = version >= 3 ? 'modern-anki21b' : zip.file('collection.anki21') ? 'legacy-anki21' : 'legacy-anki2';
  const collectionName = variant === 'modern-anki21b' ? 'collection.anki21b' : variant === 'legacy-anki21' ? 'collection.anki21' : 'collection.anki2';
  const collection = zip.file(collectionName); if (!collection) throw new Error(`Package metadata selects ${collectionName}, but that database is missing. Compatibility placeholders are not imported.`);
  let database = await collection.async('uint8array'); if (variant === 'modern-anki21b') { try { database = await decompressBounded(database, MAX_DATABASE_BYTES); } catch { throw new Error('Modern Anki package uses unsupported, malformed or oversized zstd database compression.'); } }
  if (database.byteLength > MAX_DATABASE_BYTES) throw new Error('Expanded Anki database exceeds the 60 MiB limit.');
  abort(signal); progress?.({ stage: 'database', label: 'Reading collection database' }); const SQL = await initSqlJs({ locateFile: () => wasmUrl }); const db = new SQL.Database(database);
  try {
    const tables = new Set((db.exec("select name from sqlite_master where type='table'")[0]?.values ?? []).map(row => String(row[0]))); if (!tables.has('notes') || !tables.has('cards')) throw new Error('The selected database does not contain Anki notes and cards.');
    const noteCount = Number(db.exec('select count(*) from notes')[0]?.values?.[0]?.[0] ?? 0), cardCount = Number(db.exec('select count(*) from cards')[0]?.values?.[0]?.[0] ?? 0);
    if (noteCount > MAX_NOTES) throw new Error(`Package exceeds the ${MAX_NOTES.toLocaleString()} note limit.`); if (cardCount > MAX_CARDS) throw new Error(`Package exceeds the ${MAX_CARDS.toLocaleString()} generated-card limit.`);
    const modernSchema = tables.has('notetypes') && tables.has('fields') && tables.has('templates');
    const models = new Map<number, { name: string; fields: string[]; templates: { name: string; q: string; a: string }[]; cloze: boolean; signature?: string }>(), deckNames = new Map<number, string>();
    if (modernSchema) {
      for (const row of db.exec('select id,name,config from notetypes')[0]?.values ?? []) { const id = Number(row[0]), config = proto(new Uint8Array(row[2] as Uint8Array)); models.set(id, { name: String(row[1]), fields: [], templates: [], cloze: config.get(1)?.[0] === 1 }); }
      for (const row of db.exec('select ntid,name,ord from fields order by ntid,ord')[0]?.values ?? []) models.get(Number(row[0]))?.fields.push(String(row[1]));
      for (const row of db.exec('select ntid,name,config from templates order by ntid,ord')[0]?.values ?? []) { const target = models.get(Number(row[0])); const config = new Uint8Array(row[2] as Uint8Array); target?.templates.push({ name: String(row[1]), q: protoString(config, 1), a: protoString(config, 2) }); }
      for (const row of db.exec('select id,name from decks')[0]?.values ?? []) deckNames.set(Number(row[0]), String(row[1]));
    } else {
      const col = db.exec('select models,decks from col limit 1')[0]?.values?.[0]; if (!col) throw new Error('Legacy Anki metadata is missing.'); const rawModels = JSON.parse(String(col[0])), rawDecks = JSON.parse(String(col[1]));
      for (const [key, value] of Object.entries(rawModels) as [string, any][]) models.set(Number(key), { name: String(value.name ?? key), fields: (value.flds ?? []).map((field: any) => String(field.name)), templates: (value.tmpls ?? []).map((template: any) => ({ name: String(template.name ?? ''), q: String(template.qfmt ?? ''), a: String(template.afmt ?? '') })), cloze: Number(value.type) === 1 });
      for (const [key, value] of Object.entries(rawDecks) as [string, any][]) deckNames.set(Number(key), String(value.name ?? key));
    }
    for (const model of models.values()) model.signature = modelSignature(model);
    const modelSchemas = [...models.values()].map(model => ({ signature: model.signature!, name: model.name, fields: [...model.fields], templates: model.templates.map(template => template.name), cloze: model.cloze }));
    const rows = db.exec('select n.id,n.guid,n.mid,n.tags,n.flds,c.id,c.did,c.ord from notes n join cards c on c.nid=n.id order by c.id limit 25001')[0]?.values ?? []; if (rows.length > MAX_CARDS) throw new Error(`Package exceeds the ${MAX_CARDS.toLocaleString()} generated-card limit.`);
    const decks = new Map<number, Deck>(), deckList = new Map<string,Deck>(), cards: CardContent[] = [], issues: AnkiIssue[] = []; const wantedMedia = new Set<string>(), simplifiedCards=new Set<string>(), excludedCards=new Set<string>(), unsafeCards=new Set<string>();
    const ensureDeck=(deckKey:number):Deck=>{const existing=decks.get(deckKey);if(existing)return existing;const fullName=deckNames.get(deckKey)??`Imported deck ${deckKey}`,segments=fullName.split('::').map(value=>value.trim()).filter(Boolean);let parentId:string|undefined,leaf:Deck|undefined;for(let index=0;index<segments.length;index++){const path=segments.slice(0,index+1).join('::'),source=[...deckNames.entries()].find(([,name])=>name===path)?.[0],id=source===undefined?stable(`deck-path-${path}`):stable(`deck-${source}`);leaf=deckList.get(id)??{id,name:segments[index]!,description:index===segments.length-1?`Imported from ${packageName}. Scheduling and review history were not imported.`:'Imported deck group.',suspended:false,...(parentId?{parentId}:{})};deckList.set(id,leaf);parentId=id;}decks.set(deckKey,leaf!);return leaf!;};
    const addIssue = (severity:AnkiIssueSeverity,kind: AnkiIssue['kind'], message: string, example: string, cardId?:string) => { let issue = issues.find(item => item.severity===severity&&item.kind === kind && item.message === message); if (!issue) issues.push(issue = { severity,kind, message, count: 0,occurrences:0, examples: [],cardIds:[] }); issue.occurrences++;if(cardId&&!issue.cardIds.includes(cardId))issue.cardIds.push(cardId);issue.count=issue.cardIds.length||issue.occurrences; if (issue.examples.length < 3&&!issue.examples.includes(example)) issue.examples.push(example); };
    progress?.({ stage: 'content', label: 'Converting cards', completed: 0, total: rows.length });
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) { abort(signal); const row = rows[rowIndex]!; const [noteId, guid, modelId, rawTags, rawFields, _cardId, deckId, ordinal] = row,id=stable(`${guid}-${ordinal}`); const model = models.get(Number(modelId)); if (!model) { excludedCards.add(id);addIssue('error','unsupported', 'Unknown note type', String(noteId),id); continue; }
      const values = String(rawFields).split('\x1f'); if (values.some(value => value.length > MAX_CELL)) { excludedCards.add(id);addIssue('error','unsupported', 'Field exceeds 100,000 characters', String(noteId),id); continue; }
      const fields = Object.fromEntries(model.fields.map((name, index) => [name, values[index] ?? ''])), mapping = mappings.find(item => item.sourceSignature === model.signature);
      const template = model.cloze ? model.templates[0] : model.templates[Number(ordinal)]; if (!template) { excludedCards.add(id);addIssue('error','unsupported', 'Card references an unavailable template ordinal', `${model.name} / ${ordinal}`,id); continue; }
      const unsafe = /<script|on\w+\s*=/i.test(template.q + template.a), mappedFront = plainAnkiText(mappedValue(mapping, 'front', fields)), mappedAnswer = plainAnkiText(mappedValue(mapping, 'answer', fields));
      if (unsafe && !(mappedFront && mappedAnswer)) { unsafeCards.add(id);addIssue('error','unsupported', 'Script-dependent or answer-checking template requires explicit safe field mapping', model.name,id); continue; }
      const clozeIndex = model.cloze ? Number(ordinal) + 1 : undefined, frontMarkup = unsafe ? mappedFront : renderMarkup(template.q, fields, '', clozeIndex, false), backTemplate = template.a.replace(/{{FrontSide}}/g, ''), backMarkup = unsafe ? mappedAnswer : renderMarkup(backTemplate, fields, '', clozeIndex, true);
      let front = model.cloze ? render(template.q, fields, '', clozeIndex, false) : mappedFront || render(template.q, fields, '', undefined, false), answer = model.cloze ? render(template.a, fields, front, clozeIndex, true) : mappedAnswer || render(template.a, fields, front, undefined, true);
      if (!model.cloze && mappedFront && mappedAnswer && plainAnkiText(frontMarkup).includes(mappedAnswer) && !plainAnkiText(frontMarkup).includes(mappedFront)) [front, answer] = [mappedAnswer, mappedFront];
      if (!answer) { excludedCards.add(id);addIssue('error','unsupported', 'Generated card has no answer after safe conversion', model.name,id); continue; }
      if (/{{(?:tts\b|(?:hint|furigana|kana|kanji|type):)|\[anki:tts/i.test(template.q + template.a)) {simplifiedCards.add(id);addIssue('info','simplification', 'Anki TTS, answer input or advanced field filters were reduced to learning text', `${model.name} / ${template.name}`,id);}
      const remoteMarkup=`${template.q}\n${template.a}\n${values.join('\n')}`;
      if(/<a\b[^>]*href=["'][^"']+["']/i.test(remoteMarkup)){simplifiedCards.add(id);addIssue('info','simplification','Hyperlinks were reduced to inert link text',`${model.name} / ${template.name}`,id);}
      for (const match of remoteMarkup.matchAll(/<(?:img|audio|video|source|script|link)\b[^>]*(?:src|href)=["'](https?:\/\/[^"']+)/gi)){simplifiedCards.add(id);addIssue('warning','remote-dependency','Remote media, scripts and fonts are not fetched',match[1]!,id);}
      const mappedFrontMedia = mappedValue(mapping, 'front-media', fields), mappedBackMedia = mappedValue(mapping, 'back-media', fields);
      const frontImages = mediaNames(`${frontMarkup}\n${mappedFrontMedia}`, 'image'), backImages = mediaNames(`${backMarkup}\n${mappedBackMedia}`, 'image'), frontAudioNames = mediaNames(`${frontMarkup}\n${mappedFrontMedia}`, 'audio'), backAudioNames = mediaNames(`${backMarkup}\n${mappedBackMedia}`, 'audio');
      if(!front&&!frontImages.length&&!frontAudioNames.length){simplifiedCards.delete(id);excludedCards.add(id);addIssue('error','unsupported','Generated card has no usable prompt after safe conversion',`${model.name} / ${template.name}`,id);continue;}
      [...frontImages, ...backImages, ...frontAudioNames, ...backAudioNames].forEach(name => wantedMedia.add(name));
      const deckKey = Number(deckId), importedDeck=ensureDeck(deckKey);
      const mappedNames = new Set(Object.entries(mapping?.fields ?? {}).filter(([, target]) => target !== 'ignore').map(([name]) => name));
      const rawMetadata = model.fields.filter(name => !mappedNames.has(name) && !front.includes(plainAnkiText(fields[name] ?? '')) && !answer.includes(plainAnkiText(fields[name] ?? ''))).map(name => `${name}: ${plainAnkiText(fields[name] ?? '')}`).filter(line => !line.endsWith(': '));
      const mappedNotes = plainAnkiText(mappedValue(mapping, 'notes', fields)), image = frontImages[0], backImage = backImages[0] ?? image;
      cards.push({ id, deckId: importedDeck.id,siblingGroupId:stable(`note-${guid}`), kind: image && !front ? 'visual' : 'text', front: front || 'Recall from the illustration', answer, pronunciation: plainAnkiText(mappedValue(mapping, 'pronunciation', fields)), meaning: plainAnkiText(mappedValue(mapping, 'meaning', fields)), notes: [`Source note ${noteId} · ${model.name} / ${template.name}`, ...(mappedNotes ? [mappedNotes] : []), ...rawMetadata].join('\n'), tags: String(rawTags).trim().split(/\s+/).filter(Boolean).slice(0, 30), revision: 1, suspended: false, rarity: suggestedRarity(`${guid}-${ordinal}`), ...(image ? { image: `pending:${image}`, backImage: `pending:${backImage}`, imageDescription: 'Imported illustration. Reveal for the answer.' } : {}), ...(frontAudioNames.length ? { frontAudio: frontAudioNames.map(name => `pending:${name}`) } : {}), ...(backAudioNames.length ? { backAudio: backAudioNames.map(name => `pending:${name}`) } : {}) });
      if (rowIndex % 100 === 0 || rowIndex === rows.length - 1) progress?.({ stage: 'content', label: 'Converting cards', completed: rowIndex + 1, total: rows.length });
    }
    abort(signal); const mediaEntry = zip.file('media'); let mediaMap: Record<string, string> = {}; if (mediaEntry) {
      if (variant === 'modern-anki21b') { try { const entries = proto(await decompressBounded(await mediaEntry.async('uint8array'), 4 * 1024 * 1024)).get(1) ?? []; entries.forEach((entry, index) => { if (!(entry instanceof Uint8Array)) return; const fields = proto(entry), legacy = fields.get(255)?.[0]; mediaMap[String(legacy instanceof Uint8Array ? bytesText(legacy) : typeof legacy === 'number' ? legacy : index)] = protoString(entry, 1); }); } catch { addIssue('warning','missing-media', 'Modern protobuf media map is malformed or oversized', 'media'); } }
      else { try { mediaMap = JSON.parse(await mediaEntry.async('string')); } catch { addIssue('warning','missing-media', 'Legacy JSON media map is malformed', 'media'); } }
    }
    const assets: LocalAsset[] = [], resolved = new Map<string, string>(); let mediaIndex = 0; progress?.({ stage: 'media', label: 'Indexing bundled media', completed: 0, total: wantedMedia.size });
    const cardsUsing=(name:string)=>cards.filter(card=>[card.image,card.backImage,...card.frontAudio??[],...card.backAudio??[]].includes(`pending:${name}`));
    const mediaIssue=(message:string,name:string)=>{for(const card of cardsUsing(name)){simplifiedCards.add(card.id);addIssue('warning','missing-media',message,name,card.id);}};
    for (const name of wantedMedia) { abort(signal); const key = Object.entries(mediaMap).find(([, filename]) => filename === name)?.[0], entry = key === undefined ? null : zip.file(key), mime = mimeFor(name); if (!entry || !mime) { mediaIssue(entry ? 'Only PNG, WebP, JPEG, MP3 and WAV Anki media are imported' : 'Bundled media is missing',name); continue; }
      if (assets.length >= MAX_MEDIA) throw new Error(`Package exceeds the ${MAX_MEDIA.toLocaleString()} media-file limit.`); let data = await entry.async('uint8array'); if (variant === 'modern-anki21b') { try { data = await decompressBounded(data, MAX_MEDIA_BYTES); } catch { mediaIssue('Modern media compression is malformed or exceeds 5 MiB',name); continue; } }
      if (!data.byteLength || data.byteLength > MAX_MEDIA_BYTES) { mediaIssue('Media item is empty or exceeds 5 MiB',name); continue; }
      const mediaId = stable(`media-${hash(name).toString(16)}-${hashBytes(data).toString(16)}`), ref = `asset:${mediaId}`;
      if (mime.startsWith('image/')) { const dimensions = imageSize(data, mime); if (!dimensions || dimensions.width > 4096 || dimensions.height > 4096) { mediaIssue('Image dimensions are unsupported or exceed 4096 px',name); continue; } assets.push({ id: mediaId, name, mime, dataUrl: `data:${mime};base64,${b64(data)}`, ...dimensions, source: packageName, credit: 'Imported Anki package media', license: 'Source deck terms apply' }); }
      else { if (!audioSignature(data, mime)) { mediaIssue('Audio bytes do not match the MP3 or WAV file type',name); continue; } assets.push({ id: mediaId, name, mime, dataUrl: `data:${mime};base64,${b64(data)}`, source: packageName, credit: 'Imported Anki package media', license: 'Source deck terms apply' }); }
      resolved.set(name, ref); mediaIndex++; progress?.({ stage: 'media', label: 'Indexing bundled media', completed: mediaIndex, total: wantedMedia.size });
    }
    for (let index=cards.length-1;index>=0;index--) { const card=cards[index]!,wasVisual=card.kind==='visual',pendingImage=card.image?.startsWith('pending:')?card.image.slice(8):undefined;const resolve = (value?: string) => value?.startsWith('pending:') ? resolved.get(value.slice(8)) : value; card.image = resolve(card.image); card.backImage = resolve(card.backImage); card.frontAudio = card.frontAudio?.map(item => resolve(item)).filter((item): item is string => !!item); card.backAudio = card.backAudio?.map(item => resolve(item)).filter((item): item is string => !!item); if (!card.image) { delete card.image; delete card.backImage; if(wasVisual){simplifiedCards.delete(card.id);excludedCards.add(card.id);addIssue('error','missing-media','Image-only prompt has no usable bundled image',pendingImage??card.id,card.id);cards.splice(index,1);continue;} } if (!card.frontAudio?.length) delete card.frontAudio; if (!card.backAudio?.length) delete card.backAudio; }
    const proposedRarities = Object.fromEntries((['common','uncommon','rare','holo-rare','ultra-rare','secret-rare','relic'] as Rarity[]).map(rarity => [rarity, cards.filter(card => card.rarity === rarity).length])) as Record<Rarity, number>;
    const simplified=[...simplifiedCards].filter(id=>cards.some(card=>card.id===id)).length;
    return { variant, sourceNotes: noteCount, generatedCards: cards.length, decks: [...deckList.values()], cards, assets, issues,conversion:{normal:Math.max(0,cards.length-simplified),simplified,excluded:excludedCards.size,unsafe:unsafeCards.size}, proposedRarities, packageName, modelSchemas };
  } finally { db.close(); }
}

export function previewAnkiImport(analysis: AnkiAnalysis, state: State, preserveLocalEdits = true): ImportPreview {
  const cards = preserveLocalEdits ? analysis.cards.filter(card => !state.cards.some(existing => existing.id === card.id)) : analysis.cards;
  const bundle: ContentImport = { decks: analysis.decks, cards, designs: [], assets: analysis.assets };
  return makePreview(bundle, state);
}
