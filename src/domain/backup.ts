import type { AnkiMappingPreset, AnkiSourceSnapshot, CardContent, CardState, Deck, DesignSet, FocusPreset, FocusSessionRequest, LocalAsset, Preferences, Rarity, State, StudyPreset, TodayStudyOverride } from './models';
import { CARD_COMPOSITIONS } from './design-system';
import { migrateState } from './migrations';
import { RARITIES } from './rewards';
import { CONFIG_VERSION, SCHEDULER_PARAMETERS, SCHEDULER_VERSION, mapRating } from './study';
import { validateDeckOverrides, validateStudyPreset, validateTodayOverride } from './study-settings';
import { validateFocusPreset, validateFocusRequest } from './focus-validation';

function fail(message: string): never { throw new Error(`Invalid HoloRecall data: ${message}`); }
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : fail('expected an object.');
const text = (value: unknown, max = 20000): value is string => typeof value === 'string' && value.length <= max;
const id = (value: unknown): value is string => text(value, 120) && /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);
const integer = (value: unknown, min = 0): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min;
const finite = (value: unknown, min = 0): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min;
const instant = (value: unknown): value is string => text(value, 40) && /^\d{4}-\d{2}-\d{2}T.+Z$/.test(value) && Number.isFinite(Date.parse(value));
const texts=(value:unknown,count:number,length:number):value is string[]=>Array.isArray(value)&&value.length<=count&&value.every(item=>text(item,length));
function validateSafeBlock(value:unknown):void{const block=object(value),kind=String(block['type']);if(kind==='heading'){if(!text(block['text'],100000)||![2,3,4].includes(Number(block['level'])))fail('invalid card detail heading.');return;}if(kind==='paragraph'||kind==='code'){if(!text(block['text'],100000))fail('invalid card detail text.');return;}if(kind==='pairs'){if(!Array.isArray(block['rows'])||block['rows'].length>500||!block['rows'].every(row=>{const pair=object(row);return text(pair['term'],10000)&&text(pair['description'],10000)}))fail('invalid card detail pairs.');return;}if(kind==='list'){if(typeof block['ordered']!=='boolean'||!texts(block['items'],500,10000))fail('invalid card detail list.');return;}if(kind==='table'){if(!texts(block['headers'],100,10000)||!Array.isArray(block['rows'])||block['rows'].length>500||!block['rows'].every(row=>texts(row,100,10000)))fail('invalid card detail table.');return;}fail('invalid card detail block type.');}
const FINISHES = ['matte','gloss','metallic','holographic','reverse-holo','prismatic','etched','textured-foil','starfield','shattered-glass','crystal','gilded','neon-ink','obsidian','aurora'];

export function validatePreferences(value: unknown): asserts value is Preferences {
  const prefs = object(value);
  if (typeof prefs['effects'] !== 'boolean' || !text(prefs['timeZone'], 100) || !integer(prefs['newCardLimit']) || prefs['newCardLimit'] > 1000 || !integer(prefs['reviewLimit'], 1) || prefs['reviewLimit'] > 10000) fail('invalid study preferences.');
  if (prefs['haptics'] !== undefined && typeof prefs['haptics'] !== 'boolean') fail('invalid haptics preference.');
  if (prefs['theme'] !== undefined && !['system', 'light', 'dark'].includes(String(prefs['theme']))) fail('invalid theme preference.');
  if (prefs['studyMode'] !== undefined && !['anki','mastery','free-revision'].includes(String(prefs['studyMode']))) fail('invalid Study mode preference.');
  try { new Intl.DateTimeFormat('en', { timeZone: prefs['timeZone'] as string }).format(); } catch { fail('unknown time zone.'); }
}

export function validateDeck(value: unknown): asserts value is Deck {
  const deck = object(value);
  if(deck['coverImage']!==undefined)validateMediaRef(deck['coverImage']);
  if (deck['designSetId'] !== undefined && !id(deck['designSetId'])) fail('invalid deck design reference.');
  if (deck['parentId'] !== undefined && !id(deck['parentId']) || deck['archived'] !== undefined && typeof deck['archived'] !== 'boolean') fail('invalid deck organisation.');
  if(deck['studyPresetId']!==undefined&&!id(deck['studyPresetId']))fail('invalid deck study preset.');
  if(deck['studyArtPolicy']!==undefined&&!['auto','image-first','text-first'].includes(String(deck['studyArtPolicy'])))fail('invalid deck study-art policy.');
  try{validateDeckOverrides(deck['studyOverrides'] as Deck['studyOverrides']);}catch(error){fail(error instanceof Error?error.message:'invalid deck study override.');}
  if (!id(deck['id']) || !text(deck['name'], 160) || !deck['name'].trim() || !text(deck['description'], 2000) || typeof deck['suspended'] !== 'boolean') fail('invalid deck.');
  if (deck['ankiSource'] !== undefined) {
    const source = object(deck['ankiSource']);
    if (source['kind'] !== 'anki' || (source['sourceDeckId'] !== undefined && !text(source['sourceDeckId'], 80)) || !text(source['sourcePath'], 1000) || !source['sourcePath'] || !/^[a-f0-9]{8}$/.test(String(source['importedContentHash']))) fail('invalid Anki deck source metadata.');
  }
}

