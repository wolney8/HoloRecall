import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { LocalStudyStore } from './study-store';
import { applyReview, createInitialState } from '../../domain/study';
import type { ContentImport, State } from '../../domain/models';

function fixture() {
  return createInitialState([{ id: 'deck', name: 'Deck', description: '', suspended: false }], [{ id: 'card', deckId: 'deck', kind: 'text', front: 'coffee', answer: 'il caffè', pronunciation: '', meaning: '', notes: '', tags: [], revision: 1, suspended: false }]);
}
/** Exercise store transforms with its real validation and an in-memory compare/write boundary. */
function createStore(data: State) {
  const store = new LocalStudyStore();
  store.data.set(data);
  const internal = store as unknown as { database: { commit: (next: State, expected: number) => Promise<State> } };
  internal.database = { commit: async (next, expected) => {
    const { validateState } = await import('../../domain/backup');
    validateState(next);
    if (expected !== store.data()!.version || next.version !== expected + 1) throw new Error('Stale write');
    return next;
  } };
  return store;
}
const bundleFor = (data: State): ContentImport => ({ decks: structuredClone(data.decks), cards: structuredClone(data.cards), assets: [], designs: [] });

describe('atomic content imports and persistent sessions', () => {
  it('saves custom Anki mapping presets in one validated state change', async () => {
    const store = createStore(fixture());
    await store.saveAnkiMappings([
      { id: 'mapping-a', version: 1, name: 'Vocabulary', sourceSignature: 'anki-model-v1-a1', modelName: 'Custom', fields: { Prompt: 'front', Reply: 'answer' } },
      { id: 'mapping-b', version: 1, name: 'Audio', sourceSignature: 'anki-model-v1-b2', modelName: 'Custom audio', fields: { Sound: 'front-media' } },
    ]);
    expect(store.data()!.version).toBe(1); expect(store.data()!.ankiMappings).toHaveLength(2);
    const before = structuredClone(store.data());
    await expect(store.saveAnkiMappings([
      { id: 'mapping-a', version: 1, name: '', sourceSignature: 'anki-model-v1-a1', modelName: 'Custom', fields: { Prompt: 'front' } },
    ])).rejects.toThrow('invalid Anki mapping');
    expect(store.data()).toEqual(before);
  });
  it('updates content revisions while preserving review history, scheduling, and reward events', async () => {
    const reviewed = applyReview(fixture(), { id: 'review', cardId: 'card', sessionId: 'session', rating: 4, now: new Date('2026-09-28T12:00:00Z') });
    const store = createStore(reviewed), bundle = bundleFor(reviewed);
    bundle.cards[0]!.answer = 'caffè\nwith an accent';
    await store.applyContentImport(bundle, reviewed.version);
    expect(store.data()!.cards[0]!.revision).toBe(2);
    expect(store.data()!.events).toEqual(reviewed.events);
    expect(store.data()!.rewardEvents).toEqual(reviewed.rewardEvents);
    expect(store.data()!.states).toEqual(reviewed.states);
    const unchanged = bundleFor(store.data()!);
    unchanged.cards[0]!.revision = 1; unchanged.cards[0]!.rarity = 'common';
    await store.applyContentImport(unchanged, store.data()!.version);
    expect(store.data()!.cards[0]!.revision).toBe(2);
  });
  it('rejects stale previews and unresolved media atomically', async () => {
    const state = fixture(), store = createStore(state);
    await expect(store.applyContentImport(bundleFor(state), 99)).rejects.toThrow('Preview');
    expect(store.data()).toBe(state);
    const broken = bundleFor(state); broken.cards[0]!.image = 'asset:missing';
    await expect(store.applyContentImport(broken, 0)).rejects.toThrow('does not resolve');
    expect(store.data()).toBe(state);
    expect(store.data()!.events).toEqual([]);
  });
  it('reimports identical image bytes despite reordered fields and optional attribution defaults', async () => {
    const state = fixture();
    state.assets.push({ id: 'frame', name: 'original.png', mime: 'image/png', dataUrl: 'data:image/png;base64,iVBORw0KGgo=', width: 16, height: 16 });
    const original = structuredClone(state.assets[0]!);
    const store = createStore(state), bundle = bundleFor(state);
    bundle.assets = [{ height: 16, width: 16, dataUrl: original.dataUrl, mime: 'image/png', name: 'exported.png', id: 'frame', credit: '', source: '', license: '' }];
    await store.applyContentImport(bundle, 0);
    expect(store.data()!.assets).toEqual([original]);
    bundle.assets[0]!.width = 32;
    await expect(store.applyContentImport(bundle, 1)).rejects.toThrow('different artwork');
    expect(store.data()!.assets).toEqual([original]);
  });
  it('serializes overlapping same-tab mutations against the latest saved snapshot', async () => {
    const store = createStore(fixture());
    await Promise.all([store.startSession(), store.updatePreferences({ theme: 'dark' }), store.revealSession()]);
    expect(store.data()?.session?.revealed).toBe(true);
    expect(store.data()?.preferences.theme).toBe('dark');
    expect(store.data()?.version).toBe(3);
    const id = store.data()!.session!.id;
    await Promise.all([store.review('card', 4, id, 'same-review', 1000), store.review('card', 4, id, 'same-review', 1000)]);
    expect(store.data()?.events).toHaveLength(1);
    expect(store.data()?.version).toBe(4);
  });
  it('prunes suspended cards and decks without reordering eligible queued work', async () => {
    const state = fixture(); state.cards.push({ ...state.cards[0]!, id: 'second' }, { ...state.cards[0]!, id: 'third' });
    const store = createStore(state);
    await store.startSession(); await store.revealSession(); await store.updateSessionTime(6000);
    await store.saveCard({ ...store.cards()[0]!, suspended: true });
    expect(store.data()!.session).toMatchObject({ queue: ['second', 'third'], total: 2, completed: 0, revealed: false, activeMs: 0 });
    await store.revealSession();
    await store.saveDeck({ ...store.decks()[0]!, suspended: true });
    expect(store.data()!.session).toMatchObject({ queue: [], total: 0, completed: 0, revealed: false });
    await store.saveDeck({ ...store.decks()[0]!, suspended: false }); await store.startSession();
    expect(store.data()!.session?.queue).toEqual(['second', 'third']);
    expect(store.data()!.events).toEqual([]);
  });
  it('reconciles reduced limits and requires recall again when an import changes the current question', async () => {
    const state = fixture(); state.cards.push({ ...state.cards[0]!, id: 'second' });
    const store = createStore(state);
    await store.startSession(); await store.revealSession(); await store.updateSessionTime(6000);
    const bundle = bundleFor(store.data()!); bundle.cards[0]!.front = 'A changed prompt';
    await store.applyContentImport(bundle, store.data()!.version);
    expect(store.data()!.session).toMatchObject({ queue: ['card', 'second'], revealed: false, activeMs: 0 });
    await store.updatePreferences({ newCardLimit: 1 });
    expect(store.data()!.session).toMatchObject({ queue: ['card'], total: 1 });
    await store.updatePreferences({ newCardLimit: 0 });
    expect(store.data()!.session).toMatchObject({ queue: [], total: 0 });
    await store.updatePreferences({ newCardLimit: 10 }); await store.startSession();
    expect(store.data()!.session?.queue).toEqual(['card', 'second']);
    const paused = bundleFor(store.data()!); paused.cards[0]!.suspended = true;
    await store.applyContentImport(paused, store.data()!.version);
    expect(store.data()!.session?.queue).toEqual(['second']);
  });
  it('refreshes a persisted stale queue on resume and never retains an ineligible head card', async () => {
    const state = fixture(); state.cards.push({ ...state.cards[0]!, id: 'second' });
    state.cards[0]!.suspended = true;
    state.session = { id: 'old-session', queue: ['card', 'second'], total: 2, completed: 0, revealed: true, activeMs: 3000 };
    const store = createStore(state); await store.startSession();
    expect(store.data()!.session).toMatchObject({ id: 'old-session', queue: ['second'], total: 1, revealed: false, activeMs: 0 });
    await store.revealSession(); await store.review('second', 4, 'old-session');
    expect(store.data()!.events).toHaveLength(1);
  });
  it('persistently reveals cards and stores bounded cumulative session time', async () => {
    const store = createStore(fixture());
    await store.startSession('deck');
    expect(store.data()?.session).toMatchObject({ queue: ['card'], revealed: false, activeMs: 0 });
    await store.revealSession(); await store.updateSessionTime(9000); await store.updateSessionTime(5000);
    expect(store.data()?.session).toMatchObject({ revealed: true, activeMs: 9000 });
    await store.updateSessionTime(500000);
    expect(store.data()?.session?.activeMs).toBe(120000);
  });
  it('persists natural and partial completion with recall timing without duplicating reviews', async () => {
    const store = createStore(fixture());
    await store.startSession('deck');
    const sessionId = store.data()!.session!.id;
    await store.updateSessionTime(3100);
    await store.revealSession(2400);
    await store.review('card', 4, sessionId, 'timed-review', 3100);
    expect(store.data()!.events[0]).toMatchObject({ kind: 'review', activeMs: 3100, recallMs: 2400 });
    expect(store.data()!.session).toMatchObject({ queue: [], completed: 1, total: 1, partial: false });
    expect(store.data()!.session?.endedAt).toBeTruthy();
    await store.review('card', 4, sessionId, 'timed-review', 3100);
    expect(store.data()!.events).toHaveLength(1);
    await store.undo('card', sessionId);
    expect(store.data()!.session).toMatchObject({ queue: ['card'], completed: 0, revealed: false });
    expect(store.data()!.session?.endedAt).toBeUndefined();
    await store.endSession();
    expect(store.data()!.session).toMatchObject({ queue: [], completed: 0, total: 0, plannedTotal: 1, partial: true });
    expect(store.data()!.events).toHaveLength(2);
  });
});
