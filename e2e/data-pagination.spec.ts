import { expect,openApp,replaceSnapshot,snapshot,test } from './helpers';
import { acceptScheduledReview } from '../src/test/scheduled-review';
import type { State } from '../src/domain/models';

async function installLargeDataset(page:import('@playwright/test').Page):Promise<void>{
  await openApp(page);
  const seed=await snapshot(page),template=seed.cards[0]!;
  let state:State={...seed,version:seed.version+1,decks:[],cards:[],states:{},events:[],administrativeEvents:[],practiceEvents:[],rewardEvents:[],session:null,focusPresets:Array.from({length:23},(_,index)=>({id:`page-preset-${index}`,version:1 as const,name:`Paging preset ${index}`,mode:'practice' as const,criteria:{version:1 as const},order:'deck' as const,limit:20}))};
  for(let index=0;index<53;index++){
    const deckId=`page-deck-${index.toString().padStart(2,'0')}`,cardId=`page-card-${index.toString().padStart(2,'0')}`;
    state.decks.push({id:deckId,name:`Paging deck ${index.toString().padStart(2,'0')}`,description:'Deterministic pagination fixture',suspended:false});
    state.cards.push({...template,id:cardId,deckId,front:`Pagination prompt ${index}`,answer:`Pagination answer ${index}`,rarity:'common',revision:1,tags:['pagination']});
    state=acceptScheduledReview(state,{id:`page-review-${index}`,cardId,sessionId:'page-session',rating:4,now:new Date(Date.UTC(2026,8,1,index,0,0)),activeMs:1000,recallMs:500});
  }
  await replaceSnapshot(page,state);await page.reload();
}

test('large History, Progress, and Collection datasets render bounded accessible pages',async({page})=>{
  await page.setViewportSize({width:1280,height:900});
  await installLargeDataset(page);

  await page.goto('/#progress/decks');
  const inventory=page.getByRole('region',{name:'Current deck inventory'}).or(page.locator('section.panel').filter({has:page.getByRole('heading',{name:'Current deck inventory'})}));
  await expect(inventory.getByRole('row')).toHaveCount(26);
  await expect(inventory.getByText('1–25 of 53',{exact:true})).toBeVisible();
  await expect(inventory.getByRole('button',{name:'Previous page'})).toBeDisabled();
  await inventory.getByRole('button',{name:'Next page'}).focus();await page.keyboard.press('Enter');
  await expect(inventory.getByText('26–50 of 53',{exact:true})).toBeVisible();
  await inventory.getByRole('button',{name:'Next page'}).click();
  await expect(inventory.getByText('51–53 of 53',{exact:true})).toBeVisible();
  await expect(inventory.getByRole('row')).toHaveCount(4);
  await expect(inventory.getByRole('button',{name:'Next page'})).toBeDisabled();

  await page.getByRole('tab',{name:'History'}).click();
  const history=page.locator('hr-review-history');
  await expect(history.locator('.history-list>li')).toHaveCount(25);
  await expect(history.getByText('1–25 of 53',{exact:true})).toBeVisible();
  await expect(history.locator('time').first()).toHaveAttribute('datetime','2026-09-03T04:00:00.000Z');
  await history.getByRole('button',{name:'Last page'}).click();
  await expect(history.getByText('51–53 of 53',{exact:true})).toBeVisible();
  await expect(history.locator('time').last()).toHaveAttribute('datetime','2026-09-01T00:00:00.000Z');

  await page.goto('/#collection/sets');
  await expect(page.locator('.all-sets .progress-card')).toHaveCount(12);
  await expect(page.getByText('1–12 of 53',{exact:true})).toBeVisible();
  await page.getByRole('tab',{name:'Cards'}).click();
  await expect(page.locator('.owned-section .collectible-item')).toHaveCount(24);
  await expect(page.getByText('1–24 of 53',{exact:true})).toBeVisible();
  await page.getByLabel('Search your collection').fill('Pagination answer 52');
  await expect(page.locator('.owned-section .collectible-item')).toHaveCount(1);
  await expect(page.getByText('1–1 of 1',{exact:true})).toBeVisible();

  await page.goto('/#focus');
  await expect(page.locator('.preset-list .preset-row')).toHaveCount(10);
  await expect(page.getByText('1–10 of 23',{exact:true})).toBeVisible();

  await page.addStyleTag({content:'html{font-size:200%;-webkit-text-size-adjust:200%;text-size-adjust:200%}'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
});

test('pagination remains usable in the compact card layout',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await installLargeDataset(page);
  await page.goto('/#collection/cards');
  await page.addStyleTag({content:'html{font-size:200%;-webkit-text-size-adjust:200%;text-size-adjust:200%}'});
  await expect(page.locator('.owned-section .collectible-item')).toHaveCount(24);
  const paginator=page.locator('hr-data-pagination').last();
  await expect(paginator.getByText('1–24 of 53',{exact:true})).toBeVisible();
  await paginator.getByRole('button',{name:'Next page'}).click();
  await expect(paginator.getByText('25–48 of 53',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
});
