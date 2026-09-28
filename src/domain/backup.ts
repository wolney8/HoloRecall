import type { CardContent, CardState, Deck, Preferences, State } from './models';
import { CONFIG_VERSION, SCHEDULER_PARAMETERS, SCHEDULER_VERSION, mapRating } from './study';

function fail(message: string): never { throw new Error(`Invalid HoloRecall data: ${message}`); }
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : fail('expected an object.');
const text = (value: unknown, max = 20000): value is string => typeof value === 'string' && value.length <= max;
const id = (value: unknown): value is string => text(value, 120) && /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);
const integer = (value: unknown, min = 0): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min;
const finite = (value: unknown, min = 0): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min;
const instant = (value: unknown): value is string => text(value, 40) && /^\d{4}-\d{2}-\d{2}T.+Z$/.test(value) && Number.isFinite(Date.parse(value));

export function validatePreferences(value: unknown): asserts value is Preferences {
  const prefs = object(value);
  if (typeof prefs['effects'] !== 'boolean' || !text(prefs['timeZone'], 100) || !integer(prefs['newCardLimit']) || prefs['newCardLimit'] > 1000 || !integer(prefs['reviewLimit'], 1) || prefs['reviewLimit'] > 10000) fail('invalid study preferences.');
  try { new Intl.DateTimeFormat('en', { timeZone: prefs['timeZone'] as string }).format(); } catch { fail('unknown time zone.'); }
}

export function validateDeck(value: unknown): asserts value is Deck {
  const deck = object(value);
  if (!id(deck['id']) || !text(deck['name'], 160) || !deck['name'].trim() || !text(deck['description'], 2000) || typeof deck['suspended'] !== 'boolean') fail('invalid deck.');
}

export function validateCard(value: unknown): asserts value is CardContent {
  const card = object(value);
  if (!id(card['id']) || !id(card['deckId']) || !['text', 'visual'].includes(String(card['kind'])) || !integer(card['revision'], 1) || typeof card['suspended'] !== 'boolean') fail('invalid card identity.');
  for (const field of ['front', 'answer', 'pronunciation', 'meaning', 'notes']) if (!text(card[field])) fail(`invalid card ${field}.`);
  if (!(card['answer'] as string).trim() || (card['kind'] === 'text' && !(card['front'] as string).trim())) fail('cards need a prompt and answer.');
  if (!Array.isArray(card['tags']) || card['tags'].length > 30 || !card['tags'].every(tag => text(tag, 100))) fail('invalid card tags.');
  if (card['imageDescription'] !== undefined && !text(card['imageDescription'], 1000)) fail('invalid image description.');
  if (card['image'] !== undefined && (!text(card['image'], 300) || !/^\/?(?:assets|art)\/[a-zA-Z0-9/_-]+\.(svg|png|webp|jpe?g)$/.test(card['image']))) fail('this prototype only accepts bundled asset references.');
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
  if (data['schemaVersion'] !== 1 || !integer(data['version']) || data['userId'] !== 'local-learner') fail('unsupported schema or learner.');
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
  const cardIds = new Set(typedCards.map(card => card.id));
  if (deckIds.size !== decks.length || cardIds.size !== cards.length || typedCards.some(card => !deckIds.has(card.deckId))) fail('duplicate IDs or a card with no deck.');
  const states = object(data['states']);
  for (const [cardId, state] of Object.entries(states)) {
    if (!cardIds.has(cardId)) fail('scheduling state references a missing card.');
    validateCardState(state);
  }
  const eventIds = new Set<string>();
  const reviewIds = new Map<string, string>();
  const reversed = new Set<string>();
  const resultingStates = new Map<string, CardState>();
  for (const value of data['events'] as unknown[]) {
    const event = object(value);
    if (!id(event['id']) || eventIds.has(event['id']) || !id(event['cardId']) || !cardIds.has(event['cardId']) || event['userId'] !== data['userId'] || !instant(event['timestamp']) || !integer(event['previousStateVersion'])) fail('invalid or duplicate review event.');
    eventIds.add(event['id']);
    validateCardState(event['resultingState']);
    const result = event['resultingState'] as CardState;
    const prior = resultingStates.get(event['cardId']);
    if ((prior?.version ?? 0) !== event['previousStateVersion'] || result.version !== event['previousStateVersion'] + 1) fail('broken scheduling version history.');
    if (event['kind'] === 'review') {
      if (!id(event['sessionId']) || !integer(event['contentRevision'], 1) || !integer(event['rating'], 1) || event['rating'] > 5 || event['grade'] !== mapRating(event['rating'] as 1 | 2 | 3 | 4 | 5) || event['schedulerVersion'] !== SCHEDULER_VERSION || event['configVersion'] !== CONFIG_VERSION) fail('invalid review details.');
      validateCardState(event['previousState']);
      if ((event['previousState'] as CardState).version !== event['previousStateVersion']) fail('mismatched previous version.');
      reviewIds.set(event['id'], event['cardId']);
    } else if (event['kind'] === 'reversal') {
      if (!id(event['reviewEventId']) || reviewIds.get(event['reviewEventId']) !== event['cardId'] || reversed.has(event['reviewEventId'])) fail('invalid review reversal.');
      reversed.add(event['reviewEventId']);
    } else fail('unknown history event.');
    resultingStates.set(event['cardId'], result);
  }
  for (const [cardId, latest] of resultingStates) if (JSON.stringify(states[cardId]) !== JSON.stringify(latest)) fail('current scheduling state does not match history.');
  for (const cardId of Object.keys(states)) if (!resultingStates.has(cardId)) fail('scheduling state is missing its history.');
}

export function exportBackup(data: State, now: Date): string {
  return JSON.stringify({ format: 'holorecall-backup', version: 1, exportedAt: now.toISOString(), state: data }, null, 2);
}

export function parseBackup(json: string): State {
  if (json.length > 5_000_000) fail('backup exceeds the 5 MB prototype limit.');
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { return fail('the file is not valid JSON.'); }
  const backup = object(parsed);
  if (backup['format'] !== 'holorecall-backup' || backup['version'] !== 1 || !instant(backup['exportedAt'])) fail('unsupported backup format.');
  validateState(backup['state']);
  return backup['state'];
}
