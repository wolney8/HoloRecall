import type { ConfidenceRating, PracticeEvent, State } from './models';

export interface PracticeInput { id: string; cardId: string; sessionId: string; rating: ConfidenceRating; now: Date; activeMs?: number; recallMs?: number }
export function recordPracticeRating(data: State, input: PracticeInput): State {
  if(data.events.some(event=>event.id===input.id)||data.administrativeEvents.some(event=>event.id===input.id)||data.rewardEvents.some(event=>event.id===input.id))throw new Error('This event ID already belongs to another action.');
  const duplicate = data.practiceEvents.find(event => event.id === input.id);
  if (duplicate) {
    if (duplicate.cardId === input.cardId && duplicate.rating === input.rating && duplicate.sessionId === input.sessionId) return data;
    throw new Error('This practice ID already belongs to a different action.');
  }
  const session = data.session;
  if (!session || session.mode !== 'practice' || session.id !== input.sessionId || session.queue[0] !== input.cardId || !session.revealed) throw new Error('Reveal the current practice card before rating it.');
  if (!data.cards.some(card => card.id === input.cardId)) throw new Error('This practice card is no longer available.');
  const activeMs = Math.max(0, Math.min(120_000, Math.round(input.activeMs ?? session.activeMs)));
  const event: PracticeEvent = { kind: 'practice', id: input.id, userId: data.userId, cardId: input.cardId, sessionId: input.sessionId, timestamp: input.now.toISOString(), rating: input.rating, activeMs,
    ...(Number.isFinite(input.recallMs ?? session.recallMs) ? { recallMs: Math.max(0, Math.min(120_000, Math.round(input.recallMs ?? session.recallMs!))) } : {}) };
  const queue = session.queue.slice(1);
  return { ...data, version: data.version + 1, practiceEvents: [...data.practiceEvents, event], session: { ...session, queue, completed: session.completed + 1, revealed: false, activeMs: 0, recallMs: undefined, cardStartedAt: input.now.toISOString(), lastPracticeEventId: event.id, ...(queue.length ? {} : { endedAt: input.now.toISOString(), partial: false }) } };
}
