import { Component, Input } from '@angular/core';
import type { CardContent } from '../domain/models';

export type Treatment = 'matte' | 'foil' | 'holo' | 'relic';

@Component({
  selector: 'hr-card',
  standalone: true,
  template: `
    <article class="memory-card" [class]="'memory-card ' + treatment" [class.effects]="effects" [class.compact]="compact" [class.revealed]="revealed" (pointermove)="shimmer($event)" (pointerleave)="reset($event)">
      <div class="shine" aria-hidden="true"></div>
      <header class="card-heading"><span>{{ demo ? 'COLLECTION STUDY' : 'THE RECALL COLLECTION' }}</span><span aria-hidden="true">✧</span></header>
      @if (card.kind === 'visual' && card.image) {
        <div class="illustration"><img [src]="card.image" [alt]="revealed ? card.meaning : (card.imageDescription || 'Visual recall illustration; reveal for the answer')" draggable="false"></div>
      }
      @if (revealed) {
        <div class="card-copy answer"><span class="eyebrow">{{ demo ? 'SAMPLE CARD' : 'THE ANSWER' }}</span><h3 [attr.lang]="card.deckId === 'italian-essentials' ? 'it' : null" tabindex="-1">{{ card.answer }}</h3><p class="pronunciation">{{ card.pronunciation }}</p><span class="approx">Approximate pronunciation</span>@if (!compact) {<p class="meaning">{{ card.meaning }}</p>}</div>
      } @else if (card.kind === 'text') {
        <div class="card-copy prompt"><span class="eyebrow">TAKE A MOMENT TO RECALL</span><h3>{{ card.front }}</h3></div>
      } @else {
        <div class="visual-prompt"><span class="small-star" aria-hidden="true">✧</span><span>Picture it. Say it.</span></div>
      }
      <footer><span>{{ demo ? 'DESIGN PREVIEW' : (revealed ? 'MAKE IT MEMORABLE' : 'TAKE A MOMENT TO RECALL') }}</span><span>{{ treatment === 'matte' ? '○' : treatment === 'foil' ? '◇' : treatment === 'holo' ? '✧' : '✦' }}</span></footer>
    </article>
  `,
  styleUrl: './card.css',
})
export class FlashcardComponent {
  @Input({ required: true }) card!: CardContent;
  @Input() revealed = false;
  @Input() treatment: Treatment = 'matte';
  @Input() effects = true;
  @Input() compact = false;
  @Input() demo = false;

  shimmer(event: PointerEvent): void {
    if (!this.effects || event.pointerType === 'touch' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    target.style.setProperty('--px', `${100 * (event.clientX - rect.left) / rect.width}%`);
    target.style.setProperty('--py', `${100 * (event.clientY - rect.top) / rect.height}%`);
  }
  reset(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement;
    target.style.removeProperty('--px');
    target.style.removeProperty('--py');
  }
}
