import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import type { CardCompositionId, CardContent, DesignPalette, DesignSet, FinishPreset, Rarity } from '../../domain/models';
import { RARITIES } from '../../domain/rewards';
import { FINISH_TREATMENTS } from '../../domain/card-treatments';
import { FlashcardComponent } from '../card';
import { LocalStudyStore } from '../data/study-store';
import { PageRevealDirective } from '../motion/page-reveal';
import { CAPABILITY_POLICY } from '../platform/capability-policy';
import { readArtwork } from '../upload';
import { deriveDesignPalette } from '../../domain/design-system';
import { FILE_DELIVERY } from '../platform/file-delivery';

type PreviewCase = 'real' | 'text' | 'image' | 'generated' | 'technical' | 'long';
const LAYOUTS: ReadonlyArray<{ id: CardCompositionId; label: string; description: string }> = [
  { id: 'full-bleed', label: 'Full Bleed', description: 'Artwork surrounds protected content.' }, { id: 'framed-art', label: 'Framed Art', description: 'Classic art window and strong frame.' },
  { id: 'illustration-window', label: 'Illustration Window', description: 'Balanced art and recall content.' }, { id: 'split-art-content', label: 'Split Art / Content', description: 'Clear split for diagrams and explanations.' },
  { id: 'typographic-showcase', label: 'Typographic Showcase', description: 'Words, symbols and formulas become art.' }, { id: 'minimal-prestige', label: 'Minimal Prestige', description: 'Quiet space and restrained premium detail.' },
  { id: 'diagram-technical', label: 'Diagram / Technical', description: 'Structured technical content.' }, { id: 'photo-focus', label: 'Photo Focus', description: 'Photography leads without obscuring the prompt.' },
  { id: 'symbolic-generated', label: 'Symbolic / Generated Art', description: 'Stable offline motifs without images.' },
];

@Component({ selector: 'hr-design-studio', standalone: true, imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonToggleModule, FlashcardComponent, PageRevealDirective], templateUrl: './design-studio.html', styleUrl: './design-studio.css' })
export class DesignStudioComponent {
  readonly store = inject(LocalStudyStore); private readonly capabilityPolicy = inject(CAPABILITY_POLICY); private readonly fileDelivery = inject(FILE_DELIVERY);
  readonly authoringDecision = this.capabilityPolicy.decide('custom-design-authoring'); readonly tiers = RARITIES; readonly finishes = FINISH_TREATMENTS; readonly layouts = LAYOUTS;
  readonly busy = signal(false); readonly notice = signal(''); readonly selected = signal(''); readonly cards = computed(() => this.store.data()?.cards ?? []);
  editor: DesignSet = this.blank(); cardId = this.store.data()?.cards[0]?.id ?? ''; previewCase: PreviewCase = 'real'; rarity: Rarity = 'holo-rare'; frameSlot: 'base' | Rarity = 'base'; previewTheme: 'light' | 'dark' = 'light'; revealed = true; deckId = '';

  blank(): DesignSet { return { id: crypto.randomUUID(), name: '', studyArtPolicy:'auto', backgroundFit: 'cover', backgroundPositionX: 50, backgroundPositionY: 50, frameFit: 'contain', finish: 'matte', layout: 'clean', composition: 'illustration-window', layoutPolicy: 'fixed', palette: { primary: '#285c50', secondary: '#d3ad5b', surface: '#f4efe2', onSurface: '#17372f', accent: '#78a79a' }, artwork: { fit: 'cover', focalX: 50, focalY: 48, treatment: 'embedded', mask: 'rounded-window', fullBleed: false, vignette: 20, tint: '#285c50', safeZone: 'centre', edgeFade: 24, backgroundBleed: 30, duotone: 8, textureBlend: 18, emboss: 10, depth: 5 }, rarityVariants: {}, credit: '', source: '', license: '', frames: {}, finishes: {} }; }
  private withDefaults(design: DesignSet): DesignSet { const defaults = this.blank(); return { ...defaults, ...design, palette: { ...defaults.palette!, ...design.palette }, artwork: { ...defaults.artwork!, ...design.artwork }, rarityVariants: { ...design.rarityVariants }, frames: { ...design.frames }, finishes: { ...design.finishes } }; }
  choose(id: string): void { this.selected.set(id); this.editor = this.withDefaults(structuredClone(this.store.data()?.designs.find(design => design.id === id) ?? this.blank())); this.notice.set(''); }

