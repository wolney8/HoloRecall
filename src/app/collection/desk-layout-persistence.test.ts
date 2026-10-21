import { afterEach,describe,expect,it,vi } from 'vitest';
import { DESK_LAYOUT_STORAGE_PREFIX,DESK_LAYOUT_VERSION,DeskLayoutPersistence,type DeskLayoutV1,type DeskLayoutV2 } from './desk-layout-persistence';

class MemoryStorage implements Storage {
  private values=new Map<string,string>();
  get length(){return this.values.size;}
  clear(){this.values.clear();}
  getItem(key:string){return this.values.get(key)??null;}
  key(index:number){return [...this.values.keys()][index]??null;}
  removeItem(key:string){this.values.delete(key);}
  setItem(key:string,value:string){this.values.set(key,value);}
}

const layout=(setId='lesson'):DeskLayoutV2=>({version:DESK_LAYOUT_VERSION,setId,mode:'full-set-layout',visibleCount:3,placements:[{cardId:'owned-1',x:120,y:240,rotation:2,zIndex:1}],piles:[{id:'pile-1',x:360,y:240,rotation:-2,zIndex:2,cardIds:['locked-2','owned-3'],expanded:true,page:0}],panX:-40,panY:-20});
const legacy=(setId='lesson'):DeskLayoutV1=>({version:1,setId,mode:'full-set-layout',visibleCount:2,placements:[{cardId:'owned-1',x:120,y:240,rotation:2,zIndex:1},{cardId:'locked-2',x:360,y:240,rotation:-2,zIndex:2}],panX:-40,panY:-20});

describe('DeskLayoutPersistence',()=>{
  afterEach(()=>vi.unstubAllGlobals());
  it('round-trips only the versioned per-set presentation record',()=>{
    const storage=new MemoryStorage();vi.stubGlobal('localStorage',storage);const persistence=new DeskLayoutPersistence(),value=layout();
    expect(persistence.save('lesson',value)).toBe(true);
    expect(persistence.load('lesson')).toEqual(value);
    expect(storage.getItem(`${DESK_LAYOUT_STORAGE_PREFIX}lesson`)).not.toContain('prompt');
    expect(persistence.load('another')).toBeNull();
  });
  it('keeps V1 flat layouts readable without inventing piles',()=>{
    const storage=new MemoryStorage();vi.stubGlobal('localStorage',storage);const persistence=new DeskLayoutPersistence();storage.setItem(persistence.key('lesson'),JSON.stringify(legacy()));
    expect(persistence.load('lesson')).toEqual(legacy());
  });
  it('removes corrupt and unsupported records without throwing',()=>{
    const storage=new MemoryStorage();vi.stubGlobal('localStorage',storage);const persistence=new DeskLayoutPersistence(),key=persistence.key('lesson');
    storage.setItem(key,'{broken');expect(persistence.load('lesson')).toBeNull();expect(storage.getItem(key)).toBeNull();
    storage.setItem(key,JSON.stringify({...layout(),version:99}));expect(persistence.load('lesson')).toBeNull();expect(storage.getItem(key)).toBeNull();
  });
  it('fails closed when presentation storage is unavailable',()=>{
    vi.stubGlobal('localStorage',{getItem(){throw new Error('blocked');},setItem(){throw new Error('quota');},removeItem(){throw new Error('blocked');}});const persistence=new DeskLayoutPersistence();
    expect(persistence.load('lesson')).toBeNull();expect(persistence.save('lesson',layout())).toBe(false);expect(()=>persistence.delete('lesson')).not.toThrow();
  });
  it('deletes one set without clearing another',()=>{
    const storage=new MemoryStorage();vi.stubGlobal('localStorage',storage);const persistence=new DeskLayoutPersistence();persistence.save('a',layout('a'));persistence.save('b',layout('b'));persistence.delete('a');
    expect(persistence.load('a')).toBeNull();expect(persistence.load('b')?.setId).toBe('b');
  });
});
