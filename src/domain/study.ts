import { createEmptyCard, fsrs, generatorParameters, Rating, type Card as FsrsCard, type Grade } from 'ts-fsrs';
import { DEFAULT_REWARD_CONFIG, rewardEventsForReview, rewardReversal } from './rewards';
import type { CardContent, CardState, ConfidenceRating, Deck, ReviewEvent, State } from './models';
import { BALANCED_PRESET_ID, cloneBuiltInPresets, effectiveStudyPreset, fsrsParameters } from './study-settings';
export { dayKey } from './time';
import { dayKey } from './time';

export const SCHEDULER_VERSION = 'ts-fsrs@5.4.2';
export const CONFIG_VERSION = 'holorecall-fsrs-v1';
export const SCHEDULER_PARAMETERS = generatorParameters({
  request_retention: 0.9,
  maximum_interval: 36500,
  enable_fuzz: false,
  enable_short_term: true,
});

export const RATING_OPTIONS: ReadonlyArray<{ rating: ConfidenceRating; grade: 'Again' | 'Hard' | 'Good' | 'Easy'; label: string; help: string }> = [
  { rating: 1, grade: 'Again', label: 'Forgot', help: 'Incorrect or needed the answer.' },
  { rating: 2, grade: 'Hard', label: 'With effort', help: 'Correct, but with substantial effort.' },
  { rating: 3, grade: 'Good', label: 'Some hesitation', help: 'Correct, with some hesitation.' },
  { rating: 4, grade: 'Good', label: 'Confident', help: 'Correct and confident.' },
  { rating: 5, grade: 'Easy', label: 'Effortless', help: 'Correct immediately and effortlessly.' },
];

export function createInitialState(decks: Deck[], cards: CardContent[]): State {
  return {
    schemaVersion: 8,
    version: 0,
    userId: 'local-learner',
    decks: structuredClone(decks).map(deck=>({...deck,studyPresetId:deck.studyPresetId??BALANCED_PRESET_ID})),
    cards: structuredClone(cards),
    states: {},
    events: [],
    designs: [], assets: [], rewardEvents: [], rewardConfig: { ...DEFAULT_REWARD_CONFIG }, session: null, ankiMappings: [], ankiSources: [],
    studyPresets:cloneBuiltInPresets(),todayOverrides:[],cardControls:{},administrativeEvents:[],practiceEvents:[],focusPresets:[],
    preferences: { effects: true, haptics: true, theme: 'system', timeZone: 'Europe/London', newCardLimit: 10, reviewLimit: 100, studyMode: 'mastery' },
    scheduler: { version: SCHEDULER_VERSION, configVersion: CONFIG_VERSION, parameters: structuredClone(SCHEDULER_PARAMETERS) },
  };
}

export function mapRating(rating: ConfidenceRating): Grade {
  const grades: Record<ConfidenceRating, Grade> = { 1: Rating.Again, 2: Rating.Hard, 3: Rating.Good, 4: Rating.Good, 5: Rating.Easy };
  const grade = grades[rating];
  if (grade === undefined) throw new Error('Choose a confidence rating from 1 to 5.');
  return grade;
}

export function serializeCard(card: FsrsCard, version: number): CardState {
  const { due, last_review, ...values } = card;
  return { ...values, due: due.toISOString(), ...(last_review ? { last_review: last_review.toISOString() } : {}), version };
}

export function hydrateCard(state: CardState): FsrsCard {
  const { due, last_review, version: _version, ...values } = state;
  return { ...values, due: new Date(due), ...(last_review ? { last_review: new Date(last_review) } : {}) };
}

export function activeReviews(data: State): ReviewEvent[] {
  const reversed = new Set(data.events.flatMap(event => event.kind === 'reversal' ? [event.reviewEventId] : []));
  return data.events.filter((event): event is ReviewEvent => event.kind === 'review' && !reversed.has(event.id));
}

