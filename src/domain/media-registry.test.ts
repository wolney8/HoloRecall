import { describe,expect,it } from 'vitest';
import { buildMediaRegistry,deduplicateContent,describeAsset,removableAssets } from './media-registry';
import type { LocalAsset } from './models';
import { createInitialState } from './study';

const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';
const asset=(id:string):LocalAsset=>({id,name:`${id}.png`,mime:'image/png',dataUrl:pixel,width:1,height:1});
describe('media registry',()=>{
  it('deduplicates identical content and rewrites stable references',async()=>{const first=await describeAsset(asset('first')),state=createInitialState([{id:'d',name:'D',description:'',suspended:false}],[]);state.assets=[first];const result=await deduplicateContent(state,{decks:[],designs:[],assets:[asset('second')],cards:[{id:'c',deckId:'d',kind:'visual',front:'Recall',answer:'A',pronunciation:'',meaning:'',notes:'',tags:[],revision:1,suspended:false,image:'asset:second',imageDescription:'Shape'}]});expect(result.bundle.assets).toEqual([]);expect(result.bundle.cards[0]!.image).toBe('asset:first');});
  it('tracks shared owners and only reports unreferenced assets',()=>{const state=createInitialState([{id:'d',name:'D',description:'',suspended:false}],[{id:'c',deckId:'d',kind:'text',front:'F',answer:'A',pronunciation:'',meaning:'',notes:'',tags:[],revision:1,suspended:false,image:'asset:used'}]);state.assets=[asset('used'),asset('unused')];expect(buildMediaRegistry(state).references.get('used')).toHaveLength(1);expect(removableAssets(state).map(item=>item.id)).toEqual(['unused']);});
});
