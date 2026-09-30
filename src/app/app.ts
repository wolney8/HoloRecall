import { Component, computed, DestroyRef, effect, HostListener, inject, QueryList, signal, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { activeReviews, dayKey, dueCards, RATING_OPTIONS } from '../domain/study';
import { activeRewardEvents, RARITIES, rewardProgress } from '../domain/rewards';
import type { CardContent, Deck, DesignSet, FinishPreset, Rarity } from '../domain/models';
import { FlashcardComponent } from './card';
import { DesignStudioComponent } from './design-studio/design-studio';
import { CollectionComponent } from './collection/collection';
import { ProgressComponent } from './progress/progress';
import { ExchangeComponent } from './exchange/exchange';
import { readArtwork } from './upload';
import { AppLifecycle, VisualViewportCoordinator } from './platform/app-lifecycle';
import { FILE_DELIVERY } from './platform/file-delivery';
import { PageRevealDirective, ViewportRevealService } from './motion/page-reveal';

type Screen = 'dashboard' | 'library' | 'study' | 'results' | 'collection' | 'studio' | 'progress' | 'exchange' | 'settings';
@Component({
  selector:'app-root', standalone:true,
  imports:[CommonModule,FormsModule,MatButtonModule,MatButtonToggleModule,MatFormFieldModule,MatInputModule,MatSelectModule,MatSlideToggleModule,MatProgressBarModule,MatCheckboxModule,MatTooltipModule,FlashcardComponent,DesignStudioComponent,CollectionComponent,ProgressComponent,ExchangeComponent,PageRevealDirective],
  templateUrl:'./app.html',
})
export class AppComponent {
  @ViewChildren('ratingTip') private ratingTips!: QueryList<MatTooltip>;
  readonly store=inject(LocalStudyStore);
  readonly theme=inject(ThemeService);
  readonly lifecycle=inject(AppLifecycle);
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
  readonly ratingOptions=RATING_OPTIONS;
  readonly tiers=RARITIES;
  readonly Math=Math;
  readonly navigation:{id:Screen;label:string;icon:string}[]=[
    {id:'dashboard',label:'Dashboard',icon:'▦'},{id:'library',label:'Decks',icon:'▤'},
    {id:'study',label:'Study',icon:'◈'},{id:'collection',label:'Collection',icon:'✧'},
    {id:'studio',label:'Design Studio',icon:'✎'},{id:'progress',label:'Progress',icon:'▥'},
    {id:'exchange',label:'Import / export',icon:'⇄'},{id:'settings',label:'Settings',icon:'⚙'},
  ];
  search='';selectedDeck='';editor:CardContent|null=null;deckEditor:Deck|null=null;tagInput='';
  authorPreset:'basic'|'image-first'|'reversible'='basic';authorPreviewRevealed=false;
  selectedCardIds=new Set<string>();bulkRarity:Rarity='common';bulkDesignSetId='';bulkFinish:FinishPreset='matte';
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
  readonly displayedCard=computed(()=>this.studyPresentationCard()??this.current());
  readonly revealed=computed(()=>this.session()?.revealed??false);
  readonly displayedRevealed=computed(()=>this.studyPresentationCard()?true:this.revealed());
  readonly earnedCount=computed(()=>this.data()?.cards.filter(c=>rewardProgress(this.data()!,c.id).earned).length??0);
  readonly dateLabel=computed(()=>new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:this.timeZone()}).format(this.now()));
  readonly sessionReviews=computed(()=>{const state=this.data(),session=this.session();return state&&session?activeReviews(state).filter(event=>event.sessionId===session.id):[];});
  readonly resultActiveMs=computed(()=>this.sessionReviews().reduce((sum,event)=>sum+(event.activeMs??0),0));
  readonly resultConfidence=computed(()=>this.sessionReviews().length?this.sessionReviews().reduce((sum,event)=>sum+event.rating,0)/this.sessionReviews().length:null);
  readonly resultRecall=computed(()=>{const values=this.sessionReviews().flatMap(event=>event.recallMs===undefined?[]:[event.recallMs]);return{sample:values.length,average:values.length?values.reduce((a,b)=>a+b,0)/values.length:null};});
  readonly resultUnique=computed(()=>new Set(this.sessionReviews().map(event=>event.cardId)).size);
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
    const unsubscribeLifecycle=this.lifecycle.subscribe(active=>{if(!active){void this.checkpoint();if(this.screen()==='results')this.skipResults();else this.clearResultMotion();this.settleConfidenceFeedback();}else{this.lastTick=performance.now();void this.store.refresh().catch(()=>undefined);}});
    const timer=setInterval(()=>{
      const tick=performance.now();
      if(this.screen()==='study'&&this.current()&&this.lifecycle.active()&&this.lifecycle.focused()&&!this.busy()&&tick-this.lastActivity<60_000){this.elapsedMs=Math.min(120_000,this.elapsedMs+Math.min(1500,tick-this.lastTick));}
      this.lastTick=tick;
      if(++this.ticks%5===0)void this.checkpoint();
      if(this.ticks%30===0)this.now.set(new Date());
    },1000);
    document.addEventListener('pointerdown',activity);document.addEventListener('keydown',activity);
    inject(DestroyRef).onDestroy(()=>{clearInterval(timer);this.clearResultMotion();window.clearTimeout(this.confidenceTimer);document.removeEventListener('pointerdown',activity);document.removeEventListener('keydown',activity);unsubscribeLifecycle();});
  }
  private initialScreen():Screen{const value=location.hash.slice(1);return ['dashboard','library','study','results','collection','studio','progress','exchange','settings'].includes(value)?value as Screen:'dashboard';}
  private async checkpoint():Promise<void>{if(this.checkpointing||this.busy()||this.screen()!=='study'||!this.current()||this.elapsedMs<= (this.session()?.activeMs??0)+500)return;this.checkpointing=true;try{await this.store.updateSessionTime(Math.round(this.elapsedMs));}catch{/* Retain the unsaved current-card time locally; review is authoritative. */}finally{this.checkpointing=false;}}
  private loadSettings():void{const state=this.data();if(!state)return;const {newCardLimit,reviewLimit,timeZone}=state.preferences;this.settings={newCardLimit,reviewLimit,timeZone};this.rewardSettings={...state.rewardConfig};}
  timeZone():string{return this.data()?.preferences.timeZone??'Europe/London';}
  go(screen:Screen):void{if(screen!=='library'&&this.hasUnsavedCard()&&!confirm('Discard the unsaved card changes?'))return;void this.checkpoint();if(this.screen()==='results'&&screen!=='results'){this.clearResultMotion();this.resultsIntroPlaying.set(false);}if(this.screen()==='study'&&screen!=='study')this.cancelStudyPresentation();this.screen.set(screen);history.replaceState(null,'',`#${screen}`);this.editor=null;this.editorBaseline='';this.deckEditor=null;this.message.set('');this.messageError.set(false);if(screen==='settings')this.loadSettings();window.scrollTo({top:0,behavior:'instant'});setTimeout(()=>document.getElementById('main-content')?.focus({preventScroll:true}));}
  deckCards(id:string):CardContent[]{return this.data()?.cards.filter(c=>c.deckId===id)??[];}
  deckReady(id:string):number{return this.data()?dueCards(this.data()!,this.now(),id).length:0;}
  filteredCards():CardContent[]{return(this.data()?.cards??[]).filter(c=>(!this.selectedDeck||c.deckId===this.selectedDeck)&&`${c.answer} ${c.front} ${c.tags.join(' ')}`.toLowerCase().includes(this.search.toLowerCase()));}
  deckName(id:string):string{return this.data()?.decks.find(d=>d.id===id)?.name??'Deck';}
  designFor(card:CardContent):DesignSet|undefined{const id=card.designSetId||this.data()?.decks.find(d=>d.id===card.deckId)?.designSetId;return this.data()?.designs.find(d=>d.id===id);}
  shownRarity(card:CardContent):Rarity{return this.data()&&rewardProgress(this.data()!,card.id).earned?(card.rarity??'common'):'common';}
  frameFor(card:CardContent):string{const design=this.designFor(card);return this.store.mediaUrl(design?.frames?.[this.shownRarity(card)]||design?.frame);}
  rarityLabel(rarity?:Rarity):string{return this.tiers.find(t=>t.id===(rarity??'common'))?.label??'Common';}
  unlock(card:CardContent){return rewardProgress(this.data()!,card.id);}
  async setTheme(choice:ThemeChoice):Promise<void>{try{await this.theme.select(choice);}catch(e){this.message.set(String(e));}}
  async study(deckId?:string):Promise<void>{this.busy.set(true);try{await this.store.startSession(deckId);this.elapsedMs=this.session()?.activeMs??0;this.lastActivity=performance.now();this.go(this.current()?'study':'results');if(!this.current())this.startResultsPresentation();}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  async reveal():Promise<void>{if(!this.current()||this.busy())return;this.busy.set(true);try{await this.store.revealSession(Math.round(this.elapsedMs));setTimeout(()=>document.querySelector<HTMLElement>('.study-card-area .answer h3, .study-card-area .answer-text')?.focus({preventScroll:true}));}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  async rate(rating:1|2|3|4|5):Promise<void>{
    const card=this.current(),session=this.session();if(!card||!session||!this.revealed()||this.busy())return;
    const run=++this.studyPresentationRun;this.busy.set(true);this.studyPresentationCard.set(card);
    try{
      await this.store.review(card.id,rating,session.id,crypto.randomUUID(),Math.round(this.elapsedMs));
      if(run!==this.studyPresentationRun)return;
      this.studyPresentationRating.set(rating);this.elapsedMs=0;this.now.set(new Date());this.message.set('');
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
    this.clearResultMotion();this.resultsSkipped.set(!this.motionEnabled());this.resultsIntroPlaying.set(this.motionEnabled());this.activeResultSections.set(0);this.unlockRevealIndex.set(0);this.unlockRevealPhase.set(this.motionEnabled()&&this.resultUnlocks().length?'waiting':'settled');this.resultSectionStates.set(Object.fromEntries(['cosmetics','definitions'].map(key=>[key,this.motionEnabled()?'waiting':'settled'])));this.resultsRun.update(value=>value+1);
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
    if(!this.motionEnabled()||run!==this.studyPresentationRun)return;
    this.studyTransition.set('deal');
    const stage=document.querySelector<HTMLElement>('[data-testid="study-deck-stage"]');
    if(!stage)return;
    const outgoing=stage.animate([{opacity:1,transform:'translateX(0) rotate(0)'},{opacity:0,transform:'translateX(-34px) rotate(-1.5deg)'}],{duration:180,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'});
    await Promise.race([outgoing.finished.catch(()=>undefined),new Promise(resolve=>window.setTimeout(resolve,260))]);
    if(run!==this.studyPresentationRun)return;
    this.studyPresentationCard.set(null);await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
    if(this.current()){const incoming=stage.animate([{opacity:0,transform:'translateX(32px) rotate(1.5deg)'},{opacity:1,transform:'translateX(0) rotate(0)'}],{duration:260,easing:'cubic-bezier(.16,1,.3,1)'});await Promise.race([incoming.finished.catch(()=>undefined),new Promise(resolve=>window.setTimeout(resolve,340))]);}
  }
  private settleConfidenceFeedback():void{window.clearTimeout(this.confidenceTimer);this.confidenceTimer=0;this.confidenceFeedback.set(null);const resolve=this.feedbackResolve;this.feedbackResolve=null;resolve?.();}
  private clearStudyPresentation():void{this.settleConfidenceFeedback();this.studyPresentationCard.set(null);this.studyPresentationRating.set(null);this.studyTransition.set('idle');}
  private cancelStudyPresentation():void{this.studyPresentationRun++;this.clearStudyPresentation();this.busy.set(false);}
  duration(ms:number):string{const seconds=Math.round(ms/1000);if(ms>0&&seconds===0)return'<1s';return seconds>=60?`${Math.floor(seconds/60)}m ${seconds%60}s`:`${seconds}s`;}
  private fail(error:unknown):void{this.messageError.set(true);this.message.set(error instanceof Error?error.message:String(error));}
  @HostListener('document:pointerdown',['$event']) dismissRatingHelp(event:PointerEvent):void{if(!(event.target as HTMLElement).closest('.rating-info')){this.openRatingHelp.set(null);this.ratingTips?.forEach(tip=>tip.hide(0));}}
  @HostListener('document:keydown',['$event']) key(event:KeyboardEvent):void{if(event.key==='Escape'){this.openRatingHelp.set(null);this.ratingTips?.forEach(tip=>tip.hide(0));return;}const target=event.target as HTMLElement;if(this.screen()!=='study'||target.closest('input,textarea,select,button,a,[role="combobox"]')||event.altKey||event.ctrlKey||event.metaKey||event.repeat)return;if(event.code==='Space'&&!this.revealed()){event.preventDefault();void this.reveal();}if(this.revealed()&&/^[1-5]$/.test(event.key)){event.preventDefault();void this.rate(Number(event.key)as 1|2|3|4|5);}}
  edit(card?:CardContent,deckId?:string):void{this.go('library');if(this.screen()!=='library')return;this.tagInput=card?.tags.join(', ')??'';this.authorPreset=card?.kind==='visual'?'image-first':'basic';this.authorPreviewRevealed=false;this.editor=card?structuredClone(card):this.blankCard(deckId);this.editorBaseline=this.editorSnapshot();setTimeout(()=>document.getElementById('card-front')?.focus());}
  duplicateCard(card:CardContent):void{this.edit({...structuredClone(card),id:crypto.randomUUID(),revision:0},card.deckId);this.message.set('Duplicate draft created. Review it before saving.');}
  setAuthorPreset(preset:'basic'|'image-first'|'reversible'):void{if(!this.editor)return;this.authorPreset=preset;this.editor.kind=preset==='image-first'?'visual':'text';this.editor={...this.editor};}
  cancelCardEditor():void{if(this.hasUnsavedCard()&&!confirm('Discard the unsaved card changes?'))return;this.editor=null;this.editorBaseline='';}
  async saveCard(addAnother=false):Promise<void>{if(!this.editor||this.busy())return;this.busy.set(true);try{const card={...this.editor,front:this.editor.front.trim(),answer:this.editor.answer.trim(),tags:this.tagInput.split(',').map(s=>s.trim()).filter(Boolean)};if(!card.designSetId)delete card.designSetId;const cards=[card];if(this.authorPreset==='reversible'&&!card.revision)cards.push({...card,id:crypto.randomUUID(),front:card.answer,answer:card.front,pronunciation:'',meaning:card.meaning,revision:0});await this.store.saveCards(cards);this.message.set(cards.length===2?'Two reversible cards saved. Review history was not changed.':'Card saved. Review history preserved.');if(addAnother){const deckId=card.deckId,designSetId=card.designSetId,preset=this.authorPreset;this.editor=this.blankCard(deckId,designSetId);this.authorPreset=preset;this.editor.kind=preset==='image-first'?'visual':'text';this.tagInput='';this.authorPreviewRevealed=false;this.editorBaseline=this.editorSnapshot();setTimeout(()=>document.getElementById('card-front')?.focus());}else{this.editor=null;this.editorBaseline='';}}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  toggleCardSelection(id:string,selected:boolean):void{const next=new Set(this.selectedCardIds);selected?next.add(id):next.delete(id);this.selectedCardIds=next;}
  clearCardSelection():void{this.selectedCardIds=new Set();}
  async applyBulkCards():Promise<void>{if(this.busy()||!this.selectedCardIds.size)return;this.busy.set(true);try{await this.store.bulkUpdateCards([...this.selectedCardIds],{rarity:this.bulkRarity,designSetId:this.bulkDesignSetId||undefined,finish:this.bulkFinish});this.message.set(`${this.selectedCardIds.size} cards updated. Review history and earned cosmetics were preserved.`);this.selectedCardIds=new Set();}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  private blankCard(deckId?:string,designSetId?:string):CardContent{return{id:crypto.randomUUID(),deckId:deckId||this.selectedDeck||this.data()?.decks[0]?.id||'',kind:'text',front:'',answer:'',pronunciation:'',meaning:'',notes:'',tags:[],revision:0,suspended:false,rarity:'common',...(designSetId?{designSetId}:{})};}
  private editorSnapshot():string{return JSON.stringify({editor:this.editor,tags:this.tagInput});}
  private hasUnsavedCard():boolean{return !!this.editor&&this.editorSnapshot()!==this.editorBaseline;}
  async uploadCard(event:Event,back=false):Promise<void>{const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file||!this.editor)return;this.busy.set(true);try{const asset=await readArtwork(file);await this.store.saveAsset(asset);if(back)this.editor.backImage=`asset:${asset.id}`;else this.editor.image=`asset:${asset.id}`;this.editor={...this.editor};this.message.set('Image uploaded locally. Save the card to use it.');}catch(e){this.message.set(String(e));}finally{this.busy.set(false);input.value='';}}
  async suspend(card:CardContent):Promise<void>{try{await this.store.saveCard({...card,suspended:!card.suspended});this.message.set(card.suspended?'Card resumed.':'Card suspended. History preserved.');}catch(e){this.message.set(String(e));}}
  newDeck(deck?:Deck):void{this.go('library');this.deckEditor=deck?{...deck}:{id:crypto.randomUUID(),name:'',description:'',suspended:false};}
  async saveDeck():Promise<void>{if(!this.deckEditor?.name.trim())return;this.busy.set(true);try{const deck={...this.deckEditor,name:this.deckEditor.name.trim()};if(!deck.designSetId)delete deck.designSetId;await this.store.saveDeck(deck);this.deckEditor=null;this.message.set('Deck saved.');}catch(e){this.message.set(String(e));}finally{this.busy.set(false);}}
  async toggleEffects():Promise<void>{try{await this.store.updatePreferences({effects:!this.data()?.preferences.effects});}catch(e){this.message.set(String(e));}}
  async saveSettings():Promise<void>{try{await this.store.updatePreferences(this.settings);this.message.set('Study settings saved.');}catch(e){this.message.set(String(e));}}
  async saveRewards():Promise<void>{try{await this.store.updateRewardConfig(this.rewardSettings);this.message.set('Unlock thresholds saved. Existing earned cosmetics are preserved; changes apply on future qualifying reviews.');}catch(e){this.message.set(String(e));}}
  async export():Promise<void>{try{await this.fileDelivery.deliver(new Blob([this.store.exportJson()],{type:'application/json'}),`holorecall-export-${dayKey(new Date(),this.timeZone())}.json`);this.message.set('Full backup download requested, including uploaded artwork and progress.');}catch(e){this.fail(e);}}
  async restore(event:Event):Promise<void>{const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;try{if(file.size>100_000_000)throw new Error('Backup is larger than the 100 MB local limit.');await this.store.restoreJson(await file.text());this.message.set('Backup restored.');}catch(e){this.message.set(String(e));}finally{input.value='';}}
}
