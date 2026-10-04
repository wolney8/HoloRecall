import type { CardContent, State } from './models';
import { DEFAULT_REWARD_CONFIG } from './rewards';
import { validateState } from './backup';
import { BALANCED_PRESET_ID, cloneBuiltInPresets } from './study-settings';

/** Structural migration only: no fabricated reviews, reward grants or content revisions. */
export function migrateState(input: unknown, bundledCards: CardContent[] = []): State {
  if (!input || typeof input !== 'object') throw new Error('Invalid HoloRecall data: expected an object.');
  const raw = structuredClone(input) as Record<string, unknown>;
  if (![1, 2, 3, 4, 5, 6].includes(Number(raw['schemaVersion']))) throw new Error('Invalid HoloRecall data: unsupported schema.');
  if (raw['schemaVersion'] === 1) {
    raw['schemaVersion'] = 2;
    raw['designs'] = [];
    raw['assets'] = [];
    raw['rewardEvents'] = [];
    raw['rewardConfig'] = { ...DEFAULT_REWARD_CONFIG };
    raw['session'] = null;
    if (raw['preferences'] && typeof raw['preferences'] === 'object') raw['preferences'] = { ...raw['preferences'], theme: 'system' };
    if (Array.isArray(raw['cards'])) raw['cards'] = (raw['cards'] as CardContent[]).map(card => {
      const seed = bundledCards.find(seed => seed.id === card.id && seed.front === card.front && seed.answer === card.answer && card.revision === 1);
      return { ...card, rarity: card.rarity ?? seed?.rarity ?? 'common', ...(seed && !card.image && seed.image ? { image: seed.image, imageDescription: seed.imageDescription } : {}) };
    });
  }
  if (raw['schemaVersion'] === 2) { raw['schemaVersion'] = 3; raw['ankiMappings'] = []; }
  if (raw['schemaVersion'] === 3) raw['schemaVersion'] = 4;
  if (raw['schemaVersion'] === 4) {
    const preferences=raw['preferences'] as {newCardLimit?:number;reviewLimit?:number};
    const presets=cloneBuiltInPresets();presets[0]={...presets[0]!,newCardsPerDay:preferences.newCardLimit??10,maxReviewsPerDay:preferences.reviewLimit??100};
    raw['schemaVersion']=5;raw['studyPresets']=presets;raw['todayOverrides']=[];raw['cardControls']={};raw['administrativeEvents']=[];
    raw['decks']=(raw['decks'] as Array<Record<string,unknown>>).map(deck=>({...deck,studyPresetId:BALANCED_PRESET_ID}));
  }
  if (raw['schemaVersion'] === 5) {
    raw['schemaVersion'] = 6;
    raw['practiceEvents'] = [];
    raw['focusPresets'] = [];
    if (Array.isArray(raw['events'])) raw['events'] = (raw['events'] as Array<Record<string, unknown>>).map(event => event['kind'] === 'review' && event['mode'] === 'practice' ? { ...event, mode: 'scheduled' } : event);
    if (raw['session'] && typeof raw['session'] === 'object') raw['session'] = { ...(raw['session'] as Record<string, unknown>), mode: 'scheduled' };
  }
  if (raw['preferences'] && typeof raw['preferences'] === 'object') raw['preferences'] = { haptics: true, ...(raw['preferences'] as Record<string, unknown>) };
  validateState(raw);
  return raw;
}
