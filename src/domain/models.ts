import type { Card as FsrsCard, FSRSParameters, Grade } from 'ts-fsrs';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'holo-rare' | 'ultra-rare' | 'secret-rare' | 'relic';
export type FinishPreset = 'matte' | 'gloss' | 'metallic' | 'holographic' | 'reverse-holo' | 'prismatic' | 'etched' | 'textured-foil' | 'starfield' | 'shattered-glass' | 'crystal' | 'gilded' | 'neon-ink' | 'obsidian' | 'aurora';
export type ThemePreference = 'light' | 'dark' | 'system';
export type SubjectPresentationProfile = 'general' | 'language';
export type ArtworkRole = 'instructional' | 'supportive' | 'decorative' | 'hidden';
export type StudyArtPolicy = 'auto' | 'image-first' | 'text-first';

/** Presentation-only learning hierarchy. It never owns the answer or scheduler state. */
export interface CardPresentation {
  /** Source-visible headline/category. It is learning presentation, not deck metadata. */
  title?: string;
  profile?: SubjectPresentationProfile;
  recallTask?: string;
  recallCue?: string;
  /** Material situation/register that constrains the expected answer. */
  situationContext?: string;
  /** Concise instruction for how to perform the retrieval task. */
  taskGuidance?: string;
  hint?: string;
  recallGuidance?: string[];
  artRole?: ArtworkRole;
  /** Omitted means inherit the deck/Design Set preference. */
  studyArtPolicy?: StudyArtPolicy;
}

export interface CardContent {
  id: string;
  deckId: string;
  kind: 'text' | 'visual';
  front: string;
  answer: string;
  pronunciation: string;
  meaning: string;
  notes: string;
  /** Subject-neutral line immediately below the primary answer. Legacy pronunciation remains a readable alias. */
  secondary?: string;
  /** Concise subject-neutral interpretation. Legacy meaning remains a readable alias. */
  interpretation?: string;
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
  /** Safe, HoloRecall-owned art derived from source content. Never contains source HTML. */
  art?: CardArtSource;
  /** Inert answer choices. Selecting one is practice interaction, never a scheduler rating. */
  choices?: string[];
  /** Optional source category shown separately from the primary learning answer. */
  answerLabel?: string;
  /** Structured supporting content kept out of the primary answer. */
  details?: CardDetail[];
  /** Subject-aware presentation metadata; source content remains intact. */
  presentation?: CardPresentation;
  /** Native, declarative image-occlusion learning content. Geometry is normalised to the source image. */
  imageOcclusion?: ImageOcclusionContent;
  archived?: boolean;
  createdAt?: string;
  /** Stable relationship shared by reversed/template/cloze siblings. */
  siblingGroupId?: string;
  /** Inert source identity and last-import baseline. Never contains scheduling state. */
  ankiSource?: AnkiCardSource;
}

export type ImageOcclusionMode = 'hide-all-guess-one' | 'hide-one-guess-one';
interface ImageOcclusionShapeBase { id:string;groupId:string;angle?:number;targetDescription?:string }
export type ImageOcclusionShape =
  | (ImageOcclusionShapeBase & {type:'rect';x:number;y:number;width:number;height:number})
  | (ImageOcclusionShapeBase & {type:'ellipse';cx:number;cy:number;rx:number;ry:number})
  | (ImageOcclusionShapeBase & {type:'polygon';points:Array<{x:number;y:number}>});
export interface ImageOcclusionContent {
  version:1;
  source:'anki-native'|'holorecall-native';
  mode:ImageOcclusionMode;
  activeGroupId:string;
  shapes:ImageOcclusionShape[];
  header?:string;
  backExtra?:string;
  comments?:string;
  imageDescription?:string;
  targetDescription?:string;
  sourceNoteId?:string;
  sourceMaskOrdinal?:number;
  imageWidth?:number;
  imageHeight?:number;
}

export type SafeContentBlock =
  | { type: 'heading'; text: string; level: 2 | 3 | 4 }
  | { type: 'paragraph'; text: string }
  | { type: 'pairs'; rows: Array<{ term: string; description: string }> }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'code'; text: string };
export interface CardDetail { label: string; content: string; blocks?: SafeContentBlock[] }
export type CardArtSource =
  | { kind: 'source-visual-panel'; badge?: string; title: string; subtitle?: string; lesson?: string; topic?: string; sourceKind?: string }
  | { kind: 'generated-text-art'; title: string; subtitle?: string; seed: string }
  | { kind: 'imported-media' };

