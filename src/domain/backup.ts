import type { AnkiMappingPreset, CardContent, CardState, Deck, DesignSet, LocalAsset, Preferences, Rarity, State, StudyPreset, TodayStudyOverride } from './models';
import { migrateState } from './migrations';
import { RARITIES } from './rewards';
import { CONFIG_VERSION, SCHEDULER_PARAMETERS, SCHEDULER_VERSION, mapRating } from './study';
import { validateDeckOverrides, validateStudyPreset, validateTodayOverride } from './study-settings';

function fail(message: string): never { throw new Error(`Invalid HoloRecall data: ${message}`); }
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : fail('expected an object.');
const text = (value: unknown, max = 20000): value is string => typeof value === 'string' && value.length <= max;
const id = (value: unknown): value is string => text(value, 120) && /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);
const integer = (value: unknown, min = 0): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min;
const finite = (value: unknown, min = 0): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min;
const instant = (value: unknown): value is string => text(value, 40) && /^\d{4}-\d{2}-\d{2}T.+Z$/.test(value) && Number.isFinite(Date.parse(value));
const FINISHES = ['matte', 'metallic', 'holographic', 'prismatic', 'etched', 'starfield', 'crystal', 'gilded', 'aurora'];

export function validatePreferences(value: unknown): asserts value is Preferences {
  const prefs = object(value);
  if (typeof prefs['effects'] !== 'boolean' || !text(prefs['timeZone'], 100) || !integer(prefs['newCardLimit']) || prefs['newCardLimit'] > 1000 || !integer(prefs['reviewLimit'], 1) || prefs['reviewLimit'] > 10000) fail('invalid study preferences.');
  if (prefs['theme'] !== undefined && !['system', 'light', 'dark'].includes(String(prefs['theme']))) fail('invalid theme preference.');
  try { new Intl.DateTimeFormat('en', { timeZone: prefs['timeZone'] as string }).format(); } catch { fail('unknown time zone.'); }
}

export function validateDeck(value: unknown): asserts value is Deck {
  const deck = object(value);
  if (deck['designSetId'] !== undefined && !id(deck['designSetId'])) fail('invalid deck design reference.');
  if (deck['parentId'] !== undefined && !id(deck['parentId']) || deck['archived'] !== undefined && typeof deck['archived'] !== 'boolean') fail('invalid deck organisation.');
  if(deck['studyPresetId']!==undefined&&!id(deck['studyPresetId']))fail('invalid deck study preset.');
  try{validateDeckOverrides(deck['studyOverrides'] as Deck['studyOverrides']);}catch(error){fail(error instanceof Error?error.message:'invalid deck study override.');}
  if (!id(deck['id']) || !text(deck['name'], 160) || !deck['name'].trim() || !text(deck['description'], 2000) || typeof deck['suspended'] !== 'boolean') fail('invalid deck.');
}

