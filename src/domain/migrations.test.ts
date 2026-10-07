import { describe, expect, it } from 'vitest';
import { createInitialState } from './study';
import { acceptScheduledReview as applyReview } from '../test/scheduled-review';
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
  it('defaults native haptics on for older snapshots without changing learner records',()=>{const before=fresh(),legacy=structuredClone(before);delete legacy.preferences.haptics;const migrated=migrateState(legacy);expect(migrated.preferences.haptics).toBe(true);expect(migrated.events).toEqual(before.events);expect(migrated.states).toEqual(before.states);});
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
  it('round-trips immutable review deck/day attribution and accepts legacy events without it',()=>{const reviewed=applyReview(fresh(),{id:'attributed',cardId:'it-mela',rating:4,sessionId:'session',now});const restored=parseBackup(exportBackup(reviewed,now));expect(restored.events[0]).toMatchObject({studyDeckId:'it',studyDeckPath:['it'],studyRootDeckId:'it',studyDay:'2026-09-28',studyTimeZone:'Europe/London'});const legacy=structuredClone(reviewed);const event=legacy.events[0]!;if(event.kind==='review'){delete event.studyDeckId;delete event.studyDeckPath;delete event.studyRootDeckId;delete event.studyDay;delete event.studyTimeZone;}expect(()=>validateState(legacy)).not.toThrow();});
  it('rejects restored daily attribution that is not a real deck ancestry',()=>{const reviewed=applyReview(fresh(),{id:'attributed',cardId:'it-mela',rating:4,sessionId:'session',now});reviewed.decks.push({id:'unrelated',name:'Unrelated',description:'',suspended:false});const event=reviewed.events[0]!;if(event.kind!=='review')throw new Error('expected review');event.studyDeckPath=['it','unrelated'];event.studyRootDeckId='unrelated';expect(()=>validateState(reviewed)).toThrow('invalid review deck path');});
  it('migrates a valid schema-5 pseudo-practice review without breaking its scheduler chain',()=>{const reviewed=applyReview(fresh(),{id:'legacy-practice',cardId:'it-mela',rating:3,sessionId:'session',now}),legacy=structuredClone(reviewed) as unknown as Record<string,unknown>;legacy['schemaVersion']=5;delete legacy['practiceEvents'];delete legacy['focusPresets'];const events=legacy['events'] as Array<Record<string,unknown>>;events[0]!['mode']='practice';const migrated=migrateState(legacy);expect(migrated.events[0]).toMatchObject({id:'legacy-practice',mode:'scheduled'});expect(migrated.states).toEqual(reviewed.states);expect(()=>validateState(migrated)).not.toThrow();});
  it('marks schema-6 mapping authorship unknown without changing learning data',()=>{const state=fresh(),legacy=structuredClone(state) as unknown as Record<string,unknown>;legacy['schemaVersion']=6;legacy['ankiMappings']=[{id:'old-map',version:2,name:'Old mapping',sourceSignature:'anki-model-v1-abcd',modelName:'Custom',fields:{Language:'answer',Italian:'ignore'}}];const beforeStates=structuredClone(state.states),beforeEvents=structuredClone(state.events),migrated=migrateState(legacy);expect(migrated.schemaVersion).toBe(7);expect(migrated.ankiMappings[0]).toMatchObject({policyVersion:0,origin:'legacy-unclassified'});expect(migrated.states).toEqual(beforeStates);expect(migrated.events).toEqual(beforeEvents);});
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
    expect(restored.schemaVersion).toBe(7);
    const withBundledArt = parseBackup(json, [{ ...fresh().cards[0]!, image: '/art/mela.svg', imageDescription: 'A red fruit.' }]);
    expect(withBundledArt.cards[0]!.image).toBe('/art/mela.svg');
    const next = { ...restored, session: { id: 'session', mode: 'scheduled' as const, queue: ['it-mela'], total: 1, completed: 0, revealed: true, activeMs: 1000 } } satisfies State;
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
