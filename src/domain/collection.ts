import type { CardContent, Deck, Rarity, State } from './models';
import { prestigeProgress, rewardProgress } from './rewards';

export interface DeckCollectionProgress {
  deckId: string;
  name: string;
  earned: number;
  total: number;
  percent: number;
  prestiged: number;
  childCount: number;
}

/** The only ownership rule used by Collection. */
export function isCollected(state: State, cardId: string): boolean {
  return rewardProgress(state, cardId).earned;
}

export function activeCollectibleCards(state: State): CardContent[] {
  const byId = new Map(state.decks.map(deck => [deck.id, deck]));
  const activeDecks = new Set(state.decks.filter(deck => {
    const seen=new Set<string>();let current:Deck|undefined=deck;
    while(current&&!seen.has(current.id)){if(current.archived)return false;seen.add(current.id);current=current.parentId?byId.get(current.parentId):undefined;}
    return true;
  }).map(deck => deck.id));
  return state.cards.filter(card => !card.archived && activeDecks.has(card.deckId));
}

export function deckBranchIds(decks: Deck[], deckId: string): Set<string> {
  const ids = new Set<string>([deckId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const deck of decks) if (!deck.archived && deck.parentId && ids.has(deck.parentId) && !ids.has(deck.id)) {
      ids.add(deck.id); changed = true;
    }
  }
  return ids;
}

export function cardsInCollectionScope(state: State, deckId: string): CardContent[] {
  const ids = deckBranchIds(state.decks, deckId);
  return activeCollectibleCards(state).filter(card => ids.has(card.deckId));
}

export function deckCollectionProgress(state: State, deckId: string): DeckCollectionProgress {
  const deck = state.decks.find(item => item.id === deckId);
  const cards = cardsInCollectionScope(state, deckId);
  const earned = cards.filter(card => isCollected(state, card.id)).length;
  return {
    deckId,
    name: deck?.name ?? 'Unavailable set',
    earned,
    total: cards.length,
    percent: cards.length ? Math.round(earned / cards.length * 100) : 0,
    prestiged: cards.filter(card => isCollected(state, card.id) && prestigeProgress(state, card.id).level > 0).length,
    childCount: Math.max(0, deckBranchIds(state.decks, deckId).size - 1),
  };
}

export function topLevelCollectionProgress(state: State): DeckCollectionProgress[] {
  const active = state.decks.filter(deck => !deck.archived);
  const ids = new Set(active.map(deck => deck.id));
  return active.filter(deck => !deck.parentId || !ids.has(deck.parentId))
    .map(deck => deckCollectionProgress(state, deck.id)).filter(row => row.total > 0);
}

/** Deliberately answer-free. Never extend this with CardContent or source fields. */
export interface LockedCollectibleTeaser {
  cardId: string;
  deckId: string;
  deckName: string;
  rarity: Rarity;
  days: number;
  required: number;
  remaining: number;
  ratio: number;
  position: number;
  setSize: number;
  due: boolean;
}

export function lockedCollectibleTeaser(state: State, card: CardContent, scope?: readonly CardContent[]): LockedCollectibleTeaser {
  const cards = scope ?? activeCollectibleCards(state).filter(item => item.deckId === card.deckId);
  const progress = rewardProgress(state, card.id);
  const schedule = state.states[card.id];
  return {
    cardId: card.id,
    deckId: card.deckId,
    deckName: state.decks.find(deck => deck.id === card.deckId)?.name ?? 'Unavailable set',
    rarity: card.rarity ?? 'common',
    days: progress.days,
    required: progress.required,
    remaining: Math.max(0, progress.required - progress.days),
    ratio: progress.required ? Math.min(1, progress.days / progress.required) : 0,
    position: Math.max(1, cards.findIndex(item => item.id === card.id) + 1),
    setSize: cards.length,
    due: !!schedule && Date.parse(schedule.due) <= Date.now(),
  };
}

export function nearUnlocks(state: State, limit = 6): LockedCollectibleTeaser[] {
  const active = activeCollectibleCards(state);
  const order = new Map(active.map((card, index) => [card.id, index]));
  return active.filter(card => !isCollected(state, card.id))
    .map(card => lockedCollectibleTeaser(state, card))
    .sort((a, b) => a.remaining - b.remaining || b.ratio - a.ratio || (order.get(a.cardId)! - order.get(b.cardId)!))
    .slice(0, limit);
}
