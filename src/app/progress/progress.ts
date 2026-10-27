import { Component, computed, effect, EventEmitter, HostListener, inject, Output, signal } from '@angular/core';
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
import { SubviewNavigationComponent, type SubviewNavigationItem } from '../navigation/subview-navigation';
import type { PageEvent } from '@angular/material/paginator';
import { DataPaginationComponent } from '../navigation/data-pagination';
import { clampPageIndex,pageItems } from '../navigation/data-page';

type ProgressSection='overview'|'decks'|'insights'|'history';

@Component({selector:'hr-progress',standalone:true,imports:[FormsModule,MatButtonModule,MatFormFieldModule,MatInputModule,MatProgressBarModule,PageRevealDirective,ReviewHistoryComponent,SubviewNavigationComponent,DataPaginationComponent],templateUrl:'./progress.html'})
export class ProgressComponent {
  @Output() readonly practiceCards=new EventEmitter<string[]>();
  readonly Math=Math;
  readonly store=inject(LocalStudyStore);
  readonly from=signal('');readonly to=signal('');
  readonly sections:readonly SubviewNavigationItem<ProgressSection>[]=[
    {id:'overview',label:'Overview',panelId:'progress-overview'},
    {id:'decks',label:'Deck progress',panelId:'progress-decks'},
    {id:'insights',label:'Insights',panelId:'progress-insights'},
    {id:'history',label:'History',panelId:'progress-history'},
  ];
  readonly section=signal<ProgressSection>(this.sectionFromLocation());
  readonly report=computed(()=>buildReport(this.store.data()!,new Date(),{from:this.from()||undefined,to:this.to()||undefined}));
  readonly activityPageIndex=signal(0);readonly activityPageSize=signal(25);
  readonly deckPageIndex=signal(0);readonly deckPageSize=signal(25);
  readonly historicalPageIndex=signal(0);readonly historicalPageSize=signal(25);
  readonly validActivityPage=computed(()=>clampPageIndex(this.activityPageIndex(),this.activityPageSize(),this.report().activity.length));
  readonly validDeckPage=computed(()=>clampPageIndex(this.deckPageIndex(),this.deckPageSize(),this.report().perDeck.length));
  readonly validHistoricalPage=computed(()=>clampPageIndex(this.historicalPageIndex(),this.historicalPageSize(),this.report().historicalDecks.length));
  readonly activityRows=computed(()=>pageItems(this.report().activity,this.validActivityPage(),this.activityPageSize()));
  readonly deckRows=computed(()=>pageItems(this.report().perDeck,this.validDeckPage(),this.deckPageSize()));
  readonly historicalRows=computed(()=>pageItems(this.report().historicalDecks,this.validHistoricalPage(),this.historicalPageSize()));
  readonly maxActivity=computed(()=>Math.max(1,...this.report().activity.map(day=>day.count)));
  readonly activitySummary=computed(()=>this.report().activity.map(day=>`${day.date}: ${day.count} reviews`).join('; ')||'No scheduled reviews in this period.');
  readonly next=computed(()=>this.report().cosmetics.filter(item=>!item.earned).sort((a,b)=>(b.days/b.required)-(a.days/a.required)).slice(0,6));
  constructor(){effect(()=>{this.from();this.to();this.activityPageIndex.set(0);this.historicalPageIndex.set(0);});}
  setActivityPage(event:PageEvent):void{this.activityPageIndex.set(event.pageIndex);this.activityPageSize.set(event.pageSize);}
  setDeckPage(event:PageEvent):void{this.deckPageIndex.set(event.pageIndex);this.deckPageSize.set(event.pageSize);}
  setHistoricalPage(event:PageEvent):void{this.historicalPageIndex.set(event.pageIndex);this.historicalPageSize.set(event.pageSize);}
  selectSection(section:ProgressSection):void{if(section===this.section())return;this.section.set(section);history.pushState(null,'',`#progress/${section}`);window.scrollTo({top:0,behavior:'instant'});queueMicrotask(()=>document.getElementById(`progress-${section}`)?.focus({preventScroll:true}));}
  @HostListener('window:popstate') syncSection():void{this.section.set(this.sectionFromLocation());}
  private sectionFromLocation():ProgressSection{const value=location.hash.split('/')[1];return['overview','decks','insights','history'].includes(value)?value as ProgressSection:'overview';}
  percent(value:number|null):string{return value===null?'—':`${Math.round(value*100)}%`;}
  duration(ms:number):string{const seconds=Math.floor(ms/1000);return seconds>=60?`${Math.floor(seconds/60)}m ${seconds%60}s`:`${seconds}s`;}
  tier(id:Rarity):string{return RARITIES.find(t=>t.id===id)?.label??id;}
  recent():void{const now=new Date();this.to.set(dayKey(now,this.store.data()!.preferences.timeZone));const start=new Date(`${this.to()}T12:00:00Z`);start.setUTCDate(start.getUTCDate()-29);this.from.set(start.toISOString().slice(0,10));}
}
