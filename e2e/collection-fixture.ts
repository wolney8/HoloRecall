import type { Page } from '@playwright/test';
import type { State } from '../src/domain/models';

export async function installCollectionFixture(page:Page):Promise<void>{
  await page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('holorecall-local-v1',2);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    const state=await new Promise<State>((resolve,reject)=>{const request=db.transaction('local-study','readonly').objectStore('local-study').get('snapshot');request.onsuccess=()=>resolve(request.result as State);request.onerror=()=>reject(request.error);});
    state.decks=[{id:'lesson',name:'Lesson',description:'',suspended:false},{id:'a',name:'A',description:'',suspended:false,parentId:'lesson'},{id:'b',name:'B',description:'',suspended:false,parentId:'lesson'}];
    state.cards=Array.from({length:10},(_,index)=>({id:`locked-fixture-${index}`,deckId:index<4?'a':'b',kind:'text' as const,front:`SECRET PROMPT ${index}`,answer:`SECRET ANSWER ${index}`,pronunciation:`SECRET SOUND ${index}`,meaning:`SECRET MEANING ${index}`,notes:`SECRET CLUE ${index}`,tags:['fixture'],rarity:'common' as const,revision:1,suspended:false}));
    Object.assign(state.cards[0]!,{kind:'visual',image:'/art/limone.svg',backImage:'/art/limone.svg',imageDescription:'Owned fixture illustration'});
    state.states={};state.events=[];state.rewardEvents=[];state.session=null;
    for(let index=0;index<7;index++){
      const cardId=`locked-fixture-${index}`,timestamp=`2026-10-${String(index+1).padStart(2,'0')}T10:00:00Z`,previous={due:timestamp,stability:0,difficulty:0,elapsed_days:0,scheduled_days:0,learning_steps:0,reps:0,lapses:0,state:0,version:0},result={...previous,due:`2026-11-${String(index+1).padStart(2,'0')}T10:00:00Z`,last_review:timestamp,reps:1,version:1};
      state.events.push({kind:'review',id:`review-${index}`,userId:state.userId,cardId,sessionId:'fixture-session',contentRevision:1,timestamp,rating:4,grade:3,previousStateVersion:0,previousState:previous,resultingState:result,schedulerVersion:'ts-fsrs@5.4.2',configVersion:'holorecall-fsrs-v1',mode:'scheduled'});
      state.states[cardId]=result;
      state.rewardEvents.push({kind:'contribution',id:`contribution-${index}`,reviewEventId:`review-${index}`,cardId,timestamp,studyDay:`2026-10-${String(index+1).padStart(2,'0')}`,timeZone:'Europe/London',configVersion:'confidence-days-v1'});
      if(index<4)state.rewardEvents.push({kind:'unlock',id:`unlock-${index}`,reviewEventId:`review-${index}`,cardId,timestamp,rarity:'common',required:1,contributionIds:[`contribution-${index}`]});
    }
    state.version+=1;
    await new Promise<void>((resolve,reject)=>{const transaction=db.transaction('local-study','readwrite');transaction.objectStore('local-study').put(state,'snapshot');transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);});db.close();
  });
  await page.reload();
}

export async function addZeroOwnedCollectionSet(page:Page):Promise<void>{
  await page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('holorecall-local-v1',2);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    const state=await new Promise<State>((resolve,reject)=>{const request=db.transaction('local-study','readonly').objectStore('local-study').get('snapshot');request.onsuccess=()=>resolve(request.result as State);request.onerror=()=>reject(request.error);});
    state.decks.push({id:'zero-owned',name:'Unstarted set',description:'',suspended:false});
    for(let index=0;index<20;index++)state.cards.push({id:`zero-private-${index}`,deckId:'zero-owned',kind:'text',front:`ZERO PRIVATE PROMPT ${index}`,answer:`ZERO PRIVATE ANSWER ${index}`,pronunciation:`ZERO PRIVATE SOUND ${index}`,meaning:`ZERO PRIVATE MEANING ${index}`,notes:`ZERO PRIVATE CLUE ${index}`,tags:['zero-fixture'],rarity:'rare',revision:1,suspended:false});
    state.version+=1;await new Promise<void>((resolve,reject)=>{const transaction=db.transaction('local-study','readwrite');transaction.objectStore('local-study').put(state,'snapshot');transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);});db.close();
  });
  await page.reload();
}

export async function installFirstPageLockedFixture(page:Page):Promise<void>{
  await page.evaluate(async()=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('holorecall-local-v1',2);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    const state=await new Promise<State>((resolve,reject)=>{const request=db.transaction('local-study','readonly').objectStore('local-study').get('snapshot');request.onsuccess=()=>resolve(request.result as State);request.onerror=()=>reject(request.error);});
    state.decks=[{id:'edge-set',name:'Edge set',description:'',suspended:false}];state.cards=[];state.states={};state.events=[];state.rewardEvents=[];state.session=null;
    for(let index=0;index<40;index++)state.cards.push({id:`edge-private-${index}`,deckId:'edge-set',kind:'text',front:`EDGE PRIVATE PROMPT ${index}`,answer:`EDGE PRIVATE ANSWER ${index}`,pronunciation:`EDGE PRIVATE SOUND ${index}`,meaning:`EDGE PRIVATE MEANING ${index}`,notes:`EDGE PRIVATE CLUE ${index}`,tags:['edge-fixture'],rarity:'common',revision:1,suspended:false});
    for(let index=20;index<25;index++){const day=String(index-19).padStart(2,'0'),cardId=`edge-private-${index}`,timestamp=`2026-10-${day}T10:00:00Z`,previous={due:timestamp,stability:0,difficulty:0,elapsed_days:0,scheduled_days:0,learning_steps:0,reps:0,lapses:0,state:0,version:0},result={...previous,due:'2026-11-01T10:00:00Z',last_review:timestamp,reps:1,version:1};state.events.push({kind:'review',id:`edge-review-${index}`,userId:state.userId,cardId,sessionId:'edge-session',contentRevision:1,timestamp,rating:4,grade:3,previousStateVersion:0,previousState:previous,resultingState:result,schedulerVersion:'ts-fsrs@5.4.2',configVersion:'holorecall-fsrs-v1',mode:'scheduled'});state.states[cardId]=result;state.rewardEvents.push({kind:'contribution',id:`edge-contribution-${index}`,reviewEventId:`edge-review-${index}`,cardId,timestamp,studyDay:`2026-10-${day}`,timeZone:'Europe/London',configVersion:'confidence-days-v1'},{kind:'unlock',id:`edge-unlock-${index}`,reviewEventId:`edge-review-${index}`,cardId,timestamp,rarity:'common',required:1,contributionIds:[`edge-contribution-${index}`]});}
    state.version+=1;await new Promise<void>((resolve,reject)=>{const transaction=db.transaction('local-study','readwrite');transaction.objectStore('local-study').put(state,'snapshot');transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);});db.close();
  });
  await page.reload();
}
