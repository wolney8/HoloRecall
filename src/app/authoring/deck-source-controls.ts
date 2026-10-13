import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import type { Deck, StudyPreset } from '../../domain/models';
import { LocalStudyStore } from '../data/study-store';

@Component({
  selector:'hr-deck-source-controls',standalone:true,
  imports:[FormsModule,MatButtonModule,MatFormFieldModule,MatSelectModule],
  template:`
    @if(deck){
      <section class="panel editor-controls"><div><mat-form-field appearance="outline"><mat-label>Study preset</mat-label><mat-select name="deck-study-preset" [(ngModel)]="deck.studyPresetId"><mat-option value="">Inherit Balanced</mat-option>@for(preset of presets;track preset.id){<mat-option [value]="preset.id">{{preset.name}}</mat-option>}</mat-select></mat-form-field><label class="upload-field">Deck cover · PNG / WebP / JPEG<input type="file" accept="image/png,image/webp,image/jpeg" (change)="coverUpload.emit($event)" [disabled]="busy"></label>@if(deck.coverImage){<div class="image-reference"><img [src]="store.mediaUrl(deck.coverImage)" alt="Deck cover preview"><button mat-button type="button" (click)="deck.coverImage=undefined">Remove cover</button></div>}</div>
      @if(isAnki(deck)){<div><span class="status-chip">Imported from Anki</span><p class="hint">Linked source: {{deck.ankiSource?.sourcePath}}</p><button mat-button type="button" (click)="manage.emit(deck.id)">Manage Anki source</button></div>}</section>
    }
  `,
  styles:[`.editor-controls{display:grid;grid-template-columns:minmax(14rem,22rem) minmax(0,1fr);gap:1rem;align-items:start}.source-list>div{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.5rem 0}.source-list small{display:block;color:var(--mat-sys-on-surface-variant);margin-top:.25rem}.destructive{margin-block:.5rem 1rem}@media(max-width:760px){.editor-controls{grid-template-columns:1fr}.source-list>div{align-items:flex-start;flex-direction:column}}`]
})
export class DeckSourceControlsComponent{
  readonly store=inject(LocalStudyStore);
  @Input() deck:Deck|null=null;
  @Input() decks:Deck[]=[];
  @Input() presets:StudyPreset[]=[];
  @Input() busy=false;
  @Output() readonly coverUpload=new EventEmitter<Event>();
  @Output() readonly manage=new EventEmitter<string>();
  isAnki(deck:Deck):boolean{return deck.ankiSource?.kind==='anki';}
  get imported():Deck[]{const ids=new Set(this.decks.map(deck=>deck.id));return this.decks.filter(deck=>(!deck.parentId||!ids.has(deck.parentId))&&this.isAnki(deck));}
}