export function dueCards(data: State, now: Date, deckId?: string): CardContent[] {
  const today = dayKey(now, data.preferences.timeZone);
  const reviewsToday = activeReviews(data).filter(event => (event.studyDay??dayKey(new Date(event.timestamp), data.preferences.timeZone)) === today);
  const selectedPreset=effectiveStudyPreset(data,deckId,now);
  const byId=new Map(data.decks.map(deck=>[deck.id,deck]));
  const cardsById=new Map(data.cards.map(card=>[card.id,card]));
  const deckEnabled=(id:string):boolean=>{const seen=new Set<string>();let deck=byId.get(id);while(deck&&!seen.has(deck.id)){if(deck.suspended||deck.archived)return false;seen.add(deck.id);deck=deck.parentId?byId.get(deck.parentId):undefined;}return !!byId.get(id);};
  const selectedDecks=deckId?new Set<string>([deckId]):null;if(selectedDecks){let changed=true;while(changed){changed=false;for(const deck of data.decks)if(deck.parentId&&selectedDecks.has(deck.parentId)&&!selectedDecks.has(deck.id)){selectedDecks.add(deck.id);changed=true;}}}
  const deckPath=(ownerId:string):string[]=>{const path:string[]=[];const seen=new Set<string>();let current=byId.get(ownerId);while(current&&!seen.has(current.id)){seen.add(current.id);path.push(current.id);if(deckId&&current.id===deckId)return path;current=current.parentId?byId.get(current.parentId):undefined;}return deckId?[]:path;};
  const storedPath=(event:ReviewEvent):string[]=>event.studyDeckPath?.length?[...event.studyDeckPath]:event.studyDeckId?deckPath(event.studyDeckId):cardsById.get(event.cardId)?deckPath(cardsById.get(event.cardId)!.deckId):[];
  const branchReviews=reviewsToday.filter(event=>!deckId||storedPath(event).includes(deckId));
  const reviewCount=branchReviews.filter(event=>event.previousState.reps>0&&![1,3].includes(event.previousState.state)).length;
  const reviewsLeft = Math.max(0, selectedPreset.maxReviewsPerDay - reviewCount);
  const introducedToday = new Set(branchReviews.filter(event => event.previousState.reps === 0).map(event => event.cardId));
  const newLeft = Math.max(0, selectedPreset.newCardsPerDay - introducedToday.size);
  const usedReviews=new Map<string,number>(),usedNew=new Map<string,number>();
  const incrementEvent=(usage:Map<string,number>,event:ReviewEvent):void=>{for(const id of storedPath(event))usage.set(id,(usage.get(id)??0)+1);};
  for(const event of branchReviews)if(event.previousState.reps>0&&![1,3].includes(event.previousState.state))incrementEvent(usedReviews,event);
  for(const cardId of introducedToday){const event=branchReviews.find(item=>item.cardId===cardId&&item.previousState.reps===0);if(event)incrementEvent(usedNew,event);}
  const withinDeckLimit=(card:CardContent,usage:Map<string,number>,field:'maxReviewsPerDay'|'newCardsPerDay'):boolean=>{const path=deckPath(card.deckId);if(path.some(id=>(usage.get(id)??0)>=effectiveStudyPreset(data,id,now)[field]))return false;for(const id of path)usage.set(id,(usage.get(id)??0)+1);return true;};
  const bounded=(cards:CardContent[],maximum:number,accept:(card:CardContent)=>boolean):CardContent[]=>{const result:CardContent[]=[];for(const card of cards){if(result.length>=maximum)break;if(accept(card))result.push(card);}return result;};
  const available = data.cards.filter(card => {const control=data.cardControls[card.id];return !card.suspended&&!card.archived&&!control?.manualBuried&&control?.buriedOnDay!==today&&deckEnabled(card.deckId)&&(!selectedDecks||selectedDecks.has(card.deckId));});
  const due=available.filter(card=>(data.states[card.id]?.reps??0)>0&&Date.parse(data.states[card.id]!.due)<=now.getTime());
  const learning=due.filter(card=>[1,3].includes(data.states[card.id]!.state)).sort((a,b)=>Date.parse(data.states[a.id]!.due)-Date.parse(data.states[b.id]!.due));
  let reviews=due.filter(card=>![1,3].includes(data.states[card.id]!.state));
  const stable=(card:CardContent)=>{let value=2166136261;for(const char of `${today}:${card.id}`)value=Math.imul(value^char.charCodeAt(0),16777619);return value>>>0;};
  reviews=bounded([...reviews].sort((a,b)=>selectedPreset.reviewOrder==='random'?stable(a)-stable(b):selectedPreset.reviewOrder==='retrievability'?fsrs(fsrsParameters(effectiveStudyPreset(data,a.deckId,now))).get_retrievability(hydrateCard(data.states[a.id]!),now,false)-fsrs(fsrsParameters(effectiveStudyPreset(data,b.deckId,now))).get_retrievability(hydrateCard(data.states[b.id]!),now,false):Date.parse(data.states[a.id]!.due)-Date.parse(data.states[b.id]!.due)),reviewsLeft,card=>withinDeckLimit(card,usedReviews,'maxReviewsPerDay'));
  let fresh=available.filter(card=>(data.states[card.id]?.reps??0)===0);
  fresh=bounded([...fresh].sort((a,b)=>selectedPreset.newGatherOrder==='random'||selectedPreset.newSortOrder==='random'?stable(a)-stable(b):selectedPreset.newGatherOrder==='position'?(data.cardControls[a.id]?.newPosition??Number.MAX_SAFE_INTEGER)-(data.cardControls[b.id]?.newPosition??Number.MAX_SAFE_INTEGER):data.decks.findIndex(deck=>deck.id===a.deckId)-data.decks.findIndex(deck=>deck.id===b.deckId)||data.cards.indexOf(a)-data.cards.indexOf(b)),newLeft,card=>deckPath(card.deckId).every(id=>{const policy=effectiveStudyPreset(data,id,now);return policy.newCardsIgnoreReviewLimit||(usedReviews.get(id)??0)<policy.maxReviewsPerDay;})&&withinDeckLimit(card,usedNew,'newCardsPerDay'));
  if(!selectedPreset.newCardsIgnoreReviewLimit&&reviewsLeft<=reviews.length)fresh=[];
  let scheduled:CardContent[];if(selectedPreset.newReviewOrder==='before')scheduled=[...fresh,...reviews];else if(selectedPreset.newReviewOrder==='mixed'){scheduled=[];const length=Math.max(fresh.length,reviews.length);for(let index=0;index<length;index++){if(reviews[index])scheduled.push(reviews[index]!);if(fresh[index])scheduled.push(fresh[index]!);}}else scheduled=[...reviews,...fresh];
  return [...learning,...scheduled];
}

