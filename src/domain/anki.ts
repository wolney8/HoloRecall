import type { AnkiDerivedField, AnkiFieldTarget, AnkiMappingPreset, AnkiSourceSnapshot, CardContent, ContentImport, Deck, LocalAsset, Rarity, State } from './models';
import { inspectZip, makePreview, type ImportPreview } from './exchange';
import { ANKI_DERIVED_FIELDS, ankiFieldHash, ankiImportedContentHash } from './anki-provenance';
import { answerOnlyMarkup, renderAnkiTemplate } from './anki-template';
import { derivedCardPresentation } from './card-presentation';
import { safeContentBlocks } from './safe-content';
import { automaticMappingProfile, chooseMappingProfile, mappingProfileKey, projectSemanticMapping } from './anki-interop';
export { ANKI_DERIVED_FIELDS, ankiFieldHash, ankiImportedContentHash, markAnkiLocalEdits } from './anki-provenance';

export type AnkiVariant = 'legacy-anki2' | 'legacy-anki21' | 'modern-anki21b';
export type AnkiIssueSeverity = 'error' | 'warning' | 'info';
export interface AnkiIssue { severity: AnkiIssueSeverity; kind: 'unsupported' | 'missing-media' | 'simplification' | 'remote-dependency'; message: string; count: number; occurrences: number; examples: string[]; cardIds: string[] }
export interface AnkiTemplateSchema { id:string; name:string; questionFields:string[]; answerFields:string[] }
export interface AnkiModelSchema { signature: string; name: string; fields: string[]; templates: string[]; templateSchemas:AnkiTemplateSchema[]; cloze: boolean; questionFields: string[]; answerFields: string[]; fieldSamples: Record<string,string[]> }
export interface AnkiAnalysis {
  variant: AnkiVariant; sourceNotes: number; generatedCards: number; decks: Deck[]; cards: CardContent[]; assets: LocalAsset[];
  issues: AnkiIssue[]; conversion: { normal: number; simplified: number; excluded: number; unsafe: number }; compatibility: { tierA: number; tierB: number; tierC: number; tierD: number }; proposedRarities: Record<Rarity, number>; packageName: string; modelSchemas: AnkiModelSchema[]; observedCardIds: string[]; effectiveMappings: AnkiMappingPreset[]; sourceSnapshot: AnkiSourceSnapshot;
  content:{lessonGroups:number;subdecks:number;visualPanels:number;choiceCards:number;choiceOptions:number;bundledMedia:number};
}
export interface AnkiUpdateSummary {
  mode: 'import' | 'update' | 'repair';
  newCards: string[];
  changedCards: string[];
  sourceChangedCards: string[];
  conversionUpgradeCards: string[];
  mappingChangedCards: string[];
  mappingReviewCards: string[];
  changedMediaCards: string[];
  unchangedCards: string[];
  conflicts: string[];
  conflictFields: Record<string, AnkiDerivedField[]>;
  deckConflicts: string[];
  legacyReviewRequired: string[];
  removedSourceCards: string[];
  changedDecks: string[];
  newDecks: string[];
}
export interface AnkiCardTransaction {
  cardId: string;
  label: string;
  current?: CardContent;
  proposed: CardContent;
  selected: CardContent;
  conflictFields: AnkiDerivedField[];
}
export type AnkiImportPreview = ImportPreview & { update: AnkiUpdateSummary; transaction: { expectedVersion: number; sourceSnapshotHash: string; cards: AnkiCardTransaction[] } };
export type AnkiStage = 'archive' | 'database' | 'content' | 'media';
export interface AnkiProgress { stage: AnkiStage; label: string; completed?: number; total?: number }

