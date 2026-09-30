import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import type { CardContent, State } from './models';
import { activeReviews, applyReview, createInitialState, dayKey, dueCards, mapRating, undoLatestReview } from './study';
import { exportBackup, parseBackup, validateState } from './backup';

const now = new Date('2026-09-28T12:00:00.000Z');
const cards: CardContent[] = ['one', 'two', 'three'].map(id => ({
  id, deckId: 'italian', kind: 'text', front: 'The apple', answer: 'la mela', pronunciation: 'lah MEH-lah', meaning: 'the apple', notes: '', tags: ['noun'], revision: 1, suspended: false,
}));
const fresh = () => createInitialState([{ id: 'italian', name: 'Italian', description: '', suspended: false }], cards);
const review = (data: State, rating: 1 | 2 | 3 | 4 | 5 = 3, id = 'review-one', cardId = 'one', at = now) => applyReview(data, { id, cardId, sessionId: 'session-one', rating, now: at });

describe('FSRS review domain', () => {
  it('maps five self-ratings to four FSRS grades while preserving the original rating', () => {
    expect([1, 2, 3, 4, 5].map(value => mapRating(value as 1 | 2 | 3 | 4 | 5))).toEqual([Rating.Again, Rating.Hard, Rating.Good, Rating.Good, Rating.Easy]);
    const three = review(fresh(), 3);
    const four = review(fresh(), 4);
    expect(three.states['one']).toEqual(four.states['one']);
    expect(activeReviews(three)[0]!.rating).toBe(3);
    expect(activeReviews(four)[0]!.rating).toBe(4);
  });

  it('uses the real scheduler and serializes complete state with a fixed clock', () => {
    const data = review(fresh(), 5);
    const state = data.states['one']!;
    expect(state.reps).toBe(1);
    expect(state.stability).toBeGreaterThan(0);
    expect(Date.parse(state.due)).toBeGreaterThan(now.getTime());
    expect(state.last_review).toBe(now.toISOString());
    expect(state.version).toBe(1);
    expect(data.scheduler.parameters.enable_fuzz).toBe(false);
    const restored = JSON.parse(JSON.stringify(data)) as State;
    validateState(restored);
    const nextTime = new Date(state.due);
    expect(review(restored, 4, 'review-two', 'one', nextTime)).toEqual(review(data, 4, 'review-two', 'one', nextTime));
  });

  it('deduplicates delivery by event ID and rejects an ID reused for another action', () => {
    const first = review(fresh(), 3);
    expect(review(first, 3)).toBe(first);
    expect(first.events).toHaveLength(1);
    expect(() => review(first, 4)).toThrow('different action');
  });

  it('rejects rapid new review IDs after a card leaves the queue', () => {
    const data = review(fresh(), 3);
    expect(() => review(data, 3, 'rapid-double-tap')).toThrow('no longer available');
    expect(data.events).toHaveLength(1);
  });

  it('appends a reversal and restores scheduling without erasing review history', () => {
    const reviewed = review(fresh());
    const reversed = undoLatestReview(reviewed, new Date(now.getTime() + 1000), 'undo-one');
    expect(reversed.events).toHaveLength(2);
    expect(reversed.events[0]).toEqual(reviewed.events[0]);
    expect(reversed.events[1]!.kind).toBe('reversal');
    expect(activeReviews(reversed)).toHaveLength(0);
    expect(reversed.states['one']!.reps).toBe(0);
    expect(reversed.states['one']!.version).toBe(2);
    expect(dueCards(reversed, now).map(card => card.id)).toContain('one');
    validateState(reversed);
    expect(() => undoLatestReview(reversed, now, 'undo-two')).toThrow('no review');
  });

  it('refuses undo when a refreshed latest review belongs to a different card or session', () => {
    const reviewed = review(fresh());
    expect(() => undoLatestReview(reviewed, now, 'undo-other-card', 'two', 'session-one')).toThrow('another card or study session');
    expect(() => undoLatestReview(reviewed, now, 'undo-other-session', 'one', 'session-two')).toThrow('another card or study session');
    expect(reviewed.events).toHaveLength(1);
    expect(activeReviews(undoLatestReview(reviewed, now, 'undo-correct', 'one', 'session-one'))).toHaveLength(0);
  });

  it('preserves monotonic concurrency versions through review, undo and review', () => {
    const once = review(fresh(), 1);
    const twice = review(once, 4, 'review-two', 'one', new Date(once.states['one']!.due));
    const undoTwo = undoLatestReview(twice, now, 'undo-two');
    const undoOne = undoLatestReview(undoTwo, now, 'undo-one');
    expect(undoOne.states['one']!.version).toBe(4);
    expect(activeReviews(undoOne)).toHaveLength(0);
    const again = review(undoOne, 5, 'review-three');
    expect(again.states['one']!.version).toBe(5);
    validateState(again);
  });

  it('keeps seed content and caller snapshots unchanged', () => {
    const data = fresh();
    review(data);
    expect(data.events).toEqual([]);
    expect(data.states).toEqual({});
    expect(cards[0]!.revision).toBe(1);
  });
});

