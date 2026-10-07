import { describe, expect, it } from 'vitest';
import { decideAd, NoAdvertisingPolicy, type AdPolicy, type ProductSurface } from './ad-policy';

describe('advertising policy boundary', () => {
  it('suppresses every current placement by default', () => {
    const policy = new NoAdvertisingPolicy();
    for (const placement of ['deck-library-boundary','collection-boundary','progress-boundary'] as const)
      expect(decideAd(policy, placement)).toEqual({ kind: 'suppress' });
  });

  it('structurally suppresses interruption-sensitive surfaces even with an allowing adapter', () => {
    const fixture: AdPolicy = { source: 'verified-adapter', decide: () => ({ kind: 'contextual' }) };
    const protectedSurfaces: ProductSurface[] = ['study','practice','rating','session-complete','cosmetic-unlock','import-export','destructive-confirmation'];
    for (const surface of protectedSurfaces) expect(decideAd(fixture, surface)).toEqual({ kind: 'suppress' });
    expect(decideAd(fixture, 'deck-library-boundary')).toEqual({ kind: 'contextual' });
  });
});
