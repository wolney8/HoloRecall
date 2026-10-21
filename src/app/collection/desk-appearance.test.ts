import { afterEach,describe,expect,it,vi } from 'vitest';
import { DEFAULT_DESK_APPEARANCE_ID,DESK_APPEARANCE_PRESETS,DESK_APPEARANCE_STORAGE_KEY,DESK_APPEARANCE_VERSION,DeskAppearancePersistence } from './desk-appearance';

class MemoryStorage implements Storage {
  private values=new Map<string,string>();
  get length(){return this.values.size;}
  clear(){this.values.clear();}
  getItem(key:string){return this.values.get(key)??null;}
  key(index:number){return [...this.values.keys()][index]??null;}
  removeItem(key:string){this.values.delete(key);}
  setItem(key:string,value:string){this.values.set(key,value);}
}

describe('DeskAppearancePersistence',()=>{
  afterEach(()=>vi.unstubAllGlobals());

  it('defines one bounded curated family with Holo Grid as the default',()=>{
    expect(DESK_APPEARANCE_PRESETS.map(preset=>preset.id)).toEqual(['holo-grid','midnight-felt','walnut','graphite','aurora']);
    expect(DEFAULT_DESK_APPEARANCE_ID).toBe('holo-grid');
  });

  it('round-trips the versioned global presentation preference',()=>{
    const storage=new MemoryStorage();vi.stubGlobal('localStorage',storage);const persistence=new DeskAppearancePersistence();
    expect(persistence.load()).toBe('holo-grid');
    expect(persistence.save('walnut')).toBe(true);
    expect(persistence.load()).toBe('walnut');
    expect(JSON.parse(storage.getItem(DESK_APPEARANCE_STORAGE_KEY)!)).toEqual({version:DESK_APPEARANCE_VERSION,presetId:'walnut'});
  });

  it('falls back safely for corrupt, unsupported and unknown values',()=>{
    const storage=new MemoryStorage();vi.stubGlobal('localStorage',storage);const persistence=new DeskAppearancePersistence();
    for(const value of ['{broken',JSON.stringify({version:99,presetId:'walnut'}),JSON.stringify({version:1,presetId:'neon-rainbow'})]){
      storage.setItem(DESK_APPEARANCE_STORAGE_KEY,value);
      expect(persistence.load()).toBe('holo-grid');
    }
  });

  it('keeps storage failure non-fatal',()=>{
    vi.stubGlobal('localStorage',{getItem(){throw new Error('blocked');},setItem(){throw new Error('quota');}});const persistence=new DeskAppearancePersistence();
    expect(persistence.load()).toBe('holo-grid');
    expect(persistence.save('aurora')).toBe(false);
  });
});
