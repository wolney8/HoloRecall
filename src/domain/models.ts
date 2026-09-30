import type { Card as FsrsCard, FSRSParameters, Grade } from 'ts-fsrs';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'holo-rare' | 'ultra-rare' | 'secret-rare' | 'relic';
export type ThemePreference = 'light' | 'dark' | 'system';

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
  backImage?: string;
  rarity?: Rarity;
  designSetId?: string;
  imageDescription?: string;
}

export interface Deck { id: string; name: string; description: string; suspended: boolean; designSetId?: string }
export type ConfidenceRating = 1 | 2 | 3 | 4 | 5;
export interface Preferences {
  effects: boolean;
  theme?: ThemePreference;
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
  mode?: 'scheduled' | 'practice';
  activeMs?: number;
  /** Focused, non-idle time from question display to reveal. */
  recallMs?: number;
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
  schemaVersion: 2;
  version: number;
  userId: string;
  decks: Deck[];
  cards: CardContent[];
  states: Record<string, CardState>;
  events: StudyEvent[];
  designs: DesignSet[];
  assets: LocalAsset[];
  rewardEvents: RewardEvent[];
  rewardConfig: Record<Rarity, number>;
  session: StudySession | null;
  preferences: Preferences;
  scheduler: { version: string; configVersion: string; parameters: FSRSParameters };
}


export interface DesignSet {
  id: string;
  name: string;
  background?: string;
  frame?: string;
  frames?: Partial<Record<Rarity, string>>;
  backgroundFit: 'cover' | 'contain';
  backgroundPositionX: number;
  backgroundPositionY: number;
  frameFit: 'contain' | 'cover';
  credit: string;
  source: string;
  license: string;
}

export interface LocalAsset {
  id: string;
  name: string;
  mime: 'image/png' | 'image/webp' | 'image/jpeg';
  dataUrl: string;
  width: number;
  height: number;
  credit?: string;
  source?: string;
  license?: string;
}

export interface StudySession {
  id: string;
  queue: string[];
  total: number;
  completed: number;
  revealed: boolean;
  cardStartedAt?: string;
  startedAt?: string;
  endedAt?: string;
  partial?: boolean;
  plannedTotal?: number;
  recallMs?: number;
  activeMs: number;
  lastReviewCardId?: string;
}

export interface RewardContribution {
  kind: 'contribution'; id: string; cardId: string; reviewEventId: string;
  timestamp: string; studyDay: string; timeZone: string; configVersion: 'confidence-days-v1';
}
export interface RewardUnlock {
  kind: 'unlock'; id: string; cardId: string; reviewEventId: string;
  timestamp: string; rarity: Rarity; required: number; contributionIds: string[];
}
export interface RewardReversal {
  kind: 'reward-reversal'; id: string; cardId: string; reviewEventId: string;
  timestamp: string; reversedEventIds: string[];
}
export type RewardEvent = RewardContribution | RewardUnlock | RewardReversal;
export interface ContentImport {
  decks: Deck[]; cards: CardContent[]; designs: DesignSet[]; assets: LocalAsset[];
}