const MAX_NOTES = 10_000, MAX_CARDS = 25_000, MAX_MEDIA = 1_000, MAX_CELL = 100_000;
export const ANKI_CONVERTER_VERSION = 6;
export const ANKI_TEMPLATE_ENGINE_VERSION = 2;
export const ANKI_NORMALIZER_VERSION = 5;
export const ANKI_ENRICHMENT_VERSION = 3;
export const ANKI_MAPPING_VERSION = 4;
export const ANKI_MAPPING_POLICY_VERSION = 4;
const MAX_DATABASE_BYTES = 60 * 1024 * 1024, MAX_MEDIA_BYTES = 5 * 1024 * 1024;
const RARITY_BUCKETS: [number, Rarity][] = [[55, 'common'], [75, 'uncommon'], [87, 'rare'], [94, 'holo-rare'], [98, 'ultra-rare'], [99, 'secret-rare'], [100, 'relic']];
export function eligibleAnkiMappings(mappings:AnkiMappingPreset[],intent:'import'|'update'|'repair'):AnkiMappingPreset[]{return mappings.flatMap(mapping=>{const origin=mapping.origin??'legacy-unclassified',current=(mapping.policyVersion??0)>=ANKI_MAPPING_POLICY_VERSION;if(origin==='legacy-unclassified'||origin==='auto-inferred'&&(!current||intent==='repair'))return[];return[{...mapping,version:ANKI_MAPPING_VERSION,origin}];});}
const abort = (signal?: AbortSignal) => { if (signal?.aborted) throw new DOMException('Anki import cancelled.', 'AbortError'); };
function hash(value: string): number { let result = 2166136261; for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619); return result >>> 0; }
function contentHash(value: unknown): string { return hash(JSON.stringify(value) ?? 'undefined').toString(16).padStart(8, '0'); }
function hashBytes(value: Uint8Array): number { let result = 2166136261; for (const byte of value) result = Math.imul(result ^ byte, 16777619); return result >>> 0; }
export function suggestedRarity(identity: string): Rarity { const value = hash(identity) % 100; return RARITY_BUCKETS.find(([limit]) => value < limit)![1]; }
function stable(value: string): string { return `anki-${value.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 78)}`; }
function bytesText(bytes: Uint8Array): string { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
function varint(bytes: Uint8Array, start = 0): [number, number] { let value = 0, shift = 0, offset = start; while (offset < bytes.length && shift < 70) { const byte = bytes[offset++]!; value += (byte & 127) * 2 ** shift; if (!(byte & 128)) return [value, offset]; shift += 7; } throw new Error('Malformed protobuf metadata.'); }
function proto(bytes: Uint8Array): Map<number, (number | Uint8Array)[]> { const fields = new Map<number, (number | Uint8Array)[]>(); for (let i = 0; i < bytes.length;) { const [tag, next] = varint(bytes, i); i = next; const field = Math.floor(tag / 8), wire = tag & 7; let value: number | Uint8Array | undefined; if (wire === 0) [value, i] = varint(bytes, i); else if (wire === 2) { const [length, after] = varint(bytes, i); i = after; if (i + length > bytes.length) throw new Error('Malformed protobuf metadata.'); value = bytes.subarray(i, i + length); i += length; } else if (wire === 1) i += 8; else if (wire === 5) i += 4; else throw new Error('Unsupported protobuf wire type.'); if (i > bytes.length) throw new Error('Malformed protobuf metadata.'); if (value !== undefined) fields.set(field, [...fields.get(field) ?? [], value]); } return fields; }
function protoString(bytes: Uint8Array, field: number): string { const value = proto(bytes).get(field)?.[0]; return value instanceof Uint8Array ? bytesText(value) : ''; }
function packageVersion(meta?: Uint8Array): number { if (!meta?.length) return 0; const value = proto(meta).get(1)?.[0]; return typeof value === 'number' ? value : 0; }
export function plainAnkiText(input: string): string {
  // Adjacent inline elements inside table cells commonly represent separate
  // columns/labels in Anki layouts. Preserve that authored boundary without
  // globally inserting spaces between inline elements (which would damage
  // languages and deliberately split words).
  const separate=(body:string)=>body.replace(/(<\/(?:span|small|strong|em|div|p)>)\s*(<(?:span|small|strong|em|div|p)\b[^>]*>)/gi,'$1\n$2');
  const tableAware=input
    .replace(/<(td|th)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi,(_match,tag,attributes,body)=>`<${tag}${attributes}>${separate(String(body))}</${tag}>`)
    .replace(/<div\b([^>]*\bclass=["'][^"']*\bword-tile\b[^"']*["'][^>]*)>([\s\S]*?)<\/div\s*>/gi,(_match,attributes,body)=>`<div${attributes}>${separate(String(body))}</div>`);
  return tableAware
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(?:address|article|aside|blockquote|div|dl|dt|dd|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tbody|thead|tfoot|tr|ul)\b[^>]*>/gi, '\n')
    .replace(/<\/?(?:td|th)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .split('\n').map(line => line.replace(/[\t ]+/g, ' ').trim()).filter(Boolean).join('\n');
}
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
function mappedValues(mapping: AnkiMappingPreset | undefined, target: AnkiFieldTarget, fields: Record<string, string>): string[] {
  const equivalents:Partial<Record<AnkiFieldTarget,AnkiFieldTarget[]>>={front:['front','primary-prompt'],answer:['answer','primary-answer'],pronunciation:['pronunciation','secondary-cue'],meaning:['meaning','concise-interpretation'],notes:['notes','additional-detail','safe-original-details'],'front-media':['front-media','instructional-artwork'],'back-media':['back-media','media'],ignore:['ignore','ignored']};
  const accepted=new Set(equivalents[target]??[target]);
  return Object.entries(mapping?.fields ?? {})
    .filter(([, value]) => accepted.has(value))
    .map(([name]) => plainAnkiText(fields[name] ?? ''))
    .filter(Boolean);
}
function mappedFieldNames(mapping: AnkiMappingPreset | undefined, target: AnkiFieldTarget): string[] {
  return Object.entries(mapping?.fields ?? {}).filter(([, value]) => value === target).map(([name]) => name);
}
function templateFieldNames(template: string): Set<string> {
  const names = new Set<string>();
  for (const match of template.matchAll(/{{(?:[#^/]|(?:tts(?:\s+[^}:]+)*|hint|furigana|kana|kanji|type|cloze|text):)?([^}:]+)}}/gi)) {
    const name = match[1]?.trim();
    if (name && name !== 'FrontSide') names.add(name);
  }
  return names;
}

function semanticAnswerField(template:string,referenced:string[]):string|undefined{
  // Prefer a specific nested semantic region over a broad outer wrapper such
  // as `answer-body`; a single global regex would consume the wrapper and miss
  // its nested `.italian` answer.
  for(const semantic of ['italian','response','solution','target','answer']){
    const pattern=new RegExp(`<([a-z][\\w-]*)\\b([^>]*(?:class|id)=["'][^"']*\\b${semantic}\\b[^"']*["'][^>]*)>([\\s\\S]*?)<\\/\\1\\s*>`,'gi');
    for(const region of template.matchAll(pattern)){
      const attributes=region[2]??'',body=region[3]??'',label=/\b(?:label|tag|category|meta)\b/i.test(attributes);
      if(label)continue;
      const names=[...templateFieldNames(body)].filter(name=>referenced.includes(name));
      if(names.length===1)return names[0];
    }
  }
  const supporting=/^(?:pronunciation|reading|phonetic|meaning|english|translation|definition|literal|usage|use|examples?|soundnote|sound note|pattern|rule|roles|memory|extra|sources?|reference|key|stablekey|lesson|topic|kind|language|adaptation)$/i;
  const learningFields=[...templateFieldNames(template)].filter(name=>referenced.includes(name)&&!supporting.test(name.trim()));
  return learningFields[0]??(referenced.length===1?referenced[0]:undefined);
}

function sourceField(fields:Record<string,string>,name:string):string{return plainAnkiText(fields[name]??'');}
function sourceFieldNamed(fields:Record<string,string>,referenced:string[],pattern:RegExp):{name:string;value:string}|undefined{
  const name=referenced.find(candidate=>pattern.test(candidate.trim()));if(!name)return undefined;const value=sourceField(fields,name);return value?{name,value}:undefined;
}
function referencedSourceField(fields:Record<string,string>,referenced:string[],name:string):string{return referenced.includes(name)?sourceField(fields,name):'';}
function compactParts(values:string[]):string{return values.map(value=>value.trim()).filter(Boolean).join('\n');}
function classText(markup:string,className:string):string{
  const match=new RegExp(`<[^>]+class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`,'i').exec(markup);
  return match?plainAnkiText(match[1]??''):'';
}
function safeChoices(markup:string):string[]{
  return [...markup.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button\s*>/gi)].map(match=>plainAnkiText(match[1]??'')).filter(Boolean).slice(0,24);
}
function sourcePanel(markup:string,fields:Record<string,string>):CardContent['art']|undefined{
  const title=classText(markup,'panel-title'),badge=classText(markup,'panel-badge'),subtitle=classText(markup,'panel-subtitle');
  if(!title&&!badge&&!subtitle)return undefined;
  return{kind:'source-visual-panel',title:title||badge||'Study card',...(badge?{badge}:{}),...(subtitle?{subtitle}:{}),...(sourceField(fields,'Lesson')?{lesson:sourceField(fields,'Lesson')}:{}),...(sourceField(fields,'Topic')?{topic:sourceField(fields,'Topic')}:{}),...(sourceField(fields,'Kind')?{sourceKind:sourceField(fields,'Kind')}:{} )};
}
function sourceDetails(fields:Record<string,string>,referenced:string[],template:string):NonNullable<CardContent['details']>{
  const details:NonNullable<CardContent['details']>=[],used=new Set<string>();
  const add=(field:string,label:string)=>{if(used.has(field)||/^(?:meaning|english|translation|definition|pronunciation|reading|phonetic)$/i.test(field.trim()))return;const raw=referenced.includes(field)?fields[field]??'':'',content=plainAnkiText(raw);if(content){const blocks=safeContentBlocks(raw),structured=blocks.length>1||blocks.some(block=>block.type!=='paragraph');details.push({label:plainAnkiText(label)||field,content,...(structured?{blocks}:{})});used.add(field);}};
  const labelled=/<[a-z][\w-]*\b[^>]*class=["'][^"']*\blabel\b[^"']*["'][^>]*>([\s\S]*?)<\/[a-z][\w-]*>\s*{{(?:text:)?([^}:]+)}}/gi;
  for(const match of template.matchAll(labelled))add((match[2]??'').trim(),match[1]??'');
  const metadata=/<[a-z][\w-]*\b[^>]*class=["'][^"']*\bmeta\b[^"']*["'][^>]*>([\s\S]*?)<\/[a-z][\w-]*>/gi;
  for(const match of template.matchAll(metadata))for(const field of templateFieldNames(match[1]??''))add(field,/^(?:sources?|reference)$/i.test(field)?'Reference':field);
  const definitions:[RegExp,string][]=[[/^literal$/i,'Literal'],[/^(?:usage|use|examples?)$/i,'Use / examples'],[/^(?:soundnote|sound note|pattern|rule)$/i,'Pattern / sound'],[/^(?:sources?|reference)$/i,'Reference'],[/^roles$/i,'Word roles'],[/^memory$/i,'Memory aid'],[/^extra$/i,'Additional details']];
  for(const field of referenced)for(const [pattern,label] of definitions)if(pattern.test(field))add(field,label);
  const allocated=/^(?:answer|italian|response|solution|target|pronunciation|reading|phonetic|meaning|english|translation|definition|image|picture|audio|sound|key|stablekey|lesson|topic|kind|language|adaptation|source)$/i;
  for(const field of referenced)if(!used.has(field)&&!allocated.test(field.trim()))add(field,'Original card details');
  return details;
}
type ProvenanceBlock=NonNullable<NonNullable<NonNullable<CardContent['ankiSource']>['contentProvenance']>['blocks']>[number];
interface RenderedAnkiContent {front:string;answer:string;frontMarkup:string;answerMarkup:string;frontFields:string[];answerFields:string[];pronunciation:string;meaning:string;answerLabel?:string;details:NonNullable<CardContent['details']>;art?:CardContent['art'];choices:string[];provenanceBlocks:ProvenanceBlock[]}
function renderedAnkiContent(model:{cloze:boolean},template:{question?:string;answer?:string;q?:string;a?:string},fields:Record<string,string>,frontResult:ReturnType<typeof renderAnkiTemplate>,backResult:ReturnType<typeof renderAnkiTemplate>):RenderedAnkiContent{
  const renderedFront=plainAnkiText(frontResult.markup.replace(/\[sound:[^\]]+]/g,'')),renderedBack=plainAnkiText(backResult.markup.replace(/\[sound:[^\]]+]/g,''));
  const primary=semanticAnswerField(answerOnlyMarkup(template.answer??template.a??''),backResult.referencedFields);
  const answer=model.cloze?renderedBack:primary?sourceField(fields,primary):renderedBack;
  const structuredFront=compactParts(['Prompt','Question','Focus','Context','Task','Hint'].map(name=>referencedSourceField(fields,frontResult.referencedFields,name)));
  const picture=referencedSourceField(fields,frontResult.referencedFields,'Picture')?fields['Picture']??'':'';
  const options=referencedSourceField(fields,frontResult.referencedFields,'Options')?fields['Options']??'':'';
  const pronunciation=sourceFieldNamed(fields,backResult.referencedFields,/^(?:pronunciation|reading|phonetic)$/i)?.value??'';
  const meaning=sourceFieldNamed(fields,backResult.referencedFields,/^(?:meaning|english|translation|definition)$/i)?.value??'';
  const answerLabel=primary&&primary!=='Answer'?referencedSourceField(fields,backResult.referencedFields,'Answer'):'';
  const front=structuredFront||renderedFront,panel=sourcePanel(picture,fields),art=panel??{kind:'generated-text-art' as const,title:sourceField(fields,'Topic')||front.split('\n')[0]||'Study card',...(sourceField(fields,'Kind')?{subtitle:sourceField(fields,'Kind')}:{}),seed:sourceField(fields,'Key')||front||answer};
  const provenanceBlocks:ProvenanceBlock[]=[];
  const classifyFront=(name:string):ProvenanceBlock['classification']=>/^(?:question|focus)$/i.test(name)?'primary-prompt':/^(?:prompt|context)$/i.test(name)?'situation-context':/^task$/i.test(name)?'task-guidance':/^hint$/i.test(name)?'hint':/^options$/i.test(name)?'choices':/^(?:picture|image)$/i.test(name)?'instructional-art':'fallback';
  for(const name of frontResult.referencedFields)if(sourceField(fields,name))provenanceBlocks.push({side:'front',source:name,classification:classifyFront(name),destination:classifyFront(name)==='fallback'?'Recall · retained source content':`Recall · ${classifyFront(name)}`});
  for(const name of backResult.referencedFields){if(!sourceField(fields,name))continue;const classification:ProvenanceBlock['classification']=name===primary?'primary-answer':/^(?:pronunciation|reading|phonetic)$/i.test(name)?'secondary-cue':/^(?:meaning|english|translation|definition)$/i.test(name)?'concise-interpretation':sourceDetails(fields,[name],answerOnlyMarkup(template.answer??template.a??'')).length?'support':'metadata';provenanceBlocks.push({side:'back',source:name,classification,destination:classification==='support'?'Answer Support':classification==='metadata'?'Source metadata':`Answer card · ${classification}`});}
  if(/{{FrontSide}}/i.test(template.answer??template.a??''))provenanceBlocks.push({side:'back',source:'FrontSide',classification:'duplicate-frontside',destination:'Omitted duplicate Recall face'});
  return{front,answer,frontMarkup:frontResult.markup,answerMarkup:backResult.markup,frontFields:frontResult.referencedFields,answerFields:backResult.referencedFields,pronunciation,meaning,...(answerLabel?{answerLabel}:{}),details:sourceDetails(fields,backResult.referencedFields,answerOnlyMarkup(template.answer??template.a??'')),art,choices:safeChoices(options),provenanceBlocks};
}
export function suggestedAnkiFieldTarget(field:string):AnkiFieldTarget{
  const value=field.toLocaleLowerCase('en').trim();
  if(/pron|reading|phonetic/.test(value))return'pronunciation';
  if(/breakdown|usage|use|example|context|note|extra|remark/.test(value))return'notes';
  if(/meaning|translation|definition/.test(value))return'meaning';
  if(/audio|sound/.test(value))return /question|front/.test(value)?'front-media':'back-media';
  if(/front|question|prompt|term|word|phrase/.test(value))return'front';
  if(/back|answer|response/.test(value))return'answer';
  return'ignore';
}
export function suggestedAnkiMapping(model:{name:string;fields:string[];signature:string;questionFields?:string[];answerFields?:string[]}):AnkiMappingPreset{
  return automaticMappingProfile({sourceSignature:model.signature,modelName:model.name,templateId:'*',templateName:'All templates',fields:model.fields,questionFields:model.questionFields??[],answerFields:model.answerFields??[],fieldSamples:{}});
}
function inferStructuredMapping(model:{name:string;fields:string[];templates?:{q:string;a:string}[];signature?:string}):AnkiMappingPreset|undefined{
  if(model.fields.length<3)return undefined;
  const suggested=suggestedAnkiMapping({name:model.name,fields:model.fields,signature:model.signature!,questionFields:model.templates?.flatMap(template=>[...templateFieldNames(template.q)]),answerFields:model.templates?.flatMap(template=>[...templateFieldNames(template.a.replace(/{{FrontSide}}/g,''))])});
  const fields=suggested.fields;
  if(!Object.values(fields).includes('primary-prompt')||!Object.values(fields).includes('primary-answer'))return undefined;
  return{...suggested,id:`inferred-${model.signature}`,name:`${model.name} structured fields`};
}
function mappedValue(mapping: AnkiMappingPreset | undefined, target: AnkiFieldTarget, fields: Record<string, string>): string { return mappedValues(mapping, target, fields).join('\n\n'); }
function unallocatedNotes(mapping:AnkiMappingPreset|undefined,fields:Record<string,string>,rendered:RenderedAnkiContent):string[]{const allocated=new Set([referencedSourceField(fields,rendered.frontFields,'Context'),...rendered.details.map(detail=>detail.content)].filter(Boolean));return mappedValues(mapping,'notes',fields).filter(value=>!allocated.has(value));}
function fieldValue(card:CardContent,field:AnkiDerivedField):unknown{return card[field];}
const fieldHash=ankiFieldHash;
function fieldBaselines(card:CardContent):Partial<Record<AnkiDerivedField,string>>{return Object.fromEntries(ANKI_DERIVED_FIELDS.map(field=>[field,fieldHash(card,field)]));}
function mappingFingerprint(mapping:AnkiMappingPreset|undefined,modelSignatureValue:string):string{return `anki-mapping-v1-${contentHash({modelSignature:modelSignatureValue,fields:Object.entries(mapping?.fields??{}).sort(([a],[b])=>a.localeCompare(b))})}`;}
function importedDeckShape(deck: Deck): unknown { return { name: deck.name, description: deck.description, parentId: deck.parentId }; }
export function ankiImportedDeckHash(deck: Deck): string { return contentHash(importedDeckShape(deck)); }
function sourceCardFingerprint(input:{noteGuid:string;modelSignature:string;templateOrdinal:number;question:string;answer:string;fields:Array<[string,string]>;tags:string;deckId:string;media:string[]}):string{return`anki-source-v1-${contentHash(input)}`;}

/** Re-render source-native content without the original package. Media bytes remain in the shared registry. */
export function renderAnkiSnapshotCard(snapshot:AnkiSourceSnapshot,sourceCardId:string):RenderedAnkiContent{
  const sourceCard=snapshot.cards.find(card=>card.id===sourceCardId);if(!sourceCard)throw new Error('Anki source card is missing from the snapshot.');
  const note=snapshot.notes.find(item=>item.id===sourceCard.noteId);if(!note)throw new Error('Anki source note is missing from the snapshot.');
  const model=snapshot.noteTypes.find(item=>item.id===note.noteTypeId),template=model?.templates.find(item=>item.id===sourceCard.templateId)??model?.templates[sourceCard.templateOrdinal];if(!model||!template)throw new Error('Anki source template is missing from the snapshot.');
  const deck=snapshot.sourceDecks.find(item=>item.id===sourceCard.sourceDeckId),special={Tags:note.tags.join(' '),Type:model.name,Deck:deck?.path??'',Subdeck:deck?.path.split('::').at(-1)??'',Card:template.name};
  const clozeOrdinal=model.cloze?sourceCard.templateOrdinal+1:undefined,question=renderAnkiTemplate(template.question,{fields:note.fields,clozeOrdinal,answerSide:false,special}),back=renderAnkiTemplate(answerOnlyMarkup(template.answer),{fields:note.fields,frontSide:question.markup,clozeOrdinal,answerSide:true,special});
  if(question.unsupported.length||back.unsupported.length)throw new Error('Anki source template requires compatibility review.');
  const content=renderedAnkiContent(model,template,note.fields,question,back);
  if(!content.front&&!mediaNames(question.markup,'image').length&&!mediaNames(question.markup,'audio').length||!content.answer)throw new Error('Anki source template does not produce a usable card.');
  return content;
}

export function analyseAnkiSourceSnapshot(snapshot:AnkiSourceSnapshot,mappings:AnkiMappingPreset[]=[]):AnkiAnalysis{
  const deckId=(sourceId:string):string=>{const source=snapshot.sourceDecks.find(item=>item.id===sourceId);return sourceId.startsWith('path:')?stable(`deck-path-${source?.path??sourceId.slice(5)}`):stable(`deck-${sourceId}`);};
  const decks=snapshot.sourceDecks.map(source=>{const parentId=source.parentId?deckId(source.parentId):undefined,candidate:Deck={id:deckId(source.id),name:source.path.split('::').at(-1)??source.path,description:parentId?'Imported Anki deck group.':'Imported Anki deck. Scheduling and review history were not imported.',suspended:false,studyArtPolicy:'auto',...(parentId?{parentId}:{})};candidate.ankiSource={kind:'anki',...(source.id.startsWith('path:')?{}:{sourceDeckId:source.id}),sourcePath:source.path,importedContentHash:ankiImportedDeckHash(candidate)};return candidate;});
  const schemas:AnkiModelSchema[]=snapshot.noteTypes.map(model=>({signature:model.signature,name:model.name,fields:model.fields.map(field=>field.name),templates:model.templates.map(template=>template.name),templateSchemas:model.templates.map(template=>({id:template.id,name:template.name,questionFields:[...templateFieldNames(template.question)],answerFields:[...templateFieldNames(answerOnlyMarkup(template.answer))]})),cloze:model.cloze,questionFields:[...new Set(model.templates.flatMap(template=>[...templateFieldNames(template.question)]))],answerFields:[...new Set(model.templates.flatMap(template=>[...templateFieldNames(answerOnlyMarkup(template.answer))]))],fieldSamples:Object.fromEntries(model.fields.map(field=>[field.name,[...new Set(snapshot.notes.filter(note=>note.noteTypeId===model.id).map(note=>plainAnkiText(note.fields[field.name]??'')).filter(Boolean))].slice(0,3)]))}));
  const effectiveCandidates=snapshot.noteTypes.flatMap(model=>model.templates.flatMap(template=>{const existing=chooseMappingProfile(mappings,model.signature,template.id);if(existing)return[existing];if(model.fields.length<3)return[];return[automaticMappingProfile({sourceSignature:model.signature,modelName:model.name,templateId:template.id,templateName:template.name,fields:model.fields.map(field=>field.name),questionFields:[...templateFieldNames(template.question)],answerFields:[...templateFieldNames(answerOnlyMarkup(template.answer))],fieldSamples:Object.fromEntries(model.fields.map(field=>[field.name,[...new Set(snapshot.notes.filter(note=>note.noteTypeId===model.id).map(note=>plainAnkiText(note.fields[field.name]??'')).filter(Boolean))].slice(0,3)]))})];})),effectiveMappings=[...new Map(effectiveCandidates.map(mapping=>[mappingProfileKey(mapping),mapping])).values()];
  const cards:CardContent[]=[];for(const sourceCard of snapshot.cards){const note=snapshot.notes.find(item=>item.id===sourceCard.noteId),model=note&&snapshot.noteTypes.find(item=>item.id===note.noteTypeId),template=model?.templates.find(item=>item.id===sourceCard.templateId)??model?.templates[sourceCard.templateOrdinal];if(!note||!model||!template)continue;const rendered=renderAnkiSnapshotCard(snapshot,sourceCard.id),mapping=chooseMappingProfile(effectiveMappings,model.signature,template.id),frontImages=mediaNames(rendered.frontMarkup,'image'),backImages=mediaNames(rendered.answerMarkup,'image'),frontAudio=mediaNames(rendered.frontMarkup,'audio'),backAudio=mediaNames(rendered.answerMarkup,'audio'),allMedia=[...frontImages,...backImages,...frontAudio,...backAudio],resolve=(name:string)=>{const alias=snapshot.media.find(item=>item.name===name);return alias?`asset:${alias.assetId}`:undefined;},image=frontImages.map(resolve).find(Boolean),backImage=backImages.map(resolve).find(Boolean)??image,id=stable(`${note.guid}-${sourceCard.templateOrdinal}`),candidate:CardContent={id,deckId:deckId(sourceCard.sourceDeckId),siblingGroupId:stable(`note-${note.guid}`),kind:image&&!rendered.front?'visual':'text',front:rendered.front||'Recall from the illustration',answer:rendered.answer,pronunciation:mapping?.origin==='user-confirmed'?mappedValue(mapping,'pronunciation',note.fields)||rendered.pronunciation:rendered.pronunciation||mappedValue(mapping,'pronunciation',note.fields),meaning:mapping?.origin==='user-confirmed'?mappedValue(mapping,'meaning',note.fields)||rendered.meaning:rendered.meaning||mappedValue(mapping,'meaning',note.fields),notes:[`Imported source · ${model.name} / ${template.name}`,...unallocatedNotes(mapping,note.fields,rendered)].join('\n\n'),...((image?{kind:'imported-media' as const}:rendered.art)?{art:image?{kind:'imported-media' as const}:rendered.art}:{}),...(rendered.choices.length?{choices:rendered.choices}:{}),...(rendered.answerLabel?{answerLabel:rendered.answerLabel}:{}),...(rendered.details.length?{details:rendered.details}:{}),tags:[...note.tags],revision:1,suspended:false,rarity:suggestedRarity(`${note.guid}-${sourceCard.templateOrdinal}`),ankiSource:{kind:'anki',noteGuid:note.guid,noteId:note.id,templateOrdinal:sourceCard.templateOrdinal,modelName:model.name,templateName:template.name,modelSignature:model.signature,sourceSnapshotId:snapshot.id,sourceTemplateId:template.id,sourceContentFingerprint:sourceCardFingerprint({noteGuid:note.guid,modelSignature:model.signature,templateOrdinal:sourceCard.templateOrdinal,question:template.question,answer:template.answer,fields:model.fields.map(field=>[field.name,note.fields[field.name]??'']),tags:note.tags.join(' '),deckId:sourceCard.sourceDeckId,media:allMedia}),importedContentHash:'00000000',linkState:'linked',conversion:{converterVersion:ANKI_CONVERTER_VERSION,templateEngineVersion:ANKI_TEMPLATE_ENGINE_VERSION,normalizerVersion:ANKI_NORMALIZER_VERSION,enrichmentVersion:ANKI_ENRICHMENT_VERSION,mappingVersion:ANKI_MAPPING_VERSION,mappingPolicyVersion:mapping?.policyVersion??ANKI_MAPPING_POLICY_VERSION,mappingOrigin:mapping?.origin??'auto-inferred',mappingSignature:mappingFingerprint(mapping,model.signature),fieldBaselines:{},fieldOrigins:{}},contentProvenance:{front:model.cloze?'cloze':'template',answer:model.cloze?'cloze':'template',frontFields:rendered.frontFields,answerFields:rendered.answerFields,blocks:rendered.provenanceBlocks}},...(image?{image,backImage,imageDescription:'Imported illustration. Reveal for the answer.'}:{}),...(frontAudio.map(resolve).filter((item):item is string=>!!item).length?{frontAudio:frontAudio.map(resolve).filter((item):item is string=>!!item)}:{}),...(backAudio.map(resolve).filter((item):item is string=>!!item).length?{backAudio:backAudio.map(resolve).filter((item):item is string=>!!item)}:{})};const projected=mapping?.version===4&&mapping.origin==='user-confirmed'&&Object.values(mapping.fields).some(target=>!['ignore','front','answer','pronunciation','meaning','notes','front-media','back-media'].includes(target))?projectSemanticMapping(candidate,note.fields,mapping):candidate;projected.presentation=derivedCardPresentation(projected,[snapshot]);projected.ankiSource!.importedContentHash=ankiImportedContentHash(projected);projected.ankiSource!.conversion!.fieldBaselines=fieldBaselines(projected);projected.ankiSource!.conversion!.fieldOrigins=Object.fromEntries(ANKI_DERIVED_FIELDS.map(field=>[field,'derived']));cards.push(projected);}
  const proposedRarities=Object.fromEntries((['common','uncommon','rare','holo-rare','ultra-rare','secret-rare','relic'] as Rarity[]).map(rarity=>[rarity,cards.filter(card=>card.rarity===rarity).length])) as Record<Rarity,number>;
  return{variant:snapshot.packageVariant,sourceNotes:snapshot.notes.length,generatedCards:cards.length,decks,cards,assets:[],issues:[],conversion:{normal:cards.length,simplified:0,excluded:0,unsafe:0},compatibility:{tierA:cards.length,tierB:0,tierC:0,tierD:0},proposedRarities,packageName:'Stored Anki source',modelSchemas:schemas,observedCardIds:cards.map(card=>card.id),effectiveMappings,sourceSnapshot:snapshot,content:{lessonGroups:decks.filter(deck=>!deck.parentId).length,subdecks:decks.filter(deck=>!!deck.parentId).length,visualPanels:cards.filter(card=>card.art?.kind==='source-visual-panel').length,choiceCards:cards.filter(card=>card.choices?.length).length,choiceOptions:cards.reduce((sum,card)=>sum+(card.choices?.length??0),0),bundledMedia:0}};
}

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
    const noteColumns=new Set((db.exec('pragma table_info(notes)')[0]?.values??[]).map(row=>String(row[1]))),modifiedColumn=noteColumns.has('mod')?'n.mod':'0';
    const rows = db.exec(`select n.id,n.guid,n.mid,${modifiedColumn},n.tags,n.flds,c.id,c.did,c.ord from notes n join cards c on c.nid=n.id order by c.id limit 25001`)[0]?.values ?? []; if (rows.length > MAX_CARDS) throw new Error(`Package exceeds the ${MAX_CARDS.toLocaleString()} generated-card limit.`);
    const samplesByModel=new Map<number,Record<string,string[]>>();for(const row of rows){const model=models.get(Number(row[2]));if(!model)continue;const values=String(row[5]).split('\x1f'),samples=samplesByModel.get(Number(row[2]))??Object.fromEntries(model.fields.map(name=>[name,[]]));model.fields.forEach((name,index)=>{const sample=plainAnkiText(values[index]??'');if(sample&&!samples[name]!.includes(sample)&&samples[name]!.length<3)samples[name]!.push(sample);});samplesByModel.set(Number(row[2]),samples);}
    const modelSchemas = [...models.entries()].map(([id,model]) => ({ signature: model.signature!, name: model.name, fields: [...model.fields], templates: model.templates.map(template => template.name),templateSchemas:model.templates.map((template,ordinal)=>({id:`${id}:${ordinal}`,name:template.name,questionFields:[...templateFieldNames(template.q)],answerFields:[...templateFieldNames(answerOnlyMarkup(template.a))]})), cloze: model.cloze,questionFields:[...new Set(model.templates.flatMap(template=>[...templateFieldNames(template.q)]))],answerFields:[...new Set(model.templates.flatMap(template=>[...templateFieldNames(template.a.replace(/{{FrontSide}}/g,''))]))],fieldSamples:samplesByModel.get(id)??{} }));
    const effectiveMappings:AnkiMappingPreset[]=[];for(const [id,model] of models)for(let ordinal=0;ordinal<model.templates.length;ordinal++){const template=model.templates[ordinal]!,templateId=`${id}:${ordinal}`,exact=chooseMappingProfile(mappings,model.signature!,templateId),candidate=exact?{...exact,policyVersion:exact.policyVersion??0,origin:exact.origin??'legacy-unclassified'}:model.fields.length>=3?automaticMappingProfile({sourceSignature:model.signature!,modelName:model.name,templateId,templateName:template.name,fields:model.fields,questionFields:[...templateFieldNames(template.q)],answerFields:[...templateFieldNames(answerOnlyMarkup(template.a))],fieldSamples:samplesByModel.get(id)??{}}):undefined;if(candidate&&!effectiveMappings.some(mapping=>mappingProfileKey(mapping)===mappingProfileKey(candidate)))effectiveMappings.push(candidate);}
    const noteById=new Map<string,AnkiSourceSnapshot['notes'][number]>();
    for(const row of rows){const noteId=String(row[0]),model=models.get(Number(row[2]));if(!model||noteById.has(noteId))continue;const values=String(row[5]).split('\x1f');noteById.set(noteId,{id:noteId,guid:String(row[1]),noteTypeId:String(row[2]),fields:Object.fromEntries(model.fields.map((name,index)=>[name,values[index]??''])),tags:String(row[4]).trim().split(/\s+/).filter(Boolean).slice(0,30),modified:Number(row[3])||undefined});}
    const sourceDecks:AnkiSourceSnapshot['sourceDecks']=[];for(const [numericId,fullPath] of deckNames){const segments=fullPath.split('::').map(value=>value.trim()).filter(Boolean);let parentId:string|undefined;for(let index=0;index<segments.length;index++){const path=segments.slice(0,index+1).join('::'),existingSource=[...deckNames].find(([,name])=>name===path)?.[0],id=existingSource===undefined?`path:${path}`:String(existingSource);if(!sourceDecks.some(deck=>deck.id===id))sourceDecks.push({id,path,...(parentId?{parentId}:{})});parentId=id;}if(!segments.length&&!sourceDecks.some(deck=>deck.id===String(numericId)))sourceDecks.push({id:String(numericId),path:fullPath});}
    const usedPaths=new Set<string>();for(const row of rows){const path=deckNames.get(Number(row[7]));if(!path)continue;const parts=path.split('::');for(let index=1;index<=parts.length;index++)usedPaths.add(parts.slice(0,index).join('::'));}sourceDecks.splice(0,sourceDecks.length,...sourceDecks.filter(deck=>usedPaths.has(deck.path)));
    const sourceSnapshotId=stable(`source-${sourceDecks.filter(deck=>!deck.parentId).map(deck=>deck.id).sort().join('-')||'package'}`);
    const sourceSnapshot:AnkiSourceSnapshot={id:sourceSnapshotId,version:2,packageVariant:variant,sourceDecks,noteTypes:[...models.entries()].map(([id,model])=>({id:String(id),name:model.name,cloze:model.cloze,signature:model.signature!,fields:model.fields.map((name,ordinal)=>({id:`${id}:${ordinal}`,name,ordinal})),templates:model.templates.map((template,ordinal)=>({id:`${id}:${ordinal}`,name:template.name,ordinal,question:template.q,answer:template.a}))})),notes:[...noteById.values()],cards:rows.map(row=>({id:String(row[6]),noteId:String(row[0]),templateId:`${row[2]}:${row[8]}`,templateOrdinal:Number(row[8]),sourceDeckId:String(row[7])})),media:[],contentHash:'anki-source-snapshot-v2-00000000'};
    sourceSnapshot.contentHash=`anki-source-snapshot-v2-${contentHash({...sourceSnapshot,contentHash:undefined})}`;
    const decks = new Map<number, Deck>(), deckList = new Map<string,Deck>(), cards: CardContent[] = [], issues: AnkiIssue[] = []; const wantedMedia = new Set<string>(), simplifiedCards=new Set<string>(), reviewCards=new Set<string>(), excludedCards=new Set<string>(), unsafeCards=new Set<string>(),observedCardIds:string[]=[];
    const ensureDeck=(deckKey:number):Deck=>{const existing=decks.get(deckKey);if(existing)return existing;const fullName=deckNames.get(deckKey)??`Imported deck ${deckKey}`,segments=fullName.split('::').map(value=>value.trim()).filter(Boolean);let parentId:string|undefined,leaf:Deck|undefined;for(let index=0;index<segments.length;index++){const path=segments.slice(0,index+1).join('::'),source=[...deckNames.entries()].find(([,name])=>name===path)?.[0],id=source===undefined?stable(`deck-path-${path}`):stable(`deck-${source}`);if(!deckList.has(id)){const candidate:Deck={id,name:segments[index]!,description:index===segments.length-1?'Imported Anki deck. Scheduling and review history were not imported.':'Imported Anki deck group.',suspended:false,studyArtPolicy:'auto',...(parentId?{parentId}:{})};candidate.ankiSource={kind:'anki',...(source===undefined?{}:{sourceDeckId:String(source)}),sourcePath:path,importedContentHash:ankiImportedDeckHash(candidate)};deckList.set(id,candidate);}leaf=deckList.get(id)!;parentId=id;}decks.set(deckKey,leaf!);return leaf!;};
    const addIssue = (severity:AnkiIssueSeverity,kind: AnkiIssue['kind'], message: string, example: string, cardId?:string) => { let issue = issues.find(item => item.severity===severity&&item.kind === kind && item.message === message); if (!issue) issues.push(issue = { severity,kind, message, count: 0,occurrences:0, examples: [],cardIds:[] }); issue.occurrences++;if(cardId&&!issue.cardIds.includes(cardId))issue.cardIds.push(cardId);issue.count=issue.cardIds.length||issue.occurrences; if (issue.examples.length < 3&&!issue.examples.includes(example)) issue.examples.push(example); };
    progress?.({ stage: 'content', label: 'Converting cards', completed: 0, total: rows.length });
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) { abort(signal); const row = rows[rowIndex]!; const [noteId, guid, modelId, _modified, rawTags, rawFields, _cardId, deckId, ordinal] = row,id=stable(`${guid}-${ordinal}`);observedCardIds.push(id); const model = models.get(Number(modelId)); if (!model) { excludedCards.add(id);addIssue('error','unsupported', 'Unknown note type', String(noteId),id); continue; }
      if(/image[ _-]?occlusion/i.test(model.name)){reviewCards.add(id);addIssue('error','unsupported','Image Occlusion masks need a dedicated safe native projection',`${model.name} / card ${ordinal}`,id);continue;}
      const values = String(rawFields).split('\x1f'); if (values.some(value => value.length > MAX_CELL)) { excludedCards.add(id);addIssue('error','unsupported', 'Field exceeds 100,000 characters', String(noteId),id); continue; }
      const template = model.cloze ? model.templates[0] : model.templates[Number(ordinal)]; if (!template) { excludedCards.add(id);addIssue('error','unsupported', 'Card references an unavailable template ordinal', `${model.name} / ${ordinal}`,id); continue; }
      const fields = Object.fromEntries(model.fields.map((name, index) => [name, values[index] ?? ''])),templateId=`${modelId}:${model.cloze?0:Number(ordinal)}`, mapping=chooseMappingProfile(effectiveMappings,model.signature!,templateId);
      const importedDeck=ensureDeck(Number(deckId));
      const frontFieldNames=mappedFieldNames(mapping,'front'),answerFieldNames=mappedFieldNames(mapping,'answer');
      const mappedFront = plainAnkiText(mappedValue(mapping, 'front', fields)), mappedAnswer = plainAnkiText(mappedValue(mapping, 'answer', fields));
      const clozeIndex = model.cloze ? Number(ordinal) + 1 : undefined;
      const special={Tags:String(rawTags).trim(),Type:model.name,Deck:deckNames.get(Number(deckId))??'',Subdeck:(deckNames.get(Number(deckId))??'').split('::').at(-1)??'',Card:template.name};
      const frontResult=renderAnkiTemplate(template.q,{fields,clozeOrdinal:clozeIndex,answerSide:false,special});
      const backTemplate=answerOnlyMarkup(template.a),backResult=renderAnkiTemplate(backTemplate,{fields,frontSide:frontResult.markup,clozeOrdinal:clozeIndex,answerSide:true,special});
      const unsupported=[...new Set([...frontResult.unsupported,...backResult.unsupported])],explicitFallback=mapping?.origin==='user-confirmed'&&!!mappedFront&&!!mappedAnswer;
      if(unsupported.length&&!explicitFallback){reviewCards.add(id);addIssue('error','unsupported','Card template needs compatibility review',`${model.name} / ${template.name}: ${unsupported.join(', ')}`,id);continue;}
      const frontMarkup=unsupported.length?mappedFront:frontResult.markup,backMarkup=unsupported.length?mappedAnswer:backResult.markup;
      const rendered:RenderedAnkiContent=unsupported.length
        ? {front:plainAnkiText(frontMarkup),answer:plainAnkiText(backMarkup),frontMarkup,answerMarkup:backMarkup,frontFields:frontFieldNames,answerFields:answerFieldNames,pronunciation:mappedValue(mapping,'pronunciation',fields),meaning:mappedValue(mapping,'meaning',fields),details:[],choices:[],provenanceBlocks:[]}
        : renderedAnkiContent(model,template,fields,frontResult,backResult);
      const front=rendered.front,answer=rendered.answer;
      if (!answer) { excludedCards.add(id);addIssue('error','unsupported', 'Generated card has no answer after safe conversion', model.name,id); continue; }
      if (frontResult.simplifications.length||backResult.simplifications.length||/\[anki:tts/i.test(template.q + template.a)) {simplifiedCards.add(id);addIssue('info','simplification', 'Anki TTS, answer input or advanced field filters were reduced to learning text', `${model.name} / ${template.name}`,id);}
      if(rendered.choices.length&&/\bon\w+\s*=|javascript\s*:/i.test(fields['Options']??'')){simplifiedCards.add(id);addIssue('info','simplification','Scripted Anki choices were converted to safe native choice chips',`${model.name} / ${template.name}`,id);}
      if(values.some(value => /<(?:script|style|svg|iframe|object|embed)\b/i.test(value))){simplifiedCards.add(id);addIssue('info','simplification','Active source markup was removed while preserving usable learning text',`${model.name} / ${template.name}`,id);}
      const remoteMarkup=`${template.q}\n${template.a}\n${values.join('\n')}`;
      if(/<a\b[^>]*href=["'][^"']+["']/i.test(remoteMarkup)){simplifiedCards.add(id);addIssue('info','simplification','Hyperlinks were reduced to inert link text',`${model.name} / ${template.name}`,id);}
      for (const match of remoteMarkup.matchAll(/<(?:img|audio|video|source|script|link)\b[^>]*(?:src|href)=["'](https?:\/\/[^"']+)/gi)){simplifiedCards.add(id);addIssue('warning','remote-dependency','Remote media, scripts and fonts are not fetched',match[1]!,id);}
      const mappedFrontMedia = mappedValue(mapping, 'front-media', fields), mappedBackMedia = mappedValue(mapping, 'back-media', fields);
      const frontImages = mediaNames(`${frontMarkup}\n${mappedFrontMedia}`, 'image'), backImages = mediaNames(`${backMarkup}\n${mappedBackMedia}`, 'image'), frontAudioNames = mediaNames(`${frontMarkup}\n${mappedFrontMedia}`, 'audio'), backAudioNames = mediaNames(`${backMarkup}\n${mappedBackMedia}`, 'audio');
      if(!front&&!frontImages.length&&!frontAudioNames.length){simplifiedCards.delete(id);excludedCards.add(id);addIssue('error','unsupported','Generated card has no usable prompt after safe conversion',`${model.name} / ${template.name}`,id);continue;}
      [...frontImages, ...backImages, ...frontAudioNames, ...backAudioNames].forEach(name => wantedMedia.add(name));
      const mappedNames = new Set(Object.entries(mapping?.fields ?? {}).filter(([, target]) => target !== 'ignore').map(([name]) => name));
      const rawMetadata:string[]=[];
      const allocated=new Set([referencedSourceField(fields,rendered.frontFields,'Context'),...rendered.details.map(detail=>detail.content)].filter(Boolean)),mappedNotes = mappedValues(mapping, 'notes', fields).filter(value=>!allocated.has(value)), image = frontImages[0], backImage = backImages[0] ?? image;
      const contentProvenance={front:model.cloze?'cloze' as const:unsupported.length?'mapping' as const:'template' as const,answer:model.cloze?'cloze' as const:unsupported.length?'mapping' as const:'template' as const,frontFields:unsupported.length?frontFieldNames:frontResult.referencedFields,answerFields:unsupported.length?answerFieldNames:backResult.referencedFields,blocks:rendered.provenanceBlocks};
      const sourceContentFingerprint=sourceCardFingerprint({noteGuid:String(guid),modelSignature:model.signature!,templateOrdinal:Number(ordinal),question:template.q,answer:template.a,fields:model.fields.map(name=>[name,fields[name]??'']),tags:String(rawTags).trim().split(/\s+/).filter(Boolean).slice(0,30).join(' '),deckId:String(deckId),media:[...frontImages,...backImages,...frontAudioNames,...backAudioNames]});
      const candidate:CardContent={ id, deckId: importedDeck.id,siblingGroupId:stable(`note-${guid}`), kind: image && !front ? 'visual' : 'text', front: front || 'Recall from the illustration', answer, pronunciation: mapping?.origin==='user-confirmed'?mappedValue(mapping,'pronunciation',fields)||rendered.pronunciation:rendered.pronunciation||mappedValue(mapping,'pronunciation',fields), meaning: mapping?.origin==='user-confirmed'?mappedValue(mapping,'meaning',fields)||rendered.meaning:rendered.meaning||mappedValue(mapping,'meaning',fields), notes: [`Imported source · ${model.name} / ${template.name}`, ...mappedNotes, ...rawMetadata].join('\n\n'), ...((image?{kind:'imported-media' as const}:rendered.art)?{art:image?{kind:'imported-media' as const}:rendered.art}:{}),...(rendered.choices.length?{choices:rendered.choices}:{}),...(rendered.answerLabel?{answerLabel:rendered.answerLabel}:{}),...(rendered.details.length?{details:rendered.details}:{}), tags: String(rawTags).trim().split(/\s+/).filter(Boolean).slice(0, 30), revision: 1, suspended: false, rarity: suggestedRarity(`${guid}-${ordinal}`),ankiSource:{kind:'anki',noteGuid:String(guid),noteId:String(noteId),templateOrdinal:Number(ordinal),modelName:model.name,templateName:template.name,modelSignature:model.signature!,sourceSnapshotId,sourceTemplateId:`${modelId}:${ordinal}`,importedContentHash:'00000000',sourceContentFingerprint,linkState:'linked',conversion:{converterVersion:ANKI_CONVERTER_VERSION,templateEngineVersion:ANKI_TEMPLATE_ENGINE_VERSION,normalizerVersion:ANKI_NORMALIZER_VERSION,enrichmentVersion:ANKI_ENRICHMENT_VERSION,mappingVersion:ANKI_MAPPING_VERSION,mappingPolicyVersion:mapping?.policyVersion??ANKI_MAPPING_POLICY_VERSION,mappingOrigin:mapping?.origin??'auto-inferred',mappingSignature:mappingFingerprint(mapping,model.signature!),fieldBaselines:{},fieldOrigins:{}},contentProvenance}, ...(image ? { image: `pending:${image}`, backImage: `pending:${backImage}`, imageDescription: 'Imported illustration. Reveal for the answer.' } : {}), ...(frontAudioNames.length ? { frontAudio: frontAudioNames.map(name => `pending:${name}`) } : {}), ...(backAudioNames.length ? { backAudio: backAudioNames.map(name => `pending:${name}`) } : {}) };const projected=mapping?.version===4&&mapping.origin==='user-confirmed'&&Object.values(mapping.fields).some(target=>!['ignore','front','answer','pronunciation','meaning','notes','front-media','back-media'].includes(target))?projectSemanticMapping(candidate,fields,mapping):candidate;cards.push(projected);
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
    sourceSnapshot.media=[...resolved].map(([name,ref])=>({name,assetId:ref.slice(6)}));sourceSnapshot.contentHash=`anki-source-snapshot-v2-${contentHash({...sourceSnapshot,contentHash:undefined})}`;
    for (let index=cards.length-1;index>=0;index--) { const card=cards[index]!,wasVisual=card.kind==='visual',pendingImage=card.image?.startsWith('pending:')?card.image.slice(8):undefined;const resolve = (value?: string) => value?.startsWith('pending:') ? resolved.get(value.slice(8)) : value; card.image = resolve(card.image); card.backImage = resolve(card.backImage); card.frontAudio = card.frontAudio?.map(item => resolve(item)).filter((item): item is string => !!item); card.backAudio = card.backAudio?.map(item => resolve(item)).filter((item): item is string => !!item); if (!card.image) { delete card.image; delete card.backImage; if(wasVisual){simplifiedCards.delete(card.id);excludedCards.add(card.id);addIssue('error','missing-media','Image-only prompt has no usable bundled image',pendingImage??card.id,card.id);cards.splice(index,1);continue;} } if (!card.frontAudio?.length) delete card.frontAudio; if (!card.backAudio?.length) delete card.backAudio; card.presentation=derivedCardPresentation(card,[sourceSnapshot]);if(card.ankiSource){card.ankiSource.importedContentHash=ankiImportedContentHash(card);if(card.ankiSource.conversion){card.ankiSource.conversion.fieldBaselines=fieldBaselines(card);card.ankiSource.conversion.fieldOrigins=Object.fromEntries(ANKI_DERIVED_FIELDS.map(field=>[field,'derived'])) as Partial<Record<AnkiDerivedField,'derived'>>;}} }
    const proposedRarities = Object.fromEntries((['common','uncommon','rare','holo-rare','ultra-rare','secret-rare','relic'] as Rarity[]).map(rarity => [rarity, cards.filter(card => card.rarity === rarity).length])) as Record<Rarity, number>;
    const simplified=[...simplifiedCards].filter(id=>cards.some(card=>card.id===id)).length;
    const deckValues=[...deckList.values()];return { variant, sourceNotes: noteCount, generatedCards: cards.length, decks: deckValues, cards, assets, issues,conversion:{normal:Math.max(0,cards.length-simplified),simplified,excluded:excludedCards.size,unsafe:unsafeCards.size},compatibility:{tierA:Math.max(0,cards.length-simplified),tierB:simplified,tierC:reviewCards.size,tierD:excludedCards.size+unsafeCards.size}, proposedRarities, packageName, modelSchemas,observedCardIds,effectiveMappings,sourceSnapshot,content:{lessonGroups:deckValues.filter(deck=>!deck.parentId).length,subdecks:deckValues.filter(deck=>!!deck.parentId).length,visualPanels:cards.filter(card=>card.art?.kind==='source-visual-panel').length,choiceCards:cards.filter(card=>card.choices?.length).length,choiceOptions:cards.reduce((sum,card)=>sum+(card.choices?.length??0),0),bundledMedia:assets.length} };
  } finally { db.close(); }
}

export function previewAnkiImport(analysis: AnkiAnalysis, state: State, preserveLocalEdits = true, updateRootDeckId?: string,intent:'import'|'update'|'repair'=updateRootDeckId?'update':'import'): AnkiImportPreview {
  const descendants = (root: string): Set<string> => { const ids=new Set([root]);let changed=true;while(changed){changed=false;for(const deck of state.decks)if(deck.parentId&&ids.has(deck.parentId)&&!ids.has(deck.id)){ids.add(deck.id);changed=true;}}return ids; };
  const scope = updateRootDeckId ? descendants(updateRootDeckId) : new Set<string>();
  const incomingScope=updateRootDeckId?(()=>{const ids=new Set([updateRootDeckId]);let changed=true;while(changed){changed=false;for(const deck of analysis.decks)if(deck.parentId&&ids.has(deck.parentId)&&!ids.has(deck.id)){ids.add(deck.id);changed=true;}}return ids;})():new Set(analysis.decks.map(deck=>deck.id));
  const scopedCards=analysis.cards.filter(card=>incomingScope.has(card.deckId)),incomingIds = new Set(scopedCards.map(card => card.id));
  const observedIds=new Set(analysis.observedCardIds);
  const summary:AnkiUpdateSummary={mode:intent,newCards:[],changedCards:[],sourceChangedCards:[],conversionUpgradeCards:[],mappingChangedCards:[],mappingReviewCards:[],changedMediaCards:[],unchangedCards:[],conflicts:[],conflictFields:{},deckConflicts:[],legacyReviewRequired:[],removedSourceCards:[],changedDecks:[],newDecks:[]};
  const cards:CardContent[]=[],transactions:AnkiCardTransaction[]=[];
  const conflictEligible=new Set<AnkiDerivedField>(['deckId','front','answer','pronunciation','meaning','notes','tags','image','backImage','imageDescription','frontAudio','backAudio','details','presentation']);
  for(const card of scopedCards){
    const existing=state.cards.find(item=>item.id===card.id);
    if(!existing){summary.newCards.push(card.id);cards.push(card);transactions.push({cardId:card.id,label:card.answer||card.front,proposed:structuredClone(card),selected:structuredClone(card),conflictFields:[]});continue;}
    if(!existing.ankiSource){summary.changedCards.push(card.id);summary.conflicts.push(card.id);summary.legacyReviewRequired.push(card.id);summary.conflictFields[card.id]=[...ANKI_DERIVED_FIELDS];if(!preserveLocalEdits)cards.push(card);continue;}
    if(existing.ankiSource?.linkState==='detached'){summary.unchangedCards.push(card.id);continue;}
    const baseline=existing.ankiSource?.importedContentHash,prior=existing.ankiSource?.conversion,incoming=card.ankiSource?.conversion;
    const sourceChanged=!!existing.ankiSource?.sourceContentFingerprint&&card.ankiSource?.sourceContentFingerprint!==existing.ankiSource.sourceContentFingerprint;
    const conversionUpgrade=!prior||prior.converterVersion<ANKI_CONVERTER_VERSION||(prior.templateEngineVersion??0)<ANKI_TEMPLATE_ENGINE_VERSION||prior.normalizerVersion<ANKI_NORMALIZER_VERSION||(prior.enrichmentVersion??0)<ANKI_ENRICHMENT_VERSION||prior.mappingVersion<ANKI_MAPPING_VERSION||prior.mappingOrigin!=='user-confirmed'&&(prior.mappingPolicyVersion??0)<ANKI_MAPPING_POLICY_VERSION;
    const mappingChanged=!!prior&&!!incoming&&prior.mappingSignature!==incoming.mappingSignature;
    const derivedChanged=!baseline||card.ankiSource?.importedContentHash!==baseline;
    const mediaChanged=JSON.stringify([existing.image,existing.backImage,existing.frontAudio,existing.backAudio])!==JSON.stringify([card.image,card.backImage,card.frontAudio,card.backAudio]);
    const persistedDrift=ANKI_DERIVED_FIELDS.some(field=>fieldHash(existing,field)!==fieldHash(card,field));
    if(!sourceChanged&&!conversionUpgrade&&!mappingChanged&&!derivedChanged&&!(intent==='repair'&&persistedDrift)){summary.unchangedCards.push(card.id);continue;}
    summary.changedCards.push(card.id);if(sourceChanged)summary.sourceChangedCards.push(card.id);if(conversionUpgrade)summary.conversionUpgradeCards.push(card.id);if(mappingChanged)summary.mappingChangedCards.push(card.id);if(mediaChanged)summary.changedMediaCards.push(card.id);
    const trustedLegacy=!!baseline&&ankiImportedContentHash(existing)===baseline;
    const origins=new Map<AnkiDerivedField,'derived'|'local'|'ambiguous'>();
    const conflicts=ANKI_DERIVED_FIELDS.filter(field=>{const accepted=prior?.fieldBaselines[field],local=fieldHash(existing,field),next=fieldHash(card,field),recorded=prior?.fieldOrigins?.[field],origin=accepted!==undefined&&accepted===local?'derived':recorded??(trustedLegacy?'derived':'ambiguous');origins.set(field,origin);if(!conflictEligible.has(field))return false;return origin==='ambiguous'?local!==next:origin==='local'&&local!==accepted&&next!==accepted&&local!==next;});
    if(conflicts.length){summary.conflicts.push(card.id);summary.conflictFields[card.id]=conflicts;if(!prior)summary.legacyReviewRequired.push(card.id);}
    const resolved=structuredClone(card),nextOrigins=resolved.ankiSource!.conversion!.fieldOrigins!;
    for(const field of ANKI_DERIVED_FIELDS){const origin=origins.get(field)??'derived',accepted=prior?.fieldBaselines[field],local=fieldHash(existing,field),next=fieldHash(card,field),keep=preserveLocalEdits&&(origin==='ambiguous'&&local!==next||origin==='local'&&local!==next&&(next===accepted||conflicts.includes(field)));if(keep){(resolved as unknown as Record<string,unknown>)[field]=structuredClone(fieldValue(existing,field));nextOrigins[field]=origin==='ambiguous'?'ambiguous':'local';}else nextOrigins[field]='derived';}
    cards.push(resolved);transactions.push({cardId:card.id,label:card.answer||card.front,current:structuredClone(existing),proposed:structuredClone(card),selected:structuredClone(resolved),conflictFields:[...conflicts]});
  }
  if(updateRootDeckId)summary.removedSourceCards=state.cards.filter(card=>scope.has(card.deckId)&&card.ankiSource?.kind==='anki'&&!observedIds.has(card.id)).map(card=>card.id);
  const decks:Deck[]=[];for(const deck of analysis.decks.filter(item=>incomingScope.has(item.id))){const existing=state.decks.find(item=>item.id===deck.id);if(!existing){summary.newDecks.push(deck.id);decks.push(deck);continue;}const baseline=existing.ankiSource?.importedContentHash,sourceChanged=!baseline||baseline!==deck.ankiSource?.importedContentHash,localChanged=!baseline||ankiImportedDeckHash(existing)!==baseline;if(!sourceChanged)continue;summary.changedDecks.push(deck.id);if(localChanged){summary.deckConflicts.push(deck.id);if(preserveLocalEdits)continue;}decks.push(deck);}
  const referencedAssets=new Set(cards.flatMap(card=>[card.image,card.backImage,...card.frontAudio??[],...card.backAudio??[]]).filter((ref):ref is string=>!!ref&&ref.startsWith('asset:')).map(ref=>ref.slice(6)));
  const bundle: ContentImport = { decks, cards: cards, designs: [], assets: analysis.assets.filter(asset=>referencedAssets.has(asset.id)), ankiSources:[analysis.sourceSnapshot] };
  const rootMatches=!updateRootDeckId||analysis.decks.some(deck=>deck.id===updateRootDeckId);
  const semanticInvalid=scopedCards.filter(card=>{const source=card.ankiSource,provenance=source?.contentProvenance;return !card.answer.trim()||!provenance||(provenance.answer==='mapping'&&!provenance.answerFields.length);});
  const meaningfulRepair=intent!=='repair'||transactions.some(item=>!item.current||ANKI_DERIVED_FIELDS.some(field=>fieldHash(item.current!,field)!==fieldHash(item.proposed,field)));
  const errors=[...(rootMatches?[]:['This Anki package does not contain the selected imported deck identity. Choose the revised package for this deck.']),...(semanticInvalid.length?[`${semanticInvalid.length} converted card${semanticInvalid.length===1?' has':'s have'} unresolved answer provenance. Review compatibility before applying.`]:[]),...(intent==='repair'&&summary.changedCards.length&&!meaningfulRepair?['No meaningful template-derived repair could be determined automatically. Review compatibility.']:[])];
  const preview=makePreview(bundle, state,errors) as AnkiImportPreview;preview.update=summary;preview.transaction={expectedVersion:state.version,sourceSnapshotHash:analysis.sourceSnapshot.contentHash,cards:transactions};return preview;
}
