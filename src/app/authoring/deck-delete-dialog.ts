import { A11yModule } from '@angular/cdk/a11y';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import type { DeckDeletionImpact, DeckDeletionScope } from '../../domain/deck-management';

export interface DeckDeleteDialogData { name:string;hasChildren:boolean;deckOnly:DeckDeletionImpact;branch:DeckDeletionImpact }
export type DeckDeleteDialogResult=DeckDeletionScope|'archive'|undefined;

@Component({
  selector:'hr-deck-delete-dialog',standalone:true,
  imports:[A11yModule,FormsModule,MatButtonModule,MatCheckboxModule,MatDialogModule,MatRadioModule],
  template:`
    <h2 mat-dialog-title>Delete “{{data.name}}”?</h2>
    <mat-dialog-content>
      <p>Deletion is permanent. Archive is the reversible alternative.</p>
      @if(data.hasChildren){
        <mat-radio-group class="scope-options" [(ngModel)]="scope" aria-label="Deletion scope">
          <mat-radio-button value="deck-only"><strong>Delete this deck only</strong><span>Keep its subdecks and move them to this deck’s current parent.</span></mat-radio-button>
          <mat-radio-button value="branch"><strong>Delete this deck and all subdecks</strong><span>Remove the complete branch and its cards.</span></mat-radio-button>
        </mat-radio-group>
      }
      <section class="scope-summary" aria-live="polite" aria-atomic="true">
        <h3>This will permanently delete</h3>
        <ul><li>{{impact.decks}} {{impact.decks===1?'deck':'decks'}}</li>@if(impact.subdecks){<li>{{impact.subdecks}} {{impact.subdecks===1?'subdeck':'subdecks'}}</li>}<li>{{impact.cards}} {{impact.cards===1?'card':'cards'}}</li><li>{{impact.reviews}} review/scheduling {{impact.reviews===1?'record':'records'}}</li>@if(impact.rewards){<li>{{impact.rewards}} cosmetic/mastery {{impact.rewards===1?'record':'records'}}</li>}</ul>
      </section>
      <mat-checkbox [(ngModel)]="acknowledged">I understand this cannot be undone.</mat-checkbox>
    </mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-button type="button" [mat-dialog-close]="undefined" cdkFocusInitial>Cancel</button><button mat-stroked-button type="button" [mat-dialog-close]="'archive'">Archive instead</button><button mat-flat-button class="danger-confirm" type="button" [disabled]="!acknowledged" [mat-dialog-close]="scope">Delete permanently</button></mat-dialog-actions>
  `,
  styles:[`.scope-options{display:grid;gap:var(--space-3);margin-block:var(--space-4)}mat-radio-button{display:block}.scope-options span{display:block;margin:.25rem 0 0 2rem;color:var(--mat-sys-on-surface-variant);line-height:1.4}.scope-summary{margin-block:var(--space-4);padding:var(--space-4);border-radius:var(--radius-sm);background:color-mix(in srgb,var(--mat-sys-error-container) 50%,transparent)}.scope-summary h3{font-size:1rem;margin:0 0 var(--space-2)}.scope-summary ul{margin:0;padding-inline-start:1.25rem}.danger-confirm{--mdc-filled-button-container-color:var(--mat-sys-error);--mdc-filled-button-label-text-color:var(--mat-sys-on-error)}@media(max-width:580px){mat-dialog-actions{align-items:stretch;flex-direction:column-reverse}mat-dialog-actions button{width:100%}}`]
})
export class DeckDeleteDialogComponent{
  scope:DeckDeletionScope;
  acknowledged=false;
  constructor(@Inject(MAT_DIALOG_DATA)public data:DeckDeleteDialogData){this.scope=data.hasChildren?'deck-only':'branch';}
  get impact():DeckDeletionImpact{return this.scope==='deck-only'?this.data.deckOnly:this.data.branch;}
}