  card(): CardContent | undefined {
    const real = this.cards().find(card => card.id === this.cardId) ?? this.cards()[0]; if (this.previewCase === 'real') return real;
    const base: CardContent = { id: `design-preview-${this.previewCase}`, deckId: 'design-preview', kind: 'text', front: 'What should you remember?', answer: 'A clear primary answer', secondary: 'A concise secondary line', interpretation: 'Short interpretation that supports recall.', pronunciation: '', meaning: '', notes: '', tags: [], revision: 1, suspended: false, rarity: this.rarity };
    if (this.previewCase === 'text') return { ...base, front: 'Why does spaced recall work?', answer: 'Retrieval strengthens memory', secondary: 'Learning science' };
    if (this.previewCase === 'image') return { ...base, kind: 'visual', front: 'Identify this visual', answer: 'Uploaded artwork', image: real?.image, imageDescription: 'Design preview artwork', art: real?.image ? { kind: 'imported-media' } : undefined };
    if (this.previewCase === 'generated') return { ...base, kind: 'visual', front: 'Recall the key idea', answer: 'Generated art stays stable', art: { kind: 'generated-text-art', title: '✦', subtitle: 'Offline · deterministic', seed: 'design-generated' } };
    if (this.previewCase === 'technical') return { ...base, front: 'Solve for x: 2x + 4 = 18', answer: 'x = 7', secondary: 'Linear equation', interpretation: 'Subtract 4, then divide by 2.', details: [{ label: 'Method', content: '2x = 14, therefore x = 7.' }], art: { kind: 'generated-text-art', title: '2x + 4', subtitle: '= 18', seed: 'design-technical' } };
    return { ...base, front: 'Explain the relationship between photosynthesis and cellular respiration.', answer: 'They form a complementary energy cycle.', secondary: 'Biology', interpretation: 'Photosynthesis stores light energy; respiration releases chemical energy.', details: [{ label: 'Explanation', content: 'Carbon dioxide and water become glucose and oxygen; respiration uses those products to release usable energy.' }, { label: 'Reference', content: 'Cell metabolism overview' }] };
  }
  frameRef(): string | undefined { return this.editor.rarityVariants?.[this.rarity]?.frame || this.editor.frames?.[this.rarity] || this.editor.frame; }
  async upload(event: Event, kind: 'background' | 'frame' | 'texture'): Promise<void> { if (!this.authoringDecision.allowed) return void this.notice.set(this.authoringDecision.reason ?? 'Custom design authoring is unavailable.'); const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return; this.busy.set(true); try { const asset = await readArtwork(file); const palette = kind === 'background' ? await this.derivePalette(asset.dataUrl) : null; const saved = await this.store.saveAsset(asset); const ref = `asset:${saved.id}`; if (kind === 'background') { this.editor.background = ref; if (palette) this.editor.palette = palette; } else if (kind === 'texture') this.editor.texture = ref; else if (this.frameSlot === 'base') this.editor.frame = ref; else this.editor.frames = { ...this.editor.frames, [this.frameSlot]: ref }; this.editor = { ...this.editor }; this.notice.set(kind === 'background' ? 'Artwork uploaded locally and a reusable palette was derived. The source image is unchanged.' : 'Artwork uploaded locally. Save the Design Set to keep these settings.'); } catch (error) { this.notice.set(String(error)); } finally { this.busy.set(false); input.value = ''; } }
  remove(kind: 'background' | 'frame' | 'texture'): void { if (kind === 'background') delete this.editor.background; else if (kind === 'texture') delete this.editor.texture; else if (this.frameSlot === 'base') delete this.editor.frame; else { this.editor.frames = { ...this.editor.frames }; delete this.editor.frames[this.frameSlot]; } this.editor = { ...this.editor }; }
  palette(key: keyof DesignPalette): string { return this.editor.palette?.[key] ?? '#285c50'; }
  setPalette(key: keyof DesignPalette, value: string): void { this.editor.palette = { ...this.editor.palette!, [key]: value }; this.editor = { ...this.editor }; }
  artwork<K extends keyof NonNullable<DesignSet['artwork']>>(key: K): NonNullable<DesignSet['artwork']>[K] | undefined { return this.editor.artwork?.[key]; }
  setArtwork<K extends keyof NonNullable<DesignSet['artwork']>>(key: K, value: NonNullable<DesignSet['artwork']>[K]): void { this.editor.artwork = { ...this.editor.artwork!, [key]: value }; this.editor = { ...this.editor }; }
  surfacePreset(): string { const treatment=this.editor.artwork?.treatment;return treatment==='edge-fade'?'soft-edge':treatment==='background-bleed'?'full-bleed':treatment==='clean'?'crisp-frame':treatment==='duotone'?'duotone':treatment==='masked'?'masked':'printed'; }
  setSurfacePreset(preset: string): void {
    const current=this.editor.artwork!;
    const values:Record<string,Partial<typeof current>>={
      printed:{treatment:'embedded',mask:'rounded-window',fullBleed:false,edgeFade:24,backgroundBleed:30,vignette:20,duotone:8,textureBlend:18,emboss:10,depth:5},
      'soft-edge':{treatment:'edge-fade',mask:'soft-oval',fullBleed:false,edgeFade:44,backgroundBleed:36,vignette:16,duotone:4,textureBlend:14,emboss:5,depth:2},
      'full-bleed':{treatment:'background-bleed',mask:'none',fullBleed:true,edgeFade:18,backgroundBleed:55,vignette:28,duotone:10,textureBlend:22,emboss:4,depth:0},
      'crisp-frame':{treatment:'clean',mask:'frame-window',fullBleed:false,edgeFade:0,backgroundBleed:12,vignette:12,duotone:0,textureBlend:8,emboss:4,depth:7},
      duotone:{treatment:'duotone',mask:'rounded-window',fullBleed:false,edgeFade:18,backgroundBleed:28,vignette:18,duotone:45,textureBlend:14,emboss:5,depth:3},
      masked:{treatment:'masked',mask:'soft-oval',fullBleed:false,edgeFade:32,backgroundBleed:28,vignette:14,duotone:5,textureBlend:12,emboss:5,depth:3},
    };
    this.editor={...this.editor,artwork:{...current,...values[preset]}};
  }
  finishForPreview(): FinishPreset { return this.editor.rarityVariants?.[this.rarity]?.finish ?? this.editor.finishes?.[this.rarity] ?? this.editor.finish ?? 'matte'; }
  setTierFinish(value: FinishPreset): void { this.editor.rarityVariants = { ...this.editor.rarityVariants, [this.rarity]: { ...this.editor.rarityVariants?.[this.rarity], finish: value } }; this.editor = { ...this.editor }; }
  tierAccent(): string { return this.editor.rarityVariants?.[this.rarity]?.accent ?? this.editor.palette?.accent ?? '#78a79a'; }
  setTierAccent(value: string): void { this.editor.rarityVariants = { ...this.editor.rarityVariants, [this.rarity]: { ...this.editor.rarityVariants?.[this.rarity], accent: value } }; this.editor = { ...this.editor }; }

