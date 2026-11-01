import { signal } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LocalStudyStore } from '../data/study-store';
import { BootCoordinator } from './boot-coordinator';

function deferred(): { promise: Promise<void>; resolve: () => void; reject: (error: unknown) => void } {
  let resolve!: () => void, reject!: (error: unknown) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function storeWith(init: () => Promise<void>): LocalStudyStore {
  return { init: vi.fn(init), data: signal(null) } as unknown as LocalStudyStore;
}

describe('BootCoordinator', () => {
  afterEach(() => vi.useRealTimers());

  it('moves from web bootstrap through loading to ready without duplicate starts', async () => {
    const pending = deferred(), store = storeWith(() => pending.promise), boot = new BootCoordinator(store);
    const first = boot.start(), second = boot.start();
    expect(second).toBe(first);
    expect(boot.state()).toBe('application-loading');
    expect(store.init).toHaveBeenCalledTimes(1);
    pending.resolve();
    await first;
    expect(boot.state()).toBe('ready');
    expect(boot.diagnostics()).toMatchObject({ attempt: 1, phase: 'ready' });
  });

  it('uses calm slow-start copy without turning elapsed time into a failure', async () => {
    vi.useFakeTimers();
    const pending = deferred(), boot = new BootCoordinator(storeWith(() => pending.promise));
    const run = boot.start();
    await vi.advanceTimersByTimeAsync(4_001);
    expect(boot.state()).toBe('application-loading');
    expect(boot.loadingMessage()).toBe('Still preparing your library…');
    pending.resolve();
    await run;
    expect(boot.state()).toBe('ready');
  });

  it('exposes a recoverable failure and retries the repeatable store boundary once', async () => {
    const initialError = new Error('Injected local-data failure');
    let attempt = 0;
    const store = storeWith(async () => { if (attempt++ === 0) throw initialError; });
    const boot = new BootCoordinator(store);
    await boot.start();
    expect(boot.state()).toBe('failure');
    expect(boot.failureMessage()).toBe("HoloRecall couldn't finish starting.");
    expect(boot.diagnostics()).toMatchObject({ attempt: 1, phase: 'failed', error: initialError.message });
    await boot.retry();
    expect(boot.state()).toBe('ready');
    expect(boot.diagnostics()).toMatchObject({ attempt: 2, phase: 'ready' });
    expect(store.init).toHaveBeenCalledTimes(2);
  });
});
