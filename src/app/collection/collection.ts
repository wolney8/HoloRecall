import { Component, computed, effect, ElementRef, EventEmitter, inject, input, Output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FlashcardComponent, type CardInspectionRequest } from '../card';
import { LocalStudyStore } from '../data/study-store';
import { CardInspectionService } from '../card-inspection';
import type { CardContent, Rarity, RewardUnlock } from '../../domain/models';
import { activeRewardEvents, prestigeProgress, RARITIES, rewardProgress } from '../../domain/rewards';
import { activeCollectibleCards, cardsInCollectionScope, deckCollectionProgress, isCollected, lockedCollectibleTeaser, nearUnlocks, topLevelCollectionProgress, type LockedCollectibleTeaser } from '../../domain/collection';
import { PageRevealDirective } from '../motion/page-reveal';
import { ReviewHistoryComponent } from '../history/review-history';
import { AnswerSupportComponent } from '../answer-support';
import { LockedCollectibleComponent } from './locked-collectible';
import { SubviewNavigationComponent, type SubviewNavigationItem } from '../navigation/subview-navigation';
import { CardMotionViewportComponent } from '../card-motion-viewport';
import { collectionFaceIsRevealed } from './collection-face-policy';
import type { PageEvent } from '@angular/material/paginator';
import { DataPaginationComponent } from '../navigation/data-pagination';
import { clampPageIndex,pageItems } from '../navigation/data-page';

