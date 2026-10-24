import { Injectable, InjectionToken, inject } from '@angular/core';
import type { LocalAsset } from '../../domain/models';

const MEDIA_ROOT='holorecall-media-v1';
const extension:Record<LocalAsset['mime'],string>={'image/png':'png','image/webp':'webp','image/jpeg':'jpg','audio/mpeg':'mp3','audio/wav':'wav'};

export interface MediaProvider {
  prepare(assets:readonly LocalAsset[]):Promise<void>;
  resolve(asset:LocalAsset|undefined):string;
  source(asset:LocalAsset|undefined):'native'|'inline'|'missing';
}

interface NativeMediaModules {
  core:{Capacitor:{isNativePlatform():boolean;getPlatform():string;convertFileSrc(uri:string):string}};
  filesystem:{Directory:{LibraryNoCloud:unknown};Filesystem:{
    stat(options:{path:string;directory:unknown}):Promise<{size:number}>;
    writeFile(options:{path:string;data:string;directory:unknown;recursive:boolean}):Promise<{uri:string}>;
    getUri(options:{path:string;directory:unknown}):Promise<{uri:string}>;
    readdir(options:{path:string;directory:unknown}):Promise<{files:Array<{name:string;type:'file'|'directory'}>}>;
    deleteFile(options:{path:string;directory:unknown}):Promise<void>;
  }};
}

const loadNativeMediaModules=async():Promise<NativeMediaModules>=>({
  core:await import('@capacitor/core'),
  filesystem:await import('@capacitor/filesystem'),
}) as unknown as NativeMediaModules;

function base64Payload(asset:LocalAsset):string{
  const marker=`data:${asset.mime};base64,`;
  if(!asset.dataUrl.startsWith(marker))throw new Error(`Media ${asset.name} has invalid encoded bytes.`);
  return asset.dataUrl.slice(marker.length);
}

function contentPath(asset:LocalAsset):string|undefined{
  const hash=asset.contentHash?.match(/^sha256:([a-f0-9]{64})$/)?.[1];
  return hash?`${MEDIA_ROOT}/${hash}.${extension[asset.mime]}`:undefined;
}

/** Mirrors validated media into one app-owned persistent directory and returns
 * WKWebView-safe URLs. Domain/card references remain stable asset IDs. */
export async function synchronizeNativeMedia(assets:readonly LocalAsset[],modules:NativeMediaModules):Promise<Map<string,string>>{
  if(!modules.core.Capacitor.isNativePlatform()||modules.core.Capacitor.getPlatform()!=='ios')return new Map();
  const directory=modules.filesystem.Directory.LibraryNoCloud,expected=new Set<string>(),byPath=new Map<string,LocalAsset[]>(),urls=new Map<string,string>();
  for(const asset of assets){const path=contentPath(asset);if(!path)continue;expected.add(path.slice(MEDIA_ROOT.length+1));byPath.set(path,[...(byPath.get(path)??[]),asset]);}
  for(const [path,matching] of byPath){
    const asset=matching[0]!,expectedBytes=asset.byteLength;
    let currentSize:number|undefined;
    try{currentSize=(await modules.filesystem.Filesystem.stat({path,directory})).size;}catch{currentSize=undefined;}
    if(currentSize===undefined||expectedBytes!==undefined&&currentSize!==expectedBytes)await modules.filesystem.Filesystem.writeFile({path,data:base64Payload(asset),directory,recursive:true});
    const uri=(await modules.filesystem.Filesystem.getUri({path,directory})).uri,url=modules.core.Capacitor.convertFileSrc(uri);
    for(const item of matching)urls.set(item.id,url);
  }
  let files:Array<{name:string;type:'file'|'directory'}>=[];
  try{files=(await modules.filesystem.Filesystem.readdir({path:MEDIA_ROOT,directory})).files;}catch{files=[];}
  for(const file of files)if(file.type==='file'&&!expected.has(file.name))await modules.filesystem.Filesystem.deleteFile({path:`${MEDIA_ROOT}/${file.name}`,directory});
  return urls;
}

@Injectable({providedIn:'root'})
export class PlatformMediaProvider implements MediaProvider{
  private nativeUrls=new Map<string,string>();
  private preparedSignature='';
  async prepare(assets:readonly LocalAsset[]):Promise<void>{
    const signature=assets.map(asset=>`${asset.id}:${asset.contentHash??''}:${asset.byteLength??''}:${asset.mime}`).sort().join('|');
    if(signature===this.preparedSignature)return;
    try{
      this.nativeUrls=await synchronizeNativeMedia(assets,await loadNativeMediaModules());
      this.preparedSignature=signature;
    }catch{
      this.nativeUrls=new Map();
      this.preparedSignature='';
    }
  }
  resolve(asset:LocalAsset|undefined):string{return asset?this.nativeUrls.get(asset.id)??asset.dataUrl:'';}
  source(asset:LocalAsset|undefined):'native'|'inline'|'missing'{return!asset?'missing':this.nativeUrls.has(asset.id)?'native':'inline';}
}

export const MEDIA_PROVIDER=new InjectionToken<MediaProvider>('HoloRecall media provider',{providedIn:'root',factory:()=>inject(PlatformMediaProvider)});
