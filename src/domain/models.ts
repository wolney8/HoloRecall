import type { Card as FsrsCard, FSRSParameters, Grade } from 'ts-fsrs';

export interface CardContent {
  id: string;
  deckId: string;
  kind: 'text' | 'visual';
  front: string;
  answer: string;
  pronunciation: string;
  meaning: string;
  notes: string;
  tags: string[];
  revision: number;
  suspended: boolean;
  image?: string;
  imageDescription?: string;
}

export interface Deck { id: string; name: string; description: string; suspended: boolean }
export type ConfidenceRating = 1 | 2 | 3 | 4 | 5;
export interface Preferences {
  effects: boolean;
  timeZone: string;
  newCardLimit: number;
  reviewLimit: number;
}
export type CardState = Omit<FsrsCard, 'due' | 'last_review'> & {
  due: string;
  last_review?: string;
  version: number;
};

export interface ReviewEvent {
  kind: 'review';
  id: string;
  userId: string;
  cardId: string;
  sessionId: string;
  contentRevision: number;
  timestamp: string;
  rating: ConfidenceRating;
  grade: Grade;
  previousStateVersion: number;
  previousState: CardState;
  resultingState: CardState;
  schedulerVersion: string;
  configVersion: string;
}

export interface ReversalEvent {
  kind: 'reversal';
  id: string;
  userId: string;
  cardId: string;
  reviewEventId: string;
  timestamp: string;
  previousStateVersion: number;
  resultingState: CardState;
}
export type StudyEvent = ReviewEvent | ReversalEvent;

export interface State {
  schemaVersion: 1;
  version: number;
  userId: string;
  decks: Deck[];
  cards: CardContent[];
  states: Record<string, CardState>;
  events: StudyEvent[];
  preferences: Preferences;
  scheduler: { version: string; configVersion: string; parameters: FSRSParameters };
}
