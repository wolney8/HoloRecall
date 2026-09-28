import { Component, computed, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocalStudyStore } from './data/study-store';
import { activeReviews, dayKey, dueCards } from '../domain/study';
import type { CardContent, Deck } from '../domain/models';
import { FlashcardComponent, Treatment } from './card';
import { SEED_CARDS } from './seed';

type Screen = 'dashboard' | 'library' | 'study' | 'collection' | 'settings';
@Component({selector:'app-root', standalone:true, imports:[CommonModule, FormsModule, FlashcardComponent], templateUrl:'./app.html'})
export class AppComponent {
  readonly store = inject(LocalStudyStore);
  readonly screen = signal<Screen>('dashboard');
  readonly now = signal(new Date());
  readonly busy = signal(false);
  readonly message = signal('');
  readonly revealed = signal(false);
  readonly queue = signal<string[]>([]);
  readonly sessionTotal = signal(0);
  readonly sessionDone = signal(0);
  readonly sessionStarted = signal(false);
  readonly lastReviewed = signal<string | null>(null);
  sessionId = crypto.randomUUID();
  search = '';
  selectedDeck = '';
  editor: CardContent | null = null;
  deckEditor: Deck | null = null;
  tagInput = '';
  settings = {newCardLimit:10,reviewLimit:100,timeZone:'Europe/London'};
  readonly treatments: {id:Treatment;name:string;label:string;description:string}[] = [
    {id:'matte',name:'Standard',label:'COMMON · MATTE',description:'Quiet texture. A clear place to begin.'},
    {id:'foil',name:'Foil',label:'UNCOMMON · FOIL',description:'A soft metallic light across the surface.'},
    {id:'holo',name:'Holo',label:'RARE · HOLO',description:'A little colour with every new perspective.'},
    {id:'relic',name:'Relic',label:'SECRET RARE · RELIC',description:'Obsidian greens, framed in warm gold.'},
  ];
  readonly sample = SEED_CARDS[0];
  readonly visualOptions = SEED_CARDS.filter(c=>c.kind==='visual');
  readonly data = this.store.data;
  readonly reviews = computed(()=>this.data() ? activeReviews(this.data()!) : []);
  readonly todayReviews = computed(()=>this.reviews().filter(e=>dayKey(new Date(e.timestamp),this.timeZone())===dayKey(this.now(),this.timeZone())));
  readonly ready = computed(()=>this.data() ? dueCards(this.data()!,this.now()) : []);
  readonly reviewDue = computed(()=>this.ready().filter(c=>(this.data()?.states[c.id]?.reps ?? 0)>0).length);
  readonly newReady = computed(()=>this.ready().length-this.reviewDue());
  readonly recall = computed(()=>this.todayReviews().length ? Math.round(100*this.todayReviews().filter(r=>r.rating>1).length/this.todayReviews().length) : null);
  readonly current = computed(()=>this.data()?.cards.find(c=>c.id===this.queue()[0]) ?? null);
  readonly week = computed(()=>Array.from({length:7},(_,index)=>{
    const date = new Date(`${dayKey(this.now(),this.timeZone())}T12:00:00Z`); date.setUTCDate(date.getUTCDate()-(6-index));
    const key = date.toISOString().slice(0,10);
    return {label:new Intl.DateTimeFormat('en-GB',{weekday:'short',timeZone:'UTC'}).format(date),date:key,count:this.reviews().filter(e=>dayKey(new Date(e.timestamp),this.timeZone())===key).length};
  }));
  readonly weekMax = computed(()=>Math.max(5,...this.week().map(d=>d.count)));
  readonly activitySummary = computed(()=>`Reviews by day: ${this.week().map(day=>`${day.date}: ${day.count}`).join('; ')}. These are local scheduled reviews, excluding reversals.`);
  readonly dateLabel = computed(()=>new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:this.timeZone()}).format(this.now()));

  constructor() {
    void this.store.init();
    const timer = setInterval(()=>this.now.set(new Date()),30_000);
    const refresh = ()=>{ if (document.visibilityState==='visible') { this.now.set(new Date()); void this.store.refresh().catch(()=>undefined); }};
    document.addEventListener('visibilitychange',refresh);
    inject(DestroyRef).onDestroy(()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);});
  }
  timeZone():string {return this.data()?.preferences.timeZone ?? 'Europe/London';}
  go(screen:Screen):void {this.screen.set(screen);this.editor=null;this.deckEditor=null;this.message.set(''); if(screen==='settings' && this.data())this.settings={...this.data()!.preferences};window.scrollTo({top:0,behavior:'instant'});}
  deckCards(id:string):CardContent[] {return this.data()?.cards.filter(c=>c.deckId===id) ?? [];}
  deckReady(id:string):number {return this.data() ? dueCards(this.data()!,this.now(),id).length : 0;}
  filteredCards():CardContent[] {return (this.data()?.cards ?? []).filter(c=>(!this.selectedDeck || c.deckId===this.selectedDeck) && `${c.answer} ${c.front} ${c.tags.join(' ')}`.toLowerCase().includes(this.search.toLowerCase()));}
  deckName(id:string):string {return this.data()?.decks.find(d=>d.id===id)?.name ?? 'Your deck';}
  study(deckId?:string):void {
    this.now.set(new Date());
    const cards=this.data() ? dueCards(this.data()!,this.now(),deckId) : [];
    this.queue.set(cards.map(c=>c.id));this.sessionTotal.set(cards.length);this.sessionDone.set(0);this.sessionStarted.set(true);this.sessionId=crypto.randomUUID();this.revealed.set(false);this.lastReviewed.set(null);this.go('study');
  }
  reveal():void {if(this.current() && !this.busy()){this.revealed.set(true);setTimeout(()=>document.querySelector<HTMLElement>('.study-card-area .answer h3')?.focus({preventScroll:true}));}}
  async rate(rating:1|2|3|4|5):Promise<void> {
    const card=this.current();if(!card || !this.revealed() || this.busy())return;
    this.busy.set(true);
    try {await this.store.review(card.id,rating,this.sessionId);this.lastReviewed.set(card.id);this.queue.update(q=>q.slice(1));this.sessionDone.update(n=>n+1);this.revealed.set(false);this.now.set(new Date());this.message.set('Review saved on this device.');}
    catch(error){this.message.set(error instanceof Error ? error.message : 'Your review could not be saved. Please retry.');}
    finally{this.busy.set(false);}
  }
  async undo():Promise<void> {
    const id=this.lastReviewed();if(!id || this.busy())return;
    this.busy.set(true);
    try{await this.store.undo(id,this.sessionId);this.queue.update(q=>[id,...q.filter(i=>i!==id)]);this.sessionDone.update(n=>Math.max(0,n-1));this.lastReviewed.set(null);this.revealed.set(false);this.message.set('Review reversed. You can try this card again.');}
    catch(error){this.message.set(String(error));}finally{this.busy.set(false);}
  }
  @HostListener('document:keydown',['$event']) key(event:KeyboardEvent):void {
    const target=event.target as HTMLElement;
    if(this.screen()!=='study' || target.closest('input,textarea,select,button,a') || event.altKey || event.ctrlKey || event.metaKey || event.repeat)return;
    if(event.code==='Space' && !this.revealed()){event.preventDefault();this.reveal();}
    if(this.revealed() && /^[1-5]$/.test(event.key)){event.preventDefault();void this.rate(Number(event.key) as 1|2|3|4|5);}
  }
  edit(card?:CardContent):void {
    this.go('library');this.tagInput=card?.tags.join(', ') ?? '';
    this.editor=card ? {...card,tags:[...card.tags]} : {id:crypto.randomUUID(),deckId:this.selectedDeck || this.data()?.decks[0]?.id || '',kind:'text',front:'',answer:'',pronunciation:'',meaning:'',notes:'',tags:[],revision:0,suspended:false};
    setTimeout(()=>document.getElementById('card-front')?.focus());
  }
  async saveCard():Promise<void> {
    if(!this.editor || this.busy())return;
    if(!this.editor.answer.trim() || !this.editor.front.trim()){this.message.set('Add a prompt and an answer before saving.');return;}
    if(this.editor.kind==='visual' && !this.editor.image){this.message.set('Choose a bundled illustration for this visual card.');return;}
    this.busy.set(true);
    try{const card={...this.editor,front:this.editor.front.trim(),answer:this.editor.answer.trim(),tags:this.tagInput.split(',').map(s=>s.trim()).filter(Boolean)};if(card.kind==='text'){delete card.image;delete card.imageDescription;}await this.store.saveCard(card);this.editor=null;this.message.set('Card saved. Your review history is preserved.');}catch(error){this.message.set(String(error));}finally{this.busy.set(false);}
  }
  pickImage(path:string):void {if(this.editor){this.editor.image=path;this.editor.imageDescription=this.visualOptions.find(c=>c.image===path)?.imageDescription;}}
  async suspend(card:CardContent):Promise<void>{try{await this.store.saveCard({...card,suspended:!card.suspended});this.message.set(card.suspended?'Card resumed.':'Card suspended. Its history is preserved.');}catch(error){this.message.set(String(error));}}
  newDeck(deck?:Deck):void{this.go('library');this.deckEditor=deck ? {...deck} : {id:crypto.randomUUID(),name:'',description:'',suspended:false};}
  async saveDeck():Promise<void>{if(!this.deckEditor?.name.trim())return;this.busy.set(true);try{await this.store.saveDeck({...this.deckEditor,name:this.deckEditor.name.trim()});this.deckEditor=null;this.message.set('Deck saved.');}catch(error){this.message.set(String(error));}finally{this.busy.set(false);}}
  async toggleEffects():Promise<void>{try{await this.store.updatePreferences({effects:!this.data()?.preferences.effects});}catch(error){this.message.set(String(error));}}
  async saveSettings():Promise<void>{try{new Intl.DateTimeFormat('en',{timeZone:this.settings.timeZone}).format();await this.store.updatePreferences(this.settings);this.message.set('Study settings saved.');}catch(error){this.message.set('Check the time zone and limits. '+String(error));}}
  export():void{const blob=new Blob([this.store.exportJson()],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`holorecall-export-${dayKey(new Date(),this.timeZone())}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);this.message.set('Backup downloaded. Keep it somewhere safe.');}
  async restore(event:Event):Promise<void>{const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;try{if(file.size>5_000_000)throw new Error('Backup exceeds the 5 MB prototype limit.');await this.store.restoreJson(await file.text());this.message.set('Backup restored.');}catch(error){this.message.set(String(error));}finally{input.value='';}}
}
