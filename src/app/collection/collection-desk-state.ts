import { Injectable, signal } from '@angular/core';
import type { DeskCardPlacement } from './desk-placement';
import type { DeskPile } from './desk-pile';

export type DeskMode='set-stack'|'collected-layout'|'full-set-layout'|'owned-stack';

@Injectable({providedIn:'root'})
export class CollectionDeskState {
  readonly setId=signal('');
  readonly mode=signal<DeskMode>('set-stack');
  readonly placements=signal<DeskCardPlacement[]>([]);
  readonly piles=signal<DeskPile[]>([]);
  readonly selectedId=signal('');
  readonly selectedPileId=signal('');
  readonly dealtOwnedIds=signal<string[]>([]);
  readonly shuffledOwnedIds=signal<string[]>([]);
  readonly visibleCount=signal(0);
  readonly panX=signal(0);
  readonly panY=signal(0);
  private inspectionResumeSetId='';

  open(setId:string):'fresh'|'inspection-resume' {
    if(this.setId()===setId&&this.inspectionResumeSetId===setId){this.inspectionResumeSetId='';return'inspection-resume';}
    this.inspectionResumeSetId='';this.setId.set(setId);this.reset();return'fresh';
  }
  preserveForInspection(setId:string):void {if(this.setId()===setId)this.inspectionResumeSetId=setId;}
  restore(setId:string,mode:DeskMode,placements:DeskCardPlacement[],piles:DeskPile[],visibleCount:number,panX:number,panY:number):void {
    this.setId.set(setId);this.mode.set(mode);this.placements.set(placements);this.piles.set(piles);this.selectedId.set('');this.selectedPileId.set('');this.dealtOwnedIds.set([...placements,...piles.flatMap(pile=>pile.members)].filter(item=>item.kind==='owned').map(item=>item.cardId));this.shuffledOwnedIds.set([]);this.visibleCount.set(visibleCount);this.panX.set(panX);this.panY.set(panY);
  }
  reset():void {this.mode.set('set-stack');this.placements.set([]);this.piles.set([]);this.selectedId.set('');this.selectedPileId.set('');this.dealtOwnedIds.set([]);this.shuffledOwnedIds.set([]);this.visibleCount.set(0);this.panX.set(0);this.panY.set(0);}
  clear():void {this.inspectionResumeSetId='';this.setId.set('');this.reset();}
}
