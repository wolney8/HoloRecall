import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { LocalStudyStore } from './study-store';
import { createInitialState } from '../../domain/study';
import { acceptScheduledReview as applyReview } from '../../test/scheduled-review';
import type { ContentImport, State } from '../../domain/models';
import { exportBackup, parseBackup } from '../../domain/backup';
import { administrativeUndoStatus } from '../../domain/administrative';
import { deckDeletionImpact } from '../../domain/deck-management';

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
  it('detaches imported cards without changing learning state and excludes them from future source linking',async()=>{const reviewed=applyReview(fixture(),{id:'review',cardId:'card',sessionId:'session',rating:4,now:new Date('2026-09-28T12:00:00Z')});reviewed.cards[0]!.ankiSource={kind:'anki',noteGuid:'guid',noteId:'1',templateOrdinal:0,modelName:'Basic',templateName:'Card 1',modelSignature:'anki-model-v1-a',importedContentHash:'1234abcd'};const store=createStore(reviewed),history=structuredClone(reviewed.events),scheduler=structuredClone(reviewed.states);await store.detachAnkiCard('card');expect(store.cards()[0]!.ankiSource?.linkState).toBe('detached');expect(store.data()!.events).toEqual(history);expect(store.data()!.states).toEqual(scheduler);});
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
});
