import { Injectable } from '@angular/core';

export const DESK_APPEARANCE_VERSION=1 as const;
export const DESK_APPEARANCE_STORAGE_KEY='holorecall:collection-desk:appearance:v1';
export const DEFAULT_DESK_APPEARANCE_ID='holo-grid' as const;

export type DeskAppearanceId='holo-grid'|'midnight-felt'|'walnut'|'graphite'|'aurora';

export interface DeskAppearancePreset {
  id:DeskAppearanceId;
  name:string;
  description:string;
}

export const DESK_APPEARANCE_PRESETS:readonly DeskAppearancePreset[]=[
  {id:'holo-grid',name:'Holo Grid',description:'Dark technical surface with subtle geometry.'},
  {id:'midnight-felt',name:'Midnight Felt',description:'Soft, deep felt with a quiet fibre texture.'},
  {id:'walnut',name:'Walnut',description:'Restrained warm grain and dark table trim.'},
  {id:'graphite',name:'Graphite',description:'Minimal matte charcoal with low distraction.'},
  {id:'aurora',name:'Aurora',description:'Dark cool surface with a restrained prismatic glow.'},
] as const;

interface StoredDeskAppearanceV1 {
  version:typeof DESK_APPEARANCE_VERSION;
  presetId:DeskAppearanceId;
}

export function isDeskAppearanceId(value:unknown):value is DeskAppearanceId {
  return DESK_APPEARANCE_PRESETS.some(preset=>preset.id===value);
}

@Injectable({providedIn:'root'})
export class DeskAppearancePersistence {
  load():DeskAppearanceId {
    const storage=this.storage();if(!storage)return DEFAULT_DESK_APPEARANCE_ID;
    try {
      const raw=storage.getItem(DESK_APPEARANCE_STORAGE_KEY);if(!raw)return DEFAULT_DESK_APPEARANCE_ID;
      const value=JSON.parse(raw) as Partial<StoredDeskAppearanceV1>;
      return value.version===DESK_APPEARANCE_VERSION&&isDeskAppearanceId(value.presetId)?value.presetId:DEFAULT_DESK_APPEARANCE_ID;
    } catch {return DEFAULT_DESK_APPEARANCE_ID;}
  }

  save(presetId:DeskAppearanceId):boolean {
    const storage=this.storage();if(!storage)return false;
    const value:StoredDeskAppearanceV1={version:DESK_APPEARANCE_VERSION,presetId};
    try{storage.setItem(DESK_APPEARANCE_STORAGE_KEY,JSON.stringify(value));return true;}catch{return false;}
  }

  private storage():Storage|undefined {try{return globalThis.localStorage;}catch{return undefined;}}
}