export function validateCard(value: unknown): asserts value is CardContent {
  const card = object(value);
  if (!id(card['id']) || !id(card['deckId']) || !['text', 'visual'].includes(String(card['kind'])) || !integer(card['revision'], 1) || typeof card['suspended'] !== 'boolean') fail('invalid card identity.');
  for (const field of ['front', 'answer', 'pronunciation', 'meaning', 'notes']) if (!text(card[field])) fail(`invalid card ${field}.`);
  for (const field of ['secondary', 'interpretation']) if (card[field] !== undefined && !text(card[field])) fail(`invalid card ${field}.`);
  if (!(card['answer'] as string).trim() || (card['kind'] === 'text' && !(card['front'] as string).trim())) fail('cards need a prompt and answer.');
  if (!Array.isArray(card['tags']) || card['tags'].length > 30 || !card['tags'].every(tag => text(tag, 100))) fail('invalid card tags.');
  if (card['imageDescription'] !== undefined && !text(card['imageDescription'], 1000)) fail('invalid image description.');
  if (card['rarity'] !== undefined && !RARITIES.some(tier => tier.id === card['rarity'])) fail('invalid card rarity.');
  if (card['designSetId'] !== undefined && !id(card['designSetId'])) fail('invalid card design reference.');
  if (card['finish'] !== undefined && !FINISHES.includes(String(card['finish']))) fail('invalid card finish.');
  for (const key of ['image', 'backImage']) if (card[key] !== undefined) validateMediaRef(card[key]);
  for (const key of ['frontAudio', 'backAudio']) if (card[key] !== undefined && (!Array.isArray(card[key]) || card[key].length > 8 || !card[key].every((ref: unknown) => { try { validateMediaRef(ref); return true; } catch { return false; } }))) fail(`invalid card ${key}.`);
  if(card['choices']!==undefined&&(!Array.isArray(card['choices'])||card['choices'].length>24||!card['choices'].every(value=>text(value,500))))fail('invalid card choices.');
  if(card['answerLabel']!==undefined&&!text(card['answerLabel'],500))fail('invalid card answer label.');
  if(card['details']!==undefined){if(!Array.isArray(card['details'])||card['details'].length>24)fail('invalid card details.');for(const item of card['details']){const detail=object(item);if(!text(detail['label'],120)||!text(detail['content'],100000))fail('invalid card detail.');if(detail['blocks']!==undefined){if(!Array.isArray(detail['blocks'])||detail['blocks'].length>100)fail('invalid card detail blocks.');detail['blocks'].forEach(validateSafeBlock);}}}
  if(card['presentation']!==undefined){const presentation=object(card['presentation']);if(presentation['profile']!==undefined&&!['general','language'].includes(String(presentation['profile'])))fail('invalid card presentation profile.');if(presentation['artRole']!==undefined&&!['instructional','supportive','decorative','hidden'].includes(String(presentation['artRole'])))fail('invalid card artwork role.');if(presentation['studyArtPolicy']!==undefined&&!['auto','image-first','text-first'].includes(String(presentation['studyArtPolicy'])))fail('invalid card study-art policy.');for(const field of ['recallTask','recallCue','situationContext','taskGuidance','hint'])if(presentation[field]!==undefined&&!text(presentation[field],20000))fail('invalid card recall presentation.');if(presentation['recallGuidance']!==undefined&&(!Array.isArray(presentation['recallGuidance'])||presentation['recallGuidance'].length>8||!presentation['recallGuidance'].every(value=>text(value,20000))))fail('invalid card recall guidance.');}
  if(card['art']!==undefined){const art=object(card['art']),kind=String(art['kind']);if(!['source-visual-panel','generated-text-art','imported-media'].includes(kind))fail('invalid card art.');if(kind!=='imported-media'&&!text(art['title'],500))fail('invalid card art title.');for(const field of ['badge','subtitle','lesson','topic','sourceKind','seed'])if(art[field]!==undefined&&!text(art[field],1000))fail('invalid card art metadata.');}
  if (card['archived'] !== undefined && typeof card['archived'] !== 'boolean') fail('invalid card archive state.');
  if (card['createdAt'] !== undefined && !instant(card['createdAt'])) fail('invalid card creation time.');
  if(card['siblingGroupId']!==undefined&&!id(card['siblingGroupId']))fail('invalid sibling group.');
  if (card['kind'] === 'visual' && (!card['image'] || !card['imageDescription'])) fail('visual cards need an image and an answer-safe description.');
  if (card['ankiSource'] !== undefined) {
    const source = object(card['ankiSource']);
    if (source['kind'] !== 'anki' || !text(source['noteGuid'], 160) || !text(source['noteId'], 80) || !integer(source['templateOrdinal'], 0) || !text(source['modelName'], 240) || !text(source['templateName'], 240) || !text(source['modelSignature'], 120) || !/^anki-model-v1-/.test(String(source['modelSignature'])) || !/^[a-f0-9]{8}$/.test(String(source['importedContentHash']))) fail('invalid Anki card source metadata.');
    if(source['sourceContentFingerprint']!==undefined&&(!text(source['sourceContentFingerprint'],120)||!String(source['sourceContentFingerprint']).startsWith('anki-source-v1-')))fail('invalid Anki source fingerprint.');
    if(source['sourceSnapshotId']!==undefined&&!id(source['sourceSnapshotId'])||source['sourceTemplateId']!==undefined&&!text(source['sourceTemplateId'],100))fail('invalid Anki source snapshot reference.');
    if(source['linkState']!==undefined&&!['linked','detached'].includes(String(source['linkState'])))fail('invalid Anki source link state.');
    if(source['conversion']!==undefined){const conversion=object(source['conversion']);if(!integer(conversion['converterVersion'],1)||conversion['templateEngineVersion']!==undefined&&!integer(conversion['templateEngineVersion'],1)||!integer(conversion['normalizerVersion'],1)||conversion['enrichmentVersion']!==undefined&&!integer(conversion['enrichmentVersion'],1)||!integer(conversion['mappingVersion'],1)||conversion['mappingPolicyVersion']!==undefined&&!integer(conversion['mappingPolicyVersion'],0)||conversion['mappingOrigin']!==undefined&&!['auto-inferred','user-confirmed','legacy-unclassified'].includes(String(conversion['mappingOrigin']))||!text(conversion['mappingSignature'],120)||!String(conversion['mappingSignature']).startsWith('anki-mapping-v1-'))fail('invalid Anki conversion provenance.');const baselines=object(conversion['fieldBaselines']);for(const value of Object.values(baselines))if(!/^[a-f0-9]{8}$/.test(String(value)))fail('invalid Anki field baseline.');if(conversion['fieldOrigins']!==undefined){const origins=object(conversion['fieldOrigins']);if(Object.values(origins).some(value=>!['derived','local','ambiguous'].includes(String(value))))fail('invalid Anki field origin.');}}
  }
}

