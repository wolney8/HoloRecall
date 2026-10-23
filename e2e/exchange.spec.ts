import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { HEADERS, writeWorkbook } from '../src/domain/exchange';
import type { State } from '../src/domain/models';
import { acceptScheduledReview } from '../src/test/scheduled-review';

async function snapshot(page: Page): Promise<State> {
  return page.evaluate(() => new Promise<State>((resolve, reject) => {
    const open = indexedDB.open('holorecall-local-v1', 2);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result; const transaction = db.transaction(['local-study','local-media'], 'readonly');
      const read = transaction.objectStore('local-study').get('snapshot'); read.onerror = () => reject(read.error);read.onsuccess=()=>{const state=read.result as State,media=transaction.objectStore('local-media'),pending=state.assets.map(asset=>{const request=media.get(asset.contentHash??`asset:${asset.id}`);return new Promise<void>((done,fail)=>{request.onsuccess=()=>{asset.dataUrl=request.result;done();};request.onerror=()=>fail(request.error);});});Promise.all(pending).then(()=>resolve(state),reject);};transaction.oncomplete = () => db.close();
    };
  }));
}
async function openExchange(page: Page): Promise<void> {
  await page.goto('/#exchange'); await expect(page.getByRole('heading', { name: 'Exchange', exact: true })).toBeVisible();
}
async function replaceSnapshot(page:Page,state:State):Promise<void>{
  await page.evaluate(next=>new Promise<void>((resolve,reject)=>{const open=indexedDB.open('holorecall-local-v1',2);open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,transaction=db.transaction('local-study','readwrite');transaction.objectStore('local-study').put(next,'snapshot');transaction.oncomplete=()=>{db.close();resolve();};transaction.onerror=()=>reject(transaction.error);};}),state);
}

