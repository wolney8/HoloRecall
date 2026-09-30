import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { SEED_CARDS, SEED_DECKS } from '../src/app/seed';
import { makePortableBundle, writePortableZip, writeWorkbook } from '../src/domain/exchange';
import type { ContentBundle } from '../src/domain/exchange';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= '.runtime/playwright';
await mkdir('public/downloads', { recursive: true });
const example: ContentBundle = { cards: SEED_CARDS, decks: SEED_DECKS, designs: [], assets: [] };
await writeFile('public/downloads/holorecall-blank-v2.xlsx', await writeWorkbook());
await writeFile('public/downloads/holorecall-italian-v2.xlsx', await writeWorkbook(example));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const portable = await makePortableBundle(example, async ref => {
    const svg = await readFile(`public${ref}`, 'utf8');
    return page.evaluate(async source => {
      const image = new Image(); image.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(source)))}`;
      await image.decode(); const width = 900, height = Math.round(width * image.naturalHeight / image.naturalWidth);
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas is unavailable.');
      context.drawImage(image, 0, 0, width, height); return { dataUrl: canvas.toDataURL('image/png'), width, height };
    }, svg);
  });
  await writeFile('public/downloads/holorecall-italian-v2.zip', await writePortableZip(portable));
} finally { await browser.close(); }
await copyFile('docs/deck-format.md', 'public/downloads/deck-format.md');
await copyFile('docs/deck-generation-prompt.md', 'public/downloads/deck-generation-prompt.md');
console.log(`Generated blank workbook, ${SEED_CARDS.length}-card Italian workbook, portable ZIP, specification and prompt.`);
