import { Injectable } from '@angular/core';
import type { AnkiAnalysis, AnkiProgress } from '../../domain/anki';
import type { AnkiMappingPreset } from '../../domain/models';
import type { AnkiWorkerJob, AnkiWorkerMessage } from './anki-worker.types';

const ANALYSIS_DEADLINE_MS = 45_000;

@Injectable({ providedIn: 'root' })
export class AnkiWorkerClient {
  private worker?: Worker;
  private activeId = '';

  analyse(bytes: Uint8Array, packageName: string, mappings: AnkiMappingPreset[], progress: (value: AnkiProgress) => void, signal: AbortSignal): Promise<AnkiAnalysis> {
    this.cancel(); const id = crypto.randomUUID(); this.activeId = id;
    return new Promise<AnkiAnalysis>((resolve, reject) => {
      let worker: Worker;
      try { worker = new Worker(new URL('./anki.worker', import.meta.url), { type: 'module', name: 'holorecall-anki-import' }); }
      catch { reject(new Error('Background Anki analysis could not start. Nothing was imported; this browser may not support the required Worker.')); return; }
      this.worker = worker;
      const finish = (action: () => void) => { if (this.activeId !== id) return; clearTimeout(deadline); signal.removeEventListener('abort', abort); worker.terminate(); if (this.worker === worker) this.worker = undefined; this.activeId = ''; action(); };
      const abort = () => finish(() => reject(new DOMException('Anki import cancelled.', 'AbortError')));
      const deadline = window.setTimeout(() => finish(() => reject(new Error('Anki analysis exceeded the 45-second safety limit. Nothing was imported.'))), ANALYSIS_DEADLINE_MS);
      signal.addEventListener('abort', abort, { once: true }); if (signal.aborted) { abort(); return; }
      worker.onerror = () => finish(() => reject(new Error('Background Anki analysis failed to start or load its local runtime. Nothing was imported.')));
      worker.onmessage = ({ data }: MessageEvent<AnkiWorkerMessage>) => { if (data.id !== id || this.activeId !== id) return; if (data.kind === 'progress') progress(data.progress); else if (data.kind === 'result') finish(() => resolve(data.analysis)); else finish(() => { const error = new Error(data.message); error.name = data.name; reject(error); }); };
      const buffer = bytes.slice().buffer; const job: AnkiWorkerJob = { kind: 'analyse', id, bytes: buffer, packageName, mappings: structuredClone(mappings), wasmUrl: new URL('runtime/sql-wasm-browser.wasm', document.baseURI).href };
      worker.postMessage(job, [buffer]);
    });
  }
  cancel(): void { this.activeId = ''; this.worker?.terminate(); this.worker = undefined; }
}
