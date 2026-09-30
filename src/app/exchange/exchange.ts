import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LocalStudyStore } from '../data/study-store';
import { decodeRaster } from '../upload';
import { FILE_DELIVERY } from '../platform/file-delivery';
import type { ImportPreview } from '../../domain/exchange';

@Component({
  selector: 'hr-exchange', standalone: true,
  imports: [MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="exchange-heading"><div><p class="eyebrow">CONTENT EXCHANGE</p><h1>Import & export</h1><p>Share decks and designs. Your study history stays in this browser.</p></div><span class="version">Format v1</span></div>
    <div class="exchange-grid">
      <section class="exchange-panel"><h2>Download</h2><p>Start from a workbook or export your current content.</p>
        <div class="download-links"><a mat-stroked-button href="/downloads/holorecall-blank-v1.xlsx" download>Blank workbook</a><a mat-stroked-button href="/downloads/holorecall-italian-v1.xlsx" download>Italian example</a><a mat-stroked-button href="/downloads/holorecall-italian-v1.zip" download>Portable example ZIP</a></div>
        <div class="export-actions"><button mat-flat-button (click)="export(false)" [disabled]="!!busy()">Export current XLSX</button><button mat-stroked-button (click)="export(true)" [disabled]="!!busy()">Export portable ZIP</button></div>
        <dl><dt>XLSX</dt><dd>Structured deck content, design settings and media references. Image files are not embedded.</dd><dt>Portable ZIP</dt><dd>The workbook, raster media files and design definitions. Bundled illustrations are converted to PNG.</dd></dl>
        <p class="help">For another AI: <a href="/downloads/deck-generation-prompt.md" download>generation prompt</a> · <a href="/downloads/deck-format.md" download>exact format specification</a>.</p>
      </section>
      <section class="exchange-panel"><h2>Import content</h2><p>Select a version-1 workbook or portable ZIP, inspect its changes, then apply.</p>
        <label class="file-label" for="content-import">Workbook or portable archive</label><input id="content-import" type="file" accept=".xlsx,.zip" (change)="selectFile($event)" [disabled]="!!busy()" />
        <p class="help">Up to 30 MiB compressed. Formula cells, embedded worksheet images, SVG uploads and external media URLs are rejected. Image-only cards require an answer-safe image description.</p>
        <p class="help">A deck import never grants cosmetics or imports reviews. Stable IDs update matching content; missing rows never delete existing cards.</p>
      </section>
    </div>
    @if (busy()) { <div class="busy" role="status"><mat-spinner diameter="24" /><span>{{ busy() }}</span></div> }
    @if (message()) { <p class="notice" role="status">{{ message() }}</p> }
    @if (failure()) { <p class="failure" role="alert">{{ failure() }}</p> }
    @if (preview(); as item) {
      <section class="exchange-panel preview" aria-label="Import preview"><div class="preview-heading"><h2>Import preview</h2><span>{{ filename() }}</span></div>
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
  `,
  styleUrl: './exchange.css',
})
export class ExchangeComponent {
  readonly store = inject(LocalStudyStore);
  private readonly fileDelivery = inject(FILE_DELIVERY);
  readonly preview = signal<ImportPreview | null>(null);
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

  async export(portable: boolean): Promise<void> {
    this.message.set(''); this.failure.set(''); this.busy.set(portable ? 'Packaging workbook, media and designs…' : 'Building content workbook…');
    try {
      const state = this.store.data(); if (!state) throw new Error('Local data is still loading.');
      const { contentFromState, writeWorkbook, makePortableBundle, writePortableZip } = await import('../../domain/exchange');
      let bundle = contentFromState(state);
      if (portable) bundle = await makePortableBundle(bundle, rasterizeBundled);
      const bytes = portable ? await writePortableZip(bundle) : await writeWorkbook(bundle);
      const blob = new Blob([bytes.slice().buffer], { type: portable ? 'application/zip' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      await this.fileDelivery.deliver(blob, `holorecall-content-v1.${portable ? 'zip' : 'xlsx'}`);
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
