import { Inject, Injectable, computed, signal } from '@angular/core';
import type { AnkiConversionProfile, AnkiMappingPreset, CardContent, ConfidenceRating, ContentImport, Deck, DesignSet, FocusPreset, FocusSessionRequest, LocalAsset, Preferences, Rarity, State, StudyExperienceMode, StudyPreset, TodayStudyOverride } from '../../domain/models';
import { applyScheduledReview, createInitialState, dayKey, dueCards, undoLatestReview } from '../../domain/study';
import { exportBackup, parseBackup, validateAnkiConversionProfile, validateAnkiMapping, validateCard, validateDeck, validatePreferences, validateAsset, validateDesign, validateRewardConfig } from '../../domain/backup';
import { SEED_CARDS, SEED_DECKS } from '../seed';
import { LocalDatabase } from './local-database';
import { STUDY_PERSISTENCE, type StudyPersistence } from './study-persistence';
import { canonicalTags, validateDeckMove } from '../../domain/library';
import { deduplicateContent, describeAsset, removableAssets } from '../../domain/media-registry';
import { BALANCED_PRESET_ID, BUILT_IN_PRESETS, validateStudyPreset, validateTodayOverride } from '../../domain/study-settings';
import { recordPracticeRating } from '../../domain/practice';
import { validateFocusPreset } from '../../domain/focus-validation';
import type { AdministrativeAction } from '../../domain/administrative';
import type { BulkCardPatch } from '../../domain/card-organisation';
import { resolveCardDesign, type ResolvedDesign } from '../../domain/design-system';
import type { JsonAuthoringPreview } from '../../domain/json-authoring';
import { resolveCardPresentation, type ResolvedCardPresentation } from '../../domain/card-presentation';
import { MEDIA_PROVIDER, PlatformMediaProvider, type MediaProvider } from '../platform/media-provider';

const ankiMappingKey=(mapping:AnkiMappingPreset)=>`${mapping.sourceSignature}:${mapping.templateId??''}`;

export interface BackupRestorePreview {
  schemaVersion:number;stateVersion:number;decks:number;cards:number;reviews:number;practiceEvents:number;rewardEvents:number;administrativeEvents:number;assets:number;ankiSources:number;ankiMappings:number;ankiConversionProfiles:number;session:boolean;
}

@Injectable({ providedIn: 'root' })
export class LocalStudyStore {
  readonly data = signal<State | null>(null);
  readonly error = signal('');
  readonly cards = computed(() => this.data()?.cards ?? []);
  readonly decks = computed(() => this.data()?.decks ?? []);
  private readonly assetById = computed(() => new Map((this.data()?.assets ?? []).map(asset => [asset.id, asset])));
  private readonly database: StudyPersistence;
  private readonly mediaProvider:MediaProvider;
  private saving = false;
  private pendingChange: Promise<void> = Promise.resolve();

  constructor(@Inject(STUDY_PERSISTENCE) database: StudyPersistence = new LocalDatabase(),@Inject(MEDIA_PROVIDER) mediaProvider:MediaProvider=new PlatformMediaProvider()) {
    this.database = database;
    this.mediaProvider=mediaProvider;
  }

  async init(): Promise<void> {
    try { await this.refresh(); await this.ensureAssetMetadata(); } catch { /* error signal presents the storage failure; never fall back to volatile progress. */ }
  }

  async refresh(): Promise<void> {
    try {
      // Native resume may arrive while the last accepted review is still committing.
      // Read only after queued mutations settle so a stale snapshot cannot replace it.
      await this.pendingChange;
      const result = await this.database.load(createInitialState(SEED_DECKS, SEED_CARDS));
      await this.mediaProvider.prepare(result.assets);
      this.data.set(result);
      this.error.set('');
    } catch (error) { this.report(error); throw error; }
  }

  private report(error: unknown): void { this.error.set(error instanceof Error ? error.message : 'Local storage failed. No progress was discarded.'); }

  private change(transform: (data: State) => State): Promise<void> {
    const result = this.pendingChange.then(() => this.performChange(transform));
    this.pendingChange = result.catch(() => undefined);
    return result;
  }

  private async performChange(transform: (data: State) => State): Promise<void> {
    this.saving = true;
    try {
      const previous = this.data();
      if (!previous) throw new Error('Local study data is not ready.');
      const next = transform(previous);
      if (next !== previous){const committed=await this.database.commit(next, previous.version);await this.mediaProvider.prepare(committed.assets);this.data.set(committed);}
      this.error.set('');
    } catch (error) { this.report(error); throw error; }
    finally { this.saving = false; }
  }

