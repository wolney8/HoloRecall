import { Component,inject,signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { LocalStudyStore,type BackupRestorePreview } from '../data/study-store';
import { FILE_DELIVERY } from '../platform/file-delivery';
import { dayKey } from '../../domain/time';
import { fileIntegrity,type FileIntegrity } from '../platform/file-integrity';

@Component({selector:'hr-local-data-settings',standalone:true,imports:[FormsModule,MatButtonModule,MatCheckboxModule],template:`
  <h2>Local media</h2><p>{{store.unusedAssets().length}} unreferenced media files. Cleanup never removes an asset used by a card or design.</p>
  <button mat-stroked-button (click)="clean()" [disabled]="!store.unusedAssets().length">Review and remove unused media</button>
  <h2>Full progress backup</h2><p>Your HoloRecall data is stored on this device and is not synced to a cloud account. Backups include cards, designs, uploaded images, schedules, reward events and review history. Keep them private.</p>
  <button mat-stroked-button (click)="export()">Download JSON backup ↓</button>
  @if(exportIntegrity();as artifact){<div class="artifact-integrity" aria-label="Generated full backup integrity"><span class="eyebrow">GENERATED FILE</span><strong>{{artifact.name}} · {{artifact.byteLength}} bytes</strong><code>SHA-256 {{artifact.sha256}}</code></div>}
  <label class="upload-field">Restore full backup<input type="file" accept="application/json,.json" (change)="selectBackup($event)"></label>
  <p class="hint">Restore is allowed only in untouched storage. Older backups are migrated. Content exchange is separate and never carries learning progress.</p>
  @if(pending();as item){<section class="panel" aria-label="Full backup restore preview"><p class="eyebrow">VALIDATED BACKUP</p><h3>{{item.name}}</h3><p>{{item.summary.decks}} decks · {{item.summary.cards}} cards · {{item.summary.reviews}} reviews · {{item.summary.assets}} media</p><p>Practice {{item.summary.practiceEvents}} · rewards {{item.summary.rewardEvents}} · source snapshots {{item.summary.ankiSources}} · active session {{item.summary.session?'yes':'no'}}</p>@if(importIntegrity();as artifact){<div class="artifact-integrity" aria-label="Selected full backup integrity"><span class="eyebrow">SELECTED FILE</span><strong>{{artifact.name}} · {{artifact.byteLength}} bytes</strong><code>SHA-256 {{artifact.sha256}}</code></div>}<p class="hint">Restore replaces this untouched profile with every state category in the backup.</p><mat-checkbox [(ngModel)]="restoreAcknowledged">I understand this profile will be replaced by the validated backup.</mat-checkbox><div class="actions"><button mat-flat-button type="button" (click)="applyRestore()" [disabled]="!restoreAcknowledged">Restore backup</button><button mat-button type="button" (click)="cancelRestore()">Cancel</button></div></section>}
  @if(message()){<p class="inline-notice" [class.error]="failed()" [attr.role]="failed()?'alert':'status'">{{message()}}</p>}
`})
export class LocalDataSettingsComponent{
  readonly store=inject(LocalStudyStore);private readonly delivery=inject(FILE_DELIVERY);readonly message=signal('');readonly failed=signal(false);readonly exportIntegrity=signal<FileIntegrity|null>(null);readonly importIntegrity=signal<FileIntegrity|null>(null);readonly pending=signal<{name:string;json:string;summary:BackupRestorePreview}|null>(null);restoreAcknowledged=false;
  private report(value:string,error=false):void{this.message.set(value);this.failed.set(error);}
  async clean():Promise<void>{const assets=this.store.unusedAssets();if(!assets.length)return;if(!confirm(`Remove ${assets.length} unreferenced media ${assets.length===1?'file':'files'}? This does not remove card or design content.`))return;try{const count=await this.store.removeUnusedAssets(assets.map(asset=>asset.id));this.report(`${count} unused media ${count===1?'file':'files'} removed.`);}catch(error){this.report(error instanceof Error?error.message:String(error),true);}}
  async export():Promise<void>{this.exportIntegrity.set(null);try{const timeZone=this.store.data()?.preferences.timeZone??'Europe/London',json=this.store.exportJson(),bytes=new TextEncoder().encode(json),name=`holorecall-backup-${dayKey(new Date(),timeZone)}-v6.json`,integrity=await fileIntegrity(name,bytes);await this.delivery.deliver(new Blob([bytes],{type:'application/json'}),name);this.exportIntegrity.set(integrity);this.report('Full backup download requested, including uploaded artwork and progress.');}catch(error){this.report(error instanceof Error?error.message:String(error),true);}}
  async selectBackup(event:Event):Promise<void>{const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file)return;this.cancelRestore();this.message.set('');try{if(file.size>100_000_000)throw new Error('Backup is larger than the 100 MB local limit.');const bytes=new Uint8Array(await file.arrayBuffer()),json=new TextDecoder().decode(bytes),summary=await this.store.previewRestoreJson(json),integrity=await fileIntegrity(file.name,bytes);this.pending.set({name:file.name,json,summary});this.importIntegrity.set(integrity);}catch(error){this.report(error instanceof Error?error.message:String(error),true);}finally{input.value='';}}
  async applyRestore():Promise<void>{const item=this.pending();if(!item||!this.restoreAcknowledged)return;try{await this.store.restoreJson(item.json);this.pending.set(null);this.restoreAcknowledged=false;this.report('Backup restored.');}catch(error){this.report(error instanceof Error?error.message:String(error),true);}}
  cancelRestore():void{this.pending.set(null);this.restoreAcknowledged=false;this.importIntegrity.set(null);}
}
