import { fsrs } from 'ts-fsrs';
import type { CardContent, FocusSessionRequest, State } from './models';
import { buildLibraryIndex, queryLibrary, type LibraryIndex, type StudyStateFilter } from './library';
import { activeReviews, dayKey, dueCards, hydrateCard } from './study';
import { effectiveStudyPreset, fsrsParameters } from './study-settings';
import { validateFocusRequest } from './focus-validation';
export { validateFocusCriteria, validateFocusPreset, validateFocusRequest } from './focus-validation';

export interface FocusPreview { cards: CardContent[]; matched: number; eligible: number; excluded: number }

const DAY = 86_400_000;
const boundedDays = (value: number | undefined): number | undefined => value === undefined ? undefined : Math.max(0, Math.min(3650, Math.floor(value)));

function stable(cardId: string,seed='preview'): number { let value = 2166136261; for (const char of `${seed}:${cardId}`) value = Math.imul(value ^ char.charCodeAt(0), 16777619); return value >>> 0; }
function recentDayKeys(now:Date,days:number,timeZone:string):Set<string>{const wanted=Math.floor(days)+1,keys=new Set<string>();let cursor=now.getTime(),guard=0;while(keys.size<wanted&&guard++<wanted*4+8){keys.add(dayKey(new Date(cursor),timeZone));cursor-=12*60*60*1000;}return keys;}

export function focusPreview(state: State, request: FocusSessionRequest, now: Date, existingIndex?:LibraryIndex): FocusPreview {
  validateFocusRequest(request);
  const criteria = request.criteria;
  if (criteria.deckId && !state.decks.some(deck => deck.id === criteria.deckId)) return { cards: [], matched: 0, eligible: 0, excluded: 0 };
  const mappedStates = criteria.studyStates?.map(value => value as StudyStateFilter);
  const index = existingIndex??buildLibraryIndex(state, now);
  let items = queryLibrary(index, {
    query: criteria.query,
    filters: {
      ...(criteria.deckId ? { deckIds: [criteria.deckId] } : {}),
      ...(criteria.tags?.length ? { tags: criteria.tags } : {}),
      ...(mappedStates?.length ? { studyStates: mappedStates } : {}),
      includeArchived: false,
    }, limit: 100_000,
  }, now).items;
  const explicit = criteria.explicitCardIds?.length ? new Set(criteria.explicitCardIds) : undefined;
  if (explicit) items = items.filter(item => explicit.has(item.card.id));
  if (!criteria.includeSuspended&&!criteria.studyStates?.includes('suspended')) items = items.filter(item => !item.suspended);
  if (!criteria.studyStates?.includes('buried')) items = items.filter(item=>!item.buried);
  const reviews = activeReviews(state), last = new Map<string, string>(), lapses = new Map<string, number>(), missed = new Set<string>();
  const missedDays=criteria.missedWithinDays===undefined?undefined:recentDayKeys(now,boundedDays(criteria.missedWithinDays)!,state.preferences.timeZone);
  for (const review of reviews) {
    last.set(review.cardId, review.timestamp);
    if (review.rating === 1) { lapses.set(review.cardId, (lapses.get(review.cardId) ?? 0) + 1); if (missedDays === undefined || missedDays.has(dayKey(new Date(review.timestamp),state.preferences.timeZone))) missed.add(review.cardId); }
  }
  if (criteria.missedWithinDays !== undefined) items = items.filter(item => missed.has(item.card.id));
  if (criteria.dueWithinDays !== undefined) { const until = now.getTime() + boundedDays(criteria.dueWithinDays)! * DAY; items = items.filter(item => !!item.due && Date.parse(item.due) > now.getTime() && Date.parse(item.due) <= until); }
  if (criteria.overdueByDays !== undefined) { const before = now.getTime() - boundedDays(criteria.overdueByDays)! * DAY; items = items.filter(item => !!item.due && Date.parse(item.due) <= before); }
  if (criteria.recentlyAddedDays !== undefined) { const since = now.getTime() - boundedDays(criteria.recentlyAddedDays)! * DAY; items = items.filter(item => !!item.card.createdAt && Date.parse(item.card.createdAt) >= since); }
  const matched = items.length;
  const scheduledIds = request.mode === 'scheduled' ? new Set(dueCards(state, now, criteria.deckId).map(card => card.id)) : undefined;
  if (scheduledIds) items = items.filter(item => scheduledIds.has(item.card.id));
  const eligible = items.length;
  const scoreRetrievability = (card: CardContent): number => { const schedule = state.states[card.id]; return schedule?.reps ? fsrs(fsrsParameters(effectiveStudyPreset(state, card.deckId, now))).get_retrievability(hydrateCard(schedule), now, false) : 1; };
  items = [...items].sort((a, b) => {
    let value = 0;
    if (request.order === 'due') value = (a.due ?? '9999').localeCompare(b.due ?? '9999');
    else if (request.order === 'overdue') value = (a.due ?? '9999').localeCompare(b.due ?? '9999');
    else if (request.order === 'retrievability') value = scoreRetrievability(a.card) - scoreRetrievability(b.card);
    else if (request.order === 'lapses') value = (lapses.get(b.card.id) ?? 0) - (lapses.get(a.card.id) ?? 0);
    else if (request.order === 'oldest-reviewed') value = (last.get(a.card.id) ?? '').localeCompare(last.get(b.card.id) ?? '');
    else if (request.order === 'recently-added') value = (b.card.createdAt ?? '').localeCompare(a.card.createdAt ?? '');
    else if (request.order === 'random') value = stable(a.card.id,request.seed) - stable(b.card.id,request.seed);
    else value = state.cards.indexOf(a.card) - state.cards.indexOf(b.card);
    return value || a.card.id.localeCompare(b.card.id);
  });
  return { cards: items.slice(0, request.limit).map(item => item.card), matched, eligible, excluded: Math.max(0, matched - eligible) };
}
