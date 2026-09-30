import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FlashcardComponent } from '../card';
import { LocalStudyStore } from '../data/study-store';
import type { CardContent, Rarity } from '../../domain/models';
import { activeRewardEvents, RARITIES, rewardProgress } from '../../domain/rewards';
import { PageRevealDirective } from '../motion/page-reveal';

@Component({
  selector: 'hr-collection',
  standalone: true,
  imports: [FlashcardComponent, MatButtonModule, MatProgressBarModule, PageRevealDirective],
  template: `
    <div class="collection-heading" hrReveal><h1>Collection</h1><p>Inspect your cards, authored rarities and earned cosmetics.</p></div>
    @if (selected(); as card) {
      <section class="showcase" aria-labelledby="inspection-title" hrReveal [hrRevealDelay]="55">
        <div class="inspection-card">
          <hr-card [card]="card" [dragTilt]="true" [flippable]="true" (flipped)="revealed.set($event)" [revealed]="revealed()" [rarity]="displayRarity()" [demo]="isPreview()" [effects]="store.data()?.preferences?.effects ?? true" [design]="store.designFor(card)" [imageUrl]="store.mediaUrl(card.image)" [backImageUrl]="store.mediaUrl(card.backImage || card.image)" [backgroundUrl]="store.mediaUrl(store.designFor(card)?.background)" [frameUrl]="store.mediaUrl(store.designFor(card)?.frames?.[displayRarity()] || store.designFor(card)?.frame)" [textureUrl]="store.mediaUrl(store.designFor(card)?.texture)"/>
        </div>
        <div class="inspection-details">
          <span class="status-chip">{{ sampleTier() ? 'Design sample · not earned' : progress(card).earned ? 'Cosmetic earned' : 'Cosmetic locked · study available' }}</span>
          <h2 id="inspection-title">{{ sampleTier() ? tierName(sampleTier()!) + ' preview' : card.answer }}</h2>
          <p class="deck-name">{{ deckName(card.deckId) }}</p>
          @if (!sampleTier() && !progress(card).earned && (card.rarity || 'common') !== 'common') { <div class="inspection-actions"><button mat-stroked-button (click)="previewLocked.set(!previewLocked())">{{ previewLocked() ? 'Show current appearance' : 'Preview authored cosmetic' }}</button></div> }
          <dl class="card-details"><div><dt>Authored rarity</dt><dd>{{ tierName(card.rarity || 'common') }}</dd></div><div><dt>Current view</dt><dd>{{ tierName(displayRarity()) }}{{ isPreview() ? ' · preview' : '' }}</dd></div><div><dt>Design</dt><dd>{{ store.designFor(card)?.name || 'HoloRecall original' }}</dd></div><div><dt>Design credit</dt><dd>{{ store.designFor(card) ? (store.designFor(card)?.credit || 'No credit provided') : 'Original HoloRecall artwork and frame' }}</dd></div>@if (store.designFor(card)?.source) {<div><dt>Source</dt><dd>{{ store.designFor(card)?.source }}</dd></div>}@if (store.designFor(card)?.license) {<div><dt>Licence</dt><dd>{{ store.designFor(card)?.license }}</dd></div>}</dl>
          @if (sampleTier()) {
            <div class="unlock-panel"><h3>Sample presentation</h3><p>This view demonstrates a treatment. It creates no reviews, reward events or earned progress.</p><p>{{ required(sampleTier()!) }} qualifying study {{ required(sampleTier()!) === 1 ? 'day' : 'days' }} currently required to earn this tier.</p></div>
          } @else {
            <div class="unlock-panel"><div class="progress-label"><span>{{ progress(card).days }} / {{ progress(card).required }} qualifying days</span><strong>{{ progress(card).earned ? 'Earned' : 'In progress' }}</strong></div><mat-progress-bar mode="determinate" [value]="percent(card)" [attr.aria-label]="'Unlock progress: ' + progress(card).days + ' of ' + progress(card).required + ' qualifying days'"/><details><summary>{{ progress(card).earned ? 'Unlock details' : 'How to unlock' }}</summary><p>Rate a scheduled review 4 or 5 on distinct study days, at least 20 hours apart. Practice, repeated submissions and imports do not count. Undo reverses that review’s contribution.</p><p>Later forgetting keeps earned cosmetics. Confidence is self-reported; it does not prove mastery.</p></details></div>
          }
          <p class="interaction-hint">Click or tap the card to turn it. Keyboard: focus the card and press Enter or Space. Dragging tilts without turning it.</p>
        </div>
      </section>
    }
    @if(nextUnlock();as next){<section class="unlock-panel next-unlock" hrReveal aria-labelledby="next-unlock-title"><div><p class="eyebrow">NEXT UNLOCK</p><h2 id="next-unlock-title">{{next.card.answer}} · {{tierName(next.card.rarity || 'common')}}</h2><p>{{next.remaining}} more eligible {{next.remaining===1?'study day':'study days'}}. Current progress {{next.progress.days}} of {{next.progress.required}}.</p></div><div class="next-unlock-symbol" aria-hidden="true">{{tierSymbol(next.card.rarity || 'common')}}</div><mat-progress-bar mode="determinate" [value]="percent(next.card)" [attr.aria-label]="next.card.answer+' unlock progress '+next.progress.days+' of '+next.progress.required"/><details><summary>How to unlock</summary><p>Scheduled ratings 4 or 5 contribute on distinct study days at least 20 hours apart. Honest lower ratings keep scheduling accurate and never remove an earned cosmetic.</p></details></section>}
    @if(recentlyUnlocked().length){<section class="recent-unlocks" hrReveal aria-labelledby="recent-title"><div class="section-title"><h2 id="recent-title">Recently unlocked</h2><span>Earned from real scheduled reviews</span></div><div class="collection-grid">@for(item of recentlyUnlocked();track item.event.id){<button class="collection-item" (click)="inspect(item.card)"><span class="sample-symbol" aria-hidden="true">{{tierSymbol(item.event.rarity)}}</span><span class="item-copy"><strong>{{item.card.answer}}</strong><span>{{tierName(item.event.rarity)}}</span><small>{{item.event.timestamp.slice(0,10)}}</small></span><span class="inspect-arrow" aria-hidden="true">↗</span></button>}</div></section>}
    <section class="owned-section" aria-labelledby="cards-title"><div class="section-title" hrReveal><h2 id="cards-title">Your cards</h2><span>{{ store.cards().length }} cards · {{ earnedCount() }} authored cosmetics earned</span></div>
      <div class="collection-grid">@for (card of store.cards(); track card.id; let index = $index) { <button class="collection-item" hrReveal [hrRevealDelay]="index * 45" [class.selected]="selectedId() === card.id && !sampleTier()" (click)="inspect(card)" [attr.aria-label]="'Inspect ' + card.answer"><span class="thumbnail">@if (store.mediaUrl(card.image)) {<img [src]="store.mediaUrl(card.image)" alt="" loading="lazy">}@else {<span aria-hidden="true">▧</span>}</span><span class="item-copy"><strong>{{ card.answer }}</strong><span>{{ tierSymbol(card.rarity || 'common') }} {{ tierName(card.rarity || 'common') }}</span><small>{{ progress(card).earned ? 'Earned' : progress(card).days + '/' + progress(card).required + ' qualifying days' }}</small></span><span class="inspect-arrow" aria-hidden="true">↗</span></button> }</div>
    </section>
    <section class="sample-section" aria-labelledby="samples-title" hrReveal><div class="section-title"><h2 id="samples-title">Design samples</h2><span>Previews · no earned progress</span></div><p>Inspect all seven frame treatments without changing study data.</p><div class="sample-grid">@for (tier of tiers; track tier.id) {<button class="sample-button" [class.selected]="sampleTier() === tier.id" [attr.data-rarity]="tier.id" (click)="inspectSample(tier.id)"><span class="sample-symbol" aria-hidden="true">{{ tier.symbol }}</span><strong>{{ tier.label }}</strong><small>Preview · {{ required(tier.id) }} {{ required(tier.id) === 1 ? 'day' : 'days' }}</small></button>}</div></section>
  `,
  styleUrl: './collection.css',
})
export class CollectionComponent {
  readonly store = inject(LocalStudyStore);
  readonly tiers = RARITIES;
  readonly selectedId = signal('');
  readonly sampleTier = signal<Rarity | null>(null);
  readonly previewLocked = signal(false);
  readonly revealed = signal(true);
  readonly selected = computed(() => this.store.cards().find(card => card.id === this.selectedId()) ?? this.store.cards()[0]);
  readonly earnedCount = computed(() => this.store.cards().filter(card => this.progress(card).earned).length);
  readonly recentlyUnlocked = computed(() => { const state = this.store.data(); if (!state) return []; return activeRewardEvents(state).filter(event => event.kind === 'unlock').sort((a,b) => b.timestamp.localeCompare(a.timestamp)).slice(0,4).flatMap(event => { const card = state.cards.find(item => item.id === event.cardId); return card ? [{ event, card }] : []; }); });
  readonly nextUnlock = computed(() => { const candidates = this.store.cards().map(card => ({ card, progress: this.progress(card) })).filter(item => !item.progress.earned).map(item => ({ ...item, remaining: Math.max(0,item.progress.required-item.progress.days) })).sort((a,b) => a.remaining-b.remaining || a.card.answer.localeCompare(b.card.answer)); return candidates[0]; });
  readonly displayRarity = computed<Rarity>(() => {
    const card = this.selected();
    if (!card) return 'common';
    return this.sampleTier() || (this.progress(card).earned || this.previewLocked() ? card.rarity || 'common' : 'common');
  });
  readonly isPreview = computed(() => !!this.sampleTier() || this.previewLocked());
  progress(card: CardContent) { const data = this.store.data(); return data ? rewardProgress(data, card.id) : { earned: false, days: 0, required: 1 }; }
  percent(card: CardContent): number { const value = this.progress(card); return Math.min(100, value.days / value.required * 100); }
  required(rarity: Rarity): number { return this.store.data()?.rewardConfig[rarity] ?? 1; }
  tierName(rarity: Rarity): string { return this.tiers.find(tier => tier.id === rarity)?.label ?? 'Common'; }
  tierSymbol(rarity: Rarity): string { return this.tiers.find(tier => tier.id === rarity)?.symbol ?? '●'; }
  deckName(id: string): string { return this.store.decks().find(deck => deck.id === id)?.name ?? 'Deck unavailable'; }
  inspect(card: CardContent): void { this.selectedId.set(card.id); this.sampleTier.set(null); this.previewLocked.set(false); this.revealed.set(true); this.scrollToInspection(); }
  inspectSample(rarity: Rarity): void { this.sampleTier.set(rarity); this.revealed.set(true); this.scrollToInspection(); }
  private scrollToInspection(): void { document.getElementById('inspection-title')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' }); }
}
