import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { LocalStudyStore } from '../data/study-store';
import { decodeRaster } from '../upload';
import { FILE_DELIVERY } from '../platform/file-delivery';
import type { ImportPreview } from '../../domain/exchange';
import type { AnkiAnalysis } from '../../domain/anki';
import type { Rarity } from '../../domain/models';
import { PageRevealDirective } from '../motion/page-reveal';

@Component({
  selector: 'hr-exchange', standalone: true,
  imports: [FormsModule, MatButtonModule, MatProgressSpinnerModule, PageRevealDirective],
  template: `
    <div class="exchange-heading" hrReveal><div><p class="eyebrow">CONTENT EXCHANGE</p><h1>Import & export</h1><p>Share decks and designs. Your study history stays in this browser.</p></div><span class="version">Format v2</span></div>
    <div class="exchange-grid">
      <section class="exchange-panel" hrReveal><h2>Download</h2><p>Start from a workbook or export your current content.</p>
        <div class="download-links"><a mat-stroked-button href="/downloads/holorecall-blank-v2.xlsx" download>Blank workbook</a><a mat-stroked-button href="/downloads/holorecall-italian-v2.xlsx" download>Italian example</a><a mat-stroked-button href="/downloads/holorecall-italian-v2.zip" download>Portable example ZIP</a></div>
        <div class="export-actions"><button mat-flat-button (click)="export(false)" [disabled]="!!busy()">Export current XLSX</button><button mat-stroked-button (click)="export(true)" [disabled]="!!busy()">Export portable ZIP</button></div>
        <dl><dt>XLSX</dt><dd>Structured deck content, design settings and media references. Image files are not embedded.</dd><dt>Portable ZIP</dt><dd>The workbook, raster media files and design definitions. Bundled illustrations are converted to PNG.</dd></dl>
        <p class="help">For another AI: <a href="/downloads/deck-generation-prompt.md" download>generation prompt</a> · <a href="/downloads/deck-format.md" download>exact format specification</a>.</p>
      </section>
      <section class="exchange-panel" hrReveal [hrRevealDelay]="55"><h2>Import content</h2><p>Select a version-1 or version-2 workbook or portable ZIP, inspect its changes, then apply.</p>
        <label class="file-label" for="content-import">Workbook or portable archive</label><input id="content-import" type="file" accept=".xlsx,.zip" (change)="selectFile($event)" [disabled]="!!busy()" />
        <p class="help">Up to 30 MiB compressed. Formula cells, embedded worksheet images, SVG uploads and external media URLs are rejected. Image-only cards require an answer-safe image description.</p>
        <p class="help">A deck import never grants cosmetics or imports reviews. Stable IDs update matching content; missing rows never delete existing cards.</p>
      </section>
    </div>
    @if (busy()) { <div class="busy" role="status"><mat-spinner diameter="24" /><span>{{ busy() }}</span></div> }
    @if (message()) { <p class="notice" role="status">{{ message() }}</p> }
    @if (failure()) { <p class="failure" role="alert">{{ failure() }}</p> }
    @if (preview(); as item) {
      <section class="exchange-panel preview" aria-label="Import preview" hrReveal><div class="preview-heading"><h2>Import preview</h2><span>{{ filename() }}</span></div>
        @if (item.errors.length) { <div class="failure" role="alert"><h3>Import blocked</h3><ul>@for (error of item.errors; track $index) { <li>{{ error }}</li> }</ul><p>Nothing has been changed. Correct the file and select it again.</p></div> }
        @else {
          <div class="preview-counts"><div><strong>{{ item.newCards.length }}</strong><span>New cards</span></div><div><strong>{{ item.updatedCards.length }}</strong><span>Card updates</span></div><div><strong>{{ item.duplicateCards.length }}</strong><span>Unchanged cards</span></div><div><strong>0</strong><span>Errors</span></div></div>
          <p>{{ item.newDecks.length }} new decks · {{ item.updatedDecks.length }} deck updates · {{ item.newDesigns.length }} new designs · {{ item.updatedDesigns.length }} design updates · {{ item.bundle.assets.length }} bundled images</p>
          @if (item.newCards.length) { <details open><summary>New card IDs</summary><p class="ids">{{ item.newCards.join(', ') }}</p></details> }
          @if (item.updatedCards.length) { <details open><summary>Updated card IDs</summary><p class="ids">{{ item.updatedCards.join(', ') }}</p></details> }
          @if (item.duplicateCards.length) { <details><summary>Unchanged duplicate IDs</summary><p class="ids">{{ item.duplicateCards.join(', ') }}</p></details> }
          <p class="help">Updates preserve scheduling and review history. Applying uses the exact data version inspected here; if anything changes, inspect the file again.</p>
          <button mat-flat-button (click)="apply()" [disabled]="busy() || !hasChanges(item)">Apply {{ item.newCards.length + item.updatedCards.length }} card changes</button>
        }
      </section>
    }
    <section class="exchange-panel anki-import" aria-label="Anki package import" hrReveal>
      <p class="eyebrow">LOCAL PACKAGE CONVERSION</p><h2>Import an Anki deck</h2><p>Choose an <code>.apkg</code> file. HoloRecall analyses it locally, converts safe learning content, and never imports scheduling history or earned cosmetics.</p>
      <label class="file-label" for="anki-import">Anki package</label><input id="anki-import" type="file" accept=".apkg,application/zip" (change)="selectAnki($event)" [disabled]="!!busy()" />
      @if(ankiAnalysis();as analysis){<div class="anki-summary"><div class="preview-counts"><div><strong>{{analysis.sourceNotes}}</strong><span>Source notes</span></div><div><strong>{{analysis.generatedCards}}</strong><span>Generated cards</span></div><div><strong>{{analysis.decks.length}}</strong><span>Decks</span></div><div><strong>{{analysis.assets.length}}</strong><span>Images</span></div></div><p><strong>Detected:</strong> {{analysis.variant}}. Proposed authored rarity: @for(tier of rarityIds;track tier){<span class="status-chip">{{tier}} {{analysis.proposedRarities[tier]}}</span>}</p>
        @if(analysis.issues.length){<div class="failure"><h3>Excluded or unsupported content</h3><ul>@for(issue of analysis.issues;track issue.kind+issue.message){<li><strong>{{issue.count}}</strong> {{issue.message}} <span class="ids">{{issue.examples.join(', ')}}</span></li>}</ul><label><input type="checkbox" [(ngModel)]="acceptAnkiIssues"> Import the supported cards and exclude the listed items</label></div>}
        <label><input type="checkbox" [(ngModel)]="preserveAnkiEdits" (change)="refreshAnkiPreview()"> Preserve local edits when a stable Anki card identity already exists</label>
        @if(ankiPreview();as item){<p>{{item.newCards.length}} new · {{item.updatedCards.length}} updates · {{item.duplicateCards.length}} unchanged. Imported rarity is authored presentation only; it does not unlock cosmetics.</p><button mat-flat-button (click)="applyAnki()" [disabled]="!!busy() || (!!analysis.issues.length && !acceptAnkiIssues)">Import {{item.newCards.length + item.updatedCards.length}} supported cards</button> <button mat-button (click)="cancelAnki()">Cancel</button>}
      </div>}
      <details><summary>Supported package scope</summary><p>Legacy <code>collection.anki2</code>, legacy <code>collection.anki21</code>, and detected modern <code>collection.anki21b</code> databases are analysed. Basic, reversed, conditional and standard cloze templates convert to inert HoloRecall text. PNG, JPEG and WebP images are bundled. Script-dependent templates, answer checking, image occlusion, active SVG, remote resources, fonts and audio are reported and excluded in this build.</p></details>
    </section>
  `,
  styleUrl: './exchange.css',
})
export class ExchangeComponent {
  readonly rarityIds: Rarity[] = ['common','uncommon','rare','holo-rare','ultra-rare','secret-rare','relic'];
  readonly store = inject(LocalStudyStore);
  private readonly fileDelivery = inject(FILE_DELIVERY);
  readonly preview = signal<ImportPreview | null>(null);
  readonly ankiAnalysis = signal<AnkiAnalysis | null>(null); readonly ankiPreview = signal<ImportPreview | null>(null);
  preserveAnkiEdits = true; acceptAnkiIssues = false; private ankiAbort?: AbortController;
  readonly filename = signal(''); readonly busy = signal(''); readonly message = signal(''); readonly failure = signal('');

