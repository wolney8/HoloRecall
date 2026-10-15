import type { Deck } from './models';

const lessonPattern=/\blesson\s*([0-9]+)\b/i;
const dateValue='(?:\\d{4}-\\d{2}-\\d{2}|\\d{1,2}[/.]\\d{1,2}[/.]\\d{2,4}|\\d{1,2}(?:st|nd|rd|th)?\\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\\s+\\d{4})';
const dateNoise=new RegExp(`(?:\\s*[-–—|·]\\s*)?${dateValue}(?=\\s*(?:$|::|\\x1f|\\r?\\n|\\d{1,3}\\s*(?:[-–—.:)]\\s*|\\s+)))`,'gi');
const sourceVersionNoise=/(?:\s*[-–—|·]\s*)?v\d+(?:\.\d+)*(?:\s+(?:case\s+corrected|corrected|update|updated))?(?=\s*(?:$|::|\x1f|\r?\n|\d{1,3}\s*(?:[-–—.:)]\s*|\s+)))/gi;
const hierarchySeparator=/\s*(?:::|\x1f|\r?\n+)\s*/;

function cleanSegment(value:string):string{
  return value
    .replace(dateNoise,' ')
    .replace(sourceVersionNoise,' ')
    .replace(/[\u0000-\u001f\u007f]/g,' ')
    .replace(/^\s*\d{1,3}\s*(?:[-–—.:)]\s*|\s+)/,'')
    .replace(/\s*(?:[-–—|·]\s*)+$/,'')
    .replace(/\s+/g,' ')
    .trim();
}

export function cleanStudyDeckTopic(value:string):string{
  const parts=value.split(hierarchySeparator).filter(part=>part.trim());
  return cleanSegment(parts.at(-1)??value);
}

function lessonSubject(value:string):string{
  const match=lessonPattern.exec(value);
  if(!match)return cleanStudyDeckTopic(value);
  const after=value.slice((match.index??0)+match[0].length).replace(/^\s*[-–—:|·]+\s*/,'');
  return cleanStudyDeckTopic(after);
}

function embeddedLeaf(value:string):string{
  const parts=value.split(hierarchySeparator).filter(part=>part.trim());
  if(parts.length>1)return cleanSegment(parts.at(-1)!);
  const cleaned=cleanSegment(value),lesson=lessonPattern.exec(cleaned);
  if(!lesson)return'';
  const after=cleaned.slice((lesson.index??0)+lesson[0].length);
  const orderedChild=/\s+\d{1,3}\s*(?:[-–—.:)]\s*|\s+)(?=[\p{L}])/gu;
  const matches=[...after.matchAll(orderedChild)],last=matches.at(-1);
  return last?.index===undefined?'':cleanSegment(after.slice(last.index));
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
  const combinedLeaf=display.id===lessonDeck?.id?embeddedLeaf(display.name):'';
  let topic=combinedLeaf|| (display.id===lessonDeck?.id?lessonSubject(display.name):cleanStudyDeckTopic(display.name));
  if(lessonDeck&&display.id!==lessonDeck.id){
    const parentTopic=lessonSubject(lessonDeck.name);
    if(parentTopic&&topic.toLocaleLowerCase().startsWith(parentTopic.toLocaleLowerCase())){
      topic=topic.slice(parentTopic.length).replace(/^\s*[-–—:|·]+\s*/,'').trim()||topic;
    }
  }
  if(lesson&&topic)return`Lesson ${lesson} · ${topic}`;
  return topic||cleanStudyDeckTopic(current.name)||'Deck';
}
