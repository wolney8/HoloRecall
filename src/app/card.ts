import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, inject, signal } from '@angular/core';
import type { CardContent, DesignSet, Rarity } from '../domain/models';
import { RARITIES } from '../domain/rewards';
import { AppLifecycle } from './platform/app-lifecycle';

/** Kept only to read the first prototype's four presentation names. Content uses Rarity. */
export type Treatment = 'matte' | 'foil' | 'holo' | 'relic';

@Component({
  selector: 'hr-card',
  standalone: true,
  template: `
    <div #motion class="card-motion" [class.motion-enabled]="animated()" [class.compact]="compact" [class.drag-enabled]="dragTilt" [class.flippable]="flippable"
      [attr.role]="flippable ? 'button' : null" [attr.tabindex]="flippable ? 0 : null" [attr.aria-pressed]="flippable ? displayedRevealed() : null"
      [attr.aria-label]="flippable ? (displayedRevealed() ? 'Show card front' : 'Show card answer') : null"
      (click)="activateFlip($event)" (keydown)="keyFlip($event)"
      (pointerdown)="beginTilt($event)" (pointermove)="tilt($event)" (pointerleave)="settle()" (pointerup)="settle()" (pointercancel)="settle()">
      <div #turn class="card-turn">
        <article class="memory-card" [attr.data-rarity]="shownRarity" [class.revealed]="displayedRevealed()" [class.effects]="animated()" [attr.data-theme-preview]="themePreview || null" [attr.aria-label]="rarityLabel + (demo ? ' design preview' : ' flashcard')">
          <div class="background-layer" aria-hidden="true">
            @if (backgroundUrl && !failedBackground()) { <img [src]="backgroundUrl" [style.object-fit]="design?.backgroundFit || 'cover'" [style.object-position]="(design?.backgroundPositionX ?? 50) + '% ' + (design?.backgroundPositionY ?? 50) + '%'" alt="" (error)="failedBackground.set(true)"> }
          </div>
          <div class="frame-layer" aria-hidden="true">@if (frameUrl && !failedFrame()) { <img [src]="frameUrl" [style.object-fit]="design?.frameFit || 'contain'" alt="" (error)="failedFrame.set(true)"> }</div>
          <div class="effects-layer" aria-hidden="true"><i class="foil-sweep"></i><i class="edge-light"></i><i class="particles">· ✧ ·</i></div>
          <header class="card-heading protected"><span>{{ demo ? 'DESIGN PREVIEW' : (displayedRevealed() ? 'ANSWER' : 'RECALL') }}</span><span class="tier"><span aria-hidden="true">{{ raritySymbol }}</span> {{ rarityLabel }}</span></header>
          <div class="illustration-layer" [class.no-illustration]="!hasIllustrationReference && card.kind !== 'visual'" [class.image-missing]="illustrationMissing">
            @if (illustration && !failedImage()) {
              <img [src]="illustration" [alt]="displayedRevealed() ? (card.meaning || card.imageDescription || 'Card illustration') : (card.imageDescription || 'Recall illustration. Reveal for the answer.')" (error)="failedImage.set(true)" draggable="false">
            } @else if (illustrationMissing) {
              <span class="missing-image"><span aria-hidden="true">▧</span> Illustration unavailable</span>
            }
          </div>
          <div #copy class="card-copy protected" [class.answer]="displayedRevealed()" [class.prompt]="!displayedRevealed()" [attr.tabindex]="scrollable() ? 0 : null" [attr.role]="scrollable() ? 'region' : null" [attr.aria-label]="scrollable() ? 'Card content. Scroll to read all text.' : null">
            @if (displayedRevealed()) {
              <h3 [attr.lang]="card.deckId === 'italian-essentials' ? 'it' : null" tabindex="-1">{{ card.answer }}</h3>
              @if (card.pronunciation) { <p class="pronunciation">{{ card.pronunciation }}</p><span class="approx">Approximate pronunciation</span> }
              @if (card.meaning && !compact) { <p class="meaning">{{ card.meaning }}</p> }
            } @else if (card.kind === 'text') { <h3>{{ card.front }}</h3> }
            @else { <span class="visual-prompt">Reveal for the answer</span> }
          </div>
          @if (missingDesignAsset) { <span class="fallback-note protected"><span>Design asset missing · default frame shown</span></span> }
          <footer class="protected"><span>{{ demo ? 'SAMPLE · NOT EARNED' : (displayedRevealed() ? 'Answer side' : 'Front side') }}</span>@if (scrollable()) { <span class="scroll-hint">Scroll text ↕</span> }<span class="tier-marks" aria-hidden="true">{{ raritySymbol }}</span></footer>
        </article>
      </div>
    </div>
  `,
  styleUrl: './card.css',
})
export class FlashcardComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) card!: CardContent;
  @Input() revealed = false;
  @Input() rarity?: Rarity;
  @Input() treatment?: Treatment;
  @Input() effects = true;
  @Input() compact = false;
  @Input() dragTilt = false;
  @Input() flippable = false;
  @Output() flipped = new EventEmitter<boolean>();
  @Input() demo = false;
  @Input() design?: DesignSet;
  @Input() imageUrl?: string;
  @Input() backImageUrl?: string;
  @Input() backgroundUrl?: string;
  @Input() frameUrl?: string;
  @Input() themePreview?: 'light' | 'dark';
  @ViewChild('motion') private motion?: ElementRef<HTMLElement>;
  @ViewChild('turn') private turn?: ElementRef<HTMLElement>;
  @ViewChild('copy') private copy?: ElementRef<HTMLElement>;
  readonly scrollable = signal(false);
  readonly displayedRevealed = signal(false);
  private copyResize?: ResizeObserver;
  private copyMutation?: MutationObserver;
  readonly animated = signal(false);
  readonly failedImage = signal(false);
  readonly failedBackground = signal(false);
  readonly failedFrame = signal(false);
  private observer?: IntersectionObserver;
  private preference?: MediaQueryList;
  private visible = false;
  private animations: Animation[] = [];
  private frame = 0;
  private dragging = false;
  private dragDistance = 0;
  private suppressFlipClick = false;
  private pointerStart?: { x: number; y: number };
  private flipSequence = 0;
  private readonly lifecycle = inject(AppLifecycle);
  private unsubscribeLifecycle?: () => void;
  private readonly motionChanged = () => { this.updateMotion(); this.settle(); };

  get shownRarity(): Rarity { return this.rarity ?? (this.treatment ? ({ matte: 'common', foil: 'uncommon', holo: 'holo-rare', relic: 'relic' } as const)[this.treatment] : this.card?.rarity ?? 'common'); }
  get rarityLabel(): string { return RARITIES.find(item => item.id === this.shownRarity)?.label ?? 'Common'; }
  get raritySymbol(): string { return RARITIES.find(item => item.id === this.shownRarity)?.symbol ?? '○'; }
  get illustration(): string {
    const front = this.imageUrl !== undefined ? this.imageUrl : this.card?.image || '';
    const back = this.backImageUrl !== undefined ? this.backImageUrl : this.card?.backImage;
    return this.displayedRevealed() ? back || front : front;
  }
  get hasIllustrationReference(): boolean { return !!(this.card?.image || this.imageUrl || (this.displayedRevealed() && (this.card?.backImage || this.backImageUrl))); }
  get illustrationMissing(): boolean { return (this.hasIllustrationReference || this.card?.kind === 'visual') && (!this.illustration || this.failedImage()); }
  get missingDesignAsset(): boolean { return this.failedBackground() || this.failedFrame() || !!(this.design?.background && !this.backgroundUrl) || !!((this.design?.frames?.[this.shownRarity] || this.design?.frame) && !this.frameUrl); }

  ngAfterViewInit(): void {
    this.preference = matchMedia('(prefers-reduced-motion: reduce)');
    this.preference.addEventListener('change', this.motionChanged);
    this.unsubscribeLifecycle = this.lifecycle.subscribe(active => { this.updateMotion(); if (!active) this.settle(); });
    this.observer = new IntersectionObserver(entries => { this.visible = !!entries[0]?.isIntersecting; this.updateMotion(); }, { threshold: 0.1 });
    if (this.motion) this.observer.observe(this.motion.nativeElement);
    if (this.copy) {
      const content = this.copy.nativeElement;
      const measure = () => this.scrollable.set(content.scrollHeight > content.clientHeight + 1);
      this.copyResize = new ResizeObserver(measure);
      this.copyMutation = new MutationObserver(measure);
      this.copyResize.observe(content);
      this.copyMutation.observe(content, { childList: true, subtree: true, characterData: true });
    }
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['revealed']?.firstChange || changes['card']) this.displayedRevealed.set(this.revealed);
    if (changes['revealed'] || (changes['card'] && changes['card'].previousValue?.id !== this.card.id)) {
      queueMicrotask(() => { if (this.copy) this.copy.nativeElement.scrollTo({ top: 0, left: 0, behavior: 'instant' }); });
    }
    if (changes['card'] || changes['imageUrl'] || changes['backImageUrl'] || changes['revealed']) this.failedImage.set(false);
    if (changes['backgroundUrl'] || changes['design']) this.failedBackground.set(false);
    if (changes['frameUrl'] || changes['design']) this.failedFrame.set(false);
    this.updateMotion();
    if (changes['card'] && !changes['card'].firstChange && changes['card'].previousValue?.id !== this.card.id) {
      queueMicrotask(() => this.animate('deal'));
    } else if (changes['revealed'] && !changes['revealed'].firstChange) queueMicrotask(() => void this.animateFlip(this.revealed));
  }
  private updateMotion(): void {
    const enabled = this.effects && this.visible && this.lifecycle.active() && !this.preference?.matches;
    this.animated.set(enabled);
    if (!enabled) { this.animations.forEach(animation => animation.cancel()); this.animations = []; this.displayedRevealed.set(this.revealed); this.settle(); }
  }
  private animate(type: 'deal'): void {
    if (!this.animated() || !this.turn) return;
    this.animations.forEach(animation => animation.cancel());
    this.animations = [this.turn.nativeElement.animate([{ transform: 'translate(22px, 10px) rotate(2.5deg) scale(.97)', opacity: .15 }, { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 }], { duration: 440, easing: 'cubic-bezier(.16,1,.3,1)' })];
    const overlay = this.turn.nativeElement.querySelector('.effects-layer');
    if (overlay) this.animations.push(overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 650, easing: 'ease-out' }));
  }
  private async animateFlip(target: boolean): Promise<void> {
    const sequence = ++this.flipSequence;
    if (!this.animated() || !this.turn) { this.displayedRevealed.set(target); return; }
    this.animations.forEach(animation => animation.cancel());
    const turn = this.turn.nativeElement;
    const direction = target ? -1 : 1;
    const away = turn.animate([
      { transform: 'rotateY(0deg) translateZ(0) scale(1)', filter: 'brightness(1)', opacity: 1 },
      { transform: `rotateY(${direction * 88}deg) translateZ(18px) scale(.985)`, filter: 'brightness(.82)', opacity: .92 },
    ], { duration: 360, easing: 'cubic-bezier(.55,.05,.45,.95)', fill: 'forwards' });
    this.animations = [away];
    try { await away.finished; } catch { return; }
    if (sequence !== this.flipSequence) return;
    this.displayedRevealed.set(target);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    if (sequence !== this.flipSequence || !this.turn) return;
    const home = turn.animate([
      { transform: `rotateY(${-direction * 88}deg) translateZ(18px) scale(.985)`, filter: 'brightness(.82)', opacity: .92 },
      { transform: 'rotateY(0deg) translateZ(0) scale(1)', filter: 'brightness(1)', opacity: 1 },
    ], { duration: 400, easing: 'cubic-bezier(.16,.84,.28,1)', fill: 'forwards' });
    this.animations = [home];
    try { await home.finished; } catch { /* A newer face change owns the card. */ }
  }
  activateFlip(event: MouseEvent): void {
    if (!this.flippable || this.suppressFlipClick || (event.target as HTMLElement).closest('button,a,input,select,textarea,[role="region"]')) return;
    this.flipped.emit(!this.revealed);
  }
  keyFlip(event: KeyboardEvent): void {
    if (!this.flippable || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    this.flipped.emit(!this.revealed);
  }
  beginTilt(event: PointerEvent): void {
    this.pointerStart = { x: event.clientX, y: event.clientY };
    this.dragDistance = 0;
    if (event.pointerType === 'touch' && this.dragTilt && this.animated()) this.dragging = true;
  }
  tilt(event: PointerEvent): void {
    if (this.pointerStart) this.dragDistance = Math.hypot(event.clientX - this.pointerStart.x, event.clientY - this.pointerStart.y);
    if (!this.animated() || (event.pointerType === 'touch' && !this.dragging) || !this.motion) return;
    const target = this.motion.nativeElement;
    const bounds = target.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      target.style.setProperty('--tilt-x', `${(0.5 - y) * 7}deg`);
      target.style.setProperty('--tilt-y', `${(x - 0.5) * 8}deg`);
      target.style.setProperty('--lift', '-4px');
      target.style.setProperty('--px', `${x * 100}%`);
      target.style.setProperty('--py', `${y * 100}%`);
    });
  }
  settle(): void {
    this.dragging = false;
    this.suppressFlipClick = this.dragDistance > 8;
    cancelAnimationFrame(this.frame);
    if (!this.motion) return;
    for (const name of ['--tilt-x', '--tilt-y', '--lift', '--px', '--py']) this.motion.nativeElement.style.removeProperty(name);
    this.pointerStart = undefined;
    this.dragDistance = 0;
    if (this.suppressFlipClick) setTimeout(() => { this.suppressFlipClick = false; }, 0);
  }
  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.copyResize?.disconnect();
    this.copyMutation?.disconnect();
    this.preference?.removeEventListener('change', this.motionChanged);
    this.unsubscribeLifecycle?.();
    this.animations.forEach(animation => animation.cancel());
  }
}
