import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { Deck } from '../../domain/models';
import { DeckJourneyActionsComponent, type DeckManagementAction } from './deck-journey-actions';

@Component({
  selector: 'hr-subdeck-row', standalone: true, imports: [DeckJourneyActionsComponent],
  template: `<article class="subdeck-row" [id]="'deck-'+deck.id" [style.--deck-depth]="depth"><div><span class="eyebrow">SUBDECK</span><h3>{{deck.name}}</h3><p>{{cardCount}} cards · {{readyCount}} ready@if(subdeckCount){ · {{subdeckCount}} subdecks}</p></div><hr-deck-journey-actions [disabled]="deck.suspended || busy" [archived]="!!deck.archived" (study)="study.emit()" (focus)="focus.emit()" (manage)="manage.emit($event)"/></article>`,
  styles: [`.subdeck-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:18px;padding:14px 16px;margin-inline-start:calc(var(--deck-depth,1) * 18px);border:1px solid var(--mat-sys-outline-variant);border-radius:var(--mat-sys-corner-medium);background:var(--mat-sys-surface-container-lowest)}.eyebrow{font:var(--mat-sys-label-small);font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:var(--mat-sys-on-surface-variant)}h3{margin:3px 0;font:var(--mat-sys-title-medium)}p{margin:0;font:var(--mat-sys-body-small);color:var(--mat-sys-on-surface-variant)}@media(max-width:580px){.subdeck-row{grid-template-columns:1fr;margin-inline-start:8px}}`],
})
export class SubdeckRowComponent {
  @Input({required:true}) deck!: Deck;
  @Input() cardCount=0;
  @Input() readyCount=0;
  @Input() subdeckCount=0;
  @Input() depth=1;
  @Input() busy=false;
  @Output() readonly study=new EventEmitter<void>();
  @Output() readonly focus=new EventEmitter<void>();
  @Output() readonly manage=new EventEmitter<DeckManagementAction>();
}
