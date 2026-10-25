import {beforeAll,describe,expect,it,vi} from 'vitest';
import type {LocalAsset} from '../../domain/models';
import {PlatformMediaProvider,synchronizeNativeMedia} from './media-provider';

let mp3:LocalAsset,wav:LocalAsset;

const bytes=(base64:string)=>Uint8Array.from(atob(base64),character=>character.charCodeAt(0));
const hash=async(base64:string)=>`sha256:${[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes(base64)))].map(value=>value.toString(16).padStart(2,'0')).join('')}`;
const asset=async(id:string,name:string,mime:LocalAsset['mime'],base64:string):Promise<LocalAsset>=>({id,name,mime,dataUrl:`data:${mime};base64,${base64}`,contentHash:await hash(base64),byteLength:bytes(base64).byteLength});

beforeAll(async()=>{mp3=await asset('voice-a','voice.mp3','audio/mpeg','SUQzBAAAAAA=');wav=await asset('voice-b','voice.wav','audio/wav','UklGRgAAAABXQVZF');});

function nativeModules(initial:Record<string,string>={}){
  const files=new Map(Object.entries(initial)),writeFile=vi.fn(async({path,data}:{path:string;data:string})=>{files.set(path,data);return{uri:`file:///Library/NoCloud/${path}`};}),readFile=vi.fn(async({path}:{path:string})=>{const data=files.get(path);if(data===undefined)throw new Error('missing');return{data};}),deleteFile=vi.fn(async({path}:{path:string})=>{files.delete(path);});
  const modules={core:{Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'ios',convertFileSrc:(uri:string)=>`capacitor://localhost/_capacitor_file_${uri.slice(7)}`}},filesystem:{Directory:{LibraryNoCloud:'LIBRARY_NO_CLOUD'},Filesystem:{stat:async({path}:{path:string})=>{const data=files.get(path);if(data===undefined)throw new Error('missing');return{size:bytes(data).byteLength};},readFile,writeFile,getUri:async({path}:{path:string})=>({uri:`file:///Library/NoCloud/${path}`}),readdir:async()=>({files:[...files].map(([path])=>({name:path.split('/').at(-1)!,type:'file' as const}))}),deleteFile}}};
  return{files,writeFile,readFile,deleteFile,modules};
}

