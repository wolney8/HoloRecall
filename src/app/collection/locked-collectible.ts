import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import type { MotionPreference } from '../../domain/models';
import type { LockedCollectibleTeaser } from '../../domain/collection';
import { RARITIES } from '../../domain/rewards';
import { reducedMotion, surfaceVariables } from '../card-effects';
import { CardMotionViewportComponent } from '../card-motion-viewport';

@Component({
  selector: 'hr-locked-collectible', standalone: true,
  imports: [MatProgressBarModule,CardMotionViewportComponent],
  template: `
    <hr-card-motion-viewport scale="mini">
      <button #surface type="button" class="locked-collectible" [class.effects]="effects" (click)="opened.emit(teaser)"
        [attr.aria-label]="accessibleLabel()" [attr.data-rarity]="teaser.rarity" [attr.data-motion]="motionReduced?'reduced':'full'"
        (pointerenter)="point($event)" (pointermove)="point($event)" (pointerleave)="settle()" (pointercancel)="settle()">
        <span class="locked-material" aria-hidden="true"><i class="locked-substrate"></i><i class="locked-ambient"></i><i class="locked-shimmer"></i></span>
        <span class="locked-frame" aria-hidden="true"><i class="lock-mark">◇</i><i class="lock-keyhole"></i></span>
        <span class="locked-copy"><span class="locked-label">Locked</span><strong>Card {{pad(teaser.position)}} / {{teaser.setSize}}</strong><span>{{rarityName()}}</span><small>{{teaser.days}} / {{teaser.required}} qualifying days</small></span>
        <mat-progress-bar mode="determinate" [value]="teaser.ratio*100" aria-hidden="true"/>
      </button>
    </hr-card-motion-viewport>
  `,
  styles: [`
    :host{display:block;min-width:0;width:100%}.locked-collectible{--locked-frame:var(--mat-sys-outline-variant);position:relative;isolation:isolate;width:100%;aspect-ratio:2/3;display:grid;grid-template-rows:minmax(0,1fr) auto auto;gap:var(--space-3);padding:var(--space-4);border:3px solid var(--locked-frame);border-radius:19px;background:var(--mat-sys-surface-container-low);color:var(--mat-sys-on-surface);font:inherit;text-align:left;cursor:pointer;overflow:hidden;transform:perspective(1100px) rotateX(var(--tilt-x,0deg)) rotateY(var(--tilt-y,0deg));transform-style:preserve-3d;box-shadow:0 calc(12px * var(--shadow-depth,1)) calc(25px * var(--shadow-depth,1)) color-mix(in srgb,var(--mat-sys-shadow) 16%,transparent);transition:border-color .18s,box-shadow .18s}.locked-collectible:hover{border-color:var(--mat-sys-primary)}.locked-collectible:focus-visible{outline:3px solid var(--mat-sys-primary);outline-offset:3px}.locked-collectible[data-motion=reduced]{transform:none}.locked-material{position:absolute;inset:0;z-index:-1;overflow:hidden;background:repeating-linear-gradient(135deg,transparent 0 12px,color-mix(in srgb,var(--mat-sys-primary) 6%,transparent) 12px 13px)}.locked-material i{position:absolute;inset:-18%;pointer-events:none}.locked-substrate{opacity:0}.locked-ambient{background:linear-gradient(var(--ambient-angle,-24deg),transparent 9%,color-mix(in srgb,var(--mat-sys-on-surface) 16%,transparent) 42%,color-mix(in srgb,#fff 35%,transparent) 58%,transparent 88%);transform:translate(calc((var(--ambient-x,50%) - 50%) * .35),calc((var(--ambient-y,50%) - 50%) * .28));opacity:var(--ambient-strength,0)}.locked-shimmer{background:conic-gradient(from var(--shimmer-phase,0deg) at var(--shimmer-x,50%) var(--shimmer-y,50%),transparent,#7fe2b844,#74a8ff44,#e99bc844,transparent 58%);opacity:var(--shimmer-strength,0)}.locked-collectible:not(.effects) .locked-material i{display:none}.locked-collectible[data-rarity=uncommon]{--locked-frame:#759875}.locked-collectible[data-rarity=rare]{--locked-frame:#b89750}.locked-collectible[data-rarity=holo-rare]{--locked-frame:#72a5a0}.locked-collectible[data-rarity=ultra-rare]{--locked-frame:#ad89b6}.locked-collectible[data-rarity=secret-rare]{--locked-frame:#cfad61}.locked-collectible[data-rarity=relic]{--locked-frame:#c9a75f}.locked-collectible.effects[data-rarity=holo-rare] .locked-substrate,.locked-collectible.effects[data-rarity=ultra-rare] .locked-substrate,.locked-collectible.effects[data-rarity=secret-rare] .locked-substrate,.locked-collectible.effects[data-rarity=relic] .locked-substrate{opacity:.22;background:linear-gradient(125deg,#efb8c826,#8de4ca38,#8aa8ef32,#efd0782e);mix-blend-mode:multiply}.locked-collectible.effects[data-rarity=ultra-rare] .locked-substrate,.locked-collectible.effects[data-rarity=secret-rare] .locked-substrate,.locked-collectible.effects[data-rarity=relic] .locked-substrate{opacity:.34;background:linear-gradient(118deg,#efb8c83d,#8de4ca4d 28%,#8aa8ef4d 58%,#efd07842)}.locked-frame{min-height:0;border:1px solid color-mix(in srgb,var(--locked-frame) 72%,var(--mat-sys-outline-variant));border-radius:14px;display:grid;place-items:center;position:relative;background:color-mix(in srgb,var(--mat-sys-surface-container-high) 72%,transparent);box-shadow:inset 0 0 0 5px color-mix(in srgb,var(--mat-sys-surface) 48%,transparent)}.locked-frame::after{content:'';position:absolute;inset:8px;border:1px solid var(--mat-sys-outline-variant);border-radius:9px}.lock-mark{font-style:normal;font-size:3rem;color:var(--locked-frame);opacity:.78}.lock-keyhole{position:absolute;width:.55rem;height:.7rem;border-radius:50% 50% 35% 35%;background:var(--mat-sys-on-surface-variant)}.locked-copy{display:grid;gap:3px;position:relative;z-index:1}.locked-copy strong{font:var(--mat-sys-title-medium)}.locked-copy span:not(.locked-label),.locked-copy small{font:var(--mat-sys-body-small);color:var(--mat-sys-on-surface-variant)}.locked-label{font:var(--mat-sys-label-small);letter-spacing:.12em;text-transform:uppercase;color:var(--mat-sys-primary)}mat-progress-bar{position:relative;z-index:1}@media(max-width:580px){.locked-collectible{padding:var(--space-3);gap:var(--space-2)}}
  `],
})
export class LockedCollectibleComponent implements AfterViewInit,OnDestroy {
  @Input({required:true}) teaser!:LockedCollectibleTeaser;
  @Input() effects=true;
  @Input() motionPreference:MotionPreference='system';
  @Output() readonly opened=new EventEmitter<LockedCollectibleTeaser>();
  @ViewChild('surface') private surface?:ElementRef<HTMLElement>;
  private readonly preference=matchMedia('(prefers-reduced-motion: reduce)');
  private readonly state={x:0,y:0,press:0};private readonly target={x:0,y:0};private frame=0;private frameTime=0;private rect?:DOMRect;
  private readonly preferenceChanged=()=>{this.settle();};
  get motionReduced():boolean{return reducedMotion(this.motionPreference,this.preference.matches);}
  ngAfterViewInit():void{this.preference.addEventListener('change',this.preferenceChanged);this.render();}
  point(event:PointerEvent):void{if(this.motionReduced||(event.pointerType==='touch'&&event.buttons===0))return;this.rect??=this.surface?.nativeElement.getBoundingClientRect();const rect=this.rect;if(!rect?.width||!rect.height)return;this.target.x=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1));this.target.y=Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1));this.smooth();}
  settle():void{this.target.x=0;this.target.y=0;this.rect=undefined;if(this.motionReduced){this.state.x=0;this.state.y=0;this.render();return;}this.smooth();}
  private smooth():void{if(this.frame)return;this.frameTime=performance.now();const step=(time:number)=>{this.frame=0;const elapsed=Math.min(40,Math.max(1,time-this.frameTime));this.frameTime=time;const blend=1-Math.exp(-elapsed/72);this.state.x+=(this.target.x-this.state.x)*blend;this.state.y+=(this.target.y-this.state.y)*blend;if(Math.abs(this.target.x-this.state.x)<.001)this.state.x=this.target.x;if(Math.abs(this.target.y-this.state.y)<.001)this.state.y=this.target.y;this.render();if(this.state.x!==this.target.x||this.state.y!==this.target.y)this.frame=requestAnimationFrame(step);};this.frame=requestAnimationFrame(step);}
  private render():void{const element=this.surface?.nativeElement;if(!element)return;for(const[name,value]of Object.entries(surfaceVariables(this.state,this.teaser.rarity,this.effects,this.motionReduced)))element.style.setProperty(name,value);element.dataset['surfaceX']=this.state.x.toFixed(4);element.dataset['surfaceY']=this.state.y.toFixed(4);}
  rarityName():string{return RARITIES.find(item=>item.id===this.teaser.rarity)?.label??'Common';}
  pad(value:number):string{return String(value).padStart(2,'0');}
  accessibleLabel():string{return `Locked ${this.rarityName()} card, ${this.teaser.days} of ${this.teaser.required} qualifying days, card ${this.teaser.position} of ${this.teaser.setSize}.`;}
  ngOnDestroy():void{cancelAnimationFrame(this.frame);this.preference.removeEventListener('change',this.preferenceChanged);}
}
