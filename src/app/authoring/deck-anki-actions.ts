import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector:'hr-deck-anki-actions',standalone:true,imports:[MatButtonModule],
  template:`<span class="source-label">Anki source</span><button mat-button type="button" (click)="manage.emit({id:deckId,mode:'update'})">Update from Anki package</button><button mat-button type="button" (click)="manage.emit({id:deckId,mode:'repair'})">Repair imported content</button><button mat-button type="button" (click)="manage.emit({id:deckId,mode:'mapping'})">Review field mapping</button>`,
  styles:[`:host{display:contents}.source-label{align-self:center;color:var(--mat-sys-on-surface-variant);font:var(--mat-sys-label-medium)}`]
})
export class DeckAnkiActionsComponent{
  @Input({required:true}) deckId='';
  @Output() readonly manage=new EventEmitter<{id:string;mode:'update'|'repair'|'mapping'}>();
}
