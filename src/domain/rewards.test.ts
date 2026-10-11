import { describe, expect, it } from 'vitest';
import { applyReview, createInitialState, undoLatestReview } from './study';
import { activeRewardEvents, collectibleTeaser, MAX_PRESTIGE_LEVEL, PRESTIGE_CYCLE_THRESHOLDS, prestigeProgress, rewardEventsForReview, rewardProgress } from './rewards';
import { exportBackup, parseBackup, validateRewardConfig, validateState } from './backup';
import { buildReport } from './reports';
import type { ConfidenceRating, State } from './models';
import { recordPracticeRating } from './practice';
import { acceptScheduledReview } from '../test/scheduled-review';

const first = new Date('2026-09-28T12:00:00Z');
const initial = () => createInitialState([{ id: 'it', name: 'Italian', description: '', suspended: false }], [{ id: 'card', deckId: 'it', kind: 'text', front: 'coffee', answer: 'il caffè', pronunciation: '', meaning: '', notes: '', tags: [], revision: 1, suspended: false, rarity: 'rare' }]);
const rate = (data: State, id: string, rating: ConfidenceRating = 4, now = first) => acceptScheduledReview(data, { id, cardId: 'card', sessionId: 'session', rating, now, activeMs: 3000 });
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
  it('uses the saved threshold policy for future unlocks without rewriting prior contributions', () => {
    let state = initial();
    state.rewardConfig = { ...state.rewardConfig, rare: 4, 'holo-rare': 6, 'ultra-rare': 9, 'secret-rare': 13, relic: 21 };
    state = rate(state, 'first');
    state = rate(state, 'second', 5, nextTime(state));
    state = rate(state, 'third', 5, nextTime(state));
    expect(rewardProgress(state, 'card')).toEqual({ earned: false, days: 3, required: 4 });
    const prior = structuredClone(state.rewardEvents);
    state = { ...state, rewardConfig: { ...state.rewardConfig, rare: 3 } };
    expect(state.rewardEvents).toEqual(prior);
    expect(rewardProgress(state, 'card')).toEqual({ earned: false, days: 3, required: 3 });
    state = rate(state, 'fourth', 5, nextTime(state));
    expect(rewardProgress(state, 'card')).toEqual({ earned: true, days: 4, required: 3 });
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
    let state = rate(initial(), 'first', 3);
    const rewards=structuredClone(state.rewardEvents);state.session={id:'practice-session',mode:'practice',queue:['card'],total:1,completed:0,revealed:true,activeMs:0};
    state=recordPracticeRating(state,{id:'practice',cardId:'card',sessionId:'practice-session',rating:5,now:first});
    expect(state.practiceEvents).toHaveLength(1);expect(state.rewardEvents).toEqual(rewards);
    expect(activeRewardEvents(state)).toEqual([]);
  });
});

