import { Component, computed, effect, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FlashcardComponent } from '../card';
import { LocalStudyStore } from '../data/study-store';
import type { CardContent, Rarity } from '../../domain/models';
import { activeRewardEvents, prestigeProgress, RARITIES, rewardProgress } from '../../domain/rewards';
import { PageRevealDirective } from '../motion/page-reveal';
import { LibraryViewService } from '../library/library-view.service';
import { ReviewHistoryComponent } from '../history/review-history';
import { AnswerSupportComponent } from '../answer-support';

@Component({
  selector: 'hr-collection',
  standalone: true,
  imports: [FormsModule, FlashcardComponent, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressBarModule, MatCheckboxModule, PageRevealDirective,ReviewHistoryComponent,AnswerSupportComponent],
  template: `
    <div class="page-heading collection-heading" hrReveal><div><p class="eyebrow">{{contextDeck()||contextLabel?'DECK CARDS':'CARD LIBRARY'}}</p><h1>{{contextLabel||contextDeck()?.name||'Collection'}}</h1><p>{{contextDeck()||contextLabel?'Browse this imported set as collectible cards. Search and filters stay scoped until cleared.':'Inspect cards, authored rarity and earned cosmetics.'}}</p></div></div>
    <section class="collection-tools" hrReveal aria-label="Search collection"><mat-form-field appearance="outline"><mat-label>{{contextDeck()?'Search this deck':'Search collection'}}</mat-label><input id="collection-search" matInput [ngModel]="library.query()" (ngModelChange)="library.setQuery($event)" autocomplete="off"></mat-form-field><div class="view-presets" aria-label="Collection views"><button mat-stroked-button (click)="showAll()">All cards</button><button mat-button (click)="library.setFilter('rarities',['rare','holo-rare','ultra-rare','secret-rare','relic'])">Higher rarities</button><button mat-button (click)="library.setFilter('earned','earned')">Earned</button><button mat-button (click)="prestigeFilter.set(prestigeFilter()==='prestige'?'all':'prestige')" [attr.aria-pressed]="prestigeFilter()==='prestige'">Prestige</button><button mat-button (click)="prestigeSort.set(prestigeSort()==='level'?'library':'level')" [attr.aria-pressed]="prestigeSort()==='level'">Sort by Prestige</button><button mat-button (click)="library.setFilter('earned','unearned')">Next unlock</button><button mat-button (click)="filtersOpen.set(!filtersOpen())" [attr.aria-expanded]="filtersOpen()">Filters{{library.activeFilterCount()?' ('+library.activeFilterCount()+')':''}}</button>@if(library.activeFilterCount()||prestigeFilter()!=='all'||prestigeSort()!=='library'){<button mat-button (click)="showAll()">Clear filters</button>}</div>
      @if(library.filterChips().length){<div class="active-filter-chips" aria-label="Active collection filters">@for(chip of library.filterChips();track chip.key+chip.value){<button type="button" (click)="library.removeFilterChip(chip.key,chip.value)" [attr.aria-label]="'Remove '+chip.label+' filter'">{{chip.label}} <span aria-hidden="true">×</span></button>}</div>}
      @if(filtersOpen()){<div class="collection-filter-panel"><fieldset><legend>Deck</legend>@for(deck of store.decks();track deck.id){<mat-checkbox [checked]="library.filters().deckIds?.includes(deck.id)" (change)="toggle('deckIds',deck.id)">{{deck.name}}</mat-checkbox>}</fieldset><fieldset><legend>Tags</legend>@for(tag of library.tags();track tag){<mat-checkbox [checked]="library.filters().tags?.includes(tag)" (change)="toggle('tags',tag)">{{tag}}</mat-checkbox>}</fieldset><fieldset><legend>Study</legend>@for(state of studyFilters;track state){<mat-checkbox [checked]="library.filters().studyStates?.includes(state)" (change)="toggle('studyStates',state)">{{state}}</mat-checkbox>}</fieldset><fieldset><legend>Media</legend>@for(media of mediaFilters;track media){<mat-checkbox [checked]="library.filters().media?.includes(media)" (change)="toggle('media',media)">{{media}}</mat-checkbox>}</fieldset><fieldset><legend>Rarity</legend>@for(tier of tiers;track tier.id){<mat-checkbox [checked]="library.filters().rarities?.includes(tier.id)" (change)="toggle('rarities',tier.id)">{{tier.label}}</mat-checkbox>}</fieldset><fieldset><legend>Design</legend>@for(design of store.data()!.designs;track design.id){<mat-checkbox [checked]="library.filters().designSetIds?.includes(design.id)" (change)="toggle('designSetIds',design.id)">{{design.name}}</mat-checkbox>}</fieldset></div>}
      @if(library.status()==='building'){<p class="hint" aria-live="polite">Updating local index…</p>}@else if(library.query()&&!library.page().total){<p class="empty-inline">No results.</p>}</section>
    @if(library.page().total){<div class="actions collection-practice-actions" hrReveal><button mat-flat-button (click)="practiceCards.emit(library.allMatchingIds())">Practice current results</button></div>}
    @if (selected(); as card) {
      <section id="collection-inspection" class="showcase" aria-labelledby="inspection-title" hrReveal [hrRevealDelay]="55">
        <div class="inspection-card">
          <hr-card [card]="card" [presentation]="store.presentationFor(card)" [prestigeLevel]="prestige(card).level" [dragTilt]="true" [flippable]="true" (flipped)="revealed.set($event)" [revealed]="revealed()" [rarity]="displayRarity()" [demo]="isPreview()" [effects]="store.data()?.preferences?.effects ?? true" [design]="store.designFor(card)" [imageUrl]="store.mediaUrl(card.image)" [backImageUrl]="store.mediaUrl(card.backImage || card.image)" [backgroundUrl]="store.mediaUrl(store.designFor(card)?.background)" [frameUrl]="store.mediaUrl(store.designFor(card)?.frames?.[displayRarity()] || store.designFor(card)?.frame)" [textureUrl]="store.mediaUrl(store.designFor(card)?.texture)"/>
        </div>
        <div class="inspection-details">
          <span class="status-chip">{{ sampleTier() ? 'Design sample · not earned' : prestige(card).level ? 'Prestige '+roman(prestige(card).level) : progress(card).earned ? 'Mastery earned' : 'Cosmetic locked · study available' }}</span>
          <h2 id="inspection-title">{{ sampleTier() ? tierName(sampleTier()!) + ' preview' : inspectionTitle(card) }}</h2>
          <p class="deck-name">{{ deckName(card.deckId) }}</p>
          @if (!sampleTier() && !progress(card).earned && (card.rarity || 'common') !== 'common') { <div class="inspection-actions"><button mat-stroked-button (click)="previewLocked.set(!previewLocked())">{{ previewLocked() ? 'Show current appearance' : 'Preview authored cosmetic' }}</button></div> }
          <dl class="card-details"><div><dt>Authored rarity</dt><dd>{{ tierName(card.rarity || 'common') }}</dd></div><div><dt>Prestige</dt><dd>{{prestige(card).level?'P '+roman(prestige(card).level):'Not yet prestiged'}}</dd></div><div><dt>Current view</dt><dd>{{ tierName(displayRarity()) }}{{ isPreview() ? ' · preview' : '' }}</dd></div><div><dt>Design</dt><dd>{{ store.designFor(card)?.name || 'HoloRecall original' }}</dd></div><div><dt>Design credit</dt><dd>{{ store.designFor(card) ? (store.designFor(card)?.credit || 'No credit provided') : 'Original HoloRecall artwork and frame' }}</dd></div>@if (store.designFor(card)?.source) {<div><dt>Source</dt><dd>{{ store.designFor(card)?.source }}</dd></div>}@if (store.designFor(card)?.license) {<div><dt>Licence</dt><dd>{{ store.designFor(card)?.license }}</dd></div>}</dl>
          @if(card.details?.length||card.meaning||card.interpretation||card.notes){<hr-answer-support [card]="card" [interpretationOnCard]="false"/>}
          @if(!sampleTier()){<div class="inspection-actions practice-card-actions"><button mat-flat-button (click)="practiceCards.emit([card.id])">Practice this card</button></div>}
          @if (sampleTier()) {
            <div class="unlock-panel"><h3>Sample presentation</h3><p>This view demonstrates a treatment. It creates no reviews, reward events or earned progress.</p><p>{{ required(sampleTier()!) }} qualifying study {{ required(sampleTier()!) === 1 ? 'day' : 'days' }} currently required to earn this tier.</p></div>
          } @else {
            <div class="unlock-panel">@if(progress(card).earned){<div class="progress-label"><span>{{prestige(card).capped?'Prestige complete':prestige(card).days+' / '+prestige(card).required+' toward P '+roman(prestige(card).cycle)}}</span><strong>{{prestige(card).level?'P '+roman(prestige(card).level):'Mastered'}}</strong></div><mat-progress-bar mode="determinate" [value]="prestigePercent(card)" [attr.aria-label]="prestige(card).capped?'Prestige ten complete':'Prestige progress: '+prestige(card).days+' of '+prestige(card).required"/>}@else{<div class="progress-label"><span>{{ progress(card).days }} / {{ progress(card).required }} qualifying days</span><strong>Mastery in progress</strong></div><mat-progress-bar mode="determinate" [value]="percent(card)" [attr.aria-label]="'Unlock progress: ' + progress(card).days + ' of ' + progress(card).required + ' qualifying days'"/>}<details><summary>How Prestige works</summary><p>First earn this card’s authored-rarity mastery. Later eligible scheduled ratings can fill one Prestige cycle at a time, through Prestige X.</p><p>Contributions require distinct study days at least 20 hours apart. Free Revision, imports, duplicate ratings and Results replay do not count. Undo reverses dependent progress. Honest lower confidence never removes earned levels.</p></details></div>
          }
          <p class="interaction-hint">Click or tap the card to turn it. Keyboard: focus the card and press Enter or Space. Dragging tilts without turning it.</p>
          @if(!sampleTier()){<hr-review-history [cardId]="card.id"/>}
        </div>
      </section>
    }
    @if(nextUnlock();as next){<section class="unlock-panel next-unlock" hrReveal aria-labelledby="next-unlock-title"><div><p class="eyebrow">NEXT UNLOCK</p><h2 id="next-unlock-title">{{next.card.answer}} · {{tierName(next.card.rarity || 'common')}}</h2><p>{{next.remaining}} more eligible {{next.remaining===1?'study day':'study days'}}. Current progress {{next.progress.days}} of {{next.progress.required}}.</p></div><div class="next-unlock-symbol" aria-hidden="true">{{tierSymbol(next.card.rarity || 'common')}}</div><mat-progress-bar mode="determinate" [value]="percent(next.card)" [attr.aria-label]="next.card.answer+' unlock progress '+next.progress.days+' of '+next.progress.required"/><details><summary>How to unlock</summary><p>Scheduled ratings 4 or 5 contribute on distinct study days at least 20 hours apart. Honest lower ratings keep scheduling accurate and never remove an earned cosmetic.</p></details></section>}
    @if(recentlyUnlocked().length){<section class="recent-unlocks" hrReveal aria-labelledby="recent-title"><div class="section-title"><h2 id="recent-title">Recently unlocked</h2><span>Earned from real scheduled reviews</span></div><div class="collection-grid">@for(item of recentlyUnlocked();track item.event.id){<button class="collection-item" (click)="inspect(item.card)"><span class="sample-symbol" aria-hidden="true">{{tierSymbol(item.event.rarity)}}</span><span class="item-copy"><strong>{{item.card.answer}}</strong><span>{{tierName(item.event.rarity)}}</span><small>{{item.event.timestamp.slice(0,10)}}</small></span><span class="inspect-arrow" aria-hidden="true">↗</span></button>}</div></section>}
    @if(recentlyPrestiged().length){<section class="recent-unlocks" hrReveal aria-labelledby="recent-prestige-title"><div class="section-title"><h2 id="recent-prestige-title">Recently prestiged</h2><span>Earned mastery milestones</span></div><div class="collection-grid">@for(item of recentlyPrestiged();track item.event.id){<button class="collection-item" (click)="inspect(item.card)"><span class="sample-symbol" aria-hidden="true">P {{roman(item.event.level)}}</span><span class="item-copy"><strong>{{item.card.answer}}</strong><span>Prestige {{roman(item.event.level)}}</span><small>{{item.event.timestamp.slice(0,10)}}</small></span><span class="inspect-arrow" aria-hidden="true">↗</span></button>}</div></section>}
    <section class="owned-section" aria-labelledby="cards-title"><div class="section-title" hrReveal><h2 id="cards-title">Cards</h2><span>Showing {{library.page().items.length}} of {{ library.page().total }} · {{ earnedCount() }} cosmetics earned</span></div>
      <div class="collectible-grid">@for (item of visibleItems(); track item.card.id; let index = $index) { @let card=item.card;<article class="collectible-item" hrReveal [hrRevealDelay]="(index % 6) * 35" [class.selected]="selectedId() === card.id && !sampleTier()"><div class="collectible-card"><hr-card [card]="card" [presentation]="store.presentationFor(card)" [prestigeLevel]="prestige(card).level" [compact]="true" [dragTilt]="true" [flippable]="true" [revealed]="gridRevealedId()===card.id" (flipped)="setGridRevealed(card.id,$event)" [rarity]="card.rarity||'common'" [effects]="store.data()?.preferences?.effects ?? true" [design]="store.designFor(card)" [imageUrl]="store.mediaUrl(card.image)" [backImageUrl]="store.mediaUrl(card.backImage || card.image)" [backgroundUrl]="store.mediaUrl(store.designFor(card)?.background)" [frameUrl]="store.mediaUrl(store.designFor(card)?.frames?.[card.rarity||'common'] || store.designFor(card)?.frame)" [textureUrl]="store.mediaUrl(store.designFor(card)?.texture)"/></div><div class="collectible-summary"><span class="rarity-line">{{tierSymbol(card.rarity||'common')}} {{tierName(card.rarity||'common')}}@if(prestige(card).level){ · P {{roman(prestige(card).level)}}}</span><strong>{{card.front||card.answer}}</strong><span>{{card.answer}}</span>@if(card.pronunciation||card.meaning){<small>{{card.pronunciation||card.meaning}}</small>}<small>{{item.deckPath}}</small><button mat-stroked-button type="button" (click)="inspect(card)" [attr.aria-label]="'Inspect '+card.answer">Inspect card</button></div></article> }@empty{<p class="empty-state">No cards match this Prestige view.</p>}</div>
      @if(library.page().nextOffset){<div class="collection-more"><button mat-stroked-button (click)="library.more()">Load 60 more</button></div>}
    </section>
    <section class="sample-section" aria-labelledby="samples-title" hrReveal><div class="section-title"><h2 id="samples-title">Design samples</h2><span>Previews · no earned progress</span></div><p>Inspect all seven frame treatments without changing study data.</p><div class="sample-grid">@for (tier of tiers; track tier.id) {<button class="sample-button" [class.selected]="sampleTier() === tier.id" [attr.data-rarity]="tier.id" (click)="inspectSample(tier.id)"><span class="sample-symbol" aria-hidden="true">{{ tier.symbol }}</span><strong>{{ tier.label }}</strong><small>Preview · {{ required(tier.id) }} {{ required(tier.id) === 1 ? 'day' : 'days' }}</small></button>}</div></section>
  `,
  styleUrl: './collection.css',
})
export class CollectionComponent {
  @Input() contextDeckId='';
  @Input() contextLabel='';
  @Output() readonly contextCleared=new EventEmitter<void>();
  @Output() readonly practiceCards=new EventEmitter<string[]>();
  readonly store = inject(LocalStudyStore);
  readonly library = inject(LibraryViewService);
  readonly tiers = RARITIES;
  readonly selectedId = signal('');
  readonly sampleTier = signal<Rarity | null>(null);
  readonly previewLocked = signal(false);
  readonly revealed = signal(false);
  readonly gridRevealedId = signal<string | null>(null);
  readonly filtersOpen=signal(false);
  readonly prestigeFilter=signal<'all'|'prestige'>('all');
  readonly prestigeSort=signal<'library'|'level'>('library');
  readonly studyFilters=['due','overdue','new','learning','review','suspended','buried','leech','attention','recently-reviewed'] as const;
  readonly mediaFilters=['image','audio','none'] as const;
  readonly contextDeck=computed(()=>this.store.decks().find(deck=>deck.id===this.contextDeckId));
  readonly selected = computed(() => this.store.cards().find(card => card.id === this.selectedId()) ?? (this.contextDeckId||this.contextLabel ? this.library.page().items[0]?.card : this.store.cards()[0]));
  readonly earnedCount = computed(() => this.store.cards().filter(card => this.progress(card).earned).length);
  readonly visibleItems=computed(()=>{const items=[...this.library.page().items].filter(item=>this.prestigeFilter()==='all'||this.prestige(item.card).level>0);return this.prestigeSort()==='level'?items.sort((a,b)=>this.prestige(b.card).level-this.prestige(a.card).level||a.card.answer.localeCompare(b.card.answer)):items;});
  readonly recentlyUnlocked = computed(() => { const state = this.store.data(); if (!state) return []; return activeRewardEvents(state).filter(event => event.kind === 'unlock').sort((a,b) => b.timestamp.localeCompare(a.timestamp)).slice(0,4).flatMap(event => { const card = state.cards.find(item => item.id === event.cardId); return card ? [{ event, card }] : []; }); });
  readonly recentlyPrestiged=computed(()=>{const state=this.store.data();if(!state)return[];return activeRewardEvents(state).filter(event=>event.kind==='prestige-promotion').sort((a,b)=>b.timestamp.localeCompare(a.timestamp)).slice(0,4).flatMap(event=>{const card=state.cards.find(item=>item.id===event.cardId);return card?[{event,card}]:[];});});
  readonly nextUnlock = computed(() => { const candidates = this.store.cards().map(card => ({ card, progress: this.progress(card) })).filter(item => !item.progress.earned).map(item => ({ ...item, remaining: Math.max(0,item.progress.required-item.progress.days) })).sort((a,b) => a.remaining-b.remaining || a.card.answer.localeCompare(b.card.answer)); return candidates[0]; });
  readonly displayRarity = computed<Rarity>(() => {
    const card = this.selected();
    if (!card) return 'common';
    return this.sampleTier() || (this.progress(card).earned || this.previewLocked() ? card.rarity || 'common' : 'common');
  });
  readonly isPreview = computed(() => !!this.sampleTier() || this.previewLocked());
  constructor(){effect(()=>{const target=this.library.target();if(target?.kind==='card'){const card=this.store.cards().find(item=>item.id===target.cardId);if(card){this.library.target.set(null);queueMicrotask(()=>this.inspect(card));}}});}
  progress(card: CardContent) { const data = this.store.data(); return data ? rewardProgress(data, card.id) : { earned: false, days: 0, required: 1 }; }
  prestige(card:CardContent){const data=this.store.data();return data?prestigeProgress(data,card.id):{level:0,cycle:1,days:0,required:3,capped:false};}
  prestigePercent(card:CardContent):number{const value=this.prestige(card);return value.capped?100:Math.min(100,value.days/value.required*100);}
  roman(level:number):string{return['','I','II','III','IV','V','VI','VII','VIII','IX','X'][level]??'';}
  percent(card: CardContent): number { const value = this.progress(card); return Math.min(100, value.days / value.required * 100); }
  required(rarity: Rarity): number { return this.store.data()?.rewardConfig[rarity] ?? 1; }
  tierName(rarity: Rarity): string { return this.tiers.find(tier => tier.id === rarity)?.label ?? 'Common'; }
  tierSymbol(rarity: Rarity): string { return this.tiers.find(tier => tier.id === rarity)?.symbol ?? '●'; }
  deckName(id: string): string { return this.store.decks().find(deck => deck.id === id)?.name ?? 'Deck unavailable'; }
  inspectionTitle(card:CardContent):string{return card.kind==='visual'&&!card.front.trim()?'Card details':card.front.trim()||'Card details';}
  inspect(card: CardContent): void { this.gridRevealedId.set(null); this.selectedId.set(card.id); this.sampleTier.set(null); this.previewLocked.set(false); this.revealed.set(false); this.scrollToInspection(); }
  setGridRevealed(cardId:string,revealed:boolean):void{this.gridRevealedId.set(revealed?cardId:null);}
  inspectSample(rarity: Rarity): void { this.sampleTier.set(rarity); this.revealed.set(false); this.scrollToInspection(); }
  showAll():void{this.library.setQuery('');this.library.clear();this.prestigeFilter.set('all');this.prestigeSort.set('library');this.contextCleared.emit();}
  toggle(key:'deckIds'|'tags'|'rarities'|'designSetIds'|'studyStates'|'media',value:string):void{this.library.toggleListFilter(key as never,value as never);}
  private scrollToInspection(): void { document.getElementById('collection-inspection')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); }
}
