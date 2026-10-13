import { readFile } from 'node:fs/promises';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= new URL('../.runtime/playwright', import.meta.url).pathname;
const { chromium } = await import('@playwright/test');

const source = new URL('../public/brand/holorecall-mark.svg', import.meta.url);
const svg = await readFile(source, 'utf8');
const browser = await chromium.launch({ headless: true });

async function render(path, size, variant = 'full') {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  const transparent = variant !== 'full';
  await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;background:transparent}svg{display:block;width:100%;height:100%}${variant === 'round' ? 'svg{clip-path:circle(50%)}' : ''}</style>${svg}`);
  if (transparent) await page.locator('#brand-background').evaluate(node => node.setAttribute('fill', 'transparent'));
  await page.screenshot({ path: new URL(`../${path}`, import.meta.url).pathname, omitBackground: transparent });
  await page.close();
}

await render('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', 1024);

for (const [density, legacy, foreground] of [
  ['mdpi', 48, 108],
  ['hdpi', 72, 162],
  ['xhdpi', 96, 216],
  ['xxhdpi', 144, 324],
  ['xxxhdpi', 192, 432],
]) {
  const base = `android/app/src/main/res/mipmap-${density}`;
  await render(`${base}/ic_launcher.png`, legacy);
  await render(`${base}/ic_launcher_round.png`, legacy, 'round');
  await render(`${base}/ic_launcher_foreground.png`, foreground, 'foreground');
}

await browser.close();
