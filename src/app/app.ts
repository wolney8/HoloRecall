import { Component, computed, DestroyRef, effect, HostListener, inject, Injector, QueryList, signal, ViewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';
import { LocalStudyStore } from './data/study-store';
import { activeReviews, dayKey, dueCards, hydrateCard, mapRating, RATING_OPTIONS } from '../domain/study';
import { createEmptyCard,fsrs } from 'ts-fsrs';
import { activeRewardEvents, prestigeProgress, RARITIES, rewardProgress } from '../domain/rewards';
import type { CardContent, Deck, DesignSet, FinishPreset, FocusSessionRequest, PrestigePromotion, Rarity, RewardUnlock, StudyExperienceMode } from '../domain/models';
import { FlashcardComponent } from './card';
import { DesignStudioComponent } from './design-studio/design-studio';
import { CollectionComponent } from './collection/collection';
import { ProgressComponent } from './progress/progress';
import { ExchangeComponent, type ExchangeCompletionAction } from './exchange/exchange';
import { AppLifecycle, VisualViewportCoordinator } from './platform/app-lifecycle';
import { PageRevealDirective, ViewportRevealService } from './motion/page-reveal';
import { LibraryViewService } from './library/library-view.service';
import { deckPath, type SearchResult } from '../domain/library';
import { StudySettingsComponent } from './settings/study-settings';
import { effectiveStudyPreset, fsrsParameters } from '../domain/study-settings';
import { FocusComponent, type FocusLaunch } from './focus/focus';
import { AppearanceSettingsComponent } from './settings/appearance-settings';
import { LocalDataSettingsComponent } from './settings/local-data-settings';
import { RewardSettingsComponent } from './settings/reward-settings';
import { DeckSourceControlsComponent } from './authoring/deck-source-controls';
import { CardListRowComponent } from './authoring/card-list-row';
import { CardSourceControlsComponent } from './authoring/card-source-controls';
import { DeckAnkiActionsComponent } from './authoring/deck-anki-actions';
import { DeckJourneyActionsComponent, type DeckManagementAction } from './authoring/deck-journey-actions';
import { SubdeckRowComponent } from './authoring/subdeck-row';
import { SubdeckDisclosureComponent } from './authoring/subdeck-disclosure';
import { JsonAuthoringComponent } from './authoring/json-authoring';
import { AnswerSupportComponent } from './answer-support';

type Screen = 'dashboard' | 'library' | 'focus' | 'study' | 'results' | 'collection' | 'studio' | 'progress' | 'exchange' | 'settings';
interface NavigationContext { label: string; screen: Screen; deckId?: string }
interface ResultAward { event:RewardUnlock|PrestigePromotion;card:CardContent;rarity:Rarity;label:string;prestigeLevel:number }
@Component({
  selector:'app-root', standalone:true,
  imports:[FormsModule,MatButtonModule,MatFormFieldModule,MatInputModule,MatSelectModule,MatProgressBarModule,MatCheckboxModule,MatTooltipModule,FlashcardComponent,DesignStudioComponent,CollectionComponent,ProgressComponent,ExchangeComponent,StudySettingsComponent,FocusComponent,AppearanceSettingsComponent,LocalDataSettingsComponent,RewardSettingsComponent,DeckSourceControlsComponent,CardListRowComponent,CardSourceControlsComponent,DeckAnkiActionsComponent,DeckJourneyActionsComponent,SubdeckRowComponent,SubdeckDisclosureComponent,JsonAuthoringComponent,AnswerSupportComponent,PageRevealDirective],
  templateUrl:'./app.html',
})
export class AppComponent {
  @ViewChildren('ratingTip') private ratingTips!: QueryList<MatTooltip>;
  readonly store=inject(LocalStudyStore);
  readonly lifecycle=inject(AppLifecycle);
  readonly library=inject(LibraryViewService);
  private readonly viewportCoordinator=inject(VisualViewportCoordinator);
  private readonly viewportReveal=inject(ViewportRevealService);
  private readonly injector=inject(Injector);
  readonly data=this.store.data;
  readonly screen=signal<Screen>(this.initialScreen());
  readonly now=signal(new Date());
  readonly busy=signal(false);
  readonly message=signal('');
  readonly messageError=signal(false);
  readonly resultsSkipped=signal(false);
  readonly resultsIntroPlaying=signal(false);
  readonly activeResultSections=signal(0);
  readonly resultSectionStates=signal<Record<string,'waiting'|'active'|'settled'>>({});
  readonly unlockRevealIndex=signal(0);
  readonly unlockRevealPhase=signal<'waiting'|'complete'|'pack'|'revealed'|'settled'>('settled');
  readonly confidenceFeedback=signal<1|2|3|4|5|null>(null);
  readonly studyPresentationCard=signal<CardContent|null>(null);
  readonly studyPresentationRating=signal<1|2|3|4|5|null>(null);
  readonly studyTransition=signal<'idle'|'feedback'|'deal'>('idle');
  readonly studyRecallPeek=signal(false);
  readonly resultCardSide=signal('');
  readonly autoAdvancePaused=signal(false);
  readonly cardAudioPlaying=signal(false);
  readonly feedbackPosition=signal({x:0,y:0});
  readonly openRatingHelp=signal<number|null>(null);
  readonly mobileMoreOpen=signal(false);
  readonly searchResultIndex=signal(0);
  readonly focusLaunch=signal<FocusLaunch|undefined>(undefined);
  readonly settingsDeckId=signal('');
  readonly ankiUpdateFile=signal<File|null>(null);
  readonly ankiSourceMode=signal<'manage'|'update'|'repair'|'mapping'>('update');
  readonly collectionDeckId=signal('');
  readonly collectionLabel=signal('');
  readonly ratingOptions=RATING_OPTIONS;
  readonly tiers=RARITIES;
  readonly Math=Math;
  readonly navigation:{id:Screen;label:string;icon:string}[]=[
    {id:'dashboard',label:'Dashboard',icon:'▦'},{id:'library',label:'Decks',icon:'▤'},
    {id:'study',label:'Study',icon:'◈'},{id:'focus',label:'Focus',icon:'◎'},{id:'collection',label:'Collection',icon:'✧'},
    {id:'studio',label:'Design Studio',icon:'✎'},{id:'progress',label:'Progress',icon:'▥'},
    {id:'exchange',label:'Import / export',icon:'⇄'},{id:'settings',label:'Settings',icon:'⚙'},
  ];
  readonly mobilePrimaryNavigation:{id:Screen|'more';label:string;icon:string}[]=[
    {id:'library',label:'Decks',icon:'▤'},{id:'study',label:'Study',icon:'◈'},
    {id:'collection',label:'Collection',icon:'✧'},{id:'more',label:'More',icon:'•••'},
  ];
  readonly mobileSecondaryNavigation=this.navigation.filter(item=>item.id!=='library'&&item.id!=='study'&&item.id!=='collection');
  search='';selectedDeck='';editor:CardContent|null=null;deckEditor:Deck|null=null;tagInput='';
  authorPreset:'basic'|'image-first'|'reversible'='basic';authorPreviewRevealed=false;
  selectedCardIds=new Set<string>();bulkRarity:Rarity|''='';bulkDesignSetId='__keep__';bulkFinish:FinishPreset|''='';
  bulkDeckId='';bulkTags='';bulkRemoveTags='';bulkDue='';bulkPosition:number|null=null;renameTagFrom='';renameTagTo='';
  private editorBaseline='';
  readonly reviews=computed(()=>this.data()?activeReviews(this.data()!):[]);
  readonly todayReviews=computed(()=>this.reviews().filter(e=>dayKey(new Date(e.timestamp),this.timeZone())===dayKey(this.now(),this.timeZone())));
  readonly ready=computed(()=>this.data()?dueCards(this.data()!,this.now()):[]);
  readonly reviewDue=computed(()=>this.ready().filter(c=>(this.data()?.states[c.id]?.reps??0)>0).length);
  readonly newReady=computed(()=>this.ready().length-this.reviewDue());
  readonly session=computed(()=>this.data()?.session??null);
  readonly selectedStudyMode=computed(()=>this.data()?.preferences.studyMode??'mastery');
  readonly current=computed(()=>this.data()?.cards.find(c=>c.id===this.session()?.queue[0])??null);
  readonly currentPreset=computed(()=>{const data=this.data(),card=this.studyPresentationCard()??this.current();return data?effectiveStudyPreset(data,card?.deckId??this.session()?.scopeDeckId,new Date()):null;});
  readonly displayedCard=computed(()=>this.studyPresentationCard()??this.current());
  readonly revealed=computed(()=>this.session()?.revealed??false);
  readonly displayedRevealed=computed(()=>this.studyPresentationCard()?true:this.revealed());
  readonly studyCardFaceRevealed=computed(()=>this.displayedRevealed()&&!this.studyRecallPeek());
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
  readonly resultRewardRows=computed(()=>{const state=this.data();if(!state)return[];const ids=new Set(this.sessionReviews().map(event=>event.id)),active=activeRewardEvents(state);const contributions=active.filter(event=>event.kind==='contribution'&&ids.has(event.reviewEventId)),prestigeContributions=active.filter(event=>event.kind==='prestige-contribution'&&ids.has(event.reviewEventId)),unlocks=active.filter(event=>event.kind==='unlock'&&ids.has(event.reviewEventId)),promotions=active.filter((event):event is PrestigePromotion=>event.kind==='prestige-promotion'&&ids.has(event.reviewEventId));return [...new Set(this.sessionReviews().map(event=>event.cardId))].map(cardId=>{const card=state.cards.find(item=>item.id===cardId)!;const progress=rewardProgress(state,cardId),prestige=prestigeProgress(state,cardId),promotion=promotions.filter(event=>event.cardId===cardId&&event.kind==='prestige-promotion').at(-1);const gained=contributions.filter(event=>event.cardId===cardId).length,masteryUnlocked=unlocks.some(event=>event.cardId===cardId&&event.kind==='unlock'&&event.rarity===(card.rarity??'common')),prestigeGained=prestigeContributions.filter(event=>event.cardId===cardId).length,prestigeRequired=promotion?.required??prestige.required,prestigeDays=promotion?.required??prestige.days;return{card,progress,prestige,promotion,gained,prestigeGained,prestigeRequired,prestigeDays,showPrestige:progress.earned&&!masteryUnlocked,before:Math.max(0,progress.days-gained),prestigeBefore:promotion?Math.max(0,promotion.required-prestigeGained):Math.max(0,prestige.days-prestigeGained)};});});
  readonly resultUnlocks=computed<ResultAward[]>(()=>{const state=this.data();if(!state)return[];const ids=new Set(this.sessionReviews().map(event=>event.id)),result:ResultAward[]=[];for(const event of activeRewardEvents(state)){const card=state.cards.find(item=>item.id===event.cardId);if(!card||!ids.has(event.reviewEventId))continue;if(event.kind==='unlock')result.push({event,card,rarity:event.rarity,label:`${this.rarityLabel(event.rarity)} · Unlocked`,prestigeLevel:prestigeProgress(state,card.id).level});else if(event.kind==='prestige-promotion')result.push({event,card,rarity:card.rarity??'common',label:`Prestige ${this.roman(event.level)}`,prestigeLevel:event.level});}return result;});
  readonly activeResultUnlock=computed(()=>this.resultUnlocks()[this.unlockRevealIndex()]??null);
  roman(level:number):string{return['','I','II','III','IV','V','VI','VII','VIII','IX','X'][level]??'';}
  private elapsedMs=0;
  private lastTick=performance.now();
  private lastActivity=performance.now();
  private checkpointing=false;
  private ticks=0;
  private timedCard='';
  private resultSessionKey='';
  private initialRecoveryChecked=false;
  private resultUnobserve:(()=>void)[]=[];
  private resultTimers:number[]=[];
  private resultHapticsArmed=false;
  private unlockHapticEvents=new Set<string>();
  private feedbackService?:Promise<import('./platform/interaction-feedback').InteractionFeedback>;
  private confidenceTimer=0;
  private feedbackResolve:(()=>void)|null=null;
  private studyPresentationRun=0;
  private studyDealAnimation:Animation|null=null;
  private autoAdvanceTimer=0;
  private autoAdvanceGeneration=0;
  private autoAdvanceKey='';
  private autoAdvanceDeadline=0;
  private autoAdvanceRemainingMs:number|undefined;
  private answerRevealedAt=0;
  private answerDwellTimer=0;
  private answerDwellResolve:(()=>void)|null=null;
  private recallPeekTimer=0;
  private ankiSourceDeckId='';
  readonly expandedDecks=new Set<string>();
  constructor(){
    void this.store.init();
    effect(()=>{
      const cardId=this.current()?`${this.current()!.id}:${this.current()!.revision}`:'';
      if(cardId!==this.timedCard){this.clearRecallPeek();this.timedCard=cardId;this.elapsedMs=this.session()?.activeMs??0;this.lastTick=performance.now();}
      const state=this.data();
      if(state&&!this.initialRecoveryChecked){this.initialRecoveryChecked=true;if(state.session&&!state.session.endedAt&&state.session.queue.length){this.autoAdvancePaused.set(true);this.autoAdvanceRemainingMs=state.session.autoAdvanceRemainingMs;queueMicrotask(()=>void this.store.updateSessionAutoAdvance(true,this.autoAdvanceRemainingMs).catch(()=>undefined));}if(this.screen()==='study'&&state.session?.endedAt&&!state.session.queue.length){queueMicrotask(()=>this.showResults());return;}}
      const resultKey=state&&this.screen()==='results'&&state.session?.endedAt?`${state.session.id}:${state.session.endedAt}`:'';
      if(resultKey&&resultKey!==this.resultSessionKey){this.resultSessionKey=resultKey;queueMicrotask(()=>this.startResultsPresentation());}
      const autoKey=`${this.screen()}:${state?.session?.id??''}:${this.current()?.id??''}:${this.revealed()}:${this.studyTransition()}:${this.busy()}:${this.lifecycle.active()}:${this.lifecycle.focused()}:${this.cardAudioPlaying()}:${this.autoAdvancePaused()}:${this.currentPreset()?.autoAdvanceEnabled??false}:${this.currentPreset()?.autoRevealSeconds??0}`;
      queueMicrotask(()=>this.syncAutoAdvance(autoKey));
    });
    const activity=()=>{this.lastActivity=performance.now();};
    const unsubscribeLifecycle=this.lifecycle.subscribe(active=>{if(!active||!this.lifecycle.focused()){void this.pauseAutoAdvance(true);this.cancelStudyDealAnimation();this.settleConfidenceFeedback();this.settleAnswerDwell();this.clearRecallPeek();if(!active){void this.checkpoint();if(this.screen()==='results')this.skipResults();else this.clearResultMotion();}}else{this.lastTick=performance.now();void this.store.refresh().catch(()=>undefined);}});
    let destroyed=false,nativeBackCleanup:(()=>Promise<void>)|undefined;
    void import('./platform/native-navigation').then(module=>this.injector.get(module.NativeBackNavigation).connect(()=>this.handleNativeBack())).then(cleanup=>{if(destroyed)void cleanup();else nativeBackCleanup=cleanup;}).catch(()=>undefined);
    const timer=setInterval(()=>{
      const tick=performance.now();
      if(this.screen()==='study'&&this.current()&&this.lifecycle.active()&&this.lifecycle.focused()&&!this.busy()&&tick-this.lastActivity<60_000){this.elapsedMs=Math.min((this.currentPreset()?.maxAnswerSeconds??120)*1000,this.elapsedMs+Math.min(1500,tick-this.lastTick));}
      this.lastTick=tick;
      if(++this.ticks%5===0)void this.checkpoint();
      if(this.ticks%30===0)this.now.set(new Date());
    },1000);
    document.addEventListener('pointerdown',activity);document.addEventListener('keydown',activity);
    inject(DestroyRef).onDestroy(()=>{destroyed=true;void nativeBackCleanup?.();clearInterval(timer);this.clearAutoAdvanceTimer(false);this.clearRecallPeek();this.clearResultMotion();this.cancelStudyPresentation();document.removeEventListener('pointerdown',activity);document.removeEventListener('keydown',activity);unsubscribeLifecycle();});
  }
  private initialScreen():Screen{const value=location.hash.slice(1);return ['dashboard','library','focus','study','results','collection','studio','progress','exchange','settings'].includes(value)?value as Screen:'dashboard';}
  private async checkpoint():Promise<void>{if(this.checkpointing||this.busy()||this.screen()!=='study'||!this.current()||this.elapsedMs<= (this.session()?.activeMs??0)+500)return;this.checkpointing=true;try{await this.store.updateSessionTime(Math.round(this.elapsedMs));}catch{/* Retain the unsaved current-card time locally; review is authoritative. */}finally{this.checkpointing=false;}}
  timeZone():string{return this.data()?.preferences.timeZone??'Europe/London';}
  predictedInterval(rating:1|2|3|4|5):string{const data=this.data(),card=this.displayedCard(),preset=this.currentPreset();if(!data||!card||!preset)return'';const previous=data.states[card.id]?hydrateCard(data.states[card.id]!):createEmptyCard(new Date());const result=fsrs(fsrsParameters(preset)).next(previous,new Date(),mapRating(rating)).card,days=result.scheduled_days;return days<1?'Soon':days===1?'1 day':`${days} days`;}
  visibleTimer():string{const seconds=Math.floor(this.elapsedMs/1000);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
  autoAdvanceStatus():string{const preset=this.currentPreset();if(!preset?.autoAdvanceEnabled)return'';if(this.autoAdvancePaused())return'Auto Advance paused';if(this.cardAudioPlaying())return'Auto Advance · audio playing';if(this.revealed())return'Auto Advance · choose a rating';return preset.autoRevealSeconds?`Auto reveal · ${preset.autoRevealSeconds}s`:'Auto Advance · manual reveal';}
  private prepareAutoAdvanceSession():void{this.clearRecallPeek();this.clearAutoAdvanceTimer(false);this.autoAdvanceKey='';this.autoAdvanceRemainingMs=undefined;this.answerRevealedAt=0;this.autoAdvancePaused.set(false);}
  private syncAutoAdvance(_dependencyKey:string):void{
    const session=this.session(),card=this.current(),preset=this.currentPreset();
    if(this.screen()!=='study'||!session||!card||session.endedAt||!preset?.autoAdvanceEnabled){this.clearAutoAdvanceTimer(false);return;}
    if(this.studyTransition()!=='idle'||this.busy()){this.clearAutoAdvanceTimer(true);return;}
    const identity=`${session.id}:${card.id}`;
    if(identity!==this.autoAdvanceKey){this.clearAutoAdvanceTimer(false);this.autoAdvanceKey=identity;this.autoAdvanceRemainingMs=session.autoAdvanceRemainingMs;this.autoAdvancePaused.set(!this.lifecycle.active()||!this.lifecycle.focused()||!!session.autoAdvancePaused);this.answerRevealedAt=0;}
    if(this.revealed()){this.clearAutoAdvanceTimer(false);if(!this.answerRevealedAt)this.answerRevealedAt=performance.now();return;}
    if(this.autoAdvancePaused()||!this.lifecycle.active()||!this.lifecycle.focused()||this.cardAudioPlaying()){this.clearAutoAdvanceTimer(true);return;}
    const duration=this.autoAdvanceRemainingMs??Math.max(0,(preset.autoRevealSeconds??0)*1000);
    if(!duration||this.autoAdvanceTimer)return;
    const generation=++this.autoAdvanceGeneration,sessionId=session.id,cardId=card.id;this.autoAdvanceRemainingMs=undefined;this.autoAdvanceDeadline=performance.now()+duration;
    this.autoAdvanceTimer=window.setTimeout(()=>{this.autoAdvanceTimer=0;this.autoAdvanceDeadline=0;if(generation!==this.autoAdvanceGeneration||this.session()?.id!==sessionId||this.current()?.id!==cardId||this.autoAdvancePaused()||!this.lifecycle.active()||!this.lifecycle.focused()||this.revealed()||this.busy()||this.cardAudioPlaying())return;void this.reveal();},duration);
  }
  private clearAutoAdvanceTimer(preserve:boolean):void{if(preserve&&this.autoAdvanceTimer&&this.autoAdvanceDeadline)this.autoAdvanceRemainingMs=Math.max(0,this.autoAdvanceDeadline-performance.now());if(this.autoAdvanceTimer)window.clearTimeout(this.autoAdvanceTimer);this.autoAdvanceTimer=0;this.autoAdvanceDeadline=0;this.autoAdvanceGeneration++;}
  async pauseAutoAdvance(interruption=false):Promise<void>{if(!this.session()||(!interruption&&!this.currentPreset()?.autoAdvanceEnabled))return;this.clearAutoAdvanceTimer(true);this.autoAdvancePaused.set(true);try{await this.store.updateSessionAutoAdvance(true,this.autoAdvanceRemainingMs);}catch(error){if(!interruption)this.fail(error);}}
  async resumeAutoAdvance():Promise<void>{if(!this.currentPreset()?.autoAdvanceEnabled||!this.lifecycle.active()||!this.lifecycle.focused())return;this.autoAdvancePaused.set(false);try{await this.store.updateSessionAutoAdvance(false,undefined);}catch(error){this.autoAdvancePaused.set(true);this.fail(error);}}
  toggleAutoAdvance():void{void (this.autoAdvancePaused()?this.resumeAutoAdvance():this.pauseAutoAdvance());}
  onCardAudioPlaying(playing:boolean):void{this.cardAudioPlaying.set(playing);}
  private async waitForAnswerDwell(run:number):Promise<void>{const seconds=this.currentPreset()?.autoAdvanceEnabled?this.currentPreset()?.autoAnswerSeconds??0:0;if(!seconds||!this.answerRevealedAt)return;const remaining=Math.max(0,seconds*1000-(performance.now()-this.answerRevealedAt));if(!remaining)return;this.settleAnswerDwell();await new Promise<void>(resolve=>{this.answerDwellResolve=resolve;this.answerDwellTimer=window.setTimeout(()=>this.settleAnswerDwell(),Math.min(120000,remaining));});if(run!==this.studyPresentationRun)return;}
  go(screen:Screen):void{if(screen!=='library'&&this.hasUnsavedCard()&&!confirm('Discard the unsaved card changes?'))return;void this.checkpoint();if(this.screen()==='results'&&screen!=='results'){this.clearResultMotion();this.resultsIntroPlaying.set(false);}if(this.screen()==='study'&&screen!=='study'){this.clearAutoAdvanceTimer(true);this.clearRecallPeek();this.cancelStudyPresentation();}if(screen!=='library')this.selectedCardIds=new Set();if(screen!=='focus')this.focusLaunch.set(undefined);if(screen==='settings')this.settingsDeckId.set('');if(screen==='collection'){this.collectionDeckId.set('');this.collectionLabel.set('');}if(screen==='exchange'&&this.screen()!=='library')this.selectedDeck='';this.mobileMoreOpen.set(false);this.screen.set(screen);history.replaceState(null,'',`#${screen}`);this.editor=null;this.editorBaseline='';this.deckEditor=null;this.message.set('');this.messageError.set(false);window.scrollTo({top:0,behavior:'instant'});setTimeout(()=>document.getElementById('main-content')?.focus({preventScroll:true}));}
  navigationContext():NavigationContext[]{
    const screen=this.screen(),deckId=this.editor?.deckId||this.deckEditor?.id||this.settingsDeckId()||(screen==='collection'?this.collectionDeckId():'')||(screen==='study'||screen==='results'?this.current()?.deckId||this.session()?.scopeDeckId:'')||(screen==='exchange'?this.selectedDeck:'');
    const decks=deckId?this.deckContext(deckId):[];
    if(screen==='library')return [{label:'Decks',screen:'library'},...decks.map(deck=>({label:deck.name,screen:'library' as const,deckId:deck.id})),...(this.editor?[{label:this.editor.revision?'Edit card':'New card',screen:'library' as const}]:this.deckEditor?[{label:this.deckEditor.name||'New deck',screen:'library' as const}]:[])];
    if(screen==='study'||screen==='results')return [{label:'Decks',screen:'library'},...decks.map(deck=>({label:deck.name,screen:'library' as const,deckId:deck.id})),{label:screen==='results'?'Session complete':this.session()?.mode==='practice'?'Practice':'Study',screen}];
    if(screen==='focus')return [{label:'Decks',screen:'library'},{label:'Focus',screen:'focus'}];
    if(screen==='settings'&&this.settingsDeckId())return [{label:'Decks',screen:'library'},...decks.map(deck=>({label:deck.name,screen:'library' as const,deckId:deck.id})),{label:'Study settings',screen:'settings'}];
    if(screen==='collection'&&this.collectionDeckId())return [{label:'Decks',screen:'library'},...decks.map(deck=>({label:deck.name,screen:'library' as const,deckId:deck.id})),{label:'Cards',screen:'collection'}];
    if(screen==='exchange'&&this.selectedDeck)return [{label:'Decks',screen:'library'},...decks.map(deck=>({label:deck.name,screen:'library' as const,deckId:deck.id})),{label:this.ankiSourceMode()==='manage'?'Manage Anki source':this.ankiSourceMode()==='mapping'?'Advanced field enrichment':this.ankiSourceMode()==='repair'?'Repair imported content':'Update from Anki',screen:'exchange'}];
    const title=({dashboard:'Dashboard',library:'Decks',focus:'Focus',study:'Study',results:'Session complete',collection:'Collection',studio:'Design Studio',progress:'Progress',exchange:'Import & export',settings:'Settings'} satisfies Record<Screen,string>)[screen];
    return [{label:title,screen}];
  }
  private deckContext(deckId:string):Deck[]{const state=this.data();if(!state)return[];const byId=new Map(state.decks.map(deck=>[deck.id,deck])),path:Deck[]=[];let current=byId.get(deckId),guard=0;while(current&&guard++<state.decks.length){path.unshift(current);current=current.parentId?byId.get(current.parentId):undefined;}return path;}
  mobileTitle():string{return this.navigationContext().at(-1)?.label??'HoloRecall';}
  breadcrumbAncestors():NavigationContext[]{return this.navigationContext().slice(0,-1);}
  mobileParentTitle():string{return this.navigationContext().at(-2)?.label??'';}
  mobileHasBack():boolean{return this.navigationContext().length>1||!!this.editor||!!this.deckEditor;}
  mobileBack():void{if(this.editor){this.cancelCardEditor();return;}if(this.deckEditor){this.cancelDeckEditor();return;}const trail=this.navigationContext(),parent=trail.at(-2);if(parent)this.navigateContext(parent);else this.go('dashboard');}
  navigateContext(item:NavigationContext):void{if(item.deckId){this.selectedDeck=item.deckId;for(const deck of this.deckContext(item.deckId))this.expandedDecks.add(deck.id);this.go('library');setTimeout(()=>document.getElementById(`deck-${item.deckId}`)?.scrollIntoView({block:'start'}));return;}this.go(item.screen);}
  mobileNavActive(id:Screen|'more'):boolean{return id==='more'?this.mobileMoreOpen()||['dashboard','focus','progress','studio','exchange','settings','results'].includes(this.screen()):this.screen()===id;}
  toggleMobileMore():void{this.mobileMoreOpen.update(open=>!open);}
  openExchange(deckId=''):void{if(deckId&&this.data()?.decks.some(deck=>deck.id===deckId&&this.isAnkiDeck(deck))){this.openAnkiSource(deckId,'update');return;}this.selectedDeck='';this.ankiUpdateFile.set(null);this.go('exchange');}
  openAnkiSource(deckId:string,mode:'manage'|'update'|'repair'|'mapping'):void{this.ankiSourceDeckId=deckId;this.selectedDeck=deckId;this.ankiSourceMode.set(mode);this.ankiUpdateFile.set(null);if(mode==='update'){document.getElementById('contextual-anki-update')?.click();return;}if(this.screen()!=='exchange')this.go('exchange');this.selectedDeck=deckId;}
  selectAnkiUpdatePackage(event:Event):void{const input=event.target as HTMLInputElement,file=input.files?.[0],deckId=this.ankiSourceDeckId||this.selectedDeck;input.value='';if(!file)return;this.ankiUpdateFile.set(file);if(this.screen()!=='exchange')this.go('exchange');this.selectedDeck=deckId;}
  cancelAnkiUpdate():void{const deckId=this.selectedDeck;this.ankiUpdateFile.set(null);this.go('library');if(deckId){this.selectedDeck=deckId;this.expandedDecks.add(deckId);setTimeout(()=>document.getElementById(`deck-${deckId}`)?.scrollIntoView({block:'start'}));}}
  finishAnkiUpdate(deckId:string):void{this.ankiUpdateFile.set(null);this.selectedDeck=deckId;this.go('library');this.selectedDeck=deckId;for(const deck of this.deckContext(deckId))this.expandedDecks.add(deck.id);setTimeout(()=>document.getElementById(`deck-${deckId}`)?.scrollIntoView({block:'start'}));}
  handleExchangeCompletion(event:ExchangeCompletionAction):void{this.ankiUpdateFile.set(null);if(event.action==='review'){this.browseDecks(event.deckIds,event.label);return;}if(event.action==='search'){this.browseDecks(event.deckIds,event.label,true);return;}if(event.action==='study'){void this.study(event.deckId);return;}this.finishAnkiUpdate(event.deckId);}
  isAnkiDeck(deck:Deck):boolean{return deck.ankiSource?.kind==='anki';}
  isExistingDeck(id:string):boolean{return this.data()?.decks.some(deck=>deck.id===id)??false;}
  openStudySettings(deckId?:string):void{if(this.screen()==='study')void this.pauseAutoAdvance(true);this.go('settings');this.settingsDeckId.set(deckId??'');}
  topDecks():Deck[]{const state=this.data();if(!state)return[];const ids=new Set(state.decks.map(deck=>deck.id));return state.decks.filter(deck=>!deck.parentId||!ids.has(deck.parentId));}
  deckChildren(id:string):Deck[]{return this.data()?.decks.filter(deck=>deck.parentId===id)??[];}
  private deckBranchIds(id:string):Set<string>{const state=this.data(),ids=new Set<string>([id]);if(!state)return ids;let changed=true;while(changed){changed=false;for(const deck of state.decks)if(deck.parentId&&ids.has(deck.parentId)&&!ids.has(deck.id)){ids.add(deck.id);changed=true;}}return ids;}
  browseDeck(deckId:string,focusSearch=false):void{this.browseDecks([deckId],this.deckName(deckId),focusSearch);}
  browseDecks(deckIds:string[],label:string,focusSearch=false):void{const ids=new Set<string>();for(const deckId of deckIds)for(const id of this.deckBranchIds(deckId))ids.add(id);this.library.setQuery('');this.library.clear();this.library.setFilter('deckIds',[...ids]);this.go('collection');this.collectionDeckId.set(deckIds.length===1?deckIds[0]!:'');this.collectionLabel.set(label);if(focusSearch)setTimeout(()=>document.getElementById('collection-search')?.focus());}
  clearCollectionContext():void{this.collectionDeckId.set('');this.collectionLabel.set('');}
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
  designFor(card:CardContent):DesignSet|undefined{return this.store.designFor(card);}
  presentationFor(card:CardContent){return this.store.presentationFor(card);}
  hasAnswerSupport(card:CardContent):boolean{return !!card.details?.length||!!card.notes.replace(/^Imported source\s*·[^\n]*(?:\n\n)?/i,'').trim()||!this.presentationFor(card).answerInterpretation&&!!(card.meaning||card.interpretation);}
  designSourceLabel(card:CardContent):string{const resolved=this.store.resolvedDesignFor(card);return resolved.source==='card-override'?`Override · ${resolved.design.name}`:`Inherited · ${resolved.design.name}`;}
  deckEditorDesign():DesignSet{const state=this.data(),id=this.deckEditor?.designSetId;return state?.designs.find(design=>design.id===id)??this.store.resolvedDesignFor(this.deckDesignSample()??this.blankCard(this.deckEditor?.id)).design;}
  deckDesignSample():CardContent|undefined{return this.deckEditor?this.deckCards(this.deckEditor.id)[0]:undefined;}
  deckOverrideCount():number{return this.deckEditor?this.deckCards(this.deckEditor.id).filter(card=>!!card.designSetId).length:0;}
  deckInheritedCount():number{return this.deckEditor?this.deckCards(this.deckEditor.id).length-this.deckOverrideCount():0;}
  async returnDeckDesignOverrides():Promise<void>{if(!this.deckEditor||this.busy())return;this.busy.set(true);try{await this.store.returnDeckCardsToInherited(this.deckEditor.id);this.message.set('Card overrides cleared. Cards now follow the deck Design Set; learning history was unchanged.');}catch(error){this.fail(error);}finally{this.busy.set(false);}}
  shownRarity(card:CardContent):Rarity{return this.data()&&rewardProgress(this.data()!,card.id).earned?(card.rarity??'common'):'common';}
  frameFor(card:CardContent):string{const design=this.designFor(card);return this.store.mediaUrl(design?.frames?.[this.shownRarity(card)]||design?.frame);}
  rarityLabel(rarity?:Rarity):string{return this.tiers.find(t=>t.id===(rarity??'common'))?.label??'Common';}
  unlock(card:CardContent){return rewardProgress(this.data()!,card.id);}
  prestige(card:CardContent){return prestigeProgress(this.data()!,card.id);}
  async chooseStudyMode(mode:StudyExperienceMode):Promise<void>{try{await this.store.updatePreferences({studyMode:mode});}catch(error){this.fail(error);}}
  studyModeLabel(mode=this.session()?.experienceMode??this.selectedStudyMode()):string{return mode==='anki'?'Anki mode':mode==='free-revision'?'Free revision':'Mastery mode';}
  studyModeHelp(mode=this.selectedStudyMode()):string{return mode==='anki'?'Scheduled study with learning and relearning repeats.':mode==='free-revision'?'Practice without FSRS, due-date or reward changes.':'Scheduled study with HoloRecall confidence, mastery progress and collectible rewards.';}
  async study(deckId?:string):Promise<void>{this.busy.set(true);try{await this.store.startSession(deckId,this.selectedStudyMode());this.prepareAutoAdvanceSession();this.elapsedMs=this.session()?.activeMs??0;this.lastActivity=performance.now();this.go(this.current()?'study':'results');if(!this.current())this.startResultsPresentation();}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  openFocus(launch:FocusLaunch={}):void{this.focusLaunch.set(launch);this.go('focus');}
  async startFocus(request:FocusSessionRequest):Promise<void>{this.busy.set(true);try{await this.store.startFocusSession(request);this.prepareAutoAdvanceSession();this.elapsedMs=0;this.lastActivity=performance.now();this.go(this.current()?'study':'results');if(!this.current())this.startResultsPresentation();}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  startSelection(mode:'scheduled'|'practice',ids:string[],label:string):void{if(!ids.length)return;void this.startFocus({mode,label,criteria:{version:1,explicitCardIds:[...ids]},order:mode==='scheduled'?'due':'deck',limit:Math.min(10_000,ids.length)});}
  practiceMissedAgain():void{const cards=this.practiceLowCards();if(!cards.length)return;this.openFocus({explicitCardIds:cards.map(card=>card.id),sourceLabel:'Low-confidence cards'});}
  viewPracticeCards():void{this.go('collection');}
  returnFromPractice():void{this.go('library');}
  async reveal():Promise<void>{if(!this.current()||this.busy())return;this.clearRecallPeek();this.clearAutoAdvanceTimer(false);this.busy.set(true);try{await this.store.revealSession(Math.round(this.elapsedMs));this.feedback('cardReveal');this.answerRevealedAt=performance.now();setTimeout(()=>document.querySelector<HTMLElement>('.study-card-area .answer h3, .study-card-area .answer-text')?.focus({preventScroll:true}));}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  async rate(rating:1|2|3|4|5):Promise<void>{
    const card=this.current(),session=this.session();if(!card||!session||!this.revealed()||this.busy())return;this.clearRecallPeek();this.clearAutoAdvanceTimer(false);
    this.settleAnswerDwell();const run=++this.studyPresentationRun;this.busy.set(true);this.studyPresentationCard.set(card);
    try{
      if(session.mode==='practice')await this.store.practice(card.id,rating,session.id,crypto.randomUUID(),Math.round(this.elapsedMs));
      else await this.store.review(card.id,rating,session.id,crypto.randomUUID(),Math.round(this.elapsedMs));
      if(run!==this.studyPresentationRun)return;
      this.feedback('ratingAccepted',rating);
      document.querySelector('.study-card-area hr-card')?.dispatchEvent(new Event('stop-card-audio'));this.studyPresentationRating.set(rating);this.elapsedMs=0;this.now.set(new Date());this.message.set('');
      await this.playConfidenceFeedback(rating);
      if(run!==this.studyPresentationRun)return;
      await this.waitForAnswerDwell(run);
      if(run!==this.studyPresentationRun)return;
      await this.playDealTransition(run);
      if(run!==this.studyPresentationRun)return;
      this.clearStudyPresentation();
      if(!this.current()){this.feedback('sessionComplete');this.go('results');this.startResultsPresentation(true);}
    }catch(e){this.clearStudyPresentation();this.fail(e);}finally{if(run===this.studyPresentationRun)this.busy.set(false);}
  }
  async undo():Promise<void>{const session=this.session();if(!session?.lastReviewCardId||this.busy())return;this.busy.set(true);try{await this.store.undo(session.lastReviewCardId,session.id);this.elapsedMs=0;this.message.set('');if(this.current())this.go('study');}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  async endStudy():Promise<void>{if(!this.session()||this.busy())return;this.busy.set(true);try{if(this.current())await this.store.updateSessionTime(Math.round(this.elapsedMs));await this.store.endSession();this.go('results');this.startResultsPresentation(true);}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  showResults():void{this.go('results');this.startResultsPresentation();}
  motionEnabled():boolean{return !!this.data()?.preferences.effects&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
  showResultsSkip():boolean{return this.motionEnabled()&&!this.resultsSkipped()&&(this.resultsIntroPlaying()||this.activeResultSections()>0||['waiting','complete','pack'].includes(this.unlockRevealPhase()));}
  resultSectionState(id:string):'waiting'|'active'|'settled'{return this.resultSectionStates()[id]??'settled';}
  skipResults():void{this.resultsSkipped.set(true);this.resultsIntroPlaying.set(false);this.clearResultMotion();this.resultCardSide.set('');this.unlockRevealPhase.set('settled');this.resultSectionStates.update(states=>Object.fromEntries(Object.keys(states).map(key=>[key,'settled'])));}
  private startResultsPresentation(live=false):void{
    const session=this.session();if(session?.endedAt)this.resultSessionKey=`${session.id}:${session.endedAt}`;
    const practice=session?.mode==='practice';this.clearResultMotion();this.resultHapticsArmed=live;if(live)this.unlockHapticEvents.clear();this.resultsSkipped.set(!this.motionEnabled());this.resultsIntroPlaying.set(this.motionEnabled());this.activeResultSections.set(0);this.resultCardSide.set('');this.unlockRevealIndex.set(0);this.unlockRevealPhase.set(!practice&&this.motionEnabled()&&this.resultUnlocks().length?'waiting':'settled');this.resultSectionStates.set(Object.fromEntries((practice?['definitions']:['cosmetics','definitions']).map(key=>[key,this.motionEnabled()?'waiting':'settled'])));
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
  continueUnlockReveal():void{const next=this.unlockRevealIndex()+1;this.resultCardSide.set('');if(next>=this.resultUnlocks().length){this.unlockRevealPhase.set('settled');this.resultHapticsArmed=false;return;}this.unlockRevealIndex.set(next);if(!this.motionEnabled()||this.resultsSkipped()){this.unlockRevealPhase.set('settled');this.resultHapticsArmed=false;return;}this.unlockRevealPhase.set('pack');this.resultTimers.push(window.setTimeout(()=>{this.unlockRevealPhase.set('revealed');this.hapticForActiveUnlock();},650));}
  unlockContinueLabel():string{return this.unlockRevealIndex()+1<this.resultUnlocks().length?'Continue':'Keep cards';}
  viewUnlockedCollection():void{this.go('collection');}
  private beginUnlockReveal():void{if(!this.resultUnlocks().length||this.unlockRevealPhase()!=='waiting')return;if(!this.motionEnabled()||this.resultsSkipped()){this.unlockRevealPhase.set('settled');this.resultHapticsArmed=false;return;}this.resultTimers.push(window.setTimeout(()=>this.unlockRevealPhase.set('complete'),1250),window.setTimeout(()=>this.unlockRevealPhase.set('pack'),1650),window.setTimeout(()=>{this.unlockRevealPhase.set('revealed');this.hapticForActiveUnlock();},2320));}
  private hapticForActiveUnlock():void{const unlock=this.activeResultUnlock();if(!this.resultHapticsArmed||!unlock||this.unlockHapticEvents.has(unlock.event.id))return;this.unlockHapticEvents.add(unlock.event.id);this.feedback('cosmeticUnlock');}
  private clearResultMotion():void{this.resultHapticsArmed=false;for(const unobserve of this.resultUnobserve)unobserve();this.resultUnobserve=[];for(const timer of this.resultTimers)window.clearTimeout(timer);this.resultTimers=[];this.activeResultSections.set(0);}
  toggleRatingHelp(rating:number,tip:MatTooltip,event:MouseEvent):void{event.stopPropagation();const close=this.openRatingHelp()===rating;this.ratingTips.forEach(item=>item.hide(0));this.openRatingHelp.set(close?null:rating);if(!close)tip.show(0);}
  private async playConfidenceFeedback(rating:1|2|3|4|5):Promise<void>{
    if(!this.motionEnabled()){this.studyTransition.set('feedback');await new Promise<void>(resolve=>window.setTimeout(resolve,40));return;}
    const stage=document.querySelector<HTMLElement>('[data-testid="study-deck-stage"]')?.getBoundingClientRect();
    this.feedbackPosition.set({x:stage?stage.left+stage.width/2:innerWidth/2,y:stage?stage.top+stage.height/2:innerHeight/2});
    this.studyTransition.set('feedback');this.confidenceFeedback.set(rating);
    await new Promise<void>(resolve=>{this.feedbackResolve=resolve;this.confidenceTimer=window.setTimeout(()=>this.settleConfidenceFeedback(),900);});
  }
  private async playDealTransition(run:number):Promise<void>{
    if(!this.motionEnabled()||!this.lifecycle.active()||!this.lifecycle.focused()||run!==this.studyPresentationRun)return;
    this.studyTransition.set('deal');
    const stage=document.querySelector<HTMLElement>('[data-testid="study-deck-stage"]');
    if(!stage)return;
    const outgoing=stage.animate([{opacity:1,transform:'translateX(0) rotate(0)'},{opacity:0,transform:'translateX(-34px) rotate(-1.5deg)'}],{duration:180,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'});
    let owned:Animation=outgoing;
    this.studyDealAnimation=outgoing;
    try{
      await Promise.race([outgoing.finished.catch(()=>undefined),new Promise(resolve=>window.setTimeout(resolve,260))]);
      if(run!==this.studyPresentationRun||!this.lifecycle.active()||!this.lifecycle.focused())return;
      this.studyPresentationCard.set(null);await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
      if(run!==this.studyPresentationRun||!this.lifecycle.active()||!this.lifecycle.focused())return;
      // The outgoing fill belongs to the previous card. Cancel it before the
      // incoming animation so it can never hide a later card after that
      // animation releases its temporary effect.
      outgoing.cancel();
      if(this.current()){
        const incoming=stage.animate([{opacity:0,transform:'translateX(32px) rotate(1.5deg)'},{opacity:1,transform:'translateX(0) rotate(0)'}],{duration:260,easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
        owned=incoming;
        this.studyDealAnimation=incoming;
        await Promise.race([incoming.finished.catch(()=>undefined),new Promise(resolve=>window.setTimeout(resolve,340))]);
        if(run===this.studyPresentationRun&&this.lifecycle.active()&&this.lifecycle.focused())this.feedback('cardDeal');
      }
    }finally{
      if(this.studyDealAnimation===owned){owned.cancel();this.studyDealAnimation=null;}
    }
  }
  handleStudyCardFlip(revealed:boolean):void{
    if(!this.displayedRevealed()){if(revealed)void this.reveal();return;}
    this.clearRecallPeek();
    if(!revealed){this.studyRecallPeek.set(true);this.recallPeekTimer=window.setTimeout(()=>{this.recallPeekTimer=0;this.studyRecallPeek.set(false);},2500);}
  }
  resultCardRevealed(id:string):boolean{return this.resultCardSide()===id;}
  setResultCardRevealed(id:string,revealed:boolean):void{this.resultCardSide.set(revealed?id:'');}
  private clearRecallPeek():void{if(this.recallPeekTimer)window.clearTimeout(this.recallPeekTimer);this.recallPeekTimer=0;this.studyRecallPeek.set(false);}
  private settleConfidenceFeedback():void{window.clearTimeout(this.confidenceTimer);this.confidenceTimer=0;this.confidenceFeedback.set(null);const resolve=this.feedbackResolve;this.feedbackResolve=null;resolve?.();}
  private settleAnswerDwell():void{window.clearTimeout(this.answerDwellTimer);this.answerDwellTimer=0;const resolve=this.answerDwellResolve;this.answerDwellResolve=null;resolve?.();}
  private cancelStudyDealAnimation():void{this.studyDealAnimation?.cancel();this.studyDealAnimation=null;}
  private clearStudyPresentation():void{this.settleConfidenceFeedback();this.settleAnswerDwell();this.cancelStudyDealAnimation();this.studyPresentationCard.set(null);this.studyPresentationRating.set(null);this.studyTransition.set('idle');}
  private cancelStudyPresentation():void{this.studyPresentationRun++;this.clearStudyPresentation();this.busy.set(false);}
  duration(ms:number):string{const seconds=Math.round(ms/1000);if(ms>0&&seconds===0)return'<1s';return seconds>=60?`${Math.floor(seconds/60)}m ${seconds%60}s`:`${seconds}s`;}
  private fail(error:unknown):void{this.feedback('error');this.messageError.set(true);this.message.set(error instanceof Error?error.message:String(error));}
  private feedback(cue:'cardReveal'|'ratingAccepted'|'cardDeal'|'sessionComplete'|'cosmeticUnlock'|'error',rating?:1|2|3|4|5):void{this.feedbackService??=import('./platform/interaction-feedback').then(module=>this.injector.get(module.InteractionFeedback));void this.feedbackService.then(service=>cue==='ratingAccepted'?service.ratingAccepted(rating!):service[cue]()).catch(()=>undefined);}
  private handleNativeBack():boolean{if(this.editor){this.cancelCardEditor();return true;}if(this.deckEditor){this.cancelDeckEditor();return true;}if(this.screen()==='dashboard')return false;if(this.screen()==='study'){this.go('library');return true;}this.go('dashboard');return true;}
  @HostListener('document:pointerdown',['$event']) dismissRatingHelp(event:PointerEvent):void{if(!(event.target as HTMLElement).closest('.rating-info')){this.openRatingHelp.set(null);this.ratingTips?.forEach(tip=>tip.hide(0));}}
  @HostListener('document:keydown',['$event']) key(event:KeyboardEvent):void{if(event.key==='Escape'){this.openRatingHelp.set(null);this.mobileMoreOpen.set(false);this.ratingTips?.forEach(tip=>tip.hide(0));return;}const target=event.target as HTMLElement;if(this.screen()!=='study'||target.closest('input,textarea,select,button,a,[role="button"],[role="combobox"]')||event.altKey||event.ctrlKey||event.metaKey||event.repeat)return;if(event.key.toLocaleLowerCase()==='a'&&this.currentPreset()?.autoAdvanceEnabled){event.preventDefault();this.toggleAutoAdvance();return;}if((event.code==='Space'||event.key==='Enter')&&!this.revealed()){event.preventDefault();void this.reveal();}if(this.revealed()&&/^[1-5]$/.test(event.key)){event.preventDefault();void this.rate(Number(event.key)as 1|2|3|4|5);}}
  edit(card?:CardContent,deckId?:string):void{this.go('library');if(this.screen()!=='library')return;this.tagInput=card?.tags.join(', ')??'';this.authorPreset=card?.kind==='visual'?'image-first':'basic';this.authorPreviewRevealed=false;if(card){const resolved=this.presentationFor(card);this.editor=structuredClone({...card,presentation:{...card.presentation,profile:card.presentation?.profile??resolved.profile,artRole:card.presentation?.artRole??resolved.artRole}});}else this.editor=this.blankCard(deckId);this.editorBaseline=this.editorSnapshot();setTimeout(()=>document.getElementById('card-front')?.focus());}
  duplicateCard(card:CardContent):void{this.edit({...structuredClone(card),id:crypto.randomUUID(),revision:0},card.deckId);this.message.set('Duplicate draft created. Review it before saving.');}
  setAuthorPreset(preset:'basic'|'image-first'|'reversible'):void{if(!this.editor)return;this.authorPreset=preset;this.editor.kind=preset==='image-first'?'visual':'text';this.editor={...this.editor};}
  cancelCardEditor():void{if(this.hasUnsavedCard()&&!confirm('Discard the unsaved card changes?'))return;this.editor=null;this.editorBaseline='';}
  async saveCard(addAnother=false):Promise<void>{if(!this.editor||this.busy())return;this.busy.set(true);try{let card={...this.editor,front:this.editor.front.trim(),answer:this.editor.answer.trim(),tags:this.tagInput.split(',').map(s=>s.trim()).filter(Boolean)};if(!card.designSetId)delete card.designSetId;if(!card.finish)delete card.finish;const cards=[card];if(this.authorPreset==='reversible'&&!card.revision){const siblingGroupId=card.siblingGroupId??`siblings-${crypto.randomUUID()}`;card={...card,siblingGroupId};cards[0]=card;cards.push({...card,id:crypto.randomUUID(),front:card.answer,answer:card.front,frontAudio:card.backAudio,backAudio:card.frontAudio,pronunciation:'',meaning:card.meaning,revision:0});}await this.store.saveCards(cards);this.message.set(cards.length===2?'Two reversible cards saved. Review history was not changed.':'Card saved. Review history preserved.');if(addAnother){const deckId=card.deckId,designSetId=card.designSetId,preset=this.authorPreset;this.editor=this.blankCard(deckId,designSetId);this.authorPreset=preset;this.editor.kind=preset==='image-first'?'visual':'text';this.tagInput='';this.authorPreviewRevealed=false;this.editorBaseline=this.editorSnapshot();setTimeout(()=>document.getElementById('card-front')?.focus());}else{this.editor=null;this.editorBaseline='';}}catch(e){this.fail(e);}finally{this.busy.set(false);}}
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
  async renameTag():Promise<void>{if(this.busy())return;this.busy.set(true);try{const count=await this.store.renameTag(this.renameTagFrom,this.renameTagTo);this.message.set(count?`Renamed the tag on ${count} cards.`:'No cards used that tag.');this.renameTagFrom='';this.renameTagTo='';}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  private blankCard(deckId?:string,designSetId?:string):CardContent{return{id:crypto.randomUUID(),deckId:deckId||this.selectedDeck||this.data()?.decks[0]?.id||'',kind:'text',front:'',answer:'',pronunciation:'',meaning:'',notes:'',tags:[],revision:0,suspended:false,rarity:'common',presentation:{profile:'general',artRole:'hidden'},...(designSetId?{designSetId}:{})};}
  private editorSnapshot():string{return JSON.stringify({editor:this.editor,tags:this.tagInput});}
  private hasUnsavedCard():boolean{return !!this.editor&&this.editorSnapshot()!==this.editorBaseline;}
  async uploadCard(event:Event,back=false):Promise<void>{const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file||!this.editor)return;this.busy.set(true);try{const {readArtwork}=await import('./upload'),asset=await this.store.saveAsset(await readArtwork(file));if(back)this.editor.backImage=`asset:${asset.id}`;else this.editor.image=`asset:${asset.id}`;this.editor={...this.editor};this.message.set('Image uploaded locally. Save the card to use it.');}catch(e){this.message.set(String(e));}finally{this.busy.set(false);input.value='';}}
  async uploadCardAudio(event:Event,back=false):Promise<void>{const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file||!this.editor)return;this.busy.set(true);try{const {readAudio}=await import('./upload'),asset=await this.store.saveAsset(await readAudio(file));const key=back?'backAudio':'frontAudio';this.editor={...this.editor,[key]:[...(this.editor[key]??[]),`asset:${asset.id}`]};this.message.set('Audio uploaded locally. Save the card to use it.');}catch(e){this.fail(e);}finally{this.busy.set(false);input.value='';}}
  async uploadDeckCover(event:Event):Promise<void>{const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file||!this.deckEditor)return;this.busy.set(true);try{const {readArtwork}=await import('./upload'),asset=await this.store.saveAsset(await readArtwork(file));this.deckEditor={...this.deckEditor,coverImage:`asset:${asset.id}`};this.message.set('Cover uploaded locally. Save the deck to use it.');}catch(e){this.fail(e);}finally{this.busy.set(false);input.value='';}}
  removeCardAudio(ref:string,back=false):void{if(!this.editor)return;const key=back?'backAudio':'frontAudio';this.editor={...this.editor,[key]:(this.editor[key]??[]).filter(item=>item!==ref)};}
  async suspend(card:CardContent):Promise<void>{try{await this.store.manageCards([card.id],card.suspended?'unsuspend':'suspend');this.message.set(card.suspended?'Card resumed.':'Card suspended. History preserved.');}catch(e){this.message.set(String(e));}}
  newDeck(deck?:Deck,parentId?:string):void{this.go('library');this.deckEditor=deck?{...deck}:{id:crypto.randomUUID(),name:'',description:'',suspended:false,...(parentId?{parentId}:{})};}
  cancelDeckEditor():void{this.deckEditor=null;}
  async saveDeck():Promise<void>{if(!this.deckEditor?.name.trim())return;this.busy.set(true);try{const deck={...this.deckEditor,name:this.deckEditor.name.trim()};if(!deck.designSetId)delete deck.designSetId;if(!deck.parentId)delete deck.parentId;if(!deck.studyPresetId)delete deck.studyPresetId;await this.store.saveDeck(deck);this.deckEditor=null;this.message.set('Deck saved.');}catch(e){this.message.set(String(e));}finally{this.busy.set(false);}}
  async manageDeck(action:DeckManagementAction,deck:Deck):Promise<void>{if(action==='view-cards'){this.browseDeck(deck.id);return;}if(action==='add-card'){this.edit(undefined,deck.id);return;}if(action==='add-subdeck'){this.newDeck(undefined,deck.id);return;}if(action==='import'){this.openExchange(deck.id);return;}if(action==='study-settings'){this.openStudySettings(deck.id);return;}if(action==='edit'){this.newDeck(deck);return;}this.busy.set(true);try{await this.store.saveDeck({...deck,archived:!deck.archived});this.message.set(deck.archived?'Deck restored.':'Deck archived. Learning history was retained.');}catch(error){this.fail(error);}finally{this.busy.set(false);}}
  async detachAnkiCard():Promise<void>{if(!this.editor?.ankiSource||!confirm('Detach this card from its Anki source? Future package updates and repairs will leave it unchanged.'))return;await this.store.detachAnkiCard(this.editor.id);this.editor={...this.editor,ankiSource:{...this.editor.ankiSource,linkState:'detached'}};this.editorBaseline=this.editorSnapshot();this.message.set('Card detached from its Anki source. Learning history and media were preserved.');}
  async detachAnkiDeckSource():Promise<void>{const deckId=this.selectedDeck,deck=this.data()?.decks.find(item=>item.id===deckId);if(!deck||!confirm(`Detach “${deck.name}” and its subdecks from their Anki source? Content, learning history, media and cosmetics stay in HoloRecall, but future package updates will no longer match this branch.`))return;this.busy.set(true);try{await this.store.detachAnkiDeck(deckId);this.message.set('Deck source detached. Learning data and content were preserved.');this.cancelAnkiUpdate();}catch(error){this.fail(error);}finally{this.busy.set(false);}}
  async deleteEditedDeck():Promise<void>{if(!this.deckEditor)return;const deck={...this.deckEditor},data=this.data();if(!data)return;const {deckDeletionImpact}=await import('../domain/deck-management'),impact=deckDeletionImpact(data,deck.id);if(!confirm(`Permanently delete “${deck.name}”, ${impact.decks-1} subdecks, ${impact.cards} cards, ${impact.reviews} review records and ${impact.rewards} cosmetic progress records? Shared media remains safe. Archive the deck instead for ordinary removal.`))return;this.busy.set(true);try{await this.store.deleteDeckBranch(deck.id);this.deckEditor=null;this.message.set('Deck branch and its learning records were permanently deleted. Shared media was retained.');}catch(error){this.fail(error);}finally{this.busy.set(false);}}
}
