import { expect, expectNoOverflow, navigate, openApp, selectMaterial, test } from './helpers';

const compositions = [
  ['full-bleed', 'Full Bleed'],
  ['framed-art', 'Framed Art'],
  ['illustration-window', 'Illustration Window'],
  ['split-art-content', 'Split Art / Content'],
  ['typographic-showcase', 'Typographic Showcase'],
  ['minimal-prestige', 'Minimal Prestige'],
  ['diagram-technical', 'Diagram / Technical'],
  ['photo-focus', 'Photo Focus'],
  ['symbolic-generated', 'Symbolic / Generated Art'],
] as const;

async function openCompositionPreview(page: Parameters<typeof openApp>[0]): Promise<void> {
  await openApp(page);
  await navigate(page, 'Design Studio');
  await selectMaterial(page, 'Preview content', 'Generated art');
  await page.getByLabel('Use one composition').check();
  const recall = page.getByRole('button', { name: 'Show recall face' });
  if (await recall.isVisible()) await recall.click();
}

test('HR-DESIGN-17B gives all nine production compositions distinct structural treatments on both faces', async ({ page }) => {
  await openCompositionPreview(page);
  const card = page.locator('hr-design-studio .memory-card');
  const signatures = new Map<string, string>();

  for (const [id, label] of compositions) {
    await page.getByText(label, { exact: true }).click();
    await expect(card).toHaveAttribute('data-composition', id);
    await expect(card).toHaveAttribute('data-face', 'recall');
    const signature = await card.evaluate(element => {
      const illustration = element.querySelector<HTMLElement>('.illustration-layer')!;
      const copy = element.querySelector<HTMLElement>('.card-copy')!;
      const cardStyle = getComputedStyle(element);
      const illustrationStyle = getComputedStyle(illustration);
      const copyStyle = getComputedStyle(copy);
      return JSON.stringify({
        display: cardStyle.display,
        columns: cardStyle.gridTemplateColumns,
        padding: cardStyle.padding,
        gap: cardStyle.gap,
        artWidth: illustrationStyle.width,
        artFlex: illustrationStyle.flexBasis,
        artBorder: `${illustrationStyle.borderTopWidth} ${illustrationStyle.borderTopStyle}`,
        artRadius: illustrationStyle.borderTopLeftRadius,
        artMaxHeight: illustrationStyle.maxHeight,
        artAspect: illustrationStyle.aspectRatio,
        copyWidth: copyStyle.width,
        copyMaxHeight: copyStyle.maxHeight,
        copyAlign: copyStyle.alignItems,
        copyText: copyStyle.textAlign,
        copyRule: copyStyle.borderLeftWidth,
      });
    });
    signatures.set(id, signature);
    await expect(card.getByRole('heading', { name: 'Recall the key idea' })).toBeVisible();
    expect(await card.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);

    await page.getByRole('button', { name: 'Show answer face' }).click();
    await expect(card).toHaveAttribute('data-composition', id);
    await expect(card).toHaveAttribute('data-face', 'answer');
    await expect(card.getByRole('heading', { name: 'Generated art stays stable' })).toBeVisible();
    expect(await card.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await page.getByRole('button', { name: 'Show recall face' }).click();
  }

  expect(new Set(signatures.values()).size, Object.fromEntries(signatures)).toBe(compositions.length);
  await expect(card.locator('.illustration-layer')).toHaveCSS('pointer-events', 'auto');
});

test('HR-DESIGN-17B keeps composition, theme and rarity controls keyboard-operable and faithful to the production renderer', async ({ page }) => {
  await openCompositionPreview(page);
  const card = page.locator('hr-design-studio .memory-card');
  const framed = page.getByLabel('Framed Art');
  await framed.focus();
  await framed.press('Space');
  await expect(framed).toBeChecked();
  await expect(card).toHaveAttribute('data-composition', 'framed-art');

  await page.locator('mat-button-toggle').filter({ hasText: 'Dark' }).click();
  await expect(card).toHaveAttribute('data-theme-preview', 'dark');
  await page.getByText('Rarity variants', { exact: true }).click();
  await selectMaterial(page, 'Rarity to tune', '✷ Secret Rare');
  await expect(card).toHaveAttribute('data-rarity', 'secret-rare');
  await expect(card).toHaveAttribute('aria-label', /Secret Rare.*design preview/);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(card.locator('..').locator('..')).toHaveAttribute('data-motion', 'reduced');
  await expect(card.locator('.surface-ambient')).toHaveCSS('display', 'none');
});

test('HR-DESIGN-17B representative content keeps art, focal, technical, long and media-free layouts usable', async ({ page }) => {
  await openCompositionPreview(page);
  const card = page.locator('hr-design-studio .memory-card');
  await selectMaterial(page, 'Preview content', 'Image');
  await page.getByText('Photo Focus', { exact: true }).click();
  const image = card.locator('.illustration-layer img');
  await expect(image).toBeVisible();
  await page.getByLabel('Focal point X').fill('23');
  await page.getByLabel('Focal point Y').fill('71');
  await expect(image).toHaveCSS('object-position', '23% 71%');
  const photoRatio = await card.evaluate(element => element.querySelector<HTMLElement>('.illustration-layer')!.getBoundingClientRect().height / element.getBoundingClientRect().height);
  expect(photoRatio).toBeGreaterThan(.5);

  await selectMaterial(page, 'Preview content', 'Technical / formula');
  await page.getByText('Diagram / Technical', { exact: true }).click();
  await expect(card.getByRole('heading', { name: 'Solve for x: 2x + 4 = 18' })).toBeVisible();
  await expect(card.locator('.card-copy')).toHaveCSS('text-align', 'start');

  await selectMaterial(page, 'Preview content', 'Long answer');
  await page.getByText('Split Art / Content', { exact: true }).click();
  await page.getByRole('button', { name: 'Show answer face' }).click();
  await expect(card.getByRole('heading', { name: 'They form a complementary energy cycle.' })).toBeVisible();
  expect(await card.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);

  await page.getByRole('button', { name: 'Show recall face' }).click();
  await selectMaterial(page, 'Preview content', 'Text only');
  await page.getByText('Minimal Prestige', { exact: true }).click();
  await expect(card.locator('.illustration-layer')).toBeHidden();
  await expect(card.getByRole('heading', { name: 'Why does spaced recall work?' })).toBeVisible();
});

test('HR-DESIGN-17B photo focus bounds deterministic portrait and landscape media through the real provider', async ({ page }) => {
  await openApp(page);
  await page.evaluate(async()=>{
    const make=async(id:string,width:number,height:number)=>{const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d')!;const gradient=context.createLinearGradient(0,0,width,height);gradient.addColorStop(0,'#285c50');gradient.addColorStop(1,'#d3ad5b');context.fillStyle=gradient;context.fillRect(0,0,width,height);const dataUrl=canvas.toDataURL('image/png'),bytes=Uint8Array.from(atob(dataUrl.split(',')[1]!),character=>character.charCodeAt(0)),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(value=>value.toString(16).padStart(2,'0')).join('');return{id,name:`${id}.png`,mime:'image/png',width,height,byteLength:bytes.byteLength,contentHash:`sha256:${digest}`,dataUrl};};
    const assets=await Promise.all([make('composition-portrait',120,240),make('composition-landscape',320,100)]);
    await new Promise<void>((resolve,reject)=>{const open=indexedDB.open('holorecall-local-v1',2);open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,transaction=db.transaction(['local-study','local-media'],'readwrite'),stateStore=transaction.objectStore('local-study'),read=stateStore.get('snapshot');read.onerror=()=>reject(read.error);read.onsuccess=()=>{const state=read.result,source=state.cards[0];for(const [index,asset] of assets.entries()){state.assets.push({...asset,dataUrl:undefined});state.cards.push({...source,id:`composition-media-${index}`,front:index?'Wide landscape prompt':'Tall portrait prompt',answer:index?'Landscape media':'Portrait media',image:`asset:${asset.id}`,revision:1});transaction.objectStore('local-media').put(asset.dataUrl,asset.contentHash);}state.version++;stateStore.put(state,'snapshot');};transaction.oncomplete=()=>{db.close();resolve();};transaction.onerror=()=>reject(transaction.error);};});
  });
  await page.reload();await navigate(page,'Design Studio');
  await page.getByLabel('Use one composition').check();await page.getByText('Photo Focus',{exact:true}).click();
  const card=page.locator('hr-design-studio .memory-card'),image=card.locator('.illustration-layer img'),realCard=page.getByRole('combobox',{name:'Real card'});
  for(const [answer,width,height,keys] of [['Portrait media',120,240,['End','ArrowUp','Enter']],['Landscape media',320,100,['End','Enter']]] as const){
    await realCard.click();for(const key of keys)await page.keyboard.press(key);await expect(realCard).toContainText(answer);
    await expect(image).toBeVisible();
    await expect.poll(()=>image.evaluate(element=>({width:element.naturalWidth,height:element.naturalHeight}))).toEqual({width,height});
    await expect(image).toHaveCSS('object-fit','cover');
    const bounds=await image.boundingBox(),art=await card.locator('.illustration-layer').boundingBox();
    expect(bounds!.width/art!.width).toBeGreaterThan(.97);expect(bounds!.width/art!.width).toBeLessThan(1.03);
    expect(bounds!.height/art!.height).toBeGreaterThan(.97);expect(bounds!.height/art!.height).toBeLessThan(1.03);
    expect(Math.abs(bounds!.x+bounds!.width/2-(art!.x+art!.width/2))).toBeLessThan(4);expect(Math.abs(bounds!.y+bounds!.height/2-(art!.y+art!.height/2))).toBeLessThan(4);
  }
});

test('HR-DESIGN-17B offline artwork failure keeps a complete photo-focus text fallback', async ({ page }) => {
  await page.route('**/art/tavolo.svg',route=>route.abort());await openApp(page);
  await page.evaluate(()=>new Promise<void>((resolve,reject)=>{const open=indexedDB.open('holorecall-local-v1',2);open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,transaction=db.transaction('local-study','readwrite'),store=transaction.objectStore('local-study'),read=store.get('snapshot');read.onerror=()=>reject(read.error);read.onsuccess=()=>{const state=read.result;state.version++;state.cards[0].image='/art/tavolo.svg';store.put(state,'snapshot');};transaction.oncomplete=()=>{db.close();resolve();};transaction.onerror=()=>reject(transaction.error);};}));
  await page.reload();await navigate(page,'Design Studio');await page.getByLabel('Use one composition').check();await page.getByText('Photo Focus',{exact:true}).click();
  const card=page.locator('hr-design-studio .memory-card');await expect(card.getByText('Illustration unavailable')).toBeVisible();await expect(card.locator('.illustration-layer')).toHaveClass(/image-missing/);await expect(card.locator('.card-copy')).toBeVisible();expect(await card.evaluate(element=>element.scrollWidth<=element.clientWidth+1)).toBe(true);
});

