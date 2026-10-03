import { Component, computed, EventEmitter, inject, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { LocalStudyStore } from '../data/study-store';
import { buildReport } from '../../domain/reports';
import { dayKey } from '../../domain/study';
import { RARITIES } from '../../domain/rewards';
import type { Rarity } from '../../domain/models';
import { PageRevealDirective } from '../motion/page-reveal';
import { ReviewHistoryComponent } from '../history/review-history';

@Component({selector:'hr-progress',standalone:true,imports:[FormsModule,MatButtonModule,MatFormFieldModule,MatInputModule,MatProgressBarModule,PageRevealDirective,ReviewHistoryComponent],templateUrl:'./progress.html'})
export class ProgressComponent {
  @Output() readonly practiceCards=new EventEmitter<string[]>();
  readonly Math=Math;
  readonly store=inject(LocalStudyStore);
  readonly from=signal('');readonly to=signal('');
  readonly report=computed(()=>buildReport(this.store.data()!,new Date(),{from:this.from()||undefined,to:this.to()||undefined}));
  readonly maxActivity=computed(()=>Math.max(1,...this.report().activity.map(day=>day.count)));
  readonly activitySummary=computed(()=>this.report().activity.map(day=>`${day.date}: ${day.count} reviews`).join('; ')||'No scheduled reviews in this period.');
  readonly next=computed(()=>this.report().cosmetics.filter(item=>!item.earned).sort((a,b)=>(b.days/b.required)-(a.days/a.required)).slice(0,6));
  percent(value:number|null):string{return value===null?'—':`${Math.round(value*100)}%`;}
  duration(ms:number):string{const seconds=Math.floor(ms/1000);return seconds>=60?`${Math.floor(seconds/60)}m ${seconds%60}s`:`${seconds}s`;}
  tier(id:Rarity):string{return RARITIES.find(t=>t.id===id)?.label??id;}
  recent():void{const now=new Date();this.to.set(dayKey(now,this.store.data()!.preferences.timeZone));const start=new Date(`${this.to()}T12:00:00Z`);start.setUTCDate(start.getUTCDate()-29);this.from.set(start.toISOString().slice(0,10));}
}
