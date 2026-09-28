import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { applyReview, createInitialState, undoLatestReview } from '../../domain/study';
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
      const request = indexedDB.open(name, 1);
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