describe('platform media provider',()=>{
  it('keeps browser media inline without touching native storage',async()=>{
    const provider=new PlatformMediaProvider();await provider.prepare([mp3]);expect(provider.resolve(mp3)).toBe(mp3.dataUrl);expect(provider.source(mp3)).toBe('inline');expect(provider.resolve(undefined)).toBe('');
  });

  it('writes content-addressed media to persistent iOS storage, reuses it and removes only orphan files',async()=>{
    const{modules,writeFile,deleteFile}=nativeModules({'holorecall-media-v1/orphan.mp3':'AQID'});
    const shared={...mp3,id:'voice-a-shared',name:'shared-voice.mp3'};
    const first=await synchronizeNativeMedia([mp3,shared,wav],modules as never);expect(first.get('voice-a')).toMatch(/^capacitor:\/\/localhost\/_capacitor_file_/);expect(first.get('voice-a-shared')).toBe(first.get('voice-a'));expect(first.get('voice-b')).toContain(`${wav.contentHash!.slice(7)}.wav`);expect(writeFile).toHaveBeenCalledTimes(2);expect(deleteFile).toHaveBeenCalledWith({path:'holorecall-media-v1/orphan.mp3',directory:'LIBRARY_NO_CLOUD'});
    writeFile.mockClear();deleteFile.mockClear();await synchronizeNativeMedia([mp3,wav],modules as never);expect(writeFile).not.toHaveBeenCalled();expect(deleteFile).not.toHaveBeenCalled();
  });

  it('repairs missing, wrong-size and same-size corrupted mirrors from authoritative bytes',async()=>{
    const path=`holorecall-media-v1/${mp3.contentHash!.slice(7)}.mp3`,corrupt=btoa(String.fromCharCode(...bytes('SUQzBAAAAAA=').map(value=>value^0xff))),{modules,files,writeFile}=nativeModules();
    await synchronizeNativeMedia([mp3],modules as never);expect(files.get(path)).toBe('SUQzBAAAAAA=');
    files.set(path,'AQI=');await synchronizeNativeMedia([mp3],modules as never);expect(files.get(path)).toBe('SUQzBAAAAAA=');
    files.set(path,corrupt);expect(await hash(corrupt)).not.toBe(mp3.contentHash);await synchronizeNativeMedia([mp3],modules as never);expect(bytes(corrupt)).toHaveLength(mp3.byteLength!);expect(files.get(path)).toBe('SUQzBAAAAAA=');expect(await hash(files.get(path)!)).toBe(mp3.contentHash);expect(writeFile).toHaveBeenCalledTimes(3);
  });

  it('does not repeatedly verify an unchanged prepared asset set in one app session',async()=>{
    const{modules,readFile}=nativeModules(),provider=new PlatformMediaProvider();
    vi.doMock('@capacitor/core',()=>modules.core);vi.doMock('@capacitor/filesystem',()=>modules.filesystem);
    await provider.prepare([mp3]);const reads=readFile.mock.calls.length;await provider.prepare([mp3]);expect(readFile).toHaveBeenCalledTimes(reads);
    vi.doUnmock('@capacitor/core');vi.doUnmock('@capacitor/filesystem');
  });

  it('falls back to authoritative inline bytes when native reconciliation fails',async()=>{
    const modules={core:{Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'ios',convertFileSrc:(uri:string)=>uri}},filesystem:{Directory:{LibraryNoCloud:'LIBRARY_NO_CLOUD'},Filesystem:{stat:async()=>{throw new Error('missing');},readFile:async()=>{throw new Error('missing');},writeFile:async()=>{throw new Error('disk unavailable');},getUri:async()=>({uri:''}),readdir:async()=>({files:[]}),deleteFile:async()=>{}}}};
    vi.doMock('@capacitor/core',()=>modules.core);vi.doMock('@capacitor/filesystem',()=>modules.filesystem);
    const provider=new PlatformMediaProvider();await provider.prepare([mp3]);expect(provider.source(mp3)).toBe('inline');expect(provider.resolve(mp3)).toBe(mp3.dataUrl);
    vi.doUnmock('@capacitor/core');vi.doUnmock('@capacitor/filesystem');
  });

  it('does not delete existing persistent media when reconciliation fails',async()=>{
    const deleteFile=vi.fn(),modules={core:{Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'ios',convertFileSrc:(uri:string)=>uri}},filesystem:{Directory:{LibraryNoCloud:'LIBRARY_NO_CLOUD'},Filesystem:{stat:async()=>{throw new Error('missing');},readFile:async()=>{throw new Error('missing');},writeFile:async()=>{throw new Error('disk unavailable');},getUri:async()=>({uri:''}),readdir:async()=>({files:[{name:'retained.mp3',type:'file'}]}),deleteFile}}};
    await expect(synchronizeNativeMedia([mp3],modules as never)).rejects.toThrow('disk unavailable');expect(deleteFile).not.toHaveBeenCalled();
  });

  it('does not overwrite or delete a correctly sized mirror when verification cannot read it',async()=>{
    const writeFile=vi.fn(),deleteFile=vi.fn(),modules={core:{Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'ios',convertFileSrc:(uri:string)=>uri}},filesystem:{Directory:{LibraryNoCloud:'LIBRARY_NO_CLOUD'},Filesystem:{stat:async()=>({size:mp3.byteLength}),readFile:async()=>{throw new Error('temporarily unavailable');},writeFile,getUri:async()=>({uri:''}),readdir:async()=>({files:[{name:`${mp3.contentHash!.slice(7)}.mp3`,type:'file'}]}),deleteFile}}};
    await expect(synchronizeNativeMedia([mp3],modules as never)).rejects.toThrow('temporarily unavailable');expect(writeFile).not.toHaveBeenCalled();expect(deleteFile).not.toHaveBeenCalled();
  });

  it('rejects a failed repair read-back without exposing or cleaning native media',async()=>{
    const deleteFile=vi.fn(),getUri=vi.fn(),modules={core:{Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'ios',convertFileSrc:(uri:string)=>uri}},filesystem:{Directory:{LibraryNoCloud:'LIBRARY_NO_CLOUD'},Filesystem:{stat:async()=>({size:mp3.byteLength}),readFile:async()=>({data:btoa('\0'.repeat(mp3.byteLength!))}),writeFile:async()=>({uri:''}),getUri,readdir:async()=>({files:[{name:'retained.mp3',type:'file'}]}),deleteFile}}};
    await expect(synchronizeNativeMedia([mp3],modules as never)).rejects.toThrow('failed integrity verification');expect(getUri).not.toHaveBeenCalled();expect(deleteFile).not.toHaveBeenCalled();
  });
});
