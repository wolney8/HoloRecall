import type { AnkiSourceSnapshot, Deck, State } from './models';

export interface AnkiDeckPath {
  canonical: string;
  segments: string[];
  ancestors: string[];
  leaf: string;
}

const stable=(value:string):string=>`anki-${value.replace(/[^a-zA-Z0-9._-]/g,'-').slice(0,78)}`;
const hash=(value:string):number=>{let result=2166136261;for(const char of value)result=Math.imul(result^char.charCodeAt(0),16777619);return result>>>0;};
const contentHash=(value:unknown):string=>hash(JSON.stringify(value)??'undefined').toString(16).padStart(8,'0');

/** Anki uses U+001F internally and :: in legacy/display paths. HoloRecall stores :: canonically. */
export function normalizeAnkiDeckPath(input:string):AnkiDeckPath{
  const segments=input.split(/\x1f|::/g).map(value=>value.trim()).filter(Boolean);
  if(!segments.length)throw new Error('Anki deck path has no usable segments.');
  const ancestors=segments.map((_,index)=>segments.slice(0,index+1).join('::'));
  return{canonical:ancestors.at(-1)!,segments,ancestors,leaf:segments.at(-1)!};
}

export function ankiDeckId(source:{id:string;path:string}):string{
  return source.id.startsWith('path:')?stable(`deck-path-${source.path||source.id.slice(5)}`):stable(`deck-${source.id}`);
}

export function ankiSourceSnapshotId(sourceDecks:Array<{id:string;parentId?:string}>):string{
  return stable(`source-${sourceDecks.filter(deck=>!deck.parentId).map(deck=>deck.id).sort().join('-')||'package'}`);
}

export function normalizeAnkiSourceDecks(sourceDecks:AnkiSourceSnapshot['sourceDecks']):AnkiSourceSnapshot['sourceDecks']{
  const normalized=sourceDecks.map(source=>({...source,path:normalizeAnkiDeckPath(source.path).canonical}));
  const explicitByPath=new Map(normalized.map(source=>[source.path,source]));
  const result=new Map<string,{id:string;path:string;parentId?:string}>();
  for(const source of normalized){
    const path=normalizeAnkiDeckPath(source.path);
    if(path.segments.length===1&&source.parentId){result.set(source.id,{id:source.id,path:path.canonical,parentId:source.parentId});continue;}
    let parentId:string|undefined;
    for(const ancestor of path.ancestors){
      const explicit=explicitByPath.get(ancestor),id=explicit?.id??`path:${ancestor}`,candidate={id,path:ancestor,...(parentId?{parentId}:{})};
      const existing=result.get(id);
      if(existing&&(existing.path!==candidate.path||existing.parentId!==candidate.parentId))throw new Error('Anki deck hierarchy contains conflicting source identities.');
      result.set(id,candidate);parentId=id;
    }
    if(source.parentId&&parentId===source.id&&result.get(source.id)?.parentId!==source.parentId)throw new Error('Anki deck hierarchy path conflicts with its declared parent.');
  }
  return[...result.values()];
}

function snapshotHash(snapshot:AnkiSourceSnapshot):string{
  return`anki-source-snapshot-v${snapshot.version}-${contentHash({...snapshot,contentHash:undefined})}`;
}

export function normalizeAnkiSourceSnapshot(snapshot:AnkiSourceSnapshot):AnkiSourceSnapshot{
  const sourceDecks=normalizeAnkiSourceDecks(snapshot.sourceDecks),id=ankiSourceSnapshotId(sourceDecks);
  const normalized={...snapshot,id,sourceDecks,contentHash:''};
  normalized.contentHash=snapshotHash(normalized);return normalized;
}

function importedDeckShape(deck:Deck):unknown{return{name:deck.name,description:deck.description,parentId:deck.parentId};}
export function ankiImportedDeckHash(deck:Deck):string{return contentHash(importedDeckShape(deck));}

export function deckFromAnkiSource(source:{id:string;path:string;parentId?:string}):Deck{
  const parentId=source.parentId?ankiDeckId({id:source.parentId,path:''}):undefined,candidate:Deck={id:ankiDeckId(source),name:normalizeAnkiDeckPath(source.path).leaf,description:parentId?'Imported Anki deck group.':'Imported Anki deck. Scheduling and review history were not imported.',suspended:false,studyArtPolicy:'auto',...(parentId?{parentId}:{})};
  candidate.ankiSource={kind:'anki',...(source.id.startsWith('path:')?{}:{sourceDeckId:source.id}),sourcePath:source.path,importedContentHash:ankiImportedDeckHash(candidate)};return candidate;
}

/** Schema migration repair. A whole retained source group is repaired only when every affected leaf is unchanged from its imported baseline. */
export function repairFlattenedAnkiHierarchy(state:State):State{
  let decks=[...state.decks],cards=[...state.cards],sources=[...state.ankiSources],changed=false;
  for(const snapshot of state.ankiSources){
    const normalized=normalizeAnkiSourceSnapshot(snapshot);
    if(JSON.stringify(normalized.sourceDecks)===JSON.stringify(snapshot.sourceDecks))continue;
    const desired=normalized.sourceDecks.map(deckFromAnkiSource),affected=desired.filter(deck=>deck.ankiSource?.sourceDeckId);
    const safe=desired.every(target=>{const current=decks.find(deck=>deck.id===target.id);if(!current)return !target.ankiSource?.sourceDeckId;const hierarchySafe=target.ankiSource?.sourceDeckId?(!current.parentId||current.parentId===target.parentId):current.parentId===target.parentId;return !!current.ankiSource&&normalizeAnkiDeckPath(current.ankiSource.sourcePath).canonical===target.ankiSource!.sourcePath&&ankiImportedDeckHash(current)===current.ankiSource.importedContentHash&&hierarchySafe;});
    if(!safe)continue;
    const desiredById=new Map(desired.map(deck=>[deck.id,deck]));
    decks=decks.map(deck=>{const target=desiredById.get(deck.id);if(!target)return deck;return{...deck,name:target.name,description:target.description,parentId:target.parentId,ankiSource:target.ankiSource};});
    for(const target of desired)if(!decks.some(deck=>deck.id===target.id))decks.push(target);
    cards=cards.map(card=>card.ankiSource?.sourceSnapshotId===snapshot.id?{...card,ankiSource:{...card.ankiSource,sourceSnapshotId:normalized.id}}:card);
    sources=sources.map(source=>source.id===snapshot.id?normalized:source);changed=true;
  }
  return changed?{...state,decks,cards,ankiSources:sources}:state;
}
