import { Component, inject } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { RATING_OPTIONS } from '../domain/study';
import type { ConfidenceRating } from '../domain/models';

export interface RatingHelpDialogData { intervals?:Partial<Record<ConfidenceRating,string>> }

@Component({
  selector:'hr-rating-help-dialog',
  standalone:true,
  imports:[A11yModule,MatButtonModule,MatDialogModule],
  template:`
    <h2 mat-dialog-title>About the ratings</h2>
    <mat-dialog-content>
      <p>Choose the option that best matches how the answer came to mind.</p>
      <ol class="rating-help-list">
        @for(option of options;track option.rating){
          <li><span class="rating-help-number" aria-hidden="true">{{option.rating}}</span><span><strong>{{option.label}}</strong><small>{{option.help}}</small>@if(data?.intervals?.[option.rating];as interval){<small class="rating-help-interval">Next review: {{interval}}</small>}</span></li>
        }
      </ol>
    </mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-flat-button type="button" mat-dialog-close>Close</button></mat-dialog-actions>
  `,
  styles:[`
    :host{display:block;color:var(--mat-sys-on-surface)}
    mat-dialog-content>p{margin:0 0 var(--space-4);color:var(--mat-sys-on-surface-variant)}
    .rating-help-list{display:grid;gap:var(--space-2);margin:0;padding:0;list-style:none}
    .rating-help-list li{display:grid;grid-template-columns:36px minmax(0,1fr);gap:var(--space-3);align-items:center;min-height:52px;padding:var(--space-2) var(--space-3);border-radius:var(--mat-sys-corner-medium);background:var(--mat-sys-surface-container)}
    .rating-help-number{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:var(--mat-sys-primary-container);color:var(--mat-sys-on-primary-container);font:var(--mat-sys-label-large)}
    .rating-help-list strong,.rating-help-list small{display:block}
    .rating-help-list small{margin-top:2px;color:var(--mat-sys-on-surface-variant);font:var(--mat-sys-body-small);line-height:1.35}
    .rating-help-interval{font-variant-numeric:tabular-nums}
    @media(max-width:420px){mat-dialog-content{padding-inline:var(--space-3)}.rating-help-list li{padding-inline:var(--space-2)}}
  `],
})
export class RatingHelpDialogComponent {
  readonly options=RATING_OPTIONS;
  readonly data=inject<RatingHelpDialogData|null>(MAT_DIALOG_DATA,{optional:true});
}
