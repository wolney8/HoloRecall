import { expect, test, expectNoOverflow, navigate, openApp, snapshot } from './helpers';
import initSqlJs from 'sql.js';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';

async function smileyArtwork(page: import('@playwright/test').Page): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  const base64 = await page.evaluate(() => { const canvas=document.createElement('canvas');canvas.width=180;canvas.height=180;const context=canvas.getContext('2d')!;context.fillStyle='#ffffff';context.fillRect(0,0,180,180);context.fillStyle='#ffd54f';context.beginPath();context.arc(90,90,62,0,Math.PI*2);context.fill();context.fillStyle='#3b2f1f';context.beginPath();context.arc(68,73,7,0,Math.PI*2);context.arc(112,73,7,0,Math.PI*2);context.fill();context.lineWidth=7;context.beginPath();context.arc(90,94,31,.15*Math.PI,.85*Math.PI);context.stroke();return canvas.toDataURL('image/png').split(',')[1]!; });
  return { name: 'white-smiley.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') };
}

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
  await openApp(page); await navigate(page, 'Exchange');
  await page.getByLabel('Anki · Import Anki .apkg decks').click();
  await page.locator('#anki-import').setInputFiles({ name: 'tiny.apkg', mimeType: 'application/zip', buffer: await tinyApkg() });
  await expect(page.getByRole('heading',{name:'tiny',exact:true})).toBeVisible();await expect(page.getByText('Basic Front / Back',{exact:true})).toBeVisible(); await expect(page.getByText('1', { exact: true }).first()).toBeVisible();
  const result=page.getByLabel('Anki import result');await expect(result).toContainText('1');await expect(result).toContainText('Ready');await expect(page.getByText('Total: 1 card. Ready + Needs review + Cannot import = 1.')).toBeVisible();await expect(page.getByText("Anki learning history isn't imported. These cards will use your HoloRecall study settings.")).toBeVisible();await page.getByLabel('Study using').click();await page.getByRole('option',{name:'Light workload'}).click(); await page.getByRole('button', { name: 'Import 1 supported cards' }).click();
  await expect(page.getByText(/Imported 1 new and 0 changed Anki cards/)).toBeVisible(); await page.getByRole('button', { name: 'Decks', exact: true }).click();await page.getByRole('tab',{name:'Search cards'}).click(); await expect(page.getByText('good morning', { exact: true })).toBeVisible();
  const imported=await snapshot(page),card=imported.cards.find(item=>item.answer==='good morning')!,deck=imported.decks.find(item=>item.id===card.deckId)!;expect(imported.states[card.id]).toBeUndefined();expect(deck.studyPresetId).toBe('light');await page.reload(); await expect(page.getByText('good morning', { exact: true })).toBeVisible();
});

