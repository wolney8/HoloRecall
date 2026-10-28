import { Component, computed, DestroyRef, HostListener, inject, Injector, signal } from '@angular/core';
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
import { CardMotionViewportComponent } from '../card-motion-viewport';
import { LocalStudyStore } from '../data/study-store';
import { PageRevealDirective } from '../motion/page-reveal';
import { CAPABILITY_POLICY } from '../platform/capability-policy';
import { readArtwork } from '../upload';
import { deriveDesignPalette, designDeletionImpact, inheritedDesignId } from '../../domain/design-system';
import { FILE_DELIVERY } from '../platform/file-delivery';
import { firstValueFrom } from 'rxjs';
import { DesignDraftHistory } from './design-draft-history';
import { DesignStudioExitGuard } from './design-studio-exit-guard';

type PreviewCase = 'real' | 'text' | 'image' | 'generated' | 'technical' | 'long';
const LAYOUTS: ReadonlyArray<{ id: CardCompositionId; label: string; description: string }> = [
  { id: 'full-bleed', label: 'Full Bleed', description: 'Edge-to-edge artwork leads above protected content.' }, { id: 'framed-art', label: 'Framed Art', description: 'A bounded gallery frame gives artwork formal focus.' },
  { id: 'illustration-window', label: 'Illustration Window', description: 'An inset story window balances art and recall.' }, { id: 'split-art-content', label: 'Split Art / Content', description: 'Art and explanation share distinct side-by-side regions.' },
  { id: 'typographic-showcase', label: 'Typographic Showcase', description: 'A centred text hierarchy makes words and formulas the focus.' }, { id: 'minimal-prestige', label: 'Minimal Prestige', description: 'Deliberate whitespace and restrained detail create quiet focus.' },
  { id: 'diagram-technical', label: 'Diagram / Technical', description: 'Contained diagrams and start-aligned explanation support precision.' }, { id: 'photo-focus', label: 'Photo Focus', description: 'A dominant photographic region leads supporting text.' },
  { id: 'symbolic-generated', label: 'Symbolic / Generated Art', description: 'A centred emblem pairs generated motifs with concise recall.' },
];

@Component({ selector: 'hr-design-studio', standalone: true, imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonToggleModule, FlashcardComponent, CardMotionViewportComponent, PageRevealDirective], templateUrl: './design-studio.html', styleUrl: './design-studio.css' })
export class DesignStudioComponent {
  readonly store = inject(LocalStudyStore); private readonly capabilityPolicy = inject(CAPABILITY_POLICY); private readonly fileDelivery = inject(FILE_DELIVERY); private readonly injector = inject(Injector); private readonly exitGuard = inject(DesignStudioExitGuard);
  readonly authoringDecision = this.capabilityPolicy.decide('custom-design-authoring'); readonly tiers = RARITIES; readonly finishes = FINISH_TREATMENTS; readonly layouts = LAYOUTS;
  readonly busy = signal(false); readonly notice = signal(''); readonly selected = signal(''); readonly cards = computed(() => this.store.data()?.cards ?? []);
  editor: DesignSet = this.blank(); cardId = this.store.data()?.cards[0]?.id ?? ''; previewCase: PreviewCase = 'real'; rarity: Rarity = 'holo-rare'; frameSlot: 'base' | Rarity = 'base'; previewTheme: 'light' | 'dark' = 'light'; revealed = true; deckId = '';
  private readonly history = new DesignDraftHistory();

  constructor() {
    this.history.start(this.editor);
    const unregister = this.exitGuard.register();
    inject(DestroyRef).onDestroy(unregister);
  }

