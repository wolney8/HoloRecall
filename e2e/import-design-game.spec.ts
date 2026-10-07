import { expect, test, expectNoOverflow, navigate, openApp, snapshot } from './helpers';
import initSqlJs from 'sql.js';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';

async function tinyApkg(): Promise<Buffer> {
  const SQL = await initSqlJs(); const db = new SQL.Database();
  db.run('create table col (models text, decks text)'); db.run('create table notes (id integer, guid text, mid integer, tags text, flds text)'); db.run('create table cards (id integer, nid integer, did integer, ord integer)');
  db.run('insert into col values (?,?)', [JSON.stringify({ 1: { name: 'Basic', type: 0, flds: [{ name: 'Front' }, { name: 'Back' }], tmpls: [{ name: 'Card 1', qfmt: '{{Front}}', afmt: '{{Back}}' }] } }), JSON.stringify({ 10: { name: 'Tiny imported deck' } })]);
  db.run('insert into notes values (?,?,?,?,?)', [100, 'browser-guid', 1, 'italiano', 'buongiorno\x1fgood morning']); db.run('insert into cards values (?,?,?,?)', [200, 100, 10, 0]);
  const zip = new JSZip(); zip.file('collection.anki2', db.export()); zip.file('media', '{}'); db.close(); return Buffer.from(await zip.generateAsync({ type: 'uint8array' }));
}

async function largeApkg(): Promise<Buffer> {
  const SQL = await initSqlJs(); const db = new SQL.Database();
  db.run('create table col (models text, decks text)'); db.run('create table notes (id integer, guid text, mid integer, tags text, flds text)'); db.run('create table cards (id integer, nid integer, did integer, ord integer)');
  db.run('insert into col values (?,?)', [JSON.stringify({ 1: { name: 'Basic', type: 0, flds: [{ name: 'Front' }, { name: 'Back' }], tmpls: [{ name: 'Card 1', qfmt: '{{Front}}', afmt: '{{Back}}' }] } }), JSON.stringify({ 10: { name: 'Responsive import fixture' } })]);
  db.run('begin'); const note = db.prepare('insert into notes values (?,?,?,?,?)'), card = db.prepare('insert into cards values (?,?,?,?)');
  for (let index = 0; index < 10_000; index++) { note.run([index + 1, `large-${index}`, 1, '', `Prompt ${index} ${'x'.repeat(180)}\x1fAnswer ${index}`]); card.run([index + 20_000, index + 1, 10, 0]); }
  note.free(); card.free(); db.run('commit'); const zip = new JSZip(); zip.file('collection.anki2', db.export()); zip.file('media', '{}'); db.close(); return Buffer.from(await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }));
}

test('HR-IMPORT-01 analyses, previews and atomically imports an Anki package', async ({ page }) => {
  await openApp(page); await navigate(page, 'Import / export');
  await page.locator('#anki-import').setInputFiles({ name: 'tiny.apkg', mimeType: 'application/zip', buffer: await tinyApkg() });
  await expect(page.getByText('legacy-anki2')).toBeVisible(); await expect(page.getByText('1', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/1 new · 0 updates/)).toBeVisible();await expect(page.getByText("Anki learning history isn't imported. These cards will use your HoloRecall study settings.")).toBeVisible();await page.getByLabel('Study using').click();await page.getByRole('option',{name:'Light workload'}).click(); await page.getByRole('button', { name: 'Import 1 supported cards' }).click();
  await expect(page.getByText(/Imported 1 new and 0 changed Anki cards/)).toBeVisible(); await page.getByRole('button', { name: 'Decks' }).click(); await expect(page.getByText('good morning', { exact: true })).toBeVisible();
  const imported=await snapshot(page),card=imported.cards.find(item=>item.answer==='good morning')!,deck=imported.decks.find(item=>item.id===card.deckId)!;expect(imported.states[card.id]).toBeUndefined();expect(deck.studyPresetId).toBe('light');await page.reload(); await expect(page.getByText('good morning', { exact: true })).toBeVisible();
});

