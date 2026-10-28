import { describe, expect, it } from 'vitest';
import { DEFAULT_DESIGN_SET, deleteDesignSet, deriveDesignPalette, designCopyName, designDeletionImpact, rarityVariant, resolveCardDesign } from './design-system';
import type { CardContent, Deck, DesignSet } from './models';
import { createInitialState } from './study';

const card=(patch:Partial<CardContent>={}):CardContent=>({id:'card',deckId:'child',kind:'text',front:'Question',answer:'Answer',pronunciation:'',meaning:'',notes:'',tags:[],revision:1,suspended:false,...patch});
const designs:DesignSet[]=[{id:'course-set',name:'Course',backgroundFit:'cover',backgroundPositionX:50,backgroundPositionY:50,frameFit:'contain',credit:'',source:'',license:'',palette:{primary:'#112233',secondary:'#223344',surface:'#101010',onSurface:'#ffffff'}},{id:'override',name:'Override',backgroundFit:'contain',backgroundPositionX:50,backgroundPositionY:50,frameFit:'cover',credit:'',source:'',license:''}];
const decks:Deck[]=[{id:'course',name:'Course',description:'',suspended:false,designSetId:'course-set'},{id:'child',name:'Lesson',description:'',suspended:false,parentId:'course'}];

describe('Design Set domain',()=>{
  it('resolves card override, inherited ancestor deck, then the global fallback',()=>{
    expect(resolveCardDesign({decks,designs},card())).toMatchObject({source:'ancestor-deck',sourceDeckId:'course',design:{id:'course-set'}});
    expect(resolveCardDesign({decks,designs},card({designSetId:'override'}))).toMatchObject({source:'card-override',design:{id:'override'}});
    expect(resolveCardDesign({decks:decks.map(deck=>({...deck,designSetId:undefined})),designs},card())).toMatchObject({source:'global',design:{id:DEFAULT_DESIGN_SET.id}});
  });
  it('derives coherent rarity variants without inventing rarity tiers',()=>{
    expect(rarityVariant(designs[0]!,'common')).toMatchObject({finish:'matte',effectIntensity:0});
    expect(rarityVariant({...designs[0]!,rarityVariants:{rare:{finish:'etched',accent:'#abcdef'}}},'rare')).toMatchObject({finish:'etched',accent:'#abcdef',effectIntensity:.28});
  });
  it('extracts the same safe palette from the same pixels',()=>{
    const pixels=Uint8ClampedArray.from([255,255,255,255,255,0,0,255,0,0,0,255,20,40,80,255]);
    expect(deriveDesignPalette(pixels)).toEqual(deriveDesignPalette(pixels));
    expect(Object.values(deriveDesignPalette(pixels)).every(value=>/^#[0-9a-f]{6}$/.test(value))).toBe(true);
  });
  it('chooses readable ink from the derived surface rather than the brighter source sample',()=>{
    const sparseDarkOnWhite=Uint8ClampedArray.from(Array.from({length:80},(_,index)=>index%4===3?255:index<4?24:245));
    const palette=deriveDesignPalette(sparseDarkOnWhite);
    expect(palette.surface).not.toBe(palette.onSurface);
    expect(palette.onSurface).toBe('#ffffff');
  });
  it('uses an accessible integrated surface as the global default',()=>{
    expect(DEFAULT_DESIGN_SET.artwork).toMatchObject({treatment:'embedded',mask:'rounded-window',edgeFade:24,backgroundBleed:30});
    expect(DEFAULT_DESIGN_SET.palette?.onSurface).toBeTruthy();
  });
});

describe('Design Set library safety',()=>{
  it('returns deleted references to inheritance without changing learner state',()=>{
    const state=createInitialState([{id:'deck',name:'Deck',description:'',suspended:false}],[{...card(),deckId:'deck'}]);
    state.designs.push({id:'shared',name:'Shared',backgroundFit:'cover',backgroundPositionX:50,backgroundPositionY:50,frameFit:'contain',credit:'',source:'',license:''});
    state.decks[0]!.designSetId='shared';state.cards[0]!.designSetId='shared';
    const learner={events:structuredClone(state.events),states:structuredClone(state.states),rewards:structuredClone(state.rewardEvents),assets:structuredClone(state.assets)};
    expect(designDeletionImpact(state,'shared')).toEqual({deckReferences:1,cardReferences:1});
    const result=deleteDesignSet(state,'shared');
    expect(result.designs).toEqual([]);expect(result.decks[0]!.designSetId).toBeUndefined();expect(result.cards[0]!.designSetId).toBeUndefined();
    expect(result.events).toEqual(learner.events);expect(result.states).toEqual(learner.states);expect(result.rewardEvents).toEqual(learner.rewards);expect(result.assets).toEqual(learner.assets);
  });
  it('creates a deterministic available copy label',()=>{
    const sets=[{...DEFAULT_DESIGN_SET,id:'one',name:'Forest'},{...DEFAULT_DESIGN_SET,id:'two',name:'Forest copy'}];
    expect(designCopyName(sets,'Forest')).toBe('Forest copy 2');
  });
});
