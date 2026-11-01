import { test,expect,navigate,openApp,snapshot,expectNoOverflow } from './helpers';

async function enableAutoAdvance(page: Parameters<typeof openApp>[0], revealSeconds=1, answerSeconds=2):Promise<void>{
  await navigate(page,'Settings');
  const summary=page.locator('summary').filter({hasText:/Auto Advance/}),panel=summary.locator('..');
  await summary.click();
  await panel.getByRole('switch',{name:'Auto Advance',exact:true}).click();
  await panel.getByRole('spinbutton',{name:'Reveal question after'}).fill(String(revealSeconds));
  await panel.getByRole('spinbutton',{name:'Minimum answer display'}).fill(String(answerSeconds));
  await page.getByRole('button',{name:'Save study settings'}).click();
  await expect(page.getByRole('status')).toContainText('Study preset saved');
}

test('Auto Advance pauses safely, auto-reveals, requires a rating and waits for owned presentation',async({page})=>{
  await openApp(page);await enableAutoAdvance(page);
  await navigate(page,'Study');await page.getByRole('button',{name:'Check for due cards'}).click();
  const initial=await snapshot(page),ratedCardId=initial.session!.queue[0]!;
  await expect(page.getByRole('button',{name:'Pause auto'})).toBeVisible();await page.getByRole('button',{name:'Pause auto'}).click();
  await page.waitForTimeout(1_250);await expect(page.getByRole('button',{name:/Check answer/})).toBeVisible();expect(await snapshot(page)).toMatchObject({events:[],rewardEvents:[]});
  await page.reload();await expect(page.getByRole('button',{name:'Resume auto'})).toBeVisible();await page.getByRole('button',{name:'Resume auto'}).click();
  await expect(page.getByRole('heading',{name:'Rate your recall'})).toBeVisible({timeout:5_000});const revealedAt=Date.now();expect(await snapshot(page)).toMatchObject({events:[],rewardEvents:[]});
  const answer=page.getByRole('heading',{name:'il limone',exact:true});await expect(answer).toBeVisible();await page.getByRole('button',{name:/4, Confident/}).click();
  await page.waitForTimeout(1_000);await expect(answer).toBeVisible();await expect(page.getByRole('region',{name:'Current flashcard'}).locator('img')).toHaveAttribute('src','/art/caffe.svg',{timeout:2_500});expect(Date.now()-revealedAt).toBeGreaterThanOrEqual(1_700);
  const saved=await snapshot(page);expect(saved.events).toHaveLength(1);expect(saved.events[0]).toMatchObject({kind:'review',cardId:ratedCardId,rating:4});expect(saved.states[ratedCardId]).toMatchObject({reps:1});expect(saved.rewardEvents).toHaveLength(2);expect(saved.rewardEvents.map(event=>event.kind)).toEqual(['contribution','unlock']);expect(new Set(saved.rewardEvents.map(event=>event.reviewEventId))).toEqual(new Set([saved.events[0]!.id]));
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('html')).toHaveClass(/app-inactive/);await expect(page.getByRole('button',{name:'Resume auto'})).toBeVisible();await page.waitForTimeout(1_200);await expect(page.getByRole('button',{name:/Check answer/})).toBeVisible();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.getByRole('button',{name:'Resume auto'})).toBeVisible();const resumed=await snapshot(page);expect(resumed.events).toEqual(saved.events);expect(resumed.rewardEvents).toEqual(saved.rewardEvents);expect(resumed.states[ratedCardId]).toEqual(saved.states[ratedCardId]);
  await navigate(page,'Progress');await page.getByRole('tab',{name:'History',exact:true}).click();await expect(page.getByText('Confidence 4 · Good',{exact:true})).toHaveCount(1);
});

test('Auto Advance uses the shared Practice player without creating scheduled progress',async({page})=>{
  await openApp(page);await enableAutoAdvance(page,1,0);await navigate(page,'Focus');
  await page.getByRole('button',{name:/Preview new cards/}).click();await expect(page.getByTestId('study-mode-label')).toHaveText('Free Practice');
  await expect(page.getByRole('heading',{name:'Rate your recall'})).toBeVisible({timeout:2_500});const before=await snapshot(page);await page.getByRole('button',{name:/3, Hesitant/}).click();await expect(page.getByRole('progressbar',{name:/Study progress, 1 of/})).toBeVisible();
  const after=await snapshot(page);expect(after.events).toEqual(before.events);expect(after.states).toEqual(before.states);expect(after.rewardEvents).toEqual(before.rewardEvents);expect(after.practiceEvents).toHaveLength(1);
});

