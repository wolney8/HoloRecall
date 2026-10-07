import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { createInitialState, undoLatestReview } from '../../domain/study';
import { acceptScheduledReview as applyReview } from '../../test/scheduled-review';
import { LocalDatabase, StaleStateError } from './local-database';

const now = new Date('2026-09-28T12:00:00Z');
const initial = () => createInitialState(
  [{ id: 'italian', name: 'Italian', description: '', suspended: false }],
  [{ id: 'one', deckId: 'italian', kind: 'text', front: 'the apple', answer: 'la mela', pronunciation: '', meaning: '', notes: '', tags: [], revision: 1, suspended: false }],
);

describe('atomic browser persistence', () => {
  it('allows retry after a transient database-open failure', async () => {
    const database = new LocalDatabase(`test-${crypto.randomUUID()}`);
    const spy = vi.spyOn(indexedDB, 'open').mockImplementationOnce(() => { throw new DOMException('Temporary storage failure', 'SecurityError'); });
    try {
      await expect(database.load(initial())).rejects.toThrow('Temporary storage failure');
      expect(await database.load(initial())).toEqual(initial());
    } finally { spy.mockRestore(); await database.close(); }
  });

  it('persists a review and its scheduling state through database close/reopen', async () => {
    const name = `test-${crypto.randomUUID()}`;
    const first = new LocalDatabase(name);
    const before = await first.load(initial());
    const reviewed = applyReview(before, { id: 'event-one', cardId: 'one', rating: 4, sessionId: 'session-one', now });
    await first.commit(reviewed, before.version);
    await first.close();
    const reopened = new LocalDatabase(name);
    const restored = await reopened.load(initial());
    expect(restored).toEqual(reviewed);
    expect(restored.events).toHaveLength(1);
    expect(restored.states['one']!.reps).toBe(1);
    const reversed = undoLatestReview(restored, now, 'undo-one');
    await reopened.commit(reversed, restored.version);
    expect((await reopened.load(initial())).events).toHaveLength(2);
    await reopened.close();
  });

  it('rejects a stale tab without overwriting the successful review', async () => {
    const name = `test-${crypto.randomUUID()}`;
    const first = new LocalDatabase(name);
    const second = new LocalDatabase(name);
    const before = await first.load(initial());
    const stale = await second.load(initial());
    const winner = applyReview(before, { id: 'event-one', cardId: 'one', rating: 3, sessionId: 'session-one', now });
    const loser = applyReview(stale, { id: 'event-two', cardId: 'one', rating: 5, sessionId: 'session-two', now });
    await first.commit(winner, before.version);
    await expect(second.commit(loser, stale.version)).rejects.toBeInstanceOf(StaleStateError);
    expect(await second.load(initial())).toEqual(winner);
    await first.close();
    await second.close();
  });

  it('does not silently reset malformed stored data', async () => {
    const name = `test-${crypto.randomUUID()}`;
    const database = new LocalDatabase(name);
    await database.load(initial());
    const raw = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = raw.transaction('local-study', 'readwrite');
      transaction.objectStore('local-study').put({ schemaVersion: 99, preciousData: 'keep' }, 'snapshot');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    await expect(database.load(initial())).rejects.toThrow('unsupported schema');
    const unchanged = await new Promise<unknown>((resolve, reject) => {
      const request = raw.transaction('local-study').objectStore('local-study').get('snapshot');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    expect(unchanged).toEqual({ schemaVersion: 99, preciousData: 'keep' });
    raw.close();
    await database.close();
  });
});

describe('v2 persistence migration and session recovery', () => {
  it('does not rewrite unchanged media payloads during a routine state commit',async()=>{const name=`test-${crypto.randomUUID()}`,database=new LocalDatabase(name),before=await database.load(initial()),prepared={...before,version:1,assets:[{id:'media',name:'media.png',mime:'image/png' as const,dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aamkAAAAASUVORK5CYII=',width:1,height:1}]};await database.commit(prepared,0);const raw=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open(name,2);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});await new Promise<void>((resolve,reject)=>{const transaction=raw.transaction('local-media','readwrite');transaction.objectStore('local-media').put('sentinel','asset:media');transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);});const next={...prepared,version:2,preferences:{...prepared.preferences,reviewLimit:99}};await database.commit(next,1);const value=await new Promise<string>((resolve,reject)=>{const request=raw.transaction('local-media').objectStore('local-media').get('asset:media');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});expect(value).toBe('sentinel');raw.close();await database.close();});
  it('migrates in the original database and saves the exact untouched v1 snapshot', async () => {
    const name = `test-${crypto.randomUUID()}`;
    const database = new LocalDatabase(name);
    const state = await database.load(initial());
    const reviewed = applyReview(state, { id: 'first', cardId: 'one', rating: 5, sessionId: 'session', now });
    const legacy = structuredClone(reviewed) as unknown as Record<string, unknown>;
    legacy['schemaVersion'] = 1;
    for (const key of ['designs', 'assets', 'rewardEvents', 'rewardConfig', 'session', 'ankiMappings']) delete legacy[key];
    const raw = await new Promise<IDBDatabase>(resolve => { const request = indexedDB.open(name, 2); request.onsuccess = () => resolve(request.result); });
    await new Promise<void>(resolve => { const transaction = raw.transaction('local-study', 'readwrite'); transaction.objectStore('local-study').put(legacy, 'snapshot'); transaction.oncomplete = () => resolve(); });
    const restored = await database.load(initial());
    expect(restored.schemaVersion).toBe(7);
    expect(restored.events).toEqual(legacy['events']);
    expect(restored.states).toEqual(legacy['states']);
    expect(restored.rewardEvents).toEqual([]);
    const backup = await new Promise<unknown>(resolve => { const request = raw.transaction('local-study').objectStore('local-study').get('migration-v1-original'); request.onsuccess = () => resolve(request.result); });
    expect(backup).toEqual(legacy);
    expect(await database.load(initial())).toEqual(restored);
    raw.close(); await database.close();
  });
  it('adds mapping storage to v2 snapshots and retains the exact pre-migration data', async () => {
    const name = `test-${crypto.randomUUID()}`, database = new LocalDatabase(name);
    const versionTwo = structuredClone(initial()) as unknown as Record<string, unknown>;
    versionTwo['schemaVersion'] = 2; delete versionTwo['ankiMappings'];
    const raw = await new Promise<IDBDatabase>(resolve => { const request = indexedDB.open(name, 1); request.onupgradeneeded = () => request.result.createObjectStore('local-study'); request.onsuccess = () => resolve(request.result); });
    await new Promise<void>(resolve => { const transaction = raw.transaction('local-study', 'readwrite'); transaction.objectStore('local-study').put(versionTwo, 'snapshot'); transaction.oncomplete = () => resolve(); });
    raw.close();
    const restored = await database.load(initial());
    expect(restored.schemaVersion).toBe(7); expect(restored.ankiMappings).toEqual([]);
    const migrated = await new Promise<IDBDatabase>(resolve => { const request = indexedDB.open(name, 2); request.onsuccess = () => resolve(request.result); });
    const backup = await new Promise<unknown>(resolve => { const request = migrated.transaction('local-study').objectStore('local-study').get('migration-v2-original'); request.onsuccess = () => resolve(request.result); });
    expect(backup).toEqual(versionTwo); migrated.close(); await database.close();
  });
  it('persists uploaded image bytes and reveal state; advances and undoes the queue atomically', async () => {
    const name = `test-${crypto.randomUUID()}`;
    const database = new LocalDatabase(name);
    const before = await database.load(initial());
    const prepared = { ...before, version: 1,
      assets: [{ id: 'my-image', name: 'frame.png', mime: 'image/png' as const, dataUrl: 'data:image/png;base64,iVBORw0KGgo=', width: 10, height: 10 }],
      session: { id: 'session', mode: 'scheduled' as const, queue: ['one'], total: 1, completed: 0, revealed: true, activeMs: 3500 },
    };
    prepared.cards[0] = { ...prepared.cards[0]!, image: 'asset:my-image' };
    await database.commit(prepared, 0); await database.close();
    const raw = await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open(name,2);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    const stored = await new Promise<{snapshot:any;media:string}>((resolve,reject)=>{const transaction=raw.transaction(['local-study','local-media']),snapshot=transaction.objectStore('local-study').get('snapshot'),media=transaction.objectStore('local-media').get('asset:my-image');transaction.oncomplete=()=>resolve({snapshot:snapshot.result,media:media.result});transaction.onerror=()=>reject(transaction.error);});
    expect(stored.snapshot.assets[0].dataUrl).toBeUndefined();expect(stored.media).toBe(prepared.assets[0]!.dataUrl);raw.close();
    const reopened = new LocalDatabase(name);
    const restored = await reopened.load(initial());
    expect(restored.assets).toEqual(prepared.assets);
    expect(restored.session?.revealed).toBe(true);
    expect(restored.session?.activeMs).toBe(3500);
    const reviewed = applyReview(restored, { id: 'review', cardId: 'one', rating: 4, sessionId: 'session', now });
    await reopened.commit(reviewed, restored.version);
    const after = await reopened.load(initial());
    expect(after.session?.queue).toEqual([]);
    expect(after.session?.completed).toBe(1);
    expect(after.events[0]).toMatchObject({ activeMs: 3500 });
    expect(applyReview(after, { id: 'review', cardId: 'one', rating: 4, sessionId: 'session', now })).toBe(after);
    const undone = undoLatestReview(after, now, 'undo', 'one', 'session');
    await reopened.commit(undone, after.version);
    expect((await reopened.load(initial())).session).toMatchObject({ queue: ['one'], completed: 0, revealed: false, activeMs: 0 });
    await reopened.close();
  });
});
