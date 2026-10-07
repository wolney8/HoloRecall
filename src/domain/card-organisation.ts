import type { CardContent, Rarity } from './models';
import { validateCard } from './backup';
import { canonicalTags } from './library';
import { markAnkiLocalEdits } from './anki-provenance';

export interface BulkCardPatch {
  deckId?: string; addTags?: string[]; removeTags?: string[]; rarity?: Rarity;
  designSetId?: string; finish?: CardContent['finish']; archived?: boolean;
}

export function organizeCards(cards:CardContent[],ids:string[],patch:BulkCardPatch,deckIds:Set<string>):CardContent[]{
  const selected=new Set(ids);if(!selected.size)throw new Error('Select at least one card.');
  if([...selected].some(id=>!cards.some(card=>card.id===id)))throw new Error('A selected card no longer exists. Refresh the library.');
  if(patch.deckId&&!deckIds.has(patch.deckId))throw new Error('Choose an existing destination deck.');
  const remove=new Set((patch.removeTags??[]).map(tag=>tag.trim().toLocaleLowerCase('en')));
  return cards.map(card=>{if(!selected.has(card.id))return card;const next={...card,...(patch.deckId?{deckId:patch.deckId}:{}),...(patch.rarity?{rarity:patch.rarity}:{}),...(patch.finish?{finish:patch.finish}:{}),...(patch.archived!==undefined?{archived:patch.archived}:{}),revision:card.revision+1};next.tags=canonicalTags([...card.tags.filter(tag=>!remove.has(tag.trim().toLocaleLowerCase('en'))),...(patch.addTags??[])]);if(patch.designSetId!==undefined){if(patch.designSetId)next.designSetId=patch.designSetId;else delete next.designSetId;}const tracked=markAnkiLocalEdits(card,next);validateCard(tracked);return tracked;});
}

export function renameCardsTag(cards:CardContent[],from:string,to:string):{cards:CardContent[];changed:number}{
  const source=from.trim().toLocaleLowerCase('en'),replacement=to.trim().replace(/\s+/g,' ');if(!source||!replacement)throw new Error('Choose an existing tag and a nonempty replacement.');let changed=0;
  const result=cards.map(card=>{if(!card.tags.some(tag=>tag.trim().toLocaleLowerCase('en')===source))return card;changed++;const next={...card,tags:canonicalTags(card.tags.map(tag=>tag.trim().toLocaleLowerCase('en')===source?replacement:tag)),revision:card.revision+1},tracked=markAnkiLocalEdits(card,next);validateCard(tracked);return tracked;});return{cards:result,changed};
}