  async saveCard(card: CardContent): Promise<void> {
    await this.saveCards([card]);
  }

  async saveCards(cards: CardContent[]): Promise<void> {
    const markAnkiLocalEdits=cards.some(card=>!!card.ankiSource)?(await import('../../domain/anki-provenance')).markAnkiLocalEdits:undefined;
    await this.change(data => {
      if (!cards.length) return data;
      if (new Set(cards.map(card => card.id)).size !== cards.length) throw new Error('Each card being saved needs a unique ID.');
      let nextCards = data.cards;
      for (const card of cards) {
        if (!data.decks.some(deck => deck.id === card.deckId)) throw new Error('Choose an existing deck.');
        const previous = data.cards.find(item => item.id === card.id);
        if (previous && previous.revision !== card.revision) throw new Error('This card was edited elsewhere. Reopen the editor before saving.');
        let next:CardContent = structuredClone({ ...card, tags: canonicalTags(card.tags), revision: previous ? previous.revision + 1 : 1, createdAt: previous?.createdAt ?? card.createdAt ?? new Date().toISOString() });
        if(previous&&markAnkiLocalEdits)next=markAnkiLocalEdits(previous,next);
        validateCard(next);
        nextCards = previous ? nextCards.map(item => item.id === card.id ? next : item) : [...nextCards, next];
      }
      return reconcileSession({ ...data, version: data.version + 1, cards: nextCards }, data);
    });
  }

  async bulkUpdateCards(ids: string[], patch: Pick<CardContent, 'rarity' | 'designSetId' | 'finish'>): Promise<void> {
    await this.bulkOrganizeCards(ids, patch);
  }

  async bulkOrganizeCards(ids: string[], patch: BulkCardPatch): Promise<void> {
    const {organizeCards}=await import('../../domain/card-organisation');
    await this.change(data => {
      const cards=organizeCards(data.cards,ids,patch,new Set(data.decks.map(deck=>deck.id)));
      return reconcileSession({ ...data, version: data.version + 1, cards }, data);
    });
  }

  async saveDeck(deck: Deck): Promise<void> {
    await this.change(data => {
      if (data.decks.some(item => item.id === deck.id)) validateDeckMove(data, deck.id, deck.parentId);
      validateDeck(deck);
      const next = structuredClone(deck);
      return reconcileSession({ ...data, version: data.version + 1, decks: data.decks.some(item => item.id === deck.id) ? data.decks.map(item => item.id === deck.id ? next : item) : [...data.decks, next] }, data);
    });
  }

  async setDeckDesign(deckId: string, designSetId?: string): Promise<void> {
    await this.change(data => {
      if (designSetId && !data.designs.some(design => design.id === designSetId)) throw new Error('Choose an existing Design Set.');
      if (!data.decks.some(deck => deck.id === deckId)) throw new Error('Choose an existing deck.');
      return { ...data, version: data.version + 1, decks: data.decks.map(deck => { if (deck.id !== deckId) return deck; const next = { ...deck, designSetId }; if (!designSetId) delete next.designSetId; return next; }) };
    });
  }

  async setCardDesignOverrides(ids: string[], designSetId: string): Promise<void> {
    const selected = new Set(ids);
    await this.change(data => {
      if (!selected.size) throw new Error('Select at least one card.');
      if (!data.designs.some(design => design.id === designSetId)) throw new Error('Choose an existing Design Set.');
      if ([...selected].some(id => !data.cards.some(card => card.id === id))) throw new Error('A selected card no longer exists.');
      const cards = data.cards.map(card => selected.has(card.id) && card.designSetId !== designSetId ? { ...card, designSetId } : card);
      return cards.every((card, index) => card === data.cards[index]) ? data : { ...data, version: data.version + 1, cards };
    });
  }

  /** Clears only presentation overrides. Content, learner state, rewards and source identity are untouched. */
  async returnCardsToInherited(ids: string[]): Promise<void> {
    const selected = new Set(ids);
    await this.change(data => {
      if ([...selected].some(id => !data.cards.some(card => card.id === id))) throw new Error('A selected card no longer exists.');
      const cards = data.cards.map(card => { if (!selected.has(card.id) || card.designSetId === undefined) return card; const next = { ...card }; delete next.designSetId; return next; });
      return cards.every((card, index) => card === data.cards[index]) ? data : { ...data, version: data.version + 1, cards };
    });
  }

