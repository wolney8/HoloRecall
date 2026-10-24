import { readFile } from 'node:fs/promises';
import { expect, navigate, openApp, snapshot, test } from './helpers';

test('HR-NATIVE-08A imports, persists and plays MP3 and WAV through the production Study card',async({page})=>{
  await openApp(page);
  const before=await snapshot(page);
  await navigate(page,'Exchange');
  await page.getByLabel('Anki · Import Anki .apkg decks').click();
  await page.locator('#anki-import').setInputFiles({name:'native-media.apkg',mimeType:'application/zip',buffer:await readFile('e2e/fixtures/native-media.apkg')});
  await expect(page.getByLabel('Anki import result')).toContainText('2Ready');
  await page.getByRole('button',{name:'Import 2 supported cards'}).click();

  const imported=await snapshot(page),mediaCards=imported.cards.filter(card=>card.tags.includes('native-media'));
  expect(mediaCards).toHaveLength(2);
  expect(imported.assets.filter(asset=>asset.mime==='audio/mpeg')).toHaveLength(1);
  expect(imported.assets.filter(asset=>asset.mime==='audio/wav')).toHaveLength(1);
  expect(mediaCards.every(card=>card.frontAudio?.length===1)).toBe(true);
  expect(imported.events).toEqual(before.events);
  expect(imported.rewardEvents).toEqual(before.rewardEvents);
  expect(imported.practiceEvents).toEqual(before.practiceEvents);

  await page.reload();
  const recovered=await snapshot(page);
  expect(recovered.assets.filter(asset=>asset.mime.startsWith('audio/'))).toEqual(imported.assets.filter(asset=>asset.mime.startsWith('audio/')));
  await navigate(page,'Decks');
  const deck=page.locator('.deck-journey').filter({has:page.getByRole('heading',{name:'HoloRecall Native Media',exact:true})});
  await expect(deck).toBeVisible();
  await deck.getByRole('button',{name:'Study',exact:true}).first().click();
  await expect(page).toHaveURL(/#study/);

  await page.evaluate(()=>{
    const NativeAudio=window.Audio;
    (window as typeof window&{__hrLastAudio?:HTMLAudioElement}).Audio=function(source?:string){
      const audio=new NativeAudio(source);
      (window as typeof window&{__hrLastAudio?:HTMLAudioElement}).__hrLastAudio=audio;
      return audio;
    } as typeof Audio;
  });
  for(const media of ['MP3','WAV']){
    await expect(page.getByRole('heading',{name:`Play the imported ${media} tone`})).toBeVisible();
    const play=page.getByRole('button',{name:'Play front audio 1'});
    await play.click();
    await expect(page.getByRole('button',{name:'Pause front audio 1'})).toBeVisible();
    await expect.poll(()=>page.evaluate(()=>(window as typeof window&{__hrLastAudio?:HTMLAudioElement}).__hrLastAudio?.src??'')).toMatch(/^data:audio\/(?:mpeg|wav);base64,/);
    await expect.poll(()=>page.evaluate(()=>(window as typeof window&{__hrLastAudio?:HTMLAudioElement}).__hrLastAudio?.readyState??0)).toBeGreaterThanOrEqual(2);
    await expect.poll(()=>page.evaluate(()=>(window as typeof window&{__hrLastAudio?:HTMLAudioElement}).__hrLastAudio?.currentTime??0)).toBeGreaterThan(0);
    await page.getByRole('button',{name:/Check answer/}).click();
    await page.getByRole('button',{name:/4 Good Confident/}).click();
  }
});
