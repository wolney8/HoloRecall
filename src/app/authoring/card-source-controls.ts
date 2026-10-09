import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import type { CardContent } from '../../domain/models';

@Component({
  selector: 'hr-card-source-controls',
  standalone: true,
  imports: [MatButtonModule],
  template: `
    @if (card.ankiSource; as source) {
      <div class="imported-source">
        <span class="status-chip">Imported from Anki · {{ source.linkState === 'detached' ? 'Detached' : 'Linked' }}</span>
        <details>
          <summary>View source information</summary>
          <p>{{ source.modelName }} · {{ source.templateName }}</p>
          @if (source.linkState !== 'detached') {
            <p class="hint">Local edits are kept by default. A repair preview offers the latest source value only when it differs.</p>
            <div class="actions">
              <button mat-stroked-button type="button" (click)="manage.emit(card.deckId)">Repair/reconvert from source</button>
              <button mat-button type="button" (click)="detach.emit()">Detach from Anki source</button>
            </div>
          }
        </details>
      </div>
    }
  `,
  styles: [`.imported-source{padding:.75rem 0}.imported-source details{margin-top:.5rem}`],
})
export class CardSourceControlsComponent {
  @Input({ required: true }) card!: CardContent;
  @Output() readonly manage = new EventEmitter<string>();
  @Output() readonly detach = new EventEmitter<void>();
}
