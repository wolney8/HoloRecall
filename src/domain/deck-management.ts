import type { State } from './models';

export function deckDeletionImpact(data:State,deckId:string):{decks:number;cards:number;reviews:number;rewards:number}{
  const deckIds=new Set([deckId]);let expanded=true;
  while(expanded){expanded=false;for(const deck of data.decks)if(deck.parentId&&deckIds.has(deck.parentId)&&!deckIds.has(deck.id)){deckIds.add(deck.id);expanded=true;}}
  const cardIds=new Set(data.cards.filter(card=>deckIds.has(card.deckId)).map(card=>card.id));
  return{decks:deckIds.size,cards:cardIds.size,reviews:data.events.filter(event=>event.kind==='review'&&cardIds.has(event.cardId)).length,rewards:data.rewardEvents.filter(event=>cardIds.has(event.cardId)).length};
}

export function deleteDeckBranch(data:State,deckId:string):State{
  const deckIds=new Set([deckId]);let expanded=true;
  while(expanded){expanded=false;for(const deck of data.decks)if(deck.parentId&&deckIds.has(deck.parentId)&&!deckIds.has(deck.id)){deckIds.add(deck.id);expanded=true;}}
  if(!data.decks.some(deck=>deck.id===deckId))return data;
  const cardIds=new Set(data.cards.filter(card=>deckIds.has(card.deckId)).map(card=>card.id));
  return{...data,version:data.version+1,
    decks:data.decks.filter(deck=>!deckIds.has(deck.id)),cards:data.cards.filter(card=>!cardIds.has(card.id)),
    states:Object.fromEntries(Object.entries(data.states).filter(([id])=>!cardIds.has(id))),cardControls:Object.fromEntries(Object.entries(data.cardControls).filter(([id])=>!cardIds.has(id))),
    events:data.events.filter(event=>!cardIds.has(event.cardId)),rewardEvents:data.rewardEvents.filter(event=>!cardIds.has(event.cardId)),administrativeEvents:data.administrativeEvents.filter(event=>!cardIds.has(event.cardId)),practiceEvents:data.practiceEvents.filter(event=>!cardIds.has(event.cardId)),
    todayOverrides:data.todayOverrides.filter(item=>!deckIds.has(item.deckId)),
    focusPresets:data.focusPresets.filter(preset=>!preset.criteria.deckId||!deckIds.has(preset.criteria.deckId)).map(preset=>({...preset,criteria:{...preset.criteria,explicitCardIds:preset.criteria.explicitCardIds?.filter(id=>!cardIds.has(id))}})),
    session:data.session&&(data.session.queue.some(id=>cardIds.has(id))||!!data.session.scopeDeckId&&deckIds.has(data.session.scopeDeckId))?null:data.session};
}
