import {Component,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import type {Rarity} from '../../domain/models';
import {RARITIES} from '../../domain/rewards';
import {LocalStudyStore} from '../data/study-store';

@Component({selector:'hr-reward-settings',standalone:true,imports:[FormsModule,MatButtonModule,MatFormFieldModule,MatInputModule],template:`<h2>Cosmetic unlock thresholds</h2><p>Required qualifying days per card. The first scheduled introduction can count. Later contributions require rating 4 or 5 on a distinct study date and at least 20 elapsed hours since the previous contribution.</p><form (ngSubmit)="save()"><div class="threshold-grid">@for(tier of tiers;track tier.id){<mat-form-field appearance="outline"><mat-label>{{tier.label}}</mat-label><input matInput type="number" min="1" max="365" [name]="tier.id" [(ngModel)]="values[tier.id]" required></mat-form-field>}</div><button mat-flat-button type="submit">Save unlock thresholds</button></form><p class="hint">Changes apply to future qualifying reviews. Practice, imports and duplicate submissions earn nothing.</p>@if(message()){<p class="inline-notice" [attr.role]="failed()?'alert':'status'">{{message()}}</p>}`})
export class RewardSettingsComponent{
  readonly store=inject(LocalStudyStore);readonly tiers=RARITIES;readonly message=signal('');readonly failed=signal(false);
  values:Record<Rarity,number>={...this.store.data()!.rewardConfig};
  async save():Promise<void>{try{await this.store.updateRewardConfig(this.values);this.failed.set(false);this.message.set('Unlock thresholds saved. Existing unlocks were preserved.');}catch(error){this.failed.set(true);this.message.set(error instanceof Error?error.message:String(error));}}
}
