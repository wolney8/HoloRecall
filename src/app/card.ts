import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, inject, signal } from '@angular/core';
import type { CardContent, DesignSet, FinishPreset, Rarity } from '../domain/models';
import type { ResolvedCardPresentation } from '../domain/card-presentation';
import { RARITIES } from '../domain/rewards';
import { AppLifecycle } from './platform/app-lifecycle';
import { LocalStudyStore } from './data/study-store';
import {ImportedCardContentComponent} from './imported-card-content';

/** Kept only to read the first prototype's four presentation names. Content uses Rarity. */
export type Treatment = 'matte' | 'foil' | 'holo' | 'relic';

@Component({
  selector: 'hr-card',
  standalone: true,
  imports:[ImportedCardContentComponent],
  template: `
    <div #motion class="card-motion" [class.motion-enabled]="animated()" [class.compact]="compact" [class.drag-enabled]="dragTilt" [class.flippable]="flippable"
      [attr.role]="flippable ? 'button' : null" [attr.tabindex]="flippable ? 0 : null" [attr.aria-pressed]="flippable ? displayedRevealed() : null"
      [attr.aria-label]="flippable ? (displayedRevealed() ? 'Show card front' : 'Show card answer') : null"
      (click)="activateFlip($event)" (keydown)="keyFlip($event)"
      (pointerdown)="beginTilt($event)" (pointermove)="tilt($event)" (pointerleave)="settle()" (pointerup)="settle()" (pointercancel)="settle()">
      <div #turn class="card-turn">
        <article class="memory-card" [attr.data-rarity]="shownRarity" [attr.data-finish]="shownFinish" [attr.data-prestige]="prestigeLevel || null" [attr.data-prestige-band]="prestigeBand" [attr.data-layout]="design?.layout || 'clean'" [attr.data-composition]="resolvedComposition" [attr.data-art-policy]="resolvedPresentation.effectiveArtPolicy" [attr.data-art-role]="resolvedPresentation.artRole" [attr.data-art-treatment]="artTreatment" [attr.data-art-mask]="design?.artwork?.mask || 'none'" [class.full-bleed-art]="design?.artwork?.fullBleed" [class.has-native-art]="hasNativeArt" [style.--art-hue]="artHue" [style.--art-accent]="artAccent" [style.--design-primary]="design?.palette?.primary" [style.--design-secondary]="design?.palette?.secondary" [style.--design-surface]="design?.palette?.surface" [style.--design-on-surface]="design?.palette?.onSurface" [style.--design-accent]="rarityAccent" [style.--art-tint]="artTint" [style.--art-x.%]="design?.artwork?.focalX ?? 50" [style.--art-y.%]="design?.artwork?.focalY ?? 50" [style.--art-vignette]="artVignette" [style.--art-edge-fade]="artEdgeFade" [style.--art-background-bleed]="artBackgroundBleed" [style.--art-duotone]="artDuotone" [style.--art-texture]="artTexture" [style.--art-emboss]="artEmboss" [style.--art-depth]="artDepth" [class.revealed]="displayedRevealed()" [class.effects]="animated()" [attr.data-theme-preview]="themePreview || null" [attr.aria-label]="rarityLabel + ' ' + finishLabel + (prestigeLevel ? ', Prestige '+prestigeRoman : '') + (demo ? ' design preview' : ' flashcard')">
          <div class="background-layer" aria-hidden="true">
            @if (backgroundUrl && !failedBackground()) { <img [src]="backgroundUrl" [style.object-fit]="design?.backgroundFit || 'cover'" [style.object-position]="(design?.backgroundPositionX ?? 50) + '% ' + (design?.backgroundPositionY ?? 50) + '%'" alt="" (error)="failedBackground.set(true)"> }
          </div>
          <div class="frame-layer" aria-hidden="true">@if (frameUrl && !failedFrame()) { <img [src]="frameUrl" [style.object-fit]="design?.frameFit || 'contain'" alt="" (error)="failedFrame.set(true)"> }</div>
          <div class="effects-layer" aria-hidden="true">@if(resolvedTexture){<img class="finish-texture" [src]="resolvedTexture" alt="">}<i class="card-gleam"></i><i class="foil-sweep"></i><i class="edge-light"></i><i class="particles">· ✧ ·</i></div>
          @if(prestigeLevel){<span class="prestige-crest" [attr.aria-label]="'Prestige '+prestigeRoman">P {{prestigeRoman}}</span>}
          <header class="card-heading protected"><span>{{ demo ? 'DESIGN PREVIEW' : (displayedRevealed() ? 'ANSWER' : 'RECALL') }}</span><span class="tier"><span aria-hidden="true">{{ raritySymbol }}</span> {{ rarityLabel }}</span></header>
          <div class="illustration-layer" [class.no-illustration]="hideStudyArt || (!hasIllustrationReference && card.kind !== 'visual')" [class.image-missing]="illustrationMissing">
            @if (illustration && !failedImage()) {
              <img [src]="illustration" [style.object-fit]="design?.artwork?.fit || 'contain'" [style.object-position]="(design?.artwork?.focalX ?? 50) + '% ' + (design?.artwork?.focalY ?? 50) + '%'" [alt]="displayedRevealed() ? (card.interpretation || card.meaning || card.imageDescription || 'Card illustration') : (card.imageDescription || 'Recall illustration. Reveal for the answer.')" (error)="failedImage.set(true)" draggable="false">
            } @else if (illustrationMissing) {
              <span class="missing-image"><span aria-hidden="true">▧</span> Illustration unavailable</span>
            }
            @if(!illustration && !illustrationMissing){@defer(when presentationCard.art || presentationCard.choices?.length){<hr-imported-card-content [card]="presentationCard" mode="art" [showChoices]="!displayedRevealed()"/>}}
          </div>
          <div #copy class="card-copy protected" [class.answer]="displayedRevealed()" [class.prompt]="!displayedRevealed()" [attr.tabindex]="scrollable() ? 0 : null" [attr.role]="scrollable() ? 'region' : null" [attr.aria-label]="scrollable() ? 'Card content. Scroll to read all text.' : null">
            @if (displayedRevealed()) {
              @if(card.answerLabel){<span class="answer-label">{{card.answerLabel}}</span>}
              <h3 [attr.lang]="card.deckId === 'italian-essentials' ? 'it' : null" tabindex="-1">{{ card.answer }}</h3>
              @if (card.secondary || card.pronunciation) { <p class="secondary">{{ card.secondary || card.pronunciation }}</p> }
              @if (resolvedPresentation.answerInterpretation && !compact) { <p class="interpretation">{{ resolvedPresentation.answerInterpretation }}</p> }
            } @else { <h3>{{ resolvedPresentation.primary }}</h3>@if(resolvedPresentation.cue){<p class="recall-cue">{{resolvedPresentation.cue}}</p>}@if(resolvedPresentation.situationContext){<p class="recall-context">{{resolvedPresentation.situationContext}}</p>}@if(resolvedPresentation.taskGuidance){<p class="recall-guidance">{{resolvedPresentation.taskGuidance}}</p>}@if(resolvedPresentation.hint){<p class="recall-hint">{{resolvedPresentation.hint}}</p>}@if(hideStudyArt&&card.choices?.length){<hr-imported-card-content [card]="card" mode="choices"/>} }
          </div>
          @if (missingDesignAsset) { <span class="fallback-note protected"><span>Design asset missing · default frame shown</span></span> }
          <footer class="protected"><span>{{ demo ? 'SAMPLE · NOT EARNED' : (displayedRevealed() ? 'Answer side' : 'Front side') }}</span>@if (scrollable()) { <span class="scroll-hint">Scroll text ↕</span> }<span class="tier-marks" aria-hidden="true">{{ raritySymbol }}</span></footer>
        </article>
      </div>
    </div>
    @if (audioRefs.length) {
      <div class="audio-controls" [attr.aria-label]="displayedRevealed() ? 'Answer audio' : 'Front audio'" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
        @for (ref of audioRefs; track ref; let index = $index) {
          <button type="button" class="audio-button" (click)="toggleAudio(ref,$event)" [attr.aria-label]="(playingAudio()===ref?'Pause ':'Play ')+(displayedRevealed()?'answer':'front')+' audio '+(index+1)"><span aria-hidden="true">{{playingAudio()===ref?'Ⅱ':'▶'}}</span><span>{{index+1}}</span></button>
        }
      </div>
      @if(audioError()){<p class="audio-error" role="alert">{{audioError()}}</p>}
    }
  `,
  styleUrl: './card.css',
  styles: [`
    :host{position:relative}
    .audio-controls{position:absolute;z-index:5;left:50%;bottom:38px;transform:translateX(-50%);display:flex;gap:6px;max-width:calc(100% - 48px);flex-wrap:wrap;justify-content:center}
    .audio-button{min-width:44px;min-height:44px;border:1px solid color-mix(in srgb,var(--mat-sys-outline) 55%,transparent);border-radius:999px;background:var(--mat-sys-surface-container-high);color:var(--mat-sys-on-surface);display:inline-flex;align-items:center;justify-content:center;gap:4px;font:600 12px/1 Roboto,Arial,sans-serif;box-shadow:0 3px 10px color-mix(in srgb,var(--mat-sys-shadow) 15%,transparent)}
    .audio-button:focus-visible{outline:3px solid var(--mat-sys-primary);outline-offset:2px}
    .audio-error{position:absolute;z-index:6;left:20px;right:20px;bottom:84px;margin:0;padding:6px 8px;border-radius:8px;background:var(--mat-sys-error-container);color:var(--mat-sys-on-error-container);font-size:12px;text-align:start}
    .answer-label{align-self:center;padding:.15rem .5rem;border:1px solid color-mix(in srgb,var(--frame-color) 36%,transparent);border-radius:999px;background:color-mix(in srgb,var(--card-surface) 78%,var(--design-primary,var(--frame-color)));color:var(--card-ink);font-size:.68rem;box-shadow:inset 0 1px color-mix(in srgb,#fff 34%,transparent)}
  `],
})
export class FlashcardComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) card!: CardContent;
  @Input() revealed = false;
  @Input() rarity?: Rarity;
  @Input() prestigeLevel=0;
  @Input() treatment?: Treatment;
  @Input() effects = true;
  @Input() compact = false;
  @Input() dragTilt = false;
  @Input() flippable = false;
  @Output() flipped = new EventEmitter<boolean>();
  @Output() audioPlayingChange = new EventEmitter<boolean>();
  @Input() demo = false;
  @Input() design?: DesignSet;
  @Input() imageUrl?: string;
  @Input() backImageUrl?: string;
  @Input() backgroundUrl?: string;
  @Input() frameUrl?: string;
  @Input() textureUrl?: string;
  @Input() themePreview?: 'light' | 'dark';
  @Input() presentation?: ResolvedCardPresentation;
  @Input() audioAutoplay=false;
  @Input() stopAudioOnAction=true;
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
  readonly playingAudio = signal('');
  readonly audioError = signal('');
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
  private readonly store = inject(LocalStudyStore);
  private unsubscribeLifecycle?: () => void;
  private audio?: HTMLAudioElement;
  private readonly motionChanged = () => { this.updateMotion(); this.settle(); };

  get shownRarity(): Rarity { return this.rarity ?? (this.treatment ? ({ matte: 'common', foil: 'uncommon', holo: 'holo-rare', relic: 'relic' } as const)[this.treatment] : this.card?.rarity ?? 'common'); }
  get shownFinish(): FinishPreset { const designFinish=this.design?.rarityVariants?.[this.shownRarity]?.finish??this.design?.finishes?.[this.shownRarity]??this.design?.finish;return (this.demo?designFinish??this.card?.finish:this.card?.finish??designFinish) ?? ({ common: 'matte', uncommon: 'metallic', rare: 'etched', 'holo-rare': 'holographic', 'ultra-rare': 'prismatic', 'secret-rare': 'starfield', relic: 'gilded' } as const)[this.shownRarity]; }
  get finishLabel(): string { return this.shownFinish.replace(/(^|-)([a-z])/g, (_, lead, letter) => `${lead ? ' ' : ''}${letter.toUpperCase()}`); }
  get resolvedTexture(): string { return this.textureUrl || this.store.mediaUrl(this.design?.texture); }
  get rarityLabel(): string { return RARITIES.find(item => item.id === this.shownRarity)?.label ?? 'Common'; }
  get raritySymbol(): string { return RARITIES.find(item => item.id === this.shownRarity)?.symbol ?? '○'; }
  get prestigeRoman():string{return['','I','II','III','IV','V','VI','VII','VIII','IX','X'][Math.max(0,Math.min(10,this.prestigeLevel))]??'';}
  get prestigeBand():string{return this.prestigeLevel>=10?'capstone':this.prestigeLevel>=8?'radiant':this.prestigeLevel>=5?'midpoint':this.prestigeLevel>=3?'foil':this.prestigeLevel>=1?'edge':'none';}
  get resolvedPresentation():ResolvedCardPresentation{return this.presentation??{profile:'general',primary:this.card?.front??'',artRole:this.card?.image||this.card?.art?'supportive':'hidden',requestedArtPolicy:'auto',effectiveArtPolicy:this.card?.kind==='visual'?'image-first':'text-first'};}
  get hideStudyArt():boolean{return this.resolvedPresentation.artRole==='hidden'||!this.displayedRevealed()&&this.resolvedPresentation.effectiveArtPolicy==='text-first';}
  get presentationCard():CardContent{if(this.card?.art||this.card?.image||this.card?.backImage)return this.card;return{...this.card,art:{kind:'generated-text-art',title:this.generatedArtTitle,subtitle:this.generatedArtSubtitle,seed:this.artSeed}};}
  get hasNativeArt():boolean{return !this.card?.image&&!this.card?.backImage||this.card?.art?.kind==='source-visual-panel'||this.card?.art?.kind==='generated-text-art';}
  private get generatedArtTitle():string{const source=(this.card?.front||this.card?.answer||'Recall').trim();const formula=source.match(/[\dA-Za-z]+\s*[=+×÷−]\s*[\dA-Za-z+×÷− ]+/)?.[0];return(formula||source.split(/\s+/).slice(0,3).join(' ')).slice(0,34);}
  private get generatedArtSubtitle():string{const tag=this.card?.tags?.[0];return(tag||this.card?.answer||'HoloRecall').trim().slice(0,48);}
  private get artSeed():string{const art=this.card?.art;if(art?.kind==='generated-text-art')return art.seed;if(art?.kind==='source-visual-panel')return[art.title,art.subtitle,art.badge,art.lesson,art.topic,art.sourceKind].filter(Boolean).join(':');return[this.card?.id,this.card?.deckId,this.card?.front,this.design?.id,this.shownRarity].filter(Boolean).join(':');}
  private artHash(offset=0):number{let value=2166136261+offset;for(const character of this.artSeed)value=Math.imul(value^character.charCodeAt(0),16777619);return value>>>0;}
  get artHue():string{return String(this.artHash()%360);}
  get artAccent():string{return String(this.artHash(97)%360);}
  get rarityAccent():string{return this.design?.rarityVariants?.[this.shownRarity]?.accent??this.design?.palette?.accent??'';}
  get artTreatment():string{return this.design?.artwork?.treatment??'embedded';}
  get artTint():string{return this.design?.artwork?.tint??this.design?.palette?.primary??'';}
  get resolvedComposition():string{if(!this.displayedRevealed()&&this.resolvedPresentation.effectiveArtPolicy==='text-first')return'typographic-showcase';return this.design?.rarityVariants?.[this.shownRarity]?.composition??(this.design?.layoutPolicy==='suggest'?this.suggestedComposition:this.design?.composition)??this.suggestedComposition;}
  private get suggestedComposition():string{if(this.card?.image||this.card?.backImage)return'photo-focus';if(this.card?.kind==='visual'||this.card?.art)return'illustration-window';if(/[=+×÷−]|\b(?:formula|syntax|method)\b/i.test(`${this.card?.front} ${this.card?.answer}`))return'diagram-technical';if((this.card?.answer?.length??0)>110)return'split-art-content';return'typographic-showcase';}
  get artVignette():string{return`${Math.max(0,Math.min(100,this.design?.artwork?.vignette??0))/100}`;}
  get artEdgeFade():string{return`${Math.max(0,Math.min(100,this.design?.artwork?.edgeFade??0))/100}`;}
  get artBackgroundBleed():string{return`${Math.max(0,Math.min(100,this.design?.artwork?.backgroundBleed??0))}%`;}
  get artDuotone():string{return`${Math.max(0,Math.min(100,this.design?.artwork?.duotone??0))}%`;}
  get artTexture():string{return`${Math.max(0,Math.min(100,this.design?.artwork?.textureBlend??0))/100}`;}
  get artEmboss():string{return`${Math.max(0,Math.min(40,this.design?.artwork?.emboss??0))/10}px`;}
  get artDepth():string{return`${Math.max(0,Math.min(40,this.design?.artwork?.depth??0))/10}px`;}
  get illustration(): string {
    const front = this.imageUrl !== undefined ? this.imageUrl : this.card?.image || '';
    const back = this.backImageUrl !== undefined ? this.backImageUrl : this.card?.backImage;
    return this.displayedRevealed() ? back || front : front;
  }
  get hasIllustrationReference(): boolean { return !!(this.card?.image || this.imageUrl || this.presentationCard.art || this.card?.choices?.length || (this.displayedRevealed() && (this.card?.backImage || this.backImageUrl))); }
  get illustrationMissing(): boolean {
    const expectsBinaryImage = !!(this.card?.image || this.imageUrl || (this.displayedRevealed() && (this.card?.backImage || this.backImageUrl)) || this.card?.art?.kind === 'imported-media');
    return expectsBinaryImage && (!this.illustration || this.failedImage());
  }
  get missingDesignAsset(): boolean { return this.failedBackground() || this.failedFrame() || !!(this.design?.background && !this.backgroundUrl) || !!((this.design?.frames?.[this.shownRarity] || this.design?.frame) && !this.frameUrl); }
  get audioRefs(): string[] { return this.displayedRevealed() ? this.card?.backAudio ?? [] : this.card?.frontAudio ?? []; }

  ngAfterViewInit(): void {
    this.preference = matchMedia('(prefers-reduced-motion: reduce)');
    this.preference.addEventListener('change', this.motionChanged);
    this.unsubscribeLifecycle = this.lifecycle.subscribe(active => { this.updateMotion(); if (!active) { this.settle(); this.stopAudio(); } });
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
    this.queueAutoplay();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['revealed']?.firstChange || changes['card']) this.displayedRevealed.set(this.revealed);
    const sideChanged=!!changes['revealed']&&!changes['revealed'].firstChange;
    const cardChanged=!!changes['card']&&!changes['card'].firstChange&&changes['card'].previousValue?.id!==this.card.id;
    if (sideChanged || cardChanged) {
      // Persistence refreshes can replace the card object without advancing to a
      // different card. Honour the learner's side-change preference in that case,
      // while an actual card advance always owns and stops the previous audio.
      if(this.stopAudioOnAction||cardChanged)this.stopAudio();
      queueMicrotask(() => { if (this.copy) this.copy.nativeElement.scrollTo({ top: 0, left: 0, behavior: 'instant' }); });
      // A flip owns the face change. Waiting until its midpoint prevents the
      // outgoing side's autoplay reference from toggling itself off when the
      // learner chose to let current audio continue through reveal.
      if(cardChanged)this.queueAutoplay();
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
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const enabled = this.effects && this.visible && this.lifecycle.active() && !reduced;
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
    if (!this.animated() || !this.turn) { this.displayedRevealed.set(target); this.queueAutoplay(); return; }
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
    this.queueAutoplay();
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
    if (!this.flippable || this.suppressFlipClick || (event.target as HTMLElement).closest('button,a,input,select,textarea')) return;
    // A successful pointer hit is stronger visibility evidence than a delayed
    // IntersectionObserver callback. Arm the owned flip lifecycle immediately.
    this.visible = true;
    this.updateMotion();
    this.flipped.emit(!this.revealed);
  }
  keyFlip(event: KeyboardEvent): void {
    if (!this.flippable || (event.target as HTMLElement).closest('button,a,input,select,textarea,[role="region"]') || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    this.visible = true;
    this.updateMotion();
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
  async toggleAudio(ref: string, event: Event): Promise<void> {
    event.stopPropagation(); this.audioError.set('');
    if (this.playingAudio() === ref) { this.stopAudio(); return; }
    this.stopAudio(); const url = this.store.mediaUrl(ref); if (!url) { this.audioError.set('Audio file unavailable. Reimport or replace this clip.'); return; }
    const audio = new Audio(url); this.audio = audio;this.audioPlayingChange.emit(true);
    audio.addEventListener('playing', () => { if (this.audio === audio) this.playingAudio.set(ref); }, { once: true });
    audio.addEventListener('ended', () => { if (this.audio === audio) this.stopAudio(); }, { once: true });
    audio.addEventListener('error', () => { if (this.audio === audio) { this.stopAudio(); this.audioError.set('This audio could not be played.'); } }, { once: true });
    try { await audio.play(); } catch { if (this.audio === audio) { this.stopAudio(); this.audioError.set('Playback was blocked or the audio could not be decoded.'); } }
  }
  private queueAutoplay():void{const ref=this.audioRefs[0];if(this.audioAutoplay&&ref&&this.lifecycle.active())this.audioPlayingChange.emit(true);queueMicrotask(()=>void this.autoplayAudio());}
  private async autoplayAudio():Promise<void>{const ref=this.audioRefs[0];if(!this.audioAutoplay||!ref||!this.lifecycle.active())return;await this.toggleAudio(ref,new Event('autoplay'));if(!this.audio&&!this.playingAudio())this.audioPlayingChange.emit(false);}
  private stopAudio(): void { const wasActive=!!this.audio||!!this.playingAudio();if (this.audio) { this.audio.pause(); this.audio.currentTime = 0; this.audio.src = ''; this.audio.load(); } this.audio = undefined; this.playingAudio.set('');if(wasActive)this.audioPlayingChange.emit(false); }
  @HostListener('stop-card-audio') stopAudioForAcceptedAction():void{if(this.stopAudioOnAction)this.stopAudio();}
  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.copyResize?.disconnect();
    this.copyMutation?.disconnect();
    this.preference?.removeEventListener('change', this.motionChanged);
    this.unsubscribeLifecycle?.();
    this.animations.forEach(animation => animation.cancel());
    this.stopAudio();
  }
}
