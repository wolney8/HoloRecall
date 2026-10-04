import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import type { ConfidenceRating } from '../../domain/models';
import { LocalStudyStore } from '../data/study-store';
import { AppLifecycle } from './app-lifecycle';

export type FeedbackCue = 'selection'|'card-reveal'|'rating-accepted'|'card-deal'|'session-complete'|'cosmetic-unlock'|'warning'|'error';

export interface FeedbackDriver {
  available(): Promise<boolean>;
  perform(cue: FeedbackCue): Promise<void>;
}

export type HapticOperation='selection'|'light-impact'|'success'|'warning'|'error';
export function hapticOperation(cue:FeedbackCue):HapticOperation{return cue==='selection'||cue==='rating-accepted'?'selection':cue==='card-reveal'||cue==='card-deal'?'light-impact':cue==='warning'?'warning':cue==='error'?'error':'success';}
export function shouldPerformFeedback(input:{available:boolean;failed:boolean;enabled:boolean;active:boolean;focused:boolean}):boolean{return input.available&&!input.failed&&input.enabled&&input.active&&input.focused;}

@Injectable({providedIn:'root'})
export class CapacitorFeedbackDriver implements FeedbackDriver {
  private unavailable=false;
  async available():Promise<boolean>{
    if(this.unavailable)return false;
    try{return (await import('@capacitor/core')).Capacitor.isNativePlatform();}catch{this.unavailable=true;return false;}
  }
  async perform(cue:FeedbackCue):Promise<void>{
    const {Haptics,ImpactStyle,NotificationType}=await import('@capacitor/haptics');
    const operation=hapticOperation(cue);
    if(operation==='selection'){await Haptics.selectionStart();await Haptics.selectionChanged();await Haptics.selectionEnd();return;}
    if(operation==='light-impact'){await Haptics.impact({style:ImpactStyle.Light});return;}
    const type=operation==='error'?NotificationType.Error:operation==='warning'?NotificationType.Warning:NotificationType.Success;
    await Haptics.notification({type});
  }
}

export const FEEDBACK_DRIVER=new InjectionToken<FeedbackDriver>('Platform feedback driver',{providedIn:'root',factory:()=>inject(CapacitorFeedbackDriver)});

/** Semantic interaction feedback. Failures disable the adapter for this run and never block learning. */
@Injectable({providedIn:'root'})
export class InteractionFeedback {
  private readonly driver=inject(FEEDBACK_DRIVER);
  private readonly store=inject(LocalStudyStore);
  private readonly lifecycle=inject(AppLifecycle);
  private failed=false;
  readonly available=signal(false);
  constructor(){void this.driver.available().then(value=>this.available.set(value)).catch(()=>this.available.set(false));}
  selection():void{this.emit('selection');}
  cardReveal():void{this.emit('card-reveal');}
  ratingAccepted(_rating:ConfidenceRating):void{this.emit('rating-accepted');}
  cardDeal():void{this.emit('card-deal');}
  sessionComplete():void{this.emit('session-complete');}
  cosmeticUnlock():void{this.emit('cosmetic-unlock');}
  warning():void{this.emit('warning');}
  error():void{this.emit('error');}
  private emit(cue:FeedbackCue):void{
    if(!shouldPerformFeedback({available:this.available(),failed:this.failed,enabled:this.store.data()?.preferences.haptics!==false,active:this.lifecycle.active(),focused:this.lifecycle.focused()}))return;
    void this.driver.perform(cue).catch(()=>{this.failed=true;this.available.set(false);});
  }
}