  hasChanges(preview: ImportPreview): boolean { return !!(preview.newCards.length + preview.updatedCards.length + preview.newDecks.length + preview.updatedDecks.length + preview.newDesigns.length + preview.updatedDesigns.length + preview.bundle.assets.length); }

  async selectFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
    this.message.set(''); this.failure.set(''); this.preview.set(null); this.filename.set(file.name); this.busy.set('Validating content and media…');
    try {
      const state = this.store.data(); if (!state) throw new Error('Local data is still loading.');
      const { MAX_FILE_BYTES, readContentFile } = await import('../../domain/exchange');
      if (file.size > MAX_FILE_BYTES) throw new Error('Choose a file of at most 30 MiB.');
      const preview = await readContentFile(new Uint8Array(await file.arrayBuffer()), file.name, state);
      // A byte signature is insufficient to establish an image is decodable. Verify every ZIP image before enabling Apply.
      if (!preview.errors.length) for (const asset of preview.bundle.assets) {
        const blob = await (await fetch(asset.dataUrl)).blob();
        let dimensions: { width: number; height: number };
        try { dimensions = await decodeRaster(blob); } catch { throw new Error(`Image ${asset.name} cannot be decoded.`); }
        const matches = dimensions.width === asset.width && dimensions.height === asset.height && dimensions.width >= 16 && dimensions.height >= 16 && dimensions.width <= 4096 && dimensions.height <= 4096;
        if (!matches) throw new Error(`Image ${asset.name}: dimensions must match its metadata and be 16–4096 pixels.`);
      }
      this.preview.set(preview);
    } catch (error) { this.failure.set(this.errorMessage(error)); }
    finally { this.busy.set(''); input.value = ''; }
  }

  async apply(): Promise<void> {
    const preview = this.preview(); if (!preview || preview.errors.length || this.busy()) return;
    this.busy.set('Saving content atomically…'); this.failure.set('');
    try { await this.store.applyContentImport(preview.bundle, preview.expectedVersion); this.message.set(`Imported ${preview.newCards.length} new cards and updated ${preview.updatedCards.length} cards. Existing reviews and earned cosmetics are preserved.`); this.preview.set(null); }
    catch (error) { this.failure.set(this.errorMessage(error)); }
    finally { this.busy.set(''); }
  }

  async selectAnki(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement, file = input.files?.[0]; if (!file) return;
    this.cancelAnki(); this.failure.set(''); this.message.set(''); this.ankiAbort = new AbortController(); this.busy.set('Opening the Anki archive…');
    try {
      if (file.size > 30 * 1024 * 1024) throw new Error('Choose an Anki package of at most 30 MiB compressed.');
      const state = this.store.data(); if (!state) throw new Error('Local data is still loading.');
      const { analyseAnkiPackage, previewAnkiImport } = await import('../../domain/anki');
      const analysis = await analyseAnkiPackage(new Uint8Array(await file.arrayBuffer()), file.name, this.ankiAbort.signal, progress => this.busy.set(`${progress.stage}: ${progress.percent}%`));
      this.ankiAnalysis.set(analysis); this.ankiPreview.set(previewAnkiImport(analysis, state, this.preserveAnkiEdits)); this.acceptAnkiIssues = false;
    } catch (error) { if ((error as Error).name !== 'AbortError') this.failure.set(this.errorMessage(error)); }
    finally { this.busy.set(''); input.value = ''; }
  }
  refreshAnkiPreview(): void { const analysis = this.ankiAnalysis(), state = this.store.data(); if (!analysis || !state) return; void import('../../domain/anki').then(({ previewAnkiImport }) => this.ankiPreview.set(previewAnkiImport(analysis, state, this.preserveAnkiEdits))); }
  cancelAnki(): void { this.ankiAbort?.abort(); this.ankiAbort = undefined; this.ankiAnalysis.set(null); this.ankiPreview.set(null); }
  async applyAnki(): Promise<void> { const preview = this.ankiPreview(), analysis = this.ankiAnalysis(); if (!preview || !analysis || (analysis.issues.length && !this.acceptAnkiIssues)) return; this.busy.set('Saving the supported Anki content atomically…'); try { await this.store.applyContentImport(preview.bundle, preview.expectedVersion); this.message.set(`Imported ${preview.newCards.length} Anki cards. Scheduling, review history and cosmetic unlocks were not imported.`); this.cancelAnki(); } catch (error) { this.failure.set(this.errorMessage(error)); } finally { this.busy.set(''); } }

  async export(portable: boolean): Promise<void> {
    this.message.set(''); this.failure.set(''); this.busy.set(portable ? 'Packaging workbook, media and designs…' : 'Building content workbook…');
    try {
      const state = this.store.data(); if (!state) throw new Error('Local data is still loading.');
      const { contentFromState, writeWorkbook, makePortableBundle, writePortableZip } = await import('../../domain/exchange');
      let bundle = contentFromState(state);
      if (portable) bundle = await makePortableBundle(bundle, rasterizeBundled);
      const bytes = portable ? await writePortableZip(bundle) : await writeWorkbook(bundle);
      const blob = new Blob([bytes.slice().buffer], { type: portable ? 'application/zip' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      await this.fileDelivery.deliver(blob, `holorecall-content-v2.${portable ? 'zip' : 'xlsx'}`);
      this.message.set(portable ? 'Portable ZIP download requested with media and design definitions. No learning history is included.' : 'Workbook download requested. Uploaded image references require the portable ZIP when shared with another browser.');
    } catch (error) { this.failure.set(this.errorMessage(error)); }
    finally { this.busy.set(''); }
  }
  private errorMessage(error: unknown): string { return error instanceof Error ? error.message : 'The operation could not be completed. No existing data was removed.'; }
}

export async function rasterizeBundled(ref: string): Promise<{ dataUrl: string; width: number; height: number }> {
  const image = new Image(); image.src = ref;
  await image.decode(); const width = 900; const height = Math.round(width * image.naturalHeight / image.naturalWidth);
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d'); if (!context) throw new Error('This browser cannot convert bundled artwork to PNG.');
  context.drawImage(image, 0, 0, width, height); return { dataUrl: canvas.toDataURL('image/png'), width, height };
}
