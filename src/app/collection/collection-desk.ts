import { afterNextRender, Component, DestroyRef, ElementRef, EventEmitter, inject, Injector, input, Output, signal, computed, effect, ViewChild } from '@angular/core';
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
import { DeskStackComponent, type DeskStackOpen } from './desk-stack';
import { clampPan, clampPlacement, DESK_BATCH_SIZE, DESK_CARD_HEIGHT, DESK_CARD_WIDTH, DESK_LAYOUT_PAGE, deskWorldSize, nextFreePlacement, nextZIndex, placementGrid, type DeskCardPlacement, type DeskWorldSize } from './desk-placement';

interface DragSession {id:string;pointerId:number;startX:number;startY:number;originX:number;originY:number;dragging:boolean;element:HTMLElement}
interface PanSession {pointerId:number;startX:number;startY:number;originX:number;originY:number;panning:boolean;element:HTMLElement}
interface DeskPoint {x:number;y:number}
interface DeskStackItem {id:string;cardId:string;kind:'owned'|'locked'}

@Component({
  selector:'hr-collection-desk',standalone:true,
  imports:[MatButtonModule,MatProgressBarModule,FlashcardComponent,CardMotionViewportComponent,LockedCollectibleComponent,DeskStackComponent],
  templateUrl:'./collection-desk.html',styleUrl:'./collection-desk.css',
})
export class CollectionDeskComponent {
  readonly Math=Math;
  readonly setId=input('');
  @Output() readonly closed=new EventEmitter<string>();@Output() readonly setOpened=new EventEmitter<string>();@Output() readonly inspectCard=new EventEmitter<string>();@Output() readonly practiceCards=new EventEmitter<string[]>();
  readonly store=inject(LocalStudyStore);readonly deskState=inject(CollectionDeskState);private readonly destroyRef=inject(DestroyRef);private readonly injector=inject(Injector);private readonly host=inject<ElementRef<HTMLElement>>(ElementRef);
  @ViewChild('deskCanvas') private deskCanvas?:ElementRef<HTMLElement>;
  @ViewChild('stackDock') private stackDock?:ElementRef<HTMLElement>;
  private deskViewport?:ElementRef<HTMLElement>;
  @ViewChild('deskViewport') set deskViewportElement(value:ElementRef<HTMLElement>|undefined){this.resizeObserver?.disconnect();this.deskViewport=value;if(value){this.measureViewport();this.resizeObserver=new ResizeObserver(()=>this.measureViewport());this.resizeObserver.observe(value.nativeElement);}}
  readonly tiers=RARITIES;readonly lockedSelected=signal<LockedCollectibleTeaser|null>(null);readonly transitioning=signal(false);readonly dropActive=signal(false);readonly panning=signal(false);
  readonly viewportWidth=signal(900);readonly viewportHeight=signal(680);
  private drag?:DragSession;private pan?:PanSession;private animations:gsap.core.Animation[]=[];private routeSeen=false;private previousSetId='';private pendingViewEnter=false;private resizeObserver?:ResizeObserver;private panFrame=0;private pendingPan?:DeskPoint;private suppressFlipId='';private suppressFlipUntil=0;
  readonly state=computed(()=>this.store.data());
  readonly setProgress=computed(()=>this.state()?topLevelCollectionProgress(this.state()!):[]);
  readonly collectedSets=computed(()=>this.setProgress().filter(row=>row.earned>0));
  readonly uncollectedSets=computed(()=>this.setProgress().filter(row=>row.earned===0));
  readonly activeSet=computed(()=>this.store.decks().find(deck=>deck.id===this.setId()));
  readonly cards=computed(()=>this.state()&&this.setId()?cardsInCollectionScope(this.state()!,this.setId()):[]);
  readonly progress=computed(()=>this.state()&&this.setId()?deckCollectionProgress(this.state()!,this.setId()):null);
  readonly slots=computed(()=>{const state=this.state(),cards=this.cards();if(!state)return[];return cards.map(card=>isCollected(state,card.id)?{id:`owned-${card.id}`,kind:'owned' as const,cardId:card.id,card}:{id:`locked-${card.id}`,kind:'locked' as const,cardId:card.id,teaser:lockedCollectibleTeaser(state,card,cards)});});
  readonly ownedCards=computed(()=>{const state=this.state();return state?activeCollectibleCards(state).filter(card=>isCollected(state,card.id)&&this.cards().some(scope=>scope.id===card.id)):[];});
  readonly selectedPlacement=computed(()=>this.deskState.placements().find(item=>item.id===this.deskState.selectedId()));
  readonly selectedCard=computed(()=>{const placement=this.selectedPlacement();return placement?.kind==='owned'?this.card(placement.cardId):undefined;});
  readonly selectedLocked=computed(()=>{const placement=this.selectedPlacement();const slot=placement?.kind==='locked'?this.slots().find(item=>item.id===placement.id):undefined;return slot?.kind==='locked'?slot.teaser:null;});
  readonly placedOwnedCount=computed(()=>this.deskState.placements().filter(item=>item.kind==='owned').length);
  readonly worldSize=computed(()=>deskWorldSize(Math.max(this.deskState.placements().length,this.deskState.visibleCount()),this.viewportWidth(),this.viewportHeight()));
  readonly stackOrder=computed<DeskStackItem[]>(()=>this.deskState.mode()==='full-set-layout'?this.slots().map(slot=>({id:slot.id,cardId:slot.cardId,kind:slot.kind})):this.collectedStackOrder());
  readonly pendingStackItems=computed(()=>{const placed=new Set(this.deskState.placements().map(item=>item.id));return this.stackOrder().filter(item=>!placed.has(item.id));});
  readonly nextStackItem=computed(()=>this.pendingStackItems()[0]);
  readonly stackCount=computed(()=>this.pendingStackItems().length);
  readonly canDeal=computed(()=>this.stackCount()>0);

