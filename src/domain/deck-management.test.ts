import { describe,expect,it } from 'vitest';
import { acceptScheduledReview } from '../test/scheduled-review';
import { exportBackup,parseBackup,validateState } from './backup';
import { deleteDeck,deckDeletionImpact } from './deck-management';
import { buildReport } from './reports';
import { createInitialState } from './study';
import type { CardContent,State } from './models';

const card=(id:string,deckId:string):CardContent=>({id,deckId,kind:'text',front:id,answer:`${id} answer`,pronunciation:'',meaning:'',notes:'',tags:[],revision:1,suspended:false});
const fixture=():State=>createInitialState([
  {id:'parent',name:'Parent',description:'',suspended:false},
  {id:'child',name:'Child',description:'',suspended:false,parentId:'parent'},
  {id:'grandchild',name:'Grandchild',description:'',suspended:false,parentId:'child'},
  {id:'other',name:'Other',description:'',suspended:false},
],[card('parent-card','parent'),card('child-card','child'),card('grandchild-card','grandchild'),card('other-card','other')]);

const reviewedChild=():State=>{
  const state=fixture();state.session={id:'session',mode:'scheduled',queue:['child-card'],total:1,completed:0,revealed:true,activeMs:10,scopeDeckId:'parent'};
  return acceptScheduledReview(state,{id:'child-review',cardId:'child-card',sessionId:'session',rating:4,now:new Date('2026-10-12T12:00:00Z')});
};

