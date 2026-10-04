import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../domain/study';
import type { State } from '../../domain/models';
import { migrateFixtureToNative, type NativeMigrationManifest, type NativeMigrationStatus, type NativeMigrationTarget } from './native-migration';

function fixture(): State {
  const state = createInitialState(
    [{ id: 'course', name: 'Course', description: '', suspended: false }, { id: 'lesson', parentId: 'course', name: 'Lesson', description: '', suspended: false }],
    [{ id: 'card', deckId: 'lesson', kind: 'visual', front: '', answer: 'la mela', pronunciation: '', meaning: 'apple', notes: '', tags: ['food'], image: 'asset:image', backImage: 'asset:image', imageDescription: 'A red fruit on a table', revision: 1, suspended: false }],
  );
  state.assets.push({ id: 'image', name: 'apple.png', mime: 'image/png', dataUrl: 'data:image/png;base64,iVBORw0KGgo=', contentHash: `sha256:${'0'.repeat(64)}`, byteLength: 8, width: 1, height: 1 });
  state.focusPresets.push({ id: 'weak', version: 1, name: 'Weak cards', mode: 'practice', criteria: { version: 1, deckId: 'course', tags: [], studyStates: ['attention'] }, order: 'deck', limit: 20 });
  return state;
}

class FixtureTarget implements NativeMigrationTarget {
  statusValue?: NativeMigrationStatus;
  staged?: State;
  active?: State;
  backup = '';
  failAt = '';
  async status(): Promise<NativeMigrationStatus | undefined> { return this.statusValue; }
  async retainRecoveryBackup(manifest: NativeMigrationManifest, backup: string): Promise<void> { this.backup = backup; if (this.failAt === 'backup') throw new Error('interrupted'); }
  async stage(manifest: NativeMigrationManifest, state: State): Promise<void> { this.staged = state; this.statusValue = { sourceFingerprint: manifest.sourceFingerprint, stage: 'staged' }; if (this.failAt === 'stage') throw new Error('interrupted'); }
  async readStaged(): Promise<State> { if (!this.staged) throw new Error('missing staged state'); if (this.failAt === 'verify') this.staged = { ...this.staged, cards: [] }; return structuredClone(this.staged); }
  async markVerified(sourceFingerprint: string): Promise<void> { this.statusValue = { sourceFingerprint, stage: 'verified' }; if (this.failAt === 'mark') throw new Error('interrupted'); }
  async activate(sourceFingerprint: string): Promise<void> { if (!this.staged) throw new Error('missing staged state'); if (this.failAt === 'activate') throw new Error('interrupted'); this.active = this.staged; this.statusValue = { sourceFingerprint, stage: 'complete' }; }
  async discardStaging(): Promise<void> { this.staged = undefined; if (this.statusValue?.stage !== 'complete') this.statusValue = undefined; }
}

describe('native migration staging contract', () => {
  it('retains a recovery backup, verifies all state and media, then activates once', async () => {
    const target = new FixtureTarget(), state = fixture();
    const first = await migrateFixtureToNative(state, 1, target);
    expect(first.alreadyComplete).toBe(false);
    expect(JSON.parse(target.backup).format).toBe('holorecall-backup');
    expect(target.active).toEqual(state);
    expect(first.manifest.counts).toMatchObject({ decks: 2, cards: 1, focusPresets: 1, assets: 1 });
    expect(first.manifest.media).toEqual([{ id: 'image', hash: `sha256:${'0'.repeat(64)}`, bytes: 8 }]);
    const again = await migrateFixtureToNative(state, 1, target);
    expect(again.alreadyComplete).toBe(true);
  });

  it.each(['backup', 'stage', 'verify', 'mark', 'activate'])('leaves the legacy source untouched and no active partial data after %s interruption', async failAt => {
    const target = new FixtureTarget(), state = fixture(), original = structuredClone(state);
    target.failAt = failAt;
    await expect(migrateFixtureToNative(state, 1, target)).rejects.toThrow();
    expect(state).toEqual(original);
    expect(target.active).toBeUndefined();
    expect(target.staged).toBeUndefined();
    target.failAt = '';
    await expect(migrateFixtureToNative(state, 1, target)).resolves.toMatchObject({ alreadyComplete: false });
  });
});
