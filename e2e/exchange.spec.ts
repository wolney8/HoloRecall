import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { writeWorkbook } from '../src/domain/exchange';
import type { State } from '../src/domain/models';

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

test('portable ZIP packages all sixteen illustrations and imports decodable durable media', async ({ page }) => {
  await openExchange(page);
  await page.getByRole('tab', { name: 'Export' }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export ZIP', exact: true }).click()]);
  const bytes = await readFile((await download.path())!);
  await page.getByRole('tab', { name: 'Import' }).click();
  await page.getByLabel('Workbook or portable archive').setInputFiles({ name: download.suggestedFilename(), mimeType: 'application/zip', buffer: bytes });
  await expect(page.getByRole('heading', { name: 'Import preview' })).toBeVisible();
  await expect(page.getByText(/16 bundled media files/)).toBeVisible();
  await page.getByRole('button', { name: 'Apply 16 card changes', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('updated 16 cards');
  await page.reload(); await expect(page.getByRole('heading', { name: 'Exchange', exact: true })).toBeVisible();
  const data = await snapshot(page); expect(data.assets).toHaveLength(16); expect(data.cards.every(card => card.image?.startsWith('asset:'))).toBe(true); expect(data.events).toEqual([]); expect(data.rewardEvents).toEqual([]);
  expect(data.assets.every(asset => asset.dataUrl.startsWith('data:image/png;base64,') && asset.width === 900)).toBe(true);
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
