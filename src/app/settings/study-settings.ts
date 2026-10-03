import { Component,computed,effect,inject,signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LocalStudyStore } from '../data/study-store';
import type { Deck,StudyPreset,StudyStep } from '../../domain/models';
import { BALANCED_PRESET_ID } from '../../domain/study-settings';
import { dayKey } from '../../domain/study';
import { PageRevealDirective } from '../motion/page-reveal';

@Component({selector:'hr-study-settings',standalone:true,imports:[FormsModule,MatButtonModule,MatFormFieldModule,MatInputModule,MatSelectModule,MatSlideToggleModule,MatTooltipModule,PageRevealDirective],templateUrl:'./study-settings.html',styleUrl:'./study-settings.css'})
export class StudySettingsComponent{
  readonly store=inject(LocalStudyStore);readonly selectedId=signal(BALANCED_PRESET_ID);readonly message=signal('');readonly error=signal('');readonly draft=signal<StudyPreset|null>(null);readonly assignmentLimit=signal(30);newName='';createName='';replacementId=BALANCED_PRESET_ID;todayDeck='';todayNew:number|null=null;todayReviews:number|null=null;
  readonly presets=computed(()=>this.store.data()?.studyPresets??[]);readonly decks=computed(()=>this.store.decks());readonly visibleDecks=computed(()=>this.decks().slice(0,this.assignmentLimit()));readonly users=computed(()=>this.decks().filter(deck=>deck.studyPresetId===this.selectedId()));
  constructor(){effect(()=>{const presets=this.presets();if(!presets.length)return;const selected=presets.find(item=>item.id===this.selectedId())??presets[0]!;if(selected.id!==this.selectedId())this.selectedId.set(selected.id);this.draft.set(structuredClone(selected));const decks=this.decks();if(!this.todayDeck&&decks.length)this.todayDeck=decks[0]!.id;});}
  choose(id:string):void{this.selectedId.set(id);this.message.set('');this.error.set('');}
  steps(value:string):StudyStep[]{return value.split(/[ ,]+/).map(item=>item.trim()).filter(Boolean) as StudyStep[];}
  stepText(steps:StudyStep[]):string{return steps.join(', ');}
  setSteps(field:'learningSteps'|'relearningSteps',value:string):void{const draft=this.draft();if(draft)this.draft.set({...draft,[field]:this.steps(value)});}
  async save():Promise<void>{const draft=this.draft();if(!draft)return;try{await this.store.saveStudyPreset(draft);this.message.set('Study preset saved. Future reviews use these settings.');this.error.set('');}catch(error){this.fail(error);}}
  async duplicate():Promise<void>{try{const id=await this.store.duplicateStudyPreset(this.selectedId(),this.newName);this.newName='';this.selectedId.set(id);this.message.set('Preset duplicated.');}catch(error){this.fail(error);}}
  async create():Promise<void>{try{const id=await this.store.duplicateStudyPreset(BALANCED_PRESET_ID,this.createName.trim()||'New study preset');this.createName='';this.selectedId.set(id);this.message.set('Study preset created from safe defaults.');}catch(error){this.fail(error);}}
  async restore():Promise<void>{try{await this.store.restoreStudyPreset(this.selectedId());this.message.set('Safe defaults restored.');}catch(error){this.fail(error);}}
  async remove():Promise<void>{try{await this.store.deleteStudyPreset(this.selectedId(),this.replacementId);this.selectedId.set(this.replacementId);this.message.set('Preset removed and referenced decks reassigned.');}catch(error){this.fail(error);}}
  async assign(deck:Deck,presetId:string):Promise<void>{try{await this.store.saveDeck({...deck,studyPresetId:presetId});this.message.set(`${deck.name} now uses ${this.presets().find(item=>item.id===presetId)?.name}.`);}catch(error){this.fail(error);}}
  async override(deck:Deck,field:'newCardsPerDay'|'maxReviewsPerDay',raw:string):Promise<void>{try{const value=raw===''?undefined:Number(raw),studyOverrides={...(deck.studyOverrides??{}),[field]:value};if(value===undefined)delete studyOverrides[field];await this.store.saveDeck({...deck,studyOverrides});this.message.set(`${deck.name} override saved.`);}catch(error){this.fail(error);}}
  async applyToday():Promise<void>{const data=this.store.data();if(!data||!this.todayDeck)return;try{await this.store.setTodayOverride({deckId:this.todayDeck,studyDay:dayKey(new Date(),data.preferences.timeZone),...(this.todayNew===null?{}:{newCardsPerDay:this.todayNew}),...(this.todayReviews===null?{}:{maxReviewsPerDay:this.todayReviews})});this.message.set('Today-only limits applied. The preset is unchanged.');}catch(error){this.fail(error);}}
  todayOverride(){const data=this.store.data();if(!data||!this.todayDeck)return undefined;return data.todayOverrides.find(item=>item.deckId===this.todayDeck&&item.studyDay===dayKey(new Date(),data.preferences.timeZone));}
  async clearToday():Promise<void>{const data=this.store.data();if(!data||!this.todayDeck)return;try{await this.store.clearTodayOverride(this.todayDeck,dayKey(new Date(),data.preferences.timeZone));this.todayNew=null;this.todayReviews=null;this.message.set('Today-only limits cleared.');}catch(error){this.fail(error);}}
  private fail(error:unknown):void{this.error.set(error instanceof Error?error.message:'Could not save study settings.');this.message.set('');}
}
