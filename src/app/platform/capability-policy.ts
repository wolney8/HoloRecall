import { InjectionToken } from '@angular/core';

export const CAPABILITY_IDS = ['anki-package-import', 'custom-design-authoring', 'learning-data-export', 'study'] as const;
export type CapabilityId = typeof CAPABILITY_IDS[number];
export interface CapabilityDecision { allowed: boolean; reason?: string }
export interface CapabilityPolicy {
  readonly source: 'development-unverified' | 'verified-adapter';
  decide(capability: CapabilityId): CapabilityDecision;
}

/** Prototype policy: preserves every existing feature and is never proof of purchase. */
export class DevelopmentCapabilityPolicy implements CapabilityPolicy {
  readonly source = 'development-unverified' as const;
  decide(_capability: CapabilityId): CapabilityDecision { return { allowed: true }; }
}

export const CAPABILITY_POLICY = new InjectionToken<CapabilityPolicy>('HoloRecall capability policy', {
  providedIn: 'root', factory: () => new DevelopmentCapabilityPolicy(),
});
