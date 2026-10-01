import { describe,expect,it } from 'vitest';
import { buildMediaRegistry,deduplicateContent,describeAsset,removableAssets } from './media-registry';
import type { LocalAsset } from './models';
import { createInitialState } from './study';

const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';
const asset=(id:string):LocalAsset=>({id,name:`${id}.png`,mime:'image/png',dataUrl:pixel,width:1,height:1});
describe('media registry',()=>{
  it('deduplicates identical content and rewrites stable references',async()=>{const first=await describeAsset(asset('first')),state=createInitialState([{id:'d',name:'D',description:'',suspended:false}],[]);state.assets=[first];const result=await deduplicateContent(state,{decks:[],designs:[],assets:[asset('second')],cards:[{id:'c',deckId:'d',kind:'visual',front:'Recall',answer:'A',pronunciation:'',meaning:'',notes:'',tags:[],revision:1,suspended:false,image:'asset:second',imageDescription:'Shape'}]});expect(result.bundle.assets).toEqual([]);expect(result.bundle.cards[0]!.image).toBe('asset:first');});
  it('recomputes untrusted hashes and deduplicates repeated bytes within one import',async()=>{const state=createInitialState([{id:'d',name:'D',description:'',suspended:false}],[]),first={...asset('first'),contentHash:`sha256:${'0'.repeat(64)}`},second={...asset('second'),contentHash:`sha256:${'1'.repeat(64)}`};const result=await deduplicateContent(state,{decks:[],designs:[],assets:[first,second],cards:[{id:'c',deckId:'d',kind:'visual',front:'F',answer:'A',pronunciation:'',meaning:'',notes:'',tags:[],revision:1,suspended:false,image:'asset:second',imageDescription:'Shape'}]});expect(result.bundle.assets).toHaveLength(1);expect(result.bundle.assets[0]!.contentHash).not.toBe(first.contentHash);expect(result.bundle.cards[0]!.image).toBe('asset:first');});
  it('tracks shared owners and only reports unreferenced assets',()=>{const state=createInitialState([{id:'d',name:'D',description:'',suspended:false}],[{id:'c',deckId:'d',kind:'text',front:'F',answer:'A',pronunciation:'',meaning:'',notes:'',tags:[],revision:1,suspended:false,image:'asset:used'}]);state.assets=[asset('used'),asset('unused')];expect(buildMediaRegistry(state).references.get('used')).toHaveLength(1);expect(removableAssets(state).map(item=>item.id)).toEqual(['unused']);});
  it('measures ten-thousand media references and constant-time resolution',()=>{
    const state=createInitialState([{id:'d',name:'D',description:'',suspended:false}],Array.from({length:10_000},(_,index)=>({id:`c${index}`,deckId:'d',kind:'visual' as const,front:'Recall',answer:`A${index}`,pronunciation:'',meaning:'',notes:'',tags:[],revision:1,suspended:false,image:`asset:a${index}`,imageDescription:'Shape'})));
    state.assets=Array.from({length:10_000},(_,index)=>asset(`a${index}`));const buildStart=performance.now(),registry=buildMediaRegistry(state),registryMs=performance.now()-buildStart,resolveStart=performance.now();
    for(let index=0;index<10_000;index++)expect(registry.assets.get(`a${index}`)?.id).toBe(`a${index}`);const resolveMs=performance.now()-resolveStart;
    expect(registry.references.size).toBe(10_000);expect(registryMs).toBeLessThan(2000);expect(resolveMs).toBeLessThan(1000);console.info(`[HR-ORG-06] 10k media registry ${registryMs.toFixed(1)}ms; 10k resolutions ${resolveMs.toFixed(1)}ms`);
  });
});