export interface Deck { id: string; name: string; description: string; suspended: boolean; coverImage?: string; designSetId?: string; parentId?: string; archived?: boolean; studyPresetId?: string; studyOverrides?: DeckStudyOverrides; studyArtPolicy?: StudyArtPolicy; ankiSource?: AnkiDeckSource }
export interface AnkiCardSource {
  kind: 'anki';
  noteGuid: string;
  noteId: string;
  templateOrdinal: number;
  modelName: string;
  templateName: string;
  modelSignature: string;
  sourceSnapshotId?: string;
  sourceTemplateId?: string;
  importedContentHash: string;
  /** Raw Anki note/template input fingerprint. Independent of converted HoloRecall content. */
  sourceContentFingerprint?: string;
  /** Versioned conversion contract. Missing values identify legacy imports needing package-backed repair. */
  conversion?: {
    converterVersion: number;
    templateEngineVersion?: number;
    normalizerVersion: number;
    enrichmentVersion?: number;
    mappingVersion: number;
    mappingPolicyVersion?: number;
    mappingOrigin?: 'auto-inferred' | 'user-confirmed' | 'legacy-unclassified';
    mappingSignature: string;
    /** Hashes of the last accepted source-derived values, used for field-level local-edit protection. */
    fieldBaselines: Partial<Record<AnkiDerivedField, string>>;
    fieldOrigins?: Partial<Record<AnkiDerivedField, 'derived' | 'local' | 'ambiguous'>>;
  };
  /** Detached cards retain provenance but are excluded from future Anki updates and repairs. */
  linkState?: 'linked' | 'detached';
  /** Auditable origin of the native prompt/answer produced by the converter. */
  contentProvenance?: {
    front: 'mapping' | 'template' | 'cloze';
    answer: 'mapping' | 'template' | 'cloze';
    frontFields: string[];
    answerFields: string[];
    /** Selected template-owned conditional semantic rule, when one applies. */
    semanticVariantId?:string;
    /** Source-backed response contract used by translation audit. */
    responseMode?:'free-recall'|'choice-classification'|'pronunciation-naming'|'visual-answer';
    /** Non-executed template behavior omitted after conservative static proof. */
    templateSimplifications?:Array<'presentation-script'|'source-app-guidance'>;
    blocks?: Array<{
      side: 'front' | 'back';
      source: string;
      sourceKind?: 'field' | 'field-subrole' | 'template-static';
      sourceField?:string;
      sourceText?: string;
      classification: 'card-title' | 'situation-context' | 'primary-prompt' | 'task-guidance' | 'hint' | 'choices' | 'instructional-art' | 'primary-answer' | 'secondary-cue' | 'concise-interpretation' | 'support' | 'duplicate-frontside' | 'decorative' | 'metadata' | 'fallback';
      destination: string;
    }>;
  };
}
export interface AnkiSourceField { id: string; name: string; ordinal: number }
export interface AnkiSourceTemplate { id: string; name: string; ordinal: number; question: string; answer: string }
export interface AnkiSourceNoteType { id: string; name: string; cloze: boolean; fields: AnkiSourceField[]; templates: AnkiSourceTemplate[]; signature: string }
export interface AnkiSourceNote { id: string; guid: string; noteTypeId: string; fields: Record<string,string>; tags: string[]; modified?: number }
export interface AnkiSourceCard { id: string; noteId: string; templateId: string; templateOrdinal: number; sourceDeckId: string }
/** Compact, inert Anki source. It contains no scheduling/review state and no executable package bytes. */
export interface AnkiSourceSnapshot {
  id: string;
  version: 1 | 2;
  packageVariant: 'legacy-anki2' | 'legacy-anki21' | 'modern-anki21b';
  sourceDecks: Array<{ id: string; path: string; parentId?: string }>;
  noteTypes: AnkiSourceNoteType[];
  notes: AnkiSourceNote[];
  cards: AnkiSourceCard[];
  media: Array<{ name: string; assetId: string; width?:number; height?:number }>;
  contentHash: string;
}
export type AnkiDerivedField = 'deckId' | 'kind' | 'front' | 'answer' | 'pronunciation' | 'meaning' | 'secondary' | 'interpretation' | 'notes' | 'tags' | 'image' | 'backImage' | 'imageDescription' | 'frontAudio' | 'backAudio' | 'siblingGroupId' | 'art' | 'choices' | 'answerLabel' | 'details' | 'presentation' | 'imageOcclusion';
export interface AnkiDeckSource {
  kind: 'anki';
  sourceDeckId?: string;
  sourcePath: string;
  importedContentHash: string;
}
export type ConfidenceRating = 1 | 2 | 3 | 4 | 5;
export interface Preferences {
  effects: boolean;
  /** Native tactile feedback. Omitted in older snapshots means enabled. */
  haptics?: boolean;
  theme?: ThemePreference;
  timeZone: string;
  newCardLimit: number;
  reviewLimit: number;
  /** Default reviewer experience. Scheduling policy remains owned by the assigned Study preset. */
  studyMode?: StudyExperienceMode;
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

export interface HistoricalDeckRef { id:string;name:string }
/** Immutable review-time hierarchy. It deliberately has no foreign-key relationship to live decks. */
export interface StudyDeckSnapshot {
  deck:HistoricalDeckRef;
  /** Owning deck first, followed by its review-time ancestors. */
  path:HistoricalDeckRef[];
  /** Selected study branch at acceptance; identifies one member of path without duplicating its label. */
  rootDeckId:string;
}

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
  /** Learner-facing mode at acceptance. Practice never creates ReviewEvents. */
  experienceMode?: Exclude<StudyExperienceMode, 'free-revision'>;
  activeMs?: number;
  /** Focused, non-idle time from question display to reveal. */
  recallMs?: number;
  /** Owning deck and ancestry at acceptance time. Independent from the mutable live hierarchy. */
  studyDeckSnapshot?:StudyDeckSnapshot;
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
/** Learner-facing session behaviour, independent from the scheduled/practice safety boundary. */
export type StudyExperienceMode = 'anki' | 'mastery' | 'free-revision';
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
  schemaVersion: 10;
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
  ankiConversionProfiles: AnkiConversionProfile[];
  ankiSources: AnkiSourceSnapshot[];
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
  /** Curated physical-card composition. `layout` remains a readable legacy style hint. */
  composition?: CardCompositionId;
  layoutPolicy?: 'fixed' | 'suggest';
  palette?: DesignPalette;
  artwork?: ArtworkComposition;
  rarityVariants?: Partial<Record<Rarity, RarityDesignVariant>>;
  studyArtPolicy?: StudyArtPolicy;
  backgroundFit: 'cover' | 'contain';
  backgroundPositionX: number;
  backgroundPositionY: number;
  frameFit: 'contain' | 'cover';
  credit: string;
  source: string;
  license: string;
}

