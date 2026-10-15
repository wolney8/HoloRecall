import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { gsap } from 'gsap';

type LabFace = 'recall' | 'answer';
type LabRarity = 'common' | 'holo-rare' | 'ultra-rare';
type Point = { x: number; y: number };

const PEEL_REST = 0.18;
const PEEL_DURATION_SECONDS = 0.52;
const SHEET_WIDTH = 320;
const SHEET_HEIGHT = 176;

@Component({
  selector: 'hr-effects-lab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lab-heading">
      <div>
        <p class="eyebrow">DEVELOPER PREVIEW · NO LEARNER STATE</p>
        <h1>Visual Effects Lab</h1>
        <p>Isolated material and lighting prototypes for manual review. These controls do not alter production cards.</p>
      </div>
    </div>

    <section class="lab-section" aria-labelledby="peel-title">
      <div class="section-copy">
        <p class="eyebrow">PROTOTYPE A</p>
        <h2 id="peel-title">Layered clue peel</h2>
        <p>A single normalized progress value moves the peel boundary, underside and separation shadow. The resting object starts partly lifted.</p>
        <div class="lab-controls" aria-label="Clue peel controls">
          <button type="button" class="lab-primary" (click)="peel()" [disabled]="peelRemoved()">Peel</button>
          <button type="button" (click)="resetPeel()">Reset</button>
          <label class="toggle"><input type="checkbox" [checked]="reducedMotion()" (change)="setReducedMotion($event)"> Reduced Motion</label>
        </div>
        <dl class="lab-readout">
          <div><dt>Resting peel</dt><dd>{{restingPercent}}%</dd></div>
          <div><dt>Duration</dt><dd>{{peelDurationMs}} ms</dd></div>
          <div><dt>Driver</dt><dd>GSAP core</dd></div>
        </dl>
      </div>

      <div class="peel-stage" aria-label="Clue peel material preview">
        <article class="prototype-card peel-card">
          <div class="prototype-card-chrome"><span>ITALIAN SOUNDS</span><span>Holo Rare</span></div>
          <div class="card-star" aria-hidden="true">✦</div>
          <p class="card-prompt">Which written-sound group does this word belong to?</p>
          <strong class="card-stimulus">cestino</strong>
          <div class="choice-row" aria-hidden="true"><span>CE</span><span>CI</span><span>CHE</span><span>CHI</span></div>

          <button #peelObject type="button" class="peel-object" (click)="peel()" [disabled]="peelRemoved()"
            [attr.aria-label]="peelRemoved() ? 'Clue sticker removed' : 'Clue: Choose from the visual forms above. Peel sticker'"
            [attr.data-peel-progress]="peelProgress().toFixed(3)" [attr.data-reduced-motion]="reducedMotion()"
            [attr.data-geometric-frames]="geometricFrames()">
            <span class="exposed-surface" aria-hidden="true"></span>
            <span #peelFront class="peel-front" aria-hidden="true">
              <span class="clue-label">CLUE</span>
              <span class="clue-copy">Choose from the visual forms above.</span>
            </span>
            <svg class="peel-geometry" viewBox="0 0 320 176" preserveAspectRatio="none" aria-hidden="true">
              <defs><filter id="lab-peel-shadow" x="-30%" y="-30%" width="180%" height="180%"><feGaussianBlur stdDeviation="5"/></filter></defs>
              <polygon #peelShadow class="peel-shadow"></polygon>
              <polygon #peelUnderside class="peel-underside"></polygon>
              <path #peelBoundary class="peel-boundary"></path>
            </svg>
          </button>
        </article>
      </div>
    </section>

    <section class="lab-section surface-section" aria-labelledby="surface-title">
      <div class="section-copy">
        <p class="eyebrow">PROTOTYPE B</p>
        <h2 id="surface-title">Surface-linked reflection</h2>
        <p>The highlight is derived from the same normalized surface state as tilt. It offsets against the surface normal and rests without a centre glare.</p>
        <div class="lab-controls grouped" aria-label="Surface preview controls">
          <div class="segmented" aria-label="Card face">
            <button type="button" [attr.aria-pressed]="face()==='recall'" (click)="setFace('recall')">Recall</button>
            <button type="button" [attr.aria-pressed]="face()==='answer'" (click)="setFace('answer')">Answer</button>
          </div>
          <div class="segmented rarity-controls" aria-label="Rarity">
            <button type="button" [attr.aria-pressed]="rarity()==='common'" (click)="setRarity('common')">Common</button>
            <button type="button" [attr.aria-pressed]="rarity()==='holo-rare'" (click)="setRarity('holo-rare')">Holo Rare</button>
            <button type="button" [attr.aria-pressed]="rarity()==='ultra-rare'" (click)="setRarity('ultra-rare')">Ultra Rare</button>
          </div>
          <div class="segmented" aria-label="Effects state">
            <button type="button" [attr.aria-pressed]="effectsOn()" (click)="setEffects(true)">Effects On</button>
            <button type="button" [attr.aria-pressed]="!effectsOn()" (click)="setEffects(false)">Effects Off</button>
          </div>
          <button type="button" (click)="resetSurface()">Reset</button>
        </div>
      </div>

      <div class="surface-stage">
        <article #surfaceCard class="prototype-card surface-card" tabindex="0"
          [attr.data-face]="face()" [attr.data-rarity]="rarity()" [attr.data-effects]="effectsOn()"
          [attr.data-signature]="face()==='answer'?'answer-halo':'recall-echo'"
          (pointerenter)="surfaceEnter()" (pointermove)="surfaceMove($event)" (pointerleave)="surfaceLeave()">
          <div class="surface-background" aria-hidden="true"></div>
          <div class="surface-signature recall-signature" aria-hidden="true"></div>
          <div class="surface-signature answer-halo" aria-hidden="true"><span></span></div>
          <div class="surface-specular" aria-hidden="true"></div>
          <div class="surface-interference" aria-hidden="true"></div>
          <div class="prototype-card-chrome"><span>ITALIAN FOUNDATIONS</span><span>{{rarityLabel()}}</span></div>
          <div class="surface-learning">
            <span class="card-star" aria-hidden="true">✦</span>
            @if(face()==='recall'){
              <p>Choose the correct article.</p><strong>L’</strong>
            }@else{
              <p class="category-chip">ARTICLE</p><strong>L’</strong><span class="answer-secondary">“l”</span>
            }
          </div>
          <div class="prototype-footer"><span>{{face()==='recall'?'Recall':'Answer'}}</span><span>Clue</span></div>
        </article>
        <p class="surface-hint">Move the pointer across the card. The reflection opposes the surface tilt rather than following the cursor directly.</p>
      </div>
    </section>

    <section class="lab-section samples" aria-labelledby="samples-title">
      <div class="section-copy"><p class="eyebrow">STATIC SEMANTIC SAMPLE</p><h2 id="samples-title">Secondary-cue presentation</h2><p>Quotation marks are added only for semantic pronunciation and never mutate the stored value.</p></div>
      <div class="sample-grid">
        <article class="answer-sample" data-secondary-kind="pronunciation"><span class="sample-label">Pronunciation</span><strong>L’</strong><span class="sample-secondary">“l”</span></article>
        <article class="answer-sample" data-secondary-kind="generic"><span class="sample-label">Generic secondary cue</span><strong>L’</strong><span class="sample-secondary">Used before a vowel</span></article>
      </div>
    </section>
  `,
  styleUrl: './effects-lab.css',
})
export class EffectsLabComponent implements AfterViewInit {
  @ViewChild('peelObject', { read: ElementRef }) private peelObject?: ElementRef<HTMLElement>;
  @ViewChild('peelFront', { read: ElementRef }) private peelFront?: ElementRef<HTMLElement>;
  @ViewChild('peelUnderside', { read: ElementRef }) private peelUnderside?: ElementRef<SVGPolygonElement>;
  @ViewChild('peelShadow', { read: ElementRef }) private peelShadow?: ElementRef<SVGPolygonElement>;
  @ViewChild('peelBoundary', { read: ElementRef }) private peelBoundary?: ElementRef<SVGPathElement>;
  @ViewChild('surfaceCard', { read: ElementRef }) private surfaceCard?: ElementRef<HTMLElement>;

  readonly restingPercent = Math.round(PEEL_REST * 100);
  readonly peelDurationMs = Math.round(PEEL_DURATION_SECONDS * 1000);
  readonly peelProgress = signal(PEEL_REST);
  readonly geometricFrames = signal(0);
  readonly peelRemoved = signal(false);
  readonly reducedMotion = signal(false);
  readonly face = signal<LabFace>('recall');
  readonly rarity = signal<LabRarity>('common');
  readonly effectsOn = signal(true);

  private readonly destroyRef = inject(DestroyRef);
  private readonly peelProxy = { value: PEEL_REST };
  private readonly surfaceProxy = { x: 0, y: 0 };
  private peelTween?: gsap.core.Tween;
  private surfaceTween?: gsap.core.Tween;
  private surfaceRect?: DOMRect;
  private surfaceFrame = 0;
  private pendingSurface?: Point;
  private resizeObserver?: ResizeObserver;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.peelTween?.kill();
      this.surfaceTween?.kill();
      if (this.surfaceFrame) cancelAnimationFrame(this.surfaceFrame);
      this.resizeObserver?.disconnect();
      gsap.killTweensOf(this.peelProxy);
      gsap.killTweensOf(this.surfaceProxy);
    });
  }

  ngAfterViewInit(): void {
    this.renderPeel(PEEL_REST, false);
    this.renderSurface(0, 0);
    if (typeof ResizeObserver !== 'undefined' && this.surfaceCard) {
      this.resizeObserver = new ResizeObserver(() => this.cacheSurfaceRect());
      this.resizeObserver.observe(this.surfaceCard.nativeElement);
    }
  }

  peel(): void {
    if (this.peelRemoved() || this.peelTween?.isActive()) return;
    this.peelTween?.kill();
    if (this.reducedMotion()) {
      const element = this.peelObject?.nativeElement;
      if (!element) return;
      this.peelTween = gsap.to(element, {
        opacity: 0,
        duration: 0.14,
        ease: 'power1.out',
        onComplete: () => {
          this.peelProxy.value = 1;
          this.peelProgress.set(1);
          this.peelRemoved.set(true);
        },
      });
      return;
    }
    this.peelTween = gsap.to(this.peelProxy, {
      value: 1,
      duration: PEEL_DURATION_SECONDS,
      ease: 'power2.inOut',
      onUpdate: () => this.renderPeel(this.peelProxy.value, true),
      onComplete: () => {
        this.renderPeel(1, true);
        this.peelRemoved.set(true);
      },
    });
  }

  resetPeel(): void {
    this.peelTween?.kill();
    this.peelProxy.value = PEEL_REST;
    this.peelRemoved.set(false);
    const element = this.peelObject?.nativeElement;
    if (element) gsap.set(element, { opacity: 1 });
    this.renderPeel(PEEL_REST, false);
  }

  setReducedMotion(event: Event): void {
    this.reducedMotion.set((event.target as HTMLInputElement).checked);
    this.resetPeel();
  }

  setFace(face: LabFace): void { this.face.set(face); }
  setRarity(rarity: LabRarity): void { this.rarity.set(rarity); this.renderSurface(this.surfaceProxy.x, this.surfaceProxy.y); }
  setEffects(enabled: boolean): void { this.effectsOn.set(enabled); this.renderSurface(this.surfaceProxy.x, this.surfaceProxy.y); }
  rarityLabel(): string { return this.rarity() === 'holo-rare' ? 'Holo Rare' : this.rarity() === 'ultra-rare' ? 'Ultra Rare' : 'Common'; }

  surfaceEnter(): void { this.surfaceTween?.kill(); this.cacheSurfaceRect(); }
  surfaceMove(event: PointerEvent): void {
    if (!this.effectsOn()) return;
    const rect = this.surfaceRect ?? this.cacheSurfaceRect();
    if (!rect?.width || !rect.height) return;
    this.pendingSurface = {
      x: Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1)),
      y: Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1)),
    };
    if (!this.surfaceFrame) this.surfaceFrame = requestAnimationFrame(() => {
      this.surfaceFrame = 0;
      if (!this.pendingSurface) return;
      this.surfaceProxy.x = this.pendingSurface.x;
      this.surfaceProxy.y = this.pendingSurface.y;
      this.renderSurface(this.surfaceProxy.x, this.surfaceProxy.y);
      this.pendingSurface = undefined;
    });
  }
  surfaceLeave(): void { this.settleSurface(); }
  resetSurface(): void { this.settleSurface(true); }

  private cacheSurfaceRect(): DOMRect | undefined {
    this.surfaceRect = this.surfaceCard?.nativeElement.getBoundingClientRect();
    return this.surfaceRect;
  }

  private settleSurface(immediate = false): void {
    this.surfaceTween?.kill();
    if (immediate || this.reducedMotion() || !this.effectsOn()) {
      this.surfaceProxy.x = 0; this.surfaceProxy.y = 0; this.renderSurface(0, 0); return;
    }
    this.surfaceTween = gsap.to(this.surfaceProxy, { x: 0, y: 0, duration: 0.42, ease: 'power2.out', onUpdate: () => this.renderSurface(this.surfaceProxy.x, this.surfaceProxy.y) });
  }

  private renderSurface(x: number, y: number): void {
    const card = this.surfaceCard?.nativeElement;
    if (!card) return;
    const enabled = this.effectsOn();
    const magnitude = Math.min(1, Math.hypot(x, y) / Math.SQRT2);
    const rarityFactor = this.rarity() === 'common' ? 0.16 : this.rarity() === 'holo-rare' ? 0.48 : 0.68;
    const intensity = enabled ? magnitude * rarityFactor : 0;
    const tiltX = enabled && !this.reducedMotion() ? -y * 7 : 0;
    const tiltY = enabled && !this.reducedMotion() ? x * 8 : 0;
    card.style.setProperty('--lab-tilt-x', `${tiltX.toFixed(2)}deg`);
    card.style.setProperty('--lab-tilt-y', `${tiltY.toFixed(2)}deg`);
    card.style.setProperty('--lab-spec-x', `${(50 - x * 30).toFixed(2)}%`);
    card.style.setProperty('--lab-spec-y', `${(48 - y * 24).toFixed(2)}%`);
    card.style.setProperty('--lab-spec-strength', intensity.toFixed(3));
    card.style.setProperty('--lab-spec-size', `${(86 - magnitude * 24).toFixed(2)}%`);
    card.style.setProperty('--lab-hue-angle', `${(x * 48 - y * 28).toFixed(2)}deg`);
  }

  private renderPeel(progress: number, countFrame: boolean): void {
    const value = Math.max(0, Math.min(1, progress));
    this.peelProxy.value = value;
    this.peelProgress.set(value);
    if (countFrame) this.geometricFrames.update(count => count + 1);
    const travel = value * (SHEET_WIDTH + SHEET_HEIGHT);
    const boundary = SHEET_WIDTH - travel;
    const attached = this.clipRectangle(boundary, false);
    const detached = this.clipRectangle(boundary, true);
    const attachedCss = attached.map(point => `${(point.x / SHEET_WIDTH * 100).toFixed(2)}% ${(point.y / SHEET_HEIGHT * 100).toFixed(2)}%`).join(',');
    const detachedSvg = detached.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
    const intersections = this.boundaryIntersections(boundary);
    const depth = 8 + value * 34;
    const turn = 4 + value * 17;
    if (this.peelFront) {
      this.peelFront.nativeElement.style.clipPath = attached.length >= 3 ? `polygon(${attachedCss})` : 'polygon(0 0,0 0,0 0)';
      this.peelFront.nativeElement.style.opacity = value >= 0.985 ? '0' : '1';
    }
    if (this.peelUnderside) {
      const underside = this.peelUnderside.nativeElement;
      underside.setAttribute('points', detachedSvg);
      underside.style.transformOrigin = '100% 0%';
      underside.style.transform = `translate(${-depth * .24}px, ${depth * .32}px) rotate(${turn}deg) scale(${(1 - value * .08).toFixed(3)})`;
      underside.style.opacity = String(value >= 0.96 ? Math.max(0, (1 - value) / .04) : Math.min(1, .45 + value * 2));
    }
    if (intersections.length === 2) {
      const [a, b] = intersections;
      const shadowWidth = 7 + value * 18;
      const boundaryPath = this.peelBoundary?.nativeElement;
      boundaryPath?.setAttribute('d', `M ${a!.x.toFixed(1)} ${a!.y.toFixed(1)} L ${b!.x.toFixed(1)} ${b!.y.toFixed(1)}`);
      if (boundaryPath) boundaryPath.style.strokeWidth = `${shadowWidth}`;
      if (this.peelShadow) {
        const normal = { x: -depth * .2, y: depth * .22 };
        this.peelShadow.nativeElement.setAttribute('points', `${a!.x},${a!.y} ${b!.x},${b!.y} ${b!.x + normal.x},${b!.y + normal.y} ${a!.x + normal.x},${a!.y + normal.y}`);
        this.peelShadow.nativeElement.style.opacity = String(Math.min(.38, .1 + value * .34));
      }
    } else {
      this.peelBoundary?.nativeElement.setAttribute('d', '');
      this.peelShadow?.nativeElement.setAttribute('points', '');
    }
    const object = this.peelObject?.nativeElement;
    if (object && !this.reducedMotion()) {
      const release = Math.max(0, (value - .78) / .22);
      object.style.transform = `perspective(700px) translate3d(${(release * 45).toFixed(1)}px,${(-release * 36).toFixed(1)}px,${(release * 58).toFixed(1)}px) rotate(${(-1.4 + release * 8).toFixed(2)}deg) rotateY(${(release * 12).toFixed(2)}deg)`;
      object.style.opacity = String(1 - Math.max(0, (value - .9) / .1));
    }
  }

  private clipRectangle(boundary: number, inverse: boolean): Point[] {
    const input: Point[] = [{ x: 0, y: 0 }, { x: SHEET_WIDTH, y: 0 }, { x: SHEET_WIDTH, y: SHEET_HEIGHT }, { x: 0, y: SHEET_HEIGHT }];
    const inside = (point: Point) => inverse ? point.x - point.y >= boundary : point.x - point.y <= boundary;
    const output: Point[] = [];
    for (let index = 0; index < input.length; index++) {
      const current = input[index]!;
      const previous = input[(index + input.length - 1) % input.length]!;
      const currentInside = inside(current), previousInside = inside(previous);
      if (currentInside !== previousInside) {
        const dx = current.x - previous.x, dy = current.y - previous.y;
        const denominator = dx - dy;
        if (Math.abs(denominator) > .0001) {
          const t = (boundary - (previous.x - previous.y)) / denominator;
          output.push({ x: previous.x + dx * t, y: previous.y + dy * t });
        }
      }
      if (currentInside) output.push(current);
    }
    return output;
  }

  private boundaryIntersections(boundary: number): Point[] {
    const points: Point[] = [];
    if (boundary >= 0 && boundary <= SHEET_WIDTH) points.push({ x: boundary, y: 0 });
    const rightY = SHEET_WIDTH - boundary;
    if (rightY >= 0 && rightY <= SHEET_HEIGHT) points.push({ x: SHEET_WIDTH, y: rightY });
    const bottomX = boundary + SHEET_HEIGHT;
    if (bottomX >= 0 && bottomX <= SHEET_WIDTH) points.push({ x: bottomX, y: SHEET_HEIGHT });
    const leftY = -boundary;
    if (leftY >= 0 && leftY <= SHEET_HEIGHT) points.push({ x: 0, y: leftY });
    return points.filter((point, index, all) => all.findIndex(other => Math.abs(other.x - point.x) < .01 && Math.abs(other.y - point.y) < .01) === index).slice(0, 2);
  }
}
