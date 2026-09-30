import type { CardContent, State } from './models';
import { DEFAULT_REWARD_CONFIG } from './rewards';
import { validateState } from './backup';

/** Structural migration only: no fabricated reviews, reward grants or content revisions. */
export function migrateState(input: unknown, bundledCards: CardContent[] = []): State {
  if (!input || typeof input !== 'object') throw new Error('Invalid HoloRecall data: expected an object.');
  const raw = structuredClone(input) as Record<string, unknown>;
  if (![1, 2, 3].includes(Number(raw['schemaVersion']))) throw new Error('Invalid HoloRecall data: unsupported schema.');
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
  validateState(raw);
  return raw;
}
