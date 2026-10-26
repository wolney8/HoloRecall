import { test as base, expect, type Page } from '@playwright/test';
import type { State } from '../src/domain/models';
import { acceptScheduledReview } from '../src/test/scheduled-review';

export const test = base.extend<{ runtimeErrors: void }>({
  runtimeErrors: [async ({ page }, use, testInfo) => {
    const pageErrors: string[] = [], consoleErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await use();
    if (consoleErrors.length) await testInfo.attach('browser-console-errors', { body: consoleErrors.join('\n'), contentType: 'text/plain' });
    expect(pageErrors, 'No unhandled application errors').toEqual([]);
    if (!testInfo.title.includes('offline')) expect(consoleErrors, 'No online console errors').toEqual([]);
  }, { auto: true }],
});
export { expect };
export async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Study dashboard', exact: true })).toBeVisible();
  await expect(page.getByTestId('today-count')).toContainText('0');
}
export async function navigate(page: Page, name: string): Promise<void> {
  const button = page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name, exact: false });
  if (await button.isVisible()) { await button.click(); return; }
  const primary = page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('button', { name, exact: false });
  if (await primary.isVisible()) { await primary.click(); return; }
  const more = page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('button', { name: 'More', exact: true });
  const secondaryDestination = ['Focus', 'Collection', 'Progress', 'Design Studio', 'Exchange', 'Settings'].some(item => name.startsWith(item));
  if (secondaryDestination && await more.isVisible()) {
    await more.click();
    const secondary = page.getByRole('navigation', { name: 'Secondary navigation' }).getByRole('button', { name, exact: false });
    await secondary.waitFor({ state: 'visible' });
    await secondary.click();
    return;
  }
  // Focused Study intentionally hides navigation. End it explicitly so tests follow the real user path.
  if (name === 'Study' && await page.getByRole('heading', { name: 'Study', exact: true }).isVisible()) return;
  const end = page.getByRole('button', { name: 'End session', exact: true });
  if (await end.isVisible()) {
    await end.click();
    await expect(page.getByRole('heading', { name: /Study saved|Nice work/ })).toBeVisible();
    if (await button.isVisible()) await button.click();
    else {
      await page.getByRole('button', { name: 'Done', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Study dashboard', exact: true })).toBeVisible();
      await navigate(page, name);
    }
    return;
  }
  await button.click();
}
export async function selectMaterial(page: Page, label: string, option: string): Promise<void> {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}
export async function snapshot(page: Page): Promise<State> {
  return page.evaluate(() => new Promise<State>((resolve, reject) => {
    const request = indexedDB.open('holorecall-local-v1', 2);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db=request.result,transaction=db.transaction(['local-study','local-media'],'readonly'),read=transaction.objectStore('local-study').get('snapshot');
      read.onerror=()=>reject(read.error);read.onsuccess=()=>{const state=read.result as State,media=transaction.objectStore('local-media'),pending=state.assets.map(asset=>{const value=media.get(asset.contentHash??`asset:${asset.id}`);return new Promise<void>((done,fail)=>{value.onsuccess=()=>{asset.dataUrl=value.result;done();};value.onerror=()=>fail(value.error);});});Promise.all(pending).then(()=>resolve(state),reject);};transaction.oncomplete=()=>db.close();
    };
  }));
}
export async function replaceSnapshot(page:Page,state:State):Promise<void>{
  await page.evaluate(next=>new Promise<void>((resolve,reject)=>{const open=indexedDB.open('holorecall-local-v1',2);open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,transaction=db.transaction('local-study','readwrite');transaction.objectStore('local-study').put(next,'snapshot');transaction.oncomplete=()=>{db.close();resolve();};transaction.onerror=()=>reject(transaction.error);};}),state);
}
/** Earn authored collectibles through valid scheduled evidence for presentation tests. */
export async function ownCards(page:Page,count=1):Promise<void>{
  let state=await snapshot(page);
  for(const card of state.cards.slice(0,count)){
    const required=state.rewardConfig[card.rarity??'common'];let now=new Date('2026-01-01T12:00:00Z');
    for(let index=0;index<required;index++){const stored=state.states[card.id];if(stored)now=new Date(Math.max(Date.parse(stored.due),Date.parse(stored.last_review!)+86_400_000));state=acceptScheduledReview(state,{id:`owned-${card.id}-${index}`,cardId:card.id,sessionId:`owned-session-${card.id}-${index}`,rating:5,now,activeMs:1200,recallMs:500});}
  }
  await replaceSnapshot(page,state);await page.reload();
}
export async function confidentReview(page: Page): Promise<void> {
  await revealCard(page);
  await expect(page.getByRole('heading', { name: 'il limone', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /4 Good Confident/ }).click();
  await expect(page.locator('.session-bar')).toContainText('1 / 10');
}
export async function revealCard(page: Page): Promise<void> {
  const visibleAction = page.getByRole('button', { name: /Check answer/ });
  if (await visibleAction.isVisible()) await visibleAction.click();
  else await page.getByTestId('study-deck-stage').locator('[role="button"]').click({ position: { x: 80, y: 80 } });
}
export async function expectNoOverflow(page: Page): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
}
