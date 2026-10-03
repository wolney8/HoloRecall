import { Component,computed,inject,input,signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LocalStudyStore } from '../data/study-store';
import type { CardState,ReviewEvent } from '../../domain/models';
import { dayKey } from '../../domain/time';

@Component({selector:'hr-review-history',standalone:true,imports:[FormsModule,MatButtonModule,MatFormFieldModule,MatInputModule],templateUrl:'./review-history.html',styleUrl:'./review-history.css'})
export class ReviewHistoryComponent{
 readonly store=inject(LocalStudyStore);readonly cardId=input<string>('');readonly from=input<string>('');readonly to=input<string>('');readonly limit=signal(50);readonly confirmReset=signal(false);due='';readonly message=signal('');readonly error=signal('');
 readonly reversals=computed(()=>new Set((this.store.data()?.events??[]).flatMap(event=>event.kind==='reversal'?[event.reviewEventId]:[])));
 private inRange(timestamp:string):boolean{const day=dayKey(new Date(timestamp),this.store.data()?.preferences.timeZone??'Europe/London');return(!this.from()||day>=this.from())&&(!this.to()||day<=this.to());}
 readonly reviews=computed(()=>{const id=this.cardId();return (this.store.data()?.events??[]).filter((event):event is ReviewEvent=>event.kind==='review'&&(!id||event.cardId===id)&&this.inRange(event.timestamp)).sort((a,b)=>b.timestamp.localeCompare(a.timestamp));});
 readonly administrative=computed(()=>{const id=this.cardId();return (this.store.data()?.administrativeEvents??[]).filter(event=>(!id||event.cardId===id)&&this.inRange(event.timestamp)).sort((a,b)=>b.timestamp.localeCompare(a.timestamp));});
 readonly rows=computed(()=>[...this.reviews().map(event=>({timestamp:event.timestamp,id:event.id,type:'Review' as const,event})),...this.administrative().map(event=>({timestamp:event.timestamp,id:event.id,type:'Management' as const,event}))].sort((a,b)=>b.timestamp.localeCompare(a.timestamp)).slice(0,this.limit()));
 state(value:CardState):string{return ['New','Learning','Review','Relearning'][value.state]??'Unavailable';}date(value:string):string{return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:this.store.data()?.preferences.timeZone??'Europe/London'}).format(new Date(value));}duration(ms?:number):string{return ms===undefined?'Unavailable':`${(ms/1000).toFixed(1)} s`;}
 async manage(action:'set-due'|'reset'|'bury'|'unbury'|'suspend'|'unsuspend'):Promise<void>{const id=this.cardId();if(!id)return;try{if(action==='set-due'&&!this.due)throw new Error('Choose a due date.');await this.store.manageCards([id],action,action==='set-due'?`${this.due}T12:00:00.000Z`:undefined);this.confirmReset.set(false);this.message.set(action==='reset'?'Card returned to New. Review history was preserved.':'Card schedule updated.');this.error.set('');}catch(error){this.error.set(error instanceof Error?error.message:'Could not update the card.');}}
}