export interface ReviewInput {
  id: string;
  cardId: string;
  sessionId: string;
  rating: ConfidenceRating;
  now: Date;
  activeMs?: number;
  recallMs?: number;
}

export function applyScheduledReview(data: State, input: ReviewInput): State {
  const duplicate = data.events.find(event => event.id === input.id);
  if (duplicate) {
    if (duplicate.kind === 'review' && duplicate.cardId === input.cardId && duplicate.rating === input.rating && duplicate.sessionId === input.sessionId) return data;
    throw new Error('This review ID already belongs to a different action.');
  }
  if (!input.id || !input.sessionId || !Number.isFinite(input.now.getTime())) throw new Error('The review is missing a valid ID, session or time.');
  if (data.session?.mode === 'practice') throw new Error('Practice ratings cannot update scheduling.');
  if (!data.session || data.session.mode !== 'scheduled' || data.session.id !== input.sessionId || data.session.queue[0] !== input.cardId || !data.session.revealed) throw new Error('Reveal the current scheduled card before rating it.');
  const content = data.cards.find(card => card.id === input.cardId);
  if (!content) throw new Error('This card is no longer available in the due queue. Refresh your study session.');
  if (data.scheduler.version !== SCHEDULER_VERSION || data.scheduler.configVersion !== CONFIG_VERSION) throw new Error('This study data needs a scheduler migration before another review.');
  const previous = data.states[input.cardId] ?? serializeCard(createEmptyCard(input.now), 0);
  if (previous.last_review && input.now.getTime() < Date.parse(previous.last_review)) throw new Error('Your clock is earlier than the last review. Check the system time before continuing.');
  const grade = mapRating(input.rating);
  const preset=effectiveStudyPreset(data,content.deckId,input.now),parameters=fsrsParameters(preset);
  const deckById=new Map(data.decks.map(deck=>[deck.id,deck])),studyDeckPath:string[]=[];let studyDeck=deckById.get(content.deckId);const seenDecks=new Set<string>();while(studyDeck&&!seenDecks.has(studyDeck.id)){seenDecks.add(studyDeck.id);studyDeckPath.push(studyDeck.id);studyDeck=studyDeck.parentId?deckById.get(studyDeck.parentId):undefined;}
  const next = fsrs(parameters).next(hydrateCard(previous), input.now, grade).card;
  const resultingState = serializeCard(next, previous.version + 1);
  const event: ReviewEvent = {
    kind: 'review', id: input.id, userId: data.userId, cardId: input.cardId,
    sessionId: input.sessionId, contentRevision: content.revision, timestamp: input.now.toISOString(),
    rating: input.rating, grade, previousStateVersion: previous.version,
    previousState: structuredClone(previous), resultingState: structuredClone(resultingState),
    schedulerVersion: data.scheduler.version, configVersion: data.scheduler.configVersion,
    studyPresetId:preset.id,schedulerParameters:structuredClone(parameters),
    mode: 'scheduled', activeMs: Math.max(0, Math.min(preset.maxAnswerSeconds*1000, Math.round(input.activeMs ?? data.session?.activeMs ?? 0))),
    ...(Number.isFinite(input.recallMs ?? data.session?.recallMs) ? { recallMs: Math.max(0, Math.min(preset.maxAnswerSeconds*1000, Math.round(input.recallMs ?? data.session!.recallMs!))) } : {}),
    studyRootDeckId:data.session?.scopeDeckId??content.deckId,
    studyDeckId:content.deckId,studyDeckPath,studyDay:dayKey(input.now,data.preferences.timeZone),studyTimeZone:data.preferences.timeZone,
  };
  let remaining = data.session?.queue.slice(1) ?? [];
  const repetitionDue={...(data.session?.repetitionDue??{})};
  delete repetitionDue[input.cardId];
  let total=data.session?.total??remaining.length+1;
  if(data.session?.experienceMode==='anki'&&[1,3].includes(resultingState.state)){
    repetitionDue[input.cardId]=resultingState.due;const normal=remaining.filter(id=>!repetitionDue[id]&&id!==input.cardId),repeats=[...remaining.filter(id=>!!repetitionDue[id]&&id!==input.cardId),input.cardId].sort((a,b)=>Date.parse(repetitionDue[a]!)-Date.parse(repetitionDue[b]!));remaining=[...normal,...repeats];total++;
  }
  const cardControls={...data.cardControls};
  if(content.siblingGroupId){for(const sibling of data.cards){if(sibling.id===content.id||sibling.siblingGroupId!==content.siblingGroupId)continue;const siblingState=data.states[sibling.id],shouldBury=!siblingState?.reps?preset.buryNewSiblings:[1,3].includes(siblingState.state)?preset.buryLearningSiblings:preset.buryReviewSiblings;if(shouldBury)cardControls[sibling.id]={...cardControls[sibling.id],buriedOnDay:dayKey(input.now,data.preferences.timeZone)};}}
  const failures=activeReviews(data).filter(review=>review.cardId===content.id&&review.rating===1).length+(input.rating===1?1:0),leech=failures>=preset.leechThreshold;
  if(leech)cardControls[content.id]={...cardControls[content.id],leech:true,...(preset.leechAction==='suspend'?{leechSuspended:true}:{})};
  const cards=leech&&preset.leechAction==='suspend'?data.cards.map(card=>card.id===content.id?{...card,suspended:true}:card):data.cards;
  const session=data.session?{...data.session,queue:remaining,total,completed:data.session.completed+1,revealed:false,activeMs:0,cardStartedAt:input.now.toISOString(),lastReviewCardId:input.cardId,...(Object.keys(repetitionDue).length?{repetitionDue}:{}),...(remaining.length?{}:{endedAt:input.now.toISOString(),partial:false})}:null;
  if(session){delete session.recallMs;if(!Object.keys(repetitionDue).length)delete session.repetitionDue;}
  return {
    ...data, version: data.version + 1,cards,cardControls, states: { ...data.states, [input.cardId]: resultingState }, events: [...data.events, event],
    rewardEvents: [...data.rewardEvents, ...rewardEventsForReview(data, event, dayKey(input.now, data.preferences.timeZone))],
    session,
  };
}

