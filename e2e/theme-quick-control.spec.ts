import type { Locator, Page } from '@playwright/test';
import { expect, expectNoOverflow, navigate, openApp, snapshot, test } from './helpers';

const visibleThemeButton=(page:Page):Locator=>page.locator('.theme-quick-trigger:visible');

async function openThemeMenu(page:Page):Promise<Locator>{
  const trigger=visibleThemeButton(page);
  await expect(trigger).toHaveCount(1);
  await trigger.click();
  const menu=page.getByRole('menu',{name:'Theme'});
  await expect(menu).toBeVisible();
  return menu;
}

async function chooseTheme(page:Page,label:'System'|'Light'|'Dark'):Promise<void>{
  const menu=await openThemeMenu(page);
  await menu.getByRole('menuitemradio').filter({hasText:label}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme',label.toLowerCase());
  await expect(visibleThemeButton(page)).toHaveAttribute('aria-label',`Choose theme. Current: ${label}`);
  await expect(visibleThemeButton(page).locator('.theme-quick-icon')).toHaveText({System:'◐',Light:'☀',Dark:'☾'}[label]);
}

function rgbChannels(value:string):number[]{return (value.match(/[\d.]+/g)??[]).slice(0,3).map(Number);}
function luminance(value:string):number{
  const channels=rgbChannels(value).map(channel=>{const normalized=channel/255;return normalized<=.04045?normalized/12.92:((normalized+.055)/1.055)**2.4;});
  return .2126*(channels[0]??0)+.7152*(channels[1]??0)+.0722*(channels[2]??0);
}
function contrast(first:string,second:string):number{const a=luminance(first),b=luminance(second);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);}

test('HR-THEME-01 shell chooser shares one persisted preference with Appearance Settings',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await openApp(page);
  const trigger=visibleThemeButton(page),box=await trigger.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x+box!.width).toBeGreaterThan(1360);
  expect(box!.y).toBeLessThan(48);
  const menu=await openThemeMenu(page),options=menu.getByRole('menuitemradio');
  await expect(options).toHaveCount(3);
  await expect(options.nth(0)).toContainText('System');
  await expect(options.nth(1)).toContainText('Light');
  await expect(options.nth(2)).toContainText('Dark');
  await expect(options.nth(0)).toHaveAttribute('aria-checked','true');
  await options.nth(2).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  expect((await snapshot(page)).preferences.theme).toBe('dark');
  await navigate(page,'Settings');
  const settings=page.locator('mat-button-toggle-group[aria-labelledby=settings-theme-label]');
  await expect(settings.getByRole('radio',{name:'Dark'})).toHaveAttribute('aria-checked','true');
  await chooseTheme(page,'Light');
  await expect(settings.getByRole('radio',{name:'Light'})).toHaveAttribute('aria-checked','true');
  await page.reload();
  await expect(visibleThemeButton(page)).toHaveAttribute('aria-label','Choose theme. Current: Light');
  await settings.getByRole('radio',{name:'System'}).click();
  await expect(visibleThemeButton(page)).toHaveAttribute('aria-label','Choose theme. Current: System');
  expect((await snapshot(page)).preferences.theme).toBe('system');
  await page.emulateMedia({colorScheme:'light'});
  const lightBackground=await page.locator('body').evaluate(element=>getComputedStyle(element).backgroundColor);
  await page.emulateMedia({colorScheme:'dark'});
  const darkBackground=await page.locator('body').evaluate(element=>getComputedStyle(element).backgroundColor);
  expect(darkBackground).not.toBe(lightBackground);
  await expect(page.locator('html')).toHaveAttribute('data-theme','system');
});

test('HR-THEME-01 chooser is keyboard operable and follows Material menu dismissal',async({page})=>{
  await openApp(page);
  const trigger=visibleThemeButton(page);
  await trigger.focus();
  await page.keyboard.press('Enter');
  const menu=page.getByRole('menu',{name:'Theme'});
  await expect(menu).toBeVisible();
  await page.keyboard.press('End');
  await expect(menu.getByRole('menuitemradio').filter({hasText:'Dark'})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(trigger).toBeFocused();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(menu).toBeVisible();
  await page.mouse.click(300,300);
  await expect(menu).toBeHidden();
});

test('HR-THEME-01 action remains in persistent chrome across major and immersive routes',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await openApp(page);
  for(const destination of ['Decks','Collection','Focus','Progress','Design Studio','Exchange','Settings']){
    await navigate(page,destination);
    await expect(visibleThemeButton(page),destination).toHaveCount(1);
  }
  await page.goto('/#progress/history');
  await expect(page.getByRole('tab',{name:'History'})).toHaveAttribute('aria-selected','true');
  await expect(visibleThemeButton(page)).toHaveCount(1);
  const headerButtonY=(await visibleThemeButton(page).boundingBox())!.y;
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  expect((await visibleThemeButton(page).boundingBox())!.y).toBeCloseTo(headerButtonY,0);
  await page.goto('/#dashboard');
  await page.getByRole('button',{name:/Start studying/}).click();
  await expect(page.getByRole('region',{name:'Current flashcard',exact:true})).toBeVisible();
  await expect(visibleThemeButton(page)).toHaveCount(1);
  await page.getByRole('button',{name:'End session',exact:true}).click();
  await expect(page.getByRole('heading',{name:/Study saved|Nice work/})).toBeVisible();
  await expect(visibleThemeButton(page)).toHaveCount(1);
});

test('HR-THEME-01 compact chooser reflows at 320 and 390 pixels with 200% text',async({page})=>{
  await page.setViewportSize({width:740,height:800});
  await openApp(page);
  await expect(visibleThemeButton(page)).toHaveCount(1);
  const mediumBox=(await visibleThemeButton(page).boundingBox())!;
  expect(mediumBox.x+mediumBox.width).toBeGreaterThan(700);
  for(const width of [320,390]){
    await page.setViewportSize({width,height:700});
    await openApp(page);
    await page.addStyleTag({content:'html{font-size:200%;-webkit-text-size-adjust:200%;text-size-adjust:200%}'});
    const trigger=visibleThemeButton(page),box=await trigger.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x+box!.width).toBeLessThanOrEqual(width);
    await expectNoOverflow(page);
    const menu=await openThemeMenu(page),menuBox=await menu.boundingBox();
    expect(menuBox).not.toBeNull();
    expect(menuBox!.x).toBeGreaterThanOrEqual(0);
    expect(menuBox!.x+menuBox!.width).toBeLessThanOrEqual(width);
    await menu.getByRole('menuitemradio').filter({hasText:'Dark'}).click();
    await expectNoOverflow(page);
    await page.goto('/#dashboard');
  }
});

test('HR-THEME-01 representative surfaces retain readable token contrast in Light and Dark',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await openApp(page);
  for(const theme of ['Light','Dark'] as const){
    await chooseTheme(page,theme);
    for(const destination of ['Dashboard','Decks','Progress','Settings','Design Studio']){
      await navigate(page,destination);
      const colors=await page.locator('body').evaluate(element=>{const style=getComputedStyle(element);return{background:style.backgroundColor,foreground:style.color};});
      expect(contrast(colors.background,colors.foreground),`${theme} ${destination} body contrast`).toBeGreaterThanOrEqual(4.5);
      const panel=page.locator('.panel:visible').first();
      if(await panel.count()){
        const panelColors=await panel.evaluate(element=>{const style=getComputedStyle(element);return{background:style.backgroundColor,foreground:style.color};});
        expect(contrast(panelColors.background,panelColors.foreground),`${theme} ${destination} panel contrast`).toBeGreaterThanOrEqual(4.5);
      }
    }
  }
});
