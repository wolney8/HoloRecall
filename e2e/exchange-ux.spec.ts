import {existsSync} from 'node:fs';
import {expect,navigate,openApp,snapshot,test} from './helpers';

const bBarryyPackage=process.env['HOLORECALL_BBARRYY_PACKAGE'];

async function openExchange(page:Parameters<typeof openApp>[0]):Promise<void>{
  await openApp(page);await navigate(page,'Import / export');
  await expect(page.getByRole('heading',{name:'Exchange',exact:true})).toBeVisible();
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

test('HR-EXCHANGE-03 navigation reflows on compact WebKit @ios-compact',async({page})=>{
  await page.goto('/#exchange/import');await expect(page.getByRole('tablist',{name:'Exchange sections'})).toBeVisible();
  await page.getByRole('tab',{name:'Templates'}).click();await expect(page.getByText('Exact format specification')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});