test('Auto reveal waits for configured card audio to finish',async({page})=>{
  await page.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){const media=this;document.documentElement.dataset['audioPlay']='started';queueMicrotask(()=>media.dispatchEvent(new Event('playing')));setTimeout(()=>{document.documentElement.dataset['audioPlay']='ended';media.dispatchEvent(new Event('ended'));},3_000);return Promise.resolve();};HTMLMediaElement.prototype.pause=function(){};});
  await openApp(page);await enableAutoAdvance(page,1,0);await page.getByRole('switch',{name:'Autoplay card audio'}).click();await page.getByRole('button',{name:'Save study settings'}).click();
  await page.evaluate(()=>new Promise<void>((resolve,reject)=>{const hash=`sha256:${'0'.repeat(64)}`,bytes=new Uint8Array(8044),view=new DataView(bytes.buffer),ascii=(offset:number,value:string)=>[...value].forEach((character,index)=>bytes[offset+index]=character.charCodeAt(0));ascii(0,'RIFF');view.setUint32(4,8036,true);ascii(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,8000,true);view.setUint32(28,8000,true);view.setUint16(32,1,true);view.setUint16(34,8,true);ascii(36,'data');view.setUint32(40,8000,true);bytes.fill(128,44);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);const audio=`data:audio/wav;base64,${btoa(binary)}`,open=indexedDB.open('holorecall-local-v1',2);open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction(['local-study','local-media'],'readwrite'),store=tx.objectStore('local-study'),media=tx.objectStore('local-media'),read=store.get('snapshot');read.onsuccess=()=>{const state=read.result;state.version++;state.assets.push({id:'auto-audio',name:'auto.wav',mime:'audio/wav',contentHash:hash,byteLength:bytes.length});state.cards[0].frontAudio=['asset:auto-audio'];media.put(audio,hash);store.put(state,'snapshot');};tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}));
  await page.reload();await navigate(page,'Study');await page.getByRole('button',{name:'Check for due cards'}).click();await expect(page.locator('html')).toHaveAttribute('data-audio-play','started');await expect(page.getByRole('status')).toContainText('audio playing');await page.waitForTimeout(1_200);expect(await page.getByRole('button',{name:/Check answer/}).isVisible()).toBe(true);expect((await snapshot(page)).events).toEqual([]);
  await expect(page.getByRole('heading',{name:'Rate your recall'})).toBeVisible({timeout:5_000});expect((await snapshot(page)).events).toEqual([]);
});

test('Rejected audio playback releases Auto Advance instead of leaving it paused',async({page})=>{
  await page.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){return Promise.reject(new DOMException('blocked','NotAllowedError'));};HTMLMediaElement.prototype.pause=function(){};});
  await openApp(page);await enableAutoAdvance(page,1,0);await page.getByRole('switch',{name:'Autoplay card audio'}).click();await page.getByRole('button',{name:'Save study settings'}).click();
  await page.evaluate(()=>new Promise<void>((resolve,reject)=>{const hash=`sha256:${'1'.repeat(64)}`,open=indexedDB.open('holorecall-local-v1',2);open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction(['local-study','local-media'],'readwrite'),store=tx.objectStore('local-study'),media=tx.objectStore('local-media'),read=store.get('snapshot');read.onsuccess=()=>{const state=read.result;state.version++;state.assets.push({id:'blocked-audio',name:'blocked.mp3',mime:'audio/mpeg',contentHash:hash,byteLength:3});state.cards[0].frontAudio=['asset:blocked-audio'];media.put('data:audio/mpeg;base64,SUQz',hash);store.put(state,'snapshot');};tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}));
  await page.reload();await navigate(page,'Study');await page.getByRole('button',{name:'Check for due cards'}).click();await expect(page.getByText(/Playback was blocked/)).toBeVisible();await expect(page.getByRole('heading',{name:'Rate your recall'})).toBeVisible({timeout:2_500});expect((await snapshot(page)).events).toEqual([]);
});

test('Auto Advance controls reflow with touch and enlarged text @ios-compact @ios-large @ios-landscape',async({page})=>{
  await openApp(page);await enableAutoAdvance(page,1,0);await navigate(page,'Study');await page.getByRole('button',{name:'Check for due cards'}).click();
  await page.addStyleTag({content:'html{-webkit-text-size-adjust:200%;text-size-adjust:200%}'});await expect(page.getByRole('button',{name:'Pause auto'})).toBeVisible();await expectNoOverflow(page);
  await page.getByRole('button',{name:'Pause auto'}).tap();await expect(page.getByRole('button',{name:'Resume auto'})).toBeVisible();await page.getByRole('button',{name:'Resume auto'}).tap();await expect(page.getByRole('heading',{name:'Rate your recall'})).toBeVisible({timeout:2_500});await expectNoOverflow(page);
});