test('HR-IMPORT-01 worker imports official custom fields and side-specific bundled audio', async ({ page }) => {
  await openApp(page);await navigate(page,'Settings');await page.getByRole('radio', { name: 'Dark', exact: true }).click();await navigate(page,'Import / export');
  const before = await snapshot(page);
  await page.locator('#anki-import').setInputFiles({
    name: 'anki-26.9.3-legacy.apkg', mimeType: 'application/zip',
    buffer: await readFile('e2e/fixtures/anki-26.9.3-legacy.apkg'),
  });
  await expect(page.getByText('legacy-anki21')).toBeVisible();
  await expect(page.getByText('5', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('7', { exact: true }).first()).toBeVisible();
  await page.getByText('Review field mapping').click();
  await expect(page.getByRole('heading', { name: 'HoloRecall Custom Audio' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.evaluate(() => document.documentElement.style.fontSize = '200%'); await expectNoOverflow(page); await page.evaluate(() => document.documentElement.style.fontSize = '100%');
  await page.getByRole('button', { name: 'Use mapping and refresh preview' }).click();
  await expect(page.getByText(/reviewed mapping is reflected/i)).toBeVisible();
  await page.getByRole('button', { name: 'Import 7 supported cards' }).click();
  await expect(page.getByText(/Imported 7 new and 0 changed Anki cards/)).toBeVisible();

  const imported = await snapshot(page);
  const audioCard = imported.cards.find(card => card.answer === 'buonasera');
  expect(audioCard).toMatchObject({ pronunciation: 'bwoh-nah-SEH-rah', meaning: 'good evening' });
  expect(audioCard?.frontAudio).toHaveLength(1); expect(audioCard?.backAudio).toHaveLength(1);
  expect(imported.assets.filter(asset => asset.mime === 'audio/mpeg')).toHaveLength(1);
  expect(imported.ankiMappings.some(mapping => mapping.modelName === 'HoloRecall Custom Audio')).toBe(true);
  expect(imported.events).toEqual(before.events); expect(imported.rewardEvents).toEqual(before.rewardEvents);

  await page.getByRole('button', { name: 'Collection' }).click();
  await page.getByRole('button', { name: 'Inspect buonasera' }).click();
  await expect(page.locator('.inspection-card .card-motion')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Play answer audio 1' }).click();
  await expect(page.getByRole('button', { name: 'Pause answer audio 1' })).toBeVisible({ timeout: 1_000 });
  await expect(page.getByRole('button', { name: 'Play answer audio 1' })).toBeVisible({ timeout: 2_000 });
  await expect(page.locator('.inspection-card .card-motion')).toHaveAttribute('aria-pressed', 'true');

  await page.reload(); await expect(page.getByRole('heading', { name: 'Collection' })).toBeVisible();
  const recovered = await snapshot(page); expect(recovered.cards.find(card => card.answer === 'buonasera')?.backAudio).toEqual(audioCard?.backAudio);
  expect(recovered.ankiMappings).toEqual(imported.ankiMappings);

  await page.getByRole('button',{name:'Focus',exact:true}).click();await page.getByLabel('Deck or journey').click();await page.getByRole('option',{name:'All active decks'}).click();await page.getByRole('button',{name:'Build custom session'}).click();
  await page.getByLabel('Search content').fill('buonasera');await page.getByLabel('Session name').fill('Audio practice');
  await page.getByRole('button',{name:'Start practice'}).click();await page.getByRole('button',{name:/Reveal answer/}).click();
  await page.evaluate(()=>{(window as any).__acceptedAudioPauses=0;HTMLMediaElement.prototype.play=function(){queueMicrotask(()=>this.dispatchEvent(new Event('playing')));return Promise.resolve();};HTMLMediaElement.prototype.pause=function(){(window as any).__acceptedAudioPauses++;};});
  await page.getByRole('button',{name:'Play answer audio 1'}).click();await expect(page.getByRole('button',{name:'Pause answer audio 1'})).toBeVisible();
  await page.getByRole('button',{name:/4 Good Confident/}).click();await expect.poll(async()=>Number(await page.evaluate(()=>(window as any).__acceptedAudioPauses))).toBeGreaterThan(0);
  await expect.poll(async()=>(await snapshot(page)).practiceEvents.length).toBe(1);
});

test('HR-IMPORT-01 keeps the interface responsive and cancels background analysis without mutation', async ({ page }, testInfo) => {
  await openApp(page); await page.getByRole('button', { name: 'Import / export' }).click(); const before = await snapshot(page);
  await page.evaluate(() => { document.body.dataset['heartbeats'] = '0'; window.setInterval(() => document.body.dataset['heartbeats'] = String(Number(document.body.dataset['heartbeats']) + 1), 16); });
  const fixture = await largeApkg(); await testInfo.attach('large-fixture-size.txt', { body: `${fixture.byteLength} compressed bytes; 10,000 notes/cards; 180 repeated prompt bytes per note.`, contentType: 'text/plain' });
  await page.locator('#anki-import').setInputFiles({ name: 'large.apkg', mimeType: 'application/zip', buffer: fixture });
  await expect(page.getByRole('button', { name: 'Cancel analysis' })).toBeVisible();
  const firstHeartbeat = Number(await page.locator('body').getAttribute('data-heartbeats'));
  await expect.poll(async () => Number(await page.locator('body').getAttribute('data-heartbeats'))).toBeGreaterThan(firstHeartbeat);
  await page.getByRole('button', { name: 'Cancel analysis' }).click();
  await expect(page.getByRole('button', { name: 'Cancel analysis' })).toHaveCount(0);
  await expect(page.getByText(/Detected:/)).toHaveCount(0);
  expect(await snapshot(page)).toEqual(before);
});

test('HR-IMPORT-01 mapping reflows at enlarged text on phone profiles @ios-compact @ios-large @ios-landscape', async ({ page }) => {
  await openApp(page); await navigate(page, 'Import / export');
  await page.locator('#anki-import').setInputFiles({ name: 'tiny.apkg', mimeType: 'application/zip', buffer: await tinyApkg() });
  await expect(page.getByText('legacy-anki2')).toBeVisible(); await page.getByText('Review field mapping').click();
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  await expect(page.getByRole('button', { name: 'Use mapping and refresh preview' })).toBeVisible();
  await expectNoOverflow(page);
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
