import {describe,expect,it} from 'vitest';
import {analyseAnkiSourceSnapshot,previewAnkiImport} from './anki';
import {ankiDeckId,ankiImportedDeckHash,normalizeAnkiDeckPath,normalizeAnkiSourceDecks} from './anki-deck-path';
import {migrateState} from './migrations';
import type {AnkiSourceSnapshot,CardContent,Deck,State} from './models';
import {buildLibraryIndex} from './library';
import {createInitialState,dueCards} from './study';
import {acceptScheduledReview} from '../test/scheduled-review';
import {buildReport} from './reports';
import {deckDeletionImpact,deleteDeck} from './deck-management';

const parent='Italian - Lesson 1 - Introductions - 22 September 2026';
const leaves=['01 Greetings & farewells','02 Introductions','03 Tu and Lei','04 Italian foundations & vowels','05 Sentence & pattern practice'];
const sourceIds=['1790604003849','1790604003850','1790604003851','1790604003852','1790604003853'];

function snapshot(separator='\x1f'):AnkiSourceSnapshot{
  const sourceDecks=sourceIds.map((id,index)=>({id,path:`${parent}${separator}${leaves[index]}`}));
  return{id:`old-flat-${separator==='\x1f'?'modern':'legacy'}`,version:2,packageVariant:'modern-anki21b',sourceDecks,noteTypes:[{id:'model',name:'Basic',cloze:false,signature:'anki-model-v1-hierarchy',fields:[{id:'front',name:'Front',ordinal:0},{id:'back',name:'Back',ordinal:1}],templates:[{id:'model:0',name:'Card 1',ordinal:0,question:'{{Front}}',answer:'{{FrontSide}}<hr>{{Back}}'}]}],notes:sourceIds.map((id,index)=>({id:`note-${id}`,guid:`guid-${id}`,noteTypeId:'model',fields:{Front:`Prompt ${index+1}`,Back:`Answer ${index+1}`},tags:[]})),cards:sourceIds.map((id,index)=>({id:`source-card-${id}`,noteId:`note-${id}`,templateId:'model:0',templateOrdinal:0,sourceDeckId:id})),media:[],contentHash:'anki-source-snapshot-v2-deadbeef'};
}

function flattenedState():State{
  const retained=snapshot(),decks:Deck[]=retained.sourceDecks.map(source=>{const deck:Deck={id:ankiDeckId(source),name:source.path,description:'Imported Anki deck. Scheduling and review history were not imported.',suspended:false,studyArtPolicy:'auto',ankiSource:{kind:'anki',sourceDeckId:source.id,sourcePath:source.path,importedContentHash:''}};deck.ankiSource!.importedContentHash=ankiImportedDeckHash(deck);return deck;}),analysis=analyseAnkiSourceSnapshot(retained),cards=analysis.cards.map(card=>({...card,ankiSource:{...card.ankiSource!,sourceSnapshotId:retained.id}}));
  let state=createInitialState(decks,cards);state.ankiSources=[retained];state.session={id:'session',mode:'scheduled',queue:cards.map(card=>card.id),total:cards.length,completed:0,revealed:true,activeMs:0,scopeDeckId:decks[0]!.id};state=acceptScheduledReview(state,{id:'review-one',cardId:cards[0]!.id,sessionId:'session',rating:4,now:new Date('2026-10-26T12:00:00Z')});state.practiceEvents.push({kind:'practice',id:'practice-one',userId:state.userId,cardId:cards[1]!.id,sessionId:'practice-session',timestamp:'2026-10-26T12:05:00.000Z',rating:5,activeMs:500});state.assets.push({id:'safe-media',name:'safe.mp3',mime:'audio/mpeg',dataUrl:'data:audio/mpeg;base64,SUQzBAAAAAA='});return state;
}

