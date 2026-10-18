import { describe, expect, it } from 'vitest';
import type { CardContent, Deck, RewardEvent, State } from './models';
import { createInitialState } from './study';
import { deckCollectionProgress, isCollected, lockedCollectibleTeaser, nearUnlocks, topLevelCollectionProgress } from './collection';

const decks: Deck[] = [
  { id: 'lesson', name: 'Lesson', description: '', suspended: false },
  { id: 'a', parentId: 'lesson', name: 'A', description: '', suspended: false },
  { id: 'b', parentId: 'lesson', name: 'B', description: '', suspended: false },
];
const cards: CardContent[] = Array.from({ length: 10 }, (_, index) => ({ id: `c${index}`, deckId: index < 4 ? 'a' : 'b', kind: 'text', front: `SECRET PROMPT ${index}`, answer: `SECRET ANSWER ${index}`, pronunciation: `SECRET SOUND ${index}`, meaning: `SECRET MEANING ${index}`, notes: `SECRET CLUE ${index}`, tags: [], rarity: index === 3 ? 'holo-rare' : 'common', revision: 1, suspended: false }));
const unlock = (cardId: string, rarity: 'common'|'holo-rare' = 'common', n = 0): RewardEvent => ({ kind: 'unlock', id: `u${cardId}`, reviewEventId: `r${cardId}`, cardId, rarity, required: 1, contributionIds: [`x${cardId}`], timestamp: `2026-10-${String(n + 1).padStart(2, '0')}T10:00:00Z` });
function fixture(): State { const state = createInitialState(decks, cards); state.rewardEvents = [unlock('c0'), unlock('c1'), unlock('c2'), unlock('c3', 'holo-rare'), unlock('c4')]; return state; }

describe('Collection ownership and set progress', () => {
  it('uses authored-rarity reward ownership and counts Prestige only once', () => {
    const state = fixture(); state.rewardEvents.push({kind:'prestige-promotion',id:'p',reviewEventId:'rp',cardId:'c0',timestamp:'2026-10-10T10:00:00Z',level:5,required:3,contributionIds:[]});
    expect(isCollected(state, 'c0')).toBe(true);
    expect(deckCollectionProgress(state, 'lesson')).toMatchObject({ earned: 5, total: 10, percent: 50, prestiged: 1 });
    expect(deckCollectionProgress(state, 'a')).toMatchObject({ earned: 4, total: 4 });
    expect(deckCollectionProgress(state, 'b')).toMatchObject({ earned: 1, total: 6 });
    expect(topLevelCollectionProgress(state)).toHaveLength(1);
  });
  it('sorts locked teasers by remaining days, ratio, then source order', () => {
    const state = fixture();
    state.rewardEvents.push({kind:'contribution',id:'x5',reviewEventId:'r5',cardId:'c5',timestamp:'2026-10-11T10:00:00Z',studyDay:'2026-10-11',timeZone:'Europe/London',configVersion:'confidence-days-v1'});
    for(const card of state.cards.slice(5))card.rarity='rare';
    expect(nearUnlocks(state, 2).map(item => item.cardId)).toEqual(['c5','c6']);
  });
  it('returns an answer-free locked model with stable position', () => {
    const teaser = lockedCollectibleTeaser(fixture(), cards[6]!);
    expect(teaser).toMatchObject({ cardId:'c6', deckName:'B', position:3, setSize:6 });
    expect(JSON.stringify(teaser)).not.toMatch(/SECRET|prompt|answer|pronunciation|meaning|clue/i);
  });
});