/** @deprecated Use the explicit scheduled-review entry point. Retained for older domain callers. */
export const applyReview = applyScheduledReview;

function sameSchedulingState(a: CardState, b: CardState): boolean {
  const { version: _a, ...left } = a;
  const { version: _b, ...right } = b;
  return JSON.stringify(left) === JSON.stringify(right);
}

export function undoLatestReview(data: State, now: Date, id: string, expectedCardId?: string, expectedSessionId?: string): State {
  if (data.events.some(event => event.id === id)) throw new Error('This undo ID has already been used.');
  const latest = activeReviews(data).at(-1);
  if (!latest) throw new Error('There is no review to undo.');
  if ((expectedCardId !== undefined && latest.cardId !== expectedCardId) || (expectedSessionId !== undefined && latest.sessionId !== expectedSessionId)) throw new Error('The latest review belongs to another card or study session. Nothing was undone.');
  const current = data.states[latest.cardId];
  if (!current || !sameSchedulingState(current, latest.resultingState)) throw new Error('This card changed after the review. Refresh before undoing it.');
  const restored = { ...latest.previousState, version: current.version + 1 };
  const content=data.cards.find(card=>card.id===latest.cardId),preset=data.studyPresets.find(item=>item.id===latest.studyPresetId)??effectiveStudyPreset(data,content?.deckId,now),remainingFailures=activeReviews(data).filter(review=>review.id!==latest.id&&review.cardId===latest.cardId&&review.rating===1).length,clearLeech=remainingFailures<preset.leechThreshold,control=data.cardControls[latest.cardId],cardControls=clearLeech?{...data.cardControls,[latest.cardId]:{...control,leech:false,leechSuspended:false}}:data.cardControls,cards=clearLeech&&control?.leechSuspended?data.cards.map(card=>card.id===latest.cardId?{...card,suspended:false}:card):data.cards;
  return {
    ...data, version: data.version + 1,cards,cardControls,
    rewardEvents: [...data.rewardEvents, ...rewardReversal(data, latest.id, latest.cardId, now.toISOString(), id)],
    session: data.session?.id === latest.sessionId ? { ...data.session, queue: [latest.cardId, ...data.session.queue.filter(cardId => cardId !== latest.cardId)], total:Math.max(data.session.completed, data.session.total-(data.session.repetitionDue?.[latest.cardId]?1:0)),repetitionDue:Object.fromEntries(Object.entries(data.session.repetitionDue??{}).filter(([id])=>id!==latest.cardId)), completed: Math.max(0, data.session.completed - 1), revealed: false, activeMs: 0, recallMs: undefined, endedAt: undefined, partial: undefined, lastReviewCardId: undefined, cardStartedAt: now.toISOString() } : data.session,
    states: { ...data.states, [latest.cardId]: restored },
    events: [...data.events, {
      kind: 'reversal', id, userId: data.userId, cardId: latest.cardId,
      reviewEventId: latest.id, timestamp: now.toISOString(), previousStateVersion: current.version, resultingState: structuredClone(restored),
    }],
  };
}
