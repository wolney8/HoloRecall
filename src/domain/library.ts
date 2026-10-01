import type { CardContent, FinishPreset, Rarity, State } from './models';
import { rewardProgress } from './rewards';
import { activeReviews } from './study';

export type StudyStateFilter = 'new' | 'learning' | 'review' | 'due' | 'overdue' | 'suspended' | 'buried' | 'attention' | 'leech' | 'recently-reviewed';
export type MediaFilter = 'image' | 'audio' | 'none';
export type LibrarySort = 'name' | 'recently-studied' | 'recently-added' | 'due' | 'rarity' | 'unlock-progress';
export interface LibraryFilters {
  deckIds?: string[]; tags?: string[]; rarities?: Rarity[]; earned?: 'earned' | 'unearned';
  designSetIds?: string[]; finishes?: FinishPreset[]; studyStates?: StudyStateFilter[];
  media?: MediaFilter[]; includeArchived?: boolean;
}
export interface LibraryQuery { query?: string; filters?: LibraryFilters; sort?: LibrarySort; offset?: number; limit?: number }
export interface SearchResult { kind: 'deck' | 'card' | 'tag'; id: string; label: string; context: string; normalized: string; cardId?: string; deckId?: string; score: number }
export interface LibraryItem {
  card: CardContent; deckName: string; deckPath: string; tags: string[]; earned: boolean;
  deckIds: string[];
  deckArchived: boolean;
  unlockDays: number; unlockRequired: number; lastStudied?: string; due?: string;
  state: 'new' | 'learning' | 'review'; attention: boolean;suspended:boolean;buried:boolean;leech:boolean; media: Exclude<MediaFilter, 'none'>[];
}
export interface LibraryIndex { version: number; builtAt: number; cards: LibraryItem[]; results: SearchResult[]; tagLabels: Map<string,string> }
export interface LibraryPage { items: LibraryItem[]; total: number; nextOffset?: number; results: SearchResult[] }

export function normalizeSearch(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}
export function normalizeTag(value: string): string { return normalizeSearch(value); }
export function canonicalTags(tags: string[]): string[] {
  const seen = new Set<string>(), result: string[] = [];
  for (const raw of tags) { const value = raw.trim().replace(/\s+/g, ' '), key = normalizeTag(value); if (value && key && !seen.has(key)) { seen.add(key); result.push(value); } }
  return result;
}
export function deckPath(state: Pick<State,'decks'>, deckId: string): string {
  const byId = new Map(state.decks.map(deck => [deck.id, deck])), names: string[] = [], seen = new Set<string>(); let current = byId.get(deckId);
  while (current && !seen.has(current.id)) { seen.add(current.id); names.unshift(current.name); current = current.parentId ? byId.get(current.parentId) : undefined; }
  return names.join(' › ');
}
export function descendantDeckIds(state: Pick<State,'decks'>, roots: string[]): Set<string> {
  const result = new Set(roots); let changed = true;
  while (changed) { changed = false; for (const deck of state.decks) if (deck.parentId && result.has(deck.parentId) && !result.has(deck.id)) { result.add(deck.id); changed = true; } }
  return result;
}
export function validateDeckMove(state: Pick<State,'decks'>, deckId: string, parentId?: string): void {
  if (!state.decks.some(deck => deck.id === deckId)) throw new Error('Deck no longer exists.');
  if (parentId && !state.decks.some(deck => deck.id === parentId)) throw new Error('Parent deck no longer exists.');
  if (parentId && descendantDeckIds(state, [deckId]).has(parentId)) throw new Error('A deck cannot be moved inside itself or one of its subdecks.');
}

export function buildLibraryIndex(state: State, now = new Date()): LibraryIndex {
  const paths = new Map(state.decks.map(deck => [deck.id, deckPath(state, deck.id)]));
  const lastByCard = new Map<string,string>(), history = new Map<string,number[]>();
  for (const event of activeReviews(state)) { lastByCard.set(event.cardId, event.timestamp);history.set(event.cardId,[...(history.get(event.cardId)??[]),event.rating].slice(-5)); }
  const tagLabels = new Map<string,string>();
  for (const card of state.cards) for (const tag of canonicalTags(card.tags)) if (!tagLabels.has(normalizeTag(tag))) tagLabels.set(normalizeTag(tag), tag);
  const deckById = new Map(state.decks.map(deck => [deck.id, deck]));
  const deckLineage=(id:string):string[]=>{const result:string[]=[];let current=deckById.get(id);while(current&&!result.includes(current.id)){result.push(current.id);current=current.parentId?deckById.get(current.parentId):undefined;}return result;};
  const cards: LibraryItem[] = state.cards.map(card => {
    const progress = rewardProgress(state, card.id), schedule = state.states[card.id], reps = schedule?.reps ?? 0;
    const stateName: LibraryItem['state'] = reps === 0 ? 'new' : schedule?.state === 2 ? 'review' : 'learning';
    const media: LibraryItem['media'] = [...(card.image || card.backImage ? ['image' as const] : []), ...((card.frontAudio?.length || card.backAudio?.length) ? ['audio' as const] : [])];
    const lineage=deckLineage(card.deckId),deckArchived=lineage.some(id=>{const deck=deckById.get(id);return !!(deck?.archived||deck?.suspended);}),recent=history.get(card.id)??[];
    const control=state.cardControls[card.id];return { card, deckName: deckById.get(card.deckId)?.name ?? 'Unavailable deck', deckPath: paths.get(card.deckId) ?? '', deckIds:lineage, deckArchived, tags: canonicalTags(card.tags), earned: progress.earned, unlockDays: progress.days, unlockRequired: progress.required, lastStudied: lastByCard.get(card.id), due: schedule?.due, state: stateName, attention: recent.filter(rating=>rating===1).length>=2,suspended:card.suspended,buried:!!(control?.manualBuried||control?.buriedOnDay),leech:!!control?.leech, media };
  });
  const results: SearchResult[] = [];
  for (const deck of state.decks) { const context=deck.description || paths.get(deck.id) || 'Deck'; results.push({ kind:'deck', id:deck.id, deckId:deck.id, label:deck.name, context, normalized:normalizeSearch(`${deck.name} ${context}`), score:80 }); }
  for (const item of cards) { const context=[item.card.front,item.card.meaning,item.card.pronunciation,item.card.notes,item.tags.join(' '),item.deckPath].filter(Boolean).join(' · '); results.push({ kind:'card', id:item.card.id, cardId:item.card.id, deckId:item.card.deckId, label:item.card.answer, context, normalized:normalizeSearch(`${item.card.answer} ${context}`), score:100 }); }
  for (const [id,label] of tagLabels) { const context=`${cards.filter(item => item.tags.some(tag => normalizeTag(tag) === id)).length} cards`; results.push({ kind:'tag', id, label, context, normalized:normalizeSearch(`${label} ${context}`), score:60 }); }
  return { version: state.version, builtAt: typeof performance === 'undefined' ? Date.now() : performance.now(), cards, results, tagLabels };
}

