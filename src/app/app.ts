import { Component, computed, DestroyRef, effect, HostListener, inject, QueryList, signal, ViewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';
import { LocalStudyStore } from './data/study-store';
import { ThemeService, ThemeChoice } from './theme.service';
import { activeReviews, dayKey, dueCards, hydrateCard, mapRating, RATING_OPTIONS } from '../domain/study';
import { createEmptyCard,fsrs } from 'ts-fsrs';
import { activeRewardEvents, RARITIES, rewardProgress } from '../domain/rewards';
import type { CardContent, Deck, DesignSet, FinishPreset, FocusSessionRequest, Rarity } from '../domain/models';
import { FlashcardComponent } from './card';
import { DesignStudioComponent } from './design-studio/design-studio';
import { CollectionComponent } from './collection/collection';
import { ProgressComponent } from './progress/progress';
import { ExchangeComponent } from './exchange/exchange';
import { readArtwork, readAudio } from './upload';
import { AppLifecycle, VisualViewportCoordinator } from './platform/app-lifecycle';
import { FILE_DELIVERY } from './platform/file-delivery';
import { PageRevealDirective, ViewportRevealService } from './motion/page-reveal';
import { LibraryViewService } from './library/library-view.service';
import { deckPath, type SearchResult } from '../domain/library';
import { StudySettingsComponent } from './settings/study-settings';
import { effectiveStudyPreset, fsrsParameters } from '../domain/study-settings';
import { FocusComponent, type FocusLaunch } from './focus/focus';

type Screen = 'dashboard' | 'library' | 'focus' | 'study' | 'results' | 'collection' | 'studio' | 'progress' | 'exchange' | 'settings';
@Component({
  selector:'app-root', standalone:true,
  imports:[FormsModule,MatButtonModule,MatButtonToggleModule,MatFormFieldModule,MatInputModule,MatSelectModule,MatSlideToggleModule,MatProgressBarModule,MatCheckboxModule,MatTooltipModule,FlashcardComponent,DesignStudioComponent,CollectionComponent,ProgressComponent,ExchangeComponent,StudySettingsComponent,FocusComponent,PageRevealDirective],
  templateUrl:'./app.html',
})
export class AppComponent {
  @ViewChildren('ratingTip') private ratingTips!: QueryList<MatTooltip>;
  readonly store=inject(LocalStudyStore);
  readonly theme=inject(ThemeService);
  readonly lifecycle=inject(AppLifecycle);
  readonly library=inject(LibraryViewService);
  private readonly viewportCoordinator=inject(VisualViewportCoordinator);
  private readonly fileDelivery=inject(FILE_DELIVERY);
  private readonly viewportReveal=inject(ViewportRevealService);
  readonly data=this.store.data;
  readonly screen=signal<Screen>(this.initialScreen());
  readonly now=signal(new Date());
  readonly busy=signal(false);
  readonly message=signal('');
  readonly messageError=signal(false);
  readonly resultsSkipped=signal(false);
  readonly resultsIntroPlaying=signal(false);
  readonly activeResultSections=signal(0);
  readonly resultsRun=signal(0);
  readonly resultSectionStates=signal<Record<string,'waiting'|'active'|'settled'>>({});
  readonly unlockRevealIndex=signal(0);
  readonly unlockRevealPhase=signal<'waiting'|'complete'|'pack'|'revealed'|'settled'>('settled');
  readonly confidenceFeedback=signal<1|2|3|4|5|null>(null);
  readonly studyPresentationCard=signal<CardContent|null>(null);
  readonly studyPresentationRating=signal<1|2|3|4|5|null>(null);
  readonly studyTransition=signal<'idle'|'feedback'|'deal'>('idle');
  readonly feedbackPosition=signal({x:0,y:0});
  readonly openRatingHelp=signal<number|null>(null);
  readonly searchResultIndex=signal(0);
  readonly focusLaunch=signal<FocusLaunch|undefined>(undefined);
  readonly ratingOptions=RATING_OPTIONS;
  readonly tiers=RARITIES;
  readonly Math=Math;
  readonly navigation:{id:Screen;label:string;icon:string}[]=[
    {id:'dashboard',label:'Dashboard',icon:'▦'},{id:'library',label:'Decks',icon:'▤'},
    {id:'study',label:'Study',icon:'◈'},{id:'focus',label:'Focus',icon:'◎'},{id:'collection',label:'Collection',icon:'✧'},
    {id:'studio',label:'Design Studio',icon:'✎'},{id:'progress',label:'Progress',icon:'▥'},
    {id:'exchange',label:'Import / export',icon:'⇄'},{id:'settings',label:'Settings',icon:'⚙'},
  ];
  search='';selectedDeck='';editor:CardContent|null=null;deckEditor:Deck|null=null;tagInput='';
  authorPreset:'basic'|'image-first'|'reversible'='basic';authorPreviewRevealed=false;
  selectedCardIds=new Set<string>();bulkRarity:Rarity|''='';bulkDesignSetId='__keep__';bulkFinish:FinishPreset|''='';
  bulkDeckId='';bulkTags='';bulkRemoveTags='';bulkDue='';bulkPosition:number|null=null;renameTagFrom='';renameTagTo='';
  private editorBaseline='';
  settings={newCardLimit:10,reviewLimit:100,timeZone:'Europe/London'};
  rewardSettings:Record<Rarity,number>={common:1,uncommon:2,rare:3,'holo-rare':5,'ultra-rare':8,'secret-rare':12,relic:20};
  readonly reviews=computed(()=>this.data()?activeReviews(this.data()!):[]);
  readonly todayReviews=computed(()=>this.reviews().filter(e=>dayKey(new Date(e.timestamp),this.timeZone())===dayKey(this.now(),this.timeZone())));
  readonly ready=computed(()=>this.data()?dueCards(this.data()!,this.now()):[]);
  readonly reviewDue=computed(()=>this.ready().filter(c=>(this.data()?.states[c.id]?.reps??0)>0).length);
  readonly newReady=computed(()=>this.ready().length-this.reviewDue());
  readonly session=computed(()=>this.data()?.session??null);
  readonly current=computed(()=>this.data()?.cards.find(c=>c.id===this.session()?.queue[0])??null);
  readonly currentPreset=computed(()=>{const data=this.data(),card=this.current();return data?effectiveStudyPreset(data,card?.deckId??this.session()?.scopeDeckId,new Date()):null;});
  readonly displayedCard=computed(()=>this.studyPresentationCard()??this.current());
  readonly revealed=computed(()=>this.session()?.revealed??false);
  readonly displayedRevealed=computed(()=>this.studyPresentationCard()?true:this.revealed());
  readonly earnedCount=computed(()=>this.data()?.cards.filter(c=>rewardProgress(this.data()!,c.id).earned).length??0);
  readonly dateLabel=computed(()=>new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:this.timeZone()}).format(this.now()));
  readonly sessionReviews=computed(()=>{const state=this.data(),session=this.session();return state&&session?activeReviews(state).filter(event=>event.sessionId===session.id):[];});
  readonly sessionPracticeEvents=computed(()=>{const state=this.data(),session=this.session();return state&&session?state.practiceEvents.filter(event=>event.sessionId===session.id):[];});
  readonly resultEvents=computed(()=>this.session()?.mode==='practice'?this.sessionPracticeEvents():this.sessionReviews());
  readonly resultActiveMs=computed(()=>this.resultEvents().reduce((sum,event)=>sum+(event.activeMs??0),0));
  readonly resultConfidence=computed(()=>this.resultEvents().length?this.resultEvents().reduce((sum,event)=>sum+event.rating,0)/this.resultEvents().length:null);
  readonly resultRecall=computed(()=>{const values=this.resultEvents().flatMap(event=>event.recallMs===undefined?[]:[event.recallMs]);return{sample:values.length,average:values.length?values.reduce((a,b)=>a+b,0)/values.length:null};});
  readonly resultUnique=computed(()=>new Set(this.resultEvents().map(event=>event.cardId)).size);
  readonly practiceLowCards=computed(()=>{const state=this.data();if(!state)return[];const ids=new Set(this.sessionPracticeEvents().filter(event=>event.rating<=2).map(event=>event.cardId));return state.cards.filter(card=>ids.has(card.id));});
  readonly practiceDistribution=computed(()=>[1,2,3,4,5].map(rating=>({rating,count:this.sessionPracticeEvents().filter(event=>event.rating===rating).length})));
  readonly resultRewardRows=computed(()=>{const state=this.data();if(!state)return[];const ids=new Set(this.sessionReviews().map(event=>event.id));const contributions=activeRewardEvents(state).filter(event=>event.kind==='contribution'&&ids.has(event.reviewEventId));return [...new Set(this.sessionReviews().map(event=>event.cardId))].map(cardId=>{const card=state.cards.find(item=>item.id===cardId)!;const progress=rewardProgress(state,cardId);const gained=contributions.filter(event=>event.cardId===cardId).length;return{card,progress,gained,before:Math.max(0,progress.days-gained)};});});
  readonly resultUnlocks=computed(()=>{const state=this.data();if(!state)return[];const ids=new Set(this.sessionReviews().map(event=>event.id));return activeRewardEvents(state).flatMap(event=>event.kind==='unlock'&&ids.has(event.reviewEventId)?[{event,card:state.cards.find(card=>card.id===event.cardId)!}]:[]);});
  readonly activeResultUnlock=computed(()=>this.resultUnlocks()[this.unlockRevealIndex()]??null);
  private elapsedMs=0;
  private lastTick=performance.now();
  private lastActivity=performance.now();
  private checkpointing=false;
  private ticks=0;
  private timedCard='';
  private settingsLoaded=false;
  private resultSessionKey='';
  private initialRecoveryChecked=false;
  private resultUnobserve:(()=>void)[]=[];
  private resultTimers:number[]=[];
  private confidenceTimer=0;
  private feedbackResolve:(()=>void)|null=null;
  private studyPresentationRun=0;
  private studyDealAnimation:Animation|null=null;
  readonly expandedDecks=new Set<string>();
  constructor(){
    void this.store.init();
    effect(()=>{
      const cardId=this.current()?`${this.current()!.id}:${this.current()!.revision}`:'';
      if(cardId!==this.timedCard){this.timedCard=cardId;this.elapsedMs=this.session()?.activeMs??0;this.lastTick=performance.now();}
      const state=this.data();
      if(state&&!this.initialRecoveryChecked){this.initialRecoveryChecked=true;if(this.screen()==='study'&&state.session?.endedAt&&!state.session.queue.length){queueMicrotask(()=>this.showResults());return;}}
      if(state&&!this.settingsLoaded){this.settingsLoaded=true;this.loadSettings();}
      const resultKey=state&&this.screen()==='results'&&state.session?.endedAt?`${state.session.id}:${state.session.endedAt}`:'';
      if(resultKey&&resultKey!==this.resultSessionKey){this.resultSessionKey=resultKey;queueMicrotask(()=>this.startResultsPresentation());}
    });
    const activity=()=>{this.lastActivity=performance.now();};
    const unsubscribeLifecycle=this.lifecycle.subscribe(active=>{if(!active){void this.checkpoint();if(this.screen()==='results')this.skipResults();else this.clearResultMotion();this.cancelStudyDealAnimation();this.settleConfidenceFeedback();}else{this.lastTick=performance.now();void this.store.refresh().catch(()=>undefined);}});
    const timer=setInterval(()=>{
      const tick=performance.now();
      if(this.screen()==='study'&&this.current()&&this.lifecycle.active()&&this.lifecycle.focused()&&!this.busy()&&tick-this.lastActivity<60_000){this.elapsedMs=Math.min((this.currentPreset()?.maxAnswerSeconds??120)*1000,this.elapsedMs+Math.min(1500,tick-this.lastTick));}
      this.lastTick=tick;
      if(++this.ticks%5===0)void this.checkpoint();
      if(this.ticks%30===0)this.now.set(new Date());
    },1000);
    document.addEventListener('pointerdown',activity);document.addEventListener('keydown',activity);
    inject(DestroyRef).onDestroy(()=>{clearInterval(timer);this.clearResultMotion();this.cancelStudyPresentation();document.removeEventListener('pointerdown',activity);document.removeEventListener('keydown',activity);unsubscribeLifecycle();});
  }
  private initialScreen():Screen{const value=location.hash.slice(1);return ['dashboard','library','focus','study','results','collection','studio','progress','exchange','settings'].includes(value)?value as Screen:'dashboard';}
  private async checkpoint():Promise<void>{if(this.checkpointing||this.busy()||this.screen()!=='study'||!this.current()||this.elapsedMs<= (this.session()?.activeMs??0)+500)return;this.checkpointing=true;try{await this.store.updateSessionTime(Math.round(this.elapsedMs));}catch{/* Retain the unsaved current-card time locally; review is authoritative. */}finally{this.checkpointing=false;}}
  private loadSettings():void{const state=this.data();if(!state)return;const {newCardLimit,reviewLimit,timeZone}=state.preferences;this.settings={newCardLimit,reviewLimit,timeZone};this.rewardSettings={...state.rewardConfig};}
  timeZone():string{return this.data()?.preferences.timeZone??'Europe/London';}
  predictedInterval(rating:1|2|3|4|5):string{const data=this.data(),card=this.current(),preset=this.currentPreset();if(!data||!card||!preset)return'';const previous=data.states[card.id]?hydrateCard(data.states[card.id]!):createEmptyCard(new Date());const result=fsrs(fsrsParameters(preset)).next(previous,new Date(),mapRating(rating)).card,days=result.scheduled_days;return days<1?'Soon':days===1?'1 day':`${days} days`;}
  visibleTimer():string{const seconds=Math.floor(this.elapsedMs/1000);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
  go(screen:Screen):void{if(screen!=='library'&&this.hasUnsavedCard()&&!confirm('Discard the unsaved card changes?'))return;void this.checkpoint();if(this.screen()==='results'&&screen!=='results'){this.clearResultMotion();this.resultsIntroPlaying.set(false);}if(this.screen()==='study'&&screen!=='study')this.cancelStudyPresentation();if(screen!=='library')this.selectedCardIds=new Set();if(screen!=='focus')this.focusLaunch.set(undefined);this.screen.set(screen);history.replaceState(null,'',`#${screen}`);this.editor=null;this.editorBaseline='';this.deckEditor=null;this.message.set('');this.messageError.set(false);if(screen==='settings')this.loadSettings();window.scrollTo({top:0,behavior:'instant'});setTimeout(()=>document.getElementById('main-content')?.focus({preventScroll:true}));}
  topDecks():Deck[]{const state=this.data();if(!state)return[];const ids=new Set(state.decks.map(deck=>deck.id));return state.decks.filter(deck=>!deck.parentId||!ids.has(deck.parentId));}
  deckChildren(id:string):Deck[]{return this.data()?.decks.filter(deck=>deck.parentId===id)??[];}
  private deckBranchIds(id:string):Set<string>{const state=this.data(),ids=new Set<string>([id]);if(!state)return ids;let changed=true;while(changed){changed=false;for(const deck of state.decks)if(deck.parentId&&ids.has(deck.parentId)&&!ids.has(deck.id)){ids.add(deck.id);changed=true;}}return ids;}
  deckCards(id:string):CardContent[]{const state=this.data();if(!state)return[];const ids=this.deckBranchIds(id);return state.cards.filter(card=>ids.has(card.deckId));}
  deckSubdeckCount(id:string):number{return this.deckBranchIds(id).size-1;}
  deckRows(id:string):{deck:Deck;depth:number}[]{const rows:{deck:Deck;depth:number}[]=[];const visit=(parent:string,depth:number)=>{for(const deck of this.deckChildren(parent)){rows.push({deck,depth});visit(deck.id,depth+1);}};visit(id,1);return rows;}
  toggleDeck(id:string):void{if(this.expandedDecks.has(id))this.expandedDecks.delete(id);else this.expandedDecks.add(id);}
  deckReady(id:string):number{return this.data()?dueCards(this.data()!,this.now(),id).length:0;}
  filteredCards():CardContent[]{return this.library.page().items.map(item=>item.card);}
  deckPath(id:string):string{return this.data()?deckPath(this.data()!,id):'';}
  setLibrarySearch(value:string):void{this.search=value;this.searchResultIndex.set(0);this.library.setQuery(value);}
  toggleFilter(key:'deckIds'|'tags'|'rarities'|'designSetIds'|'finishes'|'studyStates'|'media',value:string):void{this.library.toggleListFilter(key,value as never);}
  chooseSearchResult(result:SearchResult):void{this.library.selectResult(result);if(result.kind==='card'){const card=this.data()?.cards.find(item=>item.id===result.cardId);if(card)this.edit(card);}else this.go('library');}
  deckName(id:string):string{return this.data()?.decks.find(d=>d.id===id)?.name??'Deck';}
  designFor(card:CardContent):DesignSet|undefined{const id=card.designSetId||this.data()?.decks.find(d=>d.id===card.deckId)?.designSetId;return this.data()?.designs.find(d=>d.id===id);}
  shownRarity(card:CardContent):Rarity{return this.data()&&rewardProgress(this.data()!,card.id).earned?(card.rarity??'common'):'common';}
  frameFor(card:CardContent):string{const design=this.designFor(card);return this.store.mediaUrl(design?.frames?.[this.shownRarity(card)]||design?.frame);}
  rarityLabel(rarity?:Rarity):string{return this.tiers.find(t=>t.id===(rarity??'common'))?.label??'Common';}
  unlock(card:CardContent){return rewardProgress(this.data()!,card.id);}
  async setTheme(choice:ThemeChoice):Promise<void>{try{await this.theme.select(choice);}catch(e){this.message.set(String(e));}}
  async study(deckId?:string):Promise<void>{this.busy.set(true);try{await this.store.startSession(deckId);this.elapsedMs=this.session()?.activeMs??0;this.lastActivity=performance.now();this.go(this.current()?'study':'results');if(!this.current())this.startResultsPresentation();}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  openFocus(launch:FocusLaunch={}):void{this.focusLaunch.set(launch);this.go('focus');}
  async startFocus(request:FocusSessionRequest):Promise<void>{this.busy.set(true);try{await this.store.startFocusSession(request);this.elapsedMs=0;this.lastActivity=performance.now();this.go(this.current()?'study':'results');if(!this.current())this.startResultsPresentation();}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  startSelection(mode:'scheduled'|'practice',ids:string[],label:string):void{if(!ids.length)return;void this.startFocus({mode,label,criteria:{version:1,explicitCardIds:[...ids]},order:mode==='scheduled'?'due':'deck',limit:Math.min(10_000,ids.length)});}
  practiceMissedAgain():void{const cards=this.practiceLowCards();if(!cards.length)return;this.openFocus({explicitCardIds:cards.map(card=>card.id),sourceLabel:'Low-confidence cards'});}
  viewPracticeCards():void{this.go('collection');}
  returnFromPractice():void{this.go('library');}
  async reveal():Promise<void>{if(!this.current()||this.busy())return;this.busy.set(true);try{await this.store.revealSession(Math.round(this.elapsedMs));setTimeout(()=>document.querySelector<HTMLElement>('.study-card-area .answer h3, .study-card-area .answer-text')?.focus({preventScroll:true}));}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  async rate(rating:1|2|3|4|5):Promise<void>{
    const card=this.current(),session=this.session();if(!card||!session||!this.revealed()||this.busy())return;
    const run=++this.studyPresentationRun;this.busy.set(true);this.studyPresentationCard.set(card);
    try{
      if(session.mode==='practice')await this.store.practice(card.id,rating,session.id,crypto.randomUUID(),Math.round(this.elapsedMs));
      else await this.store.review(card.id,rating,session.id,crypto.randomUUID(),Math.round(this.elapsedMs));
      if(run!==this.studyPresentationRun)return;
      document.querySelector('.study-card-area hr-card')?.dispatchEvent(new Event('stop-card-audio'));this.studyPresentationRating.set(rating);this.elapsedMs=0;this.now.set(new Date());this.message.set('');
      await this.playConfidenceFeedback(rating);
      if(run!==this.studyPresentationRun)return;
      await this.playDealTransition(run);
      if(run!==this.studyPresentationRun)return;
      this.clearStudyPresentation();
      if(!this.current()){this.go('results');this.startResultsPresentation();}
    }catch(e){this.clearStudyPresentation();this.fail(e);}finally{if(run===this.studyPresentationRun)this.busy.set(false);}
  }
  async undo():Promise<void>{const session=this.session();if(!session?.lastReviewCardId||this.busy())return;this.busy.set(true);try{await this.store.undo(session.lastReviewCardId,session.id);this.elapsedMs=0;this.message.set('');if(this.current())this.go('study');}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  async endStudy():Promise<void>{if(!this.session()||this.busy())return;this.busy.set(true);try{if(this.current())await this.store.updateSessionTime(Math.round(this.elapsedMs));await this.store.endSession();this.go('results');this.startResultsPresentation();}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  showResults():void{this.go('results');this.startResultsPresentation();}
  motionEnabled():boolean{return !!this.data()?.preferences.effects&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
  showResultsSkip():boolean{return this.motionEnabled()&&!this.resultsSkipped()&&(this.resultsIntroPlaying()||this.activeResultSections()>0||['waiting','complete','pack'].includes(this.unlockRevealPhase()));}
  replayResults():void{this.startResultsPresentation();}
  resultSectionState(id:string):'waiting'|'active'|'settled'{return this.resultSectionStates()[id]??'settled';}
  skipResults():void{this.resultsSkipped.set(true);this.resultsIntroPlaying.set(false);this.clearResultMotion();this.unlockRevealPhase.set('settled');this.resultSectionStates.update(states=>Object.fromEntries(Object.keys(states).map(key=>[key,'settled'])));}
  private startResultsPresentation():void{
    const session=this.session();if(session?.endedAt)this.resultSessionKey=`${session.id}:${session.endedAt}`;
    const practice=session?.mode==='practice';this.clearResultMotion();this.resultsSkipped.set(!this.motionEnabled());this.resultsIntroPlaying.set(this.motionEnabled());this.activeResultSections.set(0);this.unlockRevealIndex.set(0);this.unlockRevealPhase.set(!practice&&this.motionEnabled()&&this.resultUnlocks().length?'waiting':'settled');this.resultSectionStates.set(Object.fromEntries((practice?['definitions']:['cosmetics','definitions']).map(key=>[key,this.motionEnabled()?'waiting':'settled'])));this.resultsRun.update(value=>value+1);
    this.resultTimers.push(window.setTimeout(()=>this.observeResultSections(),0));
    if(this.motionEnabled())this.resultTimers.push(window.setTimeout(()=>this.resultsIntroPlaying.set(false),900));
  }
  private observeResultSections():void{
    const sections=this.renderedResultSections();if(this.screen()!=='results')return;if(!sections.length){this.resultTimers.push(window.setTimeout(()=>this.observeResultSections(),50));return;}
    if(this.resultsSkipped()||!this.motionEnabled())return;
    for(const section of sections)this.resultUnobserve.push(this.viewportReveal.observe(section,()=>this.activateResultSection(section)));
  }
  private renderedResultSections():HTMLElement[]{return Array.from(document.querySelectorAll<HTMLElement>('.results [data-result-section]'));}
  private activateResultSection(section:HTMLElement):void{
    const key=section.dataset['resultSection'];if(!key||this.resultSectionState(key)!=='waiting')return;
    this.resultSectionStates.update(states=>({...states,[key]:'active'}));this.activeResultSections.update(value=>value+1);if(key==='cosmetics')this.beginUnlockReveal();
    this.resultTimers.push(window.setTimeout(()=>{this.resultSectionStates.update(states=>({...states,[key]:'settled'}));this.activeResultSections.update(value=>Math.max(0,value-1));},1450));
  }
  continueUnlockReveal():void{const next=this.unlockRevealIndex()+1;if(next>=this.resultUnlocks().length){this.unlockRevealPhase.set('settled');return;}this.unlockRevealIndex.set(next);if(!this.motionEnabled()||this.resultsSkipped()){this.unlockRevealPhase.set('settled');return;}this.unlockRevealPhase.set('pack');this.resultTimers.push(window.setTimeout(()=>this.unlockRevealPhase.set('revealed'),650));}
  unlockContinueLabel():string{return this.unlockRevealIndex()+1<this.resultUnlocks().length?'Continue':'Keep cards';}
  viewUnlockedCollection():void{this.go('collection');}
  private beginUnlockReveal():void{if(!this.resultUnlocks().length||this.unlockRevealPhase()!=='waiting')return;if(!this.motionEnabled()||this.resultsSkipped()){this.unlockRevealPhase.set('settled');return;}this.resultTimers.push(window.setTimeout(()=>this.unlockRevealPhase.set('complete'),1250),window.setTimeout(()=>this.unlockRevealPhase.set('pack'),1650),window.setTimeout(()=>this.unlockRevealPhase.set('revealed'),2320));}
  private clearResultMotion():void{for(const unobserve of this.resultUnobserve)unobserve();this.resultUnobserve=[];for(const timer of this.resultTimers)window.clearTimeout(timer);this.resultTimers=[];this.activeResultSections.set(0);}
  toggleRatingHelp(rating:number,tip:MatTooltip,event:MouseEvent):void{event.stopPropagation();const close=this.openRatingHelp()===rating;this.ratingTips.forEach(item=>item.hide(0));this.openRatingHelp.set(close?null:rating);if(!close)tip.show(0);}
  private async playConfidenceFeedback(rating:1|2|3|4|5):Promise<void>{
    if(!this.motionEnabled()){this.studyTransition.set('feedback');await new Promise<void>(resolve=>window.setTimeout(resolve,40));return;}
    const stage=document.querySelector<HTMLElement>('[data-testid="study-deck-stage"]')?.getBoundingClientRect();
    this.feedbackPosition.set({x:stage?stage.left+stage.width/2:innerWidth/2,y:stage?stage.top+stage.height/2:innerHeight/2});
    this.studyTransition.set('feedback');this.confidenceFeedback.set(rating);
    await new Promise<void>(resolve=>{this.feedbackResolve=resolve;this.confidenceTimer=window.setTimeout(()=>this.settleConfidenceFeedback(),900);});
  }
  private async playDealTransition(run:number):Promise<void>{
    if(!this.motionEnabled()||!this.lifecycle.active()||run!==this.studyPresentationRun)return;
    this.studyTransition.set('deal');
    const stage=document.querySelector<HTMLElement>('[data-testid="study-deck-stage"]');
    if(!stage)return;
    const outgoing=stage.animate([{opacity:1,transform:'translateX(0) rotate(0)'},{opacity:0,transform:'translateX(-34px) rotate(-1.5deg)'}],{duration:180,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'});
    let owned:Animation=outgoing;
    this.studyDealAnimation=outgoing;
    try{
      await Promise.race([outgoing.finished.catch(()=>undefined),new Promise(resolve=>window.setTimeout(resolve,260))]);
      if(run!==this.studyPresentationRun||!this.lifecycle.active())return;
      this.studyPresentationCard.set(null);await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
      if(run!==this.studyPresentationRun||!this.lifecycle.active())return;
      // The outgoing fill belongs to the previous card. Cancel it before the
      // incoming animation so it can never hide a later card after that
      // animation releases its temporary effect.
      outgoing.cancel();
      if(this.current()){
        const incoming=stage.animate([{opacity:0,transform:'translateX(32px) rotate(1.5deg)'},{opacity:1,transform:'translateX(0) rotate(0)'}],{duration:260,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
        owned=incoming;
        this.studyDealAnimation=incoming;
        await Promise.race([incoming.finished.catch(()=>undefined),new Promise(resolve=>window.setTimeout(resolve,340))]);
      }
    }finally{
      if(this.studyDealAnimation===owned){owned.cancel();this.studyDealAnimation=null;}
    }
  }
  private settleConfidenceFeedback():void{window.clearTimeout(this.confidenceTimer);this.confidenceTimer=0;this.confidenceFeedback.set(null);const resolve=this.feedbackResolve;this.feedbackResolve=null;resolve?.();}
  private cancelStudyDealAnimation():void{this.studyDealAnimation?.cancel();this.studyDealAnimation=null;}
  private clearStudyPresentation():void{this.settleConfidenceFeedback();this.cancelStudyDealAnimation();this.studyPresentationCard.set(null);this.studyPresentationRating.set(null);this.studyTransition.set('idle');}
  private cancelStudyPresentation():void{this.studyPresentationRun++;this.clearStudyPresentation();this.busy.set(false);}
  duration(ms:number):string{const seconds=Math.round(ms/1000);if(ms>0&&seconds===0)return'<1s';return seconds>=60?`${Math.floor(seconds/60)}m ${seconds%60}s`:`${seconds}s`;}
  private fail(error:unknown):void{this.messageError.set(true);this.message.set(error instanceof Error?error.message:String(error));}
  @HostListener('document:pointerdown',['$event']) dismissRatingHelp(event:PointerEvent):void{if(!(event.target as HTMLElement).closest('.rating-info')){this.openRatingHelp.set(null);this.ratingTips?.forEach(tip=>tip.hide(0));}}
  @HostListener('document:keydown',['$event']) key(event:KeyboardEvent):void{if(event.key==='Escape'){this.openRatingHelp.set(null);this.ratingTips?.forEach(tip=>tip.hide(0));return;}const target=event.target as HTMLElement;if(this.screen()!=='study'||target.closest('input,textarea,select,button,a,[role="combobox"]')||event.altKey||event.ctrlKey||event.metaKey||event.repeat)return;if(event.code==='Space'&&!this.revealed()){event.preventDefault();void this.reveal();}if(this.revealed()&&/^[1-5]$/.test(event.key)){event.preventDefault();void this.rate(Number(event.key)as 1|2|3|4|5);}}
  edit(card?:CardContent,deckId?:string):void{this.go('library');if(this.screen()!=='library')return;this.tagInput=card?.tags.join(', ')??'';this.authorPreset=card?.kind==='visual'?'image-first':'basic';this.authorPreviewRevealed=false;this.editor=card?structuredClone(card):this.blankCard(deckId);this.editorBaseline=this.editorSnapshot();setTimeout(()=>document.getElementById('card-front')?.focus());}
  duplicateCard(card:CardContent):void{this.edit({...structuredClone(card),id:crypto.randomUUID(),revision:0},card.deckId);this.message.set('Duplicate draft created. Review it before saving.');}
  setAuthorPreset(preset:'basic'|'image-first'|'reversible'):void{if(!this.editor)return;this.authorPreset=preset;this.editor.kind=preset==='image-first'?'visual':'text';this.editor={...this.editor};}
  cancelCardEditor():void{if(this.hasUnsavedCard()&&!confirm('Discard the unsaved card changes?'))return;this.editor=null;this.editorBaseline='';}
  async saveCard(addAnother=false):Promise<void>{if(!this.editor||this.busy())return;this.busy.set(true);try{let card={...this.editor,front:this.editor.front.trim(),answer:this.editor.answer.trim(),tags:this.tagInput.split(',').map(s=>s.trim()).filter(Boolean)};if(!card.designSetId)delete card.designSetId;const cards=[card];if(this.authorPreset==='reversible'&&!card.revision){const siblingGroupId=card.siblingGroupId??`siblings-${crypto.randomUUID()}`;card={...card,siblingGroupId};cards[0]=card;cards.push({...card,id:crypto.randomUUID(),front:card.answer,answer:card.front,frontAudio:card.backAudio,backAudio:card.frontAudio,pronunciation:'',meaning:card.meaning,revision:0});}await this.store.saveCards(cards);this.message.set(cards.length===2?'Two reversible cards saved. Review history was not changed.':'Card saved. Review history preserved.');if(addAnother){const deckId=card.deckId,designSetId=card.designSetId,preset=this.authorPreset;this.editor=this.blankCard(deckId,designSetId);this.authorPreset=preset;this.editor.kind=preset==='image-first'?'visual':'text';this.tagInput='';this.authorPreviewRevealed=false;this.editorBaseline=this.editorSnapshot();setTimeout(()=>document.getElementById('card-front')?.focus());}else{this.editor=null;this.editorBaseline='';}}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  toggleCardSelection(id:string,selected:boolean):void{const next=new Set(this.selectedCardIds);selected?next.add(id):next.delete(id);this.selectedCardIds=next;}
  clearCardSelection():void{this.selectedCardIds=new Set();}
  selectedIds():string[]{return [...this.selectedCardIds];}
  async applyBulkCards():Promise<void>{if(this.busy()||!this.selectedCardIds.size)return;this.busy.set(true);try{await this.store.bulkOrganizeCards([...this.selectedCardIds],{...(this.bulkDeckId?{deckId:this.bulkDeckId}:{}),addTags:this.bulkTags.split(',').filter(Boolean),removeTags:this.bulkRemoveTags.split(',').filter(Boolean),...(this.bulkRarity?{rarity:this.bulkRarity}:{}),...(this.bulkDesignSetId!=='__keep__'?{designSetId:this.bulkDesignSetId==='__inherit__'?'':this.bulkDesignSetId}:{}),...(this.bulkFinish?{finish:this.bulkFinish}:{})});this.message.set(`${this.selectedCardIds.size} cards updated. Review history and earned cosmetics were preserved.`);this.selectedCardIds=new Set();}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  async archiveSelected():Promise<void>{if(this.busy()||!this.selectedCardIds.size)return;this.busy.set(true);try{await this.store.bulkOrganizeCards([...this.selectedCardIds],{archived:true});this.message.set(`${this.selectedCardIds.size} cards archived. Learning history was retained.`);this.selectedCardIds=new Set();}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  selectShown():void{this.selectedCardIds=new Set(this.filteredCards().map(card=>card.id));}
  selectAllMatching():void{this.selectedCardIds=new Set(this.library.allMatchingIds());}
  async restoreSelected():Promise<void>{if(!this.selectedCardIds.size)return;this.busy.set(true);try{await this.store.bulkOrganizeCards([...this.selectedCardIds],{archived:false});this.message.set(`${this.selectedCardIds.size} cards restored.`);this.selectedCardIds=new Set();}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  async manageSelected(action:'set-due'|'reset'|'bury'|'unbury'|'suspend'|'unsuspend'|'reposition'):Promise<void>{if(this.busy()||!this.selectedCardIds.size)return;if(action==='reset'&&!confirm(`Reset ${this.selectedCardIds.size} selected cards to New? Review history and cosmetics will be preserved.`))return;this.busy.set(true);try{const value=action==='set-due'?`${this.bulkDue}T12:00:00.000Z`:action==='reposition'?this.bulkPosition??undefined:undefined;await this.store.manageCards([...this.selectedCardIds],action,value);this.message.set(`${this.selectedCardIds.size} cards updated. Administrative changes do not count as reviews.`);}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  tagUsage(tag:string):number{return this.library.index()?.cards.filter(item=>item.tags.some(value=>value.toLocaleLowerCase('en')===tag.toLocaleLowerCase('en'))).length??0;}
  onSearchKey(event:KeyboardEvent):void{const results=this.library.page().results.slice(0,8);if(event.key==='Escape'){this.setLibrarySearch('');return;}if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const direction=event.key==='ArrowDown'?1:-1;this.searchResultIndex.set((this.searchResultIndex()+direction+results.length)%Math.max(1,results.length));return;}if(event.key==='Enter'&&results[this.searchResultIndex()]){event.preventDefault();this.chooseSearchResult(results[this.searchResultIndex()]!);}}
  async cleanUnusedMedia():Promise<void>{const assets=this.store.unusedAssets();if(!assets.length){this.message.set('No unused local media.');return;}if(!confirm(`Remove ${assets.length} unreferenced media ${assets.length===1?'file':'files'}? This does not remove card or design content.`))return;try{const count=await this.store.removeUnusedAssets(assets.map(asset=>asset.id));this.message.set(`${count} unused media ${count===1?'file':'files'} removed.`);}catch(e){this.fail(e);}}
  async renameTag():Promise<void>{if(this.busy())return;this.busy.set(true);try{const count=await this.store.renameTag(this.renameTagFrom,this.renameTagTo);this.message.set(count?`Renamed the tag on ${count} cards.`:'No cards used that tag.');this.renameTagFrom='';this.renameTagTo='';}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  private blankCard(deckId?:string,designSetId?:string):CardContent{return{id:crypto.randomUUID(),deckId:deckId||this.selectedDeck||this.data()?.decks[0]?.id||'',kind:'text',front:'',answer:'',pronunciation:'',meaning:'',notes:'',tags:[],revision:0,suspended:false,rarity:'common',...(designSetId?{designSetId}:{})};}
  private editorSnapshot():string{return JSON.stringify({editor:this.editor,tags:this.tagInput});}
  private hasUnsavedCard():boolean{return !!this.editor&&this.editorSnapshot()!==this.editorBaseline;}
  async uploadCard(event:Event,back=false):Promise<void>{const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file||!this.editor)return;this.busy.set(true);try{const asset=await readArtwork(file);await this.store.saveAsset(asset);if(back)this.editor.backImage=`asset:${asset.id}`;else this.editor.image=`asset:${asset.id}`;this.editor={...this.editor};this.message.set('Image uploaded locally. Save the card to use it.');}catch(e){this.message.set(String(e));}finally{this.busy.set(false);input.value='';}}
  async uploadCardAudio(event:Event,back=false):Promise<void>{const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file||!this.editor)return;this.busy.set(true);try{const asset=await readAudio(file);await this.store.saveAsset(asset);const key=back?'backAudio':'frontAudio';this.editor={...this.editor,[key]:[...(this.editor[key]??[]),`asset:${asset.id}`]};this.message.set('Audio uploaded locally. Save the card to use it.');}catch(e){this.fail(e);}finally{this.busy.set(false);input.value='';}}
  removeCardAudio(ref:string,back=false):void{if(!this.editor)return;const key=back?'backAudio':'frontAudio';this.editor={...this.editor,[key]:(this.editor[key]??[]).filter(item=>item!==ref)};}
  async suspend(card:CardContent):Promise<void>{try{await this.store.saveCard({...card,suspended:!card.suspended});this.message.set(card.suspended?'Card resumed.':'Card suspended. History preserved.');}catch(e){this.message.set(String(e));}}
  newDeck(deck?:Deck,parentId?:string):void{this.go('library');this.deckEditor=deck?{...deck}:{id:crypto.randomUUID(),name:'',description:'',suspended:false,...(parentId?{parentId}:{})};}
  async saveDeck():Promise<void>{if(!this.deckEditor?.name.trim())return;this.busy.set(true);try{const deck={...this.deckEditor,name:this.deckEditor.name.trim()};if(!deck.designSetId)delete deck.designSetId;await this.store.saveDeck(deck);this.deckEditor=null;this.message.set('Deck saved.');}catch(e){this.message.set(String(e));}finally{this.busy.set(false);}}
  async toggleEffects():Promise<void>{try{await this.store.updatePreferences({effects:!this.data()?.preferences.effects});}catch(e){this.message.set(String(e));}}
  async saveSettings():Promise<void>{try{await this.store.updatePreferences(this.settings);this.message.set('Study settings saved.');}catch(e){this.message.set(String(e));}}
  async saveRewards():Promise<void>{try{await this.store.updateRewardConfig(this.rewardSettings);this.message.set('Unlock thresholds saved. Existing earned cosmetics are preserved; changes apply on future qualifying reviews.');}catch(e){this.message.set(String(e));}}
  async export():Promise<void>{try{await this.fileDelivery.deliver(new Blob([this.store.exportJson()],{type:'application/json'}),`holorecall-export-${dayKey(new Date(),this.timeZone())}.json`);this.message.set('Full backup download requested, including uploaded artwork and progress.');}catch(e){this.fail(e);}}
  async restore(event:Event):Promise<void>{const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;try{if(file.size>100_000_000)throw new Error('Backup is larger than the 100 MB local limit.');await this.store.restoreJson(await file.text());this.message.set('Backup restored.');}catch(e){this.message.set(String(e));}finally{input.value='';}}
}
