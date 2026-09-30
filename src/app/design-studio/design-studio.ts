import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { LocalStudyStore } from '../data/study-store';
import { FlashcardComponent } from '../card';
import { RARITIES } from '../../domain/rewards';
import type { DesignSet, Rarity } from '../../domain/models';
import { readArtwork } from '../upload';
import { PageRevealDirective } from '../motion/page-reveal';

@Component({
  selector: 'hr-design-studio', standalone: true,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonToggleModule, FlashcardComponent, PageRevealDirective],
  templateUrl: './design-studio.html',
})
export class DesignStudioComponent {
  readonly store = inject(LocalStudyStore);
  readonly tiers = RARITIES;
  readonly busy = signal(false);
  readonly notice = signal('');
  readonly selected = signal('');
  editor: DesignSet = this.blank();
  cardId = this.store.data()?.cards[0]?.id ?? '';
  rarity: Rarity = 'holo-rare';
  frameSlot: 'base' | Rarity = 'base';
  previewTheme: 'light' | 'dark' = 'light';
  revealed = true;
  deckId = '';
  readonly cards = computed(() => this.store.data()?.cards ?? []);
  blank(): DesignSet {
    return { id: crypto.randomUUID(), name: '', backgroundFit: 'cover', backgroundPositionX: 50, backgroundPositionY: 50, frameFit: 'contain', credit: '', source: '', license: '', frames: {} };
  }
  card() { return this.cards().find(card => card.id === this.cardId) ?? this.cards()[0]; }
  choose(id: string): void {
    this.selected.set(id);
    this.editor = structuredClone(this.store.data()?.designs.find(design => design.id === id) ?? this.blank());
    this.notice.set('');
  }
  frameRef(): string | undefined { return this.editor.frames?.[this.rarity] || this.editor.frame; }
  async upload(event: Event, kind: 'background' | 'frame'): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0]; if (!file) return;
    this.busy.set(true);
    try {
      const asset = await readArtwork(file);
      await this.store.saveAsset(asset);
      const ref = `asset:${asset.id}`;
      if (kind === 'background') this.editor.background = ref;
      else if (this.frameSlot === 'base') this.editor.frame = ref;
      else this.editor.frames = { ...this.editor.frames, [this.frameSlot]: ref };
      this.editor = { ...this.editor };
      this.notice.set('Artwork uploaded locally. Save the design to keep these settings.');
    } catch (error) { this.notice.set(String(error)); }
    finally { this.busy.set(false); input.value = ''; }
  }
  remove(kind: 'background' | 'frame'): void {
    if (kind === 'background') delete this.editor.background;
    else if (this.frameSlot === 'base') delete this.editor.frame;
    else { this.editor.frames = { ...this.editor.frames }; delete this.editor.frames[this.frameSlot]; }
    this.editor = { ...this.editor };
  }
  async save(assign = false): Promise<void> {
    if (!this.editor.name.trim()) { this.notice.set('Give this design a name.'); return; }
    this.busy.set(true);
    try {
      await this.store.saveDesign({ ...this.editor, name: this.editor.name.trim() });
      this.selected.set(this.editor.id);
      if (assign && this.deckId) {
        const deck = this.store.data()!.decks.find(item => item.id === this.deckId)!;
        await this.store.saveDeck({ ...deck, designSetId: this.editor.id });
      }
      this.notice.set(assign ? 'Design saved and assigned to the deck. Card overrides are preserved.' : 'Design saved. It can be reused by any deck.');
    } catch (error) { this.notice.set(String(error)); }
    finally { this.busy.set(false); }
  }
}
