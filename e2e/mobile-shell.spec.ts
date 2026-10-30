import {expect,openApp,snapshot,test} from './helpers';

async function chooseTheme(page:import('@playwright/test').Page,label:'System'|'Light'|'Dark'):Promise<void>{
  const header=page.locator('.mobile-header');
  await header.getByRole('button',{name:/Choose theme/}).click();
  await page.getByRole('menuitemradio',{name:label,exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme',label.toLowerCase());
}

async function shellSurfaces(page:import('@playwright/test').Page):Promise<Record<string,string>>{
  return page.evaluate(()=>Object.fromEntries(Object.entries({html:document.documentElement,body:document.body,root:document.querySelector('app-root'),shell:document.querySelector('.app-shell'),workspace:document.querySelector('.workspace'),header:document.querySelector('.mobile-header')}).map(([key,node])=>[key,getComputedStyle(node!).backgroundColor])));
}

function channelMaximum(colour:string):number{
  return Math.max(...(colour.match(/[\d.]+/g)??[]).slice(0,3).map(Number));
}

test('HR-MOBILE-UX-01A Study owns Light Dark and System shell surfaces and anchors overflow without state mutation',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({colorScheme:'dark'});
  await openApp(page);
  await page.getByRole('button',{name:/Start studying/}).click();
  const before=await snapshot(page),header=page.locator('.mobile-header'),trigger=header.getByRole('button',{name:'More options'});

  await chooseTheme(page,'Dark');
  let surfaces=await shellSurfaces(page);
  expect(new Set(Object.values(surfaces)).size).toBe(1);
  expect(channelMaximum(surfaces.html!)).toBeLessThan(100);
  const darkScrollHeight=await page.evaluate(()=>document.documentElement.scrollHeight);
  const triggerBox=await trigger.boundingBox();
  await trigger.click();
  const menu=page.getByRole('menu',{name:'More options'}),panel=page.locator('.immersive-overflow-menu');
  await expect(menu).toBeVisible();
  await expect(panel).not.toHaveClass(/mat-menu-panel-animating/);
  await expect(menu.getByRole('menuitem')).toHaveCount(4);
  const panelBox=await panel.boundingBox(),afterOpenHeight=await page.evaluate(()=>document.documentElement.scrollHeight);
  expect(triggerBox).not.toBeNull();expect(panelBox).not.toBeNull();
  expect(panelBox!.x+panelBox!.width).toBeLessThanOrEqual(390);
  expect(panelBox!.y).toBeGreaterThanOrEqual(triggerBox!.y+triggerBox!.height-2);
  expect(panelBox!.y+panelBox!.height).toBeLessThanOrEqual(844);
  expect(Math.abs(afterOpenHeight-darkScrollHeight)).toBeLessThanOrEqual(1);
  const rows=await menu.getByRole('menuitem').evaluateAll(items=>items.map(item=>{const box=item.getBoundingClientRect();return{x:box.x,y:box.y,width:box.width,height:box.height};}));
  expect(new Set(rows.map(row=>Math.round(row.x))).size).toBe(1);
  expect(rows.every((row,index)=>row.height>=44&&(index===0||row.y>rows[index-1]!.y))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();

  await chooseTheme(page,'Light');
  surfaces=await shellSurfaces(page);
  expect(new Set(Object.values(surfaces)).size).toBe(1);
  expect(channelMaximum(surfaces.html!)).toBeGreaterThan(200);
  await chooseTheme(page,'System');
  surfaces=await shellSurfaces(page);
  expect(channelMaximum(surfaces.html!)).toBeLessThan(100);
  await page.emulateMedia({colorScheme:'light'});
  await expect.poll(async()=>channelMaximum((await shellSurfaces(page)).html!)).toBeGreaterThan(200);
  await page.emulateMedia({colorScheme:'dark'});
  await expect.poll(async()=>channelMaximum((await shellSurfaces(page)).html!)).toBeLessThan(100);

  const after=await snapshot(page);
  expect(after.events).toEqual(before.events);
  expect(after.rewardEvents).toEqual(before.rewardEvents);
  expect(after.session?.queue).toEqual(before.session?.queue);
  expect(after.session?.completed).toBe(before.session?.completed);
});

test('HR-MOBILE-UX-01A Study overflow dismisses outside, restores focus and reaches Dashboard and Settings',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await openApp(page);
  await page.getByRole('button',{name:/Start studying/}).click();
  const trigger=page.getByRole('button',{name:'More options'}),menu=page.getByRole('menu',{name:'More options'});
  await trigger.click();
  await expect(menu.getByRole('menuitem',{name:'Settings',exact:true})).toBeVisible();
  await expect(page.locator('.immersive-overflow-menu')).not.toHaveClass(/mat-menu-panel-animating/);
  await page.mouse.click(4,400);
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await menu.getByRole('menuitem',{name:'Settings',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Settings',exact:true})).toBeVisible();
  await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:'Dashboard',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Study dashboard',exact:true})).toBeVisible();
});

test('HR-MOBILE-UX-01A Results uses the same anchored overflow contract',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await openApp(page);
  await page.getByRole('button',{name:/Start studying/}).click();
  await page.getByRole('button',{name:'End session',exact:true}).click();
  await expect(page.getByRole('heading',{name:/Study saved|Nice work/})).toBeVisible();
  const trigger=page.getByRole('button',{name:'More options'}),box=await trigger.boundingBox(),height=await page.evaluate(()=>document.documentElement.scrollHeight);
  await trigger.click();
  const panel=page.locator('.immersive-overflow-menu');
  await expect(panel).not.toHaveClass(/mat-menu-panel-animating/);
  const panelBox=await panel.boundingBox();
  expect(box).not.toBeNull();expect(panelBox).not.toBeNull();
  expect(panelBox!.y).toBeGreaterThanOrEqual(box!.y+box!.height-2);
  expect(Math.abs((await page.evaluate(()=>document.documentElement.scrollHeight))-height)).toBeLessThanOrEqual(1);
  await expect(page.getByRole('menu',{name:'More options'}).getByRole('menuitem',{name:'Dashboard',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('HR-MOBILE-UX-01A compact bottom More remains a separate vertical navigation surface at 320 px and 200% text',async({page})=>{
  await page.setViewportSize({width:320,height:700});
  await openApp(page);
  await page.addStyleTag({content:'html{font-size:200%;-webkit-text-size-adjust:200%;text-size-adjust:200%}'});
  const primary=page.getByRole('navigation',{name:'Primary navigation'}),trigger=primary.getByRole('button',{name:'More',exact:true});
  await trigger.click();
  const dialog=page.getByRole('dialog',{name:'More destinations'}),secondary=dialog.getByRole('navigation',{name:'Secondary navigation'}),rows=secondary.getByRole('button');
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('menu',{name:'More options'})).toHaveCount(0);
  const boxes=await rows.evaluateAll(items=>items.map(item=>{const box=item.getBoundingClientRect();return{x:box.x,y:box.y,right:box.right,height:box.height};}));
  expect(new Set(boxes.map(box=>Math.round(box.x))).size).toBe(1);
  expect(boxes.every((box,index)=>box.height>=44&&box.right<=320&&(index===0||box.y>boxes[index-1]!.y))).toBe(true);
  await expect(secondary.getByRole('button',{name:'Settings',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});
