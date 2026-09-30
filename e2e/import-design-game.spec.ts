import { expect, test, openApp } from './helpers';
import initSqlJs from 'sql.js';
import JSZip from 'jszip';

async function tinyApkg(): Promise<Buffer> {
  const SQL = await initSqlJs(); const db = new SQL.Database();
  db.run('create table col (models text, decks text)'); db.run('create table notes (id integer, guid text, mid integer, tags text, flds text)'); db.run('create table cards (id integer, nid integer, did integer, ord integer)');
  db.run('insert into col values (?,?)', [JSON.stringify({ 1: { name: 'Basic', type: 0, flds: [{ name: 'Front' }, { name: 'Back' }], tmpls: [{ name: 'Card 1', qfmt: '{{Front}}', afmt: '{{Back}}' }] } }), JSON.stringify({ 10: { name: 'Tiny imported deck' } })]);
  db.run('insert into notes values (?,?,?,?,?)', [100, 'browser-guid', 1, 'italiano', 'buongiorno\x1fgood morning']); db.run('insert into cards values (?,?,?,?)', [200, 100, 10, 0]);
  const zip = new JSZip(); zip.file('collection.anki2', db.export()); zip.file('media', '{}'); db.close(); return Buffer.from(await zip.generateAsync({ type: 'uint8array' }));
}

test('HR-IMPORT-01 analyses, previews and atomically imports an Anki package', async ({ page }) => {
  await openApp(page); await page.getByRole('button', { name: 'Import / export' }).click();
  await page.locator('#anki-import').setInputFiles({ name: 'tiny.apkg', mimeType: 'application/zip', buffer: await tinyApkg() });
  await expect(page.getByText('legacy-anki2')).toBeVisible(); await expect(page.getByText('1', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/1 new · 0 updates/)).toBeVisible(); await page.getByRole('button', { name: 'Import 1 supported cards' }).click();
  await expect(page.getByText(/Imported 1 Anki cards/)).toBeVisible(); await page.getByRole('button', { name: 'Decks' }).click(); await expect(page.getByText('good morning', { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByText('good morning', { exact: true })).toBeVisible();
});

test('HR-DESIGN-02 previews distinct finish/layout settings and HR-GAME-01 shows real next progress', async ({ page }) => {
  await openApp(page); await page.getByRole('button', { name: 'Design Studio' }).click();
  const preview = page.locator('hr-design-studio .memory-card'); await expect(preview).toHaveAttribute('data-finish', 'matte'); await expect(preview).toHaveAttribute('data-layout', 'clean');
  await page.getByLabel('Frame family').click(); await page.getByRole('option', { name: 'Ornate etched' }).click();
  await page.getByLabel('Base finish').click(); await page.getByRole('option', { name: 'Prismatic rainbow' }).click();
  await expect(preview).toHaveAttribute('data-layout', 'ornate');
  await page.getByLabel('Selected rarity finish').click(); await page.getByRole('option', { name: 'Aurora premium' }).click(); await expect(preview).toHaveAttribute('data-finish', 'aurora');
  await page.getByRole('button', { name: 'Collection' }).click(); await expect(page.getByText('NEXT UNLOCK', { exact: true })).toBeVisible(); await expect(page.locator('.next-unlock mat-progress-bar')).toHaveCount(1);
});
