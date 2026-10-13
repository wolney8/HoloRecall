import { fsrs } from 'ts-fsrs';
import type { ConfidenceRating, State } from './models';
import { activeReviews, dayKey, dueCards, hydrateCard } from './study';
import { rewardProgress } from './rewards';

export interface DateRange { from?: string; to?: string }
/** Event metrics are filtered by learner calendar dates; inventory and model estimates are current. */
export function buildReport(state: State, now: Date, range: DateRange = {}) {
  const all = activeReviews(state);
  const reviews = all.filter(event => {
    const day = dayKey(new Date(event.timestamp), state.preferences.timeZone);
    return (!range.from || day >= range.from) && (!range.to || day <= range.to);
  });
  const reviewedIds = new Set(reviews.map(review => review.cardId));
  const confidence = ([1, 2, 3, 4, 5] as ConfidenceRating[]).map(rating => ({ rating, count: reviews.filter(review => review.rating === rating).length }));
  const days = new Map<string, { date: string; count: number; activeMs: number }>();
  for (const review of reviews) {
    const date = dayKey(new Date(review.timestamp), state.preferences.timeZone);
    const previous = days.get(date) ?? { date, count: 0, activeMs: 0 };
    days.set(date, { date, count: previous.count + 1, activeMs: previous.activeMs + (review.activeMs ?? 0) });
  }
  const newCards = state.cards.filter(card => !card.suspended && !card.archived && !state.decks.find(deck => deck.id === card.deckId)?.suspended && !state.decks.find(deck => deck.id === card.deckId)?.archived && !(state.states[card.id]?.reps));
  const due = state.cards.filter(card => !card.suspended && !card.archived && !state.decks.find(deck => deck.id === card.deckId)?.suspended && !state.decks.find(deck => deck.id === card.deckId)?.archived && (state.states[card.id]?.reps ?? 0) > 0 && Date.parse(state.states[card.id]!.due) <= now.getTime()).length;
  const attention = state.cards.flatMap(card => {
    const history = reviews.filter(review => review.cardId === card.id).slice(-5);
    const failures = history.filter(review => review.rating === 1).length;
    return failures >= 2 ? [{ cardId: card.id, answer: card.answer, deckId: card.deckId, failures, sampleSize: history.length }] : [];
  });
  const scheduler = fsrs(state.scheduler.parameters);
  const estimates = Object.values(state.states).filter(card => card.reps > 0 && card.last_review).map(card => scheduler.get_retrievability(hydrateCard(card), now, false)).filter(Number.isFinite);
  const recallSuccess = reviews.length ? reviews.filter(review => review.rating >= 2).length / reviews.length : null;
  const perDeck = state.decks.map(deck => {
    const cards = state.cards.filter(card => card.deckId === deck.id);
    return { id: deck.id, name: deck.name, total: cards.length, introduced: cards.filter(card => (state.states[card.id]?.reps ?? 0) > 0).length,
      due: cards.filter(card => (state.states[card.id]?.reps ?? 0) > 0 && Date.parse(state.states[card.id]!.due) <= now.getTime() && !card.suspended && !deck.suspended).length,
      earned: cards.filter(card => rewardProgress(state, card.id).earned).length };
  });
  const historicalGroups=new Map<string,{id:string;name:string;reviews:number;successful:number}>();
  for(const review of reviews){
    const path=review.studyDeckSnapshot?.path.slice().reverse(),id=path?.map(item=>item.id).join('>')??'unattributed',name=path?.map(item=>item.name).join(' > ')??'Unattributed legacy reviews',prior=historicalGroups.get(id)??{id,name,reviews:0,successful:0};
    historicalGroups.set(id,{...prior,reviews:prior.reviews+1,successful:prior.successful+(review.rating>=2?1:0)});
  }
  const historicalDecks=[...historicalGroups.values()].map(item=>({id:item.id,name:item.name,reviews:item.reviews,recallSuccess:item.reviews?item.successful/item.reviews:null})).sort((a,b)=>a.name.localeCompare(b.name));
  const cosmetics = state.cards.map(card => ({ cardId: card.id, answer: card.answer, rarity: card.rarity ?? 'common', ...rewardProgress(state, card.id) }));
  const practice = state.practiceEvents.filter(event => (!range.from || dayKey(new Date(event.timestamp), state.preferences.timeZone) >= range.from) && (!range.to || dayKey(new Date(event.timestamp), state.preferences.timeZone) <= range.to));
  const practiceCount = practice.length;
  return {
    due, newCards: newCards.length, available: dueCards(state, now).length, reviewedCards: reviewedIds.size, reviewCount: reviews.length,
    activeMs: reviews.reduce((sum, review) => sum + (review.activeMs ?? 0), 0), activeTimeSamples: reviews.filter(review => review.activeMs !== undefined).length,
    recallSuccess, confidence, activity: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)), attention, perDeck, historicalDecks, cosmetics,
    earnedCount: cosmetics.filter(item => item.earned).length,
    estimatedRetrievability: estimates.length ? estimates.reduce((a, b) => a + b, 0) / estimates.length : null,
    retrievabilitySampleSize: estimates.length, practiceCount,
    practiceActiveMs:practice.reduce((sum,event)=>sum+event.activeMs,0),practiceUniqueCards:new Set(practice.map(event=>event.cardId)).size,
  };
}
export type ProgressReport = ReturnType<typeof buildReport>;
