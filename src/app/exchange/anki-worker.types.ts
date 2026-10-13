import type { AnkiConversionProfile, AnkiMappingPreset } from '../../domain/models';
import type { AnkiAnalysis, AnkiProgress } from '../../domain/anki';

export interface AnkiWorkerJob { kind: 'analyse'; id: string; bytes: ArrayBuffer; packageName: string; mappings: AnkiMappingPreset[]; conversionProfiles:AnkiConversionProfile[]; wasmUrl: string }
export type AnkiWorkerMessage =
  | { kind: 'progress'; id: string; progress: AnkiProgress }
  | { kind: 'result'; id: string; analysis: AnkiAnalysis }
  | { kind: 'error'; id: string; name: string; message: string };
