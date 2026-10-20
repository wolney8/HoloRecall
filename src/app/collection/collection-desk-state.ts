import { Injectable, signal } from '@angular/core';
import type { DeskCardPlacement } from './desk-placement';

export type DeskMode='set-stack'|'collected-layout'|'full-set-layout'|'owned-stack';

@Injectable({providedIn:'root'})
export class CollectionDeskState {
  readonly setId=signal('');
  readonly mode=signal<DeskMode>('set-stack');
  readonly placements=signal<DeskCardPlacement[]>([]);
  readonly selectedId=signal('');
  readonly dealtOwnedIds=signal<string[]>([]);
  readonly shuffledOwnedIds=signal<string[]>([]);
  readonly visibleCount=signal(0);
  readonly panX=signal(0);
  readonly panY=signal(0);

  open(setId:string):void {
    if(this.setId()===setId)return;
    this.setId.set(setId);this.reset();
  }
  reset():void {this.mode.set('set-stack');this.placements.set([]);this.selectedId.set('');this.dealtOwnedIds.set([]);this.shuffledOwnedIds.set([]);this.visibleCount.set(0);this.panX.set(0);this.panY.set(0);}
  clear():void {this.setId.set('');this.reset();}
}