  async returnDeckCardsToInherited(deckId: string, includeDescendants = true): Promise<void> {
    const data = this.data();
    if (!data) throw new Error('Local study data is not ready.');
    const deckIds = new Set([deckId]);
    if (includeDescendants) { let changed = true; while (changed) { changed = false; for (const deck of data.decks) if (deck.parentId && deckIds.has(deck.parentId) && !deckIds.has(deck.id)) { deckIds.add(deck.id); changed = true; } } }
    await this.returnCardsToInherited(data.cards.filter(card => deckIds.has(card.deckId)).map(card => card.id));
  }

  /** Applies a previously validated all-or-nothing authoring plan. */
  async applyJsonAuthoring(preview: JsonAuthoringPreview, expectedVersion: number): Promise<void> {
    if (!preview.valid || preview.errors.length) throw new Error('Fix every card error before applying this batch.');
    await this.change(data => {
      if (data.version !== expectedVersion) throw new Error('The preview is stale. Analyse the JSON again.');
      if (!data.decks.some(deck => deck.id === preview.deckId)) throw new Error('The destination deck no longer exists.');
      const existing = new Set(data.cards.map(card => card.id));
      if (preview.cards.some(card => existing.has(card.id) || card.deckId !== preview.deckId)) throw new Error('A proposed card ID already exists or targets another deck.');
      preview.cards.forEach(validateCard);
      return { ...data, version: data.version + 1, cards: [...data.cards, ...structuredClone(preview.cards)] };
    });
  }

  async detachAnkiCard(cardId:string):Promise<void>{await this.change(data=>{const card=data.cards.find(item=>item.id===cardId);if(!card?.ankiSource)return data;const cards=data.cards.map(item=>item.id===cardId?{...item,revision:item.revision+1,ankiSource:{...item.ankiSource!,linkState:'detached' as const}}:item);return reconcileSession({...data,version:data.version+1,cards},data);});}
  async detachAnkiDeck(deckId:string):Promise<void>{await this.change(data=>{const branch=new Set([deckId]);let changed=true;while(changed){changed=false;for(const deck of data.decks)if(deck.parentId&&branch.has(deck.parentId)&&!branch.has(deck.id)){branch.add(deck.id);changed=true;}}const decks=data.decks.map(deck=>branch.has(deck.id)?{...deck,ankiSource:undefined}:deck),cards=data.cards.map(card=>branch.has(card.deckId)&&card.ankiSource?{...card,revision:card.revision+1,ankiSource:{...card.ankiSource,linkState:'detached' as const}}:card);return reconcileSession({...data,version:data.version+1,decks,cards},data);});}
  async deleteDeck(deckId:string,scope:'deck-only'|'branch'):Promise<void>{const {deleteDeck}=await import('../../domain/deck-management');await this.change(data=>deleteDeck(data,deckId,scope));}
  async deleteDeckBranch(deckId:string):Promise<void>{await this.deleteDeck(deckId,'branch');}

  async saveStudyPreset(preset:StudyPreset):Promise<void>{validateStudyPreset(preset);await this.change(data=>{const duplicate=data.studyPresets.find(item=>item.name.trim().toLocaleLowerCase('en')===preset.name.trim().toLocaleLowerCase('en')&&item.id!==preset.id);if(duplicate)throw new Error('Choose a unique preset name.');return{...data,version:data.version+1,preferences:preset.id===BALANCED_PRESET_ID?{...data.preferences,newCardLimit:preset.newCardsPerDay,reviewLimit:preset.maxReviewsPerDay}:data.preferences,studyPresets:data.studyPresets.some(item=>item.id===preset.id)?data.studyPresets.map(item=>item.id===preset.id?structuredClone(preset):item):[...data.studyPresets,structuredClone(preset)]};});}
  async duplicateStudyPreset(id:string,name:string):Promise<string>{const copyId=`preset-${crypto.randomUUID()}`;await this.change(data=>{const source=data.studyPresets.find(item=>item.id===id);if(!source)throw new Error('The study preset no longer exists.');const preset={...structuredClone(source),id:copyId,name: name.trim()||`${source.name} copy`,builtIn:false};validateStudyPreset(preset);return{...data,version:data.version+1,studyPresets:[...data.studyPresets,preset]};});return copyId;}
  async deleteStudyPreset(id:string,replacementId?:string):Promise<void>{await this.change(data=>{if(id===BALANCED_PRESET_ID)throw new Error('The Balanced preset cannot be deleted.');if(!data.studyPresets.some(item=>item.id===id))return data;const referenced=data.decks.some(deck=>deck.studyPresetId===id);if(referenced&&(!replacementId||replacementId===id||!data.studyPresets.some(item=>item.id===replacementId)))throw new Error('Choose a replacement for decks using this preset.');return{...data,version:data.version+1,decks:data.decks.map(deck=>deck.studyPresetId===id?{...deck,studyPresetId:replacementId}:deck),studyPresets:data.studyPresets.filter(item=>item.id!==id)};});}
  async restoreStudyPreset(id:string):Promise<void>{const defaults=BUILT_IN_PRESETS.find(item=>item.id===id);if(!defaults)throw new Error('Only built-in presets have defaults to restore.');await this.saveStudyPreset(structuredClone(defaults));}
  async setTodayOverride(override:TodayStudyOverride):Promise<void>{validateTodayOverride(override);await this.change(data=>{if(!data.decks.some(deck=>deck.id===override.deckId))throw new Error('Choose an existing deck.');return{...data,version:data.version+1,todayOverrides:[...data.todayOverrides.filter(item=>!(item.deckId===override.deckId&&item.studyDay===override.studyDay)),structuredClone(override)]};});}
  async clearTodayOverride(deckId:string,studyDay:string):Promise<void>{await this.change(data=>{const next=data.todayOverrides.filter(item=>!(item.deckId===deckId&&item.studyDay===studyDay));return next.length===data.todayOverrides.length?data:{...data,version:data.version+1,todayOverrides:next};});}

