import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector:'hr-deck-anki-actions',standalone:true,imports:[MatButtonModule],
  template:`<div class="source-status"><span class="status-chip">Imported from Anki</span><button mat-button type="button" (click)="manage.emit(deckId)">Manage Anki source</button></div>`,
  styles:[`.source-status{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-top:.75rem}.status-chip{display:inline-flex;align-items:center;padding:.35rem .65rem;border-radius:var(--mat-sys-corner-small);background:var(--mat-sys-secondary-container);color:var(--mat-sys-on-secondary-container);font:var(--mat-sys-label-small)}`]
})
export class DeckAnkiActionsComponent{
  @Input({required:true}) deckId='';
  @Output() readonly manage=new EventEmitter<string>();
}
