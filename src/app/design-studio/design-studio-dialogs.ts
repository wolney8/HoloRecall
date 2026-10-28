import { A11yModule } from '@angular/cdk/a11y';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface UnsavedDesignDialogData { action: 'leave' | 'switch' | 'new' | 'revert'; }

@Component({
  selector: 'hr-unsaved-design-dialog', standalone: true,
  imports: [A11yModule, MatButtonModule, MatDialogModule],
  template: `<h2 mat-dialog-title>{{data.action==='revert'?'Revert Design Set?':'Unsaved Design Set changes'}}</h2>
    <mat-dialog-content><p>{{data.action==='revert'?'Return every editor value to the last saved version?':'Keep editing, or discard these changes before continuing.'}}</p></mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-button type="button" [mat-dialog-close]="false" cdkFocusInitial>Keep editing</button><button mat-flat-button type="button" [mat-dialog-close]="true">{{data.action==='revert'?'Revert':'Discard changes'}}</button></mat-dialog-actions>`,
})
export class UnsavedDesignDialogComponent { constructor(@Inject(MAT_DIALOG_DATA) readonly data: UnsavedDesignDialogData) {} }

export interface DeleteDesignDialogData { name: string; deckReferences: number; cardReferences: number; }

@Component({
  selector: 'hr-delete-design-dialog', standalone: true,
  imports: [A11yModule, MatButtonModule, MatDialogModule],
  template: `<h2 mat-dialog-title>Delete “{{data.name}}”?</h2><mat-dialog-content><p>The Design Set will be removed. Its media stays available for other content.</p>
    @if(data.deckReferences || data.cardReferences){<p><strong>{{data.deckReferences}}</strong> deck assignments and <strong>{{data.cardReferences}}</strong> card overrides will return to their inherited or HoloRecall design.</p>}
    <p>Learning content, reviews, scheduling and rewards are unchanged.</p></mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-button type="button" [mat-dialog-close]="false" cdkFocusInitial>Cancel</button><button mat-flat-button class="danger-confirm" type="button" [mat-dialog-close]="true">Delete Design Set</button></mat-dialog-actions>`,
  styles: [`.danger-confirm{--mdc-filled-button-container-color:var(--mat-sys-error);--mdc-filled-button-label-text-color:var(--mat-sys-on-error)}@media(max-width:580px){mat-dialog-actions{align-items:stretch;flex-direction:column-reverse}mat-dialog-actions button{width:100%}}`],
})
export class DeleteDesignDialogComponent { constructor(@Inject(MAT_DIALOG_DATA) readonly data: DeleteDesignDialogData) {} }