  async manageCards(ids:string[],action:AdministrativeAction,value?:string|number):Promise<void>{const {applyAdministrativeChange}=await import('../../domain/administrative');await this.change(data=>{const next=applyAdministrativeChange(data,ids,action,value);return next===data?data:reconcileSession(next,data);});}
  async undoAdministrative(eventId:string):Promise<void>{const {applyAdministrativeUndo}=await import('../../domain/administrative');await this.change(data=>reconcileSession(applyAdministrativeUndo(data,eventId),data));}

  async review(cardId: string, rating: ConfidenceRating, sessionId: string, eventId = crypto.randomUUID(), activeMs = 0): Promise<void> {
    await this.change(data => {
      if(data.session?.mode!=='scheduled')throw new Error('Only scheduled Study can update FSRS.');
      const next = applyScheduledReview(data, { cardId, rating, sessionId, id: eventId, now: new Date(), activeMs, recallMs: data.session?.recallMs });
      return next === data ? data : reconcileSession(next, data);
    });
  }

  async practice(cardId:string,rating:ConfidenceRating,sessionId:string,eventId=crypto.randomUUID(),activeMs=0):Promise<void>{
    await this.change(data=>reconcileSession(recordPracticeRating(data,{cardId,rating,sessionId,id:eventId,now:new Date(),activeMs,recallMs:data.session?.recallMs}),data));
  }

  async undo(expectedCardId?: string, expectedSessionId?: string): Promise<void> {
    await this.change(data => reconcileSession(undoLatestReview(data, new Date(), crypto.randomUUID(), expectedCardId, expectedSessionId), data));
  }

  async updatePreferences(patch: Partial<Preferences>): Promise<void> {
    await this.change(data => {
      const preferences = { ...data.preferences, ...patch };
      validatePreferences(preferences);
      const studyPresets=data.studyPresets.map(preset=>preset.id===BALANCED_PRESET_ID?{...preset,...(patch.newCardLimit!==undefined?{newCardsPerDay:patch.newCardLimit}:{}),...(patch.reviewLimit!==undefined?{maxReviewsPerDay:patch.reviewLimit}:{})}:preset);
      return reconcileSession({ ...data, version: data.version + 1, preferences,studyPresets }, data);
    });
  }


