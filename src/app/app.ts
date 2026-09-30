import { Component, computed, DestroyRef, effect, HostListener, inject, signal } from '@angular/core';
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
import { LocalStudyStore } from './data/study-store';
import { ThemeService, ThemeChoice } from './theme.service';
import { activeReviews, dayKey, dueCards } from '../domain/study';
import { activeRewardEvents, RARITIES, rewardProgress } from '../domain/rewards';
import type { CardContent, Deck, DesignSet, Rarity } from '../domain/models';
import { FlashcardComponent } from './card';
import { DesignStudioComponent } from './design-studio/design-studio';
import { CollectionComponent } from './collection/collection';
import { ProgressComponent } from './progress/progress';
import { ExchangeComponent } from './exchange/exchange';
import { readArtwork } from './upload';
import { AppLifecycle, VisualViewportCoordinator } from './platform/app-lifecycle';
import { FILE_DELIVERY } from './platform/file-delivery';

type Screen = 'dashboard' | 'library' | 'study' | 'results' | 'collection' | 'studio' | 'progress' | 'exchange' | 'settings';
@Component({
  selector:'app-root', standalone:true,
  imports:[CommonModule,FormsModule,MatButtonModule,MatButtonToggleModule,MatFormFieldModule,MatInputModule,MatSelectModule,MatSlideToggleModule,MatProgressBarModule,MatCheckboxModule,FlashcardComponent,DesignStudioComponent,CollectionComponent,ProgressComponent,ExchangeComponent],
  templateUrl:'./app.html',
})
export class AppComponent {
  readonly store=inject(LocalStudyStore);
  readonly theme=inject(ThemeService);
  readonly lifecycle=inject(AppLifecycle);
  private readonly viewportCoordinator=inject(VisualViewportCoordinator);
  private readonly fileDelivery=inject(FILE_DELIVERY);
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
  readonly confidenceFeedback=signal<1|2|3|4|5|null>(null);
  readonly tiers=RARITIES;
  readonly Math=Math;
  readonly navigation:{id:Screen;label:string;icon:string}[]=[
    {id:'dashboard',label:'Dashboard',icon:'▦'},{id:'library',label:'Decks',icon:'▤'},
    {id:'study',label:'Study',icon:'◈'},{id:'collection',label:'Collection',icon:'✧'},
    {id:'studio',label:'Design Studio',icon:'✎'},{id:'progress',label:'Progress',icon:'▥'},
    {id:'exchange',label:'Import / export',icon:'⇄'},{id:'settings',label:'Settings',icon:'⚙'},
  ];
  search='';selectedDeck='';editor:CardContent|null=null;deckEditor:Deck|null=null;tagInput='';
  settings={newCardLimit:10,reviewLimit:100,timeZone:'Europe/London'};
  rewardSettings:Record<Rarity,number>={common:1,uncommon:2,rare:3,'holo-rare':5,'ultra-rare':8,'secret-rare':12,relic:20};
  readonly reviews=computed(()=>this.data()?activeReviews(this.data()!):[]);
  readonly todayReviews=computed(()=>this.reviews().filter(e=>dayKey(new Date(e.timestamp),this.timeZone())===dayKey(this.now(),this.timeZone())));
  readonly ready=computed(()=>this.data()?dueCards(this.data()!,this.now()):[]);
  readonly reviewDue=computed(()=>this.ready().filter(c=>(this.data()?.states[c.id]?.reps??0)>0).length);
  readonly newReady=computed(()=>this.ready().length-this.reviewDue());
  readonly session=computed(()=>this.data()?.session??null);
  readonly current=computed(()=>this.data()?.cards.find(c=>c.id===this.session()?.queue[0])??null);
  readonly revealed=computed(()=>this.session()?.revealed??false);
  readonly earnedCount=computed(()=>this.data()?.cards.filter(c=>rewardProgress(this.data()!,c.id).earned).length??0);
  readonly dateLabel=computed(()=>new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:this.timeZone()}).format(this.now()));
  readonly sessionReviews=computed(()=>{const state=this.data(),session=this.session();return state&&session?activeReviews(state).filter(event=>event.sessionId===session.id):[];});
  readonly resultActiveMs=computed(()=>this.sessionReviews().reduce((sum,event)=>sum+(event.activeMs??0),0));
  readonly resultConfidence=computed(()=>this.sessionReviews().length?this.sessionReviews().reduce((sum,event)=>sum+event.rating,0)/this.sessionReviews().length:null);
  readonly resultRecall=computed(()=>{const values=this.sessionReviews().flatMap(event=>event.recallMs===undefined?[]:[event.recallMs]);return{sample:values.length,average:values.length?values.reduce((a,b)=>a+b,0)/values.length:null};});
  readonly resultUnique=computed(()=>new Set(this.sessionReviews().map(event=>event.cardId)).size);
  readonly resultRewardRows=computed(()=>{const state=this.data();if(!state)return[];const ids=new Set(this.sessionReviews().map(event=>event.id));const contributions=activeRewardEvents(state).filter(event=>event.kind==='contribution'&&ids.has(event.reviewEventId));return [...new Set(this.sessionReviews().map(event=>event.cardId))].map(cardId=>{const card=state.cards.find(item=>item.id===cardId)!;const progress=rewardProgress(state,cardId);const gained=contributions.filter(event=>event.cardId===cardId).length;return{card,progress,gained,before:Math.max(0,progress.days-gained)};});});
  readonly resultUnlocks=computed(()=>{const state=this.data();if(!state)return[];const ids=new Set(this.sessionReviews().map(event=>event.id));return activeRewardEvents(state).flatMap(event=>event.kind==='unlock'&&ids.has(event.reviewEventId)?[{event,card:state.cards.find(card=>card.id===event.cardId)!}]:[]);});
  private elapsedMs=0;
  private lastTick=performance.now();
  private lastActivity=performance.now();
  private checkpointing=false;
  private ticks=0;
  private timedCard='';
  private settingsLoaded=false;
  private resultSessionKey='';
  private resultObserver?:IntersectionObserver;
  private resultTimers:number[]=[];
  private confidenceTimer=0;
  constructor(){
    void this.store.init();
    effect(()=>{
      const cardId=this.current()?`${this.current()!.id}:${this.current()!.revision}`:'';
      if(cardId!==this.timedCard){this.timedCard=cardId;this.elapsedMs=this.session()?.activeMs??0;this.lastTick=performance.now();}
      const state=this.data();
      if(state&&!this.settingsLoaded){this.settingsLoaded=true;this.loadSettings();}
      const resultKey=state&&this.screen()==='results'&&state.session?.endedAt?`${state.session.id}:${state.session.endedAt}`:'';
      if(resultKey&&resultKey!==this.resultSessionKey){this.resultSessionKey=resultKey;queueMicrotask(()=>this.startResultsPresentation());}
    });
    const activity=()=>{this.lastActivity=performance.now();};
    const unsubscribeLifecycle=this.lifecycle.subscribe(active=>{if(!active){void this.checkpoint();if(this.screen()==='results')this.skipResults();else this.clearResultMotion();window.clearTimeout(this.confidenceTimer);this.confidenceFeedback.set(null);}else{this.lastTick=performance.now();void this.store.refresh().catch(()=>undefined);}});
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
  go(screen:Screen):void{void this.checkpoint();if(this.screen()==='results'&&screen!=='results'){this.clearResultMotion();this.resultsIntroPlaying.set(false);}this.screen.set(screen);history.replaceState(null,'',`#${screen}`);this.editor=null;this.deckEditor=null;this.message.set('');this.messageError.set(false);if(screen==='settings')this.loadSettings();window.scrollTo({top:0,behavior:'instant'});setTimeout(()=>document.getElementById('main-content')?.focus({preventScroll:true}));}
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
  async rate(rating:1|2|3|4|5):Promise<void>{const card=this.current();const session=this.session();if(!card||!session||!this.revealed()||this.busy())return;this.busy.set(true);try{await this.store.review(card.id,rating,session.id,crypto.randomUUID(),Math.round(this.elapsedMs));this.showConfidenceFeedback(rating);this.elapsedMs=0;this.now.set(new Date());this.message.set('');if(!this.current()){this.go('results');this.startResultsPresentation();}}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  async undo():Promise<void>{const session=this.session();if(!session?.lastReviewCardId||this.busy())return;this.busy.set(true);try{await this.store.undo(session.lastReviewCardId,session.id);this.elapsedMs=0;this.message.set('');if(this.current())this.go('study');}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  async endStudy():Promise<void>{if(!this.session()||this.busy())return;this.busy.set(true);try{if(this.current())await this.store.updateSessionTime(Math.round(this.elapsedMs));await this.store.endSession();this.go('results');this.startResultsPresentation();}catch(e){this.fail(e);}finally{this.busy.set(false);}}
  showResults():void{this.go('results');this.startResultsPresentation();}
  motionEnabled():boolean{return !!this.data()?.preferences.effects&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
  showResultsSkip():boolean{return this.motionEnabled()&&!this.resultsSkipped()&&(this.resultsIntroPlaying()||this.activeResultSections()>0);}
  replayResults():void{this.startResultsPresentation();}
  resultSectionState(id:string):'waiting'|'active'|'settled'{return this.resultSectionStates()[id]??'settled';}
  skipResults():void{this.resultsSkipped.set(true);this.resultsIntroPlaying.set(false);this.clearResultMotion();this.resultSectionStates.update(states=>Object.fromEntries(Object.keys(states).map(key=>[key,'settled'])));}
  private startResultsPresentation():void{
    const session=this.session();if(session?.endedAt)this.resultSessionKey=`${session.id}:${session.endedAt}`;
    this.clearResultMotion();this.resultsSkipped.set(!this.motionEnabled());this.resultsIntroPlaying.set(this.motionEnabled());this.activeResultSections.set(0);this.resultSectionStates.set(Object.fromEntries(['cosmetics','unlocks','definitions'].map(key=>[key,this.motionEnabled()?'waiting':'settled'])));this.resultsRun.update(value=>value+1);
    this.resultTimers.push(window.setTimeout(()=>this.observeResultSections(),0));
    if(this.motionEnabled())this.resultTimers.push(window.setTimeout(()=>this.resultsIntroPlaying.set(false),900));
  }
  private observeResultSections():void{
    const sections=this.renderedResultSections();if(this.screen()!=='results')return;if(!sections.length){this.resultTimers.push(window.setTimeout(()=>this.observeResultSections(),50));return;}
    if(this.resultsSkipped()||!this.motionEnabled())return;
    this.resultObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting&&entry.intersectionRatio>=.22){this.resultObserver?.unobserve(entry.target);this.activateResultSection(entry.target as HTMLElement);}}, {root:null,threshold:[.22]});
    for(const section of sections)this.resultObserver.observe(section);
  }
  private renderedResultSections():HTMLElement[]{return Array.from(document.querySelectorAll<HTMLElement>('.results [data-result-section]'));}
  private activateResultSection(section:HTMLElement):void{
    const key=section.dataset['resultSection'];if(!key||this.resultSectionState(key)!=='waiting')return;
    this.resultSectionStates.update(states=>({...states,[key]:'active'}));this.activeResultSections.update(value=>value+1);
    this.resultTimers.push(window.setTimeout(()=>{this.resultSectionStates.update(states=>({...states,[key]:'settled'}));this.activeResultSections.update(value=>Math.max(0,value-1));},1450));
  }
  private clearResultMotion():void{this.resultObserver?.disconnect();this.resultObserver=undefined;for(const timer of this.resultTimers)window.clearTimeout(timer);this.resultTimers=[];this.activeResultSections.set(0);}
  private showConfidenceFeedback(rating:1|2|3|4|5):void{if(!this.motionEnabled())return;window.clearTimeout(this.confidenceTimer);this.confidenceFeedback.set(null);requestAnimationFrame(()=>{this.confidenceFeedback.set(rating);this.confidenceTimer=window.setTimeout(()=>this.confidenceFeedback.set(null),760);});}
  duration(ms:number):string{const seconds=Math.round(ms/1000);if(ms>0&&seconds===0)return'<1s';return seconds>=60?`${Math.floor(seconds/60)}m ${seconds%60}s`:`${seconds}s`;}
  private fail(error:unknown):void{this.messageError.set(true);this.message.set(error instanceof Error?error.message:String(error));}
  @HostListener('document:keydown',['$event']) key(event:KeyboardEvent):void{const target=event.target as HTMLElement;if(this.screen()!=='study'||target.closest('input,textarea,select,button,a,[role="combobox"]')||event.altKey||event.ctrlKey||event.metaKey||event.repeat)return;if(event.code==='Space'&&!this.revealed()){event.preventDefault();void this.reveal();}if(this.revealed()&&/^[1-5]$/.test(event.key)){event.preventDefault();void this.rate(Number(event.key)as 1|2|3|4|5);}}
  edit(card?:CardContent):void{this.go('library');this.tagInput=card?.tags.join(', ')??'';this.editor=card?structuredClone(card):{id:crypto.randomUUID(),deckId:this.selectedDeck||this.data()?.decks[0]?.id||'',kind:'text',front:'',answer:'',pronunciation:'',meaning:'',notes:'',tags:[],revision:0,suspended:false,rarity:'common'};setTimeout(()=>document.getElementById('card-front')?.focus());}
  async saveCard():Promise<void>{if(!this.editor||this.busy())return;this.busy.set(true);try{const card={...this.editor,front:this.editor.front.trim(),answer:this.editor.answer.trim(),tags:this.tagInput.split(',').map(s=>s.trim()).filter(Boolean)};if(!card.designSetId)delete card.designSetId;await this.store.saveCard(card);this.editor=null;this.message.set('Card saved. Review history preserved.');}catch(e){this.message.set(String(e));}finally{this.busy.set(false);}}
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
