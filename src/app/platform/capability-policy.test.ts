import { describe, expect, it } from 'vitest';
import { CAPABILITY_IDS, DevelopmentCapabilityPolicy, type CapabilityId, type CapabilityPolicy } from './capability-policy';
import { createInitialState } from '../../domain/study';

describe('non-enforcing capability boundary', () => {
  it('keeps every current development capability available without claiming verified ownership', () => {
    const policy = new DevelopmentCapabilityPolicy();
    expect(policy.source).toBe('development-unverified');
    expect(CAPABILITY_IDS.every(id => policy.decide(id).allowed)).toBe(true);
  });
  it('can represent an unavailable capability without changing learning or reward state', () => {
    const state = createInitialState([{ id: 'deck', name: 'Deck', description: '', suspended: false }], []), before = structuredClone(state);
    const isolated: CapabilityPolicy = { source: 'verified-adapter', decide: (id: CapabilityId) => id === 'custom-design-authoring' ? { allowed: false, reason: 'Unavailable in this isolated policy.' } : { allowed: true } };
    expect(isolated.decide('custom-design-authoring')).toEqual({ allowed: false, reason: 'Unavailable in this isolated policy.' });
    expect(state).toEqual(before);
    expect(JSON.stringify(state)).not.toContain('verified-adapter');
  });
});
