import { existsSync, readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { analyseAnkiPackage, markAnkiLocalEdits, previewAnkiImport } from './anki';
import { contentFromState, readContentFile, writePortableZip } from './exchange';
import { describeAsset } from './media-registry';
import { createInitialState } from './study';

const italianPath='/Users/will_work/Downloads/Italian_Lessons_1-3_Clear_Prompts_v3_UPDATE.apkg';
const anatomyPath='/Users/will_work/Downloads/bBarryy_anatomy_thorax_pt_1.apkg';
const empty=()=>createInitialState([],[]);
beforeAll(()=>{const wasm=readFileSync('node_modules/sql.js/dist/sql-wasm-browser.wasm'),original=globalThis.fetch;globalThis.fetch=((input:RequestInfo|URL,init?:RequestInit)=>String(input).endsWith('/runtime/sql-wasm-browser.wasm')?Promise.resolve(new Response(wasm,{headers:{'content-type':'application/wasm'}})):original(input,init)) as typeof fetch;});

describe.skipIf(!existsSync(italianPath))('real Italian portable-package dogfood',()=>{
  it('round trips the 254-card Lesson 1–3 hierarchy, source identity and a local edit',async()=>{
    const analysis=await analyseAnkiPackage(new Uint8Array(readFileSync(italianPath)),'Italian_Lessons_1-3_Clear_Prompts_v3_UPDATE.apkg'),source=empty(),imported=previewAnkiImport(analysis,source).bundle;
    source.decks=structuredClone(imported.decks);source.cards=structuredClone(imported.cards);source.assets=structuredClone(imported.assets);source.ankiSources=structuredClone(imported.ankiSources??[]);source.ankiMappings=structuredClone(analysis.effectiveMappings);source.ankiConversionProfiles=structuredClone(analysis.conversionProfiles);
    const original=source.cards.find(card=>/Ciao!/i.test(card.answer))??source.cards[0]!,edited=structuredClone(original);edited.answer=`${original.answer} · local note`;source.cards=source.cards.map(card=>card.id===original.id?markAnkiLocalEdits(original,edited):card);
    const roots=source.decks.filter(deck=>!deck.parentId).map(deck=>deck.id),bundle=contentFromState(source,roots),preview=await readContentFile(await writePortableZip(bundle,{selectedRootIds:roots,rootName:'Italian Lessons 1–3',exportedAt:new Date(0),packageId:'portable-italian-dogfood'}),'italian.zip',empty());
    expect(analysis.generatedCards).toBe(254);expect(preview.errors).toEqual([]);expect(preview.bundle.cards).toHaveLength(254);expect(preview.bundle.decks.map(deck=>deck.name).join(' ')).toMatch(/Lesson 1/i);expect(preview.bundle.decks.map(deck=>deck.name).join(' ')).toMatch(/Lesson 2/i);expect(preview.bundle.decks.map(deck=>deck.name).join(' ')).toMatch(/Lesson 3/i);
    expect(preview.bundle.cards.find(card=>card.id===original.id)).toEqual(source.cards.find(card=>card.id===original.id));expect(preview.bundle.cards.every(card=>!!card.ankiSource?.noteGuid&&!!card.ankiSource.modelSignature)).toBe(true);expect(preview.bundle.ankiSources).toEqual(source.ankiSources);expect(preview.bundle.ankiConversionProfiles).toEqual(source.ankiConversionProfiles);
    for(const answer of ['Ciao!','Buongiorno!','Buonasera!'])expect(preview.bundle.cards.some(card=>card.answer.includes(answer))).toBe(true);
  },60_000);
});

describe.skipIf(!existsSync(anatomyPath))('real anatomy portable-package dogfood',()=>{
  it('round trips referenced media bytes and native Image Occlusion where supported',async()=>{
    const analysis=await analyseAnkiPackage(new Uint8Array(readFileSync(anatomyPath)),'bBarryy_anatomy_thorax_pt_1.apkg'),source=empty(),imported=previewAnkiImport(analysis,source).bundle;source.decks=structuredClone(imported.decks);source.cards=structuredClone(imported.cards);source.assets=structuredClone(imported.assets);source.ankiSources=structuredClone(imported.ankiSources??[]);source.ankiMappings=structuredClone(analysis.effectiveMappings);source.ankiConversionProfiles=structuredClone(analysis.conversionProfiles);
    const bundle=contentFromState(source),preview=await readContentFile(await writePortableZip(bundle,{rootName:'Anatomy thorax',exportedAt:new Date(0),packageId:'portable-anatomy-dogfood'}),'anatomy.zip',empty());expect(preview.errors).toEqual([]);expect(preview.bundle.cards).toHaveLength(58);expect(preview.bundle.assets.length).toBeGreaterThan(0);
    const sourceHashes=await Promise.all(bundle.assets.map(describeAsset)),targetHashes=await Promise.all(preview.bundle.assets.map(describeAsset));expect(targetHashes.map(asset=>asset.contentHash).sort()).toEqual(sourceHashes.map(asset=>asset.contentHash).sort());expect(preview.bundle.cards.filter(card=>card.imageOcclusion).map(card=>card.imageOcclusion)).toEqual(bundle.cards.filter(card=>card.imageOcclusion).map(card=>card.imageOcclusion));expect(preview.bundle.ankiSources).toEqual(bundle.ankiSources);
  },60_000);
});
