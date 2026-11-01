import { Injectable, computed, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalStudyStore } from '../data/study-store';

export type BootState = 'web-bootstrapped' | 'application-loading' | 'ready' | 'failure';

export interface BootDiagnostics {
  attempt: number;
  phase: 'web-bootstrap' | 'local-data' | 'ready' | 'failed';
  elapsedMs: number;
  platform: string;
  appVersion: string;
  schemaVersion?: number;
  error?: string;
}

const SLOW_START_MS = 4_000;

/** Owns the repeatable minimum boot path. Native launch remains the pre-WebView phase. */
@Injectable({ providedIn: 'root' })
export class BootCoordinator {
  readonly state = signal<BootState>('web-bootstrapped');
  readonly slow = signal(false);
  readonly failureMessage = signal('');
  readonly loadingMessage = computed(() => this.slow() ? 'Still preparing your library…' : 'Loading HoloRecall');
  readonly diagnostics = signal<BootDiagnostics>({
    attempt: 0,
    phase: 'web-bootstrap',
    elapsedMs: 0,
    platform: Capacitor.getPlatform(),
    appVersion: 'web',
  });

  private inFlight?: Promise<void>;
  private slowTimer?: ReturnType<typeof setTimeout>;

  constructor(private readonly store: LocalStudyStore) {
    if (Capacitor.isNativePlatform()) {
      void import('@capacitor/app').then(({ App }) => App.getInfo()).then(info => this.diagnostics.update(current => ({
        ...current,
        appVersion: `${info.version} (${info.build})`,
      }))).catch(() => undefined);
    }
  }

  start(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    const attempt = this.diagnostics().attempt + 1;
    const startedAt = performance.now();
    this.state.set('application-loading');
    this.slow.set(false);
    this.failureMessage.set('');
    this.diagnostics.update(current => ({ ...current, attempt, phase: 'local-data', elapsedMs: 0, error: undefined }));
    this.slowTimer = setTimeout(() => this.slow.set(true), SLOW_START_MS);

    const run = this.store.init().then(() => {
      const elapsedMs = performance.now() - startedAt;
      this.state.set('ready');
      this.diagnostics.update(current => ({
        ...current,
        phase: 'ready',
        elapsedMs,
        schemaVersion: this.store.data()?.schemaVersion,
        error: undefined,
      }));
      performance.mark('holorecall-ready');
      console.info('[HoloRecall boot]', this.diagnostics());
    }).catch((error: unknown) => {
      const elapsedMs = performance.now() - startedAt;
      const detail = error instanceof Error ? error.message : String(error);
      this.state.set('failure');
      this.failureMessage.set("HoloRecall couldn't finish starting.");
      this.diagnostics.update(current => ({ ...current, phase: 'failed', elapsedMs, error: detail }));
      console.error('[HoloRecall boot]', this.diagnostics(), error);
    }).finally(() => {
      if (this.slowTimer) clearTimeout(this.slowTimer);
      this.slowTimer = undefined;
      this.inFlight = undefined;
    });
    this.inFlight = run;
    return run;
  }

  retry(): Promise<void> {
    return this.start();
  }
}
