import { expect,expectNoOverflow,openApp,test } from './helpers';
import { installCollectionFixture } from './collection-fixture';

const appearanceKey='holorecall:collection-desk:appearance:v1';
const presets=['Holo Grid','Midnight Felt','Walnut','Graphite','Aurora'] as const;
const presetIds=['holo-grid','midnight-felt','walnut','graphite','aurora'] as const;

async function openPicker(page:Parameters<typeof openApp>[0]){
  await page.getByTestId('desk-appearance-trigger').click();
}

async function selectPreset(page:Parameters<typeof openApp>[0],name:typeof presets[number]){
  await openPicker(page);
  await page.getByRole('menuitemradio',{name:new RegExp(`^${name}`)}).click();
  await expect(page.getByRole('menuitemradio',{name:new RegExp(`^${name}`)})).toBeHidden();
}

test('Desk appearance presets change only table material and expose accessible selected state',async({page},testInfo)=>{
  await openApp(page);await installCollectionFixture(page);await page.goto('/#collection/desk/set/lesson');
  await page.getByRole('button',{name:'Lay out full set'}).click();await expect(page.locator('[data-placement-kind="owned"]')).toHaveCount(4);await expect(page.locator('[data-placement-kind="locked"]')).toHaveCount(6);
  const owned=page.locator('[data-placement-kind="owned"]').first();await owned.dblclick();await expect(owned.locator('.memory-card')).toHaveAttribute('data-face','recall');
  await page.getByTestId('desk-viewport').evaluate(element=>{const node=element as HTMLElement;node.setPointerCapture=()=>{};node.releasePointerCapture=()=>{};const send=(type:string,x:number,y:number)=>node.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:91,pointerType:'mouse',isPrimary:true,button:0,buttons:type==='pointerup'?0:1,clientX:x,clientY:y}));send('pointerdown',700,650);send('pointermove',610,590);send('pointerup',610,590);});
  await expect(page.getByTestId('desk-canvas')).not.toHaveAttribute('data-pan-x','0');
  const before=await page.evaluate(()=>({placements:[...document.querySelectorAll<HTMLElement>('.desk-card-position')].map(item=>({id:item.dataset['placementId'],left:item.style.left,top:item.style.top,rotation:item.style.getPropertyValue('--desk-rotation')})),panX:document.querySelector<HTMLElement>('[data-testid="desk-canvas"]')?.dataset['panX'],panY:document.querySelector<HTMLElement>('[data-testid="desk-canvas"]')?.dataset['panY'],top:document.querySelector('.stack-preview-shell')?.textContent?.trim(),face:document.querySelector('[data-placement-kind="owned"] .memory-card')?.getAttribute('data-face')}));

  for(let index=0;index<presets.length;index++){
    await selectPreset(page,presets[index]!);const id=presetIds[index]!;
    await expect(page.locator('.desk-shell')).toHaveAttribute('data-desk-appearance',id);
    await openPicker(page);const option=page.getByRole('menuitemradio',{name:new RegExp(`^${presets[index]}`)});await expect(option).toHaveAttribute('aria-checked','true');await page.keyboard.press('Escape');await expect(option).toBeHidden();
    await page.screenshot({path:testInfo.outputPath(`${id}.png`),fullPage:true});
  }

  await selectPreset(page,'Holo Grid');
  const after=await page.evaluate(()=>({placements:[...document.querySelectorAll<HTMLElement>('.desk-card-position')].map(item=>({id:item.dataset['placementId'],left:item.style.left,top:item.style.top,rotation:item.style.getPropertyValue('--desk-rotation')})),panX:document.querySelector<HTMLElement>('[data-testid="desk-canvas"]')?.dataset['panX'],panY:document.querySelector<HTMLElement>('[data-testid="desk-canvas"]')?.dataset['panY'],top:document.querySelector('.stack-preview-shell')?.textContent?.trim(),face:document.querySelector('[data-placement-kind="owned"] .memory-card')?.getAttribute('data-face')}));
  expect(after).toEqual(before);await expectNoOverflow(page);
});