  async startSession(deckId?: string, experienceMode?:StudyExperienceMode): Promise<void> {
    const selected=experienceMode??this.data()?.preferences.studyMode??'mastery';
    const focusPreview=selected==='free-revision'?(await import('../../domain/focus')).focusPreview:undefined;
    await this.change(data => {
      const now = new Date();
      const reconciled = reconcileSession(data, data, now);
      const recoveredMode=reconciled.session?.experienceMode??(reconciled.session?.mode==='practice'?'free-revision':'mastery');
      if (recoveredMode===selected && !reconciled.session?.focus && reconciled.session?.queue.length && reconciled.session.scopeDeckId===deckId) return reconciled === data ? data : { ...reconciled, version: data.version + 1 };
      const mode=selected==='free-revision'?'practice' as const:'scheduled' as const;
      const queue=selected==='free-revision'?focusPreview!(data,{mode:'practice',label:'Free revision',criteria:{version:1,...(deckId?{deckId}:{})},order:'deck',limit:10_000,seed:`revision-${crypto.randomUUID()}`},now).cards.map(card=>card.id):dueCards(data,now,deckId).map(card=>card.id);
      const label=selected==='anki'?'Anki mode':selected==='mastery'?'Mastery mode':'Free revision';
      return { ...data, version: data.version + 1,preferences:{...data.preferences,studyMode:selected}, session: { id: crypto.randomUUID(), mode,experienceMode:selected,label, queue, total: queue.length, plannedTotal: queue.length, completed: 0, revealed: false, activeMs: 0, cardStartedAt: now.toISOString(), startedAt: now.toISOString(),autoAdvancePaused:false,...(deckId?{scopeDeckId:deckId}:{}) } };
    });
  }
  async startFocusSession(request:FocusSessionRequest):Promise<void>{const {focusPreview}=await import('../../domain/focus');await this.change(data=>{const now=new Date(),effective={...request,seed:request.seed??`run-${crypto.randomUUID()}`},preview=focusPreview(data,effective,now),queue=preview.cards.map(card=>card.id);return{...data,version:data.version+1,session:{id:crypto.randomUUID(),mode:effective.mode,experienceMode:effective.mode==='practice'?'free-revision':'anki',label:effective.label,focus:structuredClone(effective),queue,total:queue.length,plannedTotal:queue.length,completed:0,revealed:false,activeMs:0,cardStartedAt:now.toISOString(),startedAt:now.toISOString(),autoAdvancePaused:false,...(effective.criteria.deckId?{scopeDeckId:effective.criteria.deckId}:{})}};});}
  async saveFocusPreset(preset:FocusPreset):Promise<void>{validateFocusPreset(preset);await this.change(data=>{if(data.focusPresets.some(item=>item.name.trim().toLocaleLowerCase('en')===preset.name.trim().toLocaleLowerCase('en')&&item.id!==preset.id))throw new Error('Choose a unique Focus preset name.');const copy=structuredClone(preset);return{...data,version:data.version+1,focusPresets:data.focusPresets.some(item=>item.id===preset.id)?data.focusPresets.map(item=>item.id===preset.id?copy:item):[...data.focusPresets,copy]};});}
  async deleteFocusPreset(id:string):Promise<void>{await this.change(data=>{const focusPresets=data.focusPresets.filter(item=>item.id!==id);return focusPresets.length===data.focusPresets.length?data:{...data,version:data.version+1,focusPresets};});}
  async revealSession(recallMs?: number): Promise<void> {
    await this.change(data => !data.session || data.session.revealed || !data.session.queue.length ? data : { ...data, version: data.version + 1, session: { ...data.session, revealed: true, ...(Number.isFinite(recallMs) ? { recallMs: Math.max(0, Math.min(120000, Math.round(recallMs!))) } : {}) } });
  }
  async updateSessionTime(ms: number): Promise<void> {
    if (this.saving) return;
    await this.change(data => !data.session || !data.session.queue.length ? data : { ...data, version: data.version + 1, session: { ...data.session, activeMs: Math.max(data.session.activeMs, Math.min(120000, Math.max(0, Math.round(ms)))) } });
  }
  async updateSessionAutoAdvance(paused:boolean,remainingMs?:number):Promise<void>{await this.change(data=>{if(!data.session||data.session.endedAt)return data;const bounded=remainingMs===undefined?undefined:Math.max(0,Math.min(120000,Math.round(remainingMs)));if(data.session.autoAdvancePaused===paused&&data.session.autoAdvanceRemainingMs===bounded)return data;const session={...data.session,autoAdvancePaused:paused,...(bounded===undefined?{}:{autoAdvanceRemainingMs:bounded})};if(bounded===undefined)delete session.autoAdvanceRemainingMs;return{...data,version:data.version+1,session};});}
  async endSession(): Promise<void> {
    await this.change(data => !data.session || data.session.endedAt ? data : { ...data, version: data.version + 1, session: { ...data.session, plannedTotal: data.session.plannedTotal ?? data.session.total, total: data.session.completed, queue: [], revealed: false, activeMs: 0, recallMs: undefined, endedAt: new Date().toISOString(), partial: true } });
  }
  mediaUrl(ref?: string): string {
    if (!ref) return '';
    if (ref.startsWith('asset:')) return this.mediaProvider.resolve(this.assetById().get(ref.slice(6)));
    return /^\/?(?:art|assets)\/[a-zA-Z0-9/_-]+\.(svg|png|webp|jpe?g)$/.test(ref) ? ref : '';
  }
  resolvedDesignFor(card: CardContent): ResolvedDesign {
    const data = this.data();
    if (!data) throw new Error('Local study data is not ready.');
    return resolveCardDesign(data, card);
  }
  designFor(card: CardContent): DesignSet | undefined {
    return this.resolvedDesignFor(card).design;
  }
  presentationFor(card:CardContent):ResolvedCardPresentation {
    const data=this.data();if(!data)throw new Error('Local study data is not ready.');
    let deck=data.decks.find(item=>item.id===card.deckId),cursor=deck;
    while(cursor?.parentId&&!cursor.studyArtPolicy){const parent=data.decks.find(item=>item.id===cursor!.parentId);if(!parent)break;cursor=parent;}
    if(cursor?.studyArtPolicy)deck={...deck!,studyArtPolicy:cursor.studyArtPolicy};
    return resolveCardPresentation(card,data.ankiSources,deck,this.designFor(card));
  }
  async saveAsset(asset: LocalAsset): Promise<LocalAsset> {
    const described=await describeAsset(asset);validateAsset(described);let retained=described;
    await this.change(data => {
      const previous = data.assets.find(item => item.id === described.id);
      if (previous && JSON.stringify(previous) !== JSON.stringify(described)) throw new Error('Upload replacement artwork with a new asset ID to preserve other designs.');
      if(previous){retained=previous;return data;}const duplicate=data.assets.find(item=>item.contentHash===described.contentHash&&item.mime===described.mime);if(duplicate){retained=duplicate;return data;}
      return { ...data, version: data.version + 1, assets: [...data.assets, structuredClone(described)] };
    });
    return retained;
  }
  async saveDesign(design: DesignSet): Promise<void> {
    validateDesign(design);
    await this.change(data => ({ ...data, version: data.version + 1, designs: data.designs.some(item => item.id === design.id) ? data.designs.map(item => item.id === design.id ? structuredClone(design) : item) : [...data.designs, structuredClone(design)] }));
  }
  async saveAnkiMapping(mapping: AnkiMappingPreset): Promise<void> {
    await this.saveAnkiMappings([mapping]);
  }
  async saveAnkiMappings(mappings: AnkiMappingPreset[]): Promise<void> {
    mappings.forEach(validateAnkiMapping);
    if (new Set(mappings.map(mapping => mapping.id)).size !== mappings.length) throw new Error('Mapping preset IDs must be unique.');
    if (new Set(mappings.map(ankiMappingKey)).size !== mappings.length) throw new Error('Mapping profiles must be unique.');
    await this.change(data => {
      const signatures=new Set(mappings.map(ankiMappingKey));
      const ankiMappings = data.ankiMappings.filter(mapping=>!signatures.has(ankiMappingKey(mapping)));
      ankiMappings.push(...mappings.map(mapping=>structuredClone(mapping)));
      return { ...data, version: data.version + 1, ankiMappings };
    });
  }
  async updateRewardConfig(patch: Partial<Record<Rarity, number>>): Promise<void> {
    await this.change(data => {
      const rewardConfig = { ...data.rewardConfig, ...patch };
      validateRewardConfig(rewardConfig);
      return { ...data, version: data.version + 1, rewardConfig };
    });
  }
  async applyContentImport(bundle: ContentImport, expectedVersion: number,studyPresetId=BALANCED_PRESET_ID,preserveLearnerFields=false,mappingUpdates:AnkiMappingPreset[]=[],conversionProfileUpdates:AnkiConversionProfile[]=[],preserveLearnerStatus=false): Promise<void> {
    const current=this.data();if(!current)throw new Error('Local study data is not ready.');mappingUpdates=mappingUpdates.length?mappingUpdates:(bundle.ankiMappings??[]);conversionProfileUpdates=conversionProfileUpdates.length?conversionProfileUpdates:(bundle.ankiConversionProfiles??[]);
    const prepared=await deduplicateContent(current,bundle);bundle=prepared.bundle;mappingUpdates.forEach(validateAnkiMapping);conversionProfileUpdates.forEach(validateAnkiConversionProfile);
    await this.change(data => {
      if (data.version !== expectedVersion) throw new Error('Local content changed after this preview. Preview the import again.');
      const merge = <T extends { id: string }>(current: T[], incoming: T[]): T[] => {
        if (new Set(incoming.map(item => item.id)).size !== incoming.length) throw new Error('The import contains duplicate IDs.');
        const updates = new Map(incoming.map(item => [item.id, structuredClone(item)]));
        return [...current.map(item => updates.get(item.id) ?? item), ...incoming.filter(item => !current.some(existing => existing.id === item.id)).map(item => structuredClone(item))];
      };
      for (const asset of bundle.assets) {
        const existing = data.assets.find(item => item.id === asset.id);
        if (existing && (existing.dataUrl !== asset.dataUrl || existing.mime !== asset.mime || existing.width !== asset.width || existing.height !== asset.height)) throw new Error('An imported asset ID already has different artwork or audio. Use a new asset ID.');
      }
      if(!data.studyPresets.some(preset=>preset.id===studyPresetId))throw new Error('Choose an existing HoloRecall study preset.');
      const decks=bundle.decks.map(deck=>{const previous=data.decks.find(item=>item.id===deck.id);return{...deck,suspended:preserveLearnerFields||preserveLearnerStatus?(previous?.suspended??deck.suspended):deck.suspended,archived:preserveLearnerFields||preserveLearnerStatus?(previous?.archived??deck.archived):deck.archived,designSetId:preserveLearnerFields?(previous?.designSetId??deck.designSetId):deck.designSetId,studyPresetId:previous?.studyPresetId??studyPresetId,studyOverrides:previous?.studyOverrides};});
      const cards = bundle.cards.map(card => {
        const previous = data.cards.find(item => item.id === card.id);
        return { ...card,suspended:preserveLearnerFields||preserveLearnerStatus?(previous?.suspended??card.suspended):card.suspended,archived:preserveLearnerFields||preserveLearnerStatus?(previous?.archived??card.archived):card.archived,rarity:preserveLearnerFields?(previous?.rarity??card.rarity):card.rarity,designSetId:preserveLearnerFields?(previous?.designSetId??card.designSetId):card.designSetId,finish:preserveLearnerFields?(previous?.finish??card.finish):card.finish, tags: canonicalTags(card.tags), createdAt: previous?.createdAt ?? card.createdAt ?? new Date().toISOString(), revision: previous ? previous.revision + (sameCardContent(previous, card) ? 0 : 1) : 1 };
      });
      const mappingSignatures=new Set(mappingUpdates.map(ankiMappingKey)),ankiMappings=[...data.ankiMappings.filter(mapping=>!mappingSignatures.has(ankiMappingKey(mapping))),...mappingUpdates.map(mapping=>structuredClone(mapping))];const profileKeys=new Set(conversionProfileUpdates.map(profile=>`${profile.sourceSignature}::${profile.templateId}`)),ankiConversionProfiles=[...data.ankiConversionProfiles.filter(profile=>!profileKeys.has(`${profile.sourceSignature}::${profile.templateId}`)),...conversionProfileUpdates.map(profile=>structuredClone(profile))];
      return reconcileSession({ ...data, version: data.version + 1, decks: merge(data.decks, decks), cards: merge(data.cards, cards), designs: merge(data.designs, bundle.designs), assets: merge(data.assets, bundle.assets.map(asset => data.assets.find(existing => existing.id === asset.id) ?? asset)),ankiMappings,ankiConversionProfiles,ankiSources:merge(data.ankiSources,bundle.ankiSources??[]) }, data);
    });
  }