  blank(): DesignSet { return { id: crypto.randomUUID(), name: '', studyArtPolicy:'auto', backgroundFit: 'cover', backgroundPositionX: 50, backgroundPositionY: 50, frameFit: 'contain', finish: 'matte', layout: 'clean', composition: 'illustration-window', layoutPolicy: 'fixed', palette: { primary: '#285c50', secondary: '#d3ad5b', surface: '#f4efe2', onSurface: '#17372f', accent: '#78a79a' }, artwork: { fit: 'cover', focalX: 50, focalY: 48, treatment: 'embedded', mask: 'rounded-window', fullBleed: false, vignette: 20, tint: '#285c50', safeZone: 'centre', edgeFade: 24, backgroundBleed: 30, duotone: 8, textureBlend: 18, emboss: 10, depth: 5 }, rarityVariants: {}, credit: '', source: '', license: '', frames: {}, finishes: {} }; }
  private withDefaults(design: DesignSet): DesignSet { const defaults = this.blank(); return { ...defaults, ...design, palette: { ...defaults.palette!, ...design.palette }, artwork: { ...defaults.artwork!, ...design.artwork }, rarityVariants: { ...design.rarityVariants }, frames: { ...design.frames }, finishes: { ...design.finishes } }; }
  async choose(id: string): Promise<void> { if (id === this.selected()) return; if (!await this.exitGuard.confirm(id ? 'switch' : 'new')) return; this.load(id); }
  private load(id: string): void { this.selected.set(id); this.editor = this.withDefaults(structuredClone(this.store.data()?.designs.find(design => design.id === id) ?? this.blank())); this.history.start(this.editor); this.syncDirty(); this.notice.set(''); }
  private updateEditor(next: DesignSet): void { this.editor = this.history.record(this.editor, next); this.syncDirty(); }
  private syncDirty(): void { this.exitGuard.dirty.set(this.history.dirty(this.editor)); }
  dirty(): boolean { return this.history.dirty(this.editor); }
  canUndo(): boolean { return this.history.canUndo(); }
  canRedo(): boolean { return this.history.canRedo(); }
  undo(): void { this.editor = this.history.undo(this.editor); this.syncDirty(); }
  redo(): void { this.editor = this.history.redo(this.editor); this.syncDirty(); }
  edit<K extends keyof DesignSet>(key: K, value: DesignSet[K]): void { this.updateEditor({ ...this.editor, [key]: value }); }
  private discardDraft(): void { this.editor = this.history.revert(this.editor); this.syncDirty(); }
  async revert(): Promise<void> { if (!this.dirty() || await this.exitGuard.confirm('revert')) { this.discardDraft(); this.notice.set('Changes reverted to the last saved version.'); } }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent): void { if (!this.dirty()) return; event.preventDefault(); event.returnValue = ''; }
  @HostListener('document:keydown', ['$event']) historyShortcut(event: KeyboardEvent): void {
    if ((!event.ctrlKey && !event.metaKey) || event.altKey || event.key.toLocaleLowerCase() !== 'z' || event.repeat || document.querySelector('[role="dialog"]')) return;
    const canApply = event.shiftKey ? this.canRedo() : this.canUndo();
    if (!canApply) return;
    event.preventDefault();
    event.shiftKey ? this.redo() : this.undo();
  }

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
  async upload(event: Event, kind: 'background' | 'frame' | 'texture'): Promise<void> { if (!this.authoringDecision.allowed) return void this.notice.set(this.authoringDecision.reason ?? 'Custom design authoring is unavailable.'); const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return; this.busy.set(true); try { const asset = await readArtwork(file); const palette = kind === 'background' ? await this.derivePalette(asset.dataUrl) : null; const saved = await this.store.saveAsset(asset); const ref = `asset:${saved.id}`; const next=structuredClone(this.editor); if (kind === 'background') { next.background = ref; if (palette) next.palette = palette; } else if (kind === 'texture') next.texture = ref; else if (this.frameSlot === 'base') next.frame = ref; else next.frames = { ...next.frames, [this.frameSlot]: ref }; this.updateEditor(next); this.notice.set(kind === 'background' ? 'Artwork uploaded locally and a reusable palette was derived. The source image is unchanged.' : 'Artwork uploaded locally. Save the Design Set to keep these settings.'); } catch (error) { this.notice.set(String(error)); } finally { this.busy.set(false); input.value = ''; } }
  remove(kind: 'background' | 'frame' | 'texture'): void { const next=structuredClone(this.editor); if (kind === 'background') delete next.background; else if (kind === 'texture') delete next.texture; else if (this.frameSlot === 'base') delete next.frame; else { next.frames = { ...next.frames }; delete next.frames[this.frameSlot]; } this.updateEditor(next); }
  palette(key: keyof DesignPalette): string { return this.editor.palette?.[key] ?? '#285c50'; }
  setPalette(key: keyof DesignPalette, value: string): void { this.updateEditor({ ...this.editor, palette: { ...this.editor.palette!, [key]: value } }); }
  artwork<K extends keyof NonNullable<DesignSet['artwork']>>(key: K): NonNullable<DesignSet['artwork']>[K] | undefined { return this.editor.artwork?.[key]; }
  setArtwork<K extends keyof NonNullable<DesignSet['artwork']>>(key: K, value: NonNullable<DesignSet['artwork']>[K]): void { this.updateEditor({ ...this.editor, artwork: { ...this.editor.artwork!, [key]: value } }); }
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
    this.updateEditor({...this.editor,artwork:{...current,...values[preset]}});
  }
  finishForPreview(): FinishPreset { return this.editor.rarityVariants?.[this.rarity]?.finish ?? this.editor.finishes?.[this.rarity] ?? this.editor.finish ?? 'matte'; }
  setTierFinish(value: FinishPreset): void { this.updateEditor({ ...this.editor, rarityVariants: { ...this.editor.rarityVariants, [this.rarity]: { ...this.editor.rarityVariants?.[this.rarity], finish: value } } }); }
  tierAccent(): string { return this.editor.rarityVariants?.[this.rarity]?.accent ?? this.editor.palette?.accent ?? '#78a79a'; }
  setTierAccent(value: string): void { this.updateEditor({ ...this.editor, rarityVariants: { ...this.editor.rarityVariants, [this.rarity]: { ...this.editor.rarityVariants?.[this.rarity], accent: value } } }); }

  async exportArtworkGuide(): Promise<void> { const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1500" viewBox="0 0 1000 1500"><rect width="1000" height="1500" fill="#f5f0e3"/><rect x="20" y="20" width="960" height="1460" rx="52" fill="none" stroke="#bd4040" stroke-width="4" stroke-dasharray="18 12"/><rect x="70" y="70" width="860" height="1360" rx="42" fill="none" stroke="#285c50" stroke-width="4"/><rect x="110" y="180" width="780" height="690" rx="28" fill="#dbe9e4" stroke="#285c50" stroke-width="3"/><rect x="110" y="920" width="780" height="360" rx="28" fill="#fff" stroke="#765f2f" stroke-width="3"/><text x="500" y="55" text-anchor="middle" font-family="Arial" font-size="24" fill="#8a2424">BLEED · KEEP ESSENTIAL ART INSIDE THE SAFE ZONE</text><text x="500" y="520" text-anchor="middle" font-family="Arial" font-size="42" fill="#285c50">ART / FOCAL REGION</text><text x="500" y="1110" text-anchor="middle" font-family="Arial" font-size="36" fill="#765f2f">PROTECTED CONTENT ZONE</text><text x="500" y="1375" text-anchor="middle" font-family="Arial" font-size="22" fill="#285c50">1000 × 1500 px · 2:3 · HoloRecall artwork guide</text></svg>`; try { await this.fileDelivery.deliver(new Blob([svg], { type: 'image/svg+xml' }), 'holorecall-artwork-guide-1000x1500.svg'); this.notice.set('Artwork guide exported. Reimport raster artwork below; learning content stays in HoloRecall.'); } catch (error) { this.notice.set(error instanceof Error ? error.message : String(error)); } }
  async save(assign = false): Promise<void> { if (!this.authoringDecision.allowed) return void this.notice.set(this.authoringDecision.reason ?? 'Custom design authoring is unavailable.'); if (!this.editor.name.trim()) return void this.notice.set('Give this Design Set a name.'); this.busy.set(true); try { this.editor={...this.editor,name:this.editor.name.trim()}; await this.store.saveDesign(this.editor); this.selected.set(this.editor.id); this.history.saved(this.editor);this.syncDirty(); if (assign && this.deckId) await this.store.setDeckDesign(this.deckId,this.editor.id); this.notice.set(assign ? 'Design Set saved and assigned. Inherited cards follow it; card overrides remain unchanged.' : 'Design Set saved. It can be reused by any deck.'); } catch (error) { this.notice.set(String(error)); } finally { this.busy.set(false); } }
  async duplicate(): Promise<void> { if (!this.selected() || !await this.exitGuard.confirm('switch')) return; this.busy.set(true); try { const id=await this.store.duplicateDesign(this.selected()); this.load(id); this.notice.set('Design Set duplicated. The copy has no deck or card assignments.'); } catch(error){this.notice.set(String(error));} finally{this.busy.set(false);} }
  async deleteSelected(event?:Event): Promise<void> { const id=this.selected(),state=this.store.data(),design=state?.designs.find(item=>item.id===id);if(!id||!state||!design)return;const returnFocus=event?.currentTarget as HTMLElement|undefined;const [{MatDialog},{DeleteDesignDialogComponent}]=await Promise.all([import('@angular/material/dialog'),import('./design-studio-dialogs')]),impact=designDeletionImpact(state,id),dialog=this.injector.get(MatDialog),confirmed=await firstValueFrom(dialog.open(DeleteDesignDialogComponent,{data:{name:design.name,...impact},autoFocus:'first-tabbable',restoreFocus:false,maxWidth:'min(94vw, 34rem)'}).afterClosed());returnFocus?.focus();if(!confirmed)return;this.busy.set(true);try{await this.store.deleteDesign(id);this.load('');this.notice.set('Design Set deleted. Assignments now use their inherited or HoloRecall design; learning data was unchanged.');}catch(error){this.notice.set(String(error));}finally{this.busy.set(false);} }
  deckScope(): string { const state=this.store.data(),deck=state?.decks.find(item=>item.id===this.deckId);if(!state||!deck)return'Choose a deck to inspect its design source.';if(deck.designSetId){const name=state.designs.find(item=>item.id===deck.designSetId)?.name??'missing Design Set';return`Direct assignment · ${name}`;}const inherited=inheritedDesignId(state.decks,deck.id);if(inherited.id){const name=state.designs.find(item=>item.id===inherited.id)?.name??'missing Design Set',source=state.decks.find(item=>item.id===inherited.deckId)?.name;return`Inherited from ${source??'an ancestor'} · ${name}`;}return'Inherited · HoloRecall default'; }
  deckHasDirectDesign():boolean{return !!this.store.data()?.decks.find(deck=>deck.id===this.deckId)?.designSetId;}
  async returnDeckToInherited():Promise<void>{if(!this.deckId)return;await this.store.setDeckDesign(this.deckId,undefined);this.notice.set('Deck returned to its inherited Design Set. Card overrides remain unchanged.');}
  private async derivePalette(dataUrl: string): Promise<DesignPalette> { const image = new Image(); image.src = dataUrl; await image.decode(); const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32; const context = canvas.getContext('2d', { willReadFrequently: true }); if (!context) return this.editor.palette!; context.drawImage(image, 0, 0, 32, 32); return deriveDesignPalette(context.getImageData(0, 0, 32, 32).data); }
}
