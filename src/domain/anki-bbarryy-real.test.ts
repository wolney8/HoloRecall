import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { analyseAnkiPackage,previewAnkiImport } from './anki';
import {createInitialState} from './study';

const packagePath=process.env['HOLORECALL_BBARRYY_PACKAGE'];
beforeAll(()=>{const wasm=readFileSync('node_modules/sql.js/dist/sql-wasm-browser.wasm'),original=globalThis.fetch;globalThis.fetch=((input:RequestInfo|URL,init?:RequestInit)=>String(input).endsWith('/runtime/sql-wasm-browser.wasm')?Promise.resolve(new Response(wasm,{headers:{'content-type':'application/wasm'}})):original(input,init)) as typeof fetch;});

describe.skipIf(!packagePath||!existsSync(packagePath))('bBarryy anatomy thorax real-package acceptance',()=>{
  it('imports every safe card and explains the three source-incomplete cards without false Image Occlusion review',async()=>{
    const bytes=readFileSync(packagePath!);expect(createHash('sha256').update(bytes).digest('hex')).toBe('ac1afdf3dd7e69f3de43fd8907b7a9f999556d4d970b39fe59fe076a151a55f1');
    const analysis=await analyseAnkiPackage(new Uint8Array(bytes),'bBarryy_anatomy_thorax_pt_1.apkg');
    expect(analysis).toMatchObject({sourceNotes:29,generatedCards:61,compatibility:{tierA:58,tierB:0,tierC:0,tierD:3}});
    expect(analysis.cards).toHaveLength(58);expect(analysis.cards.filter(card=>card.imageOcclusion)).toHaveLength(26);
    const basic=analysis.cards.find(card=>card.front.toLocaleLowerCase()==='what is the accessory reproductive organ?');expect(basic).toMatchObject({answer:'breast'});expect(basic?.art?.kind==='generated-text-art'&&basic.art.title.toLocaleLowerCase().includes(basic.front.toLocaleLowerCase())).toBe(false);
    expect(analysis.cards.filter(card=>card.imageOcclusion).every(card=>card.answer===''&&card.image===card.backImage)).toBe(true);
    expect(analysis.conversionProfiles.some(profile=>profile.behaviour==='image-occlusion'&&profile.presentationPolicy==='image-occlusion-task-first')).toBe(true);
    const assets=new Set(analysis.assets.map(asset=>`asset:${asset.id}`));const unresolved=analysis.cards.flatMap(card=>[card.image,card.backImage,...card.frontAudio??[],...card.backAudio??[]]).filter((ref):ref is string=>!!ref&&!assets.has(ref));expect(unresolved).toEqual([]);
    const preview=previewAnkiImport(analysis,createInitialState([],[]));const bundled=new Set(preview.bundle.assets.map(asset=>asset.id));expect(analysis.sourceSnapshot.media.every(media=>bundled.has(media.assetId))).toBe(true);
    expect(analysis.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({message:'Generated card has no answer after safe conversion',count:2}),
      expect.objectContaining({message:'Image Occlusion card has no source image',count:1}),
    ]));
    expect(analysis.issues.some(issue=>/Advanced Image Occlusion variant/.test(issue.message))).toBe(false);
    expect(analysis.compatibility.tierA+analysis.compatibility.tierB+analysis.compatibility.tierC+analysis.compatibility.tierD).toBe(analysis.generatedCards);
  },30_000);
});