  async renameTag(from:string,to:string):Promise<number>{let changed=0;const {renameCardsTag}=await import('../../domain/card-organisation');await this.change(data=>{const result=renameCardsTag(data.cards,from,to);changed=result.changed;return changed?reconcileSession({...data,version:data.version+1,cards:result.cards},data):data;});return changed;}
  unusedAssets():LocalAsset[]{const data=this.data();return data?removableAssets(data):[];}
  async removeUnusedAssets(ids:string[]):Promise<number>{let removed=0;await this.change(data=>{const permitted=new Set(removableAssets(data).map(asset=>asset.id)),wanted=new Set(ids);if([...wanted].some(id=>!permitted.has(id)))throw new Error('One or more media files are still referenced and were not removed.');const assets=data.assets.filter(asset=>{const remove=wanted.has(asset.id);if(remove)removed++;return!remove;});return removed?{...data,version:data.version+1,assets}:data;});return removed;}
  private async ensureAssetMetadata():Promise<void>{const data=this.data(),missing=data?.assets.filter(asset=>!asset.contentHash||!asset.byteLength)??[];if(!missing.length)return;const described=await Promise.all(missing.map(describeAsset)),updates=new Map(described.map(asset=>[asset.id,asset]));await this.change(current=>({...current,version:current.version+1,assets:current.assets.map(asset=>updates.get(asset.id)??asset)}));}

