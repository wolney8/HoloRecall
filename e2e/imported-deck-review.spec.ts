import {expect,expectNoOverflow,navigate,openApp,snapshot,test} from './helpers';
import initSqlJs from 'sql.js';
import JSZip from 'jszip';

async function collectibleImport():Promise<Buffer>{
  const SQL=await initSqlJs(),db=new SQL.Database();
  db.run('create table col (models text, decks text)');db.run('create table notes (id integer, guid text, mid integer, tags text, flds text)');db.run('create table cards (id integer, nid integer, did integer, ord integer)');
  const fields=['Prompt','Question','Picture','Options','Answer','Italian','Pronunciation','Meaning','Literal','Lesson','Topic','Kind'];
  const model={name:'Imported collectible',type:0,flds:fields.map(name=>({name})),tmpls:[{name:'Italian answer',qfmt:'<div>{{Picture}}{{#Options}}<div>{{Options}}</div>{{/Options}}</div><p>{{Prompt}}</p><div>{{Question}}</div>',afmt:'<div class="answer-body"><div class="answer-tag">{{Answer}}</div><div class="italian">{{Italian}}</div><div>{{Pronunciation}}</div><div>{{Meaning}}</div><div>{{Literal}}</div></div>'}]};
  db.run('insert into col values (?,?)',[JSON.stringify({1:model}),JSON.stringify({10:{name:'Italian Journey::01 Greetings'}})]);
  const picture='<div class="picture-panel"><span class="badge">HELLO</span><h2>Greetings</h2><p>Choose and say it</p></div>';
  const options='<button onclick="window.bad=true">Ciao</button><button onclick="window.bad=true">Salve</button>';
  const insertNote=db.prepare('insert into notes values (?,?,?,?,?)'),insertCard=db.prepare('insert into cards values (?,?,?,?)');
  for(const [index,answer] of ['Buongiorno!','Buonasera!'].entries()){
    const values=['Recall from the panel',`Card ${index+1}`,picture,options,'Greeting',answer,index?'bwoh-nah-SEH-rah':'bwohn-JOR-noh',index?'Good evening':'Good morning','A common greeting','Lesson 1','Greetings','Phrase'];
    insertNote.run([100+index,`collectible-${index}`,1,'greeting',values.join('\x1f')]);insertCard.run([200+index,100+index,10,0]);
  }
  insertNote.free();insertCard.free();const zip=new JSZip();zip.file('collection.anki2',db.export());zip.file('media','{}');db.close();return Buffer.from(await zip.generateAsync({type:'uint8array'}));
}

test('HR-UX-IDR-02/03 imports into a deck-scoped collectible review flow',async({page},testInfo)=>{
  await openApp(page);await navigate(page,'Exchange');
  await page.getByLabel('Anki · Import Anki .apkg decks').click();
  await page.locator('#anki-import').setInputFiles({name:'collectible-review.apkg',mimeType:'application/zip',buffer:await collectibleImport()});
  await expect(page.getByText('2',{exact:true}).first()).toBeVisible();await page.getByRole('button',{name:'Import 2 supported cards'}).click();
  const completion=page.locator('.completion-panel');await expect(completion).toContainText('Italian Journey');await expect(completion.getByRole('button',{name:'Review imported deck'})).toBeVisible();await expect(completion.getByRole('button',{name:'Study now'})).toBeVisible();await expect(completion.getByRole('button',{name:'Search cards'})).toBeVisible();
  await completion.getByRole('button',{name:'Review imported deck'}).click();
  await expect(page.getByRole('heading',{name:'Italian Journey',exact:true})).toBeVisible();await expect(page.getByLabel('Search this deck')).toBeVisible();await expect(page.locator('.collectible-item')).toHaveCount(2);await expect(page.locator('.collectible-item hr-card')).toHaveCount(2);await expect(page.getByText('Buongiorno!',{exact:true}).first()).toBeVisible();
  const first=page.locator('.collectible-item').first();await expect(first).toContainText(/bwoh-nah-SEH-rah|bwohn-JOR-noh/);await expect(first).toContainText('Common');await first.getByRole('button',{name:/Inspect/}).click();await expect(page.locator('.inspection-card .memory-card')).toHaveClass(/has-native-art/);
  const background=page.locator('.inspection-card .background-layer');expect(await background.evaluate(element=>getComputedStyle(element).backgroundImage)).toContain('gradient');await expect(page.locator('.inspection-card .panel-meta')).toHaveCount(0);await expect(page.locator('.inspection-card .card-gleam')).toHaveCount(1);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('.inspection-card .card-gleam')).toHaveCSS('display','none');await page.emulateMedia({reducedMotion:'no-preference'});
  await page.screenshot({path:testInfo.outputPath('deck-scoped-collectible-review.png'),fullPage:true});
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');await expectNoOverflow(page);await page.evaluate(()=>document.documentElement.style.fontSize='100%');
  const data=await snapshot(page);expect(data.cards.filter(card=>card.answer==='Buongiorno!'||card.answer==='Buonasera!')).toHaveLength(2);
});

test('HR-UX-IDR-02/05 exposes View cards for parent and subdeck management',async({page})=>{
  await openApp(page);await navigate(page,'Exchange');await page.getByLabel('Anki · Import Anki .apkg decks').click();await page.locator('#anki-import').setInputFiles({name:'collectible-review.apkg',mimeType:'application/zip',buffer:await collectibleImport()});await page.getByRole('button',{name:'Import 2 supported cards'}).click();await page.getByRole('button',{name:'Go to deck'}).click();
  const parent=page.locator('.deck-journey').filter({has:page.getByRole('heading',{name:'Italian Journey',exact:true})}),parentActions=parent.locator(':scope > hr-deck-journey-actions');await expect(parent).toContainText('2 cards');await parentActions.getByRole('button',{name:'More deck actions'}).click();await parentActions.getByRole('menuitem',{name:'View cards'}).click();await expect(page.getByRole('heading',{name:'Italian Journey',exact:true})).toBeVisible();await expect(page.locator('.collectible-item')).toHaveCount(2);
  await navigate(page,'Decks');const show=parent.getByRole('button',{name:/Show 1 subdecks/});if(await show.isVisible())await show.click();const child=parent.locator('.subdeck-row');await child.getByRole('button',{name:'More deck actions'}).click();await child.getByRole('menuitem',{name:'View cards'}).click();await expect(page.getByRole('heading',{name:'01 Greetings',exact:true})).toBeVisible();await expect(page.locator('.collectible-item')).toHaveCount(2);
});

test('HR-UX-IDR responsive imported review @ios-compact @ios-large @ios-landscape',async({page})=>{
  await openApp(page);await navigate(page,'Exchange');await page.getByLabel('Anki · Import Anki .apkg decks').click();await page.locator('#anki-import').setInputFiles({name:'collectible-review.apkg',mimeType:'application/zip',buffer:await collectibleImport()});await page.getByRole('button',{name:'Import 2 supported cards'}).click();
  const done=page.locator('.completion-panel');await expect(done.getByRole('button',{name:'Review imported deck'})).toBeVisible();await expectNoOverflow(page);await done.getByRole('button',{name:'Review imported deck'}).click();await expect(page.locator('.collectible-item')).toHaveCount(2);await expectNoOverflow(page);
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');await expectNoOverflow(page);await expect(page.getByRole('button',{name:/Inspect/}).first()).toBeVisible();
});
