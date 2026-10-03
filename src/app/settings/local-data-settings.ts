import { Component,inject,signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { LocalStudyStore } from '../data/study-store';
import { FILE_DELIVERY } from '../platform/file-delivery';
import { dayKey } from '../../domain/time';

@Component({selector:'hr-local-data-settings',standalone:true,imports:[MatButtonModule],template:`
  <h2>Local media</h2><p>{{store.unusedAssets().length}} unreferenced media files. Cleanup never removes an asset used by a card or design.</p>
  <button mat-stroked-button (click)="clean()" [disabled]="!store.unusedAssets().length">Review and remove unused media</button>
  <h2>Full progress backup</h2><p>Includes cards, designs, uploaded images, schedules, reward events and review history. Keep it private.</p>
  <button mat-stroked-button (click)="export()">Download JSON backup ↓</button>
  <label class="upload-field">Restore full backup<input type="file" accept="application/json,.json" (change)="restore($event)"></label>
  <p class="hint">Restore is allowed only in untouched storage. Older backups are migrated. Deck exchange in Import / export is separate and never carries learning progress.</p>
  @if(message()){<p class="inline-notice" [class.error]="failed()" [attr.role]="failed()?'alert':'status'">{{message()}}</p>}
`})
export class LocalDataSettingsComponent{
  readonly store=inject(LocalStudyStore);private readonly delivery=inject(FILE_DELIVERY);readonly message=signal('');readonly failed=signal(false);
  private report(value:string,error=false):void{this.message.set(value);this.failed.set(error);}
  async clean():Promise<void>{const assets=this.store.unusedAssets();if(!assets.length)return;if(!confirm(`Remove ${assets.length} unreferenced media ${assets.length===1?'file':'files'}? This does not remove card or design content.`))return;try{const count=await this.store.removeUnusedAssets(assets.map(asset=>asset.id));this.report(`${count} unused media ${count===1?'file':'files'} removed.`);}catch(error){this.report(error instanceof Error?error.message:String(error),true);}}
  async export():Promise<void>{try{const timeZone=this.store.data()?.preferences.timeZone??'Europe/London';await this.delivery.deliver(new Blob([this.store.exportJson()],{type:'application/json'}),`holorecall-export-${dayKey(new Date(),timeZone)}.json`);this.report('Full backup download requested, including uploaded artwork and progress.');}catch(error){this.report(error instanceof Error?error.message:String(error),true);}}
  async restore(event:Event):Promise<void>{const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file)return;try{if(file.size>100_000_000)throw new Error('Backup is larger than the 100 MB local limit.');await this.store.restoreJson(await file.text());this.report('Backup restored.');}catch(error){this.report(error instanceof Error?error.message:String(error),true);}finally{input.value='';}}
}