  exportJson(): string {
    const data = this.data();
    if (!data) throw new Error('Local study data is not ready.');
    return exportBackup(data, new Date());
  }

  private assertRestoreTargetUntouched(data:State):void{
    const initial=createInitialState(SEED_DECKS,SEED_CARDS);
    if (data.events.length || data.assets.length || data.designs.length || data.cards.some(card => card.revision > 1) || JSON.stringify(data.cards) !== JSON.stringify(initial.cards) || JSON.stringify(data.decks) !== JSON.stringify(initial.decks)) throw new Error('Restore is supported only in an untouched browser profile. Export this profile first; use a fresh browser/profile to restore without replacing existing study data.');
  }

  async previewRestoreJson(json:string):Promise<BackupRestorePreview>{
    const current=this.data();if(!current)throw new Error('Local study data is not ready.');this.assertRestoreTargetUntouched(current);
    const parsed=parseBackup(json,SEED_CARDS);await Promise.all(parsed.assets.map(describeAsset));
    return{schemaVersion:parsed.schemaVersion,stateVersion:parsed.version,decks:parsed.decks.length,cards:parsed.cards.length,reviews:parsed.events.filter(event=>event.kind==='review').length,practiceEvents:parsed.practiceEvents.length,rewardEvents:parsed.rewardEvents.length,administrativeEvents:parsed.administrativeEvents.length,assets:parsed.assets.length,ankiSources:parsed.ankiSources.length,ankiMappings:parsed.ankiMappings.length,ankiConversionProfiles:parsed.ankiConversionProfiles.length,session:parsed.session!==null};
  }

