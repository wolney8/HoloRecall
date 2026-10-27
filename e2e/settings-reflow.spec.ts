import { expect,expectNoOverflow,navigate,openApp,snapshot,test } from './helpers';

const enlargedText='html{font-size:200%;-webkit-text-size-adjust:200%;text-size-adjust:200%}';

async function expectSettingsContentContained(page:import('@playwright/test').Page):Promise<void>{
  await expectNoOverflow(page);
  const outside=await page.locator('main').evaluate(root=>{
    const viewport=document.documentElement.clientWidth;
    return Array.from(root.querySelectorAll<HTMLElement>('button,input,mat-select,mat-slide-toggle,summary,h1,h2,h3,p,label'))
      .filter(item=>{const style=getComputedStyle(item),box=item.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&box.width>0&&box.height>0;})
      .filter(item=>{const box=item.getBoundingClientRect();return box.left<-.5||box.right>viewport+.5;})
      .map(item=>({tag:item.tagName,text:(item.innerText||item.getAttribute('aria-label')||'').trim().slice(0,80),left:item.getBoundingClientRect().left,right:item.getBoundingClientRect().right}));
  });
  expect(outside).toEqual([]);
}

test('HR-BUG-SETTINGS-01 all Settings groups reflow at 200% text on compact widths',async({page})=>{
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    await openApp(page);
    await navigate(page,'Settings');
    await page.addStyleTag({content:enlargedText});
    await expect(page.getByRole('heading',{name:'Settings',exact:true})).toBeVisible();
    await page.getByText('Deck assignments and overrides',{exact:true}).click();
    await page.getByText(/^Auto Advance · /).click();
    await page.getByText('Advanced',{exact:true}).click();
    await expect(page.getByRole('heading',{name:'Appearance and motion'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Local media'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Cosmetic unlock thresholds'})).toBeVisible();
    await expect(page.getByText(/Your HoloRecall data is stored on this device/)).toBeVisible();
    await expectSettingsContentContained(page);
    const more=page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:/More/});
    await expect(more).toHaveAttribute('aria-current','page');
    await more.click();
    await expect(page.getByRole('navigation',{name:'Secondary navigation'}).getByRole('button',{name:'Settings',exact:true})).toHaveAttribute('aria-current','page');
    await expectNoOverflow(page);
    await page.keyboard.press('Escape');
    await expect(more).toBeFocused();
  }
});

test('HR-BUG-SETTINGS-01 reflow preserves keyboard controls, dependencies and saved semantics',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await openApp(page);
  const before=await snapshot(page);
  await navigate(page,'Settings');
  await page.addStyleTag({content:enlargedText});

  const reviewOrder=page.getByRole('combobox',{name:'Review order'});
  await reviewOrder.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(reviewOrder).toContainText('Most at risk first');

  await page.getByText(/^Auto Advance · /).click();
  const toggle=page.getByRole('switch',{name:'Auto Advance'});
  const reveal=page.getByRole('spinbutton',{name:'Reveal question after'});
  const answer=page.getByRole('spinbutton',{name:'Minimum answer display'});
  await expect(reveal).toBeDisabled();
  await toggle.click();
  await expect(reveal).toBeEnabled();
  await reveal.fill('6');
  await answer.fill('4');
  await toggle.click();
  await expect(reveal).toBeDisabled();
  await toggle.click();
  await expect(reveal).toHaveValue('6');
  await expect(answer).toHaveValue('4');

  const newCards=page.getByRole('spinbutton',{name:'New cards per day'});
  await expect(newCards).toHaveAttribute('min','0');
  await expect(newCards).toHaveAttribute('max','1000');
  await newCards.fill('7');
  await page.getByRole('button',{name:'Save study settings'}).click();
  await expect(page.getByRole('status')).toContainText('Study preset saved');
  const after=await snapshot(page);
  expect(after.events).toEqual(before.events);
  expect(after.rewardEvents).toEqual(before.rewardEvents);
  expect(after.states).toEqual(before.states);
  expect(after.studyPresets.find(item=>item.id==='balanced')).toMatchObject({newCardsPerDay:7,reviewOrder:'retrievability',autoAdvanceEnabled:true,autoRevealSeconds:6,autoAnswerSeconds:4});

  await page.setViewportSize({width:320,height:844});
  await expectSettingsContentContained(page);
  await page.reload();
  await navigate(page,'Settings');
  await page.addStyleTag({content:enlargedText});
  await expect(page.getByRole('spinbutton',{name:'New cards per day'})).toHaveValue('7');
  await expectSettingsContentContained(page);
});