export function validateCard(value: unknown): asserts value is CardContent {
  const card = object(value);
  if (!id(card['id']) || !id(card['deckId']) || !['text', 'visual'].includes(String(card['kind'])) || !integer(card['revision'], 1) || typeof card['suspended'] !== 'boolean') fail('invalid card identity.');
  for (const field of ['front', 'answer', 'pronunciation', 'meaning', 'notes']) if (!text(card[field])) fail(`invalid card ${field}.`);
  if (!(card['answer'] as string).trim() || (card['kind'] === 'text' && !(card['front'] as string).trim())) fail('cards need a prompt and answer.');
  if (!Array.isArray(card['tags']) || card['tags'].length > 30 || !card['tags'].every(tag => text(tag, 100))) fail('invalid card tags.');
  if (card['imageDescription'] !== undefined && !text(card['imageDescription'], 1000)) fail('invalid image description.');
  if (card['rarity'] !== undefined && !RARITIES.some(tier => tier.id === card['rarity'])) fail('invalid card rarity.');
  if (card['designSetId'] !== undefined && !id(card['designSetId'])) fail('invalid card design reference.');
  if (card['finish'] !== undefined && !FINISHES.includes(String(card['finish']))) fail('invalid card finish.');
  for (const key of ['image', 'backImage']) if (card[key] !== undefined) validateMediaRef(card[key]);
  for (const key of ['frontAudio', 'backAudio']) if (card[key] !== undefined && (!Array.isArray(card[key]) || card[key].length > 8 || !card[key].every((ref: unknown) => { try { validateMediaRef(ref); return true; } catch { return false; } }))) fail(`invalid card ${key}.`);
  if (card['archived'] !== undefined && typeof card['archived'] !== 'boolean') fail('invalid card archive state.');
  if (card['createdAt'] !== undefined && !instant(card['createdAt'])) fail('invalid card creation time.');
  if(card['siblingGroupId']!==undefined&&!id(card['siblingGroupId']))fail('invalid sibling group.');
  if (card['kind'] === 'visual' && (!card['image'] || !card['imageDescription'])) fail('visual cards need an image and an answer-safe description.');
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
  if (data['schemaVersion'] !== 5 || !integer(data['version']) || data['userId'] !== 'local-learner') fail('unsupported schema or learner.');
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
      if (event['mode'] !== undefined && !['scheduled', 'practice'].includes(String(event['mode']))) fail('invalid review mode.');
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
  for(const value of data['administrativeEvents'] as unknown[]){const event=object(value);if(!id(event['id'])||eventIds.has(event['id'])||!id(event['cardId'])||!cardIds.has(event['cardId'])||event['userId']!==data['userId']||!instant(event['timestamp'])||!['set-due','reset','bury','unbury','suspend','unsuspend','reposition'].includes(String(event['action'])))fail('invalid administrative event.');eventIds.add(event['id']);if(event['detail']!==undefined&&!text(event['detail'],500))fail('invalid administrative event detail.');if(event['resultingState']!==undefined){validateCardState(event['resultingState']);if(event['previousState']!==undefined)validateCardState(event['previousState']);const result=event['resultingState'] as CardState,previous=(event['previousState'] as CardState|undefined)?.version??0;if(result.version!==previous+1)fail('broken administrative scheduling version.');const cardId=event['cardId'] as string;transitions.set(cardId,[...(transitions.get(cardId)??[]),{previous,result}]);}}
  for(const [cardId,items] of transitions){items.sort((a,b)=>a.result.version-b.result.version);let prior=0;for(const item of items){if(item.previous!==prior)fail('broken scheduling version history.');prior=item.result.version;}if(JSON.stringify(states[cardId])!==JSON.stringify(items.at(-1)!.result))fail('current scheduling state does not match history.');}
  for (const cardId of Object.keys(states)) if (!transitions.has(cardId)) fail('scheduling state is missing its history.');
  validateReferences(data as unknown as State);
  validateRewards(data as unknown as State);
}

export function exportBackup(data: State, now: Date): string {
  return JSON.stringify({ format: 'holorecall-backup', version: 5, exportedAt: now.toISOString(), state: data }, null, 2);
}