  constructor(){
    effect(()=>{const id=this.setId();if(id)this.deskState.open(id);else if(this.deskState.setId())this.deskState.clear();const previous=this.previousSetId;this.previousSetId=id;if(!this.routeSeen){this.routeSeen=true;return;}if(previous!==id&&this.pendingViewEnter){this.pendingViewEnter=false;this.afterRender(()=>this.animateViewIn(id?'.active-desk-view':'.stack-landing'));}else if(previous!==id)this.transitioning.set(false);});
    this.destroyRef.onDestroy(()=>{this.animations.forEach(animation=>animation.kill());this.resizeObserver?.disconnect();cancelAnimationFrame(this.panFrame);});
  }
  motionReduced():boolean{const preference=this.state()?.preferences.motion??'system';return reducedMotion(preference,matchMedia('(prefers-reduced-motion: reduce)').matches);}
  openSet(event:DeskStackOpen):void{if(event.locked){this.closed.emit(event.deckId);return;}if(this.motionReduced()){this.setOpened.emit(event.deckId);return;}this.transitioning.set(true);event.source.dataset['transition']='opening';const landing=this.host.nativeElement.querySelector<HTMLElement>('.stack-landing');if(landing)landing.dataset['transition']='exiting';const timeline=gsap.timeline({onComplete:()=>{this.untrack(timeline);this.pendingViewEnter=true;this.setOpened.emit(event.deckId);}}).to(event.source,{y:-8,scale:1.025,duration:.14,ease:'power2.out'}).to(landing,{opacity:0,y:12,duration:.17,ease:'power1.inOut'},.08);this.track(timeline);}
  close():void{this.transitionOut(this.activeSet()?'.active-desk-view':'.stack-landing',()=>this.closed.emit(this.activeSet()?.id??''));}
  backToStacks():void{this.transitionOut('.active-desk-view',()=>{this.pendingViewEnter=true;this.setOpened.emit('');});}
  viewSetProgress():void{const id=this.activeSet()?.id;if(id)this.transitionOut('.active-desk-view',()=>this.closed.emit(id));}
  card(id:string):CardContent|undefined{return this.state()?.cards.find(card=>card.id===id);}
  teaser(id:string):LockedCollectibleTeaser|undefined{const slot=this.slots().find(item=>item.id===id);return slot?.kind==='locked'?slot.teaser:undefined;}
  prestige(card:CardContent){return this.state()?prestigeProgress(this.state()!,card.id):{level:0,cycle:1,days:0,required:3,capped:false};}
  roman(level:number){return['','I','II','III','IV','V','VI','VII','VIII','IX','X'][level]??'';}
  tierName(rarity:Rarity){return this.tiers.find(tier=>tier.id===rarity)?.label??'Common';}
  frameUrl(card:CardContent){const design=this.store.designFor(card);return this.store.mediaUrl(design?.frames?.[card.rarity??'common']||design?.frame);}
  lockedPlacementLabel(id:string):string{const locked=this.teaser(id);return locked?`Locked ${this.tierName(locked.rarity)} card, ${locked.days} of ${locked.required} qualifying days, card ${locked.position} of ${locked.setSize}`:'Locked collectible';}
  stackLabel():string{return this.deskState.mode()==='full-set-layout'?`${this.stackCount()} set ${this.stackCount()===1?'position':'positions'}`:`${this.stackCount()} collected ${this.stackCount()===1?'card':'cards'}`;}
  stackActionLabel():string{return this.stackCount()?`Deal next ${this.deskState.mode()==='full-set-layout'?'set position':'collected card'}`:'All laid out. Return cards here.';}
  private collectedStackOrder():DeskStackItem[]{const shuffled=this.deskState.shuffledOwnedIds(),cards=this.ownedCards(),order=shuffled.length?shuffled:cards.map(card=>card.id);return order.map(cardId=>({id:`owned-${cardId}`,cardId,kind:'owned'}));}

