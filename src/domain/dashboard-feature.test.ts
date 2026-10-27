import { createEmptyCard } from 'ts-fsrs';
import { describe,expect,it } from 'vitest';
import type { Deck,ReviewEvent,State } from './models';
import { createInitialState,mapRating,serializeCard } from './study';
import { dashboardImageCandidates,dashboardScopeCardCount,resolveDashboardFeature } from './dashboard-feature';

const decks:Deck[]=[
  {id:'course',name:'Course',description:'',suspended:false,coverImage:'/art/course.svg'},
  {id:'lesson',name:'Lesson',description:'',suspended:false,parentId:'course'},
  {id:'other',name:'Other',description:'',suspended:false,coverImage:'/art/other.svg'},
];
const state=():State=>createInitialState(decks,[
  {id:'lesson-card',deckId:'lesson',kind:'text',front:'Lesson',answer:'Answer',pronunciation:'',meaning:'',notes:'',tags:[],revision:1,suspended:false,image:'/art/lesson.svg',createdAt:'2099-01-01T00:00:00.000Z'},
  {id:'other-card',deckId:'other',kind:'text',front:'Other',answer:'Answer',pronunciation:'',meaning:'',notes:'',tags:[],revision:1,suspended:false,image:'/art/other-card.svg'},
]);
const review=(data:State,id:string,cardId:string,rootDeckId:string,timestamp:string):ReviewEvent=>{
  const card=data.cards.find(item=>item.id===cardId)!,deck=data.decks.find(item=>item.id===card.deckId)!;
  const previous=serializeCard(createEmptyCard(new Date(timestamp)),0);
  return{kind:'review',id,userId:data.userId,cardId,sessionId:`session-${id}`,contentRevision:card.revision,timestamp,rating:4,grade:mapRating(4),previousStateVersion:0,previousState:previous,resultingState:{...previous,version:1},schedulerVersion:data.scheduler.version,configVersion:data.scheduler.configVersion,mode:'scheduled',studyDeckSnapshot:{deck:{id:deck.id,name:deck.name},path:[{id:deck.id,name:deck.name}],rootDeckId}};
};

describe('Dashboard featured scope',()=>{
  it('prefers a valid active child scope over newer review history',()=>{const data=state();data.events=[review(data,'recent','other-card','other','2026-10-27T12:00:00.000Z')];data.session={id:'active',queue:['lesson-card'],total:1,completed:0,revealed:false,activeMs:0,mode:'scheduled',scopeDeckId:'lesson'};expect(resolveDashboardFeature(data)).toMatchObject({kind:'deck',reason:'active-session',deck:{id:'lesson'},parentPath:[{id:'course'}]});});
  it('uses the latest valid review scope and skips stale or archived scopes',()=>{const data=state();data.events=[review(data,'valid','lesson-card','lesson','2026-10-26T12:00:00.000Z'),review(data,'stale','other-card','deleted','2026-10-27T12:00:00.000Z')];expect(resolveDashboardFeature(data)).toMatchObject({kind:'deck',reason:'recent-review',deck:{id:'lesson'}});data.decks.find(deck=>deck.id==='lesson')!.archived=true;expect(resolveDashboardFeature(data)).toEqual({kind:'neutral',reason:'no-reliable-context'});});
  it('uses a neutral global session for a valid multi-deck queue',()=>{const data=state();data.session={id:'global',queue:['lesson-card','other-card'],total:2,completed:0,revealed:false,activeMs:0,mode:'scheduled'};expect(resolveDashboardFeature(data)).toEqual({kind:'global-session',reason:'active-session'});});
  it('does not treat card creation time or array order as deck recency',()=>{const data=state();expect(resolveDashboardFeature(data)).toEqual({kind:'neutral',reason:'no-reliable-context'});});
  it('uses the neutral feature for an empty new profile',()=>expect(resolveDashboardFeature(createInitialState([],[]))).toEqual({kind:'neutral',reason:'no-reliable-context'}));
  it('rejects unavailable active scope and falls through to valid review history',()=>{const data=state();data.events=[review(data,'valid','other-card','other','2026-10-26T12:00:00.000Z')];data.session={id:'stale',queue:['lesson-card'],total:1,completed:0,revealed:false,activeMs:0,mode:'scheduled',scopeDeckId:'deleted'};expect(resolveDashboardFeature(data)).toMatchObject({kind:'deck',reason:'recent-review',deck:{id:'other'}});});
  it('excludes cards in archived descendant branches from featured scope counts',()=>{const data=state();data.decks.push({id:'archived-lesson',name:'Archived lesson',description:'',suspended:false,archived:true,parentId:'course'});data.cards.push({...data.cards[0]!,id:'archived-card',deckId:'archived-lesson'});expect(dashboardScopeCardCount(data,'course')).toBe(1);});
  it('orders own cover, inherited cover and inherited design artwork without mutation',()=>{const data=state();data.decks.find(deck=>deck.id==='lesson')!.coverImage='/art/own.svg';data.decks.find(deck=>deck.id==='course')!.designSetId='design';data.designs=[{id:'design',name:'Course design',background:'asset:design',backgroundFit:'contain',backgroundPositionX:30,backgroundPositionY:70,frameFit:'contain',credit:'',source:'',license:''}];const before=structuredClone(data),feature=resolveDashboardFeature({...data,events:[review(data,'recent','lesson-card','lesson','2026-10-27T12:00:00.000Z')]});expect(dashboardImageCandidates(data,feature)).toEqual([{ref:'/art/own.svg',fit:'cover',positionX:50,positionY:50},{ref:'/art/course.svg',fit:'cover',positionX:50,positionY:50},{ref:'asset:design',fit:'contain',positionX:30,positionY:70}]);expect(data).toEqual(before);});
});
