import { describe, expect, it } from 'vitest';
import { applyReview, createInitialState } from './study';
import { exportBackup, parseBackup, validateAsset, validateDesign, validateState } from './backup';
import { migrateState } from './migrations';
import { rewardProgress } from './rewards';
import type { State } from './models';

const now = new Date('2026-09-28T12:00:00Z');
const fresh = () => createInitialState([{ id: 'it', name: 'My deck', description: '', suspended: false }], [{ id: 'it-mela', deckId: 'it', kind: 'text', front: 'An apple', answer: 'una mela', pronunciation: '', meaning: '', notes: '', tags: [], revision: 1, suspended: false }]);
export const legacySnapshot = (state = fresh()): Record<string, unknown> => {
  const legacy = structuredClone(state) as unknown as Record<string, unknown>;
  legacy['schemaVersion'] = 1;
  for (const key of ['assets', 'designs', 'rewardEvents', 'rewardConfig', 'session', 'ankiMappings']) delete legacy[key];
  return legacy;
};

describe('non-destructive v1 migration and backups', () => {
  it('preserves every legacy review and schedule without retroactive reward grants', () => {
    const reviewed = applyReview(fresh(), { id: 'first', cardId: 'it-mela', rating: 5, sessionId: 'session', now });
    const legacy = legacySnapshot(reviewed);
    const before = structuredClone(legacy);
    const migrated = migrateState(legacy);
    expect(legacy).toEqual(before);
    expect(migrated.states).toEqual(reviewed.states);
    expect(migrated.events).toEqual(reviewed.events);
    expect(migrated.cards[0]!.revision).toBe(1);
    expect(migrated.decks[0]!.name).toBe('My deck');
    expect(migrated.rewardEvents).toEqual([]);
    expect(rewardProgress(migrated, 'it-mela').days).toBe(0);
    validateState(migrated);
  });
  it('backfills only missing seed illustrations on matching unedited content', () => {
    const state = fresh();
    const seed = [{ ...state.cards[0]!, image: '/art/mela.svg', imageDescription: 'A red fruit.', rarity: 'rare' as const }];
    const migrated = migrateState(legacySnapshot(state), seed);
    expect(migrated.cards[0]!.image).toBe('/art/mela.svg');
    expect(migrated.cards[0]!.revision).toBe(1);
    state.cards[0]!.answer = 'my edited answer';
    expect(migrateState(legacySnapshot(state), seed).cards[0]!.image).toBeUndefined();
    state.cards[0] = { ...seed[0]!, image: '/art/caffe.svg' };
    expect(migrateState(legacySnapshot(state), seed).cards[0]!.image).toBe('/art/caffe.svg');
  });
  it('restores a v1 backup and round-trips v3 uploaded media, designs, mappings, and persisted session', () => {
    const json = JSON.stringify({ format: 'holorecall-backup', version: 1, exportedAt: now.toISOString(), state: legacySnapshot() });
    const restored = parseBackup(json);
    expect(restored.schemaVersion).toBe(5);
    const withBundledArt = parseBackup(json, [{ ...fresh().cards[0]!, image: '/art/mela.svg', imageDescription: 'A red fruit.' }]);
    expect(withBundledArt.cards[0]!.image).toBe('/art/mela.svg');
    const next = { ...restored, session: { id: 'session', queue: ['it-mela'], total: 1, completed: 0, revealed: true, activeMs: 1000 } } satisfies State;
    next.assets.push({ id: 'picture', name: 'apple.png', mime: 'image/png', dataUrl: 'data:image/png;base64,iVBORw0KGgo=', width: 16, height: 16 });
    next.assets.push({ id: 'voice', name: 'apple.mp3', mime: 'audio/mpeg', dataUrl: 'data:audio/mpeg;base64,SUQzBAAAAAA=' });
    next.designs.push({ id: 'set', name: 'My artwork', background: 'asset:picture', backgroundFit: 'cover', frameFit: 'contain', backgroundPositionX: 50, backgroundPositionY: 50, credit: 'Me', source: '', license: 'Original' });
    next.cards[0]!.designSetId = 'set';
    next.cards[0]!.frontAudio = ['asset:voice']; next.cards[0]!.backAudio = ['asset:voice'];
    next.ankiMappings.push({ id: 'map', version: 1, name: 'Custom Italian', sourceSignature: 'anki-model-v1-abcd', modelName: 'Custom', fields: { Term: 'front', Definition: 'answer' } });
    expect(parseBackup(exportBackup(next, now))).toEqual(next);
  });
  it('rejects unresolved uploaded assets, design references and active image sources', () => {
    const state = fresh(); state.cards[0]!.image = 'asset:missing';
    expect(() => validateState(state)).toThrow('does not resolve');
    state.cards[0]!.image = 'blob:temporary';
    expect(() => validateState(state)).toThrow('invalid media');
    expect(() => validateAsset({ id: 'script', name: 'script.svg', mime: 'image/svg+xml', dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=', width: 16, height: 16 })).toThrow('invalid uploaded');
    expect(() => validateAsset({ id: 'hidden-svg', name: 'image.png', mime: 'image/png', dataUrl: 'data:image/png;base64,PHN2Zz4=', width: 16, height: 16 })).toThrow('raster type');
    expect(() => validateDesign({ id: 'set', name: 'Bad', backgroundFit: 'cover', frameFit: 'contain', backgroundPositionX: 1000, backgroundPositionY: 50, credit: '', source: '', license: '' })).toThrow('invalid image position');
  });
});
