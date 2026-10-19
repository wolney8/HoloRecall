import { Component, DestroyRef, ElementRef, EventEmitter, inject, input, Output, signal, computed, effect, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { gsap } from 'gsap';
import type { CardContent, Rarity } from '../../domain/models';
import { activeCollectibleCards, cardsInCollectionScope, deckCollectionProgress, isCollected, lockedCollectibleTeaser, topLevelCollectionProgress, type LockedCollectibleTeaser } from '../../domain/collection';
import { prestigeProgress, RARITIES } from '../../domain/rewards';
import { reducedMotion } from '../card-effects';
import { FlashcardComponent } from '../card';
import { CardMotionViewportComponent } from '../card-motion-viewport';
import { LocalStudyStore } from '../data/study-store';
import { LockedCollectibleComponent } from './locked-collectible';
import { CollectionDeskState } from './collection-desk-state';
import { DeskStackComponent } from './desk-stack';
import { clampPlacement, DESK_BATCH_SIZE, DESK_LAYOUT_PAGE, nextZIndex, placementGrid, type DeskCardPlacement } from './desk-placement';

interface DragSession {id:string;pointerId:number;startX:number;startY:number;originX:number;originY:number;dragging:boolean;element:HTMLElement}

@Component({
  selector:'hr-collection-desk',standalone:true,
  imports:[MatButtonModule,MatProgressBarModule,FlashcardComponent,CardMotionViewportComponent,LockedCollectibleComponent,DeskStackComponent],
  templateUrl:'./collection-desk.html',styleUrl:'./collection-desk.css',
})
export class CollectionDeskComponent {
  readonly Math=Math;
  readonly setId=input('');
  @Output() readonly closed=new EventEmitter<string>();@Output() readonly setOpened=new EventEmitter<string>();@Output() readonly inspectCard=new EventEmitter<string>();@Output() readonly practiceCards=new EventEmitter<string[]>();
  readonly store=inject(LocalStudyStore);readonly deskState=inject(CollectionDeskState);private readonly destroyRef=inject(DestroyRef);
  @ViewChild('deskCanvas') private deskCanvas?:ElementRef<HTMLElement>;
  readonly tiers=RARITIES;readonly lockedSelected=signal<LockedCollectibleTeaser|null>(null);
  private drag?:DragSession;private tweens:gsap.core.Tween[]=[];
  readonly state=computed(()=>this.store.data());
  readonly setProgress=computed(()=>this.state()?topLevelCollectionProgress(this.state()!):[]);
  readonly activeSet=computed(()=>this.store.decks().find(deck=>deck.id===this.setId()));
  readonly cards=computed(()=>this.state()&&this.setId()?cardsInCollectionScope(this.state()!,this.setId()):[]);
  readonly progress=computed(()=>this.state()&&this.setId()?deckCollectionProgress(this.state()!,this.setId()):null);
  readonly slots=computed(()=>{const state=this.state(),cards=this.cards();if(!state)return[];return cards.map(card=>isCollected(state,card.id)?{id:`owned-${card.id}`,kind:'owned' as const,cardId:card.id,card}:{id:`locked-${card.id}`,kind:'locked' as const,cardId:card.id,teaser:lockedCollectibleTeaser(state,card,cards)});});
  readonly ownedCards=computed(()=>{const state=this.state();return state?activeCollectibleCards(state).filter(card=>isCollected(state,card.id)&&this.cards().some(scope=>scope.id===card.id)):[];});
  readonly selectedPlacement=computed(()=>this.deskState.placements().find(item=>item.id===this.deskState.selectedId()));
  readonly selectedCard=computed(()=>{const placement=this.selectedPlacement();return placement?.kind==='owned'?this.card(placement.cardId):undefined;});
  readonly selectedLocked=computed(()=>{const placement=this.selectedPlacement();const slot=placement?.kind==='locked'?this.slots().find(item=>item.id===placement.id):undefined;return slot?.kind==='locked'?slot.teaser:null;});
  readonly setStackCount=computed(()=>Math.max(0,this.cards().length-this.deskState.placements().length));
  readonly canvasHeight=computed(()=>{const rows=Math.ceil(Math.max(1,this.deskState.placements().length)/Math.max(1,Math.floor(this.canvasWidth()/214)));return Math.max(520,rows*309+48);});

  constructor(){
    effect(()=>{const id=this.setId();if(id)this.deskState.open(id);else if(this.deskState.setId())this.deskState.clear();});
    this.destroyRef.onDestroy(()=>this.tweens.forEach(tween=>tween.kill()));
  }
  canvasWidth():number{return this.deskCanvas?.nativeElement.clientWidth||900;}
  motionReduced():boolean{const preference=this.state()?.preferences.motion??'system';return reducedMotion(preference,matchMedia('(prefers-reduced-motion: reduce)').matches);}
  openSet(id:string):void{this.setOpened.emit(id);}
  close():void{this.closed.emit(this.setId());}
  card(id:string):CardContent|undefined{return this.state()?.cards.find(card=>card.id===id);}
  teaser(id:string):LockedCollectibleTeaser|undefined{const slot=this.slots().find(item=>item.id===id);return slot?.kind==='locked'?slot.teaser:undefined;}
  prestige(card:CardContent){return this.state()?prestigeProgress(this.state()!,card.id):{level:0,cycle:1,days:0,required:3,capped:false};}
  roman(level:number){return['','I','II','III','IV','V','VI','VII','VIII','IX','X'][level]??'';}
  tierName(rarity:Rarity){return this.tiers.find(tier=>tier.id===rarity)?.label??'Common';}
  frameUrl(card:CardContent){const design=this.store.designFor(card);return this.store.mediaUrl(design?.frames?.[card.rarity??'common']||design?.frame);}

  layOutSet(more=false):void{
    const previous=this.deskState.placements(),count=Math.min(this.slots().length,more?this.deskState.visibleSetCount()+DESK_LAYOUT_PAGE:DESK_LAYOUT_PAGE),items=this.slots().slice(0,count).map(slot=>({id:slot.id,cardId:slot.cardId,kind:slot.kind}));
    this.deskState.mode.set('set-layout');this.deskState.visibleSetCount.set(count);this.deskState.placements.set(placementGrid(items,this.canvasWidth()));this.deskState.selectedId.set('');this.lockedSelected.set(null);
    this.animateIncoming(this.deskState.placements().filter(item=>!previous.some(old=>old.id===item.id)).map(item=>item.id));
  }
  shuffleCollected():void{
    const ids=this.ownedCards().map(card=>card.id);for(let index=ids.length-1;index>0;index--){const swap=Math.floor(Math.random()*(index+1));[ids[index],ids[swap]]=[ids[swap]!,ids[index]!];}
    this.deskState.mode.set('owned-stack');this.deskState.shuffledOwnedIds.set(ids);this.deskState.dealtOwnedIds.set([]);this.deskState.placements.set([]);this.deskState.selectedId.set('');this.lockedSelected.set(null);
  }
  deal():void{
    const order=this.deskState.shuffledOwnedIds().length?this.deskState.shuffledOwnedIds():this.ownedCards().map(card=>card.id),dealt=this.deskState.dealtOwnedIds(),next=order.slice(dealt.length,dealt.length+DESK_BATCH_SIZE),all=[...dealt,...next];
    this.deskState.mode.set('owned-stack');this.deskState.dealtOwnedIds.set(all);this.deskState.placements.set(placementGrid(all.map(id=>({id:`owned-${id}`,cardId:id,kind:'owned'})),this.canvasWidth()));this.animateIncoming(next.map(id=>`owned-${id}`));
  }
  gather():void{this.deskState.placements.update(items=>items.filter(item=>item.kind==='locked'));this.deskState.dealtOwnedIds.set([]);this.deskState.selectedId.set('');}
  reset():void{this.deskState.reset();this.lockedSelected.set(null);}
  returnSelected():void{const placement=this.selectedPlacement();if(!placement)return;this.deskState.placements.update(items=>items.filter(item=>item.id!==placement.id));this.deskState.dealtOwnedIds.update(ids=>ids.filter(id=>id!==placement.cardId));this.deskState.selectedId.set('');}
  flipSelected():void{const id=this.deskState.selectedId();this.deskState.placements.update(items=>items.map(item=>item.id===id&&item.kind==='owned'?{...item,face:item.face==='recall'?'answer':'recall'}:item));}
  inspectSelected():void{const card=this.selectedCard();if(card)this.inspectCard.emit(card.id);}
  selectPlacement(id:string):void{this.deskState.placements.update(items=>nextZIndex(items,id));this.deskState.selectedId.set(id);const teaser=this.selectedLocked();this.lockedSelected.set(teaser);}
  nudge(event:KeyboardEvent,placement:DeskCardPlacement):void{const map:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};const direction=map[event.key];if(!direction){if(event.key==='Enter'||event.key===' '){event.preventDefault();this.selectPlacement(placement.id);}return;}event.preventDefault();this.selectPlacement(placement.id);const amount=event.shiftKey?24:8;this.movePlacement(placement.id,placement.x+direction[0]*amount,placement.y+direction[1]*amount);}
  pointerDown(event:PointerEvent,placement:DeskCardPlacement):void{if(placement.kind!=='owned'||event.button!==0)return;const element=event.currentTarget as HTMLElement;this.selectPlacement(placement.id);element.setPointerCapture(event.pointerId);this.drag={id:placement.id,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,originX:placement.x,originY:placement.y,dragging:false,element};}
  pointerMove(event:PointerEvent):void{const drag=this.drag;if(!drag||drag.pointerId!==event.pointerId)return;const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;if(!drag.dragging&&Math.hypot(dx,dy)<7)return;drag.dragging=true;event.preventDefault();drag.element.classList.add('dragging');this.movePlacement(drag.id,drag.originX+dx,drag.originY+dy);}
  pointerUp(event:PointerEvent):void{if(!this.drag||this.drag.pointerId!==event.pointerId)return;this.drag.element.classList.remove('dragging');try{this.drag.element.releasePointerCapture(event.pointerId);}catch{/* Capture may already have ended after pointer cancellation. */}this.drag=undefined;}
  private movePlacement(id:string,x:number,y:number):void{const canvas=this.deskCanvas?.nativeElement,width=canvas?.clientWidth??900,height=canvas?.clientHeight??this.canvasHeight();this.deskState.placements.update(items=>items.map(item=>item.id===id?{...item,x:clampPlacement(x,width,190),y:clampPlacement(y,height,285)}:item));}
  private animateIncoming(ids:string[]):void{if(!ids.length||this.motionReduced())return;queueMicrotask(()=>{for(const id of ids){const element=this.deskCanvas?.nativeElement.querySelector<HTMLElement>(`[data-placement-id="${CSS.escape(id)}"]`);if(!element)continue;let tween!:gsap.core.Tween;tween=gsap.fromTo(element,{x:-140,y:-70,opacity:0,scale:.94},{x:0,y:0,opacity:1,scale:1,duration:.42,ease:'power2.out',clearProps:'transform,opacity',onComplete:()=>{this.tweens=this.tweens.filter(item=>item!==tween);}});this.tweens.push(tween);}});}
}
