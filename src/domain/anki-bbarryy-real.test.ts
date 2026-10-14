import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { analyseAnkiPackage,previewAnkiImport } from './anki';
import {createInitialState} from './study';
import {visibleOcclusionShapes} from './image-occlusion';
import {resolveCardPresentation} from './card-presentation';
import {cardCapabilities} from './card-capabilities';

const packagePath=process.env['HOLORECALL_BBARRYY_PACKAGE'];
beforeAll(()=>{const wasm=readFileSync('node_modules/sql.js/dist/sql-wasm-browser.wasm'),original=globalThis.fetch;globalThis.fetch=((input:RequestInfo|URL,init?:RequestInit)=>String(input).endsWith('/runtime/sql-wasm-browser.wasm')?Promise.resolve(new Response(wasm,{headers:{'content-type':'application/wasm'}})):original(input,init)) as typeof fetch;});

describe.skipIf(!packagePath||!existsSync(packagePath))('bBarryy anatomy thorax real-package acceptance',()=>{
  it('imports every safe card and explains the three source-incomplete cards without false Image Occlusion review',async()=>{
    const bytes=readFileSync(packagePath!);expect(createHash('sha256').update(bytes).digest('hex')).toBe('ac1afdf3dd7e69f3de43fd8907b7a9f999556d4d970b39fe59fe076a151a55f1');
    const analysis=await analyseAnkiPackage(new Uint8Array(bytes),'bBarryy_anatomy_thorax_pt_1.apkg');
    expect(analysis).toMatchObject({sourceNotes:29,generatedCards:61,compatibility:{tierA:58,tierB:0,tierC:0,tierD:3}});
    expect(analysis.cards).toHaveLength(58);expect(analysis.cards.filter(card=>card.imageOcclusion)).toHaveLength(26);
    const occlusionCards=analysis.cards.filter(card=>card.imageOcclusion);expect(occlusionCards.filter(card=>card.imageOcclusion?.mode==='hide-all-guess-one')).toHaveLength(4);expect(occlusionCards.filter(card=>card.imageOcclusion?.mode==='hide-one-guess-one')).toHaveLength(22);
    expect(occlusionCards.every(card=>{const content=card.imageOcclusion!,active=content.shapes.filter(shape=>shape.groupId===content.activeGroupId).length,recall=visibleOcclusionShapes(content,false),answer=visibleOcclusionShapes(content,true);return content.mode==='hide-all-guess-one'?recall.length===content.shapes.length&&answer.length===content.shapes.length-active:recall.length===active&&answer.length===0;})).toBe(true);
    const basic=analysis.cards.find(card=>card.front.toLocaleLowerCase()==='what is the accessory reproductive organ?');expect(basic).toMatchObject({answer:'breast'});expect(basic?.art?.kind==='generated-text-art'&&basic.art.title.toLocaleLowerCase().includes(basic.front.toLocaleLowerCase())).toBe(false);
    expect(analysis.cards.filter(card=>card.imageOcclusion).every(card=>card.answer===''&&card.image===card.backImage)).toBe(true);
    expect(analysis.cards.some(card=>card.ankiSource?.modelName==='Basic'&&!card.image&&!!card.backImage)).toBe(true);
    expect(analysis.cards.some(card=>card.ankiSource?.modelName==='Cloze'&&!card.image&&!!card.backImage)).toBe(true);
    expect(analysis.conversionProfiles.every(profile=>profile.status==='automatic'&&!profile.audit?.findings.length&&profile.audit?.sourceElementCount===profile.audit?.accountedElementCount)).toBe(true);
    expect(analysis.conversionProfiles.some(profile=>profile.behaviour==='image-occlusion'&&profile.presentationPolicy==='image-occlusion-task-first')).toBe(true);
    const occlusion=occlusionCards[0]!,deck=analysis.decks.find(item=>item.id===occlusion.deckId)!;expect(resolveCardPresentation(occlusion,[analysis.sourceSnapshot],deck)).toMatchObject({chromeTitle:deck.name,chromeTitleSource:'deck'});expect(resolveCardPresentation(occlusion,[analysis.sourceSnapshot],deck).chromeTitle).not.toBe('Image Occlusion');expect(cardCapabilities(occlusion)).toContain('image-occlusion');
    expect(analysis.cards.filter(card=>card.ankiSource?.modelName==='Cloze').every(card=>{const currentDeck=analysis.decks.find(item=>item.id===card.deckId)!;return resolveCardPresentation(card,[analysis.sourceSnapshot],currentDeck).chromeTitle!=='Cloze'&&cardCapabilities(card).includes('cloze');})).toBe(true);
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