  layOutCollected(more=false):void{const items=this.ownedCards().map(card=>({id:`owned-${card.id}`,cardId:card.id,kind:'owned' as const}));this.layOut('collected-layout',items,more);}
  layOutFullSet(more=false):void{const items=this.slots().map(slot=>({id:slot.id,cardId:slot.cardId,kind:slot.kind}));this.layOut('full-set-layout',items,more);}
  private layOut(mode:'collected-layout'|'full-set-layout',items:Pick<DeskCardPlacement,'id'|'cardId'|'kind'>[],more:boolean):void{
    if(this.transitioning())return;const previous=this.deskState.placements(),sameMode=this.deskState.mode()===mode,count=Math.min(items.length,more&&sameMode?this.deskState.visibleCount()+DESK_LAYOUT_PAGE:DESK_LAYOUT_PAGE),nextItems=items.slice(0,count),apply=()=>{const prior=this.deskState.placements(),origin=this.stackOrigin(),world=this.worldForCount(count);this.deskState.mode.set(mode);this.deskState.visibleCount.set(count);this.deskState.placements.set(placementGrid(nextItems,world.width));this.deskState.selectedId.set('');this.lockedSelected.set(null);this.clampCamera();this.animateIncoming(this.deskState.placements().filter(item=>!prior.some(old=>old.id===item.id)).map(item=>item.id),origin);};
    if(previous.length&&!sameMode)this.animateOut(previous.map(item=>item.id),apply);else apply();
  }
  shuffleCollected():void{
    const ids=this.ownedCards().map(card=>card.id);for(let index=ids.length-1;index>0;index--){const swap=Math.floor(Math.random()*(index+1));[ids[index],ids[swap]]=[ids[swap]!,ids[index]!];}
    const finish=()=>{this.deskState.mode.set('owned-stack');this.deskState.shuffledOwnedIds.set(ids);this.deskState.dealtOwnedIds.set([]);this.deskState.placements.set([]);this.deskState.selectedId.set('');this.lockedSelected.set(null);this.afterRender(()=>this.animateStackShuffle());};
    const placed=this.deskState.placements();if(placed.length)this.animateOut(placed.map(item=>item.id),finish);else{finish();}
  }
  deal():void{this.dealNext(DESK_BATCH_SIZE);}
  dealOne():void{this.dealNext(1);}
  private dealNext(count:number):void{
    if(!this.canDeal()||this.transitioning())return;const next=this.pendingStackItems().slice(0,count);if(!next.length)return;
    const origin=this.stackOrigin(),existing=this.deskState.placements(),world=this.worldForCount(Math.max(this.deskState.visibleCount(),existing.length+next.length));let accumulated=[...existing];for(const item of next)accumulated.push(nextFreePlacement(accumulated,item,world));
    if(this.deskState.mode()==='set-stack')this.deskState.mode.set('owned-stack');this.deskState.visibleCount.set(Math.max(this.deskState.visibleCount(),accumulated.length));this.deskState.placements.set(accumulated);this.deskState.dealtOwnedIds.update(ids=>[...new Set([...ids,...next.filter(item=>item.kind==='owned').map(item=>item.cardId)])]);this.clampCamera();this.animateIncoming(next.map(item=>item.id),origin);
  }
  gather():void{const owned=this.deskState.placements().filter(item=>item.kind==='owned');if(!owned.length)return;this.animateOut(owned.map(item=>item.id),()=>{this.deskState.placements.update(items=>items.filter(item=>item.kind==='locked'));this.deskState.dealtOwnedIds.set([]);this.deskState.selectedId.set('');this.lockedSelected.set(null);if(this.deskState.mode()!=='full-set-layout')this.deskState.mode.set('owned-stack');});}
  reset():void{const finish=()=>{this.deskState.reset();this.lockedSelected.set(null);this.dropActive.set(false);};const ids=this.deskState.placements().map(item=>item.id);if(ids.length)this.animateOut(ids,finish);else finish();}
  centreTable():void{this.setPan(0,0);}
  returnSelected():void{const placement=this.selectedPlacement();if(placement)this.returnPlacement(placement);}
  private returnPlacement(placement:DeskCardPlacement):void{this.animateOut([placement.id],()=>{this.deskState.placements.update(items=>items.filter(item=>item.id!==placement.id));if(placement.kind==='owned')this.deskState.dealtOwnedIds.update(ids=>ids.filter(id=>id!==placement.cardId));this.deskState.selectedId.set('');this.lockedSelected.set(null);this.dropActive.set(false);this.afterRender(()=>this.stackDock?.nativeElement.focus());});}
  flipSelected():void{const id=this.deskState.selectedId();this.deskState.placements.update(items=>items.map(item=>item.id===id&&item.kind==='owned'?{...item,face:item.face==='recall'?'answer':'recall'}:item));}
  inspectSelected():void{const card=this.selectedCard();if(card)this.inspectCard.emit(card.id);}
  selectPlacement(id:string):void{this.deskState.placements.update(items=>nextZIndex(items,id));this.deskState.selectedId.set(id);const teaser=this.selectedLocked();this.lockedSelected.set(teaser);}
  nudge(event:KeyboardEvent,placement:DeskCardPlacement):void{const map:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};const direction=map[event.key];if(!direction){if(event.key==='Enter'||event.key===' '){event.preventDefault();this.selectPlacement(placement.id);}return;}event.preventDefault();this.selectPlacement(placement.id);const amount=event.shiftKey?24:8;this.movePlacement(placement.id,placement.x+direction[0]*amount,placement.y+direction[1]*amount);}
  pointerDown(event:PointerEvent,placement:DeskCardPlacement):void{if(event.button!==0)return;if(this.suppressFlipId===placement.id){this.suppressFlipId='';this.suppressFlipUntil=0;}const element=event.currentTarget as HTMLElement;this.selectPlacement(placement.id);element.setPointerCapture(event.pointerId);this.drag={id:placement.id,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,originX:placement.x,originY:placement.y,dragging:false,element};}
  pointerMove(event:PointerEvent):void{const drag=this.drag;if(!drag||drag.pointerId!==event.pointerId)return;const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;if(!drag.dragging&&Math.hypot(dx,dy)<7)return;drag.dragging=true;event.preventDefault();drag.element.classList.add('dragging');const x=clampPlacement(drag.originX+dx,this.worldSize().width,DESK_CARD_WIDTH,64),y=clampPlacement(drag.originY+dy,this.worldSize().height,DESK_CARD_HEIGHT,64);this.movePlacement(drag.id,x,y);this.dropActive.set(this.overlapsStack(x,y));}
  pointerUp(event:PointerEvent):void{const drag=this.drag;if(!drag||drag.pointerId!==event.pointerId)return;drag.element.classList.remove('dragging');try{drag.element.releasePointerCapture(event.pointerId);}catch{/* Capture may already have ended after pointer cancellation. */}const placement=this.deskState.placements().find(item=>item.id===drag.id),returning=drag.dragging&&this.dropActive()&&placement;if(drag.dragging){this.suppressFlipId=drag.id;this.suppressFlipUntil=performance.now()+500;}this.drag=undefined;this.dropActive.set(false);if(returning)this.returnPlacement(returning);}
  cardDoubleClick(event:MouseEvent,placement:DeskCardPlacement):void{event.preventDefault();event.stopPropagation();this.selectPlacement(placement.id);if(placement.kind==='locked'||(this.suppressFlipId===placement.id&&performance.now()<this.suppressFlipUntil))return;this.flipSelected();}
  panDown(event:PointerEvent):void{if(event.button!==0||(event.target as Element).closest('.desk-card-position,.stack-dock,button,a,input,select,textarea'))return;const element=event.currentTarget as HTMLElement;element.setPointerCapture(event.pointerId);this.pan={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,originX:this.deskState.panX(),originY:this.deskState.panY(),panning:false,element};}
  panMove(event:PointerEvent):void{const pan=this.pan;if(!pan||pan.pointerId!==event.pointerId)return;const dx=event.clientX-pan.startX,dy=event.clientY-pan.startY;if(!pan.panning&&Math.hypot(dx,dy)<7)return;pan.panning=true;this.panning.set(true);event.preventDefault();this.schedulePan(pan.originX+dx,pan.originY+dy);}
  panUp(event:PointerEvent):void{const pan=this.pan;if(!pan||pan.pointerId!==event.pointerId)return;try{pan.element.releasePointerCapture(event.pointerId);}catch{/* Capture may already have ended. */}if(this.pendingPan)this.setPan(this.pendingPan.x,this.pendingPan.y);this.pendingPan=undefined;this.pan=undefined;this.panning.set(false);}
  private movePlacement(id:string,x:number,y:number):void{this.deskState.placements.update(items=>items.map(item=>item.id===id?{...item,x,y}:item));}
  private afterRender(callback:()=>void):void{afterNextRender({mixedReadWrite:callback},{injector:this.injector});}
  private worldForCount(count:number):DeskWorldSize{return deskWorldSize(count,this.viewportWidth(),this.viewportHeight());}
  private measureViewport():void{const element=this.deskViewport?.nativeElement;if(!element)return;this.viewportWidth.set(element.clientWidth||900);this.viewportHeight.set(element.clientHeight||680);this.clampCamera();}
  private clampCamera():void{const world=this.worldSize();this.setPan(this.deskState.panX(),this.deskState.panY(),world);}
  private setPan(x:number,y:number,world=this.worldSize()):void{this.deskState.panX.set(clampPan(x,this.viewportWidth(),world.width));this.deskState.panY.set(clampPan(y,this.viewportHeight(),world.height));}
  private schedulePan(x:number,y:number):void{this.pendingPan={x,y};if(this.panFrame)return;this.panFrame=requestAnimationFrame(()=>{this.panFrame=0;const pending=this.pendingPan;this.pendingPan=undefined;if(pending)this.setPan(pending.x,pending.y);});}
  private overlapsStack(x:number,y:number):boolean{const viewport=this.deskViewport?.nativeElement,dock=this.stackDock?.nativeElement;if(!viewport||!dock)return false;const viewportRect=viewport.getBoundingClientRect(),dockRect=dock.getBoundingClientRect(),left=viewportRect.left+this.deskState.panX()+x,top=viewportRect.top+this.deskState.panY()+y,right=left+DESK_CARD_WIDTH,bottom=top+DESK_CARD_HEIGHT,overlapX=Math.max(0,Math.min(right,dockRect.right)-Math.max(left,dockRect.left)),overlapY=Math.max(0,Math.min(bottom,dockRect.bottom)-Math.max(top,dockRect.top));return overlapX*overlapY>=Math.min(DESK_CARD_WIDTH*DESK_CARD_HEIGHT*.2,dockRect.width*dockRect.height*.35);}
  private stackOrigin():DeskPoint{const rect=this.stackDock?.nativeElement.getBoundingClientRect();return rect?{x:rect.left+rect.width/2,y:rect.top+rect.height/2}:{x:innerWidth/2,y:innerHeight/2};}
  private animateIncoming(ids:string[],origin:DeskPoint):void{if(!ids.length)return;const reduced=this.motionReduced();if(!reduced)this.transitioning.set(true);this.afterRender(()=>{const canvas=this.deskCanvas?.nativeElement;if(!canvas){this.transitioning.set(false);return;}const wrappers=ids.map(id=>canvas.querySelector<HTMLElement>(`[data-placement-id="${CSS.escape(id)}"] .deal-motion-wrapper`)).filter((item):item is HTMLElement=>!!item);if(!wrappers.length){this.transitioning.set(false);return;}if(reduced){wrappers.forEach(item=>item.dataset['motionState']='settled');return;}wrappers.forEach(item=>item.dataset['motionState']='entering');const stagger=wrappers.length>1?Math.min(.035,.1/(wrappers.length-1)):0;let timeline!:gsap.core.Timeline;timeline=gsap.timeline({onComplete:()=>{wrappers.forEach(item=>item.dataset['motionState']='settled');this.transitioning.set(false);this.untrack(timeline);}});timeline.fromTo(wrappers,{x:(index,element)=>{const rect=(element as HTMLElement).parentElement!.getBoundingClientRect();return origin.x-(rect.left+rect.width/2);},y:(index,element)=>{const rect=(element as HTMLElement).parentElement!.getBoundingClientRect();return origin.y-(rect.top+rect.height/2);},rotation:(index)=>index%2?2:-2,scale:.94,opacity:0},{x:0,y:0,rotation:0,scale:1,opacity:1,duration:.42,stagger,ease:'power2.out',clearProps:'transform,opacity'});this.track(timeline);});}
  private animateOut(ids:string[],complete:()=>void):void{if(!ids.length){complete();return;}const canvas=this.deskCanvas?.nativeElement;if(!canvas||this.motionReduced()){complete();return;}const origin=this.stackOrigin(),wrappers=ids.map(id=>canvas.querySelector<HTMLElement>(`[data-placement-id="${CSS.escape(id)}"] .deal-motion-wrapper`)).filter((item):item is HTMLElement=>!!item);if(!wrappers.length){complete();return;}this.transitioning.set(true);wrappers.forEach(item=>item.dataset['motionState']='exiting');const stagger=wrappers.length>1?Math.min(.025,.08/(wrappers.length-1)):0;let timeline!:gsap.core.Timeline;timeline=gsap.timeline({onComplete:()=>{this.untrack(timeline);this.transitioning.set(false);complete();}}).to(wrappers,{x:(index,element)=>{const rect=(element as HTMLElement).parentElement!.getBoundingClientRect();return origin.x-(rect.left+rect.width/2);},y:(index,element)=>{const rect=(element as HTMLElement).parentElement!.getBoundingClientRect();return origin.y-(rect.top+rect.height/2);},rotation:(index)=>index%2?1.5:-1.5,scale:.93,opacity:0,duration:.36,stagger,ease:'power2.in'});this.track(timeline);}
  private animateStackShuffle():void{const stack=this.stackDock?.nativeElement.querySelector<HTMLElement>('.stack-preview-shell');if(!stack||this.motionReduced())return;let timeline!:gsap.core.Timeline;timeline=gsap.timeline({onComplete:()=>{gsap.set(stack,{clearProps:'transform'});this.untrack(timeline);}}).to(stack,{x:-5,rotation:-1.5,duration:.09}).to(stack,{x:5,rotation:1.5,duration:.1}).to(stack,{x:0,rotation:0,duration:.11,ease:'power2.out'});this.track(timeline);}
  private animateViewIn(selector:string):void{const view=this.host.nativeElement.querySelector<HTMLElement>(selector);if(!view)return;if(this.motionReduced()){view.dataset['transition']='settled';this.transitioning.set(false);return;}view.dataset['transition']='entering';this.transitioning.set(true);let tween!:gsap.core.Tween;tween=gsap.fromTo(view,{opacity:0,y:12},{opacity:1,y:0,duration:.28,ease:'power2.out',clearProps:'transform,opacity',onComplete:()=>{view.dataset['transition']='settled';this.transitioning.set(false);this.untrack(tween);}});this.track(tween);}
  private transitionOut(selector:string,complete:()=>void):void{if(this.transitioning())return;const view=this.host.nativeElement.querySelector<HTMLElement>(selector);if(!view||this.motionReduced()){complete();return;}view.dataset['transition']='exiting';this.transitioning.set(true);let tween!:gsap.core.Tween;tween=gsap.to(view,{opacity:0,y:8,duration:.24,ease:'power1.inOut',onComplete:()=>{this.untrack(tween);complete();}});this.track(tween);}
  private track(animation:gsap.core.Animation):void{this.animations.push(animation);}
  private untrack(animation:gsap.core.Animation):void{this.animations=this.animations.filter(item=>item!==animation);}
}
