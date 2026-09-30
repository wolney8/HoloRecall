import type { State } from '../../domain/models';
import { migrateState } from '../../domain/migrations';
import { validateState } from '../../domain/backup';
import type { StudyPersistence } from './study-persistence';

const STORE = 'local-study';
const KEY = 'snapshot';
export class StaleStateError extends Error {
  constructor() { super('Your study data changed in another tab. Nothing was overwritten. Refresh local data and try again.'); }
}

/** One atomic read/compare/write transaction prevents reviews being partially saved. */
export class LocalDatabase implements StudyPersistence {
  private connection?: Promise<IDBDatabase>;
  constructor(private readonly name = 'holorecall-local-v1') {}

  private open(): Promise<IDBDatabase> {
    if (!this.connection) this.connection = new Promise<IDBDatabase>((resolve, reject) => {
      if (!globalThis.indexedDB) { reject(new Error('IndexedDB is unavailable. Enable browser storage to use this local prototype.')); return; }
      const request = indexedDB.open(this.name, 1);
      let failed = false;
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onerror = () => { failed = true; reject(request.error ?? new Error('Could not open local browser storage.')); };
      request.onblocked = () => { failed = true; reject(new Error('Another tab is blocking local storage. Close other HoloRecall tabs and retry.')); };
      request.onsuccess = () => {
        if (failed) { request.result.close(); return; }
        request.result.onversionchange = () => { request.result.close(); this.connection = undefined; };
        resolve(request.result);
      };
    }).catch(error => { this.connection = undefined; throw error; });
    return this.connection;
  }

  async load(initial: State): Promise<State> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      const request = store.get(KEY);
      let result: State;
      let validationError: unknown;
      request.onsuccess = () => {
        try {
          if (request.result === undefined) { validateState(initial); result = initial; store.add(initial, KEY); }
          else {
            result = migrateState(request.result, initial.cards);
            if (request.result.schemaVersion === 1) {
              store.add(request.result, 'migration-v1-original');
              store.put(result, KEY);
            }
          }
        } catch (error) { validationError = error; transaction.abort(); }
      };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(validationError ?? transaction.error ?? new Error('Could not read local storage.'));
      transaction.onabort = () => reject(validationError ?? transaction.error ?? new Error('Local storage read was interrupted.'));
    });
  }

  async commit(next: State, expectedVersion: number): Promise<State> {
    validateState(next);
    if (next.version !== expectedVersion + 1) throw new Error('A local save must advance exactly one storage version.');
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      const request = store.get(KEY);
      let failure: unknown;
      request.onsuccess = () => {
        try {
          validateState(request.result);
          if (request.result.version !== expectedVersion) throw new StaleStateError();
          store.put(next, KEY);
        } catch (error) { failure = error; transaction.abort(); }
      };
      transaction.oncomplete = () => resolve(next);
      transaction.onerror = () => reject(failure ?? transaction.error ?? new Error('Could not save. Your review was not recorded.'));
      transaction.onabort = () => reject(failure ?? transaction.error ?? new Error('Save interrupted. Your review was not recorded.'));
    });
  }

  async close(): Promise<void> { (await this.connection)?.close(); this.connection = undefined; }
}
