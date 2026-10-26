import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { LocalStudyStore } from './study-store';
import { createInitialState } from '../../domain/study';
import { acceptScheduledReview as applyReview } from '../../test/scheduled-review';
import type { ContentImport, State } from '../../domain/models';
import { exportBackup, parseBackup } from '../../domain/backup';
import { administrativeUndoStatus } from '../../domain/administrative';
import { deckDeletionImpact } from '../../domain/deck-management';
import { ANKI_DERIVED_FIELDS, ankiFieldHash, ankiImportedContentHash } from '../../domain/anki-provenance';
import { previewJsonAuthoring } from '../../domain/json-authoring';
import { SEED_CARDS,SEED_DECKS } from '../seed';
import { describeAsset } from '../../domain/media-registry';

function fixture() {
  return createInitialState([{ id: 'deck', name: 'Deck', description: '', suspended: false }], [{ id: 'card', deckId: 'deck', kind: 'text', front: 'coffee', answer: 'il caffè', pronunciation: '', meaning: '', notes: '', tags: [], revision: 1, suspended: false }]);
}
/** Exercise store transforms with its real validation and an in-memory compare/write boundary. */
function createStore(data: State) {
  const store = new LocalStudyStore();
  store.data.set(data);
  const internal = store as unknown as { database: { commit: (next: State, expected: number) => Promise<State> } };
  internal.database = { commit: async (next, expected) => {
    const { validateState } = await import('../../domain/backup');
    validateState(next);
    if (expected !== store.data()!.version || next.version !== expected + 1) throw new Error('Stale write');
    return next;
  } };
  return store;
}
const bundleFor = (data: State): ContentImport => ({ decks: structuredClone(data.decks), cards: structuredClone(data.cards), assets: [], designs: [] });

