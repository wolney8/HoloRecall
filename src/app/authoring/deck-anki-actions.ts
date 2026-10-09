import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector:'hr-deck-anki-actions',standalone:true,imports:[MatButtonModule],
  template:`<section class="source-group" aria-label="Manage Anki source"><span class="group-label">Anki source</span><div class="source-status"><span class="status-chip">Source linked</span><button mat-button type="button" (click)="manage.emit(deckId)">Manage Anki source</button></div></section>`,
  styles:[`.source-group{margin-top:1rem;padding-top:.75rem;border-top:1px solid var(--mat-sys-outline-variant)}.group-label{display:block;margin-bottom:.35rem;font:var(--mat-sys-label-small);color:var(--mat-sys-on-surface-variant)}.source-status{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}.status-chip{display:inline-flex;align-items:center;padding:.35rem .65rem;border-radius:var(--mat-sys-corner-small);background:var(--mat-sys-secondary-container);color:var(--mat-sys-on-secondary-container);font:var(--mat-sys-label-small)}`]
})
export class DeckAnkiActionsComponent{
  @Input({required:true}) deckId='';
  @Output() readonly manage=new EventEmitter<string>();
}
