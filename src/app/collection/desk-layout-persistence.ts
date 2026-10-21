import { Injectable } from '@angular/core';

export const DESK_LAYOUT_VERSION=2 as const;
export const LEGACY_DESK_LAYOUT_VERSION=1 as const;
export const DESK_LAYOUT_STORAGE_PREFIX='holorecall:collection-desk:v1:';
export type PersistedDeskMode='collected-layout'|'full-set-layout'|'owned-stack';

export interface PersistedDeskPlacement {
  cardId:string;
  x:number;
  y:number;
  rotation:number;
  zIndex:number;
}

export interface DeskLayoutV1 {
  version:typeof LEGACY_DESK_LAYOUT_VERSION;
  setId:string;
  mode:PersistedDeskMode;
  visibleCount:number;
  placements:PersistedDeskPlacement[];
  panX:number;
  panY:number;
}

export interface PersistedDeskPile {
  id:string;
  x:number;
  y:number;
  rotation:number;
  zIndex:number;
  cardIds:string[];
  expanded:boolean;
  page:number;
}

export interface DeskLayoutV2 extends Omit<DeskLayoutV1,'version'> {
  version:typeof DESK_LAYOUT_VERSION;
  piles:PersistedDeskPile[];
}

export type DeskLayout=DeskLayoutV1|DeskLayoutV2;

@Injectable({providedIn:'root'})
export class DeskLayoutPersistence {
  load(setId:string):DeskLayout|null {
    const storage=this.storage(),key=this.key(setId);if(!storage)return null;
    try {
      const raw=storage.getItem(key);if(!raw)return null;
      const value=JSON.parse(raw) as Partial<Omit<DeskLayoutV2,'version'>>&{version?:number};
      const supported=value.version===LEGACY_DESK_LAYOUT_VERSION||value.version===DESK_LAYOUT_VERSION;
      const pilesValid=value.version!==DESK_LAYOUT_VERSION||Array.isArray(value.piles);
      if(!supported||value.setId!==setId||!this.mode(value.mode)||!Array.isArray(value.placements)||!pilesValid){storage.removeItem(key);return null;}
      return value as DeskLayout;
    } catch {try{storage.removeItem(key);}catch{/* Non-critical presentation storage. */}return null;}
  }

  save(setId:string,layout:DeskLayoutV2):boolean {
    const storage=this.storage();if(!storage)return false;
    try{storage.setItem(this.key(setId),JSON.stringify(layout));return true;}catch{return false;}
  }

  delete(setId:string):void {try{this.storage()?.removeItem(this.key(setId));}catch{/* Non-critical presentation storage. */}}
  clearInvalid(setId:string):void {this.load(setId);}
  key(setId:string):string{return `${DESK_LAYOUT_STORAGE_PREFIX}${encodeURIComponent(setId)}`;}

  private mode(value:unknown):value is PersistedDeskMode{return value==='collected-layout'||value==='full-set-layout'||value==='owned-stack';}
  private storage():Storage|undefined {try{return globalThis.localStorage;}catch{return undefined;}}
}