export type CardCompositionId = 'full-bleed' | 'framed-art' | 'illustration-window' | 'split-art-content' | 'typographic-showcase' | 'minimal-prestige' | 'diagram-technical' | 'photo-focus' | 'symbolic-generated';
export interface DesignPalette {
  primary: string;
  secondary: string;
  surface: string;
  onSurface: string;
  accent?: string;
}
export interface ArtworkComposition {
  focalX: number;
  focalY: number;
  fit: 'cover' | 'contain';
  treatment?: 'clean' | 'edge-fade' | 'background-bleed' | 'masked' | 'duotone' | 'embedded';
  mask?: 'none' | 'soft-oval' | 'rounded-window' | 'frame-window';
  fullBleed?: boolean;
  vignette?: number;
  tint?: string;
  safeZone?: 'centre' | 'top' | 'bottom' | 'left' | 'right';
  edgeFade?: number;
  backgroundBleed?: number;
  duotone?: number;
  textureBlend?: number;
  emboss?: number;
  depth?: number;
}
export interface RarityDesignVariant {
  frame?: string;
  finish?: FinishPreset;
  texture?: string;
  accent?: string;
  composition?: CardCompositionId;
  effectIntensity?: number;
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

/** Subject-neutral semantic destination for one Anki source field/block. Legacy
 * aliases remain readable so existing backups can be reviewed and upgraded. */
export type AnkiFieldTarget =
  | 'card-title' | 'situation-context' | 'primary-prompt' | 'task-guidance' | 'hint' | 'choices' | 'instructional-artwork'
  | 'primary-answer' | 'secondary-cue' | 'concise-example' | 'concise-interpretation'
  | 'explanation' | 'rule-pattern' | 'method' | 'worked-steps' | 'reference-table' | 'usage-examples' | 'memory-aid' | 'source-reference' | 'additional-detail' | 'safe-original-details'
  | 'media' | 'decorative' | 'duplicate-frontside' | 'hidden' | 'ignored'
  | 'ignore' | 'front' | 'answer' | 'pronunciation' | 'meaning' | 'notes' | 'front-media' | 'back-media';
export type AnkiMappingConfidence = 'high' | 'medium' | 'low' | 'confirmed';
export interface AnkiMappingPreset {
  id: string;
  version: 1 | 2 | 3 | 4;
  name: string;
  sourceSignature: string;
  modelName: string;
  /** Omitted on legacy/model-wide profiles. New profiles default to one card template. */
  templateId?: string;
  templateName?: string;
  scope?: 'template' | 'model' | 'deck';
  fields: Record<string, AnkiFieldTarget>;
  evidence?: Record<string,{ confidence: AnkiMappingConfidence; reason: string }>;
  policyVersion?: number;
  origin?: 'auto-inferred' | 'user-confirmed' | 'legacy-unclassified';
}

export type AnkiBehaviourAdapter='basic'|'reversed'|'rich-template'|'cloze'|'image-occlusion';
export type AnkiPresentationPolicy='text-first'|'image-first'|'image-occlusion-task-first'|'choices';
export type AnkiConversionStatus='automatic'|'user-approved'|'review-required'|'unsupported-source-preserved';
export type AnkiConversionConcern='equivalent-recall-answer'|'placeholder-answer'|'duplicate-prompt-art'|'unaccounted-front'|'unaccounted-back'|'inconsistent-template'|'unsupported-behaviour'|'duplicate-semantic-coverage'|'wrong-side-content'|'answer-leak'|'missing-media'|'visual-answer-text'|'primary-answer-in-details'|'duplicated-frontside'|'unsafe-title'|'unstructured-support'|'missing-provenance';
export interface AnkiSemanticVariant {
  id:string;
  label:string;
  predicate:{all:Array<{field:string;operator:'non-empty'|'equals'|'starts-with';value?:string}>};
  overrides:{primaryAnswerField:string};
  origin:'auto-inferred'|'user-confirmed';
  acceptedAt?:string;
}
export interface AnkiTranslationAudit {
  version:1;
  fingerprint:string;
  sourceCardCount:number;
  projectedCardCount:number;
  auditedCardCount:number;
  sourceElementCount:number;
  accountedElementCount:number;
  findings:AnkiConversionConcern[];
  representativeCoverage:Array<{side:'front'|'back';source:string;classification:string;destination:string;status:'accounted'|'review-required'}>;
  media:{frontExpected:boolean;answerExpected:boolean;frontProjected:boolean;answerProjected:boolean;decorative:boolean};
  semanticVariants?:Array<{id:string;matchedCardCount:number;findings:AnkiConversionConcern[]}>;
}
/** One durable behaviour/presentation decision for an exact Anki note type + card template. */
export interface AnkiConversionProfile {
  id:string;
  version:1|2|3;
  sourceSignature:string;
  modelName:string;
  templateId:string;
  templateName:string;
  mappingProfileId?:string;
  behaviour:AnkiBehaviourAdapter;
  presentationPolicy:AnkiPresentationPolicy;
  status:AnkiConversionStatus;
  concerns:AnkiConversionConcern[];
  semanticVariants?:AnkiSemanticVariant[];
  audit?:AnkiTranslationAudit;
  origin:'auto-inferred'|'user-confirmed';
  acceptedAt?:string;
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
  /** Explicit reviewer behaviour. Older sessions infer this from `mode`. */
  experienceMode?: StudyExperienceMode;
  label?: string;
  focus?: FocusSessionRequest;
  lastPracticeEventId?: string;
  /** Scheduled cards intentionally queued again by Anki-style learning/relearning steps. */
  repetitionDue?: Record<string,string>;
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
export interface PrestigeContribution {
  kind: 'prestige-contribution'; id: string; cardId: string; reviewEventId: string;
  timestamp: string; studyDay: string; timeZone: string; cycle: number; configVersion: 'prestige-days-v1';
}
export interface PrestigePromotion {
  kind: 'prestige-promotion'; id: string; cardId: string; reviewEventId: string;
  timestamp: string; level: number; required: number; contributionIds: string[];
}
export type RewardEvent = RewardContribution | RewardUnlock | PrestigeContribution | PrestigePromotion | RewardReversal;
export type CollectiblePresentationState = 'locked' | 'unlocked' | 'prestige';
export interface ContentImport {
  decks: Deck[]; cards: CardContent[]; designs: DesignSet[]; assets: LocalAsset[]; ankiSources?: AnkiSourceSnapshot[];
}
