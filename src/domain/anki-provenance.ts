import type { AnkiDerivedField, CardContent } from './models';

export const ANKI_DERIVED_FIELDS:AnkiDerivedField[]=['deckId','kind','front','answer','pronunciation','meaning','secondary','interpretation','notes','tags','image','backImage','imageDescription','frontAudio','backAudio','siblingGroupId','art','choices','answerLabel','details'];

function hash(value:string):number{let result=2166136261;for(const char of value)result=Math.imul(result^char.charCodeAt(0),16777619);return result>>>0;}
function contentHash(value:unknown):string{return hash(JSON.stringify(value)??'undefined').toString(16).padStart(8,'0');}
function fieldValue(card:CardContent,field:AnkiDerivedField):unknown{return card[field];}

export function ankiFieldHash(card:CardContent,field:AnkiDerivedField):string{return contentHash(fieldValue(card,field));}
export function ankiImportedContentHash(card:CardContent):string{return contentHash({deckId:card.deckId,kind:card.kind,front:card.front,answer:card.answer,pronunciation:card.pronunciation,meaning:card.meaning,secondary:card.secondary,interpretation:card.interpretation,notes:card.notes,tags:card.tags,image:card.image,backImage:card.backImage,imageDescription:card.imageDescription,frontAudio:card.frontAudio,backAudio:card.backAudio,siblingGroupId:card.siblingGroupId,art:card.art,choices:card.choices,answerLabel:card.answerLabel,details:card.details});}
export function markAnkiLocalEdits(previous:CardContent,next:CardContent):CardContent{
  if(!previous.ankiSource?.conversion||!next.ankiSource?.conversion||previous.ankiSource.noteGuid!==next.ankiSource.noteGuid)return next;
  const result=structuredClone(next),conversion=result.ankiSource!.conversion!,origins={...previous.ankiSource.conversion.fieldOrigins};
  for(const field of ANKI_DERIVED_FIELDS){if(ankiFieldHash(previous,field)===ankiFieldHash(next,field))continue;origins[field]=conversion.fieldBaselines[field]===ankiFieldHash(next,field)?'derived':'local';}
  conversion.fieldOrigins=origins;return result;
}
