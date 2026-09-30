import { DestroyRef, Injectable, inject, signal } from '@angular/core';

export type LifecycleListener = (active: boolean) => void;

/**
 * Web lifecycle source. A future Capacitor adapter can expose the same contract
 * from App.appStateChange without coupling study/session rules to a plugin.
 */
@Injectable({ providedIn: 'root' })
export class AppLifecycle {
  readonly active = signal(!document.hidden);
  readonly focused = signal(document.hasFocus());
  private readonly listeners = new Set<LifecycleListener>();

  constructor() {
    const refresh = () => this.setState(!document.hidden, document.hasFocus());
    const pageHide = () => this.setState(false, false);
    const pageShow = () => refresh();
    const focus = () => { this.focused.set(true); this.notify(); };
    const blur = () => { this.focused.set(false); this.notify(); };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('pagehide', pageHide);
    window.addEventListener('pageshow', pageShow);
    window.addEventListener('focus', focus);
    window.addEventListener('blur', blur);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('pagehide', pageHide);
      window.removeEventListener('pageshow', pageShow);
      window.removeEventListener('focus', focus);
      window.removeEventListener('blur', blur);
      this.listeners.clear();
    });
  }

  subscribe(listener: LifecycleListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(active: boolean, focused: boolean): void {
    this.active.set(active);
    this.focused.set(focused);
    document.documentElement.classList.toggle('app-inactive', !active);
    this.notify();
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
