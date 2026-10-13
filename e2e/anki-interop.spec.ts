import { expect, test, navigate, openApp, snapshot, expectNoOverflow } from './helpers';
import initSqlJs from 'sql.js';
import JSZip from 'jszip';

async function customApkg():Promise<Buffer>{
  const SQL=await initSqlJs(),db=new SQL.Database();db.run('create table col (models text, decks text)');db.run('create table notes (id integer, guid text, mid integer, tags text, flds text)');db.run('create table cards (id integer, nid integer, did integer, ord integer)');
  const model={1:{name:'Arbitrary science layout',type:0,flds:[{name:'Scene'},{name:'QuestionText'},{name:'ResultValue'},{name:'SymbolLine'},{name:'ExplanationBlock'}],tmpls:[{name:'Forward',qfmt:'<p>{{Scene}}</p><h2>{{QuestionText}}</h2>',afmt:'{{FrontSide}}<hr id="answer"><div class="solution">{{ResultValue}}</div><div>{{SymbolLine}}</div><section>{{ExplanationBlock}}</section>'}]}};
  db.run('insert into col values (?,?)',[JSON.stringify(model),JSON.stringify({10:{name:'Physics'}})]);db.run('insert into notes values (?,?,?,?,?)',[100,'semantic-guid',1,'science','A falling object\x1fWhat is acceleration near Earth?\x1f9.81 m/s²\x1fg\x1fIgnoring air resistance.']);db.run('insert into cards values (?,?,?,?)',[200,100,10,0]);
  const zip=new JSZip();zip.file('collection.anki2',db.export());zip.file('media','{}');db.close();return Buffer.from(await zip.generateAsync({type:'uint8array'}));
}

test('HR-ANKI-INTEROP-01 reviews and confirms one note-type/template semantic mapping',async({page})=>{
  await openApp(page);await navigate(page,'Exchange');await page.getByLabel('Anki · Import Anki .apkg decks').click();await page.locator('#anki-import').setInputFiles({name:'science.apkg',mimeType:'application/zip',buffer:await customApkg()});
  const review=page.getByLabel('Anki conversion profiles');await expect(review).toContainText('What is acceleration near Earth?');await expect(review).toContainText('9.81 m/s²');await expect(page.locator('.mapping-panel')).toHaveCount(0);
  await page.getByRole('button',{name:/Advanced details/}).click();await page.getByRole('button',{name:'Advanced mapping'}).click();const studio=page.locator('.mapping-panel');await expect(studio.getByRole('heading',{name:'Arbitrary science layout'})).toBeVisible();await expect(studio).toContainText('Forward');await expect(studio).toContainText('Ignoring air resistance.');
  const explanation=studio.locator('.mapping-row').filter({hasText:'ExplanationBlock'});await explanation.getByRole('combobox').click();await page.getByRole('option',{name:'Support · Explanation'}).click();await page.getByRole('button',{name:'Update semantic preview'}).click();
  await expect(page.getByText(/exact semantic projection/)).toBeVisible();await page.getByRole('button',{name:'Import 1 supported cards'}).click();const state=await snapshot(page),mapping=state.ankiMappings.find(item=>item.modelName==='Arbitrary science layout');expect(mapping).toMatchObject({version:4,origin:'user-confirmed',scope:'template',templateName:'Forward',fields:{ExplanationBlock:'explanation'}});expect(state.cards.find(card=>card.ankiSource?.noteGuid==='semantic-guid')).toMatchObject({id:'anki-semantic-guid-0',answer:'9.81 m/s²'});
});

test('HR-ANKI-INTEROP-01 previews Basic and Extended v1 Anki text contracts',async({page})=>{
  await openApp(page);await navigate(page,'Exchange');await page.getByRole('tab',{name:'Export'}).click();await page.getByLabel('Anki · Basic or Extended v1 text-import files').click();await page.getByRole('button',{name:'Preview Anki export'}).click();const preview=page.getByLabel('Anki export preview');await expect(preview).toContainText('ANKI FRONT');await expect(preview).toContainText('ANKI BACK');await expect(preview.getByRole('button',{name:/Download HoloRecall Extended v1/})).toBeVisible();
  await page.getByLabel('Export profile').click();await page.getByRole('option',{name:'HoloRecall Basic'}).click();await expect(preview).toContainText(/Basic exports only Prompt and Answer/);
});

test('HR-ANKI-INTEROP-01 Mapping Studio reflows without page overflow @ios-compact',async({page})=>{
  await openApp(page);await navigate(page,'Exchange');await page.getByLabel('Anki · Import Anki .apkg decks').click();await page.locator('#anki-import').setInputFiles({name:'science.apkg',mimeType:'application/zip',buffer:await customApkg()});await page.getByRole('button',{name:/Advanced details/}).click();await page.getByRole('button',{name:'Advanced mapping'}).click();await expect(page.locator('.mapping-panel')).toContainText('Ignoring air resistance.');await expectNoOverflow(page);
});
