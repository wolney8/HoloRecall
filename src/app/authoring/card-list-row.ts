import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import type { CardContent } from '../../domain/models';
import { LocalStudyStore } from '../data/study-store';
import { PageRevealDirective } from '../motion/page-reveal';

@Component({
  selector:'hr-card-list-row',standalone:true,
  imports:[MatButtonModule,MatCheckboxModule,PageRevealDirective],
  template:`<article class="card-list-row" [attr.data-card-id]="card.id" hrReveal [hrRevealDelay]="delay" [class.suspended]="card.suspended"><mat-checkbox [checked]="selected" (change)="selection.emit($event.checked)"><span class="sr-only">Select {{card.answer}}</span></mat-checkbox><div class="card-list-thumb">@if(card.image){<img [src]="store.mediaUrl(card.image)" [alt]="card.meaning || 'Card illustration'" loading="lazy">}@else{<span aria-hidden="true">Aa</span>}</div><div class="card-list-copy"><h3>{{card.answer}}</h3>@if(summaryParts.length){<p>@for(part of summaryParts;track part;let last=$last){<span>{{part}}</span>@if(!last){<span aria-hidden="true"> · </span>}}</p>}<span>{{rarity}}@if(prestigeLevel){ · P {{roman}}} · {{card.suspended?'Suspended':introduced?'Introduced':'New'}}@if(card.ankiSource){ · Anki}</span></div><div class="actions"><button mat-button [attr.aria-label]="'Edit '+card.answer" (click)="edit.emit()">Edit</button><button mat-button [attr.aria-label]="'Duplicate '+card.answer" (click)="duplicate.emit()">Duplicate</button><button mat-button [attr.aria-label]="(card.suspended?'Resume ':'Suspend ')+card.answer" (click)="suspend.emit()">{{card.suspended?'Resume':'Suspend'}}</button></div></article>`,
  styles:[`:host{display:contents}:host:last-child .card-list-row{border-bottom:0}.card-list-row{display:grid;grid-template-columns:auto 66px minmax(0,1fr) auto;align-items:center;gap:18px;padding:18px 22px;background:var(--mat-sys-surface-container-lowest);border-bottom:1px solid var(--mat-sys-outline-variant)}.card-list-row.suspended{background:var(--mat-sys-surface-container)}.card-list-thumb{width:66px;height:70px;border-radius:10px;background:var(--mat-sys-secondary-container);overflow:hidden;display:grid;place-items:center}.card-list-thumb img{width:100%;height:100%;object-fit:cover}.card-list-copy{min-width:0}.card-list-copy h3,.card-list-copy p{display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden}.card-list-copy h3{-webkit-line-clamp:2;font-size:17px;margin:0 0 5px;overflow-wrap:anywhere}.card-list-copy p{-webkit-line-clamp:2;white-space:normal;line-height:1.45;font-size:13px;color:var(--mat-sys-on-surface-variant);margin:.25rem 0}.card-list-copy p>span{overflow-wrap:anywhere}.card-list-copy>span{display:block;font:var(--mat-sys-label-small);color:var(--mat-sys-on-surface-variant);margin-top:6px}.card-list-row>.actions{display:flex;align-items:center;gap:0;flex-wrap:nowrap}@media(max-width:760px){.card-list-row{gap:15px;padding:17px}.card-list-copy p{font-size:12px}}@media(max-width:580px){.card-list-row{grid-template-columns:auto 57px minmax(0,1fr);gap:12px}.card-list-thumb{width:57px;height:62px}.card-list-copy h3{font-size:16px}.card-list-row>.actions{grid-column:2/-1;flex-wrap:wrap}}`]
})
export class CardListRowComponent{
  readonly store=inject(LocalStudyStore);
  @Input({required:true}) card!:CardContent;
  @Input() selected=false;
  @Input() introduced=false;
  @Input() rarity='';
  @Input() prestigeLevel=0;
  @Input() delay=0;
  @Output() readonly selection=new EventEmitter<boolean>();
  @Output() readonly edit=new EventEmitter<void>();
  @Output() readonly duplicate=new EventEmitter<void>();
  @Output() readonly suspend=new EventEmitter<void>();
  get summaryParts():string[]{const answer=this.compact(this.card.answer),meaning=this.compact(this.card.meaning),pronunciation=this.compact(this.card.pronunciation),front=this.compact(this.card.front);return[meaning&&meaning!==answer?meaning:front!==answer?front:'',pronunciation].filter((value,index,values)=>!!value&&values.indexOf(value)===index);}
  get roman():string{return['','I','II','III','IV','V','VI','VII','VIII','IX','X'][this.prestigeLevel]??'';}
  private compact(value:string):string{return value.replace(/\s+/g,' ').trim();}
}
