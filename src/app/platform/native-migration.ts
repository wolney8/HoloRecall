import type { State } from '../../domain/models';
import { exportBackup, validateState } from '../../domain/backup';

export type NativeMigrationStage = 'staged' | 'verified' | 'complete';

export interface NativeMigrationManifest {
  sourceFingerprint: string;
  sourceSchema: number;
  targetSchema: number;
  backupHash: string;
  stateVersion: number;
  counts: Record<string, number>;
  media: { id: string; hash: string; bytes: number }[];
}

export interface NativeMigrationStatus {
  sourceFingerprint: string;
  stage: NativeMigrationStage;
}

/**
 * Staging contract for a future SQLite/filesystem adapter. `stage` and `activate`
 * are separate so the legacy IndexedDB source remains untouched until a read-back
 * verification succeeds. Implementations journal every call by fingerprint.
 */
export interface NativeMigrationTarget {
  status(sourceFingerprint: string): Promise<NativeMigrationStatus | undefined>;
  retainRecoveryBackup(manifest: NativeMigrationManifest, backup: string): Promise<void>;
  stage(manifest: NativeMigrationManifest, state: State): Promise<void>;
  readStaged(sourceFingerprint: string): Promise<State>;
  markVerified(sourceFingerprint: string): Promise<void>;
  activate(sourceFingerprint: string): Promise<void>;
  discardStaging(sourceFingerprint: string): Promise<void>;
}

export interface NativeMigrationResult {
  manifest: NativeMigrationManifest;
  alreadyComplete: boolean;
}

export async function prepareNativeMigration(state: State, targetSchema: number): Promise<{ manifest: NativeMigrationManifest; backup: string }> {
  validateState(state);
  const backup = exportBackup(state, new Date(0));
  const [sourceFingerprint, backupHash] = await Promise.all([sha256(JSON.stringify(state)), sha256(backup)]);
  const media = await Promise.all(state.assets.map(async asset => ({
    id: asset.id,
    hash: asset.contentHash ?? await sha256(asset.dataUrl),
    bytes: dataUrlBytes(asset.dataUrl),
  })));
  return {
    backup,
    manifest: {
      sourceFingerprint,
      sourceSchema: state.schemaVersion,
      targetSchema,
      backupHash,
      stateVersion: state.version,
      counts: migrationCounts(state),
      media,
    },
  };
}

export async function migrateFixtureToNative(state: State, targetSchema: number, target: NativeMigrationTarget): Promise<NativeMigrationResult> {
  const prepared = await prepareNativeMigration(state, targetSchema);
  const existing = await target.status(prepared.manifest.sourceFingerprint);
  if (existing?.stage === 'complete') return { manifest: prepared.manifest, alreadyComplete: true };
  try {
    await target.retainRecoveryBackup(prepared.manifest, prepared.backup);
    await target.stage(prepared.manifest, structuredClone(state));
    const staged = await target.readStaged(prepared.manifest.sourceFingerprint);
    const verified = await prepareNativeMigration(staged, targetSchema);
    assertEquivalent(prepared.manifest, verified.manifest);
    await target.markVerified(prepared.manifest.sourceFingerprint);
    await target.activate(prepared.manifest.sourceFingerprint);
    return { manifest: prepared.manifest, alreadyComplete: false };
  } catch (error) {
    await target.discardStaging(prepared.manifest.sourceFingerprint).catch(() => undefined);
    throw error;
  }
}

function migrationCounts(state: State): Record<string, number> {
  return {
    decks: state.decks.length,
    cards: state.cards.length,
    cardStates: Object.keys(state.states).length,
    reviews: state.events.length,
    practiceEvents: state.practiceEvents.length,
    administrativeEvents: state.administrativeEvents.length,
    studyPresets: state.studyPresets.length,
    focusPresets: state.focusPresets.length,
    rewards: state.rewardEvents.length,
    designs: state.designs.length,
    assets: state.assets.length,
    ankiMappings: state.ankiMappings.length,
  };
}

function assertEquivalent(expected: NativeMigrationManifest, actual: NativeMigrationManifest): void {
  if (expected.sourceFingerprint !== actual.sourceFingerprint || expected.backupHash !== actual.backupHash ||
      JSON.stringify(expected.counts) !== JSON.stringify(actual.counts) || JSON.stringify(expected.media) !== JSON.stringify(actual.media)) {
    throw new Error('Native migration verification failed. The legacy store remains authoritative.');
  }
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function dataUrlBytes(value: string): number {
  const comma = value.indexOf(',');
  if (comma < 0) return new TextEncoder().encode(value).byteLength;
  const header = value.slice(0, comma);
  const body = value.slice(comma + 1);
  return header.endsWith(';base64') ? Math.floor(body.length * 3 / 4) - (body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0) : new TextEncoder().encode(decodeURIComponent(body)).byteLength;
}
