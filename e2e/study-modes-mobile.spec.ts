import {expect,test,expectNoOverflow,openApp,revealCard,selectMaterial,snapshot} from './helpers';

test('@ios-compact Study Mode selection and Free Practice remain touch-safe',async({page})=>{
  await openApp(page);await selectMaterial(page,'Study mode','Free Practice');await expectNoOverflow(page);await page.getByRole('button',{name:/Start studying/}).click();
  await expect(page.getByTestId('study-mode-label')).toHaveText('Free Practice');await expectNoOverflow(page);await revealCard(page);
  const ratings=page.locator('.rating-choice');await expect(ratings).toHaveCount(5);for(let index=0;index<5;index++)expect((await ratings.nth(index).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.getByRole('button',{name:/3, Hesitant/}).click();await expect.poll(async()=>(await snapshot(page)).practiceEvents.length).toBe(1);expect((await snapshot(page)).events).toEqual([]);
});