describe('Mastery to Prestige event ledger',()=>{
  const common=()=>{const state=initial();state.cards[0]={...state.cards[0]!,rarity:'common'};return state;};
  const advance=(state:State,id:string)=>rate(state,id,5,nextTime(state));
  it('starts only after authored-rarity mastery and promotes through capped, independent cycles',()=>{
    let state=rate(common(),'mastery');
    expect(rewardProgress(state,'card').earned).toBe(true);expect(prestigeProgress(state,'card')).toMatchObject({level:0,days:0,required:3});
    const fsrsAfterMastery=structuredClone(state.states.card);
    for(let index=0;index<3;index++)state=advance(state,`p1-${index}`);
    expect(prestigeProgress(state,'card')).toMatchObject({level:1,cycle:2,days:0,required:3,capped:false});
    expect(state.cards[0]!.rarity).toBe('common');expect(state.events.filter(event=>event.kind==='review')).toHaveLength(4);expect(state.states.card!.version).toBe(fsrsAfterMastery.version+3);
    for(let level=2;level<=MAX_PRESTIGE_LEVEL;level++)for(let day=0;day<PRESTIGE_CYCLE_THRESHOLDS[level-1]!;day++)state=advance(state,`p${level}-${day}`);
    expect(prestigeProgress(state,'card')).toEqual({level:10,cycle:11,days:0,required:0,capped:true});
    const before=state.rewardEvents.length;state=advance(state,'after-cap');expect(state.rewardEvents.length).toBe(before+1);expect(state.rewardEvents.at(-1)?.kind).toBe('contribution');
    validateState(state);
  });
  it('exposes an answer-free locked/unlocked/Prestige teaser contract',()=>{
    const locked=common();
    expect(collectibleTeaser(locked,'card')).toEqual({state:'locked',face:'card-back',silhouette:true,setNumber:1,setSize:1,rarityHint:'common'});
    expect('answer' in collectibleTeaser(locked,'card')).toBe(false);
    let prestiged=rate(locked,'mastery');for(let index=0;index<3;index++)prestiged=advance(prestiged,`teaser-${index}`);
    expect(collectibleTeaser(prestiged,'card')).toMatchObject({state:'prestige',face:'collectible-face',silhouette:false});
  });
  it('ignores practice, duplicate delivery and same-day reviews',()=>{
    let state=rate(common(),'mastery');
    const sameDay=rate(state,'same-day',5,new Date(state.states.card!.due));
    expect(prestigeProgress(sameDay,'card').days).toBe(0);
    const replay=rate(sameDay,'same-day',5,new Date(sameDay.states.card!.due));expect(replay).toBe(sameDay);
    const rewards=structuredClone(replay.rewardEvents);replay.session={id:'practice',mode:'practice',experienceMode:'free-revision',queue:['card'],total:1,completed:0,revealed:true,activeMs:0};
    state=recordPracticeRating(replay,{id:'free',cardId:'card',sessionId:'practice',rating:5,now:nextTime(replay)});
    expect(state.rewardEvents).toEqual(rewards);expect(prestigeProgress(state,'card').days).toBe(0);
  });
  it('undoes a promotion and its contribution once without changing authored rarity or history records',()=>{
    let state=rate(common(),'mastery');for(let index=0;index<3;index++)state=advance(state,`p1-${index}`);
    const reviewCount=state.events.filter(event=>event.kind==='review').length,rarity=state.cards[0]!.rarity;
    const undone=undoLatestReview(state,nextTime(state),'undo-promotion');
    expect(prestigeProgress(undone,'card')).toMatchObject({level:0,days:2,required:3});expect(undone.cards[0]!.rarity).toBe(rarity);expect(undone.events.filter(event=>event.kind==='review')).toHaveLength(reviewCount);expect(undone.events.at(-1)?.kind).toBe('reversal');
    expect(()=>undoLatestReview(undone,nextTime(undone),'undo-promotion','card','session')).toThrow();validateState(undone);
  });
  it('preserves auditable Prestige evidence through a full backup without embedding it in card content',()=>{
    let state=rate(common(),'mastery');for(let index=0;index<3;index++)state=advance(state,`p1-${index}`);
    const restored=parseBackup(exportBackup(state,new Date('2026-10-11T12:00:00Z')));
    expect(prestigeProgress(restored,'card')).toEqual(prestigeProgress(state,'card'));expect(restored.rewardEvents).toEqual(state.rewardEvents);expect('prestige' in restored.cards[0]!).toBe(false);validateState(restored);
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
    const event = state.events.pop()!;
    if (event.kind !== 'review') throw new Error('expected review');
    state.practiceEvents.push({kind:'practice',id:'practice',userId:state.userId,cardId:event.cardId,sessionId:'practice-session',timestamp:event.timestamp,rating:event.rating,activeMs:event.activeMs??0});
    const report = buildReport(state, first);
    expect(report.reviewCount).toBe(1);
    expect(report.practiceCount).toBe(1);
    expect(report.attention).toEqual([]);
  });
});
