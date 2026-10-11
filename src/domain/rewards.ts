import type { CollectiblePresentationState, PrestigeContribution, PrestigePromotion, Rarity, RewardContribution, RewardEvent, RewardReversal, RewardUnlock, ReviewEvent, State } from './models';

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
export const MAX_PRESTIGE_LEVEL = 10;
/** Distinct eligible study days required inside each cosmetic cycle, P1 through P10. */
export const PRESTIGE_CYCLE_THRESHOLDS = [3,3,4,4,5,5,6,6,7,8] as const;

export function activeRewardEvents(state: State): Exclude<RewardEvent, RewardReversal>[] {
  const reversed = new Set(state.rewardEvents.flatMap(event => event.kind === 'reward-reversal' ? event.reversedEventIds : []));
  return state.rewardEvents.filter((event): event is Exclude<RewardEvent,RewardReversal> => event.kind !== 'reward-reversal' && !reversed.has(event.id));
}
export function collectiblePresentationState(state:State,cardId:string):CollectiblePresentationState{
  if(prestigeProgress(state,cardId).level>0)return'prestige';
  return rewardProgress(state,cardId).earned?'unlocked':'locked';
}
export interface CollectibleTeaser {
  state:CollectiblePresentationState;
  face:'card-back'|'collectible-face';
  silhouette:boolean;
  setNumber:number;
  setSize:number;
  rarityHint:Rarity;
}
/** Answer-free presentation metadata for a future Collection Desk. */
export function collectibleTeaser(state:State,cardId:string):CollectibleTeaser{
  const card=state.cards.find(item=>item.id===cardId);
  if(!card)throw new Error(`Unknown card ${cardId}`);
  const siblings=state.cards.filter(item=>item.deckId===card.deckId&&!item.archived);
  const presentation=collectiblePresentationState(state,cardId);
  return{state:presentation,face:presentation==='locked'?'card-back':'collectible-face',silhouette:presentation==='locked',setNumber:Math.max(1,siblings.findIndex(item=>item.id===cardId)+1),setSize:siblings.length,rarityHint:card.rarity??'common'};
}
export interface PrestigeProgress { level:number; cycle:number; days:number; required:number; capped:boolean }
export function prestigeProgress(state:State,cardId:string):PrestigeProgress{
  const active=activeRewardEvents(state).filter(event=>event.cardId===cardId);
  const level=Math.min(MAX_PRESTIGE_LEVEL,active.filter((event):event is PrestigePromotion=>event.kind==='prestige-promotion').reduce((highest,event)=>Math.max(highest,event.level),0));
  const cycle=level+1,capped=level>=MAX_PRESTIGE_LEVEL;
  const days=capped?0:active.filter((event):event is PrestigeContribution=>event.kind==='prestige-contribution'&&event.cycle===cycle).length;
  return{level,cycle,days,required:capped?0:PRESTIGE_CYCLE_THRESHOLDS[level]!,capped};
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
  if (review.rating < 4 || state.rewardEvents.some(event => event.reviewEventId === review.id)) return [];
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
  const authored=state.cards.find(card=>card.id===review.cardId)?.rarity??'common';
  const masteryRequired=state.rewardConfig[authored];
  if(all.length>masteryRequired){
    const current=prestigeProgress(state,review.cardId);
    if(!current.capped){
      const prestigeContribution:PrestigeContribution={kind:'prestige-contribution',id:`prestige-contribution:${review.id}`,reviewEventId:review.id,cardId:review.cardId,timestamp:review.timestamp,studyDay,timeZone:state.preferences.timeZone,cycle:current.cycle,configVersion:'prestige-days-v1'};
      result.push(prestigeContribution);
      const existing=active.filter((event):event is PrestigeContribution=>event.kind==='prestige-contribution'&&event.cycle===current.cycle);
      const cycle=[...existing,prestigeContribution];
      if(cycle.length>=current.required)result.push({kind:'prestige-promotion',id:`prestige-promotion:${current.cycle}:${review.id}`,reviewEventId:review.id,cardId:review.cardId,timestamp:review.timestamp,level:current.cycle,required:current.required,contributionIds:cycle.map(event=>event.id)});
    }
  }
  return result;
}

/** Undo invalidates its contribution and unlocks whose recorded evidence depends on it. Later failures never do. */
export function rewardReversal(state: State, reviewId: string, cardId: string, timestamp: string, reversalId: string): RewardEvent[] {
  const active = activeRewardEvents(state);
  const contributionIds = active.filter(event => event.kind === 'contribution' && event.reviewEventId === reviewId).map(event => event.id);
  const prestigeContributionIds=active.filter(event=>event.kind==='prestige-contribution'&&event.reviewEventId===reviewId).map(event=>event.id);
  const affected = active.filter(event => event.reviewEventId === reviewId || ((event.kind === 'unlock' || event.kind==='prestige-promotion') && event.contributionIds.some(id => contributionIds.includes(id)||prestigeContributionIds.includes(id))));
  return affected.length ? [{ kind: 'reward-reversal', id: `reward:${reversalId}`, cardId, reviewEventId: reviewId, timestamp, reversedEventIds: affected.map(event => event.id) }] : [];
}
