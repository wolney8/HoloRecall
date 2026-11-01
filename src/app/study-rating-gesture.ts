import { Directive, ElementRef, EventEmitter, HostBinding, Input, NgZone, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import type { ConfidenceRating } from '../domain/models';

export type RatingGestureDirection='down'|'left'|'hold'|'right'|'up';
type DragDirection=Exclude<RatingGestureDirection,'hold'>;
type GesturePhase=''|'holding'|'dragging'|'cancel'|'commit';

const INTERACTIVE='button,a,input,textarea,select,option,audio,video,[contenteditable="true"],[role="link"],[role="checkbox"],[role="radio"],[role="slider"],[role="combobox"],[role="region"],[data-no-rating-gesture]';
const RATING:Record<RatingGestureDirection,ConfidenceRating>={down:1,left:2,hold:3,right:4,up:5};

/** Classifies the current vector while allowing a small amount of sector hysteresis. */
export function ratingGestureDirection(dx:number,dy:number,neutral:number,current:DragDirection|''='',axisHysteresis=1.16):DragDirection|'' {
  const absoluteX=Math.abs(dx),absoluteY=Math.abs(dy);
  if(Math.hypot(dx,dy)<neutral)return'';
  if(current==='left'||current==='right'){
    if(absoluteY>absoluteX*axisHysteresis)return dy<0?'up':'down';
    if(absoluteX>=neutral*.72)return dx<0?'left':'right';
  }
  if(current==='up'||current==='down'){
    if(absoluteX>absoluteY*axisHysteresis)return dx<0?'left':'right';
    if(absoluteY>=neutral*.72)return dy<0?'up':'down';
  }
  if(absoluteX>absoluteY*axisHysteresis)return dx<0?'left':'right';
  if(absoluteY>absoluteX*axisHysteresis)return dy<0?'up':'down';
  return'';
}

@Directive({selector:'[hrStudyRatingGesture]',standalone:true})
export class StudyRatingGestureDirective implements OnChanges,OnDestroy {
  private readonly element=inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone=inject(NgZone);
  @Input() gestureEnabled=false;
  @Input() gestureCardKey='';
  @Input() gestureReducedMotion=false;
  @Output() readonly gestureRating=new EventEmitter<ConfidenceRating>();
  @Output() readonly gesturePreview=new EventEmitter<ConfidenceRating|null>();
  @HostBinding('attr.data-gesture-enabled') get enabledAttribute():string|null{return this.gestureEnabled?'true':null;}

  private pointerId:number|null=null;
  private startX=0;
  private startY=0;
  private currentX=0;
  private currentY=0;
  private startAt=0;
  private width=1;
  private height=1;
  private intent=8;
  private direction:DragDirection|''='';
  private phase:GesturePhase='';
  private dragging=false;
  private holdEligible=false;
  private committed=false;
  private holdFrame=0;
  private moveFrame=0;
  private settleTimer=0;
  private lastPreview:ConfidenceRating|null=null;
  private readonly holdMs=700;

  private readonly pointerDownListener=(event:PointerEvent)=>this.pointerDown(event);
  private readonly pointerMoveListener=(event:PointerEvent)=>this.pointerMove(event);
  private readonly pointerUpListener=(event:PointerEvent)=>this.pointerUp(event);
  private readonly pointerCancelListener=(event:PointerEvent)=>this.pointerCancel(event);
  private readonly lostPointerCaptureListener=(event:PointerEvent)=>this.pointerCancel(event);
  private readonly preventOwnedPan=(event:TouchEvent)=>{if(this.dragging&&this.pointerId!==null)event.preventDefault();};

  constructor(){
    this.zone.runOutsideAngular(()=>{
      const element=this.element.nativeElement;
      element.addEventListener('pointerdown',this.pointerDownListener);
      element.addEventListener('pointermove',this.pointerMoveListener,{passive:false});
      element.addEventListener('pointerup',this.pointerUpListener);
      element.addEventListener('pointercancel',this.pointerCancelListener);
      element.addEventListener('lostpointercapture',this.lostPointerCaptureListener);
      element.addEventListener('touchmove',this.preventOwnedPan,{passive:false});
    });
  }

  ngOnChanges(changes:SimpleChanges):void {
    if(changes['gestureCardKey']&&!changes['gestureCardKey'].firstChange)this.reset(true);
    if(changes['gestureEnabled']&&!this.gestureEnabled&&!this.committed)this.cancel();
    if(changes['gestureEnabled']&&this.gestureEnabled&&this.committed)this.reset(true);
  }

  ngOnDestroy():void {
    const element=this.element.nativeElement;
    element.removeEventListener('pointerdown',this.pointerDownListener);
    element.removeEventListener('pointermove',this.pointerMoveListener);
    element.removeEventListener('pointerup',this.pointerUpListener);
    element.removeEventListener('pointercancel',this.pointerCancelListener);
    element.removeEventListener('lostpointercapture',this.lostPointerCaptureListener);
    element.removeEventListener('touchmove',this.preventOwnedPan);
    this.reset(true);
  }

  private pointerDown(event:PointerEvent):void {
    if(!this.gestureEnabled||this.pointerId!==null||event.button!==0||event.isPrimary===false||this.isInteractive(event.target))return;
    const box=this.element.nativeElement.getBoundingClientRect();
    this.pointerId=event.pointerId;this.startX=this.currentX=event.clientX;this.startY=this.currentY=event.clientY;this.startAt=performance.now();
    this.width=Math.max(1,box.width);this.height=Math.max(1,box.height);this.intent=Math.max(8,Math.min(this.width,this.height)*.045);
    this.direction='';this.dragging=false;this.holdEligible=true;this.committed=false;this.setPhase('holding');this.setDirection('hold',false);this.setMotion(0,0,0,0);
    window.clearTimeout(this.settleTimer);
    this.holdFrame=requestAnimationFrame(()=>this.updateHold());
  }

  private pointerMove(event:PointerEvent):void {
    if(event.pointerId!==this.pointerId||this.committed)return;
    this.currentX=event.clientX;this.currentY=event.clientY;
    const dx=this.currentX-this.startX,dy=this.currentY-this.startY;
    if(Math.hypot(dx,dy)>=this.intent){
      this.holdEligible=false;cancelAnimationFrame(this.holdFrame);
      if(!this.dragging){this.dragging=true;try{this.element.nativeElement.setPointerCapture(event.pointerId);}catch{/* Synthetic pointers cannot be captured. */}}
      event.preventDefault();
    }
    if(!this.moveFrame)this.moveFrame=requestAnimationFrame(()=>this.renderCurrentVector());
  }

  private pointerUp(event:PointerEvent):void {
    if(event.pointerId!==this.pointerId||this.committed)return;
    cancelAnimationFrame(this.holdFrame);cancelAnimationFrame(this.moveFrame);this.moveFrame=0;
    this.currentX=event.clientX;this.currentY=event.clientY;this.renderCurrentVector();
    const dx=this.currentX-this.startX,dy=this.currentY-this.startY;
    const finalDirection=ratingGestureDirection(dx,dy,this.intent*.72);
    if(!this.dragging||!finalDirection){this.cancel();return;}
    this.direction=finalDirection;this.setDirection(finalDirection,true);
    const finalAxis=this.horizontal(finalDirection)?this.width:this.height;
    const distance=finalDirection==='left'?Math.max(0,-dx):finalDirection==='right'?Math.max(0,dx):finalDirection==='up'?Math.max(0,-dy):Math.max(0,dy);
    const velocity=distance/Math.max(1,performance.now()-this.startAt);
    if(distance>=finalAxis*.28||(distance>=finalAxis*.12&&velocity>=.55))this.commit(finalDirection);else this.cancel();
  }

  private pointerCancel(event:PointerEvent):void {if(event.pointerId===this.pointerId&&!this.committed)this.cancel();}

  private renderCurrentVector():void {
    this.moveFrame=0;if(this.pointerId===null||this.committed)return;
    const dx=this.currentX-this.startX,dy=this.currentY-this.startY,magnitude=Math.hypot(dx,dy);
    if(magnitude>=this.intent)this.dragging=true;
    if(!this.dragging)return;
    const next=ratingGestureDirection(dx,dy,this.intent*.72,this.direction);
    this.direction=next;this.setPhase('dragging');this.setDirection(next,true);
    const axis=next&&this.horizontal(next)?this.width:this.height;
    const progress=next?Math.min(1,Math.max(Math.abs(dx),Math.abs(dy))/(axis*.28)):0;
    this.setMotion(dx,dy,(dx/this.width)*8,progress);
  }

  private updateHold():void {
    if(this.pointerId===null||!this.holdEligible||this.dragging||this.committed)return;
    const progress=Math.min(1,(performance.now()-this.startAt)/this.holdMs);
    const style=this.element.nativeElement.style;
    style.setProperty('--gesture-hold',String(progress));style.setProperty('--gesture-tension',`${(progress*.85).toFixed(2)}deg`);style.setProperty('--gesture-tension-negative',`${(-progress*.85).toFixed(2)}deg`);
    if(progress>=1){this.zone.run(()=>this.commit('hold'));return;}
    this.holdFrame=requestAnimationFrame(()=>this.updateHold());
  }

  private commit(direction:RatingGestureDirection):void {
    if(this.committed||!this.gestureEnabled)return;
    this.committed=true;this.setDirection(direction,direction!=='hold');this.setPhase('commit');cancelAnimationFrame(this.holdFrame);cancelAnimationFrame(this.moveFrame);
    const x=direction==='left'?-this.width*1.08:direction==='right'?this.width*1.08:0,y=direction==='up'?-this.height*.72:direction==='down'?this.height*.72:0;
    this.setMotion(x,y,x?Math.sign(x)*9:0,1);this.releasePointer();this.emitPreview(null);this.zone.run(()=>this.gestureRating.emit(RATING[direction]));
  }

  private cancel():void {
    if(this.pointerId===null&&!this.phase)return;
    cancelAnimationFrame(this.holdFrame);cancelAnimationFrame(this.moveFrame);this.moveFrame=0;this.releasePointer();this.direction='';this.dragging=false;this.holdEligible=false;
    this.setPhase('cancel');this.setDirection('',true);this.setMotion(0,0,0,0);
    window.clearTimeout(this.settleTimer);this.settleTimer=window.setTimeout(()=>{if(this.pointerId===null&&!this.committed)this.setPhase('');},190);
  }

  private reset(clearCommit:boolean):void {
    cancelAnimationFrame(this.holdFrame);cancelAnimationFrame(this.moveFrame);window.clearTimeout(this.settleTimer);this.moveFrame=0;this.releasePointer();this.dragging=false;this.holdEligible=false;if(clearCommit)this.committed=false;this.direction='';this.setDirection('',true);this.setPhase('');this.setMotion(0,0,0,0);
    const style=this.element.nativeElement.style;style.removeProperty('--gesture-hold');style.removeProperty('--gesture-tension');style.removeProperty('--gesture-tension-negative');
  }

  private releasePointer():void {
    const pointerId=this.pointerId;this.pointerId=null;
    if(pointerId!==null&&this.element.nativeElement.hasPointerCapture?.(pointerId))this.element.nativeElement.releasePointerCapture(pointerId);
  }

  private setDirection(direction:RatingGestureDirection|'',announce:boolean):void {
    const element=this.element.nativeElement;if(direction)element.dataset['gestureDirection']=direction;else delete element.dataset['gestureDirection'];
    if(announce)this.emitPreview(direction?RATING[direction]:null);
  }
  private setPhase(phase:GesturePhase):void {this.phase=phase;const element=this.element.nativeElement;if(phase)element.dataset['gesturePhase']=phase;else delete element.dataset['gesturePhase'];}
  private emitPreview(rating:ConfidenceRating|null):void {if(this.lastPreview===rating)return;this.lastPreview=rating;this.zone.run(()=>this.gesturePreview.emit(rating));}
  private setMotion(x:number,y:number,rotation:number,progress:number):void {const style=this.element.nativeElement.style;style.setProperty('--gesture-x',`${x}px`);style.setProperty('--gesture-y',`${y}px`);style.setProperty('--gesture-rotation',`${rotation}deg`);style.setProperty('--gesture-progress',String(progress));}
  private horizontal(direction:DragDirection):boolean{return direction==='left'||direction==='right';}
  private isInteractive(target:EventTarget|null):boolean{return target instanceof Element&&!!target.closest(INTERACTIVE);}
}