function validateCardState(value: unknown): asserts value is CardState {
  const state = object(value);
  if (!instant(state['due']) || (state['last_review'] !== undefined && !instant(state['last_review'])) || !integer(state['version'])) fail('invalid scheduling dates/version.');
  for (const field of ['stability', 'difficulty', 'elapsed_days', 'scheduled_days']) if (!finite(state[field])) fail(`invalid scheduler ${field}.`);
  for (const field of ['learning_steps', 'reps', 'lapses', 'state']) if (!integer(state[field])) fail(`invalid scheduler ${field}.`);
  if ((state['state'] as number) > 3 || (state['difficulty'] as number) > 10) fail('invalid scheduling state.');
}

/** Validate before trusting restored or previously persisted browser data. */
export function validateState(value: unknown): asserts value is State {
  const data = object(value);
  if (data['schemaVersion'] !== 8 || !integer(data['version']) || data['userId'] !== 'local-learner') fail('unsupported schema or learner.');
  validateExtensions(data);
  const scheduler = object(data['scheduler']);
  if (scheduler['version'] !== SCHEDULER_VERSION || scheduler['configVersion'] !== CONFIG_VERSION || JSON.stringify(scheduler['parameters']) !== JSON.stringify(SCHEDULER_PARAMETERS)) fail('unsupported scheduler configuration; migration is required.');
  validatePreferences(data['preferences']);
  if (!Array.isArray(data['cards']) || !Array.isArray(data['decks']) || !Array.isArray(data['events'])) fail('missing cards, decks or history.');
  const decks = data['decks'] as unknown[];
  const cards = data['cards'] as unknown[];
  decks.forEach(validateDeck);
  cards.forEach(validateCard);
  const typedDecks = decks as Deck[];
  const typedCards = cards as CardContent[];
  if (!Array.isArray(data['ankiSources'])) fail('missing Anki source snapshots.');
  (data['ankiSources'] as unknown[]).forEach(validateAnkiSourceSnapshot);
  if(new Set((data['ankiSources'] as AnkiSourceSnapshot[]).map(item=>item.id)).size!==(data['ankiSources'] as AnkiSourceSnapshot[]).length)fail('duplicate Anki source snapshots.');
  const deckIds = new Set(typedDecks.map(deck => deck.id));
  const deckById = new Map(typedDecks.map(deck => [deck.id, deck]));
  const cardIds = new Set(typedCards.map(card => card.id));
  if (deckIds.size !== decks.length || cardIds.size !== cards.length || typedCards.some(card => !deckIds.has(card.deckId))) fail('duplicate IDs or a card with no deck.');
  if (typedDecks.some(deck => deck.parentId && (!deckIds.has(deck.parentId) || deck.parentId === deck.id))) fail('deck hierarchy references an invalid parent.');
  for (const deck of typedDecks) { const visited = new Set<string>([deck.id]); let parent = deck.parentId; while (parent) { if (visited.has(parent)) fail('deck hierarchy contains a cycle.'); visited.add(parent); parent = typedDecks.find(item => item.id === parent)?.parentId; } }
  const states = object(data['states']);
  for (const [cardId, state] of Object.entries(states)) {
    if (!cardIds.has(cardId)) fail('scheduling state references a missing card.');
    validateCardState(state);
  }
  const eventIds = new Set<string>();
  const reviewIds = new Map<string, string>();
  const reversed = new Set<string>();
  const transitions=new Map<string,Array<{previous:number;result:CardState}>>();
  for (const value of data['events'] as unknown[]) {
    const event = object(value);
    if (!id(event['id']) || eventIds.has(event['id']) || !id(event['cardId']) || !cardIds.has(event['cardId']) || event['userId'] !== data['userId'] || !instant(event['timestamp']) || !integer(event['previousStateVersion'])) fail('invalid or duplicate review event.');
    eventIds.add(event['id']);
    validateCardState(event['resultingState']);
    const result = event['resultingState'] as CardState;
    if (result.version !== event['previousStateVersion'] + 1) fail('broken scheduling version history.');
    if (event['kind'] === 'review') {
      if (!id(event['sessionId']) || !integer(event['contentRevision'], 1) || !integer(event['rating'], 1) || event['rating'] > 5 || event['grade'] !== mapRating(event['rating'] as 1 | 2 | 3 | 4 | 5) || event['schedulerVersion'] !== SCHEDULER_VERSION || event['configVersion'] !== CONFIG_VERSION) fail('invalid review details.');
      if (event['mode'] !== undefined && event['mode'] !== 'scheduled') fail('invalid review mode.');
      if(event['experienceMode']!==undefined&&!['anki','mastery'].includes(String(event['experienceMode'])))fail('invalid review experience mode.');
      if (event['activeMs'] !== undefined && (!integer(event['activeMs']) || event['activeMs'] > 120000)) fail('invalid active study time.');
      if (event['recallMs'] !== undefined && (!integer(event['recallMs']) || event['recallMs'] > 120000)) fail('invalid recall time.');
      if(event['studyPresetId']!==undefined&&!id(event['studyPresetId']))fail('invalid review study preset.');
      if(event['studyRootDeckId']!==undefined&&(!id(event['studyRootDeckId'])||!deckIds.has(event['studyRootDeckId'])))fail('invalid review study root.');
      if(event['studyDeckId']!==undefined&&(!id(event['studyDeckId'])||!deckIds.has(event['studyDeckId'])))fail('invalid review study deck.');
      if(event['studyDeckPath']!==undefined){if(!Array.isArray(event['studyDeckPath'])||!event['studyDeckPath'].length||event['studyDeckPath'].length>100||event['studyDeckPath'].some(item=>!id(item)||!deckIds.has(item))||new Set(event['studyDeckPath']).size!==event['studyDeckPath'].length||event['studyDeckId']!==undefined&&event['studyDeckPath'][0]!==event['studyDeckId']||event['studyRootDeckId']!==undefined&&!event['studyDeckPath'].includes(event['studyRootDeckId'])||event['studyDeckPath'].some((item,index,path)=>index<path.length-1&&deckById.get(item)?.parentId!==path[index+1]))fail('invalid review deck path.');}
      if(event['studyDay']!==undefined&&(!text(event['studyDay'],10)||!/^\d{4}-\d{2}-\d{2}$/.test(event['studyDay'])))fail('invalid review study day.');
      if(event['studyTimeZone']!==undefined){if(!text(event['studyTimeZone'],100))fail('invalid review time zone.');try{new Intl.DateTimeFormat('en',{timeZone:event['studyTimeZone']}).format();}catch{fail('invalid review time zone.');}}
      validateCardState(event['previousState']);
      if ((event['previousState'] as CardState).version !== event['previousStateVersion']) fail('mismatched previous version.');
      reviewIds.set(event['id'], event['cardId']);
    } else if (event['kind'] === 'reversal') {
      if (!id(event['reviewEventId']) || reviewIds.get(event['reviewEventId']) !== event['cardId'] || reversed.has(event['reviewEventId'])) fail('invalid review reversal.');
      reversed.add(event['reviewEventId']);
    } else fail('unknown history event.');
    const cardId=event['cardId'] as string;transitions.set(cardId,[...(transitions.get(cardId)??[]),{previous:event['previousStateVersion'] as number,result}]);
  }
  const administrativeIds=new Map<string,string>(),administrativeRecords=new Map<string,Record<string,unknown>>(),administrativeReversals=new Set<string>();
  const validateControlSnapshot=(value:unknown)=>{const control=object(value);if(control['manualBuried']!==undefined&&typeof control['manualBuried']!=='boolean'||control['leech']!==undefined&&typeof control['leech']!=='boolean'||control['leechSuspended']!==undefined&&typeof control['leechSuspended']!=='boolean'||control['buriedOnDay']!==undefined&&!/^\d{4}-\d{2}-\d{2}$/.test(String(control['buriedOnDay']))||control['newPosition']!==undefined&&!integer(control['newPosition']))fail('invalid administrative control snapshot.');};
  for(const value of data['administrativeEvents'] as unknown[]){
    const event=object(value),action=String(event['action']);
    if(!id(event['id'])||eventIds.has(event['id'])||!id(event['cardId'])||!cardIds.has(event['cardId'])||event['userId']!==data['userId']||!instant(event['timestamp'])||!['set-due','reset','bury','unbury','suspend','unsuspend','reposition','undo'].includes(action))fail('invalid administrative event.');
    if(event['groupId']!==undefined&&!id(event['groupId']))fail('invalid administrative group.');
    if(event['detail']!==undefined&&!text(event['detail'],500))fail('invalid administrative event detail.');
    if(event['previousControl']!==undefined)validateControlSnapshot(event['previousControl']);if(event['resultingControl']!==undefined)validateControlSnapshot(event['resultingControl']);
    if(event['previousSuspended']!==undefined&&typeof event['previousSuspended']!=='boolean'||event['resultingSuspended']!==undefined&&typeof event['resultingSuspended']!=='boolean')fail('invalid administrative card status snapshot.');
    if(action==='undo'){const target=administrativeRecords.get(event['reversesEventId'] as string);if(!id(event['reversesEventId'])||!target||target['action']==='undo'||administrativeIds.get(event['reversesEventId'] as string)!==event['cardId']||administrativeReversals.has(event['reversesEventId'] as string))fail('invalid administrative reversal.');administrativeReversals.add(event['reversesEventId'] as string);}else if(event['reversesEventId']!==undefined)fail('invalid administrative reversal reference.');
    eventIds.add(event['id']);administrativeIds.set(event['id'] as string,event['cardId'] as string);administrativeRecords.set(event['id'] as string,event);
    if(event['resultingState']!==undefined){validateCardState(event['resultingState']);if(event['previousState']!==undefined)validateCardState(event['previousState']);const result=event['resultingState'] as CardState,previous=(event['previousState'] as CardState|undefined)?.version??0;if(result.version!==previous+1)fail('broken administrative scheduling version.');const cardId=event['cardId'] as string;transitions.set(cardId,[...(transitions.get(cardId)??[]),{previous,result}]);}
  }
  const adminValues=[...administrativeRecords.values()];
  const undoGroups=new Map<string,Record<string,unknown>[]>();
  for(const event of adminValues)if(event['action']==='undo'){
    if(!id(event['groupId']))fail('administrative reversal is missing its atomic group.');
    undoGroups.set(event['groupId'] as string,[...(undoGroups.get(event['groupId'] as string)??[]),event]);
  }
  for(const reversals of undoGroups.values()){
    const targets=reversals.map(event=>administrativeRecords.get(event['reversesEventId'] as string)!);
    const originalGroup=targets[0]?.['groupId'];
    if(!id(originalGroup)||targets.some(target=>target['groupId']!==originalGroup||target['action']==='undo'))fail('invalid administrative reversal group.');
    const originals=adminValues.filter(event=>event['action']!=='undo'&&event['groupId']===originalGroup);
    const targetIds=new Set(targets.map(target=>target['id'] as string));
    if(originals.length!==reversals.length||originals.some(original=>!targetIds.has(original['id'] as string)))fail('partial administrative reversal group.');
    for(let index=0;index<reversals.length;index++){
      const reversal=reversals[index]!,original=targets[index]!,action=String(original['action']);
      if((action==='set-due'||action==='reset')&&(reversal['previousState']===undefined||reversal['resultingState']===undefined))fail('administrative reversal is missing its scheduling snapshot.');
      if(['bury','unbury','suspend','unsuspend','reposition'].includes(action)&&(reversal['previousControl']===undefined||reversal['resultingControl']===undefined))fail('administrative reversal is missing its control snapshot.');
      if((action==='suspend'||action==='unsuspend')&&(reversal['previousSuspended']===undefined||reversal['resultingSuspended']===undefined))fail('administrative reversal is missing its card-status snapshot.');
    }
  }
  for(const event of data['practiceEvents'] as Array<{id:string}>)if(eventIds.has(event.id))fail('duplicate history event ID.');else eventIds.add(event.id);
  for(const [cardId,items] of transitions){items.sort((a,b)=>a.result.version-b.result.version);let prior=0;for(const item of items){if(item.previous!==prior)fail('broken scheduling version history.');prior=item.result.version;}if(JSON.stringify(states[cardId])!==JSON.stringify(items.at(-1)!.result))fail('current scheduling state does not match history.');}
  for (const cardId of Object.keys(states)) if (!transitions.has(cardId)) fail('scheduling state is missing its history.');
  validateReferences(data as unknown as State);
  validateRewards(data as unknown as State);
}