export function parseBackup(json: string, bundledCards: CardContent[] = []): State {
  if (json.length > 100_000_000) fail('backup exceeds the 100 MB prototype limit.');
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { return fail('the file is not valid JSON.'); }
  const backup = object(parsed);
  if (backup['format'] !== 'holorecall-backup' || ![1, 2, 3, 4, 5].includes(Number(backup['version'])) || !instant(backup['exportedAt'])) fail('unsupported backup format.');
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
  if (design['texture'] !== undefined) validateMediaRef(design['texture']);
  if (design['frames'] !== undefined) for (const [rarity, ref] of Object.entries(object(design['frames']))) {
    if (!RARITIES.some(tier => tier.id === rarity)) fail('invalid frame rarity.');
    validateMediaRef(ref);
  }
  if (design['finishes'] !== undefined) for (const [rarity, finish] of Object.entries(object(design['finishes']))) {
    if (!RARITIES.some(tier => tier.id === rarity) || !FINISHES.includes(String(finish))) fail('invalid rarity finish.');
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
  if(!Array.isArray(data['studyPresets'])||!data['studyPresets'].length||!Array.isArray(data['todayOverrides'])||!Array.isArray(data['administrativeEvents']))fail('missing study configuration or management history.');
  try{(data['studyPresets'] as StudyPreset[]).forEach(validateStudyPreset);(data['todayOverrides'] as TodayStudyOverride[]).forEach(validateTodayOverride);}catch(error){fail(error instanceof Error?error.message:'invalid study configuration.');}
  if(new Set((data['studyPresets'] as StudyPreset[]).map(item=>item.id)).size!==(data['studyPresets'] as StudyPreset[]).length)fail('duplicate study preset IDs.');
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
    if (session['plannedTotal'] !== undefined && !integer(session['plannedTotal'], session['total'] as number)) fail('invalid planned session total.');
    if (session['recallMs'] !== undefined && (!integer(session['recallMs']) || session['recallMs'] > 120000)) fail('invalid persisted recall time.');
    if (session['lastReviewCardId'] !== undefined && !id(session['lastReviewCardId'])) fail('invalid previous session card.');
    if(session['scopeDeckId']!==undefined&&!id(session['scopeDeckId']))fail('invalid session deck scope.');
  }
}
export function validateReferences(data: State): void {
  const assets = new Set(data.assets.map(asset => asset.id)), designs = new Set(data.designs.map(design => design.id)),presets=new Set(data.studyPresets.map(preset=>preset.id)),cards=new Set(data.cards.map(card=>card.id)),decks=new Set(data.decks.map(deck=>deck.id));
  const refs = [...data.cards.flatMap(card => [card.image, card.backImage, ...(card.frontAudio ?? []), ...(card.backAudio ?? [])]), ...data.designs.flatMap(design => [design.background, design.frame, design.texture, ...Object.values(design.frames ?? {})])];
  // Missing imported references are rejected, while deleted bundled assets get a renderer fallback.
  if (refs.some(ref => ref?.startsWith('asset:') && !assets.has(ref.slice(6)))) fail('image reference does not resolve to an uploaded asset.');
  if ([...data.cards, ...data.decks].some(item => item.designSetId && !designs.has(item.designSetId))) fail('design reference does not resolve.');
  if (data.session?.queue.some(cardId => !data.cards.some(card => card.id === cardId))) fail('study session references a missing card.');
  if(data.decks.some(deck=>deck.studyPresetId&&!presets.has(deck.studyPresetId))||data.todayOverrides.some(item=>!decks.has(item.deckId)))fail('study configuration references a missing preset or deck.');
  if(Object.keys(data.cardControls).some(cardId=>!cards.has(cardId))||data.administrativeEvents.some(event=>!cards.has(event.cardId)))fail('card management references missing content.');
}
export function validateAnkiMapping(value: unknown): asserts value is AnkiMappingPreset {
  const mapping = object(value), targets = ['ignore','front','answer','pronunciation','meaning','notes','front-media','back-media'];
  if (!id(mapping['id']) || mapping['version'] !== 1 || !text(mapping['name'], 120) || !mapping['name'].trim() || !text(mapping['sourceSignature'], 120) || !mapping['sourceSignature'].startsWith('anki-model-v1-') || !text(mapping['modelName'], 240)) fail('invalid Anki mapping identity.');
  const fields = object(mapping['fields']);
  if (Object.keys(fields).length > 100 || Object.values(fields).some(target => !targets.includes(String(target)))) fail('invalid Anki field mapping.');
}
function validateRewards(data: State): void {
  const seen = new Map<string, State['rewardEvents'][number]>(), reversed = new Set<string>();
  const reviews = new Map(data.events.filter(event => event.kind === 'review').map(event => [event.id, event]));
  for (const event of data.rewardEvents) {
    if (!id(event.id) || seen.has(event.id) || !instant(event.timestamp) || !id(event.cardId) || !id(event.reviewEventId)) fail('invalid reward event.');
    const review = reviews.get(event.reviewEventId);
    if (!review || review.cardId !== event.cardId) fail('reward must reference its real review.');
    if (event.kind === 'contribution') {
      if (review.rating < 4 || review.mode === 'practice' || event.configVersion !== 'confidence-days-v1' || !/^\d{4}-\d{2}-\d{2}$/.test(event.studyDay) || !text(event.timeZone, 100) || [...seen.values()].some(prior => prior.kind === 'contribution' && prior.reviewEventId === event.reviewEventId)) fail('invalid reward contribution.');
    } else if (event.kind === 'unlock') {
      if (!RARITIES.some(tier => tier.id === event.rarity) || !integer(event.required, 1) || !Array.isArray(event.contributionIds) || event.contributionIds.length < event.required || new Set(event.contributionIds).size !== event.contributionIds.length || event.contributionIds.some(id => seen.get(id)?.kind !== 'contribution' || seen.get(id)?.cardId !== event.cardId || reversed.has(id))) fail('invalid unlock evidence.');
    } else if (event.kind === 'reward-reversal') {
      if (!data.events.some(study => study.kind === 'reversal' && study.reviewEventId === event.reviewEventId) || !Array.isArray(event.reversedEventIds) || event.reversedEventIds.some(id => !seen.has(id) || seen.get(id)?.cardId !== event.cardId || reversed.has(id))) fail('invalid reward reversal.');
      event.reversedEventIds.forEach(id => reversed.add(id));
    } else fail('unknown reward event.');
    seen.set(event.id, event);
  }
}
