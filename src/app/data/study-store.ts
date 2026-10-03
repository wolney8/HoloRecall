import { Injectable, computed, signal } from '@angular/core';
import type { AnkiMappingPreset, CardContent, ConfidenceRating, ContentImport, Deck, DesignSet, LocalAsset, Preferences, Rarity, State, StudyPreset, TodayStudyOverride } from '../../domain/models';
import { applyReview, createInitialState, dueCards, serializeCard, undoLatestReview } from '../../domain/study';
import { createEmptyCard } from 'ts-fsrs';
import { exportBackup, parseBackup, validateAnkiMapping, validateCard, validateDeck, validatePreferences, validateAsset, validateDesign, validateRewardConfig } from '../../domain/backup';
import { SEED_CARDS, SEED_DECKS } from '../seed';
import { LocalDatabase } from './local-database';
import type { StudyPersistence } from './study-persistence';
import { canonicalTags, validateDeckMove } from '../../domain/library';
import { deduplicateContent, describeAsset, removableAssets } from '../../domain/media-registry';
import { BALANCED_PRESET_ID, BUILT_IN_PRESETS, validateStudyPreset, validateTodayOverride } from '../../domain/study-settings';

export interface BulkCardPatch {
  deckId?: string; addTags?: string[]; removeTags?: string[]; rarity?: Rarity;
  designSetId?: string; finish?: CardContent['finish']; archived?: boolean;
}

@Injectable({ providedIn: 'root' })
export class LocalStudyStore {
  readonly data = signal<State | null>(null);
  readonly error = signal('');
  readonly cards = computed(() => this.data()?.cards ?? []);
  readonly decks = computed(() => this.data()?.decks ?? []);
  private readonly assetById = computed(() => new Map((this.data()?.assets ?? []).map(asset => [asset.id, asset])));
  private readonly deckById = computed(() => new Map((this.data()?.decks ?? []).map(deck => [deck.id, deck])));
  private readonly designById = computed(() => new Map((this.data()?.designs ?? []).map(design => [design.id, design])));
  private readonly database: StudyPersistence = new LocalDatabase();
  private saving = false;
  private pendingChange: Promise<void> = Promise.resolve();

  async init(): Promise<void> {
    try { await this.refresh(); await this.ensureAssetMetadata(); } catch { /* error signal presents the storage failure; never fall back to volatile progress. */ }
  }

  async refresh(): Promise<void> {
    try {
      const result = await this.database.load(createInitialState(SEED_DECKS, SEED_CARDS));
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
      if (next !== previous) this.data.set(await this.database.commit(next, previous.version));
      this.error.set('');
    } catch (error) { this.report(error); throw error; }
    finally { this.saving = false; }
  }

  async saveCard(card: CardContent): Promise<void> {
    await this.saveCards([card]);
  }

