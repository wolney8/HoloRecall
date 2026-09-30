// Run from the project root: node scripts/generate-workbooks.mjs
// Uses the already installed Angular esbuild dependency; generated scratch output stays ignored.
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= '.runtime/playwright';
await mkdir('.angular/generate', { recursive: true });
await build({ entryPoints: ['scripts/generate-workbooks.ts'], bundle: true, platform: 'node', format: 'esm', packages: 'external', outfile: '.angular/generate/workbooks.mjs' });
await import(pathToFileURL(resolve('.angular/generate/workbooks.mjs')).href);
