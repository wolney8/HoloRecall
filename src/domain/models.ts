import type { Card as FsrsCard, FSRSParameters, Grade } from 'ts-fsrs';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'holo-rare' | 'ultra-rare' | 'secret-rare' | 'relic';
export type FinishPreset = 'matte' | 'metallic' | 'holographic' | 'prismatic' | 'etched' | 'starfield' | 'crystal' | 'gilded' | 'aurora';
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
  finish?: FinishPreset;
  imageDescription?: string;
  frontAudio?: string[];
  backAudio?: string[];
  archived?: boolean;
  createdAt?: string;
  /** Stable relationship shared by reversed/template/cloze siblings. */
  siblingGroupId?: string;
}

export interface Deck { id: string; name: string; description: string; suspended: boolean; designSetId?: string; parentId?: string; archived?: boolean; studyPresetId?: string; studyOverrides?: DeckStudyOverrides }
export type ConfidenceRating = 1 | 2 | 3 | 4 | 5;
export interface Preferences {
  effects: boolean;
  /** Native tactile feedback. Omitted in older snapshots means enabled. */
  haptics?: boolean;
  theme?: ThemePreference;
  timeZone: string;
  newCardLimit: number;
  reviewLimit: number;
}
export type NewGatherOrder='deck'|'position'|'random';
export type NewSortOrder='gathered'|'random';
export type NewReviewOrder='before'|'mixed'|'after';
export type ReviewOrder='due'|'random'|'retrievability';
export type StudyStep=`${number}m`|`${number}h`;
export interface StudyPreset {
  id:string;name:string;builtIn?:boolean;
  newCardsPerDay:number;maxReviewsPerDay:number;newCardsIgnoreReviewLimit:boolean;
  desiredRetention:number;maximumInterval:number;learningSteps:StudyStep[];relearningSteps:StudyStep[];
  newGatherOrder:NewGatherOrder;newSortOrder:NewSortOrder;newReviewOrder:NewReviewOrder;reviewOrder:ReviewOrder;
  buryNewSiblings:boolean;buryReviewSiblings:boolean;buryLearningSiblings:boolean;
  leechThreshold:number;leechAction:'flag'|'suspend';
  showRemainingCounts:boolean;showNextReviewTimes:boolean;audioAutoplay:boolean;stopAudioOnAction:boolean;
  maxAnswerSeconds:number;showAnswerTimer:boolean;
  /** Optional for backward-compatible schema-6 snapshots; omitted means Off/manual. */
  autoAdvanceEnabled?:boolean;autoRevealSeconds?:number;autoAnswerSeconds?:number;
}
export interface DeckStudyOverrides { newCardsPerDay?:number;maxReviewsPerDay?:number;newCardsIgnoreReviewLimit?:boolean }
export interface TodayStudyOverride extends DeckStudyOverrides { deckId:string;studyDay:string }
export interface CardControl { manualBuried?:boolean;buriedOnDay?:string;leech?:boolean;leechSuspended?:boolean;newPosition?:number }
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
  mode?: 'scheduled';
  activeMs?: number;
  /** Focused, non-idle time from question display to reveal. */
  recallMs?: number;
  /** Selected deck branch for the session that accepted this review. */
  studyRootDeckId?: string;
  /** Owning deck and ancestry at acceptance time, retained across later moves. */
  studyDeckId?: string;
  studyDeckPath?: string[];
  studyDay?: string;
  studyTimeZone?: string;
  studyPresetId?:string;
  schedulerParameters?:FSRSParameters;
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

export type StudyMode = 'scheduled' | 'practice';
export type FocusOrder = 'deck' | 'due' | 'overdue' | 'retrievability' | 'lapses' | 'oldest-reviewed' | 'recently-added' | 'random';
export type FocusStudyState = 'new' | 'learning' | 'review' | 'due' | 'overdue' | 'attention' | 'leech' | 'suspended' | 'buried' | 'recently-reviewed';
export interface FocusCriteria {
  version: 1;
  deckId?: string;
  query?: string;
  tags?: string[];
  studyStates?: FocusStudyState[];
  explicitCardIds?: string[];
  missedWithinDays?: number;
  dueWithinDays?: number;
  overdueByDays?: number;
  recentlyAddedDays?: number;
  includeSuspended?: boolean;
}
export interface FocusPreset {
  id: string;
  version: 1;
  name: string;
  mode: StudyMode;
  criteria: FocusCriteria;
  order: FocusOrder;
  limit: number;
}
export interface FocusSessionRequest {
  mode: StudyMode;
  label: string;
  criteria: FocusCriteria;
  order: FocusOrder;
  limit: number;
  presetId?: string;
  /** Per-run ordering seed. Persisted with the session so reload never reshuffles it. */
  seed?: string;
}
export interface PracticeEvent {
  kind: 'practice';
  id: string;
  userId: string;
  cardId: string;
  sessionId: string;
  timestamp: string;
  rating: ConfidenceRating;
  activeMs: number;
  recallMs?: number;
}

export interface AdministrativeEvent {
  id:string;userId:string;cardId:string;timestamp:string;
  action:'set-due'|'reset'|'bury'|'unbury'|'suspend'|'unsuspend'|'reposition'|'undo';
  /** One user operation, including every member of a bulk change. */
  groupId?:string;
  /** Present only on immutable reversal records. */
  reversesEventId?:string;
  previousState?:CardState;resultingState?:CardState;
  previousControl?:CardControl;resultingControl?:CardControl;
  previousSuspended?:boolean;resultingSuspended?:boolean;
  detail?:string;
}

export interface State {
  schemaVersion: 6;
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
  ankiMappings: AnkiMappingPreset[];
  studyPresets:StudyPreset[];
  todayOverrides:TodayStudyOverride[];
  cardControls:Record<string,CardControl>;
  administrativeEvents:AdministrativeEvent[];
  practiceEvents: PracticeEvent[];
  focusPresets: FocusPreset[];
}


export interface DesignSet {
  id: string;
  name: string;
  background?: string;
  frame?: string;
  frames?: Partial<Record<Rarity, string>>;
  texture?: string;
  finish?: FinishPreset;
  finishes?: Partial<Record<Rarity, FinishPreset>>;
  layout?: 'clean' | 'ornate' | 'showcase';
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
  mime: 'image/png' | 'image/webp' | 'image/jpeg' | 'audio/mpeg' | 'audio/wav';
  dataUrl: string;
  width?: number;
  height?: number;
  credit?: string;
  source?: string;
  license?: string;
  contentHash?: string;
  byteLength?: number;
}

export type AnkiFieldTarget = 'ignore' | 'front' | 'answer' | 'pronunciation' | 'meaning' | 'notes' | 'front-media' | 'back-media';
export interface AnkiMappingPreset {
  id: string;
  version: 1;
  name: string;
  sourceSignature: string;
  modelName: string;
  fields: Record<string, AnkiFieldTarget>;
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
  scopeDeckId?:string;
  mode: StudyMode;
  label?: string;
  focus?: FocusSessionRequest;
  lastPracticeEventId?: string;
  /** Interruption-safe presentation state. A recovered paused timer resumes only by learner action. */
  autoAdvancePaused?: boolean;
  autoAdvanceRemainingMs?: number;
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
