import { describe,expect,it } from 'vitest';
import { CollectionDeskState } from './collection-desk-state';
import { createDeskPlacement } from './desk-placement';

describe('CollectionDeskState session boundary',()=>{
  it('preserves a deliberate face only for an explicit inspection return',()=>{
    const state=new CollectionDeskState();expect(state.open('lesson')).toBe('fresh');state.placements.set([{...createDeskPlacement({id:'owned-card',cardId:'card',kind:'owned'},{x:10,y:20,rotation:0,zIndex:1}),face:'answer'}]);
    state.preserveForInspection('lesson');expect(state.open('lesson')).toBe('inspection-resume');expect(state.placements()[0]?.face).toBe('answer');
    expect(state.open('lesson')).toBe('fresh');expect(state.placements()).toEqual([]);
  });
  it('restores settled placements unselected with no shuffled order',()=>{
    const state=new CollectionDeskState(),placement=createDeskPlacement({id:'owned-card',cardId:'card',kind:'owned'},{x:10,y:20,rotation:0,zIndex:1});
    state.restore('lesson','owned-stack',[placement],1,-4,-8);
    expect(state.selectedId()).toBe('');expect(state.shuffledOwnedIds()).toEqual([]);expect(state.dealtOwnedIds()).toEqual(['card']);expect(state.placements()[0]?.face).toBe('answer');
  });
});
