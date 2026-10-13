import type { CardContent, Deck, State } from './models';
import { DEFAULT_REWARD_CONFIG } from './rewards';
import { validateState } from './backup';
import { BALANCED_PRESET_ID, cloneBuiltInPresets } from './study-settings';

/** Structural migration only: no fabricated reviews, reward grants or content revisions. */
export function migrateState(input: unknown, bundledCards: CardContent[] = []): State {
  if (!input || typeof input !== 'object') throw new Error('Invalid HoloRecall data: expected an object.');
  const raw = structuredClone(input) as Record<string, unknown>;
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9].includes(Number(raw['schemaVersion']))) throw new Error('Invalid HoloRecall data: unsupported schema.');
  if (raw['schemaVersion'] === 1) {
    raw['schemaVersion'] = 2;
    raw['designs'] = [];
    raw['assets'] = [];
    raw['rewardEvents'] = [];
    raw['rewardConfig'] = { ...DEFAULT_REWARD_CONFIG };
    raw['session'] = null;
    if (raw['preferences'] && typeof raw['preferences'] === 'object') raw['preferences'] = { ...raw['preferences'], theme: 'system' };
    if (Array.isArray(raw['cards'])) raw['cards'] = (raw['cards'] as CardContent[]).map(card => {
      const seed = bundledCards.find(seed => seed.id === card.id && seed.front === card.front && seed.answer === card.answer && card.revision === 1);
      return { ...card, rarity: card.rarity ?? seed?.rarity ?? 'common', ...(seed && !card.image && seed.image ? { image: seed.image, imageDescription: seed.imageDescription } : {}) };
    });
  }
  if (raw['schemaVersion'] === 2) { raw['schemaVersion'] = 3; raw['ankiMappings'] = []; }
  if (raw['schemaVersion'] === 3) raw['schemaVersion'] = 4;
  if (raw['schemaVersion'] === 4) {
    const preferences=raw['preferences'] as {newCardLimit?:number;reviewLimit?:number};
    const presets=cloneBuiltInPresets();presets[0]={...presets[0]!,newCardsPerDay:preferences.newCardLimit??10,maxReviewsPerDay:preferences.reviewLimit??100};
    raw['schemaVersion']=5;raw['studyPresets']=presets;raw['todayOverrides']=[];raw['cardControls']={};raw['administrativeEvents']=[];
    raw['decks']=(raw['decks'] as Array<Record<string,unknown>>).map(deck=>({...deck,studyPresetId:BALANCED_PRESET_ID}));
  }
  if (raw['schemaVersion'] === 5) {
    raw['schemaVersion'] = 6;
    raw['practiceEvents'] = [];
    raw['focusPresets'] = [];
    if (Array.isArray(raw['events'])) raw['events'] = (raw['events'] as Array<Record<string, unknown>>).map(event => event['kind'] === 'review' && event['mode'] === 'practice' ? { ...event, mode: 'scheduled' } : event);
    if (raw['session'] && typeof raw['session'] === 'object') raw['session'] = { ...(raw['session'] as Record<string, unknown>), mode: 'scheduled' };
  }
  if (raw['schemaVersion'] === 6) {
    raw['schemaVersion'] = 7;
    raw['ankiMappings'] = (raw['ankiMappings'] as Array<Record<string, unknown>> ?? []).map(mapping => ({ ...mapping, policyVersion: 0, origin: 'legacy-unclassified' }));
    raw['cards'] = (raw['cards'] as Array<Record<string, unknown>> ?? []).map(card => {
      const source = card['ankiSource']; if (!source || typeof source !== 'object') return card;
      const conversion = (source as Record<string, unknown>)['conversion']; if (!conversion || typeof conversion !== 'object') return card;
      return { ...card, ankiSource: { ...(source as Record<string, unknown>), conversion: { ...(conversion as Record<string, unknown>), mappingPolicyVersion: 0, mappingOrigin: 'legacy-unclassified' } } };
    });
  }
  if (raw['schemaVersion'] === 7) { raw['schemaVersion'] = 8; raw['ankiSources'] = []; }
  if(raw['schemaVersion']===8){
    const decks=(raw['decks'] as Deck[]??[]),cards=(raw['cards'] as CardContent[]??[]),deckById=new Map(decks.map(deck=>[deck.id,deck])),cardById=new Map(cards.map(card=>[card.id,card]));
    const pathFrom=(deckId:string):Deck[]=>{const result:Deck[]=[];const seen=new Set<string>();let deck=deckById.get(deckId);while(deck&&!seen.has(deck.id)){seen.add(deck.id);result.push(deck);deck=deck.parentId?deckById.get(deck.parentId):undefined;}if(!result.length||result.at(-1)?.parentId)throw new Error('Invalid HoloRecall data: legacy review deck attribution cannot be resolved.');return result;};
    raw['events']=(raw['events'] as Array<Record<string,unknown>>??[]).map(event=>{
      if(event['kind']!=='review')return event;
      const hasLegacy=event['studyDeckId']!==undefined||event['studyRootDeckId']!==undefined||event['studyDeckPath']!==undefined;
      if(!hasLegacy)return event;
      const card=cardById.get(String(event['cardId'])),ownerId=String(event['studyDeckId']??card?.deckId??''),owner=deckById.get(ownerId);
      if(!owner)throw new Error('Invalid HoloRecall data: legacy review deck attribution cannot be resolved.');
      const derived=pathFrom(ownerId),sourcePath=event['studyDeckPath'];
      if(sourcePath!==undefined&&(!Array.isArray(sourcePath)||sourcePath.length!==derived.length||sourcePath.some((id,index)=>id!==derived[index]?.id)))throw new Error('Invalid HoloRecall data: legacy review deck attribution is inconsistent.');
      const rootDeckId=String(event['studyRootDeckId']??ownerId);if(!derived.some(deck=>deck.id===rootDeckId))throw new Error('Invalid HoloRecall data: legacy review study root is inconsistent.');
      const migrated:Record<string,unknown>={...event,studyDeckSnapshot:{deck:{id:owner.id,name:owner.name},path:derived.map(deck=>({id:deck.id,name:deck.name})),rootDeckId}};
      delete migrated['studyDeckId'];delete migrated['studyRootDeckId'];delete migrated['studyDeckPath'];return migrated;
    });
    raw['schemaVersion']=9;
  }
  if (raw['preferences'] && typeof raw['preferences'] === 'object') raw['preferences'] = { haptics: true,studyMode:'mastery', ...(raw['preferences'] as Record<string, unknown>) };
  validateState(raw);
  return raw;
}
