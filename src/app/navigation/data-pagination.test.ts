import { describe,expect,it } from 'vitest';
import { clampPageIndex,pageItems } from './data-page';

describe('data pagination',()=>{
  const rows=Array.from({length:53},(_,index)=>index+1);
  it('returns first, middle, and final partial pages',()=>{
    expect(pageItems(rows,0,25)).toEqual(rows.slice(0,25));
    expect(pageItems(rows,1,25)).toEqual(rows.slice(25,50));
    expect(pageItems(rows,2,25)).toEqual([51,52,53]);
  });
  it('clamps stale pages after filtering or deletion',()=>{
    expect(clampPageIndex(6,10,53)).toBe(5);
    expect(clampPageIndex(2,25,24)).toBe(0);
    expect(pageItems(rows.slice(0,24),2,25)).toEqual(rows.slice(0,24));
  });
  it('normalizes invalid indexes and sizes',()=>{
    expect(clampPageIndex(-2,25,53)).toBe(0);
    expect(pageItems(rows,-2,0)).toEqual([1]);
  });
});
