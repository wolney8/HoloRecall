import {existsSync} from 'node:fs';
import {expect,navigate,openApp,snapshot,test} from './helpers';
import initSqlJs from 'sql.js';
import JSZip from 'jszip';

const bBarryyPackage=process.env['HOLORECALL_BBARRYY_PACKAGE'];

async function openExchange(page:Parameters<typeof openApp>[0]):Promise<void>{
  await openApp(page);await navigate(page,'Exchange');
  await expect(page.getByRole('heading',{name:'Exchange',exact:true})).toBeVisible();
}

async function suspiciousTemplatePackage():Promise<Buffer>{
  const SQL=await initSqlJs(),db=new SQL.Database();db.run('create table col (models text, decks text)');db.run('create table notes (id integer, guid text, mid integer, tags text, flds text)');db.run('create table cards (id integer, nid integer, did integer, ord integer)');
  const models={1:{name:'Ambiguous custom',type:0,flds:[{name:'Cue'}],tmpls:[{name:'Same face',qfmt:'{{Cue}}',afmt:'{{Cue}}'}]}};db.run('insert into col values (?,?)',[JSON.stringify(models),JSON.stringify({10:{name:'Review fixture'}})]);
  for(let index=0;index<2;index++){db.run('insert into notes values (?,?,?,?,?)',[100+index,`ambiguous-${index}`,1,'',`Same ${index}`]);db.run('insert into cards values (?,?,?,?)',[200+index,100+index,10,0]);}
  const zip=new JSZip();zip.file('collection.anki2',db.export());zip.file('media','{}');db.close();return Buffer.from(await zip.generateAsync({type:'uint8array'}));
}

test('HR-EXCHANGE-03 separates Import, Export and Templates into reload-safe views',async({page})=>{
  await page.goto('/#exchange/import');await expect(page.getByRole('heading',{name:'Exchange',exact:true})).toBeVisible();
  await expect(page.getByRole('tabpanel',{name:'Import'})).toContainText('Import Anki .apkg decks');
  await expect(page.getByText('Blank workbook',{exact:true})).toHaveCount(0);
  await page.getByRole('tab',{name:'Export'}).click();await expect(page).toHaveURL(/#exchange\/export$/);
  await expect(page.getByRole('tabpanel',{name:'Export'})).toContainText('Portable ZIP');
  await expect(page.getByText('Blank workbook',{exact:true})).toHaveCount(0);
  await page.reload();await expect(page.getByRole('tab',{name:'Export'})).toHaveAttribute('aria-selected','true');
  await page.getByRole('tab',{name:'Templates'}).click();await expect(page.getByRole('tabpanel',{name:'Templates'})).toContainText('Blank workbook');
  await expect(page.getByRole('button',{name:'Export ZIP'})).toHaveCount(0);
});

test('HR-EXCHANGE-03 keeps Anki internals behind the provider journey and Advanced details',async({page})=>{
  await openExchange(page);await expect(page.locator('#anki-import')).toHaveCount(0);
  await page.getByLabel('Anki · Import Anki .apkg decks').click();await expect(page).toHaveURL(/#exchange\/import\/anki$/);
  await expect(page.locator('#anki-import')).toBeVisible();await expect(page.locator('.mapping-panel')).toHaveCount(0);
  await expect(page.getByText('Technical compatibility tiers')).toHaveCount(0);
});

test('HR-ANKI-REAL-01 reports and imports the safe bBarryy subset with reconciled counts',async({page})=>{
  test.skip(!bBarryyPackage||!existsSync(bBarryyPackage),'Set HOLORECALL_BBARRYY_PACKAGE to the real package path.');
  await openExchange(page);await page.getByLabel('Anki · Import Anki .apkg decks').click();
  await page.locator('#anki-import').setInputFiles(bBarryyPackage!);
  const result=page.getByLabel('Anki import result');await expect(result).toContainText('58Ready');await expect(result).toContainText('0Needs review');await expect(result).toContainText('3Cannot import');
  await expect(page.getByText(/Total: 61 cards\. Ready \+ Needs review \+ Cannot import = 61/)).toBeVisible();
  await expect(page.getByText('Advanced Image Occlusion variant — review required')).toHaveCount(0);
  const apply=page.getByRole('button',{name:'Import 58 supported cards'});await expect(apply).toBeDisabled();
  await page.getByRole('button',{name:/Why 3 cannot be imported/}).click();
  await expect(page.getByText('2 cards · No safe answer')).toBeVisible();await expect(page.getByText('1 card · Source image missing')).toBeVisible();
  await expect(page.getByRole('button',{name:'Advanced mapping'})).toBeVisible();
  await page.getByRole('checkbox',{name:/Import 58 ready cards/}).check();await expect(apply).toBeEnabled();await apply.click();
  await expect(page.locator('.completion-panel')).toContainText('IMPORT COMPLETE',{timeout:20_000});
  const state=await snapshot(page);expect(state.cards.filter(card=>card.ankiSource?.kind==='anki')).toHaveLength(58);expect(state.cards.filter(card=>card.imageOcclusion)).toHaveLength(26);
});

test('Conversion Profile blocks and accepts one suspicious template decision for all matching cards',async({page})=>{
  await openExchange(page);await page.getByLabel('Anki · Import Anki .apkg decks').click();await page.locator('#anki-import').setInputFiles({name:'ambiguous.apkg',mimeType:'application/zip',buffer:await suspiciousTemplatePackage()});
  const result=page.getByLabel('Anki import result');await expect(result).toContainText('0Ready');await expect(result).toContainText('2Needs review');
  const profile=page.locator('.conversion-profile').filter({hasText:'Ambiguous custom · Same face'});await expect(profile).toContainText('2 cards');await expect(profile).toContainText('equivalent-recall-answer');
  const apply=page.getByRole('button',{name:'Import 2 supported cards'});await expect(apply).toBeDisabled();await profile.getByRole('button',{name:'Approve this template conversion'}).click();await expect(result).toContainText('2Ready');await expect(result).toContainText('0Needs review');await expect(apply).toBeEnabled();
  await apply.click();await expect(page.locator('.completion-panel')).toContainText('IMPORT COMPLETE');const state=await snapshot(page);expect(state.ankiConversionProfiles).toEqual([expect.objectContaining({modelName:'Ambiguous custom',templateName:'Same face',status:'user-approved',origin:'user-confirmed'})]);expect(state.cards.filter(card=>card.ankiSource?.modelName==='Ambiguous custom')).toHaveLength(2);
});

test('HR-EXCHANGE-03 navigation reflows on compact WebKit @ios-compact',async({page})=>{
  await page.goto('/#exchange/import');await expect(page.getByRole('tablist',{name:'Exchange sections'})).toBeVisible();
  await page.getByRole('tab',{name:'Templates'}).click();await expect(page.getByText('Exact format specification')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test('HR-REGRESSION-STABILITY-01 Exchange remains contained at 1024px and 200% text',async({page})=>{
  await page.setViewportSize({width:1024,height:768});await page.goto('/#exchange/import/anki');
  await expect(page.locator('#anki-import')).toBeVisible();await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);
});
