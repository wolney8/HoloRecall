import { createEmptyCard, fsrs, generatorParameters, Rating, type Card as FsrsCard, type Grade } from 'ts-fsrs';
import { DEFAULT_REWARD_CONFIG, rewardEventsForReview, rewardReversal } from './rewards';
import type { CardContent, CardState, ConfidenceRating, Deck, ReviewEvent, State } from './models';

export const SCHEDULER_VERSION = 'ts-fsrs@5.4.2';
export const CONFIG_VERSION = 'holorecall-fsrs-v1';
export const SCHEDULER_PARAMETERS = generatorParameters({
  request_retention: 0.9,
  maximum_interval: 36500,
  enable_fuzz: false,
  enable_short_term: true,
});

export const RATING_OPTIONS: ReadonlyArray<{ rating: ConfidenceRating; grade: 'Again' | 'Hard' | 'Good' | 'Easy'; label: string; help: string }> = [
  { rating: 1, grade: 'Again', label: 'Forgot', help: 'Incorrect or needed the answer.' },
  { rating: 2, grade: 'Hard', label: 'With effort', help: 'Correct, but with substantial effort.' },
  { rating: 3, grade: 'Good', label: 'Some hesitation', help: 'Correct, with some hesitation.' },
  { rating: 4, grade: 'Good', label: 'Confident', help: 'Correct and confident.' },
  { rating: 5, grade: 'Easy', label: 'Effortless', help: 'Correct immediately and effortlessly.' },
];

export function createInitialState(decks: Deck[], cards: CardContent[]): State {
  return {
    schemaVersion: 4,
    version: 0,
    userId: 'local-learner',
    decks: structuredClone(decks),
    cards: structuredClone(cards),
    states: {},
    events: [],
    designs: [], assets: [], rewardEvents: [], rewardConfig: { ...DEFAULT_REWARD_CONFIG }, session: null, ankiMappings: [],
    preferences: { effects: true, theme: 'system', timeZone: 'Europe/London', newCardLimit: 10, reviewLimit: 100 },
    scheduler: { version: SCHEDULER_VERSION, configVersion: CONFIG_VERSION, parameters: structuredClone(SCHEDULER_PARAMETERS) },
  };
}

export function mapRating(rating: ConfidenceRating): Grade {
  const grades: Record<ConfidenceRating, Grade> = { 1: Rating.Again, 2: Rating.Hard, 3: Rating.Good, 4: Rating.Good, 5: Rating.Easy };
  const grade = grades[rating];
  if (grade === undefined) throw new Error('Choose a confidence rating from 1 to 5.');
  return grade;
}

export function serializeCard(card: FsrsCard, version: number): CardState {
  const { due, last_review, ...values } = card;
  return { ...values, due: due.toISOString(), ...(last_review ? { last_review: last_review.toISOString() } : {}), version };
}

export function hydrateCard(state: CardState): FsrsCard {
  const { due, last_review, version: _version, ...values } = state;
  return { ...values, due: new Date(due), ...(last_review ? { last_review: new Date(last_review) } : {}) };
}

export function activeReviews(data: State): ReviewEvent[] {
  const reversed = new Set(data.events.flatMap(event => event.kind === 'reversal' ? [event.reviewEventId] : []));
  return data.events.filter((event): event is ReviewEvent => event.kind === 'review' && event.mode !== 'practice' && !reversed.has(event.id));
}

/** A calendar date in the learner's time zone, independent of the host zone and DST. */
export function dayKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function dueCards(data: State, now: Date, deckId?: string): CardContent[] {
  const today = dayKey(now, data.preferences.timeZone);
  const reviewsToday = activeReviews(data).filter(event => dayKey(new Date(event.timestamp), data.preferences.timeZone) === today);
  const reviewsLeft = Math.max(0, data.preferences.reviewLimit - reviewsToday.length);
  const introducedToday = new Set(reviewsToday.filter(event => event.previousState.reps === 0).map(event => event.cardId));
  const newLeft = Math.max(0, data.preferences.newCardLimit - introducedToday.size);
  const activeDecks = new Set(data.decks.filter(deck => !deck.suspended && !deck.archived).map(deck => deck.id));
  const available = data.cards.filter(card => !card.suspended && !card.archived && activeDecks.has(card.deckId) && (!deckId || card.deckId === deckId));
  const existing = available.filter(card => (data.states[card.id]?.reps ?? 0) > 0 && Date.parse(data.states[card.id]!.due) <= now.getTime())
    .sort((a, b) => Date.parse(data.states[a.id]!.due) - Date.parse(data.states[b.id]!.due));
  const newCards = available.filter(card => (data.states[card.id]?.reps ?? 0) === 0).slice(0, newLeft);
  return [...existing, ...newCards].slice(0, reviewsLeft);
}

export interface ReviewInput {
  id: string;
  cardId: string;
  sessionId: string;
  rating: ConfidenceRating;
  now: Date;
  activeMs?: number;
  recallMs?: number;
}