describe('Anki deck hierarchy normalization',()=>{
  it('uses one canonical path contract for modern U+001F and legacy :: paths',()=>{
    expect(normalizeAnkiDeckPath(`${parent}\x1f${leaves[0]}`)).toEqual(normalizeAnkiDeckPath(`${parent}::${leaves[0]}`));
    expect(()=>normalizeAnkiDeckPath(' \x1f :: ')).toThrow('no usable segments');
  });

  it.each(['\x1f','::'])('builds one stable synthetic parent and five numeric children from %s paths',separator=>{
    const retained=snapshot(separator),normalized=normalizeAnkiSourceDecks(retained.sourceDecks),analysis=analyseAnkiSourceSnapshot(retained),root=analysis.decks.find(deck=>!deck.parentId)!;
    expect(normalized).toHaveLength(6);expect(root).toMatchObject({id:ankiDeckId({id:`path:${parent}`,path:parent}),name:parent});
    const children=analysis.decks.filter(deck=>deck.parentId===root.id);expect(children.map(deck=>deck.name)).toEqual(leaves);expect(children.map(deck=>deck.id)).toEqual(sourceIds.map(id=>ankiDeckId({id,path:`${parent}::leaf`})));
    expect(analysis.cards).toHaveLength(5);expect(new Set(analysis.cards.map(card=>card.id))).toHaveLength(5);expect(analysis.cards.every((card,index)=>card.deckId===children[index]!.id)).toBe(true);
    const state=createInitialState(analysis.decks,analysis.cards);expect(state.cards.filter(card=>card.deckId===root.id)).toHaveLength(0);expect(state.cards.filter(card=>children.some(child=>child.id===card.deckId))).toHaveLength(5);expect(dueCards(state,new Date('2026-10-26T12:00:00Z'),root.id)).toHaveLength(5);expect(dueCards(state,new Date('2026-10-26T12:00:00Z'),children[0]!.id)).toHaveLength(1);
    const index=buildLibraryIndex(state),report=buildReport(state,new Date('2026-10-26T12:00:00Z')),repeat=previewAnkiImport(analyseAnkiSourceSnapshot(retained),state);expect(index.cards.every(item=>item.deckIds.includes(root.id))).toBe(true);expect(report.perDeck.find(item=>item.id===root.id)?.total).toBe(5);expect(report.perDeck.find(item=>item.id===children[0]!.id)?.total).toBe(1);expect(deckDeletionImpact(state,root.id,'branch')).toMatchObject({decks:6,subdecks:5,cards:5});const promoted=deleteDeck(state,root.id,'deck-only');expect(promoted.decks).toHaveLength(5);expect(promoted.decks.every(deck=>!deck.parentId)).toBe(true);expect(promoted.cards).toHaveLength(5);expect(analyseAnkiSourceSnapshot(retained).decks).toEqual(analysis.decks);expect(repeat.newCards).toEqual([]);expect(repeat.updatedCards).toEqual([]);expect(repeat.bundle.decks).toEqual([]);expect(repeat.bundle.cards).toEqual([]);
  });

  it('repairs the retained five-root state atomically without rewriting learner history',()=>{
    const original=flattenedState(),before={leafIds:original.decks.map(deck=>deck.id),cardIds:original.cards.map(card=>card.id),assignments:original.cards.map(card=>[card.id,card.deckId]),states:structuredClone(original.states),events:structuredClone(original.events),practice:structuredClone(original.practiceEvents),rewards:structuredClone(original.rewardEvents),assets:structuredClone(original.assets)};original.schemaVersion=10 as never;const repaired=migrateState(original),root=repaired.decks.find(deck=>deck.name===parent)!;
    expect(repaired.schemaVersion).toBe(11);expect(repaired.decks).toHaveLength(6);expect(repaired.decks.filter(deck=>!deck.parentId)).toEqual([root]);expect(repaired.decks.filter(deck=>deck.parentId===root.id).map(deck=>deck.name)).toEqual(leaves);expect(repaired.decks.filter(deck=>deck.parentId===root.id).map(deck=>deck.id)).toEqual(before.leafIds);
    expect(repaired.cards.map(card=>card.id)).toEqual(before.cardIds);expect(repaired.cards.map(card=>[card.id,card.deckId])).toEqual(before.assignments);expect(repaired.states).toEqual(before.states);expect(repaired.events).toEqual(before.events);expect(repaired.practiceEvents).toEqual(before.practice);expect(repaired.rewardEvents).toEqual(before.rewards);expect(repaired.assets).toEqual(before.assets);expect(repaired.events[0]).toEqual(before.events[0]);expect(repaired.ankiSources).toHaveLength(1);expect(repaired.ankiSources[0]!.sourceDecks).toHaveLength(6);expect(migrateState(repaired)).toEqual(repaired);
  });

  it('keeps numeric leaf identity stable when the source renames one child',()=>{const first=analyseAnkiSourceSnapshot(snapshot()),state=createInitialState(first.decks,first.cards),changed=snapshot();changed.sourceDecks[1]!.path=`${parent}\x1f02 Meeting people`;const second=analyseAnkiSourceSnapshot(changed),root=first.decks.find(deck=>!deck.parentId)!,before=first.decks.find(deck=>deck.ankiSource?.sourceDeckId===sourceIds[1])!,after=second.decks.find(deck=>deck.ankiSource?.sourceDeckId===sourceIds[1])!,preview=previewAnkiImport(second,state,true,root.id);expect(after.id).toBe(before.id);expect(after.name).toBe('02 Meeting people');expect(after.parentId).toBe(root.id);expect(preview.update.changedDecks).toContain(after.id);expect(preview.update.newDecks).toEqual([]);});

  it('does not auto-repair a source group containing a locally changed deck',()=>{
    const state=flattenedState(),edited=state.decks[2]!;edited.name='My reorganised lesson';state.schemaVersion=10 as never;const migrated=migrateState(state);
    expect(migrated.decks).toHaveLength(5);expect(migrated.decks.every(deck=>!deck.parentId)).toBe(true);expect(migrated.decks.find(deck=>deck.id===edited.id)?.name).toBe('My reorganised lesson');expect(migrated.ankiSources[0]!.sourceDecks).toHaveLength(5);const repair=previewAnkiImport(analyseAnkiSourceSnapshot(migrated.ankiSources[0]!),migrated,true,edited.id,'repair');expect(repair.update.deckConflicts).toContain(edited.id);
  });

  it('does not overwrite a locally changed deterministic synthetic ancestor',()=>{const state=flattenedState(),source={id:`path:${parent}`,path:parent},synthetic=analyseAnkiSourceSnapshot(snapshot()).decks.find(deck=>deck.id===ankiDeckId(source))!;state.decks.push({...synthetic,name:'My local course name'});state.schemaVersion=10 as never;const migrated=migrateState(state);expect(migrated.decks).toHaveLength(6);expect(migrated.decks.find(deck=>deck.id===synthetic.id)?.name).toBe('My local course name');expect(migrated.decks.filter(deck=>deck.ankiSource?.sourceDeckId).every(deck=>!deck.parentId)).toBe(true);expect(migrated.ankiSources[0]!.sourceDecks).toHaveLength(5);});
});