describe('local study limits and day boundaries', () => {
  it('allows the deck-specific new queue when that deck is outside the global first batch', () => {
    const data = fresh();
    data.preferences.newCardLimit = 1;
    data.decks.push({ id: 'another-deck', name: 'Another deck', description: '', suspended: false });
    data.cards.push({ ...cards[0]!, id: 'other-card', deckId: 'another-deck' });
    expect(dueCards(data, now).map(card => card.id)).toEqual(['one']);
    expect(dueCards(data, now, 'another-deck').map(card => card.id)).toEqual(['other-card']);
    const reviewed = review(data, 3, 'review-other-deck', 'other-card');
    expect(reviewed.states['other-card']!.reps).toBe(1);
    expect(dueCards(reviewed, now)).toHaveLength(0);
  });

  it('prioritizes due reviews and respects daily new-card and total-review limits', () => {
    let data = fresh();
    data.preferences.newCardLimit = 1;
    expect(dueCards(data, now).map(card => card.id)).toEqual(['one']);
    data = review(data, 1);
    expect(dueCards(data, now)).toEqual([]);
    const dueTime = new Date(data.states['one']!.due);
    expect(dueCards(data, dueTime).map(card => card.id)).toEqual(['one']);
    data.preferences.newCardLimit = 3;
    expect(dueCards(data, dueTime).map(card => card.id)).toEqual(['one', 'two', 'three']);
    data.preferences.reviewLimit = 1;
    expect(dueCards(data, dueTime)).toEqual([]);
  });

  it('counts global limits even when selecting one deck and excludes suspended content', () => {
    let data = fresh();
    data.preferences.reviewLimit = 1;
    data = review(data);
    expect(dueCards(data, now, 'italian')).toEqual([]);
    data = fresh();
    data.cards[0]!.suspended = true;
    expect(dueCards(data, now).map(card => card.id)).toEqual(['two', 'three']);
    data.decks[0]!.suspended = true;
    expect(dueCards(data, now)).toEqual([]);
  });

  it('studies descendants from a parent deck and honours archived ancestors',()=>{const data=fresh();data.decks[0]={...data.decks[0]!,id:'parent'};data.decks.push({id:'italian',name:'Italian',description:'',suspended:false,parentId:'parent'});data.cards=data.cards.map(card=>({...card,deckId:'italian'}));expect(dueCards(data,now,'parent').map(card=>card.id)).toEqual(['one','two','three']);data.decks[0]!.archived=true;expect(dueCards(data,now,'italian')).toEqual([]);});

  it('uses Europe/London calendar days through spring and autumn DST changes', () => {
    expect(dayKey(new Date('2026-03-29T00:59:00Z'), 'Europe/London')).toBe('2026-03-29');
    expect(dayKey(new Date('2026-03-29T23:00:00Z'), 'Europe/London')).toBe('2026-03-30');
    expect(dayKey(new Date('2026-10-24T23:30:00Z'), 'Europe/London')).toBe('2026-10-25');
    expect(dayKey(new Date('2026-10-25T23:30:00Z'), 'Europe/London')).toBe('2026-10-25');
    expect(dayKey(new Date('2026-09-28T23:30:00Z'), 'America/New_York')).toBe('2026-09-28');
  });

  it('resets the daily introduction count at local midnight, including DST', () => {
    let data = fresh();
    data.preferences.newCardLimit = 1;
    data = review(data, 5, 'late-review', 'one', new Date('2026-03-29T22:59:00Z'));
    expect(dueCards(data, new Date('2026-03-29T22:59:30Z'))).toHaveLength(0);
    expect(dueCards(data, new Date('2026-03-29T23:00:00Z')).map(card => card.id)).toEqual(['two']);
  });
});

describe('JSON backups', () => {
  it('round-trips cards, image references, history and scheduling parameters', () => {
    const data = review(fresh());
    data.cards[0] = { ...data.cards[0]!, kind: 'visual', image: '/assets/apple.svg', imageDescription: 'One round fruit on a neutral surface.' };
    expect(parseBackup(exportBackup(data, now))).toEqual(data);
  });

  it('rejects malformed JSON, unknown versions and broken history references', () => {
    expect(() => parseBackup('{')).toThrow('not valid JSON');
    const serialized = JSON.parse(exportBackup(review(fresh()), now));
    serialized.version = 99;
    expect(() => parseBackup(JSON.stringify(serialized))).toThrow('unsupported backup');
    serialized.version = 1;
    serialized.state.events[0].cardId = 'missing-card';
    expect(() => parseBackup(JSON.stringify(serialized))).toThrow('invalid or duplicate review');
  });

  it('rejects altered scheduler configuration and inconsistent current state', () => {
    const data = review(fresh());
    data.states['one']!.reps = 100;
    expect(() => validateState(data)).toThrow('does not match history');
    const next = fresh();
    next.scheduler.parameters.request_retention = 0.2;
    expect(() => validateState(next)).toThrow('unsupported scheduler');
  });
});
