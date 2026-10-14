import { Component, Inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import type { CardContent } from '../domain/models';
import { visibleOcclusionShapes } from '../domain/image-occlusion';

export interface CardInspectionDialogData {
  card: CardContent;
  revealed: boolean;
  imageUrl: string;
}

@Component({
  selector: 'hr-card-inspection-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle],
  template: `
    <h2 mat-dialog-title>Expanded {{data.revealed ? 'Answer' : 'Recall'}} image</h2>
    <mat-dialog-content>
      <p class="inspection-state" aria-live="polite">{{accessibleState}}</p>
      <div class="inspection-stage" data-testid="expanded-image-stage"
        [attr.aria-label]="accessibleState" role="img"
        (wheel)="wheelZoom($event)" (pointerdown)="pointerDown($event)" (pointermove)="pointerMove($event)" (pointerup)="pointerUp($event)" (pointercancel)="pointerUp($event)">
        <div class="inspection-viewport" [style.transform]="transform" data-testid="expanded-image-viewport">
          <img [src]="data.imageUrl" [alt]="imageAlt" draggable="false">
          @if(data.card.imageOcclusion){
            <svg class="inspection-masks" [attr.viewBox]="viewBox" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
              @for(shape of masks;track shape.id){
                @switch(shape.type){
                  @case('rect'){<rect [attr.x]="shape.x*width" [attr.y]="shape.y*height" [attr.width]="shape.width*width" [attr.height]="shape.height*height" rx="8"/>}
                  @case('ellipse'){<ellipse [attr.cx]="shape.cx*width" [attr.cy]="shape.cy*height" [attr.rx]="shape.rx*width" [attr.ry]="shape.ry*height"/>}
                  @case('polygon'){<polygon [attr.points]="polygonPoints(shape.points)"/>}
                }
              }
            </svg>
          }
        </div>
      </div>
      <div class="zoom-controls" role="group" aria-label="Image zoom controls">
        <button mat-stroked-button type="button" (click)="zoomBy(-.5)" [disabled]="zoom()<=1" aria-label="Zoom out">−</button>
        <output aria-live="polite" [attr.aria-label]="'Current zoom '+zoomLabel">{{zoomLabel}}</output>
        <button mat-stroked-button type="button" (click)="zoomBy(.5)" [disabled]="zoom()>=5" aria-label="Zoom in">+</button>
        <button mat-button type="button" (click)="reset()" [disabled]="zoom()===1&&panX()===0&&panY()===0">Reset</button>
      </div>
      <p class="gesture-hint">Zoom to inspect detail. Drag or pinch the image while zoomed.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-flat-button type="button" mat-dialog-close cdkFocusInitial>Close</button></mat-dialog-actions>
  `,
  styles: [`
    :host{display:block;max-width:100%}h2{padding-inline-end:3rem}.inspection-state{margin:0 0 var(--space-3);color:var(--mat-sys-on-surface-variant);font:var(--mat-sys-body-medium)}
    .inspection-stage{position:relative;overflow:hidden;width:min(82vw,70rem);height:min(70dvh,48rem);min-height:18rem;border:1px solid var(--mat-sys-outline-variant);border-radius:var(--mat-sys-corner-large);background:var(--mat-sys-surface-container-lowest);touch-action:none;cursor:grab;overscroll-behavior:contain}
    .inspection-stage:active{cursor:grabbing}.inspection-viewport{position:absolute;inset:0;transform-origin:center;will-change:transform}.inspection-viewport img,.inspection-masks{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:contain;user-select:none;-webkit-user-drag:none}.inspection-masks{pointer-events:none}.inspection-masks :is(rect,ellipse,polygon){fill:color-mix(in srgb,var(--mat-sys-primary) 88%,#101815);stroke:color-mix(in srgb,var(--mat-sys-tertiary) 70%,#fff);stroke-width:3;vector-effect:non-scaling-stroke;filter:drop-shadow(0 2px 2px rgb(0 0 0/.35))}
    .zoom-controls{display:flex;align-items:center;justify-content:center;gap:var(--space-2);margin-top:var(--space-3);flex-wrap:wrap}.zoom-controls button{min-width:48px;min-height:44px}.zoom-controls output{min-width:4rem;text-align:center;font:var(--mat-sys-label-large)}.gesture-hint{margin:var(--space-2) 0 0;text-align:center;color:var(--mat-sys-on-surface-variant);font:var(--mat-sys-body-small)}
    @media(max-width:700px){.inspection-stage{width:calc(100vw - 3rem);height:min(68dvh,42rem);min-height:15rem}mat-dialog-content{padding-inline:var(--space-3)}}
    @media(max-height:900px) and (orientation:landscape) and (pointer:coarse){.inspection-stage{height:min(44dvh,32rem);min-height:10rem}.gesture-hint{margin-top:var(--space-1)}}
    @media(max-height:600px) and (orientation:landscape){.inspection-state{margin-bottom:var(--space-2)}.inspection-stage{width:min(76vw,58rem);height:35dvh;min-height:7rem}.zoom-controls{margin-top:var(--space-2)}.gesture-hint{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}}
    @media(prefers-reduced-motion:reduce){.inspection-viewport{will-change:auto}}
  `],
})
export class CardInspectionDialogComponent {
  readonly zoom=signal(1);readonly panX=signal(0);readonly panY=signal(0);
  private readonly pointers=new Map<number,{x:number;y:number}>();
  private panStart?:{x:number;y:number;panX:number;panY:number};
  private pinchStart?:{distance:number;zoom:number};
  constructor(@Inject(MAT_DIALOG_DATA) readonly data:CardInspectionDialogData){}
  get width():number{return this.data.card.imageOcclusion?.imageWidth??1000;}
  get height():number{return this.data.card.imageOcclusion?.imageHeight??1000;}
  get viewBox():string{return`0 0 ${this.width} ${this.height}`;}
  get masks(){return this.data.card.imageOcclusion?visibleOcclusionShapes(this.data.card.imageOcclusion,this.data.revealed):[];}
  get transform():string{return`translate(${this.panX()}px, ${this.panY()}px) scale(${this.zoom()})`;}
  get zoomLabel():string{return`${Math.round(this.zoom()*100)}%`;}
  get imageAlt():string{return this.data.revealed?(this.data.card.imageOcclusion?.targetDescription||this.data.card.imageDescription||'Revealed card image'):(this.data.card.imageDescription||'Recall card image');}
  get accessibleState():string{const io=this.data.card.imageOcclusion;if(!io)return`${this.data.revealed?'Answer':'Recall'} image inspection.`;return this.data.revealed?`Answer image inspection. Image Occlusion target revealed.${io.targetDescription?' '+io.targetDescription:''}`:`Recall image inspection. Image Occlusion target hidden.${io.imageDescription?' '+io.imageDescription:''}${io.header?' '+io.header:''}`;}
  polygonPoints(points:Array<{x:number;y:number}>):string{return points.map(point=>`${point.x*this.width},${point.y*this.height}`).join(' ');}
  zoomBy(amount:number):void{this.setZoom(this.zoom()+amount);}
  reset():void{this.zoom.set(1);this.panX.set(0);this.panY.set(0);}
  wheelZoom(event:WheelEvent):void{event.preventDefault();this.setZoom(this.zoom()+(event.deltaY<0?.25:-.25));}
  pointerDown(event:PointerEvent):void{try{(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);}catch{/* Synthetic and assistive pointer streams may not support capture. */}this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(this.pointers.size===1)this.panStart={x:event.clientX,y:event.clientY,panX:this.panX(),panY:this.panY()};if(this.pointers.size===2){const [a,b]=[...this.pointers.values()];this.pinchStart={distance:Math.hypot(a!.x-b!.x,a!.y-b!.y),zoom:this.zoom()};}}
  pointerMove(event:PointerEvent):void{if(!this.pointers.has(event.pointerId))return;this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(this.pointers.size>=2&&this.pinchStart){const [a,b]=[...this.pointers.values()],distance=Math.hypot(a!.x-b!.x,a!.y-b!.y);this.setZoom(this.pinchStart.zoom*distance/Math.max(1,this.pinchStart.distance));return;}if(this.zoom()>1&&this.panStart)this.setPan(this.panStart.panX+event.clientX-this.panStart.x,this.panStart.panY+event.clientY-this.panStart.y);}
  pointerUp(event:PointerEvent):void{this.pointers.delete(event.pointerId);if(this.pointers.size<2)this.pinchStart=undefined;if(this.pointers.size===1){const remaining=[...this.pointers.values()][0]!;this.panStart={x:remaining.x,y:remaining.y,panX:this.panX(),panY:this.panY()};}else if(!this.pointers.size)this.panStart=undefined;}
  private setZoom(value:number):void{const bounded=Math.max(1,Math.min(5,Math.round(value*100)/100));this.zoom.set(bounded);if(bounded===1){this.panX.set(0);this.panY.set(0);}}
  private setPan(x:number,y:number):void{const limit=720*(this.zoom()-1);this.panX.set(Math.max(-limit,Math.min(limit,x)));this.panY.set(Math.max(-limit,Math.min(limit,y)));}
}
