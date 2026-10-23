import { Component, EventEmitter, inject, Input, OnChanges, OnDestroy, OnInit, Output, signal, SimpleChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { LocalStudyStore } from '../data/study-store';
import { decodeRaster } from '../upload';
import { FILE_DELIVERY } from '../platform/file-delivery';
import type { ImportPreview } from '../../domain/exchange';
import type { AnkiApkgPlan } from '../../domain/anki-apkg';
import type { AnkiAnalysis, AnkiImportPreview, AnkiProgress } from '../../domain/anki';
import { ANKI_MAPPING_POLICY_VERSION, ANKI_MAPPING_VERSION, eligibleAnkiMappings } from '../../domain/anki';
import type { AnkiConversionProfile, AnkiMappingPreset, CardContent, Rarity } from '../../domain/models';
import { PageRevealDirective } from '../motion/page-reveal';
import { AnkiWorkerClient } from './anki-worker-client';
import { CAPABILITY_POLICY } from '../platform/capability-policy';
import { BALANCED_PRESET_ID } from '../../domain/study-settings';
import { approveConversionProfile } from '../../domain/anki-conversion-profile';
import { cardCapabilities } from '../../domain/card-capabilities';
import { automaticMappingProfile, previewAnkiExport, SEMANTIC_ROLES, writeAnkiTextExport, type AnkiExportPreview, type AnkiExportProfile, type MappingProfileInput } from '../../domain/anki-interop';
import { SubviewNavigationComponent, type SubviewNavigationItem } from '../navigation/subview-navigation';

export interface ExchangeCompletionAction { action:'review'|'deck'|'search'|'study';deckId:string;deckIds:string[];label:string }
type ExchangeView='import'|'export'|'templates';

@Component({
  selector: 'hr-exchange', standalone: true,
  imports: [FormsModule, MatButtonModule, MatProgressSpinnerModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatCheckboxModule, SubviewNavigationComponent, PageRevealDirective],
  templateUrl: './exchange.html',
  styleUrl: './exchange.css',
  styles: [`
    .contextual-update{max-width:72rem;margin-inline:auto}.comparison-preview{margin:1rem 0}.comparison-preview article{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:.75rem 0;padding:1rem;border:1px solid var(--mat-sys-outline-variant);border-radius:var(--mat-sys-corner-large)}.comparison-preview article>div{min-width:0}.comparison-preview dl{grid-template-columns:minmax(6rem,auto) minmax(0,1fr);margin:.65rem 0 0}.comparison-preview dd{white-space:pre-line}.comparison-preview .answer-value{padding:.35rem .55rem;border-radius:var(--mat-sys-corner-small);background:var(--mat-sys-primary-container);color:var(--mat-sys-on-primary-container);font:var(--mat-sys-title-medium);font-weight:650}.primary-actions{display:flex;align-items:center;gap:.75rem;margin-top:1rem}
    .mapping-model{padding:1rem 0;border-bottom:1px solid var(--mat-sys-outline-variant)}
    .mapping-model>div:first-child{display:flex;align-items:center;justify-content:space-between;gap:1rem}.mapping-model h3{margin:0;text-align:start}
    .mapping-table{display:grid;border-block-start:1px solid var(--mat-sys-outline-variant)}.mapping-row{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(11rem,1fr);gap:1rem;align-items:center;padding:.55rem 0;border-block-end:1px solid var(--mat-sys-outline-variant)}.mapping-row.heading{font:var(--mat-sys-label-medium);color:var(--mat-sys-on-surface-variant)}.mapping-row>div{display:grid;gap:.15rem;min-width:0}.mapping-row span{color:var(--mat-sys-on-surface-variant);overflow-wrap:anywhere}.mapping-row mat-form-field{width:100%}
    .mapping-row small{color:var(--mat-sys-on-surface-variant);font:var(--mat-sys-body-small)}.import-review{margin:var(--space-5) 0;padding:var(--space-4);border:1px solid var(--mat-sys-outline-variant);border-radius:var(--mat-sys-corner-large);background:var(--mat-sys-surface-container-low)}.import-review>p{color:var(--mat-sys-on-surface-variant)}.import-review article,.export-preview{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-3);margin-top:var(--space-3)}.import-review article>div,.export-preview>div{display:grid;align-content:start;gap:var(--space-1);min-width:0;padding:var(--space-3);border-radius:var(--mat-sys-corner-medium);background:var(--mat-sys-surface-container)}.import-review span,.export-preview p{overflow-wrap:anywhere;white-space:pre-line}.anki-export{margin-top:var(--space-4)}.anki-export>summary{min-height:44px;display:flex;align-items:center;font:var(--mat-sys-title-small)}.anki-export mat-form-field{display:block;max-width:20rem}.export-preview .notice,.export-preview button{grid-column:1/-1;justify-self:start}
    .actions{display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1rem}.source-manager{max-width:54rem;margin-inline:auto}.source-manager-status{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;margin-bottom:1rem;color:var(--mat-sys-on-surface-variant)}.source-manager-actions{display:grid;gap:.75rem}.source-manager-actions article{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem;border:1px solid var(--mat-sys-outline-variant);border-radius:var(--mat-sys-corner-large)}.source-manager-actions h2{margin:0 0 .25rem;font:var(--mat-sys-title-medium)}.source-manager-actions p{margin:0;color:var(--mat-sys-on-surface-variant)}.danger-zone{border-color:var(--mat-sys-error)}
    .anki-import code{overflow-wrap:anywhere;word-break:break-word}
    .preview-counts span{overflow-wrap:anywhere}
    .conversion-counts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.75rem;margin:1rem 0}.conversion-counts>div{display:grid;gap:.15rem;padding:.8rem;border:1px solid var(--mat-sys-outline-variant);border-radius:var(--mat-sys-corner-medium);background:var(--mat-sys-surface-container-low)}.conversion-counts strong{font:var(--mat-sys-title-large)}.conversion-counts span{font:var(--mat-sys-label-small);color:var(--mat-sys-on-surface-variant)}
    .compatibility-verdict{display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);margin-block:var(--space-4);padding:var(--space-4);border:1px solid var(--mat-sys-primary);border-radius:var(--mat-sys-corner-large);background:var(--mat-sys-primary-container);color:var(--mat-sys-on-primary-container)}.compatibility-verdict h3,.compatibility-verdict p{margin:.2rem 0}.compatibility-verdict>div:last-child{display:grid;justify-items:end;gap:var(--space-2);text-align:end}.compatibility-verdict.attention{border-color:var(--mat-sys-tertiary);background:var(--mat-sys-tertiary-container);color:var(--mat-sys-on-tertiary-container)}.rarity-chips{display:flex;align-items:center;flex-wrap:wrap;gap:var(--space-2);margin-block:var(--space-4)}.rarity-chips>strong{margin-inline-end:var(--space-1)}.attention-summary{display:flex;align-items:center;gap:var(--space-4);margin-block:var(--space-4);padding:var(--space-4);border-inline-start:4px solid var(--mat-sys-tertiary);border-radius:var(--mat-sys-corner-medium);background:var(--mat-sys-tertiary-container);color:var(--mat-sys-on-tertiary-container)}.attention-summary p{flex:1;margin:0}
    .issue-summary{margin:1rem 0;padding:1rem;border:1px solid var(--mat-sys-outline-variant);border-radius:var(--mat-sys-corner-large);background:var(--mat-sys-surface-container-low)}.issue-summary>p{color:var(--mat-sys-on-surface-variant);margin:.4rem 0 1rem}.issue-panel{margin:.5rem 0;padding:.75rem;border-inline-start:4px solid var(--mat-sys-outline);background:var(--mat-sys-surface)}.issue-panel.error{border-inline-start-color:var(--mat-sys-error)}.issue-panel.warning{border-inline-start-color:var(--mat-sys-tertiary)}.issue-panel.info{border-inline-start-color:var(--mat-sys-primary)}.issue-panel summary{font-weight:600;cursor:pointer}.issue-panel li{margin:.5rem 0}.issue-panel .ids{display:block;color:var(--mat-sys-on-surface-variant);overflow-wrap:anywhere}.exclusion-choice{display:flex;align-items:flex-start;gap:.65rem;margin-top:1rem}
    .update-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.75rem;margin:1rem 0}.update-summary>div{display:grid;gap:.15rem;padding:.75rem;border:1px solid var(--mat-sys-outline-variant);border-radius:var(--mat-sys-corner-medium)}.update-summary strong{font:var(--mat-sys-title-large)}.update-summary span{font:var(--mat-sys-label-small);color:var(--mat-sys-on-surface-variant)}.conflict-panel{margin:1rem 0;padding:1rem;border-inline-start:4px solid var(--mat-sys-tertiary);background:var(--mat-sys-tertiary-container);color:var(--mat-sys-on-tertiary-container);border-radius:var(--mat-sys-corner-medium)}.conflict-panel h3{margin-top:0}.conflict-diff{padding:.6rem 0;border-bottom:1px solid color-mix(in srgb,currentColor 20%,transparent)}.conflict-diff p{white-space:pre-line;margin:.25rem 0}
    .completion-panel{display:flex;align-items:center;justify-content:space-between;gap:var(--space-5);margin:var(--space-4) 0;padding:var(--space-5);border:1px solid var(--mat-sys-primary);border-radius:var(--mat-sys-corner-extra-large);background:var(--mat-sys-primary-container);color:var(--mat-sys-on-primary-container)}.completion-panel h2{margin:var(--space-1) 0}.completion-panel p{margin:0}.completion-actions{display:flex;align-items:center;justify-content:flex-end;gap:var(--space-2);flex-wrap:wrap}
    @media(max-width:760px){.exchange-heading,.completion-panel,.compatibility-verdict,.attention-summary{align-items:stretch;flex-direction:column}.compatibility-verdict>div:last-child{justify-items:start;text-align:start}.completion-actions{justify-content:flex-start}.mapping-row,.import-review article,.export-preview{grid-template-columns:1fr}.mapping-model>div:first-child{align-items:flex-start;flex-direction:column}.preview-counts,.conversion-counts,.update-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.comparison-preview article{grid-template-columns:1fr}.contextual-update-heading h1{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.contextual-update-heading{margin-bottom:1rem}.source-manager-actions article{align-items:stretch;flex-direction:column}.source-manager-actions button{align-self:flex-start}}
    @media(max-width:420px){.conversion-counts{grid-template-columns:1fr}}
  `],
})
export class ExchangeComponent implements OnChanges, OnDestroy, OnInit {
  @Input() updateDeckId='';
  @Input() sourceMode:'manage'|'update'|'repair'|'mapping'='update';
  @Input() initialAnkiFile: File | null = null;
  @Output() readonly updateComplete = new EventEmitter<string>();
  @Output() readonly completionAction = new EventEmitter<ExchangeCompletionAction>();
  @Output() readonly cancelUpdate = new EventEmitter<void>();
  @Output() readonly sourceAction = new EventEmitter<'update'|'repair'|'mapping'>();
  @Output() readonly detachSource = new EventEmitter<void>();
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
  readonly showAdvancedMapping=signal(false);
  readonly usingStoredSource=signal(false);
  readonly ankiRunning = signal(false); readonly mappingDrafts = new Map<string, AnkiMappingPreset>();
  private activeMappings:AnkiMappingPreset[]=[];
  readonly mappingGroups=['Recall','Answer','Support','Other'].map(name=>({name,roles:SEMANTIC_ROLES.filter(role=>role.group===name)}));
  ankiExportProfile:AnkiExportProfile='extended-v1';ankiExportDeckId='';ankiExportIncludeMedia=true;acceptOcclusionFallback=false;readonly ankiExportPreview=signal<AnkiExportPreview|null>(null);readonly ankiApkgPlan=signal<AnkiApkgPlan|null>(null);
  readonly filename = signal(''); readonly busy = signal(''); readonly message = signal(''); readonly failure = signal('');
  readonly completion=signal<{deckId:string;deckIds:string[];label:string;kind:'IMPORT'|'UPDATE'|'REPAIR'}|null>(null);
  readonly exchangeViews:readonly SubviewNavigationItem<ExchangeView>[]=[{id:'import',label:'Import',panelId:'exchange-import-panel'},{id:'export',label:'Export',panelId:'exchange-export-panel'},{id:'templates',label:'Templates',panelId:'exchange-templates-panel'}];
  readonly exchangeView=signal<ExchangeView>('import');
  readonly ankiJourneyOpen=signal(false);readonly ankiExportOpen=signal(false);
  exportDeckId='';
  readonly showAdvancedDetails=signal(false);readonly showAdvancedIssueIds=signal(false);
  private readonly exchangePopState=()=>this.syncExchangeView();

  ngOnInit():void{if(!this.updateDeckId){this.syncExchangeView();window.addEventListener('popstate',this.exchangePopState);}if(this.sourceMode==='mapping')this.showAdvancedDetails.set(true);if(this.initialAnkiFile)void this.analyseAnkiFile(this.initialAnkiFile);else if(this.updateDeckId&&this.sourceMode!=='update'&&this.sourceMode!=='manage')void this.loadStoredSource();}
  ngOnChanges(changes:SimpleChanges):void{if(!changes['initialAnkiFile']?.firstChange&&this.initialAnkiFile)void this.analyseAnkiFile(this.initialAnkiFile);}
  selectExchangeView(view:ExchangeView):void{this.exchangeView.set(view);this.ankiJourneyOpen.set(false);history.pushState(null,'',`#exchange/${view}`);}
  startAnkiJourney():void{this.exchangeView.set('import');this.ankiJourneyOpen.set(true);history.pushState(null,'','#exchange/import/anki');}
  private syncExchangeView():void{const match=location.hash.match(/^#exchange\/(import|export|templates)(?:\/([^/]+))?/);const view=(match?.[1] as ExchangeView|undefined)??'import';this.exchangeView.set(view);this.ankiJourneyOpen.set(view==='import'&&match?.[2]==='anki');}
  beginSourceAction(action:'update'|'repair'|'mapping'):void{this.sourceMode=action;this.showAdvancedMapping.set(false);this.showAdvancedDetails.set(action==='mapping');this.sourceAction.emit(action);if(action!=='update')void this.loadStoredSource();}
  hasStoredSource():boolean{return !!this.storedSource();}
  sourcePath():string{return this.store.data()?.decks.find(deck=>deck.id===this.updateDeckId)?.ankiSource?.sourcePath??'Anki package';}
  updateDeckName():string{return this.store.decks().find(deck=>deck.id===this.updateDeckId)?.name??'Imported deck';}
  ankiPackageLabel():string{return(this.ankiPackageName||this.updateDeckName()||'Anki deck').replace(/\.apkg$/i,'').replaceAll('_',' ');}
  conversionTemplate(analysis:AnkiAnalysis):string{const schemas=analysis.modelSchemas,names=schemas.map(item=>item.name).join(' '),fields=new Set(schemas.flatMap(item=>item.fields.map(field=>field.toLocaleLowerCase())));if(/image[ _-]?occlusion/i.test(names))return'Image Occlusion · Native support';if(schemas.some(item=>item.cloze))return'Cloze';if(/revers/i.test(names)||schemas.some(item=>item.templates.length>1))return'Basic + Reversed';if(['pronunciation','meaning','translation','language','italian'].some(field=>fields.has(field)))return'Language learning · Rich answer content';if(schemas.some(item=>item.answerFields.length>2))return'Rich HTML / Reference';if(schemas.every(item=>item.fields.length<=2))return'Basic Front / Back';return'Custom · Automatic semantic conversion';}
  private profileReviewCardIds(analysis:AnkiAnalysis):Set<string>{const keys=new Set(analysis.conversionProfiles.filter(profile=>profile.status==='review-required').map(profile=>`${profile.sourceSignature}::${profile.templateId}`));return new Set(analysis.cards.filter(card=>keys.has(`${card.ankiSource?.modelSignature}::${card.ankiSource?.sourceTemplateId}`)).map(card=>card.id));}
  readyCount(analysis:AnkiAnalysis):number{return Math.max(0,analysis.compatibility.tierA+analysis.compatibility.tierB-this.profileReviewCardIds(analysis).size);}
  reviewCount(analysis:AnkiAnalysis):number{return analysis.compatibility.tierC+this.profileReviewCardIds(analysis).size;}
  cannotCount(analysis:AnkiAnalysis):number{return analysis.compatibility.tierD;}
  omittedCount(analysis:AnkiAnalysis):number{return this.reviewCount(analysis)+this.cannotCount(analysis);}
  cardWord(count:number):string{return count===1?'card':'cards';}
  analysisStatus(analysis:AnkiAnalysis):string{return this.omittedCount(analysis)===0?'Ready':this.reviewCount(analysis)>0?'Review required':'Partial import available';}
  omissionExplanation(analysis:AnkiAnalysis):string{const parts=[] as string[];if(this.reviewCount(analysis))parts.push(`${this.reviewCount(analysis)} ${this.cardWord(this.reviewCount(analysis))} needing review`);if(this.cannotCount(analysis))parts.push(`${this.cannotCount(analysis)} ${this.cardWord(this.cannotCount(analysis))} that cannot be imported`);return `${parts.join(' and ')} will be omitted.`;}
  issueActionTitle(message:string):string{if(/no answer/i.test(message))return'No safe answer';if(/no source image/i.test(message))return'Source image missing';if(/Advanced Image Occlusion/i.test(message))return'Image Occlusion format needs review';return'Conversion review';}
  issueActionExplanation(message:string):string{if(/no answer/i.test(message))return'No safe answer could be determined from the source card template.';if(/no source image/i.test(message))return'The native mask data is valid, but this source note does not contain the image it masks.';if(/Advanced Image Occlusion/i.test(message))return'This card uses an occlusion representation HoloRecall cannot yet classify as native.';return message;}

  exportDecks(){return this.store.decks().filter(deck=>!deck.archived).sort((a,b)=>a.name.localeCompare(b.name));}
  hasChanges(preview: ImportPreview): boolean { if(preview.warnings.includes('This package is already present; importing it again would make no content changes.'))return false;const state=this.store.data(),changed=(incoming:{id:string}[],existing:{id:string}[]|undefined)=>incoming.some(item=>!existing?.some(current=>current.id===item.id&&JSON.stringify(current)===JSON.stringify(item))),assetChanges=preview.bundle.assets.some(asset=>{const current=state?.assets.find(item=>item.id===asset.id);return!current||current.dataUrl!==asset.dataUrl||current.mime!==asset.mime||current.width!==asset.width||current.height!==asset.height;});return !!(preview.newCards.length + preview.updatedCards.length + preview.newDecks.length + preview.updatedDecks.length + preview.newDesigns.length + preview.updatedDesigns.length+Number(assetChanges)+Number(changed(preview.bundle.ankiSources??[],state?.ankiSources))+Number(changed(preview.bundle.ankiMappings??[],state?.ankiMappings))+Number(changed(preview.bundle.ankiConversionProfiles??[],state?.ankiConversionProfiles))); }
  exportCard():CardContent|undefined{return this.store.cards()[0]}
  refreshAnkiExportPreview():void{const card=this.exportCard();this.ankiExportPreview.set(card?previewAnkiExport(card,this.ankiExportProfile):null);}
  async exportAnkiText():Promise<void>{const state=this.store.data();if(!state)return;this.busy.set('Building Anki-compatible text import…');try{const planned=this.ankiApkgPlan()?.cards.map(item=>item.card),bytes=writeAnkiTextExport(planned??state.cards.filter(card=>!card.archived),state.decks,this.ankiExportProfile),blob=new Blob([bytes.slice().buffer],{type:'text/tab-separated-values;charset=utf-8'});await this.fileDelivery.deliver(blob,`holorecall-${this.ankiExportProfile}.txt`);this.message.set('Anki-compatible text import requested. This editing/intermediate format is separate from the packaged Anki deck.');}catch(error){this.failure.set(this.errorMessage(error));}finally{this.busy.set('');}}
  openAnkiExport():void{this.ankiExportOpen.set(!this.ankiExportOpen());if(this.ankiExportOpen()&&!this.ankiExportDeckId)this.ankiExportDeckId=this.exportDecks().find(deck=>!deck.parentId)?.id??this.exportDecks()[0]?.id??'';}
  async refreshAnkiPackagePreview():Promise<void>{const state=this.store.data();if(!state)return;this.failure.set('');this.message.set('');this.ankiApkgPlan.set(null);this.acceptOcclusionFallback=false;this.busy.set('Preparing Anki package preview…');try{const[{contentFromState,makePortableBundle},{planAnkiApkg}]=await Promise.all([import('../../domain/exchange'),import('../../domain/anki-apkg')]);let bundle=contentFromState(state,this.ankiExportDeckId?[this.ankiExportDeckId]:undefined);if(this.ankiExportIncludeMedia)bundle=await makePortableBundle(bundle,rasterizeBundled);const plan=await planAnkiApkg(bundle.cards,bundle.decks,bundle.assets,this.ankiExportDeckId,this.ankiExportProfile,this.ankiExportIncludeMedia);this.ankiApkgPlan.set(plan);this.ankiExportPreview.set(plan.cards[0]?.preview??null);}catch(error){this.failure.set(this.errorMessage(error));}finally{this.busy.set('');}}
  canExportAnkiPackage():boolean{const plan=this.ankiApkgPlan();return !!plan&&(!plan.imageOcclusionFallbackIds.length||this.acceptOcclusionFallback)&&!this.busy();}
  async exportAnkiPackage():Promise<void>{const plan=this.ankiApkgPlan();if(!plan||!this.canExportAnkiPackage())return;this.failure.set('');this.message.set('');this.busy.set('Building the Anki deck package…');try{const{writeAnkiApkg}=await import('../../domain/anki-apkg'),bytes=await writeAnkiApkg(plan),blob=new Blob([bytes.slice().buffer],{type:'application/zip'}),name=plan.rootName.normalize('NFKD').replace(/[^A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase()||'deck';await this.fileDelivery.deliver(blob,`holorecall-${name}-${new Date().toISOString().slice(0,10)}.apkg`);this.message.set(`Anki deck requested with ${plan.cards.length} clean, unscheduled cards in the ${plan.profile==='basic'?'Basic':'Extended'} profile.`);}catch(error){this.failure.set(this.errorMessage(error));}finally{this.busy.set('');}}

  async selectFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
    this.message.set(''); this.failure.set(''); this.completion.set(null);this.preview.set(null); this.filename.set(file.name); this.busy.set('Validating content and media…');
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
    try { const deckIds=this.completionDecks(preview.bundle.decks,preview.newDecks.concat(preview.updatedDecks));await this.store.applyContentImport(preview.bundle, preview.expectedVersion,BALANCED_PRESET_ID,false,[],[],true); this.message.set(`Imported ${preview.newCards.length} new cards and updated ${preview.updatedCards.length} cards. Learning progress was not included in the package; existing local reviews and earned cosmetics are preserved.`); this.preview.set(null);if(deckIds.length)this.setCompletion(deckIds,'IMPORT'); }
    catch (error) { this.failure.set(this.errorMessage(error)); }
    finally { this.busy.set(''); }
  }

  async selectAnki(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement, file = input.files?.[0]; if (!file) return;
    await this.analyseAnkiFile(file); input.value = '';
  }
  private async analyseAnkiFile(file:File):Promise<void>{
    this.cancelAnki(); this.usingStoredSource.set(false);this.failure.set(''); this.message.set('');this.completion.set(null); this.ankiAbort = new AbortController(); this.busy.set('Opening the Anki archive…');
    try {
      if (file.size > 30 * 1024 * 1024) throw new Error('Choose an Anki package of at most 30 MiB compressed.');
      this.ankiBytes = new Uint8Array(await file.arrayBuffer()); this.ankiPackageName = file.name;
      await this.runAnkiAnalysis();
    } catch (error) { if ((error as Error).name !== 'AbortError') this.failure.set(this.errorMessage(error)); }
    finally { this.ankiRunning.set(false); this.busy.set(''); }
  }
  private storedSource(){const data=this.store.data();if(!data)return undefined;const branch=new Set([this.updateDeckId]);let changed=true;while(changed){changed=false;for(const deck of data.decks)if(deck.parentId&&branch.has(deck.parentId)&&!branch.has(deck.id)){branch.add(deck.id);changed=true;}}const id=data.cards.find(card=>branch.has(card.deckId)&&card.ankiSource?.sourceSnapshotId)?.ankiSource?.sourceSnapshotId;return data.ankiSources.find(source=>source.id===id);}
  private async loadStoredSource():Promise<void>{const source=this.storedSource();if(!source)return;this.failure.set('');this.message.set('');this.busy.set('Rendering the retained Anki source…');try{const {analyseAnkiSourceSnapshot}=await import('../../domain/anki'),analysis=analyseAnkiSourceSnapshot(source,this.eligibleStoredMappings(),this.store.data()?.ankiConversionProfiles??[]);this.usingStoredSource.set(true);await this.acceptAnalysis(analysis);}catch(error){this.failure.set(this.errorMessage(error));}finally{this.busy.set('');}}
  async refreshAnkiPreview(): Promise<void> { const analysis = this.ankiAnalysis(), state = this.store.data(); if (!analysis || !state) return;const {previewAnkiImport}=await import('../../domain/anki');this.ankiPreview.set(previewAnkiImport(analysis,state,this.preserveAnkiEdits,this.updateDeckId||undefined,this.sourceMode==='update'?'update':this.sourceMode==='repair'||this.sourceMode==='mapping'?'repair':'import')); }
  async setConflictPolicy(preserve:boolean):Promise<void>{this.busy.set('Updating preview…');this.conflictsResolved.set(false);this.preserveAnkiEdits=preserve;try{await this.refreshAnkiPreview();this.conflictsResolved.set(true);}finally{this.busy.set('');}}
  comparisonCards(){const preview=this.ankiPreview();if(!preview)return[];return preview.transaction.cards.filter(row=>preview.update.changedCards.includes(row.cardId)).slice(0,3).map(row=>({id:row.cardId,before:row.current,after:row.conflictFields.length&&!this.conflictsResolved()?row.proposed:row.selected,proposed:row.conflictFields.length&&!this.conflictsResolved()}));}
  detailSummary(card?:CardContent):string{return card?.details?.map(detail=>`${detail.label}\n${detail.content}`).join('\n\n')??'';}
  transactionLabel(id:string):string{return this.ankiPreview()?.transaction.cards.find(row=>row.cardId===id)?.label??id;}
  conflictDiff(id:string):string{const row=this.ankiPreview()?.transaction.cards.find(item=>item.cardId===id);if(!row?.current)return'New source card.';const changed=(['front','answer','pronunciation','meaning','notes','tags','image','backImage','frontAudio','backAudio','details'] as const).filter(key=>JSON.stringify(row.current?.[key])!==JSON.stringify(row.proposed[key]));return changed.length?`Changed: ${changed.join(', ')}.`:'Source identity requires review before reconversion.';}
  cancelAnki(): void { this.ankiAbort?.abort(); this.ankiWorker.cancel(); this.ankiAbort = undefined; this.ankiRunning.set(false); this.ankiAnalysis.set(null); this.ankiPreview.set(null); this.showAdvancedMapping.set(false);this.showAdvancedDetails.set(false);this.showAdvancedIssueIds.set(false); this.usingStoredSource.set(false);this.ankiBytes=undefined; this.ankiPackageName=''; this.acceptAnkiIssues=false;this.busy.set(''); }
  issuesFor(analysis:AnkiAnalysis,severity:'error'|'warning'|'info'){return analysis.issues.filter(issue=>issue.severity===severity);}
  affectedCount(analysis:AnkiAnalysis,severity:'error'|'warning'|'info'):number{return new Set(this.issuesFor(analysis,severity).flatMap(issue=>issue.cardIds)).size;}
  issueHeading(severity:'error'|'warning'|'info'):string{return severity==='error'?'Cannot convert safely':severity==='warning'?'Content or media omitted':'Anki presentation simplified';}
  requiresExclusion(analysis:AnkiAnalysis):boolean{return analysis.conversion.excluded+analysis.conversion.unsafe>0;}
  canApplyAnki(preview:AnkiImportPreview,analysis:AnkiAnalysis):boolean{return !analysis.conversionProfiles.some(profile=>profile.status==='review-required')&&!this.busy()&&!preview.errors.length&&this.readyCount(analysis)>0&&(!this.omittedCount(analysis)||this.acceptAnkiIssues)&&this.conflictsResolved();}
  async applyAnki(): Promise<void> { const preview = this.ankiPreview(), analysis = this.ankiAnalysis(); if (!preview || !analysis || !this.canApplyAnki(preview,analysis)) return; this.busy.set('Saving the supported Anki content atomically…'); try { const mode=this.sourceMode,omitted=this.omittedCount(analysis),completedDecks=this.updateDeckId?[this.updateDeckId]:this.completionDecks(preview.bundle.decks,preview.update.newDecks),packageLabel=this.ankiPackageName.replace(/\.apkg$/i,'').replaceAll('_',' ');await this.store.applyContentImport(preview.bundle, preview.expectedVersion,this.ankiStudyPresetId,true,this.activeMappings,analysis.conversionProfiles); const verb=mode==='repair'||mode==='mapping'?'Repaired':this.updateDeckId?'Updated':'Imported',result=`${verb} ${preview.newCards.length} new and ${preview.updatedCards.length} changed Anki cards.${omitted?` ${omitted} source ${this.cardWord(omitted)} were explicitly omitted and remain in the compatibility report.`:''} Scheduling, review history and cosmetic unlocks were preserved.`;this.message.set(result);this.cancelAnki();if(completedDecks.length)this.setCompletion(completedDecks,mode==='repair'||mode==='mapping'?'REPAIR':this.updateDeckId?'UPDATE':'IMPORT',completedDecks.length>1?packageLabel:undefined); } catch (error) { this.failure.set(this.errorMessage(error)); } finally { this.busy.set(''); } }

  conversionCardCount(profile:AnkiConversionProfile,analysis:AnkiAnalysis):number{return analysis.cards.filter(card=>card.ankiSource?.modelSignature===profile.sourceSignature&&card.ankiSource.sourceTemplateId===profile.templateId).length;}
  conversionSample(profile:AnkiConversionProfile,analysis:AnkiAnalysis):CardContent|undefined{const matching=analysis.cards.filter(card=>card.ankiSource?.modelSignature===profile.sourceSignature&&card.ankiSource.sourceTemplateId===profile.templateId),variantId=profile.semanticVariants?.[0]?.id;return matching.find(card=>card.ankiSource?.contentProvenance?.semanticVariantId===variantId)??matching[0];}
  semanticVariantSummary(profile:AnkiConversionProfile):{label:string;count:number;condition:string;destination:string}|undefined{const variant=profile.semanticVariants?.[0];if(!variant)return undefined;const count=profile.audit?.semanticVariants?.find(item=>item.id===variant.id)?.matchedCardCount??0,condition=variant.predicate.all.map(clause=>clause.operator==='non-empty'?`${clause.field} has content`:clause.operator==='starts-with'?`${clause.field} starts with “${clause.value}”`:`${clause.field} is ${clause.value}`).join(' and ');return{label:variant.label,count,condition,destination:`Primary answer: ${variant.overrides.primaryAnswerField}`};}
  conversionApprovalLabel(profile:AnkiConversionProfile):string{return profile.semanticVariants?.length?'Use this conversion for matching cards':'Approve this template conversion';}
  reviewProfiles(analysis:AnkiAnalysis):AnkiConversionProfile[]{return analysis.conversionProfiles.filter(profile=>profile.status==='review-required');}
  representativeProfile(analysis:AnkiAnalysis):AnkiConversionProfile|undefined{return this.reviewProfiles(analysis)[0]??analysis.conversionProfiles.find(profile=>profile.status==='automatic'||profile.status==='user-approved')??analysis.conversionProfiles[0];}
  templateWord(count:number):string{return count===1?'template':'templates';}
  conversionProfileLabel(profile:AnkiConversionProfile):string{return `${this.behaviourLabel(profile.behaviour)} · ${profile.templateName}`;}
  behaviourLabel(behaviour:AnkiConversionProfile['behaviour']):string{return({'basic':'Basic','reversed':'Reversed','rich-template':'Rich template','cloze':'Cloze','image-occlusion':'Image Occlusion'} as const)[behaviour];}
  conversionConcernLabel(concern:AnkiConversionProfile['concerns'][number]):string{return({
    'equivalent-recall-answer':'Recall and Answer unexpectedly show the same learning content.','placeholder-answer':'The Answer is only a generated placeholder.','duplicate-prompt-art':'Generated artwork repeats the Recall prompt.','unaccounted-front':'Meaningful Recall content is not assigned.','unaccounted-back':'Meaningful Answer content is not assigned.','inconsistent-template':'Cards from this template project inconsistently.','unsupported-behaviour':'The source behaviour cannot be adapted safely.','duplicate-semantic-coverage':'Source content is assigned more than once.','wrong-side-content':'Source content is assigned to the wrong card side.','answer-leak':'Answer content is visible on Recall.','missing-media':'Source media is missing from the projected card.','visual-answer-text':'A visual answer was replaced with unnecessary answer text.','primary-answer-in-details':'The primary answer was moved into Card Details.','duplicated-frontside':'The source Recall face is duplicated on Answer.','unsafe-title':'The proposed title is not safe source context.','unstructured-support':'Structured source support was flattened.','missing-provenance':'The source-to-card coverage record is incomplete.'
  } as const)[concern];}
  conversionCapabilities(profile:AnkiConversionProfile,analysis:AnkiAnalysis):string{return [...new Set(analysis.cards.filter(card=>card.ankiSource?.modelSignature===profile.sourceSignature&&card.ankiSource.sourceTemplateId===profile.templateId).flatMap(card=>cardCapabilities(card)))].join(' · ');}
  approveConversion(profile:AnkiConversionProfile):void{const analysis=this.ankiAnalysis();if(!analysis)return;const approved=approveConversionProfile(profile);analysis.conversionProfiles=analysis.conversionProfiles.map(item=>item.id===profile.id?approved:item);this.ankiAnalysis.set({...analysis});this.message.set(`${profile.modelName} · ${profile.templateName} approved for all matching cards.`);}

  complete(action:ExchangeCompletionAction['action'],done:NonNullable<ReturnType<typeof this.completion>>):void{this.completionAction.emit({action,deckId:done.deckId,deckIds:done.deckIds,label:done.label});}
  private completionDecks(decks:{id:string;name?:string;parentId?:string}[],preferred:string[]):string[]{const ids=new Set(decks.map(deck=>deck.id)),preferredSet=new Set(preferred),roots=decks.filter(deck=>preferredSet.has(deck.id)&&(!deck.parentId||!ids.has(deck.parentId))),chosen=roots.length?roots:decks.filter(deck=>preferredSet.has(deck.id));return chosen.sort((a,b)=>(a.name??a.id).localeCompare(b.name??b.id)).map(deck=>deck.id);}
  private setCompletion(deckIds:string[],kind:'IMPORT'|'UPDATE'|'REPAIR',label?:string):void{const deckId=deckIds[0]!;this.completion.set({deckId,deckIds,kind,label:label||this.store.decks().find(deck=>deck.id===deckId)?.name||'Imported deck'});}

  async export(portable: boolean): Promise<void> {
    this.message.set(''); this.failure.set(''); this.busy.set(portable ? 'Packaging workbook, media and designs…' : 'Building content workbook…');
    try {
      const state = this.store.data(); if (!state) throw new Error('Local data is still loading.');
      const { contentFromState, writeWorkbook, makePortableBundle, writePortableZip } = await import('../../domain/exchange');
      const selected=this.exportDeckId?[this.exportDeckId]:undefined,root=this.exportDeckId?state.decks.find(deck=>deck.id===this.exportDeckId):undefined;
      let bundle = contentFromState(state,selected);
      if (portable) bundle = await makePortableBundle(bundle, rasterizeBundled);
      const bytes = portable ? await writePortableZip(bundle,{selectedRootIds:selected,rootName:root?.name??'All HoloRecall decks'}) : await writeWorkbook(bundle);
      const blob = new Blob([bytes.slice().buffer], { type: portable ? 'application/zip' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const name=(root?.name??'all-decks').normalize('NFKD').replace(/[^A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase()||'content',date=new Date().toISOString().slice(0,10);
      await this.fileDelivery.deliver(blob, `holorecall-${name}-${date}-v11.${portable ? 'zip' : 'xlsx'}`);
      this.message.set(portable ? `HoloRecall package requested for ${root?.name??'all decks'}, including required media, designs and safe source dependencies. Learning progress is not included.` : 'Workbook download requested. Use the HoloRecall package to move media, designs and source dependencies between installations.');
    } catch (error) { this.failure.set(this.errorMessage(error)); }
    finally { this.busy.set(''); }
  }
  private errorMessage(error: unknown): string { return error instanceof Error ? error.message : 'The operation could not be completed. No existing data was removed.'; }
  private eligibleStoredMappings():AnkiMappingPreset[]{return eligibleAnkiMappings(this.store.data()?.ankiMappings??[],this.sourceMode==='update'?'update':this.sourceMode==='repair'||this.sourceMode==='mapping'?'repair':'import');}
  private async runAnkiAnalysis(mappings?:AnkiMappingPreset[]): Promise<AnkiAnalysis> {
    const state = this.store.data(), bytes = this.ankiBytes; if (!state || !bytes) throw new Error('Select the Anki package again.');
    const effective=mappings??this.eligibleStoredMappings();
    this.ankiAbort?.abort(); this.ankiAbort = new AbortController(); this.ankiRunning.set(true); this.busy.set('Opening archive…');
    const analysis = await this.ankiWorker.analyse(bytes, this.ankiPackageName, effective, state.ankiConversionProfiles, progress => this.busy.set(this.progressLabel(progress)), this.ankiAbort.signal);
    await this.acceptAnalysis(analysis);this.ankiRunning.set(false);return analysis;
  }
  private profileKey(profile:Pick<MappingProfileInput,'sourceSignature'|'templateId'>):string{return `${profile.sourceSignature}::${profile.templateId}`;}
  mappingProfiles(analysis:AnkiAnalysis):MappingProfileInput[]{return analysis.modelSchemas.flatMap(model=>model.templateSchemas.map(template=>({sourceSignature:model.signature,modelName:model.name,templateId:template.id,templateName:template.name,fields:model.fields,questionFields:template.questionFields,answerFields:template.answerFields,fieldSamples:model.fieldSamples})));}
  private async acceptAnalysis(analysis:AnkiAnalysis):Promise<void>{this.ankiAnalysis.set(analysis);this.mappingDrafts.clear();for(const profile of this.mappingProfiles(analysis)){const effective=analysis.effectiveMappings.find(mapping=>mapping.sourceSignature===profile.sourceSignature&&(mapping.templateId===profile.templateId||!mapping.templateId));this.mappingDrafts.set(this.profileKey(profile),structuredClone(effective??automaticMappingProfile(profile)));}this.activeMappings=analysis.effectiveMappings.map(mapping=>structuredClone(mapping));const { previewAnkiImport } = await import('../../domain/anki'); const preview=previewAnkiImport(analysis, this.store.data()!, this.preserveAnkiEdits,this.updateDeckId||undefined,this.sourceMode==='update'?'update':this.sourceMode==='repair'||this.sourceMode==='mapping'?'repair':'import');this.ankiPreview.set(preview);this.conflictsResolved.set(!(preview.update.conflicts.length||preview.update.deckConflicts.length));this.acceptAnkiIssues=false;}
  mappingDraft(profile: MappingProfileInput): AnkiMappingPreset { return this.mappingDrafts.get(this.profileKey(profile)) ?? automaticMappingProfile(profile); }
  savedMapping(profile: MappingProfileInput): AnkiMappingPreset | undefined { return this.store.data()?.ankiMappings.find(item => item.sourceSignature === profile.sourceSignature&&(item.templateId===profile.templateId||!item.templateId)); }
  mappingStatus(profile:MappingProfileInput):string{const saved=this.savedMapping(profile);return!saved?'Automatic suggestion':saved.origin==='user-confirmed'?'User-confirmed mapping':saved.origin==='legacy-unclassified'||!saved.origin?'Legacy mapping · review required':(saved.policyVersion??0)<ANKI_MAPPING_POLICY_VERSION?'Previous automatic mapping · review required':'Current automatic mapping';}
  mappingNeedsReview():boolean{return this.sourceMode==='mapping'||(this.ankiAnalysis()?.compatibility.tierC??0)>0;}
  fieldSamples(model:Pick<MappingProfileInput,'fieldSamples'>,field:string):string{return(model.fieldSamples[field]??[]).join(' · ')||'No non-empty sample';}
  markMappingChanged(profile:MappingProfileInput,field:string):void{const draft=this.mappingDraft(profile);draft.origin='user-confirmed';draft.evidence={...(draft.evidence??{}),[field]:{confidence:'confirmed',reason:'Chosen in HoloRecall Mapping Studio.'}};}
  resetAutomaticMappings():void{const analysis=this.ankiAnalysis();if(!analysis)return;this.mappingDrafts.clear();for(const profile of this.mappingProfiles(analysis))this.mappingDrafts.set(this.profileKey(profile),automaticMappingProfile(profile));this.message.set('Automatic mappings restored in the draft. Update the semantic preview to analyse them.');}
  reviewSamples(analysis:AnkiAnalysis):CardContent[]{const seen=new Set<string>();return analysis.cards.filter(card=>{const key=`${card.ankiSource?.modelSignature}::${card.ankiSource?.sourceTemplateId}`;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,6);}
  async previewMappings():Promise<void>{this.failure.set('');try{const mappings:AnkiMappingPreset[]=[...this.mappingDrafts.values()].map(mapping=>({...mapping,version:ANKI_MAPPING_VERSION,policyVersion:ANKI_MAPPING_POLICY_VERSION,origin:mapping.origin==='user-confirmed'?'user-confirmed':'auto-inferred'}));const analysis=await this.runAnkiAnalysis(mappings);if(analysis.compatibility.tierC)throw new Error('Some card templates still need a safe question and answer choice.');const confirmed=new Set(mappings.filter(mapping=>mapping.origin==='user-confirmed').map(mapping=>`${mapping.sourceSignature}::${mapping.templateId}`));analysis.conversionProfiles=analysis.conversionProfiles.map(profile=>profile.status==='review-required'&&confirmed.has(`${profile.sourceSignature}::${profile.templateId}`)&&!profile.concerns.includes('unsupported-behaviour')?approveConversionProfile(profile):profile);this.ankiAnalysis.set({...analysis});this.activeMappings=mappings;this.message.set('The exact semantic projection that Apply will persist is now shown in Import Review and the transaction preview.');}catch(error){if((error as Error).name!=='AbortError')this.failure.set(this.errorMessage(error));}finally{this.ankiRunning.set(false);this.busy.set('');}}
  private progressLabel(progress:AnkiProgress):string{return progress.total===undefined?`${progress.label}…`:`${progress.label} · ${progress.completed??0} of ${progress.total}`;}
  ngOnDestroy():void{this.ankiAbort?.abort();this.ankiWorker.cancel();window.removeEventListener('popstate',this.exchangePopState);}
}

export async function rasterizeBundled(ref: string): Promise<{ dataUrl: string; width: number; height: number }> {
  const image = new Image(); image.src = ref;
  await image.decode(); const width = 900; const height = Math.round(width * image.naturalHeight / image.naturalWidth);
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d'); if (!context) throw new Error('This browser cannot convert bundled artwork to PNG.');
  context.drawImage(image, 0, 0, width, height); return { dataUrl: canvas.toDataURL('image/png'), width, height };
}
