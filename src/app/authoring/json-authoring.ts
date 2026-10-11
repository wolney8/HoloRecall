import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { Deck } from '../../domain/models';
import { JSON_AUTHORING_EXAMPLE, JSON_AUTHORING_SCHEMA, previewJsonAuthoring, type JsonAuthoringPreview } from '../../domain/json-authoring';
import { LocalStudyStore } from '../data/study-store';
import { FILE_DELIVERY } from '../platform/file-delivery';

@Component({
  selector: 'hr-json-authoring',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <details class="json-authoring">
      <summary>Batch-create cards from JSON</summary>
      <p class="hint">Paste a friendly card list or the official versioned card-batch format. HoloRecall validates the complete batch before saving anything.</p>
      <div class="actions"><button mat-stroked-button type="button" (click)="downloadExample()">Download example and schema</button><button mat-button type="button" (click)="loadExample()">Load example</button></div>
      <mat-form-field appearance="outline" class="full"><mat-label>Card JSON</mat-label><textarea matInput rows="12" [ngModel]="raw()" (ngModelChange)="changeRaw($event)" spellcheck="false"></textarea></mat-form-field>
      <div class="actions"><button mat-flat-button type="button" (click)="analyse()" [disabled]="busy() || !raw().trim()">Analyse batch</button>@if(preview();as plan){<span class="status-chip" [class.error]="!plan.valid">{{plan.valid ? plan.cards.length + ' cards ready' : plan.errors.length + ' errors'}}</span>}</div>
      @if(preview();as plan){
        @if(plan.errors.length){<section class="json-errors" role="alert"><h3>Fix before saving</h3><ul>@for(error of plan.errors;track $index){<li>{{error.index < 0 ? 'File' : 'Card '+(error.index+1)}} · {{error.message}}</li>}</ul></section>}
        @if(plan.cards.length){<section aria-label="Batch preview"><h3>Preview</h3><div class="json-preview-grid">@for(card of plan.cards.slice(0,3);track card.id){<article class="json-card"><span class="eyebrow">RECALL</span><strong>{{card.front}}</strong><hr><span class="eyebrow">ANSWER</span><b>{{card.answer}}</b>@if(card.secondary){<span>{{card.secondary}}</span>}@if(card.interpretation){<small>{{card.interpretation}}</small>}</article>}</div>@if(plan.cards.length>3){<p class="hint">Showing 3 of {{plan.cards.length}} validated cards.</p>}</section>}
        <div class="actions end"><button mat-flat-button type="button" (click)="apply()" [disabled]="busy() || !plan.valid">Add {{plan.cards.length}} cards</button></div>
      }
      @if(notice()){<p class="inline-notice" role="status">{{notice()}}</p>}
    </details>
  `,
  styles: [`
    :host{display:block;grid-column:1/-1}.json-authoring{margin-block:var(--hr-space-4,1rem);padding:var(--hr-space-4,1rem);border:1px solid var(--mat-sys-outline-variant);border-radius:var(--mat-sys-corner-large);background:var(--mat-sys-surface-container-low)}summary{cursor:pointer;font:var(--mat-sys-title-medium)}.full{width:100%;margin-top:var(--hr-space-4,1rem)}.json-errors{margin-block:1rem;padding:1rem;border-radius:var(--mat-sys-corner-medium);background:var(--mat-sys-error-container);color:var(--mat-sys-on-error-container)}.json-preview-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr));gap:var(--hr-space-4,1rem)}.json-card{display:grid;gap:.5rem;min-width:0;padding:1rem;border:1px solid var(--mat-sys-outline-variant);border-radius:var(--mat-sys-corner-large);background:linear-gradient(145deg,var(--mat-sys-primary-container),var(--mat-sys-surface-container-high));color:var(--mat-sys-on-surface)}.json-card hr{width:100%;border:0;border-top:1px solid var(--mat-sys-outline-variant)}.json-card span,.json-card small{color:var(--mat-sys-on-surface-variant)}.status-chip.error{background:var(--mat-sys-error-container);color:var(--mat-sys-on-error-container)}@media(max-width:40rem){.json-authoring{padding:var(--hr-space-3,.75rem)}}
  `],
})
export class JsonAuthoringComponent {
  readonly deck = input.required<Deck>();
  readonly store = inject(LocalStudyStore);
  private readonly fileDelivery = inject(FILE_DELIVERY);
  readonly raw = signal('');
  readonly preview = signal<JsonAuthoringPreview | null>(null);
  readonly busy = signal(false);
  readonly notice = signal('');
  private expectedVersion = -1;

  changeRaw(value: string): void { this.raw.set(value); this.preview.set(null); this.notice.set(''); }
  loadExample(): void { this.changeRaw(JSON.stringify(JSON_AUTHORING_EXAMPLE.cards, null, 2)); }
  analyse(): void { this.expectedVersion = this.store.data()?.version ?? -1; this.preview.set(previewJsonAuthoring(this.raw(), this.deck())); this.notice.set(''); }
  async apply(): Promise<void> {
    const plan = this.preview(); if (!plan?.valid || this.busy()) return;
    this.busy.set(true);
    try { await this.store.applyJsonAuthoring(plan, this.expectedVersion); this.notice.set(`${plan.cards.length} cards added. They inherit this deck's Design Set; no learning progress or cosmetics were granted.`); this.raw.set(''); this.preview.set(null); }
    catch (error) { this.notice.set(error instanceof Error ? error.message : String(error)); }
    finally { this.busy.set(false); }
  }
  async downloadExample(): Promise<void> {
    const payload = { schema: JSON_AUTHORING_SCHEMA, example: JSON_AUTHORING_EXAMPLE, note: 'Plain learning text only. HTML and executable content are rejected.' };
    try { await this.fileDelivery.deliver(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), 'holorecall-card-batch-v1.example.json'); }
    catch (error) { this.notice.set(error instanceof Error ? error.message : String(error)); }
  }
}
