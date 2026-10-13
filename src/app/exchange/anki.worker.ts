/// <reference lib="webworker" />
import { analyseAnkiPackage } from '../../domain/anki';
import type { AnkiWorkerJob, AnkiWorkerMessage } from './anki-worker.types';

addEventListener('message', ({ data }: MessageEvent<AnkiWorkerJob>) => {
  if (data.kind !== 'analyse') return;
  const send = (message: AnkiWorkerMessage) => postMessage(message);
  void analyseAnkiPackage(new Uint8Array(data.bytes), data.packageName, undefined, progress => send({ kind: 'progress', id: data.id, progress }), data.mappings, data.wasmUrl,data.conversionProfiles)
    .then(analysis => send({ kind: 'result', id: data.id, analysis }))
    .catch((error: unknown) => send({ kind: 'error', id: data.id, name: error instanceof Error ? error.name : 'Error', message: error instanceof Error ? error.message : 'Anki analysis failed safely.' }));
});
