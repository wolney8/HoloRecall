import type { AnkiSourceSnapshot, CardContent, Deck, State } from './models';
import { buildMediaRegistry } from './media-registry';

export type DeckDeletionScope='deck-only'|'branch';
export interface DeckDeletionImpact { decks:number;subdecks:number;cards:number;reviews:number;rewards:number }

const branchIds=(decks:Deck[],deckId:string):Set<string>=>{
  const ids=new Set([deckId]);let expanded=true;
  while(expanded){expanded=false;for(const deck of decks)if(deck.parentId&&ids.has(deck.parentId)&&!ids.has(deck.id)){ids.add(deck.id);expanded=true;}}
  return ids;
};
const removedDeckIds=(data:State,deckId:string,scope:DeckDeletionScope):Set<string>=>scope==='branch'?branchIds(data.decks,deckId):new Set([deckId]);

export function deckDeletionImpact(data:State,deckId:string,scope:DeckDeletionScope='branch'):DeckDeletionImpact{
  const deckIds=removedDeckIds(data,deckId,scope),cardIds=new Set(data.cards.filter(card=>deckIds.has(card.deckId)).map(card=>card.id));
  return{decks:deckIds.size,subdecks:Math.max(0,deckIds.size-1),cards:cardIds.size,reviews:data.events.filter(event=>event.kind==='review'&&cardIds.has(event.cardId)).length,rewards:data.rewardEvents.filter(event=>cardIds.has(event.cardId)).length};
}

const assetId=(ref?:string):string|undefined=>ref?.startsWith('asset:')?ref.slice(6):undefined;
const cardAssets=(card:CardContent):string[]=>[card.image,card.backImage,...card.frontAudio??[],...card.backAudio??[]].map(assetId).filter((id):id is string=>!!id);
const deckAssets=(deck:Deck):string[]=>[assetId(deck.coverImage)].filter((id):id is string=>!!id);
const sourceAssets=(source:AnkiSourceSnapshot):string[]=>source.media.map(item=>item.assetId);

export function deleteDeck(data:State,deckId:string,scope:DeckDeletionScope):State{
  const selected=data.decks.find(deck=>deck.id===deckId);if(!selected)return data;
  const deckIds=removedDeckIds(data,deckId,scope),cardIds=new Set(data.cards.filter(card=>deckIds.has(card.deckId)).map(card=>card.id));
  const removedCards=data.cards.filter(card=>cardIds.has(card.id)),removedDecks=data.decks.filter(deck=>deckIds.has(deck.id));
  const decks=data.decks.filter(deck=>!deckIds.has(deck.id)).map(deck=>scope==='deck-only'&&deck.parentId===deckId?{...deck,parentId:selected.parentId}:deck);
  const cards=data.cards.filter(card=>!cardIds.has(card.id));
  const referencedSources=new Set(cards.map(card=>card.ankiSource?.sourceSnapshotId).filter((id):id is string=>!!id)),candidateSources=new Set(removedCards.map(card=>card.ankiSource?.sourceSnapshotId).filter((id):id is string=>!!id));
  const removedSources=data.ankiSources.filter(source=>candidateSources.has(source.id)&&!referencedSources.has(source.id)),removedSourceIds=new Set(removedSources.map(source=>source.id)),ankiSources=data.ankiSources.filter(source=>!removedSourceIds.has(source.id));
  const candidateAssets=new Set([...removedCards.flatMap(cardAssets),...removedDecks.flatMap(deckAssets),...removedSources.flatMap(sourceAssets)]);
  const base:State={...data,version:data.version+1,decks,cards,ankiSources,
    states:Object.fromEntries(Object.entries(data.states).filter(([id])=>!cardIds.has(id))),cardControls:Object.fromEntries(Object.entries(data.cardControls).filter(([id])=>!cardIds.has(id))),
    events:data.events.filter(event=>!cardIds.has(event.cardId)),rewardEvents:data.rewardEvents.filter(event=>!cardIds.has(event.cardId)),administrativeEvents:data.administrativeEvents.filter(event=>!cardIds.has(event.cardId)),practiceEvents:data.practiceEvents.filter(event=>!cardIds.has(event.cardId)),
    todayOverrides:data.todayOverrides.filter(item=>!deckIds.has(item.deckId)),
    focusPresets:data.focusPresets.filter(preset=>!preset.criteria.deckId||!deckIds.has(preset.criteria.deckId)).map(preset=>({...preset,criteria:{...preset.criteria,explicitCardIds:preset.criteria.explicitCardIds?.filter(id=>!cardIds.has(id))}})),
    session:data.session&&(data.session.queue.some(id=>cardIds.has(id))||!!data.session.scopeDeckId&&deckIds.has(data.session.scopeDeckId))?null:data.session};
  const liveReferences=buildMediaRegistry(base).references;
  return{...base,assets:base.assets.filter(asset=>!candidateAssets.has(asset.id)||!!liveReferences.get(asset.id)?.length)};
}

/** Backward-compatible branch operation for existing callers. */
export const deleteDeckBranch=(data:State,deckId:string):State=>deleteDeck(data,deckId,'branch');