  async saveCards(cards: CardContent[]): Promise<void> {
    await this.change(data => {
      if (!cards.length) return data;
      if (new Set(cards.map(card => card.id)).size !== cards.length) throw new Error('Each card being saved needs a unique ID.');
      let nextCards = data.cards;
      for (const card of cards) {
        if (!data.decks.some(deck => deck.id === card.deckId)) throw new Error('Choose an existing deck.');
        const previous = data.cards.find(item => item.id === card.id);
        if (previous && previous.revision !== card.revision) throw new Error('This card was edited elsewhere. Reopen the editor before saving.');
        const next = structuredClone({ ...card, tags: canonicalTags(card.tags), revision: previous ? previous.revision + 1 : 1, createdAt: previous?.createdAt ?? card.createdAt ?? new Date().toISOString() });
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
    await this.change(data => {
      const selected = new Set(ids);
      if (!selected.size) throw new Error('Select at least one card.');
      const cardIds = new Set(data.cards.map(card => card.id));
      if ([...selected].some(id => !cardIds.has(id))) throw new Error('A selected card no longer exists. Refresh the library.');
      if (patch.deckId && !data.decks.some(deck => deck.id === patch.deckId)) throw new Error('Choose an existing destination deck.');
      const remove = new Set((patch.removeTags ?? []).map(tag => tag.trim().toLocaleLowerCase('en')));
      const cards = data.cards.map(card => {
        if (!selected.has(card.id)) return card;
        const next = { ...card, ...(patch.deckId ? { deckId: patch.deckId } : {}), ...(patch.rarity ? { rarity: patch.rarity } : {}), ...(patch.finish ? { finish: patch.finish } : {}), ...(patch.archived !== undefined ? { archived: patch.archived } : {}), revision: card.revision + 1 };
        next.tags = canonicalTags([...card.tags.filter(tag => !remove.has(tag.trim().toLocaleLowerCase('en'))), ...(patch.addTags ?? [])]);
        if (patch.designSetId !== undefined) { if (patch.designSetId) next.designSetId = patch.designSetId; else delete next.designSetId; }
        validateCard(next); return next;
      });
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

  async saveStudyPreset(preset:StudyPreset):Promise<void>{validateStudyPreset(preset);await this.change(data=>{const duplicate=data.studyPresets.find(item=>item.name.trim().toLocaleLowerCase('en')===preset.name.trim().toLocaleLowerCase('en')&&item.id!==preset.id);if(duplicate)throw new Error('Choose a unique preset name.');return{...data,version:data.version+1,preferences:preset.id===BALANCED_PRESET_ID?{...data.preferences,newCardLimit:preset.newCardsPerDay,reviewLimit:preset.maxReviewsPerDay}:data.preferences,studyPresets:data.studyPresets.some(item=>item.id===preset.id)?data.studyPresets.map(item=>item.id===preset.id?structuredClone(preset):item):[...data.studyPresets,structuredClone(preset)]};});}
  async duplicateStudyPreset(id:string,name:string):Promise<string>{const copyId=`preset-${crypto.randomUUID()}`;await this.change(data=>{const source=data.studyPresets.find(item=>item.id===id);if(!source)throw new Error('The study preset no longer exists.');const preset={...structuredClone(source),id:copyId,name: name.trim()||`${source.name} copy`,builtIn:false};validateStudyPreset(preset);return{...data,version:data.version+1,studyPresets:[...data.studyPresets,preset]};});return copyId;}
  async deleteStudyPreset(id:string,replacementId?:string):Promise<void>{await this.change(data=>{if(id===BALANCED_PRESET_ID)throw new Error('The Balanced preset cannot be deleted.');if(!data.studyPresets.some(item=>item.id===id))return data;const referenced=data.decks.some(deck=>deck.studyPresetId===id);if(referenced&&(!replacementId||replacementId===id||!data.studyPresets.some(item=>item.id===replacementId)))throw new Error('Choose a replacement for decks using this preset.');return{...data,version:data.version+1,decks:data.decks.map(deck=>deck.studyPresetId===id?{...deck,studyPresetId:replacementId}:deck),studyPresets:data.studyPresets.filter(item=>item.id!==id)};});}
  async restoreStudyPreset(id:string):Promise<void>{const defaults=BUILT_IN_PRESETS.find(item=>item.id===id);if(!defaults)throw new Error('Only built-in presets have defaults to restore.');await this.saveStudyPreset(structuredClone(defaults));}
  async setTodayOverride(override:TodayStudyOverride):Promise<void>{validateTodayOverride(override);await this.change(data=>{if(!data.decks.some(deck=>deck.id===override.deckId))throw new Error('Choose an existing deck.');return{...data,version:data.version+1,todayOverrides:[...data.todayOverrides.filter(item=>!(item.deckId===override.deckId&&item.studyDay===override.studyDay)),structuredClone(override)]};});}
  async clearTodayOverride(deckId:string,studyDay:string):Promise<void>{await this.change(data=>{const next=data.todayOverrides.filter(item=>!(item.deckId===deckId&&item.studyDay===studyDay));return next.length===data.todayOverrides.length?data:{...data,version:data.version+1,todayOverrides:next};});}

  async manageCards(ids:string[],action:'set-due'|'reset'|'bury'|'unbury'|'suspend'|'unsuspend'|'reposition',value?:string|number):Promise<void>{await this.change(data=>{const selected=new Set(ids);if(!selected.size||[...selected].some(id=>!data.cards.some(card=>card.id===id)))throw new Error('Choose existing cards.');const now=new Date(),states={...data.states},controls={...data.cardControls},events=[...data.administrativeEvents];let cards=data.cards;for(const cardId of selected){const prior=states[cardId];if(action==='set-due'||action==='reset'){const base=prior??serializeCard(createEmptyCard(now),0),result=action==='reset'?serializeCard(createEmptyCard(now),base.version+1):{...base,due:new Date(String(value)).toISOString(),version:base.version+1};states[cardId]=result;events.push({id:crypto.randomUUID(),userId:data.userId,cardId,timestamp:now.toISOString(),action,previousState:structuredClone(base),resultingState:structuredClone(result)});}else if(action==='bury'||action==='unbury'){controls[cardId]={...controls[cardId],manualBuried:action==='bury'};events.push({id:crypto.randomUUID(),userId:data.userId,cardId,timestamp:now.toISOString(),action});}else if(action==='suspend'||action==='unsuspend'){cards=cards.map(card=>card.id===cardId?{...card,suspended:action==='suspend'}:card);controls[cardId]={...controls[cardId],manualBuried:false};events.push({id:crypto.randomUUID(),userId:data.userId,cardId,timestamp:now.toISOString(),action});}else{if(!Number.isSafeInteger(value)||Number(value)<0)throw new Error('Choose a valid new-card position.');controls[cardId]={...controls[cardId],newPosition:Number(value)};events.push({id:crypto.randomUUID(),userId:data.userId,cardId,timestamp:now.toISOString(),action,detail:String(value)});}}return reconcileSession({...data,version:data.version+1,cards,states,cardControls:controls,administrativeEvents:events},data);});}

  async review(cardId: string, rating: ConfidenceRating, sessionId: string, eventId = crypto.randomUUID(), activeMs = 0): Promise<void> {
    await this.change(data => {
      const next = applyReview(data, { cardId, rating, sessionId, id: eventId, now: new Date(), activeMs, recallMs: data.session?.recallMs });
      return next === data ? data : reconcileSession(next, data);
    });
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


  async startSession(deckId?: string): Promise<void> {
    await this.change(data => {
      const now = new Date();
      const reconciled = reconcileSession(data, data, now);
      if (reconciled.session?.queue.length && reconciled.session.scopeDeckId===deckId) return reconciled === data ? data : { ...reconciled, version: data.version + 1 };
      const queue = dueCards(data, now, deckId).map(card => card.id);
      return { ...data, version: data.version + 1, session: { id: crypto.randomUUID(), queue, total: queue.length, plannedTotal: queue.length, completed: 0, revealed: false, activeMs: 0, cardStartedAt: now.toISOString(), startedAt: now.toISOString(),...(deckId?{scopeDeckId:deckId}:{}) } };
    });
  }
  async revealSession(recallMs?: number): Promise<void> {
    await this.change(data => !data.session || data.session.revealed || !data.session.queue.length ? data : { ...data, version: data.version + 1, session: { ...data.session, revealed: true, ...(Number.isFinite(recallMs) ? { recallMs: Math.max(0, Math.min(120000, Math.round(recallMs!))) } : {}) } });
  }
  async updateSessionTime(ms: number): Promise<void> {
    if (this.saving) return;
    await this.change(data => !data.session || !data.session.queue.length ? data : { ...data, version: data.version + 1, session: { ...data.session, activeMs: Math.max(data.session.activeMs, Math.min(120000, Math.max(0, Math.round(ms)))) } });
  }
  async endSession(): Promise<void> {
    await this.change(data => !data.session || data.session.endedAt ? data : { ...data, version: data.version + 1, session: { ...data.session, plannedTotal: data.session.plannedTotal ?? data.session.total, total: data.session.completed, queue: [], revealed: false, activeMs: 0, recallMs: undefined, endedAt: new Date().toISOString(), partial: true } });
  }
  mediaUrl(ref?: string): string {
    if (!ref) return '';
    if (ref.startsWith('asset:')) return this.assetById().get(ref.slice(6))?.dataUrl ?? '';
    return /^\/?(?:art|assets)\/[a-zA-Z0-9/_-]+\.(svg|png|webp|jpe?g)$/.test(ref) ? ref : '';
  }
  designFor(card: CardContent): DesignSet | undefined {
    const data = this.data();
    const designId = card.designSetId ?? this.deckById().get(card.deckId)?.designSetId;
    return this.designById().get(designId ?? '');
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
    await this.change(data => {
      const replacements = new Map(mappings.map(mapping => [mapping.id, structuredClone(mapping)]));
      const ankiMappings = data.ankiMappings.map(mapping => replacements.get(mapping.id) ?? mapping);
      for (const mapping of replacements.values()) if (!data.ankiMappings.some(item => item.id === mapping.id)) ankiMappings.push(mapping);
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
  async applyContentImport(bundle: ContentImport, expectedVersion: number,studyPresetId=BALANCED_PRESET_ID,preserveLearnerFields=false): Promise<void> {
    const current=this.data();if(!current)throw new Error('Local study data is not ready.');
    const prepared=await deduplicateContent(current,bundle);bundle=prepared.bundle;
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
      const decks=bundle.decks.map(deck=>{const previous=data.decks.find(item=>item.id===deck.id);return{...deck,suspended:preserveLearnerFields?(previous?.suspended??deck.suspended):deck.suspended,archived:preserveLearnerFields?(previous?.archived??deck.archived):deck.archived,designSetId:preserveLearnerFields?(previous?.designSetId??deck.designSetId):deck.designSetId,studyPresetId:previous?.studyPresetId??studyPresetId,studyOverrides:previous?.studyOverrides};});
      const cards = bundle.cards.map(card => {
        const previous = data.cards.find(item => item.id === card.id);
        return { ...card,suspended:preserveLearnerFields?(previous?.suspended??card.suspended):card.suspended,archived:preserveLearnerFields?(previous?.archived??card.archived):card.archived,rarity:preserveLearnerFields?(previous?.rarity??card.rarity):card.rarity,designSetId:preserveLearnerFields?(previous?.designSetId??card.designSetId):card.designSetId,finish:preserveLearnerFields?(previous?.finish??card.finish):card.finish, tags: canonicalTags(card.tags), createdAt: previous?.createdAt ?? card.createdAt ?? new Date().toISOString(), revision: previous ? previous.revision + (sameCardContent(previous, card) ? 0 : 1) : 1 };
      });
      return reconcileSession({ ...data, version: data.version + 1, decks: merge(data.decks, decks), cards: merge(data.cards, cards), designs: merge(data.designs, bundle.designs), assets: merge(data.assets, bundle.assets.map(asset => data.assets.find(existing => existing.id === asset.id) ?? asset)) }, data);
    });
  }

  async renameTag(from:string,to:string):Promise<number>{let changed=0;const source=from.trim().toLocaleLowerCase('en'),replacement=to.trim().replace(/\s+/g,' ');if(!source||!replacement)throw new Error('Choose an existing tag and a nonempty replacement.');await this.change(data=>{const cards=data.cards.map(card=>{if(!card.tags.some(tag=>tag.trim().toLocaleLowerCase('en')===source))return card;changed++;const next={...card,tags:canonicalTags(card.tags.map(tag=>tag.trim().toLocaleLowerCase('en')===source?replacement:tag)),revision:card.revision+1};validateCard(next);return next;});return changed?reconcileSession({...data,version:data.version+1,cards},data):data;});return changed;}
  unusedAssets():LocalAsset[]{const data=this.data();return data?removableAssets(data):[];}
  async removeUnusedAssets(ids:string[]):Promise<number>{let removed=0;await this.change(data=>{const permitted=new Set(removableAssets(data).map(asset=>asset.id)),wanted=new Set(ids);if([...wanted].some(id=>!permitted.has(id)))throw new Error('One or more media files are still referenced and were not removed.');const assets=data.assets.filter(asset=>{const remove=wanted.has(asset.id);if(remove)removed++;return!remove;});return removed?{...data,version:data.version+1,assets}:data;});return removed;}
  private async ensureAssetMetadata():Promise<void>{const data=this.data(),missing=data?.assets.filter(asset=>!asset.contentHash||!asset.byteLength)??[];if(!missing.length)return;const described=await Promise.all(missing.map(describeAsset)),updates=new Map(described.map(asset=>[asset.id,asset]));await this.change(current=>({...current,version:current.version+1,assets:current.assets.map(asset=>updates.get(asset.id)??asset)}));}

  exportJson(): string {
    const data = this.data();
    if (!data) throw new Error('Local study data is not ready.');
    return exportBackup(data, new Date());
  }

  async restoreJson(json: string): Promise<void> {
    const parsed=parseBackup(json,SEED_CARDS),assets=await Promise.all(parsed.assets.map(describeAsset)),restored={...parsed,assets};
    await this.change(data => {
      const initial=createInitialState(SEED_DECKS,SEED_CARDS);
      if (data.events.length || data.assets.length || data.designs.length || data.cards.some(card => card.revision > 1) || JSON.stringify(data.cards) !== JSON.stringify(initial.cards) || JSON.stringify(data.decks) !== JSON.stringify(initial.decks)) throw new Error('Restore is supported only in an untouched browser profile. Export this profile first; use a fresh browser/profile to restore without replacing existing study data.');
      return { ...restored, version: data.version + 1 };
    });
  }
}


function sameCardContent(a: CardContent, b: CardContent): boolean {
  const normalized = (card: CardContent) => JSON.stringify(Object.entries({ ...card, revision: 0, rarity: card.rarity ?? 'common' }).filter(([, value]) => value !== undefined).sort(([a], [b]) => a.localeCompare(b)));
  return normalized(a) === normalized(b);
}


/** Keep scheduler order while pruning content/limits that became ineligible after queue creation. */
function reconcileSession(data: State, previous: State, now = new Date()): State {
  if (!data.session) return data;
  const eligible = new Set(dueCards(data,now,data.session.scopeDeckId).map(card=>card.id));
  const queue = data.session.queue.filter(id => {
    return eligible.has(id);
  });
  const currentId = queue[0];
  const previousId = previous.session?.queue[0];
  const changed = currentId !== previousId || (currentId && data.cards.find(card => card.id === currentId)?.revision !== previous.cards.find(card => card.id === currentId)?.revision);
  const session = { ...data.session, queue, total: data.session.completed + queue.length,
    ...(changed ? { revealed: false, activeMs: 0, recallMs: undefined, cardStartedAt: now.toISOString() } : {}),
  };
  return JSON.stringify(session) === JSON.stringify(data.session) ? data : { ...data, session };
}