  async exportArtworkGuide(): Promise<void> { const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1500" viewBox="0 0 1000 1500"><rect width="1000" height="1500" fill="#f5f0e3"/><rect x="20" y="20" width="960" height="1460" rx="52" fill="none" stroke="#bd4040" stroke-width="4" stroke-dasharray="18 12"/><rect x="70" y="70" width="860" height="1360" rx="42" fill="none" stroke="#285c50" stroke-width="4"/><rect x="110" y="180" width="780" height="690" rx="28" fill="#dbe9e4" stroke="#285c50" stroke-width="3"/><rect x="110" y="920" width="780" height="360" rx="28" fill="#fff" stroke="#765f2f" stroke-width="3"/><text x="500" y="55" text-anchor="middle" font-family="Arial" font-size="24" fill="#8a2424">BLEED · KEEP ESSENTIAL ART INSIDE THE SAFE ZONE</text><text x="500" y="520" text-anchor="middle" font-family="Arial" font-size="42" fill="#285c50">ART / FOCAL REGION</text><text x="500" y="1110" text-anchor="middle" font-family="Arial" font-size="36" fill="#765f2f">PROTECTED CONTENT ZONE</text><text x="500" y="1375" text-anchor="middle" font-family="Arial" font-size="22" fill="#285c50">1000 × 1500 px · 2:3 · HoloRecall artwork guide</text></svg>`; try { await this.fileDelivery.deliver(new Blob([svg], { type: 'image/svg+xml' }), 'holorecall-artwork-guide-1000x1500.svg'); this.notice.set('Artwork guide exported. Reimport raster artwork below; learning content stays in HoloRecall.'); } catch (error) { this.notice.set(error instanceof Error ? error.message : String(error)); } }
  async save(assign = false): Promise<void> { if (!this.authoringDecision.allowed) return void this.notice.set(this.authoringDecision.reason ?? 'Custom design authoring is unavailable.'); if (!this.editor.name.trim()) return void this.notice.set('Give this Design Set a name.'); this.busy.set(true); try { await this.store.saveDesign({ ...this.editor, name: this.editor.name.trim() }); this.selected.set(this.editor.id); if (assign && this.deckId) { const deck = this.store.data()!.decks.find(item => item.id === this.deckId)!; await this.store.saveDeck({ ...deck, designSetId: this.editor.id }); } this.notice.set(assign ? 'Design Set saved and assigned. Inherited cards follow it; card overrides remain unchanged.' : 'Design Set saved. It can be reused by any deck.'); } catch (error) { this.notice.set(String(error)); } finally { this.busy.set(false); } }
  private async derivePalette(dataUrl: string): Promise<DesignPalette> { const image = new Image(); image.src = dataUrl; await image.decode(); const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32; const context = canvas.getContext('2d', { willReadFrequently: true }); if (!context) return this.editor.palette!; context.drawImage(image, 0, 0, 32, 32); return deriveDesignPalette(context.getImageData(0, 0, 32, 32).data); }
}
