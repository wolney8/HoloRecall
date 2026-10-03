import type { State } from '../domain/models';
import { applyScheduledReview, type ReviewInput } from '../domain/study';

/** Build the explicit Scheduled-session context used by domain tests. Production callers must own a real session. */
export function acceptScheduledReview(data: State, input: ReviewInput): State {
  if (data.events.some(event => event.id === input.id)) return applyScheduledReview(data, input);
  const session = data.session?.mode === 'scheduled' && data.session.id === input.sessionId && data.session.queue[0] === input.cardId && data.session.revealed
    ? data.session
    : { id: input.sessionId, mode: 'scheduled' as const, queue: [input.cardId], total: 1, completed: 0, revealed: true, activeMs: 0, scopeDeckId: data.cards.find(card => card.id === input.cardId)?.deckId };
  return applyScheduledReview({ ...data, session }, input);
}
