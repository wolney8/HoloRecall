import type { Deck } from './models';

const lessonPattern=/\blesson\s*([0-9]+)\b/i;
const trailingDate=/(?:\s*[-–—|·]\s*)?(?:\d{4}-\d{2}-\d{2}|\d{1,2}[/.]\d{1,2}[/.]\d{2,4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4})\s*$/i;
const trailingSourceVersion=/(?:\s*[-–—|·]\s*)?v\d+(?:\.\d+)*(?:\s+(?:case\s+corrected|corrected|update|updated))?\s*$/i;

export function cleanStudyDeckTopic(value:string):string{
  return value
    .replace(/[\u0000-\u001f\u007f]/g,' ')
    .replace(trailingDate,'')
    .replace(trailingSourceVersion,'')
    .replace(/^\s*\d{1,3}\s*(?:[-–—.:)]\s*|\s+)/,'')
    .replace(/\s*(?:[-–—|·]\s*)+$/,'')
    .replace(/\s+/g,' ')
    .trim();
}

function lessonSubject(value:string):string{
  const match=lessonPattern.exec(value);
  if(!match)return cleanStudyDeckTopic(value);
  const after=value.slice((match.index??0)+match[0].length).replace(/^\s*[-–—:|·]+\s*/,'');
  return cleanStudyDeckTopic(after);
}

function lineage(decks:readonly Deck[],deckId:string):Deck[]{
  const byId=new Map(decks.map(deck=>[deck.id,deck])),result:Deck[]=[],seen=new Set<string>();
  let current=byId.get(deckId);
  while(current&&!seen.has(current.id)){seen.add(current.id);result.unshift(current);current=current.parentId?byId.get(current.parentId):undefined;}
  return result;
}

/** Display-only Study context. It never rewrites the deck or imported hierarchy. */
export function conciseStudyContext(decks:readonly Deck[],currentDeckId:string,scopeDeckId?:string):string{
  const path=lineage(decks,currentDeckId),byId=new Map(decks.map(deck=>[deck.id,deck]));
  const current=byId.get(currentDeckId);
  if(!current)return'Deck';
  const lessonDeck=[...path].reverse().find(deck=>lessonPattern.test(deck.name));
  const scoped=scopeDeckId?byId.get(scopeDeckId):undefined;
  const scopeIsRelevant=!!scoped&&path.some(deck=>deck.id===scoped.id);
  const display=scopeIsRelevant&&lessonPattern.test(scoped!.name)?scoped!:current;
  const lesson=lessonDeck?.name.match(lessonPattern)?.[1];
  let topic=display.id===lessonDeck?.id?lessonSubject(display.name):cleanStudyDeckTopic(display.name);
  if(lessonDeck&&display.id!==lessonDeck.id){
    const parentTopic=lessonSubject(lessonDeck.name);
    if(parentTopic&&topic.toLocaleLowerCase().startsWith(parentTopic.toLocaleLowerCase())){
      topic=topic.slice(parentTopic.length).replace(/^\s*[-–—:|·]+\s*/,'').trim()||topic;
    }
  }
  if(lesson&&topic)return`Lesson ${lesson} · ${topic}`;
  return topic||cleanStudyDeckTopic(current.name)||'Deck';
}
