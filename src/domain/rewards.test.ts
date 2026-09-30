import { describe, expect, it } from 'vitest';
import { applyReview, createInitialState, undoLatestReview } from './study';
import { activeRewardEvents, rewardEventsForReview, rewardProgress } from './rewards';
import { validateRewardConfig, validateState } from './backup';
import { buildReport } from './reports';
import type { ConfidenceRating, State } from './models';

const first = new Date('2026-09-28T12:00:00Z');
const initial = () => createInitialState([{ id: 'it', name: 'Italian', description: '', suspended: false }], [{ id: 'card', deckId: 'it', kind: 'text', front: 'coffee', answer: 'il caffè', pronunciation: '', meaning: '', notes: '', tags: [], revision: 1, suspended: false, rarity: 'rare' }]);
const rate = (data: State, id: string, rating: ConfidenceRating = 4, now = first) => applyReview(data, { id, cardId: 'card', sessionId: 'session', rating, now, activeMs: 3000 });
const nextTime = (data: State) => new Date(Math.max(Date.parse(data.states['card']!.due), Date.parse(data.states['card']!.last_review!) + 86400000));

describe('auditable cosmetic earning', () => {
  it('requires strictly higher day thresholds for every higher cosmetic tier', () => {
    const config = initial().rewardConfig;
    expect(() => validateRewardConfig(config)).not.toThrow();
    expect(() => validateRewardConfig({ ...config, uncommon: config.common })).toThrow('strictly increasing');
    expect(() => validateRewardConfig({ ...config, relic: config['secret-rare'] })).toThrow('strictly increasing');
    expect(() => validateRewardConfig({ common: 1, uncommon: 1, rare: 1, 'holo-rare': 1, 'ultra-rare': 1, 'secret-rare': 1, relic: 1 })).toThrow('strictly increasing');
  });
  it('counts a first scheduled high-confidence review but does not change FSRS to award anything', () => {
    const three = rate(initial(), 'three', 3), four = rate(initial(), 'four', 4);
    expect(three.states).toEqual(four.states);
    expect(three.rewardEvents).toEqual([]);
    expect(rewardProgress(four, 'card')).toEqual({ earned: false, days: 1, required: 3 });
    expect(rewardProgress(four, 'card', 'common').earned).toBe(true);
    validateState(four);
  });
  it('requires separate study days and 20 hours even after a time-zone change', () => {
    const once = rate(initial(), 'first');
    const minuteLater = rate(once, 'same-day', 4, new Date(once.states['card']!.due));
    expect(rewardProgress(minuteLater, 'card').days).toBe(1);
    const review = minuteLater.events.find(event => event.kind === 'review')!;
    expect(review.kind).toBe('review');
    if (review.kind !== 'review') return;
    expect(rewardEventsForReview(minuteLater, { ...review, id: 'new', timestamp: '2026-09-28T13:00:00Z' }, '2026-09-29')).toEqual([]);
  });
  it('deduplicates contributions and unlocks under repeated delivery', () => {
    const reviewed = rate(initial(), 'same');
    const replayed = rate(reviewed, 'same');
    expect(replayed).toBe(reviewed);
    expect(replayed.rewardEvents.filter(event => event.kind === 'contribution')).toHaveLength(1);
    expect(replayed.rewardEvents.filter(event => event.kind === 'unlock')).toHaveLength(1);
  });
  it('earns sustained tiers and retains them after later forgetting', () => {
    let state = rate(initial(), 'first');
    state = rate(state, 'second', 5, nextTime(state));
    state = rate(state, 'third', 5, nextTime(state));
    expect(rewardProgress(state, 'card')).toEqual({ earned: true, days: 3, required: 3 });
    state = rate(state, 'forgot', 1, nextTime(state));
    expect(rewardProgress(state, 'card').earned).toBe(true);
    validateState(state);
  });
  it('undo reverses its contribution and dependent unlocks without deleting audit history', () => {
    let state = rate(initial(), 'first');
    state = rate(state, 'second', 5, nextTime(state));
    state = rate(state, 'third', 5, nextTime(state));
    const original = structuredClone(state.rewardEvents);
    const reversed = undoLatestReview(state, nextTime(state), 'undo');
    expect(reversed.rewardEvents.slice(0, original.length)).toEqual(original);
    expect(rewardProgress(reversed, 'card')).toEqual({ earned: false, days: 2, required: 3 });
    expect(rewardProgress(reversed, 'card', 'uncommon').earned).toBe(true);
    validateState(reversed);
  });
  it('never grants rewards for practice events or lower self-ratings', () => {
    const state = rate(initial(), 'first', 3);
    const review = state.events[0]!;
    if (review.kind !== 'review') throw new Error('expected review');
    expect(rewardEventsForReview(state, { ...review, id: 'practice', rating: 5, mode: 'practice' }, '2026-09-28')).toEqual([]);
    expect(activeRewardEvents(state)).toEqual([]);
  });
});

describe('event-derived reports', () => {
  it('reports real outcomes and active time, excludes undone events, and keeps model estimates separate', () => {
    const once = rate(initial(), 'first');
    const report = buildReport(once, first);
    expect(report.reviewCount).toBe(1);
    expect(report.activeMs).toBe(3000);
    expect(report.activeTimeSamples).toBe(1);
    expect(report.recallSuccess).toBe(1);
    expect(report.confidence.find(item => item.rating === 4)?.count).toBe(1);
    expect(report.perDeck[0]!.introduced).toBe(1);
    expect(report.estimatedRetrievability).toBeGreaterThan(0);
    const undone = buildReport(undoLatestReview(once, first, 'undo'), first);
    expect(undone.reviewCount).toBe(0);
    expect(undone.activeMs).toBe(0);
    expect(undone.recallSuccess).toBeNull();
    expect(undone.estimatedRetrievability).toBeNull();
  });
  it('applies learner calendar date filters and reports empty sample sizes honestly', () => {
    const once = rate(initial(), 'first', 1, new Date('2026-09-28T23:30:00Z'));
    const report = buildReport(once, first, { from: '2026-09-29', to: '2026-09-29' });
    expect(report.reviewCount).toBe(1);
    expect(report.activity[0]!.date).toBe('2026-09-29');
    expect(report.recallSuccess).toBe(0);
    expect(buildReport(once, first, { to: '2026-09-28' }).reviewCount).toBe(0);
  });
  it('requires repeated failures before identifying attention and excludes practice from scheduled metrics', () => {
    let state = rate(initial(), 'first', 1);
    state = rate(state, 'second', 1, new Date(state.states['card']!.due));
    expect(buildReport(state, first).attention[0]).toMatchObject({ failures: 2, sampleSize: 2 });
    const event = state.events[1]!;
    if (event.kind !== 'review') throw new Error('expected review');
    event.mode = 'practice';
    const report = buildReport(state, first);
    expect(report.reviewCount).toBe(1);
    expect(report.practiceCount).toBe(1);
    expect(report.attention).toEqual([]);
  });
});