test('Desk appearance is global, persists independently of set reset, and rejects corrupt values',async({page})=>{
  await openApp(page);await installCollectionFixture(page);await page.goto('/#collection/desk/set/lesson');await selectPreset(page,'Walnut');
  expect(JSON.parse((await page.evaluate(key=>localStorage.getItem(key),appearanceKey))!)).toEqual({version:1,presetId:'walnut'});
  await page.reload();await expect(page.locator('.desk-shell')).toHaveAttribute('data-desk-appearance','walnut');
  await page.getByRole('button',{name:'Reset set'}).click();await expect(page.locator('.desk-shell')).toHaveAttribute('data-desk-appearance','walnut');
  await page.goto('/#collection/desk/set/a');await expect(page.locator('.desk-shell')).toHaveAttribute('data-desk-appearance','walnut');
  await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({version:1,presetId:'unknown-material'})),appearanceKey);await page.reload();await expect(page.locator('.desk-shell')).toHaveAttribute('data-desk-appearance','holo-grid');
  await selectPreset(page,'Holo Grid');await page.reload();await expect(page.locator('.desk-shell')).toHaveAttribute('data-desk-appearance','holo-grid');
});

test('all curated materials retain visible trim, dock and drop target in Light and Dark',async({page})=>{
  await openApp(page);await installCollectionFixture(page);await page.goto('/#collection/desk/set/lesson');
  for(const theme of ['light','dark'] as const){
    await page.locator('html').evaluate((element,value)=>element.setAttribute('data-theme',value),theme);
    for(let index=0;index<presets.length;index++){
      await selectPreset(page,presets[index]!);const shell=page.locator('.desk-shell'),dock=page.locator('.stack-dock');
      const material=await shell.evaluate(element=>{const style=getComputedStyle(element);return{surface:style.getPropertyValue('--desk-surface-base').trim(),trim:style.getPropertyValue('--desk-trim').trim(),drop:style.getPropertyValue('--desk-drop-accent').trim()};});
      expect(material.surface).toBeTruthy();expect(material.trim).toBeTruthy();expect(material.drop).toBeTruthy();
      const resting=await dock.evaluate(element=>getComputedStyle(element).borderTopColor);await dock.evaluate(element=>element.classList.add('drop-active'));await expect.poll(()=>dock.evaluate(element=>getComputedStyle(element).borderTopColor)).not.toBe(resting);expect(await dock.evaluate(element=>getComputedStyle(element).boxShadow)).not.toBe('none');await dock.evaluate(element=>element.classList.remove('drop-active'));
    }
  }
  await expectNoOverflow(page);
});

test('Desk appearance picker and physical geometry reflow without horizontal overflow at 200% text',async({page})=>{
  await page.setViewportSize({width:1024,height:768});await openApp(page);await installCollectionFixture(page);await page.goto('/#collection/desk/set/lesson');await page.addStyleTag({content:'html{-webkit-text-size-adjust:200%;text-size-adjust:200%}'});await openPicker(page);
  await expect(page.getByRole('menuitemradio')).toHaveCount(5);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);await page.getByRole('menuitemradio',{name:/^Walnut/}).click();await expect(page.locator('.desk-shell')).toHaveAttribute('data-desk-appearance','walnut');await expectNoOverflow(page);
});

test('material transitions follow the existing motion preference',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await openApp(page);await installCollectionFixture(page);await page.goto('/#collection/desk/set/lesson');expect(await page.locator('.desk-shell').evaluate(element=>parseFloat(getComputedStyle(element).transitionDuration))).toBeGreaterThanOrEqual(.12);
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();expect(await page.locator('.desk-shell').evaluate(element=>parseFloat(getComputedStyle(element).transitionDuration))).toBe(0);
});

test('@ios-compact appearance picker fits compact WebKit and the Desk remains pannable',async({page})=>{
  await openApp(page);await installCollectionFixture(page);await page.goto('/#collection/desk/set/lesson');await openPicker(page);
  await expect(page.getByRole('menuitemradio')).toHaveCount(5);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByRole('menuitemradio',{name:/^Aurora/}).click();await expect(page.locator('.desk-shell')).toHaveAttribute('data-desk-appearance','aurora');await expectNoOverflow(page);
});

test('@ios-large appearance picker works at large portrait WebKit',async({page})=>{
  await openApp(page);await installCollectionFixture(page);await page.goto('/#collection/desk/set/lesson');await selectPreset(page,'Midnight Felt');await expect(page.locator('.desk-shell')).toHaveAttribute('data-desk-appearance','midnight-felt');await expectNoOverflow(page);
});

test('@ios-landscape appearance picker works in landscape WebKit',async({page})=>{
  await openApp(page);await installCollectionFixture(page);await page.goto('/#collection/desk/set/lesson');await selectPreset(page,'Graphite');await expect(page.locator('.desk-shell')).toHaveAttribute('data-desk-appearance','graphite');await expectNoOverflow(page);
});
