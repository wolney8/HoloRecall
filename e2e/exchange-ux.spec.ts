import {existsSync} from 'node:fs';
import {expect,navigate,openApp,snapshot,test} from './helpers';
import initSqlJs from 'sql.js';
import JSZip from 'jszip';

const bBarryyPackage=process.env['HOLORECALL_BBARRYY_PACKAGE'];
const italianPackage=process.env['HOLORECALL_REAL_ANKI_PACKAGE'];
const lesson1V51Package=process.env['HOLORECALL_LESSON1_V51_PACKAGE'];
const lesson2V51Package=process.env['HOLORECALL_LESSON2_V51_PACKAGE'];

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


async function conditionalVariantPackage():Promise<Buffer>{
  const SQL=await initSqlJs(),db=new SQL.Database();db.run('create table col (models text, decks text)');db.run('create table notes (id integer, guid text, mid integer, tags text, flds text)');db.run('create table cards (id integer, nid integer, did integer, ord integer)');
  const models={1:{name:'Mixed science classification',type:0,flds:[{name:'Prompt'},{name:'Stimulus'},{name:'Answer'},{name:'Back'}],tmpls:[{name:'Forward',qfmt:'<h2>SCIENCE</h2><h3>CLASSIFICATION</h3>{{Prompt}}<strong>{{Stimulus}}</strong>',afmt:'{{#Answer}}<div class="answer-tag">{{Answer}}</div>{{/Answer}}<div class="italian">{{Back}}</div>'}]}};db.run('insert into col values (?,?)',[JSON.stringify(models),JSON.stringify({10:{name:'Science'}})]);
  db.run('insert into notes values (?,?,?,?,?)',[100,'classification-guid',1,'','Classify the item\x1fsodium\x1falkali metal\x1fsodium']);db.run('insert into cards values (?,?,?,?)',[200,100,10,0]);
  db.run('insert into notes values (?,?,?,?,?)',[101,'default-guid',1,'','Name the element\x1fNa\x1f\x1fsodium']);db.run('insert into cards values (?,?,?,?)',[201,101,10,0]);
  const zip=new JSZip();zip.file('collection.anki2',db.export());zip.file('media','{}');db.close();return Buffer.from(await zip.generateAsync({type:'uint8array'}));
}