@Component({
  selector: 'hr-collection', standalone: true,
  imports: [FormsModule,NgTemplateOutlet,FlashcardComponent,LockedCollectibleComponent,SubviewNavigationComponent,CardMotionViewportComponent,MatButtonModule,MatFormFieldModule,MatInputModule,MatProgressBarModule,PageRevealDirective,ReviewHistoryComponent,AnswerSupportComponent,DataPaginationComponent],
  templateUrl:'./collection.html',
  styleUrl:'./collection.css',
})
export class CollectionComponent {
  readonly view=input<'overview'|'sets'|'cards'>('overview'); readonly contextDeckId=input(''); readonly cardDetailId=input('');
  @Output() readonly viewChanged=new EventEmitter<'overview'|'sets'|'cards'>(); @Output() readonly contextCleared=new EventEmitter<void>(); @Output() readonly deckOpened=new EventEmitter<string>(); @Output() readonly deskOpened=new EventEmitter<string>(); @Output() readonly cardOpened=new EventEmitter<string>(); @Output() readonly cardClosed=new EventEmitter<void>(); @Output() readonly practiceCards=new EventEmitter<string[]>();
  readonly store=inject(LocalStudyStore); private readonly cardInspection=inject(CardInspectionService); private readonly host=inject<ElementRef<HTMLElement>>(ElementRef); private cardsScrollY=0; private setsScrollY=0; private setOriginId='';
  readonly tiers=RARITIES; readonly collectionDefaultRevealed=collectionFaceIsRevealed(); readonly subviews:readonly SubviewNavigationItem<'overview'|'sets'|'cards'>[]=[{id:'overview',label:'Overview',panelId:'collection-overview-panel'},{id:'sets',label:'Sets',panelId:'collection-sets-panel'},{id:'cards',label:'Cards',panelId:'collection-cards-panel'}]; readonly selectedId=signal(''); readonly lockedSelected=signal<LockedCollectibleTeaser|null>(null); readonly revealed=signal(this.collectionDefaultRevealed); readonly gridRecallId=signal<string|null>(null);
  readonly query=signal(''); readonly higherRarity=signal(false); readonly prestigeOnly=signal(false); readonly sortPrestige=signal(false); readonly filtersOpen=signal(false); readonly deckFilter=signal(''); readonly rarityFilter=signal(''); readonly prestigeBand=signal(''); readonly tagFilter=signal(''); readonly designFilter=signal('');
  readonly cardPageIndex=signal(0);readonly cardPageSize=signal(24);readonly setPageIndex=signal(0);readonly setPageSize=signal(12);readonly scopePageIndex=signal(0);readonly scopePageSize=signal(24);
  readonly state=computed(()=>this.store.data()); readonly contextDeck=computed(()=>this.store.decks().find(deck=>deck.id===this.contextDeckId()));
  readonly activeCards=computed(()=>this.state()?activeCollectibleCards(this.state()!):[]);
  readonly ownedCards=computed(()=>this.state()?this.activeCards().filter(card=>isCollected(this.state()!,card.id)):[]);
  readonly ownedTags=computed(()=>[...new Set(this.ownedCards().flatMap(card=>card.tags))].sort((a,b)=>a.localeCompare(b)));
  readonly ownedVisible=computed(()=>{
    const q=this.query().trim().toLocaleLowerCase(),state=this.state(),deckIds=state&&this.deckFilter()?new Set(cardsInCollectionScope(state,this.deckFilter()).map(card=>card.id)):null;
    let cards=this.ownedCards().filter(card=>{
      const design=this.store.designFor(card),prestige=this.prestige(card).level;
      return (!q||[card.front,card.answer,card.pronunciation,card.meaning,...card.tags].join(' ').toLocaleLowerCase().includes(q))
        &&(!this.higherRarity()||!['common','uncommon'].includes(card.rarity??'common'))
        &&(!this.prestigeOnly()||prestige>0)&&(!deckIds||deckIds.has(card.id))
        &&(!this.rarityFilter()||(card.rarity??'common')===this.rarityFilter())
        &&(!this.tagFilter()||card.tags.includes(this.tagFilter()))
        &&(!this.designFilter()||(this.designFilter()==='original'?!design:design?.id===this.designFilter()))
        &&(!this.prestigeBand()||(this.prestigeBand()==='prestiged'?prestige>0:prestige===0));
    });
    if(this.sortPrestige())cards=[...cards].sort((a,b)=>this.prestige(b).level-this.prestige(a).level||a.id.localeCompare(b.id));return cards;
  });
  readonly selected=computed(()=>this.ownedCards().find(card=>card.id===this.cardDetailId()));
  readonly collectedPrestige=computed(()=>this.ownedCards().filter(card=>this.prestige(card).level>0).length);
  readonly recentlyUnlocked=computed<Array<{event:RewardUnlock;card:CardContent}>>(()=>{const state=this.state();if(!state)return[];const owned=new Set(this.ownedCards().map(card=>card.id));return activeRewardEvents(state).filter((event):event is RewardUnlock=>event.kind==='unlock'&&owned.has(event.cardId)&&event.rarity===(state.cards.find(card=>card.id===event.cardId)?.rarity??'common')).sort((a,b)=>b.timestamp.localeCompare(a.timestamp)).slice(0,4).flatMap(event=>{const card=state.cards.find(item=>item.id===event.cardId);return card?[{event,card}]:[];});});
  readonly recentlyPrestiged=computed(()=>{const state=this.state();if(!state)return[];return activeRewardEvents(state).filter(event=>event.kind==='prestige-promotion'&&isCollected(state,event.cardId)).sort((a,b)=>b.timestamp.localeCompare(a.timestamp)).slice(0,4).flatMap(event=>{const card=state.cards.find(item=>item.id===event.cardId);return event.kind==='prestige-promotion'&&card?[{event,card}]:[];});});
  readonly nearUnlock=computed(()=>this.state()?nearUnlocks(this.state()!,6):[]); readonly overviewNear=computed(()=>this.nearUnlock().slice(0,3));
  readonly setProgress=computed(()=>this.state()?topLevelCollectionProgress(this.state()!):[]); readonly overviewSets=computed(()=>this.setProgress().slice(0,3));
  readonly scopeCards=computed(()=>this.state()&&this.contextDeckId()?cardsInCollectionScope(this.state()!,this.contextDeckId()):[]);
  readonly scopeProgress=computed(()=>this.state()&&this.contextDeckId()?deckCollectionProgress(this.state()!,this.contextDeckId()):{earned:0,total:0,percent:0,prestiged:0,deckId:'',name:'',childCount:0});
  readonly childProgress=computed(()=>{const state=this.state();return state&&this.contextDeckId()?state.decks.filter(deck=>!deck.archived&&deck.parentId===this.contextDeckId()).map(deck=>deckCollectionProgress(state,deck.id)).filter(row=>row.total):[];});
  readonly scopeSlots=computed(()=>{const state=this.state();if(!state)return[];const cards=this.scopeCards();return cards.map(card=>isCollected(state,card.id)?{id:card.id,owned:true as const,card}:{id:card.id,owned:false as const,teaser:lockedCollectibleTeaser(state,card,cards)});});
  readonly validCardPage=computed(()=>clampPageIndex(this.cardPageIndex(),this.cardPageSize(),this.ownedVisible().length));readonly pagedOwnedCards=computed(()=>pageItems(this.ownedVisible(),this.validCardPage(),this.cardPageSize()));
  readonly validSetPage=computed(()=>clampPageIndex(this.setPageIndex(),this.setPageSize(),this.setProgress().length));readonly pagedSets=computed(()=>pageItems(this.setProgress(),this.validSetPage(),this.setPageSize()));
  readonly validScopePage=computed(()=>clampPageIndex(this.scopePageIndex(),this.scopePageSize(),this.scopeSlots().length));readonly pagedScopeSlots=computed(()=>pageItems(this.scopeSlots(),this.validScopePage(),this.scopePageSize()));
  constructor(){effect(()=>{this.view();this.contextDeckId();this.cardDetailId();this.gridRecallId.set(null);});effect(()=>{this.query();this.higherRarity();this.prestigeOnly();this.sortPrestige();this.deckFilter();this.rarityFilter();this.prestigeBand();this.tagFilter();this.designFilter();this.cardPageIndex.set(0);});effect(()=>{this.contextDeckId();this.scopePageIndex.set(0);});effect(()=>{const detail=this.cardDetailId();if(!detail){const id=this.selectedId();if(id)queueMicrotask(()=>{window.scrollTo({top:this.cardsScrollY,behavior:'instant'});this.host.nativeElement.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(id)}"]`)?.focus({preventScroll:true});});}else this.revealed.set(this.collectionDefaultRevealed);});effect(()=>{if(!this.contextDeckId()&&this.setOriginId)queueMicrotask(()=>{window.scrollTo({top:this.setsScrollY,behavior:'instant'});this.host.nativeElement.querySelector<HTMLElement>(`[data-set-id="${CSS.escape(this.setOriginId)}"]`)?.focus({preventScroll:true});this.setOriginId='';});});}
  setCardPage(event:PageEvent):void{this.cardPageIndex.set(event.pageIndex);this.cardPageSize.set(event.pageSize);}
  setSetPage(event:PageEvent):void{this.setPageIndex.set(event.pageIndex);this.setPageSize.set(event.pageSize);}
  setScopePage(event:PageEvent):void{this.scopePageIndex.set(event.pageIndex);this.scopePageSize.set(event.pageSize);}
  selectView(view:'overview'|'sets'|'cards'){
    this.lockedSelected.set(null);
    this.gridRecallId.set(null);
    if(view!=='cards') this.selectedId.set('');
    this.viewChanged.emit(view);
  }
  closeCard(){this.cardClosed.emit();}
  prestige(card:CardContent){return this.state()?prestigeProgress(this.state()!,card.id):{level:0,cycle:1,days:0,required:3,capped:false};}
  frameUrl(card:CardContent){const design=this.store.designFor(card);return this.store.mediaUrl(design?.frames?.[card.rarity??'common']||design?.frame);}
  prestigePercent(card:CardContent){const p=this.prestige(card);return p.capped?100:Math.min(100,p.days/p.required*100);} roman(level:number){return['','I','II','III','IV','V','VI','VII','VIII','IX','X'][level]??'';} tierName(r:Rarity){return this.tiers.find(t=>t.id===r)?.label??'Common';} tierSymbol(r:Rarity){return this.tiers.find(t=>t.id===r)?.symbol??'●';} deckName(id:string){return this.store.decks().find(deck=>deck.id===id)?.name??'Deck unavailable';}
  inspect(card:CardContent){if(!this.state()||!isCollected(this.state()!,card.id))return;this.lockedSelected.set(null);this.gridRecallId.set(null);this.selectedId.set(card.id);this.revealed.set(this.collectionDefaultRevealed);this.cardsScrollY=window.scrollY;this.cardOpened.emit(card.id);queueMicrotask(()=>window.scrollTo({top:0,behavior:'instant'}));}
  inspectMini(event:Event,card:CardContent){if((event.target as HTMLElement).closest('button,a,input,select,textarea'))return;this.inspect(card);}
  inspectLocked(teaser:LockedCollectibleTeaser){this.selectedId.set('');this.lockedSelected.set(teaser);this.scrollTo('locked-details');}
  openDeck(id:string){this.setOriginId=id;this.setsScrollY=window.scrollY;this.deckOpened.emit(id);} hasFilters(){return!!(this.query()||this.higherRarity()||this.prestigeOnly()||this.sortPrestige()||this.deckFilter()||this.rarityFilter()||this.prestigeBand()||this.tagFilter()||this.designFilter());} clearFilters(){this.query.set('');this.higherRarity.set(false);this.prestigeOnly.set(false);this.sortPrestige.set(false);this.deckFilter.set('');this.rarityFilter.set('');this.prestigeBand.set('');this.tagFilter.set('');this.designFilter.set('');} setGridRevealed(id:string,value:boolean){this.gridRecallId.set(value?null:id);}
  async openCardInspection(card:CardContent,request:CardInspectionRequest){if(!this.state()||!isCollected(this.state()!,card.id))return;const ref=request.revealed?(card.backImage||card.image):card.image,url=this.store.mediaUrl(ref);if(url)await this.cardInspection.open(card,request,url);}
  private scrollTo(id:string){queueMicrotask(()=>document.getElementById(id)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));}
}