export function applyReview(data: State, input: ReviewInput): State {
  const duplicate = data.events.find(event => event.id === input.id);
  if (duplicate) {
    if (duplicate.kind === 'review' && duplicate.cardId === input.cardId && duplicate.rating === input.rating && duplicate.sessionId === input.sessionId) return data;
    throw new Error('This review ID already belongs to a different action.');
  }
  if (!input.id || !input.sessionId || !Number.isFinite(input.now.getTime())) throw new Error('The review is missing a valid ID, session or time.');
  if (data.session && (data.session.id !== input.sessionId || data.session.queue[0] !== input.cardId || !data.session.revealed)) throw new Error('Reveal the current session card before rating it.');
  const content = data.cards.find(card => card.id === input.cardId);
  if (!content || !dueCards(data, input.now, content.deckId).some(card => card.id === input.cardId)) throw new Error('This card is no longer available in the due queue. Refresh your study session.');
  if (data.scheduler.version !== SCHEDULER_VERSION || data.scheduler.configVersion !== CONFIG_VERSION) throw new Error('This study data needs a scheduler migration before another review.');
  const previous = data.states[input.cardId] ?? serializeCard(createEmptyCard(input.now), 0);
  if (previous.last_review && input.now.getTime() < Date.parse(previous.last_review)) throw new Error('Your clock is earlier than the last review. Check the system time before continuing.');
  const grade = mapRating(input.rating);
  const next = fsrs(data.scheduler.parameters).next(hydrateCard(previous), input.now, grade).card;
  const resultingState = serializeCard(next, previous.version + 1);
  const event: ReviewEvent = {
    kind: 'review', id: input.id, userId: data.userId, cardId: input.cardId,
    sessionId: input.sessionId, contentRevision: content.revision, timestamp: input.now.toISOString(),
    rating: input.rating, grade, previousStateVersion: previous.version,
    previousState: structuredClone(previous), resultingState: structuredClone(resultingState),
    schedulerVersion: data.scheduler.version, configVersion: data.scheduler.configVersion,
    mode: 'scheduled', activeMs: Math.max(0, Math.min(120000, Math.round(input.activeMs ?? data.session?.activeMs ?? 0))),
    ...(Number.isFinite(input.recallMs ?? data.session?.recallMs) ? { recallMs: Math.max(0, Math.min(120000, Math.round(input.recallMs ?? data.session!.recallMs!))) } : {}),
  };
  const remaining = data.session?.queue.slice(1) ?? [];
  return {
    ...data, version: data.version + 1, states: { ...data.states, [input.cardId]: resultingState }, events: [...data.events, event],
    rewardEvents: [...data.rewardEvents, ...rewardEventsForReview(data, event, dayKey(input.now, data.preferences.timeZone))],
    session: data.session ? { ...data.session, queue: remaining, completed: data.session.completed + 1, revealed: false, activeMs: 0, recallMs: undefined, cardStartedAt: input.now.toISOString(), lastReviewCardId: input.cardId, ...(remaining.length ? {} : { endedAt: input.now.toISOString(), partial: false }) } : null,
  };
}

function sameSchedulingState(a: CardState, b: CardState): boolean {
  const { version: _a, ...left } = a;
  const { version: _b, ...right } = b;
  return JSON.stringify(left) === JSON.stringify(right);
}

export function undoLatestReview(data: State, now: Date, id: string, expectedCardId?: string, expectedSessionId?: string): State {
  if (data.events.some(event => event.id === id)) throw new Error('This undo ID has already been used.');
  const latest = activeReviews(data).at(-1);
  if (!latest) throw new Error('There is no review to undo.');
  if ((expectedCardId !== undefined && latest.cardId !== expectedCardId) || (expectedSessionId !== undefined && latest.sessionId !== expectedSessionId)) throw new Error('The latest review belongs to another card or study session. Nothing was undone.');
  const current = data.states[latest.cardId];
  if (!current || !sameSchedulingState(current, latest.resultingState)) throw new Error('This card changed after the review. Refresh before undoing it.');
  const restored = { ...latest.previousState, version: current.version + 1 };
  return {
    ...data, version: data.version + 1,
    rewardEvents: [...data.rewardEvents, ...rewardReversal(data, latest.id, latest.cardId, now.toISOString(), id)],
    session: data.session?.id === latest.sessionId ? { ...data.session, queue: [latest.cardId, ...data.session.queue.filter(cardId => cardId !== latest.cardId)], completed: Math.max(0, data.session.completed - 1), revealed: false, activeMs: 0, recallMs: undefined, endedAt: undefined, partial: undefined, lastReviewCardId: undefined, cardStartedAt: now.toISOString() } : data.session,
    states: { ...data.states, [latest.cardId]: restored },
    events: [...data.events, {
      kind: 'reversal', id, userId: data.userId, cardId: latest.cardId,
      reviewEventId: latest.id, timestamp: now.toISOString(), previousStateVersion: current.version, resultingState: structuredClone(restored),
    }],
  };
}
