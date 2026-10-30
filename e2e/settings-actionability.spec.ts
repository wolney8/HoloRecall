import type { Page } from '@playwright/test';
import { expect, navigate, openApp, snapshot, test } from './helpers';

async function addFrontAudio(page: Page):Promise<void>{
  await page.evaluate(()=>new Promise<void>((resolve,reject)=>{
    const hash=`sha256:${'2'.repeat(64)}`,bytes=new Uint8Array(8044),view=new DataView(bytes.buffer),ascii=(offset:number,value:string)=>[...value].forEach((character,index)=>bytes[offset+index]=character.charCodeAt(0));
    ascii(0,'RIFF');view.setUint32(4,8036,true);ascii(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,8000,true);view.setUint32(28,8000,true);view.setUint16(32,1,true);view.setUint16(34,8,true);ascii(36,'data');view.setUint32(40,8000,true);bytes.fill(128,44);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);const audio=`data:audio/wav;base64,${btoa(binary)}`;
    const open=indexedDB.open('holorecall-local-v1',2);
    open.onerror=()=>reject(open.error);
    open.onsuccess=()=>{
      const db=open.result,tx=db.transaction(['local-study','local-media'],'readwrite'),store=tx.objectStore('local-study'),media=tx.objectStore('local-media'),read=store.get('snapshot');
      read.onsuccess=()=>{const state=read.result;state.version++;state.assets.push({id:'settings-audio',name:'settings.wav',mime:'audio/wav',contentHash:hash,byteLength:bytes.length});state.cards[0].frontAudio=['asset:settings-audio'];media.put(audio,hash);store.put(state,'snapshot');};
      tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);
    };
  }));
}

test('review presentation settings change the authoritative Study player', async ({ page }) => {
  await openApp(page);
  await navigate(page, 'Settings');
  await page.getByRole('switch', { name: 'Show remaining counts' }).click();
  await page.getByRole('switch', { name: 'Show predicted next timing' }).click();
  await page.getByRole('switch', { name: 'Show card timer' }).click();
  await page.getByRole('spinbutton', { name: 'Maximum recorded answer time' }).fill('5');
  await page.getByRole('button', { name: 'Save study settings' }).click();
  await expect(page.getByRole('status')).toContainText('Study preset saved');

  await navigate(page, 'Study');
  await page.getByRole('button', { name: 'Check for due cards' }).click();
  await expect(page.locator('.session-bar > strong')).toHaveCount(0);
  await expect(page.getByLabel('Visible card timer')).toHaveText('0:00');
  await page.getByRole('button', { name: /Check answer/ }).click();
  await page.getByRole('button',{name:'About the ratings'}).click();
  await expect(page.getByRole('dialog',{name:'About the ratings'}).getByText(/Next review: (Soon|.*day)/).first()).toBeVisible();

  const state = await snapshot(page);
  expect(state.studyPresets.find(preset => preset.id === 'balanced')).toMatchObject({
    showRemainingCounts: false,
    showNextReviewTimes: true,
    showAnswerTimer: true,
    maxAnswerSeconds: 5,
  });
});

test('audio autoplay and stop-on-action settings alter playback behavior', async ({ page }) => {
  await page.addInitScript(()=>{
    HTMLMediaElement.prototype.play=function(){document.documentElement.dataset['audioPlaying']='true';queueMicrotask(()=>this.dispatchEvent(new Event('playing')));return Promise.resolve();};
    HTMLMediaElement.prototype.pause=function(){document.documentElement.dataset['audioPauses']=String(Number(document.documentElement.dataset['audioPauses']??0)+1);};
  });
  await openApp(page);
  await addFrontAudio(page);
  await page.reload();
  await navigate(page, 'Settings');
  await page.getByRole('switch', { name: 'Autoplay card audio' }).click();
  await page.getByRole('switch', { name: 'Stop audio on reveal or rating' }).click();
  await page.getByRole('button', { name: 'Save study settings' }).click();
  await navigate(page, 'Study');
  await page.getByRole('button', { name: 'Check for due cards' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-audio-playing','true');
  await expect(page.getByRole('button',{name:'Pause front audio 1'})).toBeVisible();
  await page.waitForTimeout(100);
  const pausesBeforeReveal=Number(await page.locator('html').getAttribute('data-audio-pauses')??0);
  await page.getByRole('button', { name: /Check answer/ }).click();
  expect(Number(await page.locator('html').getAttribute('data-audio-pauses')??0)).toBe(pausesBeforeReveal);
});

test('enabled stop-on-action pauses current audio at reveal', async ({ page }) => {
  await page.addInitScript(()=>{
    HTMLMediaElement.prototype.play=function(){document.documentElement.dataset['audioPlaying']='true';queueMicrotask(()=>this.dispatchEvent(new Event('playing')));return Promise.resolve();};
    HTMLMediaElement.prototype.pause=function(){document.documentElement.dataset['audioPauses']=String(Number(document.documentElement.dataset['audioPauses']??0)+1);};
  });
  await openApp(page);
  await addFrontAudio(page);
  await page.reload();
  await navigate(page, 'Settings');
  await page.getByRole('switch', { name: 'Autoplay card audio' }).click();
  await page.getByRole('button', { name: 'Save study settings' }).click();
  await navigate(page, 'Study');
  await page.getByRole('button', { name: 'Check for due cards' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-audio-playing','true');
  await expect(page.getByRole('button',{name:'Pause front audio 1'})).toBeVisible();
  await page.waitForTimeout(100);
  const pausesBeforeReveal=Number(await page.locator('html').getAttribute('data-audio-pauses')??0);
  await page.getByRole('button', { name: /Check answer/ }).click();
  await expect.poll(async()=>Number(await page.locator('html').getAttribute('data-audio-pauses')??0)).toBe(pausesBeforeReveal+1);
});