export function exportBackup(data: State, now: Date): string {
  return JSON.stringify({ format: 'holorecall-backup', version: 6, exportedAt: now.toISOString(), state: data }, null, 2);
}

export function parseBackup(json: string, bundledCards: CardContent[] = []): State {
  if (json.length > 100_000_000) fail('backup exceeds the 100 MB prototype limit.');
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { return fail('the file is not valid JSON.'); }
  const backup = object(parsed);
  if (backup['format'] !== 'holorecall-backup' || ![1, 2, 3, 4, 5, 6].includes(Number(backup['version'])) || !instant(backup['exportedAt'])) fail('unsupported backup format.');
  return migrateState(backup['state'], bundledCards);
}


export function validateMediaRef(value: unknown): asserts value is string {
  if (!text(value, 300) || (!/^\/?(?:assets|art)\/[a-zA-Z0-9/_-]+\.(svg|png|webp|jpe?g)$/.test(value) && !(value.startsWith('asset:') && id(value.slice(6))))) fail('invalid media reference; upload an image or use bundled artwork.');
}
export function validateAsset(value: unknown): asserts value is LocalAsset {
  const asset = object(value);
  const mime = String(asset['mime']), image = ['image/png', 'image/webp', 'image/jpeg'].includes(mime), audio = ['audio/mpeg', 'audio/wav'].includes(mime);
  if (!id(asset['id']) || !text(asset['name'], 240) || (!image && !audio)) fail('invalid uploaded media.');
  if (image && (!integer(asset['width'], 1) || !integer(asset['height'], 1) || asset['width'] > 8192 || asset['height'] > 8192)) fail('invalid uploaded image.');
  if (audio && (asset['width'] !== undefined || asset['height'] !== undefined)) fail('audio assets do not have image dimensions.');
  if (!text(asset['dataUrl'], 7_000_000) || !asset['dataUrl'].startsWith(`data:${asset['mime']};base64,`) || !/^[A-Za-z0-9+/]*={0,2}$/.test(asset['dataUrl'].split(',')[1] ?? '')) fail('invalid image bytes or image exceeds 5 MB.');
  const base64 = asset['dataUrl'].split(',')[1]!;
  let bytes: string;
  try { bytes = atob(base64.slice(0, 16)); } catch { return fail('invalid media bytes.'); }
  const signature = Array.from(bytes).map(char => char.charCodeAt(0));
  const validBytes = asset['mime'] === 'image/png' ? [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => signature[index] === byte)
    : asset['mime'] === 'image/jpeg' ? signature[0] === 255 && signature[1] === 216 && signature[2] === 255
      : asset['mime'] === 'image/webp' ? bytes.slice(0, 4) === 'RIFF' && bytes.slice(8, 12) === 'WEBP'
        : asset['mime'] === 'audio/mpeg' ? bytes.slice(0, 3) === 'ID3' || signature[0] === 255 && (signature[1] & 0xe0) === 0xe0
          : bytes.slice(0, 4) === 'RIFF' && bytes.slice(8, 12) === 'WAVE';
  if (!validBytes) fail('media bytes do not match the declared raster type or supported audio type.');
  for (const field of ['credit', 'source', 'license']) if (asset[field] !== undefined && !text(asset[field], 2000)) fail('invalid image attribution.');
  if (asset['contentHash'] !== undefined && !/^sha256:[a-f0-9]{64}$/.test(String(asset['contentHash']))) fail('invalid asset content hash.');
  if (asset['byteLength'] !== undefined && !integer(asset['byteLength'], 1)) fail('invalid asset byte length.');
}
export function validateDesign(value: unknown): asserts value is DesignSet {
  const design = object(value);
  if (!id(design['id']) || !text(design['name'], 160) || !design['name'].trim() || !['cover', 'contain'].includes(String(design['backgroundFit'])) || !['cover', 'contain'].includes(String(design['frameFit']))) fail('invalid design set.');
  for (const field of ['backgroundPositionX', 'backgroundPositionY']) if (!finite(design[field]) || design[field] > 100) fail('invalid image position.');
  for (const field of ['credit', 'source', 'license']) if (!text(design[field], 2000)) fail('invalid design attribution.');
  for (const field of ['frame', 'background']) if (design[field] !== undefined) validateMediaRef(design[field]);
  if (!FINISHES.includes(String(design['finish'] ?? 'matte'))) fail('invalid design finish.');
  if (design['layout'] !== undefined && !['clean', 'ornate', 'showcase'].includes(String(design['layout']))) fail('invalid design layout.');
  if (design['composition'] !== undefined && !CARD_COMPOSITIONS.includes(design['composition'] as never)) fail('invalid design composition.');
  if (design['layoutPolicy'] !== undefined && !['fixed', 'suggest'].includes(String(design['layoutPolicy']))) fail('invalid design layout policy.');
  if (design['studyArtPolicy'] !== undefined && !['auto','image-first','text-first'].includes(String(design['studyArtPolicy']))) fail('invalid design study-art policy.');
  const colour = (value: unknown): boolean => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
  if (design['palette'] !== undefined) {
    const palette = object(design['palette']);
    if (!colour(palette['primary']) || !colour(palette['secondary']) || !colour(palette['surface']) || !colour(palette['onSurface']) || palette['accent'] !== undefined && !colour(palette['accent'])) fail('invalid design palette.');
  }
  if (design['artwork'] !== undefined) {
    const artwork = object(design['artwork']);
    if (!finite(artwork['focalX']) || artwork['focalX'] > 100 || !finite(artwork['focalY']) || artwork['focalY'] > 100 || !['cover','contain'].includes(String(artwork['fit']))) fail('invalid artwork composition.');
    if (artwork['treatment'] !== undefined && !['clean','edge-fade','background-bleed','masked','duotone','embedded'].includes(String(artwork['treatment']))) fail('invalid artwork treatment.');
    if (artwork['mask'] !== undefined && !['none','soft-oval','rounded-window','frame-window'].includes(String(artwork['mask'])) || artwork['fullBleed'] !== undefined && typeof artwork['fullBleed'] !== 'boolean' || artwork['tint'] !== undefined && !colour(artwork['tint']) || artwork['safeZone'] !== undefined && !['centre','top','bottom','left','right'].includes(String(artwork['safeZone']))) fail('invalid artwork composition settings.');
    for (const field of ['vignette','edgeFade','backgroundBleed','duotone','textureBlend','emboss','depth']) if (artwork[field] !== undefined && (!finite(artwork[field]) || Number(artwork[field]) > 100)) fail('invalid artwork treatment intensity.');
  }
  if (design['texture'] !== undefined) validateMediaRef(design['texture']);
  if (design['frames'] !== undefined) for (const [rarity, ref] of Object.entries(object(design['frames']))) {
    if (!RARITIES.some(tier => tier.id === rarity)) fail('invalid frame rarity.');
    validateMediaRef(ref);
  }
  if (design['finishes'] !== undefined) for (const [rarity, finish] of Object.entries(object(design['finishes']))) {
    if (!RARITIES.some(tier => tier.id === rarity) || !FINISHES.includes(String(finish))) fail('invalid rarity finish.');
  }
  if (design['rarityVariants'] !== undefined) for (const [rarity, raw] of Object.entries(object(design['rarityVariants']))) {
    if (!RARITIES.some(tier => tier.id === rarity)) fail('invalid design rarity variant.');
    const variant = object(raw);
    if (variant['frame'] !== undefined) validateMediaRef(variant['frame']);
    if (variant['texture'] !== undefined) validateMediaRef(variant['texture']);
    if (variant['finish'] !== undefined && !FINISHES.includes(String(variant['finish'])) || variant['accent'] !== undefined && !colour(variant['accent']) || variant['composition'] !== undefined && !CARD_COMPOSITIONS.includes(variant['composition'] as never) || variant['effectIntensity'] !== undefined && (!finite(variant['effectIntensity']) || Number(variant['effectIntensity']) > 1)) fail('invalid design rarity variant settings.');
  }
}
export function validateRewardConfig(value: unknown): asserts value is Record<Rarity, number> {
  const config = object(value);
  if (Object.keys(config).length !== RARITIES.length) fail('invalid reward thresholds.');
  let previous = 0;
  for (const rarity of RARITIES) {
    const threshold = config[rarity.id];
    if (!integer(threshold, 1) || threshold > 365 || threshold <= previous) fail('reward thresholds must be strictly increasing, from 1 to 365 study days.');
    previous = threshold;
  }
}
function validateExtensions(data: Record<string, unknown>): void {
  if (!Array.isArray(data['assets']) || !Array.isArray(data['designs']) || !Array.isArray(data['rewardEvents'])) fail('missing design, media or reward data.');
  data['assets'].forEach(validateAsset); data['designs'].forEach(validateDesign);
  if (!Array.isArray(data['ankiMappings'])) fail('missing Anki mapping presets.');
  data['ankiMappings'].forEach(validateAnkiMapping);
  if(new Set((data['ankiMappings'] as AnkiMappingPreset[]).map(item=>item.id)).size!==(data['ankiMappings'] as AnkiMappingPreset[]).length||new Set((data['ankiMappings'] as AnkiMappingPreset[]).map(item=>`${item.sourceSignature}:${item.templateId??''}`)).size!==(data['ankiMappings'] as AnkiMappingPreset[]).length)fail('duplicate Anki mapping presets.');
  if(!Array.isArray(data['studyPresets'])||!data['studyPresets'].length||!Array.isArray(data['todayOverrides'])||!Array.isArray(data['administrativeEvents'])||!Array.isArray(data['practiceEvents'])||!Array.isArray(data['focusPresets']))fail('missing study configuration or management history.');
  try{(data['studyPresets'] as StudyPreset[]).forEach(validateStudyPreset);(data['todayOverrides'] as TodayStudyOverride[]).forEach(validateTodayOverride);(data['focusPresets'] as FocusPreset[]).forEach(validateFocusPreset);}catch(error){fail(error instanceof Error?error.message:'invalid study configuration.');}
  if(new Set((data['studyPresets'] as StudyPreset[]).map(item=>item.id)).size!==(data['studyPresets'] as StudyPreset[]).length)fail('duplicate study preset IDs.');
  if(new Set((data['focusPresets'] as FocusPreset[]).map(item=>item.id)).size!==(data['focusPresets'] as FocusPreset[]).length)fail('duplicate Focus preset IDs.');
  const practiceIds=new Set<string>();for(const value of data['practiceEvents'] as unknown[]){const event=object(value);if(event['kind']!=='practice'||!id(event['id'])||practiceIds.has(event['id'])||event['userId']!==data['userId']||!id(event['cardId'])||!id(event['sessionId'])||!instant(event['timestamp'])||!integer(event['rating'],1)||Number(event['rating'])>5||!integer(event['activeMs'])||Number(event['activeMs'])>120000||event['recallMs']!==undefined&&(!integer(event['recallMs'])||Number(event['recallMs'])>120000))fail('invalid practice event.');practiceIds.add(event['id'] as string);}
  const controls=object(data['cardControls']);for(const [cardId,value] of Object.entries(controls)){if(!id(cardId))fail('invalid card control ID.');const control=object(value);if(control['manualBuried']!==undefined&&typeof control['manualBuried']!=='boolean'||control['leech']!==undefined&&typeof control['leech']!=='boolean'||control['leechSuspended']!==undefined&&typeof control['leechSuspended']!=='boolean'||control['buriedOnDay']!==undefined&&!/^\d{4}-\d{2}-\d{2}$/.test(String(control['buriedOnDay']))||control['newPosition']!==undefined&&!integer(control['newPosition']))fail('invalid card scheduling control.');}
  validateRewardConfig(data['rewardConfig']);
  const assets = data['assets'] as LocalAsset[], designs = data['designs'] as DesignSet[];
  if (new Set(assets.map(item => item.id)).size !== assets.length || new Set(designs.map(item => item.id)).size !== designs.length) fail('duplicate asset or design IDs.');
  if (assets.reduce((sum, asset) => sum + asset.dataUrl.length, 0) > 80_000_000) fail('uploaded media exceed the 60 MB local prototype limit.');
  if (data['session'] !== null) {
    const session = object(data['session']);
    if (!id(session['id']) || !Array.isArray(session['queue']) || !session['queue'].every(id) || new Set(session['queue']).size !== session['queue'].length || !integer(session['total']) || !integer(session['completed']) || session['completed'] > session['total'] || session['queue'].length + session['completed'] !== session['total'] || typeof session['revealed'] !== 'boolean' || !integer(session['activeMs']) || session['activeMs'] > 120000) fail('invalid persisted study session.');
    if (session['cardStartedAt'] !== undefined && !instant(session['cardStartedAt'])) fail('invalid session time.');
    if (session['startedAt'] !== undefined && !instant(session['startedAt'])) fail('invalid session start.');
    if (session['endedAt'] !== undefined && !instant(session['endedAt'])) fail('invalid session completion.');
    if (session['partial'] !== undefined && typeof session['partial'] !== 'boolean') fail('invalid partial session flag.');
    if (session['plannedTotal'] !== undefined && !integer(session['plannedTotal'])) fail('invalid planned session total.');
    if (session['recallMs'] !== undefined && (!integer(session['recallMs']) || session['recallMs'] > 120000)) fail('invalid persisted recall time.');
    if (session['lastReviewCardId'] !== undefined && !id(session['lastReviewCardId'])) fail('invalid previous session card.');
    if(session['scopeDeckId']!==undefined&&!id(session['scopeDeckId']))fail('invalid session deck scope.');
    if(!['scheduled','practice'].includes(String(session['mode'])))fail('invalid session mode.');
    if(session['experienceMode']!==undefined&&!['anki','mastery','free-revision'].includes(String(session['experienceMode'])))fail('invalid Study experience mode.');
    if(session['label']!==undefined&&!text(session['label'],160))fail('invalid session label.');
    if(session['lastPracticeEventId']!==undefined&&!id(session['lastPracticeEventId']))fail('invalid practice event reference.');
    if(session['autoAdvancePaused']!==undefined&&typeof session['autoAdvancePaused']!=='boolean'||session['autoAdvanceRemainingMs']!==undefined&&(!integer(session['autoAdvanceRemainingMs'])||Number(session['autoAdvanceRemainingMs'])>120000))fail('invalid Auto Advance recovery state.');
    if(session['repetitionDue']!==undefined){const entries=object(session['repetitionDue']);for(const [cardId,value] of Object.entries(entries))if(!id(cardId)||!instant(value))fail('invalid Study repetition state.');}
    if(session['focus']!==undefined)try{validateFocusRequest(session['focus'] as never);}catch(error){fail(error instanceof Error?error.message:'invalid Focus session.');}
  }
}
export function validateReferences(data: State): void {
  const assets = new Set(data.assets.map(asset => asset.id)), designs = new Set(data.designs.map(design => design.id)),presets=new Set(data.studyPresets.map(preset=>preset.id)),cards=new Set(data.cards.map(card=>card.id)),decks=new Set(data.decks.map(deck=>deck.id));
  const refs = [...data.cards.flatMap(card => [card.image, card.backImage, ...(card.frontAudio ?? []), ...(card.backAudio ?? [])]), ...data.designs.flatMap(design => [design.background, design.frame, design.texture, ...Object.values(design.frames ?? {}), ...Object.values(design.rarityVariants ?? {}).flatMap(variant => [variant?.frame, variant?.texture])]),...data.ankiSources.flatMap(source=>source.media.map(media=>`asset:${media.assetId}`))];
  // Missing imported references are rejected, while deleted bundled assets get a renderer fallback.
  if (refs.some(ref => ref?.startsWith('asset:') && !assets.has(ref.slice(6)))) fail('image reference does not resolve to an uploaded asset.');
  if ([...data.cards, ...data.decks].some(item => item.designSetId && !designs.has(item.designSetId))) fail('design reference does not resolve.');
  if (data.session?.queue.some(cardId => !data.cards.some(card => card.id === cardId))) fail('study session references a missing card.');
  if(data.decks.some(deck=>deck.studyPresetId&&!presets.has(deck.studyPresetId))||data.todayOverrides.some(item=>!decks.has(item.deckId)))fail('study configuration references a missing preset or deck.');
  if(Object.keys(data.cardControls).some(cardId=>!cards.has(cardId))||data.administrativeEvents.some(event=>!cards.has(event.cardId))||data.practiceEvents.some(event=>!cards.has(event.cardId)))fail('card management references missing content.');
  const invalidFocus=(focus:FocusSessionRequest|FocusPreset)=>focus.criteria.deckId&&!decks.has(focus.criteria.deckId)||focus.criteria.explicitCardIds?.some(cardId=>!cards.has(cardId));
  if(data.focusPresets.some(invalidFocus)||data.session?.focus&&invalidFocus(data.session.focus)||data.session?.focus?.presetId&&!data.focusPresets.some(preset=>preset.id===data.session!.focus!.presetId))fail('Focus selection references missing content.');
  if(data.session?.lastPracticeEventId&&!data.practiceEvents.some(event=>event.id===data.session!.lastPracticeEventId&&event.sessionId===data.session!.id))fail('session practice event reference does not resolve.');
  const sourceIds=new Set(data.ankiSources.map(source=>source.id));if(data.cards.some(card=>card.ankiSource?.sourceSnapshotId&&!sourceIds.has(card.ankiSource.sourceSnapshotId)))fail('card references a missing Anki source snapshot.');
}
export function validateAnkiMapping(value: unknown): asserts value is AnkiMappingPreset {
  const mapping = object(value);
  if (!id(mapping['id']) || ![1,2,3,4].includes(Number(mapping['version'])) || mapping['policyVersion']!==undefined&&!integer(mapping['policyVersion'],0) || mapping['origin']!==undefined&&!['auto-inferred','user-confirmed','legacy-unclassified'].includes(String(mapping['origin'])) || mapping['scope']!==undefined&&!['template','model','deck'].includes(String(mapping['scope'])) || mapping['templateId']!==undefined&&!text(mapping['templateId'],120) || mapping['templateName']!==undefined&&!text(mapping['templateName'],240) || !text(mapping['name'], 120) || !mapping['name'].trim() || !text(mapping['sourceSignature'], 120) || !mapping['sourceSignature'].startsWith('anki-model-v1-') || !text(mapping['modelName'], 240)) fail('invalid Anki mapping identity.');
  const fields = object(mapping['fields']);
  if (Object.keys(fields).length > 100 || Object.values(fields).some(target => typeof target!=='string'||target.length>32||!/^[a-z]+(?:-[a-z]+)*$/.test(target))) fail('invalid Anki field mapping.');
}
export function validateAnkiSourceSnapshot(value: unknown): asserts value is AnkiSourceSnapshot {
  const snapshot=object(value);
  if(!id(snapshot['id'])||![1,2].includes(Number(snapshot['version']))||!['legacy-anki2','legacy-anki21','modern-anki21b'].includes(String(snapshot['packageVariant']))||!Array.isArray(snapshot['sourceDecks'])||!Array.isArray(snapshot['noteTypes'])||!Array.isArray(snapshot['notes'])||!Array.isArray(snapshot['cards'])||!Array.isArray(snapshot['media'])||!/^anki-source-snapshot-v[12]-[a-f0-9]{8}$/.test(String(snapshot['contentHash'])))fail('invalid Anki source snapshot.');
  if(snapshot['noteTypes'].length>100||snapshot['notes'].length>10000||snapshot['cards'].length>25000)fail('Anki source snapshot exceeds limits.');
  for(const raw of snapshot['noteTypes'] as unknown[]){const model=object(raw);if(!text(model['id'],80)||!text(model['name'],240)||typeof model['cloze']!=='boolean'||!Array.isArray(model['fields'])||!Array.isArray(model['templates'])||!text(model['signature'],120))fail('invalid Anki note type snapshot.');}
  for(const raw of snapshot['notes'] as unknown[]){const note=object(raw);if(!text(note['id'],80)||!text(note['guid'],160)||!text(note['noteTypeId'],80)||!Array.isArray(note['tags'])||typeof note['fields']!=='object'||note['fields']===null)fail('invalid Anki note snapshot.');}
  for(const raw of snapshot['cards'] as unknown[]){const card=object(raw);if(!text(card['id'],100)||!text(card['noteId'],80)||!text(card['templateId'],100)||!integer(card['templateOrdinal'],0)||!text(card['sourceDeckId'],80))fail('invalid Anki card snapshot.');}
}
function validateRewards(data: State): void {
  const seen = new Map<string, State['rewardEvents'][number]>(), reversed = new Set<string>();
  const reviews = new Map(data.events.filter(event => event.kind === 'review').map(event => [event.id, event]));
  for (const event of data.rewardEvents) {
    if (!id(event.id) || seen.has(event.id) || !instant(event.timestamp) || !id(event.cardId) || !id(event.reviewEventId)) fail('invalid reward event.');
    const review = reviews.get(event.reviewEventId);
    if (!review || review.cardId !== event.cardId) fail('reward must reference its real review.');
    if (event.kind === 'contribution') {
      if (review.rating < 4 || event.configVersion !== 'confidence-days-v1' || !/^\d{4}-\d{2}-\d{2}$/.test(event.studyDay) || !text(event.timeZone, 100) || [...seen.values()].some(prior => prior.kind === 'contribution' && prior.reviewEventId === event.reviewEventId)) fail('invalid reward contribution.');
    } else if (event.kind === 'unlock') {
      if (!RARITIES.some(tier => tier.id === event.rarity) || !integer(event.required, 1) || !Array.isArray(event.contributionIds) || event.contributionIds.length < event.required || new Set(event.contributionIds).size !== event.contributionIds.length || event.contributionIds.some(id => seen.get(id)?.kind !== 'contribution' || seen.get(id)?.cardId !== event.cardId || reversed.has(id))) fail('invalid unlock evidence.');
    } else if(event.kind==='prestige-contribution'){
      const card=data.cards.find(item=>item.id===event.cardId),mastery=card?data.rewardConfig[card.rarity??'common']:Number.MAX_SAFE_INTEGER,prior=[...seen.values()].filter(item=>item.cardId===event.cardId&&!reversed.has(item.id)),masteryDays=prior.filter(item=>item.kind==='contribution').length,level=prior.filter(item=>item.kind==='prestige-promotion').reduce((highest,item)=>item.kind==='prestige-promotion'?Math.max(highest,item.level):highest,0);
      if(review.rating<4||event.configVersion!=='prestige-days-v1'||!/^\d{4}-\d{2}-\d{2}$/.test(event.studyDay)||!text(event.timeZone,100)||!integer(event.cycle,1)||event.cycle>10||masteryDays<mastery||event.cycle!==level+1||prior.some(item=>item.kind==='prestige-contribution'&&(item.reviewEventId===event.reviewEventId||item.cycle===event.cycle&&item.studyDay===event.studyDay)))fail('invalid Prestige contribution.');
    } else if(event.kind==='prestige-promotion'){
      const priorLevels=[...seen.values()].filter(item=>item.kind==='prestige-promotion'&&item.cardId===event.cardId&&!reversed.has(item.id)).map(item=>item.kind==='prestige-promotion'?item.level:0),next=(priorLevels.length?Math.max(...priorLevels):0)+1;
      if(!integer(event.level,1)||event.level>10||event.level!==next||!integer(event.required,1)||!Array.isArray(event.contributionIds)||event.contributionIds.length!==event.required||new Set(event.contributionIds).size!==event.contributionIds.length||event.contributionIds.some(id=>{const contribution=seen.get(id);return contribution?.kind!=='prestige-contribution'||contribution.cardId!==event.cardId||contribution.cycle!==event.level||reversed.has(id);})||[...seen.values()].some(prior=>prior.kind==='prestige-promotion'&&prior.cardId===event.cardId&&prior.level===event.level))fail('invalid Prestige promotion evidence.');
    } else if (event.kind === 'reward-reversal') {
      if (!data.events.some(study => study.kind === 'reversal' && study.reviewEventId === event.reviewEventId) || !Array.isArray(event.reversedEventIds) || event.reversedEventIds.some(id => !seen.has(id) || seen.get(id)?.cardId !== event.cardId || reversed.has(id))) fail('invalid reward reversal.');
      event.reversedEventIds.forEach(id => reversed.add(id));
    } else fail('unknown reward event.');
    seen.set(event.id, event);
  }
}
