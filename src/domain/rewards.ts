import type { Rarity, RewardContribution, RewardEvent, RewardUnlock, ReviewEvent, State } from './models';

export const RARITIES: { id: Rarity; label: string; symbol: string }[] = [
  { id: 'common', label: 'Common', symbol: '●' }, { id: 'uncommon', label: 'Uncommon', symbol: '◆' },
  { id: 'rare', label: 'Rare', symbol: '✦' }, { id: 'holo-rare', label: 'Holo Rare', symbol: '✧' },
  { id: 'ultra-rare', label: 'Ultra Rare', symbol: '✶' }, { id: 'secret-rare', label: 'Secret Rare', symbol: '✷' },
  { id: 'relic', label: 'Relic', symbol: '❖' },
];
export const DEFAULT_REWARD_CONFIG: Record<Rarity, number> = {
  common: 1, uncommon: 2, rare: 3, 'holo-rare': 5, 'ultra-rare': 8, 'secret-rare': 12, relic: 20,
};
const MIN_SPACING_MS = 20 * 60 * 60 * 1000;

export function activeRewardEvents(state: State): (RewardContribution | RewardUnlock)[] {
  const reversed = new Set(state.rewardEvents.flatMap(event => event.kind === 'reward-reversal' ? event.reversedEventIds : []));
  return state.rewardEvents.filter((event): event is RewardContribution | RewardUnlock => event.kind !== 'reward-reversal' && !reversed.has(event.id));
}
export function rewardProgress(state: State, cardId: string, rarity?: Rarity): { earned: boolean; days: number; required: number } {
  const tier = rarity ?? state.cards.find(card => card.id === cardId)?.rarity ?? 'common';
  const events = activeRewardEvents(state).filter(event => event.cardId === cardId);
  return {
    earned: events.some(event => event.kind === 'unlock' && event.rarity === tier),
    days: events.filter(event => event.kind === 'contribution').length,
    required: state.rewardConfig[tier],
  };
}

/** Only newly recorded scheduled reviews can create contributions. Imported/legacy events are never replayed. */
export function rewardEventsForReview(state: State, review: ReviewEvent, studyDay: string): RewardEvent[] {
  if (review.mode === 'practice' || review.rating < 4 || state.rewardEvents.some(event => event.reviewEventId === review.id)) return [];
  const active = activeRewardEvents(state).filter(event => event.cardId === review.cardId);
  const contributions = active.filter((event): event is RewardContribution => event.kind === 'contribution');
  const latest = contributions.at(-1);
  if (contributions.some(event => event.studyDay === studyDay) || (latest && Date.parse(review.timestamp) - Date.parse(latest.timestamp) < MIN_SPACING_MS)) return [];
  const contribution: RewardContribution = {
    kind: 'contribution', id: `contribution:${review.id}`, reviewEventId: review.id,
    cardId: review.cardId, timestamp: review.timestamp, studyDay, timeZone: state.preferences.timeZone, configVersion: 'confidence-days-v1',
  };
  const all = [...contributions, contribution];
  const result: RewardEvent[] = [contribution];
  // Each card can earn each cosmetic tier; the authored tier selects its normal presentation.
  for (const rarity of RARITIES.map(tier => tier.id)) {
    if (all.length >= state.rewardConfig[rarity] && !active.some(event => event.kind === 'unlock' && event.rarity === rarity)) result.push({
      kind: 'unlock', id: `unlock:${rarity}:${review.id}`, reviewEventId: review.id,
      cardId: review.cardId, timestamp: review.timestamp, rarity, required: state.rewardConfig[rarity],
      contributionIds: all.map(event => event.id),
    });
  }
  return result;
}

/** Undo invalidates its contribution and unlocks whose recorded evidence depends on it. Later failures never do. */
export function rewardReversal(state: State, reviewId: string, cardId: string, timestamp: string, reversalId: string): RewardEvent[] {
  const active = activeRewardEvents(state);
  const contributionIds = active.filter(event => event.kind === 'contribution' && event.reviewEventId === reviewId).map(event => event.id);
  const affected = active.filter(event => event.reviewEventId === reviewId || (event.kind === 'unlock' && event.contributionIds.some(id => contributionIds.includes(id))));
  return affected.length ? [{ kind: 'reward-reversal', id: `reward:${reversalId}`, cardId, reviewEventId: reviewId, timestamp, reversedEventIds: affected.map(event => event.id) }] : [];
}