test('HR-EXCHANGE-03 separates Import, Export and Templates into reload-safe views',async({page})=>{
  await page.goto('/#exchange/import');await expect(page.getByRole('heading',{name:'Exchange',exact:true})).toBeVisible();
  await expect(page.getByRole('tabpanel',{name:'Import'})).toContainText('Import Anki .apkg decks');
  await expect(page.getByText('Blank workbook',{exact:true})).toHaveCount(0);
  await page.getByRole('tab',{name:'Export'}).click();await expect(page).toHaveURL(/#exchange\/export$/);
  await expect(page.getByRole('tabpanel',{name:'Export'})).toContainText('HoloRecall package');
  await expect(page.getByText('Blank workbook',{exact:true})).toHaveCount(0);
  await page.reload();await expect(page.getByRole('tab',{name:'Export'})).toHaveAttribute('aria-selected','true');
  await page.getByRole('tab',{name:'Templates'}).click();await expect(page.getByRole('tabpanel',{name:'Templates'})).toContainText('Blank workbook');
  await expect(page.getByRole('button',{name:'Export package'})).toHaveCount(0);
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
  await expect(page.getByRole('heading',{name:'1 template needs review'})).toBeVisible();const profile=page.locator('.conversion-profile').filter({hasText:'Basic · Same face'});await expect(profile).toContainText('2 affected cards');await expect(profile).toContainText('Recall and Answer unexpectedly show the same learning content.');
  const apply=page.getByRole('button',{name:'Import 2 supported cards'});await expect(apply).toBeDisabled();await profile.getByRole('button',{name:'Approve this template conversion'}).click();await expect(result).toContainText('2Ready');await expect(result).toContainText('0Needs review');await expect(apply).toBeEnabled();
  await apply.click();await expect(page.locator('.completion-panel')).toContainText('IMPORT COMPLETE');const state=await snapshot(page);expect(state.ankiConversionProfiles).toEqual([expect.objectContaining({modelName:'Ambiguous custom',templateName:'Same face',status:'user-approved',origin:'user-confirmed'})]);expect(state.cards.filter(card=>card.ankiSource?.modelName==='Ambiguous custom')).toHaveLength(2);
});


test('conditional semantic review is template-scoped and keeps rule internals advanced',async({page})=>{
  await openExchange(page);await page.getByLabel('Anki · Import Anki .apkg decks').click();await page.locator('#anki-import').setInputFiles({name:'mixed-science.apkg',mimeType:'application/zip',buffer:await conditionalVariantPackage()});
  const profile=page.locator('.conversion-profile').filter({hasText:'Rich template · Forward'});await expect(profile).toContainText('Explicit answer variant · 1 matching card');await expect(profile).toContainText('Classify the item');await expect(profile).toContainText('alkali metal');await expect(profile).not.toContainText('When Answer has content');
  const approve=profile.getByRole('button',{name:'Use this conversion for matching cards'});await expect(approve).toBeVisible();await page.getByRole('button',{name:/Advanced details/}).click();await page.getByText('Template translation audit',{exact:true}).click();await expect(page.getByText('Explicit answer variant · 1 matching card · When Answer has content → Primary answer: Answer')).toBeVisible();await approve.click();await page.getByRole('button',{name:'Import 2 supported cards'}).click();await expect(page.locator('.completion-panel')).toContainText('IMPORT COMPLETE');const state=await snapshot(page);expect(state.ankiConversionProfiles[0]).toMatchObject({version:3,status:'user-approved',semanticVariants:[{origin:'user-confirmed',acceptedAt:expect.any(String),predicate:{all:[{field:'Answer',operator:'non-empty'}]},overrides:{primaryAnswerField:'Answer'}}]});expect(state.cards.find(card=>card.ankiSource?.noteGuid==='classification-guid')).toMatchObject({answer:'alkali metal'});
});

test('exact Italian package exposes the 64-card conditional projection without per-card review',async({page})=>{
  test.skip(!italianPackage||!existsSync(italianPackage),'Set HOLORECALL_REAL_ANKI_PACKAGE to the exact Italian package path.');await openExchange(page);await page.getByLabel('Anki · Import Anki .apkg decks').click();await page.locator('#anki-import').setInputFiles(italianPackage!);
  const result=page.getByLabel('Anki import result');await expect(result).toContainText('254Ready');await expect(result).toContainText('0Needs review');await page.getByRole('button',{name:/Advanced details/}).click();await page.getByText('Template translation audit',{exact:true}).click();await expect(page.getByText('Explicit answer variant · 64 matching cards · When Answer has content → Primary answer: Answer')).toBeVisible();
});

test('presentation-only Lesson 1 scripts import as a disclosed safe simplification',async({page})=>{
  test.skip(!lesson1V51Package||!existsSync(lesson1V51Package),'Set HOLORECALL_LESSON1_V51_PACKAGE to the exact Lesson 1 v5.1 package path.');await openExchange(page);await page.getByLabel('Anki · Import Anki .apkg decks').click();await page.locator('#anki-import').setInputFiles(lesson1V51Package!);
  const result=page.getByLabel('Anki import result');await expect(result).toContainText('44Ready');await expect(result).toContainText('0Needs review');await expect(result).toContainText('0Cannot import');await expect(page.getByRole('button',{name:'Import 44 supported cards'})).toBeEnabled();
  await expect(page.getByText('Technical compatibility tiers')).toHaveCount(0);await page.getByRole('button',{name:/Advanced details/}).click();await expect(page.getByText(/0 referenced media/)).toBeVisible();await expect(page.getByText(/19 unreferenced package assets ignored/)).toBeVisible();await expect(page.getByText('Presentation-only Anki template script was omitted safely; learning content remains fully represented by native projection.')).toBeVisible();
});

test('structured Lesson 2 templates import without per-card review and retain the pronunciation variant',async({page})=>{
  test.skip(!lesson2V51Package||!existsSync(lesson2V51Package),'Set HOLORECALL_LESSON2_V51_PACKAGE to the exact Lesson 2 v5.1 package path.');await openExchange(page);await page.getByLabel('Anki · Import Anki .apkg decks').click();await page.locator('#anki-import').setInputFiles(lesson2V51Package!);
  const result=page.getByLabel('Anki import result');await expect(result).toContainText('135Ready');await expect(result).toContainText('0Needs review');await expect(result).toContainText('0Cannot import');await expect(page.getByRole('button',{name:'Import 135 supported cards'})).toBeEnabled();
  await page.getByRole('button',{name:/Advanced details/}).click();await page.getByText('Template translation audit',{exact:true}).click();await expect(page.getByText('Pronunciation response variant · 4 matching cards · When ID starts with “review_sound_” → Primary answer: Pronunciation')).toBeVisible();
  await page.getByRole('button',{name:'Import 135 supported cards'}).click();await expect(page.locator('.completion-panel')).toContainText('IMPORT COMPLETE',{timeout:20_000});const state=await snapshot(page),sound=state.cards.find(card=>card.ankiSource?.contentProvenance?.semanticVariantId?.includes('pronunciation-response')),agreement=state.cards.find(card=>card.answer==='The related words agree in gender and number.');expect(sound).toMatchObject({front:expect.stringMatching(/GI|GE|CI|CE/),answer:expect.any(String),ankiSource:{contentProvenance:{responseMode:'pronunciation-naming'}}});expect(sound?.answer).not.toBe(sound?.front);expect(agreement?.front).not.toContain(agreement?.answer??'');expect(agreement?.presentation?.hint).toContain(agreement?.answer);
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