test('HR-DESIGN-17B all compositions remain bounded at the medium shell breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await openCompositionPreview(page);
  const card=page.locator('hr-design-studio .memory-card');
  for(const [id,label] of compositions){
    await page.getByText(label,{exact:true}).click();
    await expect(card).toHaveAttribute('data-composition',id);
    expect(await card.evaluate(element=>element.scrollWidth<=element.clientWidth+1)).toBe(true);
  }
  await expectNoOverflow(page);
});

test('HR-DESIGN-17B compositions reflow at 390 and 320 px with 200% text @ios-compact', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await openCompositionPreview(page);
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  const card = page.locator('hr-design-studio .memory-card');
  for (const [id, label] of compositions) {
    await page.getByText(label, { exact: true }).click();
    await expect(card).toHaveAttribute('data-composition', id);
    await expect(card.getByRole('heading', { name: 'Recall the key idea' })).toBeVisible();
    expect(await card.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  }
  await expectNoOverflow(page);
  await page.setViewportSize({width:320,height:760});
  for(const [id,label] of compositions){
    await page.getByText(label,{exact:true}).click();
    await expect(card).toHaveAttribute('data-composition',id);
    expect(await card.evaluate(element=>element.scrollWidth<=element.clientWidth+1)).toBe(true);
  }
  await expectNoOverflow(page);
});
