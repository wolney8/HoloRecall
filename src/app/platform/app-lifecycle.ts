import { DestroyRef, Injectable, InjectionToken, inject, signal } from '@angular/core';

export type LifecycleListener = (active: boolean) => void;

export interface NativeLifecycleConnection {
  connect(listener: (active: boolean) => void): Promise<() => Promise<void>>;
}

type CapacitorModules = {
  core: typeof import('@capacitor/core');
  app: typeof import('@capacitor/app');
};

@Injectable({ providedIn: 'root' })
export class CapacitorLifecycleConnection implements NativeLifecycleConnection {
  async connect(listener: (active: boolean) => void): Promise<() => Promise<void>> {
    return connectCapacitorLifecycle(listener);
  }
}

export async function connectCapacitorLifecycle(
  listener: (active: boolean) => void,
  loader: () => Promise<CapacitorModules> = async () => ({ core: await import('@capacitor/core'), app: await import('@capacitor/app') }),
): Promise<() => Promise<void>> {
    const { core, app } = await loader();
    if (!core.Capacitor.isNativePlatform()) return async () => undefined;
    const handles = await Promise.all([
      app.App.addListener('appStateChange', state => listener(state.isActive)),
      app.App.addListener('pause', () => listener(false)),
      app.App.addListener('resume', () => listener(true)),
    ]);
    return async () => { await Promise.all(handles.map(handle => handle.remove())); };
}

export const NATIVE_LIFECYCLE = new InjectionToken<NativeLifecycleConnection>('Native lifecycle connection', {
  providedIn: 'root',
  factory: () => inject(CapacitorLifecycleConnection),
});

/**
 * Web lifecycle source. A future Capacitor adapter can expose the same contract
 * from App.appStateChange without coupling study/session rules to a plugin.
 */
@Injectable({ providedIn: 'root' })
export class AppLifecycle {
  readonly active = signal(!document.hidden);
  // Visible pages begin focused; explicit blur/focus events are more reliable than
  // document.hasFocus() during WebKit startup and automation.
  readonly focused = signal(!document.hidden);
  private readonly listeners = new Set<LifecycleListener>();
  private nativeCleanup?: () => Promise<void>;

  constructor() {
    const native = inject(NATIVE_LIFECYCLE);
    const refresh = () => this.setState(!document.hidden, !document.hidden);
    const pageHide = () => this.setState(false, false);
    const pageShow = () => refresh();
    const focus = () => { this.focused.set(true); this.notify(); };
    const blur = () => { this.focused.set(false); this.notify(); };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('pagehide', pageHide);
    window.addEventListener('pageshow', pageShow);
    window.addEventListener('focus', focus);
    window.addEventListener('blur', blur);
    void native.connect(active => this.setState(active, active)).then(cleanup => { this.nativeCleanup = cleanup; }).catch(() => {
      // Browser lifecycle remains authoritative if a native bridge cannot start.
    });
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('pagehide', pageHide);
      window.removeEventListener('pageshow', pageShow);
      window.removeEventListener('focus', focus);
      window.removeEventListener('blur', blur);
      void this.nativeCleanup?.();
      this.listeners.clear();
    });
  }

  subscribe(listener: LifecycleListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(active: boolean, focused: boolean): void {
    const changed = this.active() !== active || this.focused() !== focused;
    this.active.set(active);
    this.focused.set(focused);
    document.documentElement.classList.toggle('app-inactive', !active);
    if (changed) this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.active());
  }
}

/** Keeps a focused editor control visible when a software keyboard shrinks the visual viewport. */
@Injectable({ providedIn: 'root' })
export class VisualViewportCoordinator {
  private frame = 0;

  constructor() {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const adjust = () => {
      cancelAnimationFrame(this.frame);
      this.frame = requestAnimationFrame(() => {
        const target = document.activeElement as HTMLElement | null;
        if (!target?.matches('input, textarea, select, [contenteditable="true"]')) return;
        // A substantial height reduction is the only reliable browser-side keyboard hint.
        if (viewport.height >= window.innerHeight * .82) return;
        const bounds = target.getBoundingClientRect();
        const top = viewport.offsetTop + 12;
        const bottom = viewport.offsetTop + viewport.height - 12;
        if (bounds.top < top || bounds.bottom > bottom) target.scrollIntoView({ block: 'center', inline: 'nearest' });
      });
    };
    viewport.addEventListener('resize', adjust);
    viewport.addEventListener('scroll', adjust);
    document.addEventListener('focusin', adjust);
    inject(DestroyRef).onDestroy(() => {
      cancelAnimationFrame(this.frame);
      viewport.removeEventListener('resize', adjust);
      viewport.removeEventListener('scroll', adjust);
      document.removeEventListener('focusin', adjust);
    });
  }
}
