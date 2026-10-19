import { describe,expect,it } from 'vitest';
import { clampPlacement,deterministicRotation,nextZIndex,placementGrid } from './desk-placement';

describe('collection desk placement',()=>{
  const items=Array.from({length:6},(_,index)=>({id:`slot-${index}`,cardId:`card-${index}`,kind:index<2?'owned' as const:'locked' as const}));
  it('creates a deterministic readable grid with restrained rotation',()=>{
    const first=placementGrid(items,700),second=placementGrid(items,700);
    expect(first).toEqual(second);
    expect(first.every(item=>Math.abs(item.rotation)<=4)).toBe(true);
    expect(new Set(first.map(item=>`${item.x}:${item.y}`)).size).toBe(6);
  });
  it('keeps card origins inside the bounded desk',()=>{
    expect(clampPlacement(-20,700,190)).toBe(28);
    expect(clampPlacement(900,700,190)).toBe(482);
  });
  it('raises selection while keeping z-order bounded',()=>{
    const raised=nextZIndex(placementGrid(items,700),'slot-1');
    expect(raised.find(item=>item.id==='slot-1')?.zIndex).toBe(6);
    expect(Math.max(...raised.map(item=>item.zIndex))).toBe(6);
  });
  it('uses stable rotation independent of runtime randomness',()=>expect(deterministicRotation(3)).toBe(deterministicRotation(3)));
});