function matches(result: SearchResult, words: string[]): boolean { return words.every(word => result.normalized.includes(word)); }
function rarityRank(value?: Rarity): number { return ['common','uncommon','rare','holo-rare','ultra-rare','secret-rare','relic'].indexOf(value ?? 'common'); }
export function queryLibrary(index: LibraryIndex, request: LibraryQuery, now = new Date()): LibraryPage {
  const words = normalizeSearch(request.query ?? '').split(' ').filter(Boolean), filters = request.filters ?? {};
  const searched = words.length ? new Set(index.results.filter(result => result.kind === 'card' && matches(result, words)).map(result => result.cardId!)) : null;
  const deckIds = filters.deckIds?.length ? new Set(filters.deckIds) : null, tags = filters.tags?.map(normalizeTag), rarities = filters.rarities?.length ? new Set(filters.rarities) : null;
  const designs = filters.designSetIds?.length ? new Set(filters.designSetIds) : null, finishes = filters.finishes?.length ? new Set(filters.finishes) : null;
  let items = index.cards.filter(item => {
    const card = item.card;
    if (!filters.includeArchived && (card.archived||item.deckArchived) || searched && !searched.has(card.id) || deckIds && !item.deckIds.some(id=>deckIds.has(id))) return false;
    if (tags?.length && !tags.some(tag => item.tags.some(value => normalizeTag(value) === tag))) return false;
    if (rarities && !rarities.has(card.rarity ?? 'common') || filters.earned && item.earned !== (filters.earned === 'earned')) return false;
    if (designs && !designs.has(card.designSetId ?? '') || finishes && !finishes.has(card.finish ?? 'matte')) return false;
    if (filters.studyStates?.length && !filters.studyStates.some(value => value === item.state || value === 'attention' && item.attention || value==='leech'&&item.leech||value==='suspended'&&item.suspended||value==='buried'&&item.buried||value === 'due' && !!item.due && Date.parse(item.due) <= now.getTime()||value==='overdue'&&!!item.due&&Date.parse(item.due)<now.getTime()-86_400_000||value==='recently-reviewed'&&!!item.lastStudied&&Date.parse(item.lastStudied)>=now.getTime()-7*86_400_000)) return false;
    if (filters.media?.length && !filters.media.some(value => value === 'none' ? item.media.length === 0 : item.media.includes(value))) return false;
    return true;
  });
  const sort = request.sort ?? 'name';
  items = [...items].sort((a,b) => {
    let compared = 0;
    if (sort === 'name') compared = a.card.answer.localeCompare(b.card.answer);
    else if (sort === 'recently-studied') compared = (b.lastStudied ?? '').localeCompare(a.lastStudied ?? '');
    else if (sort === 'recently-added') compared = (b.card.createdAt ?? '').localeCompare(a.card.createdAt ?? '');
    else if (sort === 'due') compared = (a.due ?? '9999').localeCompare(b.due ?? '9999');
    else if (sort === 'rarity') compared = rarityRank(b.card.rarity) - rarityRank(a.card.rarity);
    else compared = (b.unlockDays / b.unlockRequired) - (a.unlockDays / a.unlockRequired);
    return compared || a.card.id.localeCompare(b.card.id);
  });
  const total = items.length, offset = Math.max(0, request.offset ?? 0), limit = Math.max(1, Math.min(100_000, request.limit ?? 60));
  return { items: items.slice(offset, offset + limit), total, nextOffset: offset + limit < total ? offset + limit : undefined, results: words.length ? index.results.filter(result => matches(result, words)).sort((a,b) => b.score-a.score || a.label.localeCompare(b.label)).slice(0,30) : [] };
}
