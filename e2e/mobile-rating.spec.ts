import { expect, openApp, snapshot, test } from './helpers';

const labels=['1, Forgot','2, Hard','3, Hesitant','4, Confident','5, Easy'];

async function enterRatings(page:import('@playwright/test').Page):Promise<void>{
  await openApp(page);
  await page.getByRole('button',{name:/Start studying/}).click();
  const reveal=page.getByRole('button',{name:/Check answer/});
  if(await reveal.isVisible())await reveal.click();
  else{const card=page.getByTestId('study-deck-stage').locator('[role="button"]');await card.focus();await page.keyboard.press('Enter');}
  await expect(page.getByRole('group',{name:'Rate your recall'})).toBeVisible();
}

async function chooseTheme(page:import('@playwright/test').Page,label:'System'|'Light'|'Dark'):Promise<void>{
  await page.locator('.mobile-header').getByRole('button',{name:/Choose theme/}).click();
  await page.getByRole('menuitemradio',{name:label,exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme',label.toLowerCase());
}

test('HR-MOBILE-UX-01B compact ratings are one equal action group with shared modal help',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await enterRatings(page);
  const before=await snapshot(page),group=page.getByRole('group',{name:'Rate your recall'}),choices=group.getByRole('button');
  await expect(choices).toHaveCount(5);
  for(const label of labels)await expect(group.getByRole('button',{name:label,exact:true})).toBeVisible();
  const geometry=await choices.evaluateAll(items=>items.map(item=>{const box=item.getBoundingClientRect(),number=item.querySelector('.rating-number')!.getBoundingClientRect(),label=item.querySelector('.rating-label')!.getBoundingClientRect(),style=getComputedStyle(item);return{x:box.x,y:box.y,width:box.width,height:box.height,numberY:number.y,labelY:label.y,borderWidth:style.borderTopWidth};}));
  expect(new Set(geometry.map(item=>Math.round(item.width))).size).toBe(1);
  expect(new Set(geometry.map(item=>Math.round(item.height))).size).toBe(1);
  expect(new Set(geometry.map(item=>Math.round(item.y))).size).toBe(1);
  expect(new Set(geometry.map(item=>Math.round(item.numberY))).size).toBe(1);
  expect(new Set(geometry.map(item=>Math.round(item.labelY))).size).toBe(1);
  expect(geometry.every(item=>item.width>=44&&item.height>=44&&item.borderWidth==='0px')).toBe(true);
  expect(await group.locator('small,.rating-grade').count()).toBe(0);
  await expect(page.locator('details').filter({hasText:'About the ratings'})).toHaveCount(0);

  const help=page.getByRole('button',{name:'About the ratings',exact:true});
  expect((await help.boundingBox())!.width).toBeGreaterThanOrEqual(44);
  await help.click();
  const dialog=page.getByRole('dialog',{name:'About the ratings'});
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  await expect(dialog.getByText('Choose the option that best matches how the answer came to mind.')).toBeVisible();
  for(const text of ["Couldn't recall the answer.",'Recalled only with significant effort.','Recalled with some hesitation.','Recalled clearly.','Recalled immediately and effortlessly.'])await expect(dialog.getByText(text,{exact:true})).toBeVisible();
  const dialogBox=await dialog.boundingBox();
  expect(dialogBox!.x).toBeGreaterThanOrEqual(0);expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.x+dialogBox!.width).toBeLessThanOrEqual(390);expect(dialogBox!.y+dialogBox!.height).toBeLessThanOrEqual(844);
  await page.mouse.click(2,2);
  await expect(dialog).toBeHidden();
  await expect(help).toBeFocused();
  await help.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(help).toBeFocused();
  expect((await snapshot(page)).events).toEqual(before.events);
});

test('HR-MOBILE-UX-01B ratings reflow in order at 320 px and 200% text without overflow',async({page})=>{
  await page.setViewportSize({width:320,height:700});
  await page.addStyleTag({content:'html{font-size:200%;-webkit-text-size-adjust:200%;text-size-adjust:200%}'});
  await enterRatings(page);
  const choices=page.getByRole('group',{name:'Rate your recall'}).getByRole('button');
  const boxes=await choices.evaluateAll(items=>items.map(item=>{const box=item.getBoundingClientRect();return{x:box.x,y:box.y,width:box.width,height:box.height,right:box.right,text:(item.textContent??'').trim()};}));
  expect(boxes.map(box=>box.text)).toEqual(['1Forgot','2Hard','3Hesitant','4Confident','5Easy']);
  expect(new Set(boxes.map(box=>Math.round(box.x))).size).toBe(1);
  expect(new Set(boxes.map(box=>Math.round(box.width))).size).toBe(1);
  expect(boxes.every((box,index)=>box.height>=44&&box.right<=320&&(index===0||box.y>boxes[index-1]!.y))).toBe(true);
  const overflow=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,wide:[...document.querySelectorAll<HTMLElement>('body *')].map(node=>({tag:node.tagName,className:node.className?.toString(),right:node.getBoundingClientRect().right,width:node.getBoundingClientRect().width})).filter(item=>item.right>document.documentElement.clientWidth+1).sort((a,b)=>b.right-a.right).slice(0,5)}));
  expect(overflow.scrollWidth,JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.clientWidth+1);
});

test('HR-MOBILE-UX-01B rating group and help follow Light Dark and System themes',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({colorScheme:'dark'});
  await enterRatings(page);
  const choice=page.getByRole('button',{name:'3, Hesitant',exact:true});
  const colours:Record<string,{button:string;dialog:string}>={};
  for(const theme of ['Dark','Light','System'] as const){
    await chooseTheme(page,theme);
    const surface=await choice.evaluate(node=>({background:getComputedStyle(node).backgroundColor,color:getComputedStyle(node).color}));
    expect(surface.background).not.toBe('rgba(0, 0, 0, 0)');expect(surface.color).not.toBe(surface.background);
    await page.getByRole('button',{name:'About the ratings'}).click();
    const dialog=page.getByRole('dialog',{name:'About the ratings'});await expect(dialog).toBeVisible();
    colours[theme]={button:surface.background,dialog:await dialog.locator('hr-rating-help-dialog').evaluate(node=>getComputedStyle(node).color)};
    await dialog.getByRole('button',{name:'Close'}).click();
  }
  expect(colours['Dark']).not.toEqual(colours['Light']);
  expect(colours['System']!.button).not.toBe('rgba(0, 0, 0, 0)');
  expect(colours['System']!.dialog).not.toBe(colours['System']!.button);
});

test('HR-MOBILE-UX-01B rapid repeat rating creates one review and one contribution',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await enterRatings(page);
  const button=page.getByRole('button',{name:'4, Confident',exact:true});
  await button.evaluate(node=>{(node as HTMLButtonElement).click();(node as HTMLButtonElement).click();});
  await expect.poll(async()=>(await snapshot(page)).events.filter(event=>event.kind==='review').length).toBe(1);
  const state=await snapshot(page),review=state.events.find(event=>event.kind==='review');
  expect(review?.rating).toBe(4);
  expect(state.rewardEvents.filter(event=>event.kind==='contribution'&&event.reviewEventId===review?.id)).toHaveLength(1);
  expect(state.session?.completed).toBe(1);
});