test('HR-IMPORT-01 worker imports official custom fields and side-specific bundled audio', async ({ page }) => {
  await openApp(page);await navigate(page,'Settings');await page.getByRole('radio', { name: 'Dark', exact: true }).click();await navigate(page,'Exchange');
  await page.getByLabel('Anki · Import Anki .apkg decks').click();
  const before = await snapshot(page);
  await page.locator('#anki-import').setInputFiles({
    name: 'anki-26.9.3-legacy.apkg', mimeType: 'application/zip',
    buffer: await readFile('e2e/fixtures/anki-26.9.3-legacy.apkg'),
  });
  await expect(page.getByRole('heading',{name:'anki-26.9.3-legacy',exact:true})).toBeVisible();
  await expect(page.getByText('Cloze',{exact:true})).toBeVisible();
  await expect(page.getByText('Total: 7 cards. Ready + Needs review + Cannot import = 7.')).toBeVisible();
  await page.getByRole('button',{name:/Advanced details/}).click();
  await expect(page.locator('.content-summary')).toContainText('5 source notes');
  await expect(page.getByRole('button',{name:'Advanced mapping'})).toBeVisible();
  await expect(page.locator('.mapping-panel')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.evaluate(() => document.documentElement.style.fontSize = '200%'); await expectNoOverflow(page); await page.evaluate(() => document.documentElement.style.fontSize = '100%');
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
  await expect(page.locator('.inspection-card .card-motion')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('.inspection-card .card-motion').click();
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
  await page.getByRole('button',{name:'Start practice'}).click();await page.getByRole('button',{name:/Check answer/}).click();
  await page.evaluate(()=>{(window as any).__acceptedAudioPauses=0;HTMLMediaElement.prototype.play=function(){queueMicrotask(()=>this.dispatchEvent(new Event('playing')));return Promise.resolve();};HTMLMediaElement.prototype.pause=function(){(window as any).__acceptedAudioPauses++;};});
  await page.getByRole('button',{name:'Play answer audio 1'}).click();await expect(page.getByRole('button',{name:'Pause answer audio 1'})).toBeVisible();
  await page.getByRole('button',{name:/4 Good Confident/}).click();await expect.poll(async()=>Number(await page.evaluate(()=>(window as any).__acceptedAudioPauses))).toBeGreaterThan(0);
  await expect.poll(async()=>(await snapshot(page)).practiceEvents.length).toBe(1);
});

test('HR-IMPORT-01 keeps the interface responsive and cancels background analysis without mutation', async ({ page }, testInfo) => {
  await openApp(page); await page.getByRole('button', { name: 'Exchange' }).click(); await page.getByLabel('Anki · Import Anki .apkg decks').click(); const before = await snapshot(page);
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

test('HR-IMPORT-01 advanced enrichment reflows at enlarged text on phone profiles @ios-compact @ios-large @ios-landscape', async ({ page }) => {
  await openApp(page); await navigate(page, 'Exchange');
  await page.getByLabel('Anki · Import Anki .apkg decks').click();
  await page.locator('#anki-import').setInputFiles({ name: 'tiny.apkg', mimeType: 'application/zip', buffer: await tinyApkg() });
  await expect(page.getByRole('heading',{name:'tiny',exact:true})).toBeVisible();await expect(page.getByText('Basic Front / Back',{exact:true})).toBeVisible(); await page.getByRole('button',{name:/Advanced details/}).click();await page.getByRole('button',{name:'Advanced mapping'}).click();
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  await expect(page.getByRole('button', { name: 'Update semantic preview' })).toBeVisible();
  await expectNoOverflow(page);
});

test('HR-DESIGN-07/12 previews curated composition and rarity finish settings and HR-GAME-01 shows real next progress', async ({ page }, testInfo) => {
  await openApp(page); await page.getByRole('button', { name: 'Design Studio' }).click();
  await expect(page.getByRole('heading', { name: 'Design Suite' })).toBeVisible();
  const preview = page.locator('hr-design-studio .memory-card'); await expect(preview).toHaveAttribute('data-composition', 'illustration-window');
  await page.getByLabel('Suggest per card').check();
  await page.getByLabel('Preview content').click(); await page.getByRole('option', { name: 'Text only' }).click();
  await expect(preview).toHaveAttribute('data-composition', 'typographic-showcase'); await expect(preview.locator('[aria-label="Generated text artwork"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show recall face' }).click(); await expect(preview.getByText('Why does spaced recall work?')).toBeVisible();
  await page.getByRole('button', { name: 'Show answer face' }).click(); await expect(preview.getByRole('heading', { name: 'Retrieval strengthens memory' })).toBeVisible();
  await page.getByLabel('Preview content').click(); await page.getByRole('option', { name: 'Generated art' }).click(); await expect(preview).toHaveAttribute('data-composition', 'illustration-window'); await expect(preview.locator('.missing-image')).toHaveCount(0); await expect(preview.locator('[aria-label="Generated text artwork"]')).toBeVisible();
  await page.getByTestId('design-art-upload').setInputFiles(await smileyArtwork(page)); await expect(page.getByTestId('design-notice')).toContainText('palette was derived');
  await expect(page.getByLabel('Surface style')).toHaveText(/Balanced printed/); await expect(preview).toHaveAttribute('data-art-treatment', 'embedded'); await expect(preview.locator('.background-layer img')).toBeVisible();
  await expect.poll(() => preview.locator('.background-layer img').evaluate(element => getComputedStyle(element).mixBlendMode)).toBe('multiply');
  await expect.poll(() => preview.locator('.card-copy').evaluate(element => getComputedStyle(element, '::before').borderTopColor)).not.toBe('rgba(0, 0, 0, 0)');
  await page.screenshot({ path: testInfo.outputPath('design-suite-balanced-printed.png'), fullPage: true });
  await page.getByRole('combobox',{name:'Surface style'}).click(); await page.getByRole('option', { name: 'Soft edge blend' }).click(); await expect(preview).toHaveAttribute('data-art-treatment', 'edge-fade');
  await page.getByLabel('Use one composition').check(); await page.getByText('Full Bleed', { exact: true }).click(); await expect(preview).toHaveAttribute('data-composition', 'full-bleed');
  await page.getByText('Rarity variants', { exact: true }).click(); await page.getByLabel('Finish').click(); await page.getByRole('option', { name: 'Aurora premium' }).click(); await expect(preview).toHaveAttribute('data-finish', 'aurora');
  await page.screenshot({ path: testInfo.outputPath('design-suite-foundation.png'), fullPage: true });
  await page.getByRole('button', { name: 'Collection' }).click();await expect(page.getByRole('heading',{name:'Unsaved Design Set changes'})).toBeVisible();await page.getByRole('button',{name:'Discard changes'}).click(); await expect(page.getByText('NEXT UNLOCK', { exact: true })).toBeVisible(); await expect(page.locator('.next-unlock mat-progress-bar')).toHaveCount(1);
});

test('HR-DESIGN-16 keeps printed surfaces coherent and learning copy dominant across content and accessibility modes', async ({ page }, testInfo) => {
  await openApp(page); await page.getByRole('button', { name: 'Design Studio' }).click();
  const preview=page.locator('hr-design-studio .memory-card');
  await page.getByLabel('Preview content').click(); await page.getByRole('option',{name:'Technical / formula'}).click();
  await page.getByLabel('Use one composition').check(); await page.getByText('Diagram / Technical',{exact:true}).click();
  await expect(preview).toHaveAttribute('data-composition','diagram-technical');
  await expect(preview.getByRole('heading',{name:'x = 7'})).toBeVisible();
  await expect.poll(()=>preview.locator('.card-copy').evaluate(element=>getComputedStyle(element,'::before').borderTopColor)).not.toBe('rgba(0, 0, 0, 0)');
  await page.getByText('Rarity variants',{exact:true}).click(); await page.getByLabel('Rarity to tune').click(); await page.getByRole('option',{name:/Common/}).click();
  await expect(preview).toHaveAttribute('data-rarity','common');
  await page.getByLabel('Suggest per card').check();
  await page.getByLabel('Preview content').click(); await page.getByRole('option',{name:'Text only'}).click();
  await expect(preview).toHaveAttribute('data-composition','typographic-showcase');
  await expect(preview.getByRole('heading',{name:'Retrieval strengthens memory'})).toBeVisible();
  await page.locator('mat-button-toggle').filter({hasText:'Dark'}).click(); await expect(preview).toHaveAttribute('data-theme-preview','dark'); await expect(preview.getByRole('heading',{name:'Retrieval strengthens memory'})).toBeVisible();
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(preview.locator('..').locator('..')).toHaveAttribute('data-motion','reduced');
  await expect(preview.locator('.effects-layer')).toHaveCSS('display','block');
  await expect(preview.locator('.surface-ambient')).toHaveCSS('display','none');
  await expect(preview.locator('.surface-substrate')).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('printed-surface-reduced-motion.png'),fullPage:true});
});

test('HR-DESIGN-06 validates and atomically applies friendly JSON with inherited deck design', async ({ page }) => {
  await openApp(page); const before = await snapshot(page); await navigate(page, 'Decks');
  await page.getByRole('button', { name: 'More deck actions' }).first().click();
  await page.getByRole('menuitem', { name: 'Edit deck' }).click();
  await page.getByText('Batch-create cards from JSON', { exact: true }).click();
  const input = page.getByLabel('Card JSON');
  await input.fill(JSON.stringify([{ front: 'Solve 7 × 8', answer: '<script>56</script>' }]));
  await page.getByRole('button', { name: 'Analyse batch' }).click();
  await expect(page.getByText('1 errors')).toBeVisible(); await expect(page.getByRole('button', { name: /Add .* cards/ })).toBeDisabled();
  await input.fill(JSON.stringify([{ front: 'Solve 7 × 8', answer: '56', secondary: 'Multiplication fact', details: [{ label: 'Method', content: 'Seven groups of eight' }], tags: ['maths'] }]));
  await page.getByRole('button', { name: 'Analyse batch' }).click();
  await expect(page.getByText('1 cards ready')).toBeVisible(); await expect(page.locator('hr-json-authoring .json-card')).toContainText('Solve 7 × 8'); await expect(page.locator('hr-json-authoring .json-card')).toContainText('56');
  await page.getByRole('button', { name: 'Add 1 cards' }).click(); await expect(page.getByText(/1 cards added/)).toBeVisible();
  const after = await snapshot(page), created = after.cards.find(card => card.front === 'Solve 7 × 8');
  expect(created).toMatchObject({ answer: '56', secondary: 'Multiplication fact', rarity: 'common' }); expect(created?.designSetId).toBeUndefined();
  expect(after.events).toEqual(before.events); expect(after.rewardEvents).toEqual(before.rewardEvents); expect(after.states).toEqual(before.states);
});
