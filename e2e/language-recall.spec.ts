import {expect,navigate,openApp,revealCard,snapshot,test} from './helpers';
import initSqlJs from 'sql.js';
import JSZip from 'jszip';

async function languageRecallPackage():Promise<Buffer>{
  const SQL=await initSqlJs(),db=new SQL.Database();
  db.run('create table col (models text, decks text)');db.run('create table notes (id integer, guid text, mid integer, tags text, flds text)');db.run('create table cards (id integer, nid integer, did integer, ord integer)');
  const fields=['Prompt','Question','Context','Picture','Focus','Task','Italian','Pronunciation','Meaning','Literal','Hint'];
  const models={1:{name:'Italian language recall',type:0,flds:fields.map(name=>({name})),tmpls:[{name:'Prompt to Italian',qfmt:'<div>{{Picture}}</div><div>{{Prompt}}</div>{{#Question}}<p>{{Question}}</p>{{/Question}}',afmt:'{{FrontSide}}<hr id="answer"><div class="answer">{{Italian}}</div><div class="pronunciation">{{Pronunciation}}</div><div class="section"><div class="label">Meaning</div>{{Meaning}}</div><div class="section"><div class="label">Literal construction</div>{{Literal}}</div>'}]}};
  db.run('insert into col values (?,?)',[JSON.stringify(models),JSON.stringify({10:{name:'Italian Recall::Introductions'}})]);
  const values=['Speaking TO a friend or peer','','','<div class="panel-head"><span class="panel-badge">YOU</span><div><div class="panel-title">A friendly introduction</div></div></div>','You are called…','Say it in Italian','Tu ti chiami…','too tee KYAH-mee','You are called / named… — informal','tu + reflexive pronoun + chiamarsi',''];
  db.run('insert into notes values (?,?,?,?,?)',[100,'language-recall-browser',1,'italian language',values.join('\x1f')]);db.run('insert into cards values (?,?,?,?)',[200,100,10,0]);
  const zip=new JSZip();zip.file('collection.anki2',db.export());zip.file('media','{}');db.close();return Buffer.from(await zip.generateAsync({type:'uint8array'}));
}

test('HR-LANGUAGE-RECALL-01 uses a clear text-first language cue without leaking the answer',async({page},testInfo)=>{
  await openApp(page);await navigate(page,'Exchange');
  await page.getByLabel('Anki · Import Anki .apkg decks').click();
  await page.locator('#anki-import').setInputFiles({name:'language-recall.apkg',mimeType:'application/zip',buffer:await languageRecallPackage()});
  await page.getByRole('button',{name:'Import 1 supported cards'}).click();
  const imported=await snapshot(page),card=imported.cards.find(item=>item.ankiSource?.noteGuid==='language-recall-browser')!;
  expect(card.presentation).toMatchObject({profile:'language',recallTask:'You are called…',situationContext:'Speaking TO a friend or peer',taskGuidance:'Say it in Italian',artRole:'supportive'});
  expect(card.answer).toBe('Tu ti chiami…');
  await page.getByRole('button',{name:'Go to deck'}).click();
  const parent=page.locator('.deck-journey').filter({has:page.getByRole('heading',{name:'Italian Recall',exact:true})});
  await parent.getByRole('button',{name:'Study',exact:true}).first().click();
  const collectible=page.locator('.memory-card');
  await expect(collectible).toHaveAttribute('data-art-policy','text-first');
  await expect(collectible).toHaveAttribute('data-art-role','supportive');
  await expect(collectible.getByRole('heading',{name:'You are called…',exact:true})).toBeVisible();
  await expect(collectible).toContainText('Speaking TO a friend or peer');
  await expect(collectible).toContainText('Say it in Italian');
  await expect(collectible).not.toContainText('Tu ti chiami');
  await expect(collectible.locator('.illustration-layer')).toHaveClass(/no-illustration/);
  await page.screenshot({path:testInfo.outputPath('language-text-first-recall.png'),fullPage:true});
  await revealCard(page);
  await expect(collectible.getByRole('heading',{name:'Tu ti chiami…',exact:true})).toBeVisible();
  await expect(collectible).toContainText('too tee KYAH-mee');
  await expect(collectible).not.toContainText('You are called / named… — informal');
  const support=page.getByText('Answer Support',{exact:true});await expect(support).toBeVisible();await support.click();await expect(page.getByText('You are called / named… — informal',{exact:true})).toBeVisible();await expect(page.getByText('tu + reflexive pronoun + chiamarsi',{exact:true})).toBeVisible();
});

test('HR-LANGUAGE-RECALL-01 @ios-compact retains a collectible text-first hierarchy at enlarged text',async({page},testInfo)=>{
  await openApp(page);await navigate(page,'Exchange');
  await page.getByLabel('Anki · Import Anki .apkg decks').click();
  await page.locator('#anki-import').setInputFiles({name:'language-recall.apkg',mimeType:'application/zip',buffer:await languageRecallPackage()});
  await page.getByRole('button',{name:'Import 1 supported cards'}).click();await page.getByRole('button',{name:'Go to deck'}).click();
  const parent=page.locator('.deck-journey').filter({has:page.getByRole('heading',{name:'Italian Recall',exact:true})});await parent.getByRole('button',{name:'Study',exact:true}).first().click();
  await page.addStyleTag({content:'html{-webkit-text-size-adjust:200%;text-size-adjust:200%}'});
  const card=page.locator('.memory-card');await expect(card).toHaveAttribute('data-composition','typographic-showcase');await expect(card.getByRole('heading',{name:'You are called…'})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('language-text-first-compact-200.png'),fullPage:true});
});
