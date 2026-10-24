import {describe,expect,it,vi} from 'vitest';
import type {LocalAsset} from '../../domain/models';
import {PlatformMediaProvider,synchronizeNativeMedia} from './media-provider';

const mp3:LocalAsset={id:'voice-a',name:'voice.mp3',mime:'audio/mpeg',dataUrl:'data:audio/mpeg;base64,SUQzBAAAAAA=',contentHash:`sha256:${'a'.repeat(64)}`,byteLength:8};
const wav:LocalAsset={id:'voice-b',name:'voice.wav',mime:'audio/wav',dataUrl:'data:audio/wav;base64,UklGRgAAAABXQVZF',contentHash:`sha256:${'b'.repeat(64)}`,byteLength:12};

describe('platform media provider',()=>{
  it('keeps browser media inline without touching native storage',async()=>{
    const provider=new PlatformMediaProvider();await provider.prepare([mp3]);expect(provider.resolve(mp3)).toBe(mp3.dataUrl);expect(provider.source(mp3)).toBe('inline');expect(provider.resolve(undefined)).toBe('');
  });

  it('writes content-addressed media to persistent iOS storage, reuses it and removes only orphan files',async()=>{
    const files=new Map<string,number>([['holorecall-media-v1/orphan.mp3',3]]),writeFile=vi.fn(async({path,data}:{path:string;data:string})=>{files.set(path,Math.floor(data.length*3/4)-(data.endsWith('==')?2:data.endsWith('=')?1:0));return{uri:`file:///Library/NoCloud/${path}`};}),deleteFile=vi.fn(async({path}:{path:string})=>{files.delete(path);});
    const modules={core:{Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'ios',convertFileSrc:(uri:string)=>`capacitor://localhost/_capacitor_file_${uri.slice(7)}`}},filesystem:{Directory:{LibraryNoCloud:'LIBRARY_NO_CLOUD'},Filesystem:{stat:async({path}:{path:string})=>{const size=files.get(path);if(size===undefined)throw new Error('missing');return{size};},writeFile,getUri:async({path}:{path:string})=>({uri:`file:///Library/NoCloud/${path}`}),readdir:async()=>({files:[...files].map(([path,size])=>({name:path.split('/').at(-1)!,type:'file' as const,size}))}),deleteFile}}};
    const shared={...mp3,id:'voice-a-shared',name:'shared-voice.mp3'};
    const first=await synchronizeNativeMedia([mp3,shared,wav],modules as never);expect(first.get('voice-a')).toMatch(/^capacitor:\/\/localhost\/_capacitor_file_/);expect(first.get('voice-a-shared')).toBe(first.get('voice-a'));expect(first.get('voice-b')).toContain(`${'b'.repeat(64)}.wav`);expect(writeFile).toHaveBeenCalledTimes(2);expect(deleteFile).toHaveBeenCalledWith({path:'holorecall-media-v1/orphan.mp3',directory:'LIBRARY_NO_CLOUD'});
    writeFile.mockClear();await synchronizeNativeMedia([mp3,wav],modules as never);expect(writeFile).not.toHaveBeenCalled();
  });

  it('does not delete existing persistent media when reconciliation fails',async()=>{
    const deleteFile=vi.fn(),modules={core:{Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'ios',convertFileSrc:(uri:string)=>uri}},filesystem:{Directory:{LibraryNoCloud:'LIBRARY_NO_CLOUD'},Filesystem:{stat:async()=>{throw new Error('missing');},writeFile:async()=>{throw new Error('disk unavailable');},getUri:async()=>({uri:''}),readdir:async()=>({files:[{name:'retained.mp3',type:'file'}]}),deleteFile}}};
    await expect(synchronizeNativeMedia([mp3],modules as never)).rejects.toThrow('disk unavailable');expect(deleteFile).not.toHaveBeenCalled();
  });
});