  async restoreJson(json: string): Promise<void> {
    const parsed=parseBackup(json,SEED_CARDS),assets=await Promise.all(parsed.assets.map(describeAsset)),restored={...parsed,assets};
    await this.change(data => {
      this.assertRestoreTargetUntouched(data);
      return { ...restored, version: data.version + 1 };
    });
  }
}


function sameCardContent(a: CardContent, b: CardContent): boolean {
  const normalized = (card: CardContent) => JSON.stringify(Object.entries({deckId:card.deckId,kind:card.kind,front:card.front,answer:card.answer,pronunciation:card.pronunciation,meaning:card.meaning,secondary:card.secondary,interpretation:card.interpretation,notes:card.notes,tags:card.tags,image:card.image,backImage:card.backImage,imageDescription:card.imageDescription,frontAudio:card.frontAudio,backAudio:card.backAudio,siblingGroupId:card.siblingGroupId,art:card.art,choices:card.choices,answerLabel:card.answerLabel,details:card.details,presentation:card.presentation,imageOcclusion:card.imageOcclusion}).filter(([, value]) => value !== undefined).sort(([a], [b]) => a.localeCompare(b)));
  return normalized(a) === normalized(b);
}


/** Keep scheduler order while pruning content/limits that became ineligible after queue creation. */
function reconcileSession(data: State, previous: State, now = new Date()): State {
  if (!data.session) return data;
  const session=data.session;
  const eligible = session.mode==='scheduled'
    ? new Set([...dueCards(data,now,session.scopeDeckId).map(card=>card.id),...Object.keys(session.repetitionDue??{})])
    : new Set(data.cards.filter(card=>{const allowSuspended=session.focus?.criteria.includeSuspended||session.focus?.criteria.studyStates?.includes('suspended'),allowBuried=session.focus?.criteria.studyStates?.includes('buried'),control=data.cardControls[card.id],today=dayKey(now,data.preferences.timeZone),seen=new Set<string>();let deck=data.decks.find(item=>item.id===card.deckId),blocked=false;while(deck&&!seen.has(deck.id)){seen.add(deck.id);if(deck.archived||(!allowSuspended&&deck.suspended)){blocked=true;break;}deck=deck.parentId?data.decks.find(item=>item.id===deck!.parentId):undefined;}return !card.archived&&!blocked&&(allowSuspended||!card.suspended)&&(allowBuried||!control?.manualBuried&&control?.buriedOnDay!==today);}).map(card=>card.id));
  const queue = session.queue.filter(id => eligible.has(id));
  const currentId = queue[0];
  const previousId = previous.session?.queue[0];
  const changed = currentId !== previousId || (currentId && data.cards.find(card => card.id === currentId)?.revision !== previous.cards.find(card => card.id === currentId)?.revision);
  const nextSession = { ...session, queue, total: session.completed + queue.length,
    ...(changed ? { revealed: false, activeMs: 0, recallMs: undefined, cardStartedAt: now.toISOString() } : {}),
  };
  return JSON.stringify(nextSession) === JSON.stringify(data.session) ? data : { ...data, session:nextSession };
}
