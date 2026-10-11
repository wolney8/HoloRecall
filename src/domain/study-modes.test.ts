import {describe,expect,it} from 'vitest';
import {createInitialState,applyScheduledReview} from './study';
import {recordPracticeRating} from './practice';
import type {CardContent,State,StudyExperienceMode} from './models';

const now=new Date('2026-10-09T12:00:00.000Z');
const card:CardContent={id:'ciao',deckId:'lesson',kind:'text',front:'Recall the greeting',answer:'Ciao!',pronunciation:'CHOW',meaning:'Hi',notes:'',tags:[],revision:1,suspended:false};
function session(mode:StudyExperienceMode):State{
  const state=createInitialState([{id:'lesson',name:'Lesson',description:'',suspended:false}],[card]);
  state.session={id:`${mode}-session`,mode:mode==='free-revision'?'practice':'scheduled',experienceMode:mode,label:mode,queue:['ciao'],total:1,plannedTotal:1,completed:0,revealed:true,activeMs:0,scopeDeckId:'lesson'};
  return state;
}

describe('Study Mode domain boundary',()=>{
  it('repeats learning and relearning cards in Anki mode using the real preset-backed FSRS transition',()=>{
    const before=session('anki'),after=applyScheduledReview(before,{id:'anki-again',cardId:'ciao',sessionId:'anki-session',rating:1,now});
    expect(after.session).toMatchObject({experienceMode:'anki',queue:['ciao'],completed:1,total:2});
    expect(after.session?.repetitionDue?.['ciao']).toBe(after.states['ciao']!.due);
    expect(after.events).toHaveLength(1);
  });

  it('orders multiple Anki learning repeats by their actual FSRS step due time',()=>{
    let state=createInitialState([{id:'lesson',name:'Lesson',description:'',suspended:false}],[card,{...card,id:'buongiorno',answer:'Buongiorno!'}]);
    state.session={id:'anki-steps',mode:'scheduled',experienceMode:'anki',label:'Anki mode',queue:['ciao','buongiorno'],total:2,plannedTotal:2,completed:0,revealed:true,activeMs:0,scopeDeckId:'lesson'};
    state=applyScheduledReview(state,{id:'hard-first',cardId:'ciao',sessionId:'anki-steps',rating:2,now});
    state.session!.revealed=true;
    state=applyScheduledReview(state,{id:'again-second',cardId:'buongiorno',sessionId:'anki-steps',rating:1,now});
    expect(Date.parse(state.session!.repetitionDue!.buongiorno!)).toBeLessThan(Date.parse(state.session!.repetitionDue!.ciao!));
    expect(state.session?.queue).toEqual(['buongiorno','ciao']);
  });

  it('keeps Mastery mode on the genuine scheduled-review and reward path',()=>{
    const before=session('mastery'),after=applyScheduledReview(before,{id:'mastery-hard',cardId:'ciao',sessionId:'mastery-session',rating:2,now});
    expect(after.session).toMatchObject({experienceMode:'mastery',queue:[],completed:1,total:1});
    expect(after.events).toHaveLength(1);
    expect(after.practiceEvents).toEqual([]);
    expect(after.states['ciao']).toBeDefined();
    expect(after.rewardEvents.length).toBeGreaterThanOrEqual(before.rewardEvents.length);
  });

  it.each(['anki','mastery'] as const)('records %s as an eligible scheduled mode without changing scheduler semantics',mode=>{
    const before=session(mode),after=applyScheduledReview(before,{id:`${mode}-eligible`,cardId:'ciao',sessionId:`${mode}-session`,rating:4,now});
    const review=after.events.find(event=>event.kind==='review');
    expect(review?.kind==='review'&&review.experienceMode).toBe(mode);
    expect(after.rewardEvents.some(event=>event.kind==='contribution'&&event.reviewEventId===`${mode}-eligible`)).toBe(true);
  });

  it('keeps Free Revision entirely outside FSRS, due dates and rewards',()=>{
    const before=session('free-revision'),after=recordPracticeRating(before,{id:'free-rating',cardId:'ciao',sessionId:'free-revision-session',rating:5,now});
    expect(after.practiceEvents).toHaveLength(1);
    expect(after.events).toEqual([]);
    expect(after.states).toEqual({});
    expect(after.rewardEvents).toEqual([]);
  });
});
