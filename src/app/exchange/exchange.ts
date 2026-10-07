import { Component, EventEmitter, inject, Input, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { LocalStudyStore } from '../data/study-store';
import { decodeRaster } from '../upload';
import { FILE_DELIVERY } from '../platform/file-delivery';
import type { ImportPreview } from '../../domain/exchange';
import type { AnkiAnalysis, AnkiImportPreview, AnkiModelSchema, AnkiProgress } from '../../domain/anki';
import { suggestedAnkiMapping } from '../../domain/anki';
import type { AnkiFieldTarget, AnkiMappingPreset, Rarity } from '../../domain/models';
import { PageRevealDirective } from '../motion/page-reveal';
import { AnkiWorkerClient } from './anki-worker-client';
import { CAPABILITY_POLICY } from '../platform/capability-policy';
import { BALANCED_PRESET_ID } from '../../domain/study-settings';

@Component({
  selector: 'hr-exchange', standalone: true,
  imports: [FormsModule, MatButtonModule, MatProgressSpinnerModule, MatFormFieldModule, MatSelectModule, MatInputModule, PageRevealDirective],
  template: `
    @if(updateDeckId){<div class="exchange-heading contextual-update-heading"><div><p class="eyebrow">ANKI SOURCE UPDATE</p><h1>Update from Anki package</h1><p>Review revised source content for <strong>{{updateDeckName()}}</strong>. Learning history and scheduling stay intact.</p></div><button mat-button type="button" (click)="cancelUpdate.emit()">Cancel</button></div><ol class="update-steps" aria-label="Update progress"><li [class.active]="!ankiAnalysis()">Choose package</li><li [class.active]="!!busy()">Analyse</li><li [class.active]="!!ankiAnalysis()">Review</li><li [class.active]="!!ankiPreview()&&!conflictsResolved()">Resolve</li><li [class.active]="!!ankiPreview()&&conflictsResolved()">Apply</li></ol>}@else{
    <div class="exchange-heading" hrReveal><div><p class="eyebrow">CONTENT EXCHANGE</p><h1>Import & export</h1><p>Share decks and designs. Your study history stays in this browser.</p></div><span class="version">Format v5</span></div>
    <div class="exchange-grid">
      <section class="exchange-panel" hrReveal><h2>Download</h2><p>Start from a workbook or export your current content.</p>
        <div class="download-links"><a mat-stroked-button href="/downloads/holorecall-blank-v5.xlsx" download>Blank workbook</a><a mat-stroked-button href="/downloads/holorecall-italian-v5.xlsx" download>Italian example</a><a mat-stroked-button href="/downloads/holorecall-italian-v5.zip" download>Portable example ZIP</a></div>
        <div class="export-actions"><button mat-flat-button (click)="export(false)" [disabled]="!!busy()">Export current XLSX</button><button mat-stroked-button (click)="export(true)" [disabled]="!!busy()">Export portable ZIP</button></div>
        <dl><dt>XLSX</dt><dd>Structured deck content, design settings and media references. Media files are not embedded.</dd><dt>Portable ZIP</dt><dd>The workbook, validated image/audio files and design definitions. Bundled illustrations are converted to PNG.</dd></dl>
        <p class="help">For another AI: <a href="/downloads/deck-generation-prompt.md" download>generation prompt</a> · <a href="/downloads/deck-format.md" download>exact format specification</a>.</p>
      </section>
      <section class="exchange-panel" hrReveal [hrRevealDelay]="55"><h2>Import content</h2><p>Select a version-1 through version-5 workbook or portable ZIP, inspect its changes, then apply.</p>
        <label class="file-label" for="content-import">Workbook or portable archive</label><input id="content-import" type="file" accept=".xlsx,.zip" (change)="selectFile($event)" [disabled]="!!busy()" />
        <p class="help">Up to 30 MiB compressed. Formula cells, embedded worksheet images, SVG uploads and external media URLs are rejected. Image-only cards require an answer-safe image description.</p>
        <p class="help">A deck import never grants cosmetics or imports reviews. Stable IDs update matching content; missing rows never delete existing cards.</p>
      </section>
    </div>
    }
    @if (busy()) { <div class="busy" role="status"><mat-spinner diameter="24" /><span>{{ busy() }}</span></div> }
    @if (message()) { <p class="notice" role="status">{{ message() }}</p> }
    @if (failure()) { <p class="failure" role="alert">{{ failure() }}</p> }
    @if (preview(); as item) {
      <section class="exchange-panel preview" aria-label="Import preview" hrReveal><div class="preview-heading"><h2>Import preview</h2><span>{{ filename() }}</span></div>
        @if (item.errors.length) { <div class="failure" role="alert"><h3>Import blocked</h3><ul>@for (error of item.errors; track $index) { <li>{{ error }}</li> }</ul><p>Nothing has been changed. Correct the file and select it again.</p></div> }
        @else {
          <div class="preview-counts"><div><strong>{{ item.newCards.length }}</strong><span>New cards</span></div><div><strong>{{ item.updatedCards.length }}</strong><span>Card updates</span></div><div><strong>{{ item.duplicateCards.length }}</strong><span>Unchanged cards</span></div><div><strong>0</strong><span>Errors</span></div></div>
          <p>{{ item.newDecks.length }} new decks · {{ item.updatedDecks.length }} deck updates · {{ item.newDesigns.length }} new designs · {{ item.updatedDesigns.length }} design updates · {{ item.bundle.assets.length }} bundled media files</p>
          @if (item.newCards.length) { <details open><summary>New card IDs</summary><p class="ids">{{ item.newCards.join(', ') }}</p></details> }
          @if (item.updatedCards.length) { <details open><summary>Updated card IDs</summary><p class="ids">{{ item.updatedCards.join(', ') }}</p></details> }
          @if (item.duplicateCards.length) { <details><summary>Unchanged duplicate IDs</summary><p class="ids">{{ item.duplicateCards.join(', ') }}</p></details> }
          <p class="help">Updates preserve scheduling and review history. Applying uses the exact data version inspected here; if anything changes, inspect the file again.</p>
          <button mat-flat-button (click)="apply()" [disabled]="busy() || !hasChanges(item)">Apply {{ item.newCards.length + item.updatedCards.length }} card changes</button>
        }
      </section>
    }
    <section class="exchange-panel anki-import" [class.contextual-update]="!!updateDeckId" aria-label="Anki package import" hrReveal>
      <p class="eyebrow">LOCAL PACKAGE CONVERSION</p><h2>{{updateDeckId?'Choose the revised package':'Import an Anki deck'}}</h2><p>{{updateDeckId?'The selected package must contain this deck’s stable Anki source identity.':'Choose an .apkg file. HoloRecall converts safe learning content locally and never imports scheduling history or earned cosmetics.'}}</p>
      <label class="file-label" for="anki-import">Anki package</label><input id="anki-import" type="file" accept=".apkg,application/zip" (change)="selectAnki($event)" [disabled]="!!busy() || !ankiAllowed" />
      @if(!ankiAllowed){<p class="failure" role="alert">{{ankiUnavailable}}</p>}
      @if(ankiRunning()){<button mat-stroked-button type="button" (click)="cancelAnki()">Cancel analysis</button>}
      @if(ankiAnalysis();as analysis){<div class="anki-summary"><div class="preview-counts"><div><strong>{{analysis.sourceNotes}}</strong><span>Source notes</span></div><div><strong>{{analysis.generatedCards}}</strong><span>Generated cards</span></div><div><strong>{{analysis.decks.length}}</strong><span>Decks</span></div><div><strong>{{analysis.assets.length}}</strong><span>Media files</span></div></div><div class="conversion-counts" aria-label="Anki conversion summary"><div><strong>{{analysis.conversion.normal}}</strong><span>Import normally</span></div><div><strong>{{analysis.conversion.simplified}}</strong><span>With simplifications</span></div><div><strong>{{analysis.conversion.excluded}}</strong><span>Require exclusion</span></div><div><strong>{{analysis.conversion.unsafe}}</strong><span>Unsafe to convert</span></div></div><p><strong>Detected:</strong> {{analysis.variant}}. Proposed authored rarity: @for(tier of rarityIds;track tier){<span class="status-chip">{{tier}} {{analysis.proposedRarities[tier]}}</span>}</p>
        <details class="mapping-panel"><summary>Custom field mapping</summary><p class="help">Map source fields to structured HoloRecall content. Template-generated cards remain separate; cloze deletions keep their individual prompts. Presets apply only to an exact versioned field/template signature.</p>
          @for(model of analysis.modelSchemas;track model.signature){<section class="mapping-model"><div><h3>{{model.name}}</h3><span class="status-chip">{{savedMapping(model)?'Saved exact match':'Review mapping'}}</span></div><p class="help">{{model.fields.length}} fields · {{model.templates.length}} templates<span class="ids"> · {{model.signature}}</span></p><mat-form-field appearance="outline"><mat-label>Preset name</mat-label><input matInput [(ngModel)]="mappingDraft(model).name"></mat-form-field><div class="mapping-grid">@for(field of model.fields;track field){<mat-form-field appearance="outline"><mat-label>{{field}}</mat-label><mat-select [(ngModel)]="mappingDraft(model).fields[field]">@for(target of mappingTargets;track target.id){<mat-option [value]="target.id">{{target.label}}</mat-option>}</mat-select></mat-form-field>}</div></section>}
          <div class="actions"><button mat-stroked-button type="button" (click)="previewMappings()" [disabled]="!!busy()">Preview mappings</button><button mat-flat-button type="button" (click)="saveMappings()" [disabled]="!!busy()">Save presets and preview</button></div>
        </details>
        @if(analysis.issues.length){<section class="issue-summary" aria-label="Conversion notes"><h3>Conversion notes</h3><p>Importable learning text is preserved. Anki-only behavior and omitted dependencies are listed by impact.</p>@for(severity of issueSeverities;track severity){@if(issuesFor(analysis,severity).length){<details class="issue-panel {{severity}}"><summary>{{issueHeading(severity)}} · {{affectedCount(analysis,severity)}} affected {{affectedCount(analysis,severity)===1?'card':'cards'}}</summary><ul>@for(issue of issuesFor(analysis,severity);track issue.kind+issue.message){<li><strong>{{issue.count}}</strong> {{issue.message}}@if(issue.occurrences!==issue.count){ <span>({{issue.occurrences}} references)</span>}<span class="ids">{{issue.examples.join(', ')}}</span></li>}</ul></details>}}@if(requiresExclusion(analysis)){<label class="exclusion-choice"><input type="checkbox" [(ngModel)]="acceptAnkiIssues"> Import usable cards and exclude only the {{analysis.conversion.excluded+analysis.conversion.unsafe}} cards that cannot be safely converted</label>}</section>}
        @if(ankiPreview();as item){
          <div class="update-summary" aria-label="Anki source comparison"><div><strong>{{item.update.newCards.length}}</strong><span>New cards</span></div><div><strong>{{item.update.changedCards.length}}</strong><span>Changed source</span></div><div><strong>{{item.update.changedMediaCards.length}}</strong><span>Changed media</span></div><div><strong>{{item.update.unchangedCards.length}}</strong><span>Unchanged</span></div><div><strong>{{item.update.conflicts.length}}</strong><span>Local conflicts</span></div><div><strong>{{item.update.removedSourceCards.length}}</strong><span>Source removed</span></div></div>
          @if(item.errors.length){<p class="failure" role="alert">{{item.errors.join(' ')}}</p>}
          @if(comparisonCards().length){<section class="comparison-preview" aria-label="Representative before and after card preview"><div class="preview-heading"><h3>Before and after</h3><span>{{comparisonCards().length}} representative {{comparisonCards().length===1?'card':'cards'}}</span></div>@for(row of comparisonCards();track row.id){<article><div><span class="eyebrow">BEFORE</span><dl><dt>Front</dt><dd>{{row.before?.front||'Unavailable'}}</dd><dt>Answer</dt><dd class="answer-value">{{row.before?.answer||'Unavailable'}}</dd><dt>Pronunciation</dt><dd>{{row.before?.pronunciation||'—'}}</dd><dt>Meaning</dt><dd>{{row.before?.meaning||'—'}}</dd><dt>Notes</dt><dd>{{row.before?.notes||'—'}}</dd></dl></div><div><span class="eyebrow">AFTER</span><dl><dt>Front</dt><dd>{{row.after.front}}</dd><dt>Answer</dt><dd class="answer-value">{{row.after.answer}}</dd><dt>Pronunciation</dt><dd>{{row.after.pronunciation||'—'}}</dd><dt>Meaning</dt><dd>{{row.after.meaning||'—'}}</dd><dt>Notes</dt><dd>{{row.after.notes||'—'}}</dd></dl></div></article>}</section>}
          @if(item.update.changedCards.length){<details><summary>Changed source fields · {{item.update.changedCards.length}}</summary>@for(id of item.update.changedCards;track id){<div class="conflict-diff"><strong>{{id}}</strong><p>{{conflictDiff(id)}}</p></div>}</details>}
          @if(item.update.changedMediaCards.length){<details><summary>Changed media · {{item.update.changedMediaCards.length}}</summary><p class="ids">{{item.update.changedMediaCards.join(', ')}}</p></details>}
          @if(item.update.newDecks.length||item.update.changedDecks.length){<details><summary>New or changed deck hierarchy · {{item.update.newDecks.length+item.update.changedDecks.length}}</summary><p>{{item.update.newDecks.length}} new · {{item.update.changedDecks.length}} changed</p><p class="ids">{{item.update.newDecks.concat(item.update.changedDecks).join(', ')}}</p></details>}
          @if(item.update.conflicts.length||item.update.deckConflicts.length){<section class="conflict-panel"><h3>Local edits need a choice</h3><p>{{conflictsResolved()?(preserveAnkiEdits?'Keep local content is selected.':'Use the revised Anki source is selected.'):'Choose how to resolve these conflicts before applying.'}} Learning history, scheduling and cosmetics remain unchanged.</p><div class="actions"><button mat-stroked-button type="button" (click)="setConflictPolicy(true)" [attr.aria-pressed]="conflictsResolved()&&preserveAnkiEdits">Keep local</button><button mat-stroked-button type="button" (click)="setConflictPolicy(false)" [attr.aria-pressed]="conflictsResolved()&&!preserveAnkiEdits">Use updated Anki source</button></div>@if(item.update.conflicts.length){<details><summary>Review {{item.update.conflicts.length}} affected {{item.update.conflicts.length===1?'card':'cards'}}</summary>@for(id of item.update.conflicts;track id){<div class="conflict-diff"><strong>{{id}}</strong><p>{{conflictDiff(id)}}</p></div>}</details>}@if(item.update.deckConflicts.length){<details><summary>Review {{item.update.deckConflicts.length}} affected {{item.update.deckConflicts.length===1?'deck':'decks'}}</summary><p class="ids">{{item.update.deckConflicts.join(', ')}}</p></details>}@if(item.update.legacyReviewRequired.length){<p class="hint">{{item.update.legacyReviewRequired.length}} legacy imported {{item.update.legacyReviewRequired.length===1?'card has':'cards have'}} no prior converter baseline. Review them before choosing the revised source to repair old formatting.</p>}</section>}
          @if(item.update.removedSourceCards.length){<details><summary>{{item.update.removedSourceCards.length}} source-removed {{item.update.removedSourceCards.length===1?'card':'cards'}} kept safely</summary><p>They remain in HoloRecall as archive candidates. This update never deletes cards or learning history.</p><p class="ids">{{item.update.removedSourceCards.join(', ')}}</p></details>}
          <p>{{item.newCards.length}} new · {{item.updatedCards.length}} updates ready · {{item.update.unchangedCards.length}} unchanged. Imported rarity is authored presentation only; it does not unlock cosmetics.</p><div class="study-choice"><mat-form-field appearance="outline"><mat-label>Study using</mat-label><mat-select [(ngModel)]="ankiStudyPresetId">@for(preset of store.data()?.studyPresets??[];track preset.id){<mat-option [value]="preset.id">{{preset.name}}</mat-option>}</mat-select></mat-form-field><p class="hint">Anki learning history isn't imported. These cards will use your HoloRecall study settings.</p></div><div class="primary-actions"><button mat-flat-button (click)="applyAnki()" [disabled]="!canApplyAnki(item,analysis)">{{updateDeckId?'Apply update':'Import'}} {{item.newCards.length + item.updatedCards.length}} supported cards</button> <button mat-button (click)="updateDeckId?cancelUpdate.emit():cancelAnki()">Cancel</button></div>}
      </div>}
      <details><summary>Supported package scope</summary><p>Legacy <code>collection.anki2</code>, legacy <code>collection.anki21</code>, and detected modern <code>collection.anki21b</code> databases are analysed in a bounded background Worker. Basic, reversed, conditional and standard cloze templates convert to inert HoloRecall text. PNG, JPEG, WebP, MP3 and WAV media are bundled. Text-to-speech directives, script-dependent templates without an explicit safe mapping, answer checking, image occlusion, active SVG, remote resources and fonts remain unsupported.</p></details>
    </section>
  `,
  styleUrl: './exchange.css',
  styles: [`
    .update-steps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.5rem;margin:0 0 1rem;padding:0;list-style:none;counter-reset:update}.update-steps li{display:flex;align-items:center;gap:.45rem;padding:.65rem .7rem;border-radius:var(--mat-sys-corner-medium);background:var(--mat-sys-surface-container);color:var(--mat-sys-on-surface-variant);font:var(--mat-sys-label-medium)}.update-steps li:before{counter-increment:update;content:counter(update);display:grid;place-items:center;width:1.5rem;height:1.5rem;border-radius:50%;background:var(--mat-sys-surface-container-high)}.update-steps li.active{background:var(--mat-sys-secondary-container);color:var(--mat-sys-on-secondary-container)}
    .contextual-update{max-width:72rem;margin-inline:auto}.comparison-preview{margin:1rem 0}.comparison-preview article{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:.75rem 0;padding:1rem;border:1px solid var(--mat-sys-outline-variant);border-radius:var(--mat-sys-corner-large)}.comparison-preview article>div{min-width:0}.comparison-preview dl{grid-template-columns:minmax(6rem,auto) minmax(0,1fr);margin:.65rem 0 0}.comparison-preview dd{white-space:pre-line}.comparison-preview .answer-value{padding:.35rem .55rem;border-radius:var(--mat-sys-corner-small);background:var(--mat-sys-primary-container);color:var(--mat-sys-on-primary-container);font:var(--mat-sys-title-medium);font-weight:650}.primary-actions{display:flex;align-items:center;gap:.75rem;margin-top:1rem}
    .mapping-model{padding:1rem 0;border-bottom:1px solid var(--mat-sys-outline-variant)}
    .mapping-model>div:first-child{display:flex;align-items:center;justify-content:space-between;gap:1rem}.mapping-model h3{margin:0;text-align:start}
    .mapping-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr));gap:.75rem}.mapping-grid mat-form-field,.mapping-model>mat-form-field{width:100%;min-width:0}
    .actions{display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1rem}
    .anki-import code{overflow-wrap:anywhere;word-break:break-word}
    .preview-counts span{overflow-wrap:anywhere}
    .conversion-counts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.75rem;margin:1rem 0}.conversion-counts>div{display:grid;gap:.15rem;padding:.8rem;border:1px solid var(--mat-sys-outline-variant);border-radius:var(--mat-sys-corner-medium);background:var(--mat-sys-surface-container-low)}.conversion-counts strong{font:var(--mat-sys-title-large)}.conversion-counts span{font:var(--mat-sys-label-small);color:var(--mat-sys-on-surface-variant)}
    .issue-summary{margin:1rem 0;padding:1rem;border:1px solid var(--mat-sys-outline-variant);border-radius:var(--mat-sys-corner-large);background:var(--mat-sys-surface-container-low)}.issue-summary>p{color:var(--mat-sys-on-surface-variant);margin:.4rem 0 1rem}.issue-panel{margin:.5rem 0;padding:.75rem;border-inline-start:4px solid var(--mat-sys-outline);background:var(--mat-sys-surface)}.issue-panel.error{border-inline-start-color:var(--mat-sys-error)}.issue-panel.warning{border-inline-start-color:var(--mat-sys-tertiary)}.issue-panel.info{border-inline-start-color:var(--mat-sys-primary)}.issue-panel summary{font-weight:600;cursor:pointer}.issue-panel li{margin:.5rem 0}.issue-panel .ids{display:block;color:var(--mat-sys-on-surface-variant);overflow-wrap:anywhere}.exclusion-choice{display:flex;align-items:flex-start;gap:.65rem;margin-top:1rem}
    .update-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.75rem;margin:1rem 0}.update-summary>div{display:grid;gap:.15rem;padding:.75rem;border:1px solid var(--mat-sys-outline-variant);border-radius:var(--mat-sys-corner-medium)}.update-summary strong{font:var(--mat-sys-title-large)}.update-summary span{font:var(--mat-sys-label-small);color:var(--mat-sys-on-surface-variant)}.conflict-panel{margin:1rem 0;padding:1rem;border-inline-start:4px solid var(--mat-sys-tertiary);background:var(--mat-sys-tertiary-container);color:var(--mat-sys-on-tertiary-container);border-radius:var(--mat-sys-corner-medium)}.conflict-panel h3{margin-top:0}.conflict-diff{padding:.6rem 0;border-bottom:1px solid color-mix(in srgb,currentColor 20%,transparent)}.conflict-diff p{white-space:pre-line;margin:.25rem 0}
    @media(max-width:760px){.exchange-heading{flex-direction:column}.mapping-grid{grid-template-columns:1fr}.mapping-model>div:first-child{align-items:flex-start;flex-direction:column}.preview-counts,.conversion-counts,.update-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.update-steps{grid-template-columns:repeat(3,minmax(0,1fr))}.comparison-preview article{grid-template-columns:1fr}.contextual-update-heading h1{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.contextual-update-heading{margin-bottom:1rem}}
    @media(max-width:460px){.update-steps{grid-template-columns:1fr 1fr}.update-steps li{padding:.5rem;font-size:.72rem}}
    @media(max-width:420px){.conversion-counts{grid-template-columns:1fr}}
  `],
})
export class ExchangeComponent implements OnDestroy, OnInit {
  @Input() updateDeckId='';
  @Input() initialAnkiFile: File | null = null;
  @Output() readonly updateComplete = new EventEmitter<string>();
  @Output() readonly cancelUpdate = new EventEmitter<void>();
  readonly issueSeverities=['error','warning','info'] as const;
  readonly rarityIds: Rarity[] = ['common','uncommon','rare','holo-rare','ultra-rare','secret-rare','relic'];
  readonly store = inject(LocalStudyStore);
  private readonly fileDelivery = inject(FILE_DELIVERY);
  private readonly ankiWorker = inject(AnkiWorkerClient);
  private readonly capabilityPolicy = inject(CAPABILITY_POLICY);
  readonly ankiAllowed = this.capabilityPolicy.decide('anki-package-import').allowed;
  readonly ankiUnavailable = this.capabilityPolicy.decide('anki-package-import').reason ?? 'Anki package import is unavailable under the active capability policy.';
  readonly preview = signal<ImportPreview | null>(null);
  readonly ankiAnalysis = signal<AnkiAnalysis | null>(null); readonly ankiPreview = signal<AnkiImportPreview | null>(null);
  preserveAnkiEdits = true; acceptAnkiIssues = false;ankiStudyPresetId=BALANCED_PRESET_ID; private ankiAbort?: AbortController; private ankiBytes?: Uint8Array; private ankiPackageName = '';
  readonly conflictsResolved=signal(true);
  readonly ankiRunning = signal(false); readonly mappingDrafts = new Map<string, AnkiMappingPreset>();
  readonly mappingTargets: { id: AnkiFieldTarget; label: string }[] = [{id:'ignore',label:'Keep as source metadata'},{id:'front',label:'Front'},{id:'answer',label:'Answer'},{id:'pronunciation',label:'Pronunciation'},{id:'meaning',label:'Meaning'},{id:'notes',label:'Notes'},{id:'front-media',label:'Front media'},{id:'back-media',label:'Answer media'}];
  readonly filename = signal(''); readonly busy = signal(''); readonly message = signal(''); readonly failure = signal('');

  ngOnInit():void{if(this.initialAnkiFile)void this.analyseAnkiFile(this.initialAnkiFile);}
  updateDeckName():string{return this.store.decks().find(deck=>deck.id===this.updateDeckId)?.name??'Imported deck';}

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
      if (!preview.errors.length) for (const asset of preview.bundle.assets.filter(asset => asset.mime.startsWith('image/'))) {
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
    await this.analyseAnkiFile(file); input.value = '';
  }
  private async analyseAnkiFile(file:File):Promise<void>{
    this.cancelAnki(); this.failure.set(''); this.message.set(''); this.ankiAbort = new AbortController(); this.busy.set('Opening the Anki archive…');
    try {
      if (file.size > 30 * 1024 * 1024) throw new Error('Choose an Anki package of at most 30 MiB compressed.');
      this.ankiBytes = new Uint8Array(await file.arrayBuffer()); this.ankiPackageName = file.name;
      await this.runAnkiAnalysis();
    } catch (error) { if ((error as Error).name !== 'AbortError') this.failure.set(this.errorMessage(error)); }
    finally { this.ankiRunning.set(false); this.busy.set(''); }
  }
  refreshAnkiPreview(): void { const analysis = this.ankiAnalysis(), state = this.store.data(); if (!analysis || !state) return; void import('../../domain/anki').then(({ previewAnkiImport }) => this.ankiPreview.set(previewAnkiImport(analysis, state, this.preserveAnkiEdits,this.updateDeckId||undefined))); }
  setConflictPolicy(preserve:boolean):void{this.preserveAnkiEdits=preserve;this.conflictsResolved.set(true);this.refreshAnkiPreview();}
  comparisonCards(){const analysis=this.ankiAnalysis();if(!analysis)return[];const changed=new Set(this.ankiPreview()?.update.changedCards??[]);return analysis.cards.filter(card=>changed.has(card.id)).slice(0,3).map(after=>({id:after.id,before:this.store.cards().find(card=>card.id===after.id),after}));}
  conflictDiff(id:string):string{const existing=this.store.cards().find(card=>card.id===id),incoming=this.ankiAnalysis()?.cards.find(card=>card.id===id);if(!existing||!incoming)return'Content comparison unavailable.';const changed=(['front','answer','pronunciation','meaning','notes','tags','image','backImage','frontAudio','backAudio'] as const).filter(key=>JSON.stringify(existing[key])!==JSON.stringify(incoming[key]));return changed.length?`Changed: ${changed.join(', ')}.`:'Source identity requires review before reconversion.';}
  cancelAnki(): void { this.ankiAbort?.abort(); this.ankiWorker.cancel(); this.ankiAbort = undefined; this.ankiRunning.set(false); this.ankiAnalysis.set(null); this.ankiPreview.set(null); this.ankiBytes=undefined; this.ankiPackageName=''; this.busy.set(''); }
  issuesFor(analysis:AnkiAnalysis,severity:'error'|'warning'|'info'){return analysis.issues.filter(issue=>issue.severity===severity);}
  affectedCount(analysis:AnkiAnalysis,severity:'error'|'warning'|'info'):number{return new Set(this.issuesFor(analysis,severity).flatMap(issue=>issue.cardIds)).size;}
  issueHeading(severity:'error'|'warning'|'info'):string{return severity==='error'?'Cannot convert safely':severity==='warning'?'Content or media omitted':'Anki presentation simplified';}
  requiresExclusion(analysis:AnkiAnalysis):boolean{return analysis.conversion.excluded+analysis.conversion.unsafe>0;}
  canApplyAnki(preview:AnkiImportPreview,analysis:AnkiAnalysis):boolean{return !this.busy()&&!preview.errors.length&&(!this.requiresExclusion(analysis)||this.acceptAnkiIssues)&&this.conflictsResolved();}
  async applyAnki(): Promise<void> { const preview = this.ankiPreview(), analysis = this.ankiAnalysis(); if (!preview || !analysis || !this.canApplyAnki(preview,analysis)) return; this.busy.set('Saving the supported Anki content atomically…'); try { await this.store.applyContentImport(preview.bundle, preview.expectedVersion,this.ankiStudyPresetId,true); const result=`${this.updateDeckId?'Updated':'Imported'} ${preview.newCards.length} new and ${preview.updatedCards.length} changed Anki cards. Scheduling, review history and cosmetic unlocks were preserved.`;this.message.set(result); const completedDeck=this.updateDeckId;this.cancelAnki();if(completedDeck)this.updateComplete.emit(completedDeck); } catch (error) { this.failure.set(this.errorMessage(error)); } finally { this.busy.set(''); } }

  async export(portable: boolean): Promise<void> {
    this.message.set(''); this.failure.set(''); this.busy.set(portable ? 'Packaging workbook, media and designs…' : 'Building content workbook…');
    try {
      const state = this.store.data(); if (!state) throw new Error('Local data is still loading.');
      const { contentFromState, writeWorkbook, makePortableBundle, writePortableZip } = await import('../../domain/exchange');
      let bundle = contentFromState(state);
      if (portable) bundle = await makePortableBundle(bundle, rasterizeBundled);
      const bytes = portable ? await writePortableZip(bundle) : await writeWorkbook(bundle);
      const blob = new Blob([bytes.slice().buffer], { type: portable ? 'application/zip' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      await this.fileDelivery.deliver(blob, `holorecall-content-v5.${portable ? 'zip' : 'xlsx'}`);
      this.message.set(portable ? 'Portable ZIP download requested with media and design definitions. No learning history is included.' : 'Workbook download requested. Uploaded media references require the portable ZIP when shared with another browser.');
    } catch (error) { this.failure.set(this.errorMessage(error)); }
    finally { this.busy.set(''); }
  }
  private errorMessage(error: unknown): string { return error instanceof Error ? error.message : 'The operation could not be completed. No existing data was removed.'; }
  private async runAnkiAnalysis(mappings = this.store.data()?.ankiMappings ?? []): Promise<AnkiAnalysis> {
    const state = this.store.data(), bytes = this.ankiBytes; if (!state || !bytes) throw new Error('Select the Anki package again.');
    this.ankiAbort?.abort(); this.ankiAbort = new AbortController(); this.ankiRunning.set(true); this.busy.set('Opening archive…');
    const analysis = await this.ankiWorker.analyse(bytes, this.ankiPackageName, mappings, progress => this.busy.set(this.progressLabel(progress)), this.ankiAbort.signal);
    this.ankiAnalysis.set(analysis); this.mappingDrafts.clear(); for (const model of analysis.modelSchemas) this.mappingDrafts.set(model.signature, structuredClone(this.savedMapping(model) ?? this.suggestMapping(model)));
    const { previewAnkiImport } = await import('../../domain/anki'); const preview=previewAnkiImport(analysis, this.store.data()!, this.preserveAnkiEdits,this.updateDeckId||undefined);this.ankiPreview.set(preview);this.conflictsResolved.set(!(preview.update.conflicts.length||preview.update.deckConflicts.length)); this.acceptAnkiIssues = false; this.ankiRunning.set(false);return analysis;
  }
  mappingDraft(model: AnkiModelSchema): AnkiMappingPreset { return this.mappingDrafts.get(model.signature) ?? this.suggestMapping(model); }
  savedMapping(model: AnkiModelSchema): AnkiMappingPreset | undefined { return this.store.data()?.ankiMappings.find(item => item.sourceSignature === model.signature); }
  private suggestMapping(model: AnkiModelSchema): AnkiMappingPreset { return suggestedAnkiMapping(model); }
  async previewMappings():Promise<void>{this.failure.set('');try{await this.runAnkiAnalysis([...this.mappingDrafts.values()]);}catch(error){if((error as Error).name!=='AbortError')this.failure.set(this.errorMessage(error));}finally{this.ankiRunning.set(false);this.busy.set('');}}
  async saveMappings():Promise<void>{this.failure.set('');try{const mappings=[...this.mappingDrafts.values()],analysis=await this.runAnkiAnalysis(mappings);if(analysis.issues.some(issue=>issue.severity==='error'&&issue.message==='Field mapping requires review before conversion'))throw new Error('Review the source mapping. It does not produce a trustworthy prompt and answer yet.');await this.store.saveAnkiMappings(mappings);await this.runAnkiAnalysis(mappings);this.message.set('Mapping presets saved for these exact source schemas.');}catch(error){if((error as Error).name!=='AbortError')this.failure.set(this.errorMessage(error));}finally{this.ankiRunning.set(false);this.busy.set('');}}
  private progressLabel(progress:AnkiProgress):string{return progress.total===undefined?`${progress.label}…`:`${progress.label} · ${progress.completed??0} of ${progress.total}`;}
  ngOnDestroy():void{this.ankiAbort?.abort();this.ankiWorker.cancel();}
}

export async function rasterizeBundled(ref: string): Promise<{ dataUrl: string; width: number; height: number }> {
  const image = new Image(); image.src = ref;
  await image.decode(); const width = 900; const height = Math.round(width * image.naturalHeight / image.naturalWidth);
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d'); if (!context) throw new Error('This browser cannot convert bundled artwork to PNG.');
  context.drawImage(image, 0, 0, width, height); return { dataUrl: canvas.toDataURL('image/png'), width, height };
}
