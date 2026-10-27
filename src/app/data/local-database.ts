import type { LocalAsset, State } from '../../domain/models';
import { migrateState } from '../../domain/migrations';
import { validateState } from '../../domain/backup';
import type { StudyPersistence } from './study-persistence';

const STORE='local-study',MEDIA='local-media',KEY='snapshot';
type PersistedAsset=Omit<LocalAsset,'dataUrl'>&{dataUrl?:string};
type PersistedState=Omit<State,'assets'>&{assets:PersistedAsset[]};
export class StaleStateError extends Error{constructor(){super('Your study data changed in another tab. Nothing was overwritten. Reload your data and try again.');}}

/** State metadata and media payloads share one transaction, but routine reviews never rewrite media bytes. */
export class LocalDatabase implements StudyPersistence{
  private connection?:Promise<IDBDatabase>;
  constructor(private readonly name='holorecall-local-v1'){}
  private open():Promise<IDBDatabase>{
    if(!this.connection)this.connection=new Promise<IDBDatabase>((resolve,reject)=>{
      if(!globalThis.indexedDB){reject(new Error('Local data storage is unavailable. Enable storage for HoloRecall on this device, then reload.'));return;}
      const request=indexedDB.open(this.name,2);let failed=false;
      request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);if(!db.objectStoreNames.contains(MEDIA))db.createObjectStore(MEDIA);};
      request.onerror=()=>{failed=true;reject(request.error??new Error("HoloRecall couldn't open your local data."));};
      request.onblocked=()=>{failed=true;reject(new Error('Another HoloRecall tab is using your local data. Close other HoloRecall tabs and try again.'));};
      request.onsuccess=()=>{if(failed){request.result.close();return;}request.result.onversionchange=()=>{request.result.close();this.connection=undefined;};resolve(request.result);};
    }).catch(error=>{this.connection=undefined;throw error;});return this.connection;
  }
  private persisted(state:State):PersistedState{return{...state,assets:state.assets.map(({dataUrl,...asset})=>asset)};}
  private mediaKey(asset:PersistedAsset):string{return asset.contentHash??`asset:${asset.id}`;}
  private hydrate(raw:PersistedState,media:IDBObjectStore,done:(state:State)=>void,fail:(error:unknown)=>void):void{
    const assets=raw.assets??[];if(!assets.length){done({...raw,assets:[]} as State);return;}
    const hydrated:LocalAsset[]=new Array(assets.length);let remaining=assets.length;
    assets.forEach((asset,index)=>{
      if(asset.dataUrl){hydrated[index]=asset as LocalAsset;if(!--remaining)done({...raw,assets:hydrated} as State);return;}
      const request=media.get(this.mediaKey(asset));
      request.onsuccess=()=>{if(typeof request.result!=='string'){fail(new Error(`Stored media ${asset.name} is unavailable. Restore a backup or reimport its package.`));return;}hydrated[index]={...asset,dataUrl:request.result};if(!--remaining)done({...raw,assets:hydrated} as State);};
      request.onerror=()=>fail(request.error??new Error("HoloRecall couldn't read local media."));
    });
  }
  private stageMedia(media:IDBObjectStore,state:State,existingKeys=new Set<string>()):void{for(const asset of state.assets){const key=this.mediaKey(asset);if(!existingKeys.has(key))media.put(asset.dataUrl,key);}}
  async load(initial:State):Promise<State>{const db=await this.open();return new Promise((resolve,reject)=>{
    const transaction=db.transaction([STORE,MEDIA],'readwrite'),store=transaction.objectStore(STORE),media=transaction.objectStore(MEDIA),request=store.get(KEY);let result:State,validationError:unknown;
    const fail=(error:unknown)=>{validationError=error;transaction.abort();};
    request.onsuccess=()=>{try{if(request.result===undefined){validateState(initial);result=initial;store.add(this.persisted(initial),KEY);}else this.hydrate(request.result as PersistedState,media,hydrated=>{try{result=migrateState(hydrated,initial.cards);const raw=request.result as PersistedState,changed=raw.schemaVersion!==result.schemaVersion||raw.assets.some(asset=>!!asset.dataUrl);if(changed){store.add(request.result,`migration-v${raw.schemaVersion}-original`);this.stageMedia(media,result);store.put(this.persisted(result),KEY);}}catch(error){fail(error);}},fail);}catch(error){fail(error);}};
    transaction.oncomplete=()=>resolve(result);transaction.onerror=()=>reject(validationError??transaction.error??new Error("HoloRecall couldn't read your local data."));transaction.onabort=()=>reject(validationError??transaction.error??new Error('Reading your local data was interrupted.'));
  });}
  async commit(next:State,expectedVersion:number):Promise<State>{validateState(next);if(next.version!==expectedVersion+1)throw new Error("HoloRecall couldn't save this change. Reload your data and try again.");const db=await this.open();return new Promise((resolve,reject)=>{
    const transaction=db.transaction([STORE,MEDIA],'readwrite'),store=transaction.objectStore(STORE),media=transaction.objectStore(MEDIA),request=store.get(KEY);let failure:unknown;
    const fail=(error:unknown)=>{failure=error;transaction.abort();};
    request.onsuccess=()=>{try{const current=request.result as PersistedState|undefined;if(!current)throw new Error('Local study data is unavailable. Reload before saving.');if(current.version!==expectedVersion)throw new StaleStateError();const existingKeys=new Set((current.assets??[]).map(asset=>this.mediaKey(asset)));this.stageMedia(media,next,existingKeys);const retained=new Set(next.assets.map(asset=>this.mediaKey(asset)));for(const key of existingKeys)if(!retained.has(key))media.delete(key);store.put(this.persisted(next),KEY);}catch(error){fail(error);}};
    transaction.oncomplete=()=>resolve(next);transaction.onerror=()=>reject(failure??transaction.error??new Error('Could not save. Your review was not recorded.'));transaction.onabort=()=>reject(failure??transaction.error??new Error('Save interrupted. Your review was not recorded.'));
  });}
  async close():Promise<void>{(await this.connection)?.close();this.connection=undefined;}
}
