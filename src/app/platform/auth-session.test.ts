import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../domain/study';
import { LocalAuthSession } from './auth-session';

describe('local auth session boundary', () => {
  it('signs out without owning or mutating learning, review, or cosmetic state', async () => {
    const learning = createInitialState([], []), before = structuredClone(learning);
    const session = new LocalAuthSession();
    expect(session.current()).toEqual({ mode: 'anonymous-local' });
    await session.signOut();
    expect(session.current()).toEqual({ mode: 'signed-out' });
    expect(learning).toEqual(before);
  });
});
