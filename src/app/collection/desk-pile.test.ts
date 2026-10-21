import { describe,expect,it } from 'vitest';
import { fanExtent,fanGeometry,fanPageCount,pileMember,removePileMember,restoredPileMember,visiblePileMembers,type DeskPile } from './desk-pile';

const pile=(count:number):DeskPile=>({id:'pile-1',x:40,y:60,rotation:1,zIndex:3,expanded:true,page:0,members:Array.from({length:count},(_,index)=>({id:`owned-${index}`,cardId:`card-${index}`,kind:'owned',face:index?'answer':'recall'}))});

describe('Desk piles',()=>{
  it('keeps explicit top-first order and restores Collection Answer-first faces',()=>{
    expect(pileMember({id:'owned-a',cardId:'a',kind:'owned',face:'recall'}).face).toBe('recall');
    expect(restoredPileMember({id:'owned-a',cardId:'a',kind:'owned'}).face).toBe('answer');
  });

  it('bounds a fan to twelve deterministic objects per page',()=>{
    const value=pile(30);expect(fanPageCount(value)).toBe(3);expect(visiblePileMembers(value)).toHaveLength(12);
    expect(fanGeometry(0,6)).toEqual({x:0,y:17.5,rotation:-3.5});expect(fanGeometry(5,6)).toEqual({x:1040,y:17.5,rotation:3.5});
    expect(fanExtent(30)).toEqual({width:1230,height:617});
  });

  it('normalises the current page after extraction',()=>{
    const value={...pile(13),page:1};const next=removePileMember(value,'owned-12');expect(next.members).toHaveLength(12);expect(next.page).toBe(0);
  });
});
