import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import type { CardContent } from '../../domain/models';
import { LocalStudyStore } from '../data/study-store';
import { PageRevealDirective } from '../motion/page-reveal';

@Component({
  selector:'hr-card-list-row',standalone:true,
  imports:[MatButtonModule,MatCheckboxModule,PageRevealDirective],
  template:`<article class="card-list-row" [attr.data-card-id]="card.id" hrReveal [hrRevealDelay]="delay" [class.suspended]="card.suspended"><mat-checkbox [checked]="selected" (change)="selection.emit($event.checked)"><span class="sr-only">Select {{card.answer}}</span></mat-checkbox><div class="card-list-thumb">@if(card.image){<img [src]="store.mediaUrl(card.image)" [alt]="card.meaning || 'Card illustration'" loading="lazy">}@else{<span aria-hidden="true">Aa</span>}</div><div class="card-list-copy"><h3>{{card.answer}}</h3><p>{{summary}}</p><span>{{rarity}} · {{card.suspended?'Suspended':introduced?'Introduced':'New'}}@if(card.ankiSource){ · Anki}</span></div><div class="actions"><button mat-button [attr.aria-label]="'Edit '+card.answer" (click)="edit.emit()">Edit</button><button mat-button [attr.aria-label]="'Duplicate '+card.answer" (click)="duplicate.emit()">Duplicate</button><button mat-button [attr.aria-label]="(card.suspended?'Resume ':'Suspend ')+card.answer" (click)="suspend.emit()">{{card.suspended?'Resume':'Suspend'}}</button></div></article>`,
  styles:[`.card-list-copy h3,.card-list-copy p{display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden}.card-list-copy h3{-webkit-line-clamp:2}.card-list-copy p{-webkit-line-clamp:2;white-space:normal;line-height:1.45}`]
})
export class CardListRowComponent{
  readonly store=inject(LocalStudyStore);
  @Input({required:true}) card!:CardContent;
  @Input() selected=false;
  @Input() introduced=false;
  @Input() rarity='';
  @Input() delay=0;
  @Output() readonly selection=new EventEmitter<boolean>();
  @Output() readonly edit=new EventEmitter<void>();
  @Output() readonly duplicate=new EventEmitter<void>();
  @Output() readonly suspend=new EventEmitter<void>();
  get summary():string{return (this.card.meaning.trim()&&this.card.meaning.trim()!==this.card.answer.trim()?this.card.meaning:this.card.front).replace(/\s+/g,' ').trim().slice(0,140);}
}
