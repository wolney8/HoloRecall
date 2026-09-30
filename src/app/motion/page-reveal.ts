import { AfterViewInit, DestroyRef, Directive, ElementRef, HostListener, Injectable, Input, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { AppLifecycle } from '../platform/app-lifecycle';
import { LocalStudyStore } from '../data/study-store';

export const PAGE_REVEAL_MOTION = {
  durationMs: 460,
  distancePx: 10,
  maxDelayMs: 250,
} as const;

type ObserverBucket = {
  observer: IntersectionObserver;
  callbacks: Map<Element, () => void>;
};

/** One observer per scrolling root, shared by page entrances and Results triggers. */
@Injectable({ providedIn: 'root' })
export class ViewportRevealService {
  readonly reducedMotion = signal(matchMedia('(prefers-reduced-motion: reduce)').matches);
  readonly enabled = computed(() => this.store.data()?.preferences.effects !== false && !this.reducedMotion());
  private readonly buckets = new Map<Element | null, ObserverBucket>();
  private readonly active = new Map<HTMLElement, Animation>();
  private readonly registered = new Set<HTMLElement>();
  private readonly preference = matchMedia('(prefers-reduced-motion: reduce)');

  constructor(private readonly store: LocalStudyStore) {
    const changed = () => this.reducedMotion.set(this.preference.matches);
    this.preference.addEventListener('change', changed);
    const lifecycle = inject(AppLifecycle);
    const unsubscribe = lifecycle.subscribe(active => { if (!active) this.settleActive(); });
    effect(() => { if (!this.enabled()) this.settleAll(); });
    inject(DestroyRef).onDestroy(() => {
      this.preference.removeEventListener('change', changed);
      unsubscribe();
      this.settleAll();
      for (const bucket of this.buckets.values()) bucket.observer.disconnect();
      this.buckets.clear();
    });
  }

  observe(element: Element, activate: () => void, root: Element | null = null): () => void {
    if (typeof IntersectionObserver !== 'function') { queueMicrotask(activate); return () => undefined; }
    let bucket = this.buckets.get(root);
    if (!bucket) {
      const callbacks = new Map<Element, () => void>();
      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          const needed = Math.min(72, Math.max(1, entry.boundingClientRect.height * .12));
          if (!entry.isIntersecting || entry.intersectionRect.height < needed) continue;
          const callback = callbacks.get(entry.target);
          if (!callback) continue;
          callbacks.delete(entry.target);
          observer.unobserve(entry.target);
          callback();
        }
        if (!callbacks.size) this.releaseBucket(root, observer);
      }, { root, rootMargin: '0px 0px -6% 0px', threshold: [0, .05, .1, .2] });
      bucket = { observer, callbacks };
      this.buckets.set(root, bucket);
    }
    bucket.callbacks.set(element, activate);
    bucket.observer.observe(element);
    return () => {
      const current = this.buckets.get(root);
      current?.callbacks.delete(element);
      current?.observer.unobserve(element);
      if (current && !current.callbacks.size) this.releaseBucket(root, current.observer);
    };
  }

  register(element: HTMLElement, delayMs: number, root: Element | null): () => void {
    this.registered.add(element);
    if (!this.enabled() || element.matches(':focus-within') || element.matches(':target') || !!element.querySelector(':target')) {
      this.settle(element);
      return () => this.unregister(element);
    }
    element.dataset['revealState'] = 'waiting';
    const unobserve = this.observe(element, () => this.enter(element, delayMs), root);
    return () => { unobserve(); this.unregister(element); };
  }

  revealNow(element: HTMLElement): void {
    if (!this.registered.has(element) || element.dataset['revealState'] === 'settled') return;
    this.unobserveEverywhere(element);
    this.settle(element);
  }

  private enter(element: HTMLElement, delayMs: number): void {
    if (!this.registered.has(element)) return;
    if (!this.enabled()) { this.settle(element); return; }
    const delay = Math.min(PAGE_REVEAL_MOTION.maxDelayMs, Math.max(0, Number(delayMs) || 0));
    element.dataset['revealState'] = 'active';
    try {
      const tokens = getComputedStyle(document.documentElement);
      const duration = Number(tokens.getPropertyValue('--hr-section-enter-ms')) || PAGE_REVEAL_MOTION.durationMs;
      const distance = tokens.getPropertyValue('--hr-section-enter-distance').trim() || `${PAGE_REVEAL_MOTION.distancePx}px`;
      const easing = tokens.getPropertyValue('--hr-section-enter-easing').trim() || 'cubic-bezier(.16,1,.3,1)';
      const animation = element.animate([
        { opacity: 0, transform: `translate3d(0, ${distance}, 0)` },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ], { duration, delay, easing, fill: 'both' });
      this.active.set(element, animation);
      void animation.finished.then(() => this.settle(element), () => this.settle(element));
    } catch { this.settle(element); }
  }

  private settle(element: HTMLElement): void {
    const animation = this.active.get(element);
    if (animation) { this.active.delete(element); animation.cancel(); }
    element.dataset['revealState'] = 'settled';
  }

  private settleActive(): void {
    for (const element of [...this.active.keys()]) this.settle(element);
  }

  private settleAll(): void {
    for (const element of this.registered) {
      this.unobserveEverywhere(element);
      this.settle(element);
    }
  }

  private unregister(element: HTMLElement): void {
    this.registered.delete(element);
    this.unobserveEverywhere(element);
    const animation = this.active.get(element);
    if (animation) { animation.cancel(); this.active.delete(element); }
  }

  private unobserveEverywhere(element: Element): void {
    for (const [root, bucket] of [...this.buckets]) {
      if (!bucket.callbacks.delete(element)) continue;
      bucket.observer.unobserve(element);
      if (!bucket.callbacks.size) this.releaseBucket(root, bucket.observer);
    }
  }

  private releaseBucket(root: Element | null, observer: IntersectionObserver): void {
    observer.disconnect();
    if (this.buckets.get(root)?.observer === observer) this.buckets.delete(root);
  }
}

@Directive({
  selector: '[hrReveal]',
  standalone: true,
  host: { class: 'hr-reveal' },
})
export class PageRevealDirective implements AfterViewInit, OnDestroy {
  @Input() hrRevealDelay = 0;
  @Input() hrRevealRoot: string | HTMLElement | null = null;
  @Input() hrRevealProgress = false;
  private readonly element = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly reveal = inject(ViewportRevealService);
  private cleanup?: () => void;

  ngAfterViewInit(): void {
    if (this.hrRevealProgress) this.element.dataset['revealProgress'] = 'true';
    const root = typeof this.hrRevealRoot === 'string'
      ? this.element.closest(this.hrRevealRoot) ?? document.querySelector(this.hrRevealRoot)
      : this.hrRevealRoot;
    try { this.cleanup = this.reveal.register(this.element, this.hrRevealDelay, root); }
    catch { this.element.dataset['revealState'] = 'settled'; }
  }

  @HostListener('focusin') focused(): void { this.reveal.revealNow(this.element); }
  ngOnDestroy(): void { this.cleanup?.(); }
}
