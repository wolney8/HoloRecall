import type { Deck, State } from './models';
import { activeReviews } from './study';

export type DashboardFeature =
  | { kind:'deck'; reason:'active-session'|'recent-review'; deck:Deck; parentPath:Deck[] }
  | { kind:'global-session'; reason:'active-session' }
  | { kind:'neutral'; reason:'no-reliable-context' };

export interface DashboardImageCandidate {
  ref:string;
  fit:'cover'|'contain';
  positionX:number;
  positionY:number;
}

const deckPath=(state:Pick<State,'decks'>,deckId:string):Deck[]|null=>{
  const byId=new Map(state.decks.map(deck=>[deck.id,deck])),path:Deck[]=[];
  const seen=new Set<string>();let current=byId.get(deckId);
  if(!current)return null;
  while(current){
    if(seen.has(current.id)||current.archived||current.suspended)return null;
    seen.add(current.id);path.push(current);
    if(!current.parentId)break;
    current=byId.get(current.parentId);
    if(!current)return null;
  }
  return path;
};

const branchIds=(state:Pick<State,'decks'>,deckId:string):Set<string>=>{
  const ids=new Set([deckId]);let changed=true;
  while(changed){changed=false;for(const deck of state.decks)if(deck.parentId&&ids.has(deck.parentId)&&!ids.has(deck.id)){ids.add(deck.id);changed=true;}}
  return ids;
};

export function resolveDashboardFeature(state:State):DashboardFeature{
  const session=state.session;
  if(session&&!session.endedAt&&session.queue.length){
    const queuedCards=session.queue.map(id=>state.cards.find(card=>card.id===id)).filter(card=>!!card&&!card.archived&&!card.suspended&&!!deckPath(state,card.deckId));
    if(session.scopeDeckId){
      const path=deckPath(state,session.scopeDeckId),branch=branchIds(state,session.scopeDeckId);
      if(path&&queuedCards.some(card=>branch.has(card!.deckId)))return{kind:'deck',reason:'active-session',deck:path[0]!,parentPath:path.slice(1).reverse()};
    }else if(queuedCards.length){
      const deckIds=new Set(queuedCards.map(card=>card!.deckId));
      if(deckIds.size===1){const path=deckPath(state,[...deckIds][0]!);if(path)return{kind:'deck',reason:'active-session',deck:path[0]!,parentPath:path.slice(1).reverse()};}
      if([...deckIds].some(id=>!!deckPath(state,id)))return{kind:'global-session',reason:'active-session'};
    }
  }

  for(const review of [...activeReviews(state)].sort((a,b)=>b.timestamp.localeCompare(a.timestamp)||b.id.localeCompare(a.id))){
    const card=state.cards.find(item=>item.id===review.cardId);
    if(!card||card.archived||card.suspended)continue;
    const deckId=review.studyDeckSnapshot?.rootDeckId??card.deckId,path=deckPath(state,deckId);
    if(path)return{kind:'deck',reason:'recent-review',deck:path[0]!,parentPath:path.slice(1).reverse()};
  }
  return{kind:'neutral',reason:'no-reliable-context'};
}

export function dashboardScopeCardCount(state:State,deckId:string):number{
  const branch=branchIds(state,deckId);
  return state.cards.filter(card=>branch.has(card.deckId)&&!card.archived&&!card.suspended&&!!deckPath(state,card.deckId)).length;
}

export function dashboardImageCandidates(state:State,feature:DashboardFeature):DashboardImageCandidate[]{
  if(feature.kind!=='deck')return[];
  const candidates:DashboardImageCandidate[]=[],seen=new Set<string>();
  const add=(ref:string|undefined,fit:'cover'|'contain'='cover',positionX=50,positionY=50)=>{if(ref&&!seen.has(ref)){seen.add(ref);candidates.push({ref,fit,positionX,positionY});}};
  const path=[feature.deck,...feature.parentPath.slice().reverse()];
  for(const deck of path)add(deck.coverImage);
  const designId=path.find(deck=>deck.designSetId)?.designSetId,design=state.designs.find(item=>item.id===designId);
  add(design?.background,design?.backgroundFit??'cover',design?.backgroundPositionX??50,design?.backgroundPositionY??50);
  return candidates;
}