describe('atomic content imports and persistent sessions', () => {
  it('keeps stable preset assignments through rename, duplication, replacement and today-only limits',async()=>{const state=fixture(),store=createStore(state),balanced=structuredClone(state.studyPresets[0]!);balanced.name='Everyday';balanced.newCardsPerDay=1;await store.saveStudyPreset(balanced);expect(store.decks()[0]!.studyPresetId).toBe('balanced');const copyId=await store.duplicateStudyPreset('balanced','Weekend');await store.saveDeck({...store.decks()[0]!,studyPresetId:copyId});await expect(store.deleteStudyPreset(copyId)).rejects.toThrow('replacement');await store.deleteStudyPreset(copyId,'balanced');expect(store.decks()[0]!.studyPresetId).toBe('balanced');const version=store.data()!.version;await store.setTodayOverride({deckId:'deck',studyDay:'2026-09-28',newCardsPerDay:0});expect(store.data()!.events).toEqual([]);expect(store.data()!.version).toBe(version+1);});
  it('persists an interrupted Auto Advance timer as paused without touching learning data',async()=>{const store=createStore(fixture());await store.startSession('deck');const before=structuredClone(store.data()!);await store.updateSessionAutoAdvance(true,735);expect(store.data()!.session).toMatchObject({autoAdvancePaused:true,autoAdvanceRemainingMs:735});expect(store.data()!.states).toEqual(before.states);expect(store.data()!.events).toEqual(before.events);expect(store.data()!.rewardEvents).toEqual(before.rewardEvents);await store.updateSessionAutoAdvance(false);expect(store.data()!.session?.autoAdvancePaused).toBe(false);expect(store.data()!.session?.autoAdvanceRemainingMs).toBeUndefined();});
  it('records management separately, assigns stable bulk positions and preserves reviews and rewards',async()=>{const reviewed=applyReview(fixture(),{id:'review',cardId:'card',sessionId:'session',rating:4,now:new Date('2026-09-28T12:00:00Z')});reviewed.cards.push({...reviewed.cards[0]!,id:'second'});const store=createStore(reviewed),events=structuredClone(reviewed.events),rewards=structuredClone(reviewed.rewardEvents);await store.manageCards(['card'],'set-due','2026-10-10T12:00:00.000Z');expect(store.data()!.states['card']!.due).toBe('2026-10-10T12:00:00.000Z');await store.manageCards(['card'],'reset');expect(store.data()!.states['card']!.reps).toBe(0);await store.manageCards(['card','second'],'reposition',20);expect(store.data()!.cardControls['card']?.newPosition).toBe(20);expect(store.data()!.cardControls['second']?.newPosition).toBe(21);expect(store.data()!.events).toEqual(events);expect(store.data()!.rewardEvents).toEqual(rewards);expect(store.data()!.administrativeEvents.map(event=>event.action)).toEqual(['set-due','reset','reposition','reposition']);});
  it('undoes every current administrative action without changing reviews or rewards and survives backup reload',async()=>{
    const reviewed=applyReview(fixture(),{id:'review',cardId:'card',sessionId:'session',rating:4,now:new Date('2026-09-28T12:00:00Z')});
    for(const [action,value] of [['set-due','2026-10-10T12:00:00.000Z'],['reset',undefined],['bury',undefined],['suspend',undefined],['reposition',12]] as const){
      const store=createStore(structuredClone(reviewed)),before=structuredClone(store.data()!),reviews=structuredClone(before.events),rewards=structuredClone(before.rewardEvents);
      await store.manageCards(['card'],action,value);const event=store.data()!.administrativeEvents.at(-1)!;
      expect(administrativeUndoStatus(store.data()!,event.id).allowed).toBe(true);await store.undoAdministrative(event.id);
      const after=store.data()!;expect(after.events).toEqual(reviews);expect(after.rewardEvents).toEqual(rewards);
      expect(after.cards[0]!.suspended).toBe(before.cards[0]!.suspended);expect(after.cardControls['card']).toEqual(before.cardControls['card']);
      if(before.states['card'])expect({...after.states['card'],version:before.states['card']!.version}).toEqual(before.states['card']);
      expect(after.administrativeEvents.at(-1)).toMatchObject({action:'undo',reversesEventId:event.id,detail:action});
      expect(administrativeUndoStatus(store.data()!,event.id).allowed).toBe(false);
      expect(()=>parseBackup(exportBackup(after,new Date('2026-10-03T12:00:00Z')))).not.toThrow();
    }
    const suspendedState=structuredClone(reviewed);suspendedState.cards[0]!.suspended=true;const suspended=createStore(suspendedState);await suspended.manageCards(['card'],'unsuspend');const unsuspend=suspended.data()!.administrativeEvents.at(-1)!;expect(unsuspend.action).toBe('unsuspend');await suspended.undoAdministrative(unsuspend.id);expect(suspended.cards()[0]!.suspended).toBe(true);
    const buriedState=structuredClone(reviewed);buriedState.cardControls['card']={manualBuried:true};const buried=createStore(buriedState);await buried.manageCards(['card'],'unbury');const unbury=buried.data()!.administrativeEvents.at(-1)!;expect(unbury.action).toBe('unbury');await buried.undoAdministrative(unbury.id);expect(buried.data()!.cardControls['card']?.manualBuried).toBe(true);
  });
  it('treats a bulk management undo atomically and rejects stale or legacy records',async()=>{
    const initial=fixture();initial.cards.push({...initial.cards[0]!,id:'second'});const store=createStore(initial),before=structuredClone(initial);
    await store.manageCards(['card','second'],'reposition',20);const members=store.data()!.administrativeEvents.filter(event=>event.action==='reposition');expect(new Set(members.map(event=>event.groupId)).size).toBe(1);
    await store.undoAdministrative(members[1]!.id);expect(store.data()!.cardControls).toEqual(before.cardControls);expect(store.data()!.administrativeEvents.filter(event=>event.action==='undo')).toHaveLength(2);
    await expect(store.undoAdministrative(members[0]!.id)).rejects.toThrow('already been undone');
    const partial=JSON.parse(exportBackup(store.data()!,new Date('2026-10-03T12:00:00Z')));partial.state.administrativeEvents=partial.state.administrativeEvents.filter((event:{action:string;cardId:string})=>event.action!=='undo'||event.cardId==='card');expect(()=>parseBackup(JSON.stringify(partial))).toThrow('partial administrative reversal group');
    const stale=createStore(structuredClone(initial));await stale.manageCards(['card','second'],'reposition',30);const first=stale.data()!.administrativeEvents[0]!;await stale.manageCards(['second'],'reposition',99);const snapshot=structuredClone(stale.data());await expect(stale.undoAdministrative(first.id)).rejects.toThrow('superseded');expect(stale.data()).toEqual(snapshot);
    const aba=createStore(fixture());await aba.manageCards(['card'],'bury');const firstBury=aba.data()!.administrativeEvents.at(-1)!;await aba.manageCards(['card'],'unbury');await aba.manageCards(['card'],'bury');expect(administrativeUndoStatus(aba.data()!,firstBury.id)).toMatchObject({allowed:false});await expect(aba.undoAdministrative(firstBury.id)).rejects.toThrow('superseded');
    const scheduled=createStore(applyReview(fixture(),{id:'review-1',cardId:'card',sessionId:'session-1',rating:3,now:new Date('2026-10-01T12:00:00Z')}));await scheduled.manageCards(['card'],'set-due','2026-10-10T12:00:00.000Z');const dueEvent=scheduled.data()!.administrativeEvents.at(-1)!;scheduled.data.set(applyReview(scheduled.data()!,{id:'review-2',cardId:'card',sessionId:'session-2',rating:3,now:new Date('2026-10-02T12:00:00Z')}));await expect(scheduled.undoAdministrative(dueEvent.id)).rejects.toThrow('schedule changed afterwards');
    const legacy=createStore({...structuredClone(initial),administrativeEvents:[{id:'legacy',userId:initial.userId,cardId:'card',timestamp:'2026-10-03T12:00:00Z',action:'bury'}]});expect(administrativeUndoStatus(legacy.data()!,'legacy')).toMatchObject({allowed:false});await expect(legacy.undoAdministrative('legacy')).rejects.toThrow('older management record');
    const newCard=createStore(fixture()),version=newCard.data()!.version;await newCard.manageCards(['card'],'reset');expect(newCard.data()!.version).toBe(version);expect(newCard.data()!.administrativeEvents).toEqual([]);
  });
  it('preserves HoloRecall learner fields and progress on Anki-style reimport',async()=>{const reviewed=applyReview(fixture(),{id:'review',cardId:'card',sessionId:'session',rating:4,now:new Date('2026-09-28T12:00:00Z')}),store=createStore(reviewed);await store.manageCards(['card'],'suspend');await store.manageCards(['card'],'bury');const bundle=bundleFor(store.data()!);bundle.cards[0]={...bundle.cards[0]!,suspended:false,answer:'updated source answer'};bundle.decks[0]={...bundle.decks[0]!,studyPresetId:undefined,suspended:false};await store.applyContentImport(bundle,store.data()!.version,'balanced',true);expect(store.cards()[0]).toMatchObject({answer:'updated source answer',suspended:true});expect(store.data()!.states).toEqual(reviewed.states);expect(store.data()!.events).toEqual(reviewed.events);expect(store.data()!.cardControls['card']?.manualBuried).toBe(true);});
  it('keeps receiving learner status while portable content updates authored presentation',async()=>{const current=fixture();current.cards[0]!.suspended=true;current.cards[0]!.rarity='common';current.decks[0]!.suspended=true;const store=createStore(current),bundle=bundleFor(current);bundle.cards[0]={...bundle.cards[0]!,suspended:false,rarity:'rare',finish:'etched',answer:'portable answer'};bundle.decks[0]={...bundle.decks[0]!,suspended:false};await store.applyContentImport(bundle,0,'balanced',false,[],[],true);expect(store.cards()[0]).toMatchObject({suspended:true,rarity:'rare',finish:'etched',answer:'portable answer'});expect(store.decks()[0]!.suspended).toBe(true);});
  it('commits a normalized Anki source snapshot atomically with content',async()=>{const store=createStore(fixture()),bundle=bundleFor(store.data()!);bundle.ankiSources=[{id:'anki-source-10',version:1,packageVariant:'legacy-anki2',sourceDecks:[{id:'10',path:'Italian'}],noteTypes:[{id:'1',name:'Custom',cloze:false,signature:'anki-model-v1-abcd',fields:[{id:'1:0',name:'Prompt',ordinal:0},{id:'1:1',name:'Italian',ordinal:1}],templates:[{id:'1:0',name:'Card 1',ordinal:0,question:'{{Prompt}}',answer:'{{FrontSide}}<hr id="answer">{{Italian}}'}]}],notes:[{id:'100',guid:'guid',noteTypeId:'1',fields:{Prompt:'Say hello',Italian:'Ciao!'},tags:[]}],cards:[{id:'200',noteId:'100',templateId:'1:0',templateOrdinal:0,sourceDeckId:'10'}],media:[],contentHash:'anki-source-snapshot-v1-1234abcd'}];await store.applyContentImport(bundle,0);expect(store.data()!.ankiSources).toEqual(bundle.ankiSources);const before=structuredClone(store.data());await expect(store.applyContentImport(bundle,0)).rejects.toThrow('Preview');expect(store.data()).toEqual(before);});
  it('commits portable Anki mapping and conversion dependencies with content',async()=>{const store=createStore(fixture()),bundle=bundleFor(store.data()!);bundle.ankiMappings=[{id:'portable-map',version:4,name:'Portable mapping',sourceSignature:'anki-model-v1-abcd',modelName:'Basic',templateId:'template-0',fields:{Front:'front',Back:'answer'},origin:'user-confirmed'}];bundle.ankiConversionProfiles=[{id:'portable-profile',version:1,sourceSignature:'anki-model-v1-abcd',modelName:'Basic',templateId:'template-0',templateName:'Card 1',mappingProfileId:'portable-map',behaviour:'basic',presentationPolicy:'text-first',status:'user-approved',concerns:[],origin:'user-confirmed'}];await store.applyContentImport(bundle,0);expect(store.data()!.ankiMappings).toEqual(bundle.ankiMappings);expect(store.data()!.ankiConversionProfiles).toEqual(bundle.ankiConversionProfiles);});
  it('detaches imported cards without changing learning state and excludes them from future source linking',async()=>{const reviewed=applyReview(fixture(),{id:'review',cardId:'card',sessionId:'session',rating:4,now:new Date('2026-09-28T12:00:00Z')});reviewed.cards[0]!.ankiSource={kind:'anki',noteGuid:'guid',noteId:'1',templateOrdinal:0,modelName:'Basic',templateName:'Card 1',modelSignature:'anki-model-v1-a',importedContentHash:'1234abcd'};const store=createStore(reviewed),history=structuredClone(reviewed.events),scheduler=structuredClone(reviewed.states);await store.detachAnkiCard('card');expect(store.cards()[0]!.ankiSource?.linkState).toBe('detached');expect(store.data()!.events).toEqual(history);expect(store.data()!.states).toEqual(scheduler);});
  it('detaches an imported deck branch without changing content or learning state',async()=>{const reviewed=applyReview(fixture(),{id:'review',cardId:'card',sessionId:'session',rating:4,now:new Date('2026-09-28T12:00:00Z')});reviewed.decks[0]!.ankiSource={kind:'anki',sourceDeckId:'10',sourcePath:'Course',importedContentHash:'1234abcd'};reviewed.decks.push({id:'child',name:'Child',description:'',suspended:false,parentId:'deck',ankiSource:{kind:'anki',sourceDeckId:'11',sourcePath:'Course::Child',importedContentHash:'1234abcd'}});reviewed.cards[0]!.ankiSource={kind:'anki',noteGuid:'guid',noteId:'1',templateOrdinal:0,modelName:'Basic',templateName:'Card 1',modelSignature:'anki-model-v1-a',importedContentHash:'1234abcd'};const before=structuredClone(reviewed),store=createStore(reviewed);await store.detachAnkiDeck('deck');expect(store.decks().every(deck=>deck.ankiSource===undefined)).toBe(true);expect(store.cards()[0]!.ankiSource?.linkState).toBe('detached');expect(store.cards()[0]!.front).toBe(before.cards[0]!.front);expect(store.data()!.events).toEqual(before.events);expect(store.data()!.states).toEqual(before.states);expect(store.data()!.rewardEvents).toEqual(before.rewardEvents);});
  it('marks an imported editor change as local without changing scheduler or history',async()=>{const reviewed=applyReview(fixture(),{id:'review',cardId:'card',sessionId:'session',rating:4,now:new Date('2026-09-28T12:00:00Z')}),card=reviewed.cards[0]!;card.ankiSource={kind:'anki',noteGuid:'guid',noteId:'1',templateOrdinal:0,modelName:'Custom',templateName:'Card 1',modelSignature:'anki-model-v1-a',importedContentHash:ankiImportedContentHash(card),conversion:{converterVersion:2,normalizerVersion:2,mappingVersion:3,mappingPolicyVersion:3,mappingOrigin:'auto-inferred',mappingSignature:'anki-mapping-v1-a',fieldBaselines:Object.fromEntries(ANKI_DERIVED_FIELDS.map(field=>[field,ankiFieldHash(card,field)])),fieldOrigins:Object.fromEntries(ANKI_DERIVED_FIELDS.map(field=>[field,'derived']))}};const store=createStore(reviewed),states=structuredClone(reviewed.states),events=structuredClone(reviewed.events),edited={...store.cards()[0]!,answer:'my local answer'};await store.saveCard(edited);expect(store.cards()[0]!.ankiSource?.conversion?.fieldOrigins?.answer).toBe('local');expect(store.data()!.states).toEqual(states);expect(store.data()!.events).toEqual(events);});
  it('marks bulk deck and tag edits on imported cards as local provenance',async()=>{const state=fixture(),card=state.cards[0]!;state.decks.push({id:'other',name:'Other',description:'',suspended:false});card.tags=['Old'];card.ankiSource={kind:'anki',noteGuid:'guid',noteId:'1',templateOrdinal:0,modelName:'Custom',templateName:'Card 1',modelSignature:'anki-model-v1-a',importedContentHash:ankiImportedContentHash(card),conversion:{converterVersion:2,normalizerVersion:2,mappingVersion:3,mappingPolicyVersion:3,mappingOrigin:'auto-inferred',mappingSignature:'anki-mapping-v1-a',fieldBaselines:Object.fromEntries(ANKI_DERIVED_FIELDS.map(field=>[field,ankiFieldHash(card,field)])),fieldOrigins:Object.fromEntries(ANKI_DERIVED_FIELDS.map(field=>[field,'derived']))}};const store=createStore(state);await store.bulkOrganizeCards(['card'],{deckId:'other',addTags:['Added']});expect(store.cards()[0]!.ankiSource?.conversion?.fieldOrigins).toMatchObject({deckId:'local',tags:'local'});await store.renameTag('Added','Renamed');expect(store.cards()[0]!.tags).toContain('Renamed');expect(store.cards()[0]!.ankiSource?.conversion?.fieldOrigins?.tags).toBe('local');});
  it('edits structured imported content and deck placement without changing learner state',async()=>{const reviewed=applyReview(fixture(),{id:'review',cardId:'card',sessionId:'session',rating:4,now:new Date('2026-09-28T12:00:00Z')});reviewed.decks.push({id:'child',name:'Child',description:'',suspended:false,parentId:'deck'});reviewed.cards[0]!.ankiSource={kind:'anki',noteGuid:'guid',noteId:'1',templateOrdinal:0,modelName:'Custom',templateName:'Card 1',modelSignature:'anki-model-v1-a',importedContentHash:'1234abcd',linkState:'linked'};reviewed.assets.push({id:'art',name:'art.png',mime:'image/png',dataUrl:'data:image/png;base64,iVBORw0KGgo=',width:1,height:1});const store=createStore(reviewed),history=structuredClone(reviewed.events),scheduler=structuredClone(reviewed.states),rewards=structuredClone(reviewed.rewardEvents),edited={...store.cards()[0]!,deckId:'child',front:'prompt edited',answer:'answer edited',pronunciation:'pronounced',meaning:'meaning',notes:'notes',tags:['Edited'],image:'asset:art',backImage:'asset:art',frontAudio:[],backAudio:[],rarity:'rare' as const,finish:'etched' as const};await store.saveCards([edited]);await store.saveDeck({...store.decks().find(deck=>deck.id==='child')!,name:'Renamed child',coverImage:'asset:art',studyPresetId:'balanced'});expect(store.cards()[0]).toMatchObject({id:'card',deckId:'child',front:'prompt edited',answer:'answer edited',pronunciation:'pronounced',meaning:'meaning',notes:'notes',tags:['Edited'],image:'asset:art',rarity:'rare',finish:'etched',ankiSource:{noteGuid:'guid',linkState:'linked'}});expect(store.decks().find(deck=>deck.id==='child')).toMatchObject({name:'Renamed child',parentId:'deck',coverImage:'asset:art',studyPresetId:'balanced'});expect(store.data()!.events).toEqual(history);expect(store.data()!.states).toEqual(scheduler);expect(store.data()!.rewardEvents).toEqual(rewards);});
  it('deletes a deck branch atomically while retaining shared media',async()=>{const state=fixture();state.decks.push({id:'child',name:'Child',description:'',parentId:'deck',suspended:false},{id:'other',name:'Other',description:'',suspended:false});state.cards.push({...state.cards[0]!,id:'child-card',deckId:'child'},{...state.cards[0]!,id:'other-card',deckId:'other'});state.assets.push({id:'shared',name:'shared.png',mime:'image/png',dataUrl:'data:image/png;base64,iVBORw0KGgo=',width:1,height:1});state.cards[1]!.image='asset:shared';state.cards[2]!.image='asset:shared';const store=createStore(state);expect(deckDeletionImpact(store.data()!,'deck')).toMatchObject({decks:2,cards:2});await store.deleteDeckBranch('deck');expect(store.decks().map(deck=>deck.id)).toEqual(['other']);expect(store.cards().map(card=>card.id)).toEqual(['other-card']);expect(store.data()!.assets.map(asset=>asset.id)).toContain('shared');});
  it('saves custom Anki mapping presets in one validated state change', async () => {
    const store = createStore(fixture());
    await store.saveAnkiMappings([
      { id: 'mapping-a', version: 1, name: 'Vocabulary', sourceSignature: 'anki-model-v1-a1', modelName: 'Custom', fields: { Prompt: 'front', Reply: 'answer' } },
      { id: 'mapping-b', version: 1, name: 'Audio', sourceSignature: 'anki-model-v1-b2', modelName: 'Custom audio', fields: { Sound: 'front-media' } },
    ]);
    expect(store.data()!.version).toBe(1); expect(store.data()!.ankiMappings).toHaveLength(2);
    const before = structuredClone(store.data());
    await expect(store.saveAnkiMappings([
      { id: 'mapping-a', version: 1, name: '', sourceSignature: 'anki-model-v1-a1', modelName: 'Custom', fields: { Prompt: 'front' } },
    ])).rejects.toThrow('invalid Anki mapping');
    expect(store.data()).toEqual(before);
  });
  it('updates content revisions while preserving review history, scheduling, and reward events', async () => {
    const reviewed = applyReview(fixture(), { id: 'review', cardId: 'card', sessionId: 'session', rating: 4, now: new Date('2026-09-28T12:00:00Z') });
    const store = createStore(reviewed), bundle = bundleFor(reviewed);
    bundle.cards[0]!.answer = 'caffè\nwith an accent';
    await store.applyContentImport(bundle, reviewed.version);
    expect(store.data()!.cards[0]!.revision).toBe(2);
    expect(store.data()!.events).toEqual(reviewed.events);
    expect(store.data()!.rewardEvents).toEqual(reviewed.rewardEvents);
    expect(store.data()!.states).toEqual(reviewed.states);
    const unchanged = bundleFor(store.data()!);
    unchanged.cards[0]!.revision = 1; unchanged.cards[0]!.rarity = 'common';
    await store.applyContentImport(unchanged, store.data()!.version);
    expect(store.data()!.cards[0]!.revision).toBe(2);
  });
  it('rejects stale previews and unresolved media atomically', async () => {
    const state = fixture(), store = createStore(state);
    await expect(store.applyContentImport(bundleFor(state), 99)).rejects.toThrow('Preview');
    expect(store.data()).toBe(state);
    const broken = bundleFor(state); broken.cards[0]!.image = 'asset:missing';
    await expect(store.applyContentImport(broken, 0)).rejects.toThrow('does not resolve');
    expect(store.data()).toBe(state);
    expect(store.data()!.events).toEqual([]);
    await expect(store.applyContentImport(bundleFor(state),0,'balanced',false,[{id:'one',version:3,name:'One',sourceSignature:'anki-model-v1-a',modelName:'A',fields:{}},{id:'two',version:3,name:'Two',sourceSignature:'anki-model-v1-a',modelName:'A',fields:{}}])).rejects.toThrow('duplicate Anki mapping presets');
  });
  it('reimports identical image bytes despite reordered fields and optional attribution defaults', async () => {
    const state = fixture();
    state.assets.push({ id: 'frame', name: 'original.png', mime: 'image/png', dataUrl: 'data:image/png;base64,iVBORw0KGgo=', width: 16, height: 16 });
    const original = structuredClone(state.assets[0]!);
    const store = createStore(state), bundle = bundleFor(state);
    bundle.assets = [{ height: 16, width: 16, dataUrl: original.dataUrl, mime: 'image/png', name: 'exported.png', id: 'frame', credit: '', source: '', license: '' }];
    await store.applyContentImport(bundle, 0);
    expect(store.data()!.assets).toEqual([original]);
    bundle.assets[0]!.width = 32;
    await expect(store.applyContentImport(bundle, 1)).rejects.toThrow('different artwork');
    expect(store.data()!.assets).toEqual([original]);
  });
  it('serializes overlapping same-tab mutations against the latest saved snapshot', async () => {
    const store = createStore(fixture());
    await Promise.all([store.startSession(), store.updatePreferences({ theme: 'dark' }), store.revealSession()]);
    expect(store.data()?.session?.revealed).toBe(true);
    expect(store.data()?.preferences.theme).toBe('dark');
    expect(store.data()?.version).toBe(3);
    const id = store.data()!.session!.id;
    await Promise.all([store.review('card', 4, id, 'same-review', 1000), store.review('card', 4, id, 'same-review', 1000)]);
    expect(store.data()?.events).toHaveLength(1);
    expect(store.data()?.version).toBe(4);
  });
  it('prunes suspended cards and decks without reordering eligible queued work', async () => {
    const state = fixture(); state.cards.push({ ...state.cards[0]!, id: 'second' }, { ...state.cards[0]!, id: 'third' });
    const store = createStore(state);
    await store.startSession(); await store.revealSession(); await store.updateSessionTime(6000);
    await store.saveCard({ ...store.cards()[0]!, suspended: true });
    expect(store.data()!.session).toMatchObject({ queue: ['second', 'third'], total: 2, completed: 0, revealed: false, activeMs: 0 });
    await store.revealSession();
    await store.saveDeck({ ...store.decks()[0]!, suspended: true });
    expect(store.data()!.session).toMatchObject({ queue: [], total: 0, completed: 0, revealed: false });
    await store.saveDeck({ ...store.decks()[0]!, suspended: false }); await store.startSession();
    expect(store.data()!.session?.queue).toEqual(['second', 'third']);
    expect(store.data()!.events).toEqual([]);
  });
  it('reconciles reduced limits and requires recall again when an import changes the current question', async () => {
    const state = fixture(); state.cards.push({ ...state.cards[0]!, id: 'second' });
    const store = createStore(state);
    await store.startSession(); await store.revealSession(); await store.updateSessionTime(6000);
    const bundle = bundleFor(store.data()!); bundle.cards[0]!.front = 'A changed prompt';
    await store.applyContentImport(bundle, store.data()!.version);
    expect(store.data()!.session).toMatchObject({ queue: ['card', 'second'], revealed: false, activeMs: 0 });
    await store.updatePreferences({ newCardLimit: 1 });
    expect(store.data()!.session).toMatchObject({ queue: ['card'], total: 1 });
    await store.updatePreferences({ newCardLimit: 0 });
    expect(store.data()!.session).toMatchObject({ queue: [], total: 0 });
    await store.updatePreferences({ newCardLimit: 10 }); await store.startSession();
    expect(store.data()!.session?.queue).toEqual(['card', 'second']);
    const paused = bundleFor(store.data()!); paused.cards[0]!.suspended = true;
    await store.applyContentImport(paused, store.data()!.version);
    expect(store.data()!.session?.queue).toEqual(['second']);
  });
  it('refreshes a persisted stale queue on resume and never retains an ineligible head card', async () => {
    const state = fixture(); state.cards.push({ ...state.cards[0]!, id: 'second' });
    state.cards[0]!.suspended = true;
    state.session = { id: 'old-session', mode:'scheduled', queue: ['card', 'second'], total: 2, completed: 0, revealed: true, activeMs: 3000 };
    const store = createStore(state); await store.startSession();
    expect(store.data()!.session).toMatchObject({ id: 'old-session', queue: ['second'], total: 1, revealed: false, activeMs: 0 });
    await store.revealSession(); await store.review('second', 4, 'old-session');
    expect(store.data()!.events).toHaveLength(1);
  });
  it('persistently reveals cards and stores bounded cumulative session time', async () => {
    const store = createStore(fixture());
    await store.startSession('deck');
    expect(store.data()?.session).toMatchObject({ queue: ['card'], revealed: false, activeMs: 0 });
    await store.revealSession(); await store.updateSessionTime(9000); await store.updateSessionTime(5000);
    expect(store.data()?.session).toMatchObject({ revealed: true, activeMs: 9000 });
    await store.updateSessionTime(500000);
    expect(store.data()?.session?.activeMs).toBe(120000);
  });
  it('persists natural and partial completion with recall timing without duplicating reviews', async () => {
    const store = createStore(fixture());
    await store.startSession('deck');
    const sessionId = store.data()!.session!.id;
    await store.updateSessionTime(3100);
    await store.revealSession(2400);
    await store.review('card', 4, sessionId, 'timed-review', 3100);
    expect(store.data()!.events[0]).toMatchObject({ kind: 'review', activeMs: 3100, recallMs: 2400 });
    expect(store.data()!.session).toMatchObject({ queue: [], completed: 1, total: 1, partial: false });
    expect(store.data()!.session?.endedAt).toBeTruthy();
    await store.review('card', 4, sessionId, 'timed-review', 3100);
    expect(store.data()!.events).toHaveLength(1);
    await store.undo('card', sessionId);
    expect(store.data()!.session).toMatchObject({ queue: ['card'], completed: 0, revealed: false });
    expect(store.data()!.session?.endedAt).toBeUndefined();
    await store.endSession();
    expect(store.data()!.session).toMatchObject({ queue: [], completed: 0, total: 0, plannedTotal: 1, partial: true });
    expect(store.data()!.events).toHaveLength(2);
  });
  it('never resumes a Practice queue from normal Study and reconciles paused ancestor and bury changes',async()=>{const state=fixture();state.decks.push({id:'child',name:'Child',description:'',suspended:false,parentId:'deck'});state.cards[0]!.deckId='child';state.cards.push({...state.cards[0]!,id:'second'});const store=createStore(state);await store.startFocusSession({mode:'practice',label:'Weak cards',criteria:{version:1,deckId:'deck'},order:'deck',limit:10});const practiceId=store.data()!.session!.id;await store.startSession('deck');expect(store.data()!.session).toMatchObject({mode:'scheduled',scopeDeckId:'deck'});expect(store.data()!.session!.id).not.toBe(practiceId);await store.startFocusSession({mode:'practice',label:'Weak cards',criteria:{version:1,deckId:'deck'},order:'deck',limit:10});await store.saveDeck({...store.decks().find(deck=>deck.id==='deck')!,suspended:true});expect(store.data()!.session!.queue).toEqual([]);await store.saveDeck({...store.decks().find(deck=>deck.id==='deck')!,suspended:false});await store.startFocusSession({mode:'practice',label:'Weak cards',criteria:{version:1,deckId:'deck'},order:'deck',limit:10});await store.manageCards(['card'],'bury');expect(store.data()!.session!.queue).toEqual(['second']);});
  it('propagates deck Design Set changes to inherited cards while overrides remain stable',async()=>{const reviewed=applyReview(fixture(),{id:'review',cardId:'card',sessionId:'session',rating:4,now:new Date('2026-09-28T12:00:00Z')});reviewed.designs.push({id:'first',name:'First',backgroundFit:'cover',backgroundPositionX:50,backgroundPositionY:50,frameFit:'contain',credit:'',source:'',license:''},{id:'second',name:'Second',backgroundFit:'cover',backgroundPositionX:50,backgroundPositionY:50,frameFit:'contain',credit:'',source:'',license:''});reviewed.decks[0]!.designSetId='first';reviewed.cards.push({...reviewed.cards[0]!,id:'override'});const store=createStore(reviewed),learning={events:structuredClone(reviewed.events),states:structuredClone(reviewed.states),rewards:structuredClone(reviewed.rewardEvents),revision:reviewed.cards[0]!.revision};expect(store.resolvedDesignFor(store.cards()[0]!)).toMatchObject({source:'deck',design:{id:'first'}});await store.setCardDesignOverrides(['override'],'first');await store.setDeckDesign('deck','second');expect(store.resolvedDesignFor(store.cards()[0]!)).toMatchObject({source:'deck',design:{id:'second'}});expect(store.resolvedDesignFor(store.cards()[1]!)).toMatchObject({source:'card-override',design:{id:'first'}});await store.returnCardsToInherited(['override']);expect(store.cards()[1]!.designSetId).toBeUndefined();expect(store.resolvedDesignFor(store.cards()[1]!)).toMatchObject({source:'deck',design:{id:'second'}});expect(store.cards()[0]!.revision).toBe(learning.revision);expect(store.cards()[1]!.revision).toBe(learning.revision);expect(store.data()!.events).toEqual(learning.events);expect(store.data()!.states).toEqual(learning.states);expect(store.data()!.rewardEvents).toEqual(learning.rewards);});
  it('applies a valid JSON authoring preview atomically and rejects invalid or stale plans',async()=>{const store=createStore(fixture()),preview=previewJsonAuthoring('[{"front":"2 + 2","answer":"4"}]',store.decks()[0]!,()=> 'math');await store.applyJsonAuthoring(preview,0);expect(store.cards().at(-1)).toMatchObject({id:'card-math',deckId:'deck',rarity:'common',revision:1});expect(store.cards().at(-1)!.designSetId).toBeUndefined();await expect(store.applyJsonAuthoring(preview,0)).rejects.toThrow('stale');const invalid=previewJsonAuthoring('[{"front":"Unsafe","answer":"<script>alert(1)</script>"}]',store.decks()[0]!,()=> 'bad');const before=structuredClone(store.data());await expect(store.applyJsonAuthoring(invalid,1)).rejects.toThrow('Fix every');expect(store.data()).toEqual(before);});
});

