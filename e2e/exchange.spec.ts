import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { writeWorkbook } from '../src/domain/exchange';
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