describe('permanent deck deletion',()=>{
  it('deletes only direct content, promotes children, and preserves immutable historical attribution',()=>{
    const reviewed=reviewedChild(),event=structuredClone(reviewed.events[0]),state=structuredClone(reviewed.states['child-card']),rewards=structuredClone(reviewed.rewardEvents);
    expect(event?.kind==='review'&&event.studyDeckSnapshot).toEqual({deck:{id:'child',name:'Child'},path:[{id:'child',name:'Child'},{id:'parent',name:'Parent'}],rootDeckId:'parent'});
    expect(deckDeletionImpact(reviewed,'parent','deck-only')).toMatchObject({decks:1,subdecks:0,cards:1});
    const next=deleteDeck(reviewed,'parent','deck-only');
    expect(next.decks.map(deck=>({id:deck.id,parentId:deck.parentId}))).toEqual([{id:'child',parentId:undefined},{id:'grandchild',parentId:'child'},{id:'other',parentId:undefined}]);
    expect(next.cards.map(item=>item.id)).toEqual(['child-card','grandchild-card','other-card']);
    expect(next.events[0]).toEqual(event);expect(next.states['child-card']).toEqual(state);expect(next.rewardEvents).toEqual(rewards);
    const historical=next.events[0];expect(historical?.kind==='review'&&historical.studyDeckSnapshot?.path.map(item=>item.name)).toEqual(['Child','Parent']);
    const report=buildReport(next,new Date('2026-10-13T09:00:00Z'));expect(report.historicalDecks).toEqual([{id:'parent>child',name:'Parent > Child',reviews:1,recallSuccess:1}]);expect(report.perDeck.find(deck=>deck.id==='child')?.name).toBe('Child');
    validateState(next);expect(parseBackup(exportBackup(next,new Date('2026-10-13T09:00:00Z'))).events[0]).toEqual(event);
  });

  it('removes a complete branch and leaves unrelated learner data intact',()=>{
    const reviewed=reviewedChild(),otherState=structuredClone(reviewed.states['other-card']);
    const next=deleteDeck(reviewed,'parent','branch');
    expect(next.decks.map(deck=>deck.id)).toEqual(['other']);expect(next.cards.map(item=>item.id)).toEqual(['other-card']);
    expect(next.events).toEqual([]);expect(next.states['other-card']).toEqual(otherState);validateState(next);
  });

  it('removes only the selected deck cards learner state during parent-only deletion',()=>{
    let reviewed=reviewedChild();reviewed.session={id:'parent-session',mode:'scheduled',queue:['parent-card'],total:1,completed:0,revealed:true,activeMs:10,scopeDeckId:'parent'};
    reviewed=acceptScheduledReview(reviewed,{id:'parent-review',cardId:'parent-card',sessionId:'parent-session',rating:4,now:new Date('2026-10-13T12:00:00Z')});
    const childEvent=structuredClone(reviewed.events.find(event=>event.kind==='review'&&event.cardId==='child-card')),childState=structuredClone(reviewed.states['child-card']);
    const next=deleteDeck(reviewed,'parent','deck-only');
    expect(next.states['parent-card']).toBeUndefined();expect(next.events.some(event=>event.cardId==='parent-card')).toBe(false);expect(next.rewardEvents.some(event=>event.cardId==='parent-card')).toBe(false);
    expect(next.states['child-card']).toEqual(childState);expect(next.events.find(event=>event.kind==='review'&&event.cardId==='child-card')).toEqual(childEvent);expect(next.decks.find(deck=>deck.id==='child')?.parentId).toBeUndefined();validateState(next);
  });

  it('does not rewrite review-time names or paths when the live deck is renamed or moved',()=>{
    const reviewed=reviewedChild(),snapshot=structuredClone(reviewed.events[0]);
    reviewed.decks=reviewed.decks.map(deck=>deck.id==='child'?{...deck,name:'Renamed Child',parentId:'other'}:deck);
    validateState(reviewed);expect(reviewed.events[0]).toEqual(snapshot);
    expect(reviewed.decks.find(deck=>deck.id==='child')).toMatchObject({name:'Renamed Child',parentId:'other'});
    expect(reviewed.events[0]?.kind==='review'&&reviewed.events[0].studyDeckSnapshot?.path.map(item=>item.name)).toEqual(['Child','Parent']);
  });

  it('retains shared assets and removes only deleted-content assets that became unreferenced',()=>{
    const state=fixture();state.assets=[
      {id:'owned',name:'owned.png',mime:'image/png',dataUrl:'data:image/png;base64,iVBORw0KGgo=',width:1,height:1},
      {id:'shared',name:'shared.png',mime:'image/png',dataUrl:'data:image/png;base64,iVBORw0KGgo=',width:1,height:1},
      {id:'unrelated-unused',name:'unused.png',mime:'image/png',dataUrl:'data:image/png;base64,iVBORw0KGgo=',width:1,height:1},
    ];state.cards.find(item=>item.id==='parent-card')!.image='asset:owned';state.cards.find(item=>item.id==='parent-card')!.backImage='asset:shared';state.cards.find(item=>item.id==='other-card')!.image='asset:shared';
    const next=deleteDeck(state,'parent','deck-only');expect(next.assets.map(asset=>asset.id)).toEqual(['shared','unrelated-unused']);validateState(next);
  });

  it('retains shared Anki source/mapping data until its final card is deleted',()=>{
    const state=createInitialState([{id:'one',name:'One',description:'',suspended:false},{id:'two',name:'Two',description:'',suspended:false}],[card('one-card','one'),card('two-card','two')]);
    const source={kind:'anki' as const,noteGuid:'guid',noteId:'100',templateOrdinal:0,modelName:'Basic',templateName:'Card 1',modelSignature:'anki-model-v1-deadbeef',sourceSnapshotId:'source',importedContentHash:'deadbeef'};state.cards=state.cards.map((item,index)=>({...item,ankiSource:{...source,noteGuid:`guid-${index}`} }));
    state.assets.push({id:'source-media',name:'source.png',mime:'image/png',dataUrl:'data:image/png;base64,iVBORw0KGgo=',width:1,height:1});state.ankiSources.push({id:'source',version:1,packageVariant:'legacy-anki2',sourceDecks:[{id:'1',path:'One'}],noteTypes:[],notes:[],cards:[],media:[{name:'source.png',assetId:'source-media'}],contentHash:'anki-source-snapshot-v1-deadbeef'});state.ankiMappings.push({id:'mapping',version:1,name:'Basic',sourceSignature:'anki-model-v1-deadbeef',modelName:'Basic',fields:{Front:'front',Back:'answer'}});
    const first=deleteDeck(state,'one','branch');expect(first.ankiSources.map(item=>item.id)).toEqual(['source']);expect(first.assets.map(item=>item.id)).toEqual(['source-media']);expect(first.ankiMappings.map(item=>item.id)).toEqual(['mapping']);validateState(first);
    const second=deleteDeck(first,'two','branch');expect(second.ankiSources).toEqual([]);expect(second.assets).toEqual([]);expect(second.ankiMappings.map(item=>item.id)).toEqual(['mapping']);validateState(second);
  });
});