describe('full learner backup restore boundary',()=>{
  function richBackupState():State{
    let state=applyReview(createInitialState(SEED_DECKS,SEED_CARDS),{id:'backup-review',cardId:'it-limone',sessionId:'backup-session',rating:4,now:new Date('2026-10-23T12:00:00Z'),activeMs:2200,recallMs:900});
    state={...state,preferences:{...state.preferences,theme:'dark'},assets:[{id:'backup-image',name:'backup.png',mime:'image/png',dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aamkAAAAASUVORK5CYII=',width:1,height:1}],designs:[{id:'backup-design',name:'Backup design',background:'asset:backup-image',backgroundFit:'cover',backgroundPositionX:50,backgroundPositionY:50,frameFit:'contain',credit:'Fixture',source:'Test',license:'Original'}],practiceEvents:[{kind:'practice',id:'backup-practice',userId:state.userId,cardId:'it-caffe',sessionId:'backup-practice-session',timestamp:'2026-10-23T13:00:00.000Z',rating:5,activeMs:1000,recallMs:400}],ankiMappings:[{id:'backup-map',version:4,name:'Backup mapping',sourceSignature:'anki-model-v1-backup',modelName:'Backup model',templateId:'template-0',fields:{Front:'front',Back:'answer'},origin:'user-confirmed'}],ankiConversionProfiles:[{id:'backup-profile',version:1,sourceSignature:'anki-model-v1-backup',modelName:'Backup model',templateId:'template-0',templateName:'Card 1',mappingProfileId:'backup-map',behaviour:'basic',presentationPolicy:'text-first',status:'user-approved',concerns:[],origin:'user-confirmed'}],ankiSources:[{id:'backup-source',version:1,packageVariant:'legacy-anki21',sourceDecks:[{id:'10',path:'Backup'}],noteTypes:[{id:'1',name:'Basic',cloze:false,signature:'anki-model-v1-backup',fields:[{id:'1:0',name:'Front',ordinal:0},{id:'1:1',name:'Back',ordinal:1}],templates:[{id:'1:0',name:'Card 1',ordinal:0,question:'{{Front}}',answer:'{{Back}}'}]}],notes:[{id:'100',guid:'backup-guid',noteTypeId:'1',fields:{Front:'Prompt',Back:'Answer'},tags:['backup']}],cards:[{id:'200',noteId:'100',templateId:'1:0',templateOrdinal:0,sourceDeckId:'10'}],media:[],contentHash:'anki-source-snapshot-v1-1234abcd'}]};
    state.cards[0]={...state.cards[0]!,designSetId:'backup-design',image:'asset:backup-image'};
    return state;
  }

  it('previews every backed-up state category and restores it in one commit only into untouched storage',async()=>{
    const source=richBackupState(),json=exportBackup(source,new Date('2026-10-23T14:00:00Z')),target=createStore(createInitialState(SEED_DECKS,SEED_CARDS));
    await target.updatePreferences({theme:'light'});const altered=structuredClone(target.data()!);
    const preview=await target.previewRestoreJson(json);expect(preview).toMatchObject({schemaVersion:11,decks:1,cards:16,reviews:1,practiceEvents:1,assets:1,ankiSources:1,ankiMappings:1,ankiConversionProfiles:1,session:true});expect(preview.rewardEvents).toBeGreaterThan(0);expect(target.data()).toEqual(altered);
    await target.restoreJson(json);const restored=target.data()!,parsed=parseBackup(json,SEED_CARDS),expected={...parsed,assets:await Promise.all(parsed.assets.map(describeAsset))},restoredVersion=restored.version;expect({...restored,version:expected.version}).toEqual(expected);expect(restoredVersion).toBe(altered.version+1);
    const touched=createStore(source),beforeTouched=structuredClone(touched.data()!);await expect(touched.previewRestoreJson(json)).rejects.toThrow('untouched browser profile');await expect(touched.restoreJson(json)).rejects.toThrow('untouched browser profile');expect(touched.data()).toEqual(beforeTouched);
    const invalid=createStore(createInitialState(SEED_DECKS,SEED_CARDS)),beforeInvalid=structuredClone(invalid.data()!);await expect(invalid.previewRestoreJson('{broken')).rejects.toThrow('not valid JSON');expect(invalid.data()).toEqual(beforeInvalid);
    const future=createStore(createInitialState(SEED_DECKS,SEED_CARDS)),futureBackup=JSON.parse(json) as{version:number};futureBackup.version=7;const beforeFuture=structuredClone(future.data()!);await expect(future.previewRestoreJson(JSON.stringify(futureBackup))).rejects.toThrow('unsupported backup format');expect(future.data()).toEqual(beforeFuture);
    const interrupted=createStore(createInitialState(SEED_DECKS,SEED_CARDS)),beforeInterrupted=structuredClone(interrupted.data()!);(interrupted as unknown as{database:{commit:()=>Promise<State>}}).database={commit:async()=>{throw new Error('injected commit failure');}};await expect(interrupted.restoreJson(json)).rejects.toThrow('injected commit failure');expect(interrupted.data()).toEqual(beforeInterrupted);
  });
});