test('XLSX preview adds accented content atomically and preserves existing cards across reload', async ({ page }) => {
  await openExchange(page); const before = await snapshot(page);
  const workbook = await writeWorkbook({
    decks: [{ id: 'exchange-test', name: 'Caffè e città', description: 'Prima riga\nSeconda riga', suspended: false }],
    cards: [{ id: 'exchange-test-card', deckId: 'exchange-test', kind: 'text', front: 'Translate “the city”.', answer: 'la città', pronunciation: 'lah cheet-TAH', meaning: 'the city', notes: 'Line one\nLine two', tags: ['Accenti'], rarity: 'ultra-rare', revision: 1, suspended: false }], designs: [], assets: [],
  });
  await page.getByLabel('Workbook or portable archive').setInputFiles({ name: 'new-content.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(workbook) });
  await expect(page.getByRole('heading', { name: 'Import preview' })).toBeVisible();
  await expect(page.getByText('exchange-test-card', { exact: true })).toBeVisible();
  expect((await snapshot(page)).cards).toEqual(before.cards);
  await page.getByRole('button', { name: 'Apply 1 card changes', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Imported 1 new cards');
  await page.reload(); await expect(page.getByRole('heading', { name: 'Exchange', exact: true })).toBeVisible();
  const after = await snapshot(page);
  expect(after.cards).toHaveLength(before.cards.length + 1); expect(after.events).toEqual(before.events); expect(after.states).toEqual(before.states); expect(after.rewardEvents).toEqual(before.rewardEvents);
  expect(after.cards.find(card => card.id === 'exchange-test-card')).toMatchObject({ answer: 'la città', notes: 'Line one\nLine two', rarity: 'ultra-rare' });
});

test('XLSX production export round-trips its v11 contract without replacing learner state', async ({ page, browser }) => {
  await openExchange(page);
  const source=await snapshot(page),deckIds=new Map(source.decks.map(deck=>[deck.id,`xlsx-${deck.id}`])),cardIds=new Map(source.cards.map(card=>[card.id,`xlsx-${card.id}`])),designId='xlsx-design';
  source.decks=source.decks.map(deck=>({...deck,id:deckIds.get(deck.id)!,parentId:deck.parentId?deckIds.get(deck.parentId):undefined,designSetId:designId,description:'Città e caffè\nWorkbook contract'}));
  source.cards=source.cards.map(card=>({...card,id:cardIds.get(card.id)!,deckId:deckIds.get(card.deckId)!}));
  source.cards[0]={...source.cards[0]!,kind:'visual',front:'Qual è il frutto?\nRispondi in italiano.',answer:'il limone',secondary:'lee-MOH-neh',interpretation:'the lemon',notes:'Unicode café · multiline\nsecond line',tags:['Accenti','Due parole'],rarity:'secret-rare',finish:'aurora',designSetId:designId,presentation:{profile:'language',recallTask:'Name the illustrated fruit',situationContext:'At the market',taskGuidance:'Include the article',hint:'It starts with l',artRole:'instructional',studyArtPolicy:'image-first'},imageOcclusion:{version:1,source:'holorecall-native',mode:'hide-all-guess-one',activeGroupId:'fruit',shapes:[{id:'fruit-mask',groupId:'fruit',type:'rect',x:.2,y:.25,width:.3,height:.35,targetDescription:'The fruit'}],header:'Identify the fruit',backExtra:'Review the article.',imageDescription:'A lemon study illustration.',targetDescription:'The lemon',imageWidth:900,imageHeight:900}};
  source.designs=[{id:designId,name:'Workbook Aurora',finish:'aurora',layout:'showcase',composition:'illustration-window',layoutPolicy:'fixed',palette:{primary:'#315c49',secondary:'#203d32',surface:'#101713',onSurface:'#ffffff',accent:'#d8ff70'},artwork:{focalX:50,focalY:45,fit:'contain',treatment:'embedded',mask:'rounded-window'},studyArtPolicy:'image-first',backgroundFit:'cover',backgroundPositionX:50,backgroundPositionY:50,frameFit:'contain',credit:'HoloRecall',source:'Local',license:'Original'}];
  source.assets=[];source.ankiSources=[];source.ankiMappings=[];source.ankiConversionProfiles=[];source.version+=1;
  await replaceSnapshot(page,source);await page.reload();await page.getByRole('tab',{name:'Export'}).click();
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export XLSX',exact:true}).click()]);
  expect(download.suggestedFilename()).toMatch(/^holorecall-all-decks-\d{4}-\d{2}-\d{2}-v11\.xlsx$/);
  const bytes=await readFile((await download.path())!),sha256=createHash('sha256').update(bytes).digest('hex'),generated=page.getByLabel('Generated XLSX integrity');
  await expect(generated).toContainText(`${bytes.byteLength} bytes`);await expect(generated).toContainText(`SHA-256 ${sha256}`);

  const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(bytes as never);
  expect(workbook.worksheets.map(sheet=>sheet.name)).toEqual(['Metadata','Decks','Cards','Designs','Assets']);
  for(const [name,headers] of Object.entries(HEADERS)){expect((workbook.getWorksheet(name)!.getRow(1).values as unknown[]).slice(1)).toEqual([...headers]);}
  expect(workbook.getWorksheet('Metadata')!.getCell('B2').text).toBe('11');
  expect(workbook.getWorksheet('Decks')!.rowCount).toBe(2);expect(workbook.getWorksheet('Cards')!.rowCount).toBe(17);expect(workbook.getWorksheet('Designs')!.rowCount).toBe(2);expect(workbook.getWorksheet('Assets')!.rowCount).toBe(1);
  const cardSheet=workbook.getWorksheet('Cards')!,headers=(cardSheet.getRow(1).values as unknown[]).slice(1).map(String),row=cardSheet.getRow(2),cell=(name:string)=>row.getCell(headers.indexOf(name)+1).text;
  expect(cell('card_id')).toBe('xlsx-it-limone');expect(cell('front_text')).toBe('Qual è il frutto?\nRispondi in italiano.');expect(cell('tags')).toBe('["Accenti","Due parole"]');expect(cell('rarity')).toBe('secret-rare');expect(cell('back_media')).toBe('');
  expect(JSON.parse(cell('presentation'))).toMatchObject({recallTask:'Name the illustrated fruit',situationContext:'At the market'});expect(JSON.parse(cell('image_occlusion'))).toMatchObject({activeGroupId:'fruit',header:'Identify the fruit'});

  const receivingContext=await browser.newContext(),receiver=await receivingContext.newPage();await openExchange(receiver);let receiving=await snapshot(receiver);
  receiving=acceptScheduledReview(receiving,{id:'xlsx-existing-review',cardId:receiving.cards[0]!.id,sessionId:'xlsx-existing-session',rating:4,now:new Date('2026-10-23T12:00:00Z'),activeMs:1200,recallMs:500});
  await replaceSnapshot(receiver,receiving);await receiver.reload();const before=await snapshot(receiver),input=receiver.getByLabel('Workbook or portable archive');
  const chooserPromise=receiver.waitForEvent('filechooser');await input.click();const chooser=await chooserPromise;await chooser.setFiles([]);expect(await snapshot(receiver)).toEqual(before);await expect(receiver.getByLabel('Selected XLSX integrity')).toHaveCount(0);
  await input.setInputFiles({name:download.suggestedFilename(),mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:bytes});
  await expect(receiver.getByRole('heading',{name:'Import preview'})).toBeVisible();const selected=receiver.getByLabel('Selected XLSX integrity');await expect(selected).toContainText(`${bytes.byteLength} bytes`);await expect(selected).toContainText(`SHA-256 ${sha256}`);await expect(receiver.getByText(/1 new decks · 0 deck updates · 1 new designs/)).toBeVisible();expect(await snapshot(receiver)).toEqual(before);
  await receiver.getByRole('button',{name:'Apply 16 card changes',exact:true}).click();await expect(receiver.getByRole('status').filter({hasText:'Imported 16 new cards'})).toBeVisible();await receiver.reload();await expect(receiver.getByRole('heading',{name:'Exchange',exact:true})).toBeVisible();
  const data=await snapshot(receiver),imported=data.cards.find(card=>card.id==='xlsx-it-limone');expect(imported).toMatchObject({front:'Qual è il frutto?\nRispondi in italiano.',answer:'il limone',secondary:'lee-MOH-neh',interpretation:'the lemon',tags:['Accenti','Due parole'],rarity:'secret-rare',finish:'aurora',designSetId:designId,presentation:{recallTask:'Name the illustrated fruit',situationContext:'At the market'},imageOcclusion:{activeGroupId:'fruit',header:'Identify the fruit'}});expect(data.designs.find(design=>design.id===designId)).toMatchObject({name:'Workbook Aurora',composition:'illustration-window',studyArtPolicy:'image-first'});
  expect(data.events).toEqual(before.events);expect(data.states).toEqual(before.states);expect(data.practiceEvents).toEqual(before.practiceEvents);expect(data.rewardEvents).toEqual(before.rewardEvents);expect(data.assets).toEqual(before.assets);expect(data.ankiSources).toEqual(before.ankiSources);expect(data.ankiMappings).toEqual(before.ankiMappings);expect(data.ankiConversionProfiles).toEqual(before.ankiConversionProfiles);
  await receiver.getByLabel('Workbook or portable archive').setInputFiles({name:download.suggestedFilename(),mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:bytes});const duplicatePreview=receiver.getByRole('region',{name:'Import preview'});await expect(duplicatePreview.getByText('16',{exact:true})).toBeVisible();await expect(duplicatePreview.getByText('Unchanged cards',{exact:true})).toBeVisible();await expect(receiver.getByRole('button',{name:'Apply 0 card changes',exact:true})).toBeDisabled();expect((await snapshot(receiver)).cards).toEqual(data.cards);await receivingContext.close();
});

test('HoloRecall package round-trips exact bytes through the production picker without replacing learner state', async ({ page, browser }) => {
  await openExchange(page);
  const source=await snapshot(page),deckIds=new Map(source.decks.map(deck=>[deck.id,`portable-${deck.id}`])),cardIds=new Map(source.cards.map(card=>[card.id,`portable-${card.id}`]));
  source.decks=source.decks.map(deck=>({...deck,id:deckIds.get(deck.id)!,parentId:deck.parentId?deckIds.get(deck.parentId):undefined}));
  source.cards=source.cards.map(card=>({...card,id:cardIds.get(card.id)!,deckId:deckIds.get(card.deckId)!}));
  source.version+=1;await replaceSnapshot(page,source);await page.reload();
  await page.getByRole('tab', { name: 'Export' }).click();
  await expect(page.getByRole('combobox',{name:'Deck branch'})).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export package', exact: true }).click()]);
  expect(download.suggestedFilename()).toMatch(/^holorecall-all-decks-\d{4}-\d{2}-\d{2}-v11\.zip$/);
  const bytes = await readFile((await download.path())!),sha256=createHash('sha256').update(bytes).digest('hex'),generated=page.getByLabel('Generated portable ZIP integrity');
  await expect(generated).toContainText(`${bytes.byteLength} bytes`);await expect(generated).toContainText(`SHA-256 ${sha256}`);

  const receivingContext=await browser.newContext(),receiver=await receivingContext.newPage();
  await openExchange(receiver);let receiving=await snapshot(receiver);
  receiving=acceptScheduledReview(receiving,{id:'portable-existing-review',cardId:receiving.cards[0]!.id,sessionId:'portable-existing-session',rating:4,now:new Date('2026-10-23T12:00:00Z'),activeMs:1200,recallMs:500});
  await replaceSnapshot(receiver,receiving);await receiver.reload();const before=await snapshot(receiver),input=receiver.getByLabel('Workbook or portable archive');
  const chooserPromise=receiver.waitForEvent('filechooser');await input.click();const chooser=await chooserPromise;await chooser.setFiles([]);
  expect(await snapshot(receiver)).toEqual(before);await expect(receiver.getByLabel('Selected portable ZIP integrity')).toHaveCount(0);
  await input.setInputFiles({ name: download.suggestedFilename(), mimeType: 'application/zip', buffer: bytes });
  await expect(receiver.getByRole('heading', { name: 'Import preview' })).toBeVisible();
  const selected=receiver.getByLabel('Selected portable ZIP integrity');await expect(selected).toContainText(`${bytes.byteLength} bytes`);await expect(selected).toContainText(`SHA-256 ${sha256}`);
  await expect(receiver.getByText(/All HoloRecall decks · 1 decks · 16 cards · 16 media/)).toBeVisible();
  await expect(receiver.getByText(/16 bundled media files/)).toBeVisible();expect(await snapshot(receiver)).toEqual(before);
  await receiver.getByRole('button', { name: 'Apply 16 card changes', exact: true }).click();
  await expect(receiver.getByRole('status').filter({ hasText: 'Imported 16 new cards' })).toBeVisible();
  await receiver.reload(); await expect(receiver.getByRole('heading', { name: 'Exchange', exact: true })).toBeVisible();
  const data = await snapshot(receiver); expect(data.cards).toHaveLength(before.cards.length+16);expect(data.assets).toHaveLength(16);
  expect(data.cards.filter(card=>card.id.startsWith('portable-')).every(card => card.image?.startsWith('asset:'))).toBe(true);
  expect(data.events).toEqual(before.events);expect(data.states).toEqual(before.states);expect(data.practiceEvents).toEqual(before.practiceEvents);expect(data.rewardEvents).toEqual(before.rewardEvents);
  expect(data.assets.every(asset => asset.dataUrl.startsWith('data:image/png;base64,') && asset.width === 900)).toBe(true);
  await receiver.getByLabel('Workbook or portable archive').setInputFiles({ name: download.suggestedFilename(), mimeType: 'application/zip', buffer: bytes });
  await expect(receiver.getByText('This package is already present; importing it again would make no content changes.')).toBeVisible();
  await expect(receiver.getByRole('button', { name: 'Apply 0 card changes', exact: true })).toBeDisabled();
  expect((await snapshot(receiver)).cards).toEqual(data.cards);await receivingContext.close();
});

test('formula workbook is blocked in preview without changing stored data', async ({ page }) => {
  await openExchange(page); const before = await snapshot(page);
  const bytes = await readFile('public/downloads/holorecall-italian-v1.xlsx'); const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(bytes as never);
  workbook.getWorksheet('Cards')!.getCell('E2').value = { formula: '1+1', result: 2 };
  await page.getByLabel('Workbook or portable archive').setInputFiles({ name: 'formula.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(await workbook.xlsx.writeBuffer()) });
  await expect(page.getByRole('heading', { name: 'Import blocked' })).toBeVisible();
  await expect(page.getByText(/Formula cells and defined names are not allowed/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Apply .* card changes/ })).toHaveCount(0); expect(await snapshot(page)).toEqual(before);
});
