import { InjectionToken } from '@angular/core';

export type AdPlacement = 'deck-library-boundary' | 'collection-boundary' | 'progress-boundary';
export type ProductSurface = AdPlacement | 'study' | 'practice' | 'rating' | 'session-complete' | 'cosmetic-unlock' | 'import-export' | 'destructive-confirmation';
export type AdDecision = { kind: 'suppress' } | { kind: 'contextual' } | { kind: 'personalized' };

export interface AdPolicy {
  readonly source: 'no-advertising' | 'verified-adapter';
  decide(placement: AdPlacement): AdDecision;
}

export class NoAdvertisingPolicy implements AdPolicy {
  readonly source = 'no-advertising' as const;
  decide(_placement: AdPlacement): AdDecision { return { kind: 'suppress' }; }
}

const INTERRUPTIBLE = new Set<ProductSurface>(['study','practice','rating','session-complete','cosmetic-unlock','import-export','destructive-confirmation']);

/** Application-owned guard: even a future provider cannot place ads inside protected learning/recovery flows. */
export function decideAd(policy: AdPolicy, surface: ProductSurface): AdDecision {
  if (INTERRUPTIBLE.has(surface)) return { kind: 'suppress' };
  return policy.decide(surface as AdPlacement);
}

export const AD_POLICY = new InjectionToken<AdPolicy>('HoloRecall advertising policy', {
  providedIn: 'root', factory: () => new NoAdvertisingPolicy(),
});
