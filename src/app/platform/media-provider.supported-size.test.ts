import {beforeAll,describe,expect,it,vi} from 'vitest';
import type {LocalAsset} from '../../domain/models';
import {MAX_ASSET_BYTES} from '../../domain/exchange';
import {synchronizeNativeMedia} from './media-provider';

const ASSET_COUNT=11;

function encode(bytes:Uint8Array):string{
  let value='';const chunk=32_768;
  for(let offset=0;offset<bytes.length;offset+=chunk)value+=String.fromCharCode(...bytes.subarray(offset,offset+chunk));
  return btoa(value);
}

async function digest(bytes:Uint8Array):Promise<string>{return[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as Uint8Array<ArrayBuffer>))].map(value=>value.toString(16).padStart(2,'0')).join('');}

async function fixture(index:number):Promise<LocalAsset>{
  const data=new Uint8Array(MAX_ASSET_BYTES);data.fill((index*23+17)&255);
  const wav=index%2===0;data.set(wav?[0x52,0x49,0x46,0x46,0xf8,0xff,0x4f,0x00,0x57,0x41,0x56,0x45]:[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);data[data.length-1]=index;
  const base64=encode(data),mime=wav?'audio/wav' as const:'image/png' as const;
  return{id:`supported-${index}`,name:`supported-${index}.${wav?'wav':'png'}`,mime,dataUrl:`data:${mime};base64,${base64}`,contentHash:`sha256:${await digest(data)}`,byteLength:data.byteLength,...(!wav?{width:1024,height:1024}: {})};
}

describe.skipIf(process.env['HR_SUPPORTED_SIZE']!=='1')('native media at documented supported size',()=>{
  let assets:LocalAsset[];
  beforeAll(async()=>{assets=[];for(let index=0;index<ASSET_COUNT;index++)assets.push(await fixture(index));},30_000);

  it('reconciles 55 MiB of distinct near-boundary assets without duplicate files',async()=>{
    const files=new Map<string,string>(),writeFile=vi.fn(async({path,data}:{path:string;data:string})=>{files.set(path,data);return{uri:`file://${path}`};});
    const modules={core:{Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'ios',convertFileSrc:(uri:string)=>uri}},filesystem:{Directory:{LibraryNoCloud:'LIBRARY_NO_CLOUD'},Filesystem:{stat:async({path}:{path:string})=>{const data=files.get(path);if(!data)throw new Error('missing');return{size:MAX_ASSET_BYTES};},readFile:async({path}:{path:string})=>{const data=files.get(path);if(!data)throw new Error('missing');return{data};},writeFile,getUri:async({path}:{path:string})=>({uri:`file://${path}`}),readdir:async()=>({files:[...files.keys()].map(path=>({name:path.split('/').at(-1)!,type:'file' as const}))}),deleteFile:async({path}:{path:string})=>{files.delete(path);}}}};
    const started=performance.now(),urls=await synchronizeNativeMedia(assets,modules as never),elapsed=performance.now()-started;
    expect(assets.reduce((total,item)=>total+(item.byteLength??0),0)).toBe(55*1024*1024);expect(files.size).toBe(ASSET_COUNT);expect(urls.size).toBe(ASSET_COUNT);expect(writeFile).toHaveBeenCalledTimes(ASSET_COUNT);expect(elapsed).toBeGreaterThan(0);
  },60_000);
});
