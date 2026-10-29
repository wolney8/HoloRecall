import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { SEED_CARDS, SEED_DECKS } from '../app/seed';
import { createInitialState } from './study';
import { bundleTables, contentFromState, inspectZip, makePortableBundle, makePreview, parseTables, readContentFile, writePortableZip, writeWorkbook } from './exchange';
import type { ContentBundle } from './exchange';
import type { LocalAsset, State } from './models';
import { exportBackup, parseBackup } from './backup';
import { acceptScheduledReview } from '../test/scheduled-review';
import { CARD_COMPOSITIONS } from './design-system';

const state = (): State => createInitialState(SEED_DECKS, SEED_CARDS);
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aamkAAAAASUVORK5CYII=';
const asset: LocalAsset = { id: 'test-art', name: 'test.png', mime: 'image/png', dataUrl: `data:image/png;base64,${png}`, width: 1, height: 1, credit: 'Artist', source: '', license: 'Original' };
const audioAsset: LocalAsset = { id: 'test-audio', name: 'test.mp3', mime: 'audio/mpeg', dataUrl: 'data:audio/mpeg;base64,SUQzBAAAAAA=', credit: 'Speaker', source: '', license: 'Original' };
function sample(): ContentBundle {
  return {
    decks: [{ id: 'exchange-course', name: 'Italiano',description:'Course',suspended:false,coverImage:'asset:test-art'},{ id: 'exchange-italian', name: 'Caffè e città', description: 'Prima riga\nSeconda riga', suspended: false, designSetId: 'warm-frame',parentId:'exchange-course',studyArtPolicy:'auto' }],
    cards: [{ ...SEED_CARDS[1], id: 'exchange-caffe', deckId: 'exchange-italian', front: 'Di’ “il caffè”\ncon l’articolo.', notes: '=1+1\nLiteral text stays literal.',secondary:'Coffee noun',interpretation:'A common café order.', rarity: 'secret-rare', finish: 'aurora', image: 'asset:test-art', backImage: 'asset:test-art', frontAudio: ['asset:test-audio'], backAudio: ['asset:test-audio'], designSetId: 'warm-frame', tags: ['caffè', 'Due parole'],siblingGroupId:'exchange-caffe-note',art:{kind:'source-visual-panel',badge:'CAFFÈ',title:'At the bar',subtitle:'Choose the phrase'},choices:['il caffè','la caffè'],answerLabel:'Noun phrase',details:[{label:'Literal',content:'the coffee',blocks:[{type:'pairs',rows:[{term:'il',description:'definite article'},{term:'caffè',description:'noun'}]}]}],presentation:{profile:'language',recallTask:'Order the drink',recallGuidance:['Use the definite article'],artRole:'supportive',studyArtPolicy:'text-first'} }],
    designs: [{ id: 'warm-frame', name: 'Warm frame', background: 'asset:test-art', texture: 'asset:test-art', frames: { 'secret-rare': 'asset:test-art' }, finish: 'metallic', finishes: { 'secret-rare': 'starfield' }, layout: 'ornate',composition:'framed-art',layoutPolicy:'fixed',palette:{primary:'#704214',secondary:'#402008',surface:'#1a1008',onSurface:'#ffffff',accent:'#ffd080'},artwork:{focalX:35,focalY:55,fit:'cover',treatment:'embedded',mask:'rounded-window',vignette:.2,textureBlend:.3,emboss:.1,depth:.15},rarityVariants:{'secret-rare':{finish:'starfield',frame:'asset:test-art',accent:'#ffe080',effectIntensity:.8}},studyArtPolicy:'image-first', backgroundFit: 'cover', backgroundPositionX: 25, backgroundPositionY: 60, frameFit: 'contain', credit: 'Artist', source: 'Local', license: 'Original' }],
    assets: [asset, audioAsset],
  };
}

function sourceSample():ContentBundle{const bundle=sample(),sourceId='anki-source-test';bundle.decks[0]!.ankiSource={kind:'anki',sourceDeckId:'10',sourcePath:'Italiano',importedContentHash:'1234abcd'};bundle.cards[0]!.ankiSource={kind:'anki',noteGuid:'guid',noteId:'100',templateOrdinal:0,modelName:'Basic',templateName:'Card 1',modelSignature:'anki-model-v1-abcd',sourceSnapshotId:sourceId,sourceTemplateId:'template-0',importedContentHash:'89abcdef'};bundle.ankiSources=[{id:sourceId,version:1,packageVariant:'legacy-anki2',sourceDecks:[{id:'10',path:'Italiano'}],noteTypes:[{id:'model-1',name:'Basic',cloze:false,fields:[{id:'field-front',name:'Front',ordinal:0},{id:'field-back',name:'Back',ordinal:1}],templates:[{id:'template-0',name:'Card 1',ordinal:0,question:'{{Front}}',answer:'{{FrontSide}}<hr id=answer>{{Back}}'}],signature:'anki-model-v1-abcd'}],notes:[{id:'100',guid:'guid',noteTypeId:'model-1',fields:{Front:'Question',Back:'Answer'},tags:[]}],cards:[{id:bundle.cards[0]!.id,noteId:'100',templateId:'template-0',templateOrdinal:0,sourceDeckId:'10'}],media:[],contentHash:'anki-source-snapshot-v1-1234abcd'}];return bundle;}

async function replacePortableDesigns(bytes:Uint8Array,change:(designs:ContentBundle['designs'])=>ContentBundle['designs']):Promise<Uint8Array>{
  const zip=await JSZip.loadAsync(bytes),designs=change(JSON.parse(await zip.file('designs.json')!.async('string'))),payload=Buffer.from(JSON.stringify(designs,null,2));
  zip.file('designs.json',payload);const manifest=JSON.parse(await zip.file('manifest.json')!.async('string')),entry=manifest.files.find((item:{path:string})=>item.path==='designs.json');entry.byteLength=payload.byteLength;entry.sha256=`sha256:${createHash('sha256').update(payload).digest('hex')}`;zip.file('manifest.json',JSON.stringify(manifest,null,2));return zip.generateAsync({type:'uint8array'});
}

describe('versioned content exchange', () => {
  it('ships valid downloadable workbooks and a self-contained sixteen-illustration example', async () => {
    const blank = await readContentFile(new Uint8Array(await readFile('public/downloads/holorecall-blank-v5.xlsx')), 'blank.xlsx', state());
    expect(blank.errors).toEqual([]); expect(blank.bundle.cards).toHaveLength(0);
    const example = await readContentFile(new Uint8Array(await readFile('public/downloads/holorecall-italian-v5.xlsx')), 'example.xlsx', state());
    expect(example.errors).toEqual([]); expect(example.bundle.cards).toHaveLength(16); expect(example.bundle.cards.every(card => card.image?.startsWith('/art/'))).toBe(true);
    const portable = await readContentFile(new Uint8Array(await readFile('public/downloads/holorecall-italian-v5.zip')), 'portable.zip', state());
    expect(portable.errors).toEqual([]); expect(portable.bundle.assets).toHaveLength(16); expect(portable.bundle.cards.every(card => card.image?.startsWith('asset:'))).toBe(true);
  });
  it.each(['v1', 'v2','v3','v4'])('keeps published %s content packages readable', async version => {
    const workbook = await readContentFile(new Uint8Array(await readFile(`public/downloads/holorecall-italian-${version}.xlsx`)), `${version}.xlsx`, state());
    const portable = await readContentFile(new Uint8Array(await readFile(`public/downloads/holorecall-italian-${version}.zip`)), `${version}.zip`, state());
    expect(workbook.errors).toEqual([]); expect(workbook.bundle.cards).toHaveLength(16);
    expect(portable.errors).toEqual([]); expect(portable.bundle.cards).toHaveLength(16);
  });
  it('keeps a manifest-free format-v10 portable ZIP readable and rejects a future workbook version',async()=>{const original=sample(),workbook=new ExcelJS.Workbook();await workbook.xlsx.load(await writeWorkbook(original) as never);workbook.getWorksheet('Metadata')!.getCell('B2').value='10';const zip=new JSZip();zip.file('deck.xlsx',await workbook.xlsx.writeBuffer());zip.file('designs.json',JSON.stringify(original.designs,null,2));zip.file('media/test-art.png',Buffer.from(png,'base64'));zip.file('media/test-audio.mp3',Buffer.from('SUQzBAAAAAA=','base64'));const legacy=await readContentFile(await zip.generateAsync({type:'uint8array'}),'v10.zip',state());expect(legacy.errors).toEqual([]);expect(legacy.bundle.cards).toEqual(original.cards);workbook.getWorksheet('Metadata')!.getCell('B2').value='12';const future=await readContentFile(new Uint8Array(await workbook.xlsx.writeBuffer()),'future.xlsx',state());expect(future.errors[0]).toContain('supported format_version');});
  it('exports only content and identifies unchanged cards by stable IDs, ignoring revision', async () => {
    const data = state(); const bundle = contentFromState(data); bundle.cards[0].revision += 4;
    const preview = await readContentFile(await writeWorkbook(bundle), 'deck.xlsx', data);
    expect(preview.errors).toEqual([]); expect(preview.duplicateCards).toHaveLength(16); expect(preview.updatedCards).toEqual([]);
    expect(Object.keys(preview.bundle).sort()).toEqual(['assets', 'cards', 'decks', 'designs']);
  });
  it('round trips accented, multiline, literal formula-looking text, rarity, design settings and image bytes through ZIP', async () => {
    const original = sample(); const preview = await readContentFile(await writePortableZip(original), 'deck.zip', state());
    expect(preview.errors).toEqual([]); expect(preview.newCards).toEqual(['exchange-caffe']);
    expect(preview.bundle.cards[0]).toEqual(original.cards[0]); expect(preview.bundle.designs).toEqual(original.designs);
    expect(preview.bundle.assets).toEqual(original.assets); expect(preview.bundle.decks).toEqual(original.decks);
    expect(preview.bundle.decks.find(deck=>deck.id==='exchange-italian')?.parentId).toBe('exchange-course');expect(preview.bundle.cards[0].siblingGroupId).toBe('exchange-caffe-note');
  });
  it('canonicalizes only semantically empty optional Design Set maps across ZIP and XLSX',async()=>{
    const original=sample(),design=original.designs[0]!;design.frames={};design.finishes={};design.rarityVariants={};
    const bytes=await writePortableZip(original,{exportedAt:new Date(0),packageId:'empty-design-maps'}),zip=await JSZip.loadAsync(bytes),definitions=JSON.parse(await zip.file('designs.json')!.async('string'));
    expect(definitions[0]).not.toHaveProperty('frames');expect(definitions[0]).not.toHaveProperty('finishes');expect(definitions[0]).not.toHaveProperty('rarityVariants');
    let preview=await readContentFile(bytes,'empty-design-maps.zip',state());expect(preview.errors).toEqual([]);expect(preview.bundle.designs[0]).not.toHaveProperty('frames');expect(preview.bundle.designs[0]).not.toHaveProperty('finishes');expect(preview.bundle.designs[0]).not.toHaveProperty('rarityVariants');
    const legacy=await replacePortableDesigns(bytes,items=>items.map(item=>({...item,frames:{},finishes:{},rarityVariants:{common:{}}})));preview=await readContentFile(legacy,'legacy-empty-design-maps.zip',state());expect(preview.errors).toEqual([]);expect(preview.bundle.designs[0]).not.toHaveProperty('rarityVariants');
    const tables=bundleTables(original);tables.Designs[0]![19]='{}';tables.Designs[0]![22]=JSON.stringify({rarityVariants:{}});const parsed=parseTables(tables,state(),original.assets);expect(parsed.designs[0]).not.toHaveProperty('frames');expect(parsed.designs[0]).not.toHaveProperty('finishes');expect(parsed.designs[0]).not.toHaveProperty('rarityVariants');
    const backupState=state();backupState.designs=[structuredClone(design)];backupState.assets=structuredClone(original.assets);expect(parseBackup(exportBackup(backupState,new Date(0))).designs[0]).toMatchObject({frames:{},finishes:{},rarityVariants:{}});
  });
  it.each([
    ['identity',(design:ContentBundle['designs'][number])=>({...design,id:'different-design'})],
    ['composition',(design:ContentBundle['designs'][number])=>({...design,composition:'photo-focus' as const})],
    ['palette',(design:ContentBundle['designs'][number])=>({...design,palette:{...design.palette!,primary:'#123456'}})],
    ['non-empty rarity finish',(design:ContentBundle['designs'][number])=>({...design,finishes:{...design.finishes,rare:'aurora' as const}})],
    ['frame reference',(design:ContentBundle['designs'][number])=>({...design,frame:'asset:different-frame'})],
    ['artwork',(design:ContentBundle['designs'][number])=>({...design,artwork:{...design.artwork!,focalX:80}})],
  ])('rejects a genuine %s mismatch after manifest integrity succeeds',async(_,change)=>{
    const bytes=await replacePortableDesigns(await writePortableZip(sample(),{exportedAt:new Date(0),packageId:'design-mismatch'}),designs=>designs.map(change));const preview=await readContentFile(bytes,'design-mismatch.zip',state());expect(preview.errors).toEqual(['designs.json must exactly match the workbook Designs sheet. No executable design content is allowed.']);
  });
  it('preserves every existing composition identifier through ZIP, XLSX and full backup without a format change', async () => {
    const original=sample();
    original.designs=CARD_COMPOSITIONS.map((composition,index)=>({...original.designs[0]!,id:`composition-${index}`,name:composition,composition}));
    original.cards[0]!.designSetId=original.designs[0]!.id;original.decks[1]!.designSetId=original.designs[0]!.id;
    const target=state();target.assets=structuredClone(original.assets);
    const portable=await readContentFile(await writePortableZip(original,{exportedAt:new Date(0),packageId:'composition-matrix'}),'compositions.zip',target);
    const workbook=await readContentFile(await writeWorkbook(original),'compositions.xlsx',target);
    expect(portable.errors).toEqual([]);expect(workbook.errors).toEqual([]);
    expect(portable.bundle.designs.map(design=>design.composition)).toEqual(CARD_COMPOSITIONS);
    expect(workbook.bundle.designs.map(design=>design.composition)).toEqual(CARD_COMPOSITIONS);
    const backupState=state();backupState.designs=structuredClone(original.designs);backupState.assets=structuredClone(original.assets);
    expect(parseBackup(exportBackup(backupState,new Date(0))).designs.map(design=>design.composition)).toEqual(CARD_COMPOSITIONS);
  });
  it('preserves parent and child identities through XLSX hierarchy round trip',async()=>{const original=sample(),target=state();target.assets=structuredClone(original.assets);const preview=await readContentFile(await writeWorkbook(original),'hierarchy.xlsx',target);expect(preview.errors).toEqual([]);expect(preview.bundle.decks.map(deck=>[deck.id,deck.parentId])).toEqual(original.decks.map(deck=>[deck.id,deck.parentId]));expect(preview.bundle.cards.map(card=>[card.id,card.deckId])).toEqual(original.cards.map(card=>[card.id,card.deckId]));});
  it('round trips inert Anki source identities, dependencies, subject presentation, Design Sets and deck covers',async()=>{const original=sourceSample();original.ankiMappings=[{id:'mapping',version:4,name:'Basic',sourceSignature:'anki-model-v1-abcd',modelName:'Basic',templateId:'template-0',fields:{Front:'front',Back:'answer'},origin:'user-confirmed'}];original.ankiConversionProfiles=[{id:'conversion',version:1,sourceSignature:'anki-model-v1-abcd',modelName:'Basic',templateId:'template-0',templateName:'Card 1',mappingProfileId:'mapping',behaviour:'basic',presentationPolicy:'text-first',status:'user-approved',concerns:[],origin:'user-confirmed'}];const preview=await readContentFile(await writePortableZip(original,{exportedAt:new Date(0),packageId:'portable-test'}),'source.zip',state());expect(preview.errors).toEqual([]);expect(preview.bundle.decks[0]!.ankiSource).toEqual(original.decks[0]!.ankiSource);expect(preview.bundle.decks[0]!.coverImage).toBe('asset:test-art');expect(preview.bundle.cards[0]).toMatchObject({secondary:'Coffee noun',interpretation:'A common café order.',ankiSource:original.cards[0]!.ankiSource,art:original.cards[0]!.art,choices:original.cards[0]!.choices,answerLabel:'Noun phrase',details:original.cards[0]!.details,presentation:original.cards[0]!.presentation});expect(preview.bundle.decks[1]!.studyArtPolicy).toBe('auto');expect(preview.bundle.designs[0]).toEqual(original.designs[0]);expect(preview.bundle.ankiSources).toEqual(original.ankiSources);expect(preview.bundle.ankiMappings).toEqual(original.ankiMappings);expect(preview.bundle.ankiConversionProfiles).toEqual(original.ankiConversionProfiles);expect(preview.manifest).toMatchObject({format:'holorecall-portable-content',formatVersion:11,packageId:'portable-test',counts:{decks:2,cards:1,designSets:1,media:2,ankiSources:1,mappings:1,conversionProfiles:1}});});
  it('round trips normalized Image Occlusion geometry and mode in format v10',async()=>{const original=sample();original.cards[0]!.imageOcclusion={version:1,source:'holorecall-native',mode:'hide-one-guess-one',activeGroupId:'mask-a',imageWidth:1,imageHeight:1,header:'Find it',backExtra:'Extra',comments:'author only',imageDescription:'Diagram',shapes:[{id:'shape-a',groupId:'mask-a',type:'rect',x:.1,y:.2,width:.3,height:.25},{id:'shape-b',groupId:'mask-b',type:'polygon',points:[{x:.5,y:.5},{x:.8,y:.5},{x:.7,y:.8}]}]};const preview=await readContentFile(await writePortableZip(original),'occlusion.zip',state());expect(preview.errors).toEqual([]);expect(preview.bundle.cards[0]!.imageOcclusion).toEqual(original.cards[0]!.imageOcclusion);});
  it('keeps a format-v8 content table readable without presentation preferences',()=>{const tables=bundleTables(sample());tables.Metadata[0]![1]='8';tables.Decks=tables.Decks.map(row=>row.slice(0,8));tables.Cards=tables.Cards.map(row=>row.slice(0,26));const bundle=parseTables(tables,state(),[asset,audioAsset]);expect(bundle.decks[1]!.studyArtPolicy).toBeUndefined();expect(bundle.cards[0]!.presentation).toBeUndefined();expect(bundle.designs[0]!.studyArtPolicy).toBe('image-first');});
  it('keeps a format-v7 content table readable with inherited design semantics',()=>{const tables=bundleTables(sample());tables.Metadata[0]![1]='7';tables.Cards=tables.Cards.map(row=>row.slice(0,24));tables.Designs=tables.Designs.map(row=>row.slice(0,22));const bundle=parseTables(tables,state(),[asset,audioAsset]);expect(bundle.cards[0]!.secondary).toBeUndefined();expect(bundle.cards[0]!.interpretation).toBeUndefined();expect(bundle.designs[0]!.composition).toBeUndefined();expect(bundle.cards[0]!.designSetId).toBe('warm-frame');});
  it('preserves repeated tags already permitted by the card editor', async () => {
    const data = state(); const bundle = contentFromState(data); bundle.cards[0].tags = ['Verbs', 'Verbs'];
    const preview = await readContentFile(await writeWorkbook(bundle), 'deck.xlsx', data);
    expect(preview.errors).toEqual([]); expect(preview.bundle.cards[0].tags).toEqual(['Verbs', 'Verbs']);
  });
  it('rejects missing workbook media while allowing already-local references', async () => {
    const bytes = await writeWorkbook(sample());
    expect((await readContentFile(bytes, 'deck.xlsx', state())).errors[0]).toContain('missing');
    const local = state(); local.assets = [asset, audioAsset];
    expect((await readContentFile(bytes, 'deck.xlsx', local)).errors).toEqual([]);
  });
  it('rejects formula cells and defined names without executing them', async () => {
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await writeWorkbook(contentFromState(state())) as never);
    workbook.getWorksheet('Cards')!.getCell('E2').value = { formula: 'HYPERLINK("https://invalid.example", "answer")', result: 'answer' };
    expect((await readContentFile(new Uint8Array(await workbook.xlsx.writeBuffer()), 'deck.xlsx', state())).errors[0]).toContain('Formula');
    workbook.getWorksheet('Cards')!.getCell('E2').value = 'answer'; workbook.definedNames.add('Cards!$E$2', 'Untrusted');
    expect((await readContentFile(new Uint8Array(await workbook.xlsx.writeBuffer()), 'deck.xlsx', state())).errors[0]).toContain('defined names');
  });
  it('explicitly rejects embedded worksheet images', async () => {
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await writeWorkbook(contentFromState(state())) as never);
    const imageId = workbook.addImage({ base64: asset.dataUrl, extension: 'png' }); workbook.getWorksheet('Cards')!.addImage(imageId, 'A1:B2');
    expect((await readContentFile(new Uint8Array(await workbook.xlsx.writeBuffer()), 'deck.xlsx', state())).errors[0]).toContain('Embedded worksheet images');
  });
  it.each([
    ['rarity', (tables: ReturnType<typeof bundleTables>) => { tables.Cards[0][9] = 'legendary'; }, 'unknown rarity'],
    ['card type', (tables: ReturnType<typeof bundleTables>) => { tables.Cards[0][2] = 'executable'; }, 'card_type'],
    ['missing deck', (tables: ReturnType<typeof bundleTables>) => { tables.Cards[0][1] = 'missing-deck'; }, 'missing deck'],
    ['missing answer', (tables: ReturnType<typeof bundleTables>) => { tables.Cards[0][4] = ''; }, 'required'],
    ['duplicate IDs', (tables: ReturnType<typeof bundleTables>) => { tables.Cards[1][0] = tables.Cards[0][0]; }, 'duplicate ID'],
    ['URL reference', (tables: ReturnType<typeof bundleTables>) => { tables.Cards[0][11] = 'https://example.org/image.png'; }, 'invalid media reference'],
    ['unknown bundled asset', (tables: ReturnType<typeof bundleTables>) => { tables.Cards[0][11] = '/art/missing.svg'; }, 'missing or unsupported'],
    ['malformed tags', (tables: ReturnType<typeof bundleTables>) => { tables.Cards[0][8] = 'one,two'; }, 'JSON array'],
  ])('rejects %s before applying', (_, alter, message) => {
    const tables = bundleTables(contentFromState(state())); alter(tables);
    expect(() => parseTables(tables, state())).toThrow(message);
  });
  it('blocks mismatched or executable design definitions in ZIP', async () => {
    const zip = await JSZip.loadAsync(await writePortableZip(sample())); zip.file('designs.json', '[{"script":"alert(1)"}]');
    expect((await readContentFile(await zip.generateAsync({ type: 'uint8array' }), 'test.zip', state())).errors[0]).toContain('integrity check failed');
  });
  it('blocks active SVG and mismatched image signatures in a portable ZIP', async () => {
    const zip = await JSZip.loadAsync(await writePortableZip(sample())); zip.file('media/test-art.png', '<svg onload="alert(1)"></svg>');
    expect((await readContentFile(await zip.generateAsync({ type: 'uint8array' }), 'test.zip', state())).errors[0]).toContain('integrity check failed');
  });
  it('rejects archive traversal paths and oversized expanded entries before decompression', async () => {
    const zip = new JSZip(); zip.file('../escape.txt', 'bad');
    expect(() => inspectZip(Uint8Array.from([]))).toThrow('Invalid ZIP');
    const bytes = await zip.generateAsync({ type: 'uint8array' }); expect(() => inspectZip(bytes)).toThrow('unsafe');
    const ordinary = new JSZip(); ordinary.file('file', 'data'); const expanded = await ordinary.generateAsync({ type: 'uint8array' });
    const view = new DataView(expanded.buffer); for (let index = 0; index < expanded.length - 46; index++) if (view.getUint32(index, true) === 0x02014b50) { view.setUint32(index + 24, 100 * 1024 * 1024, true); break; }
    expect(() => inspectZip(expanded)).toThrow('expanded limit');
  });
  it('keeps new/update/duplicate previews distinct and bound to inspected state version', () => {
    const data = state(); data.version = 12; const bundle = contentFromState(data); bundle.cards[0].answer = 'updated answer'; bundle.cards.push({ ...bundle.cards[1], id: 'new-card' });
    const preview = makePreview(bundle, data); expect(preview.expectedVersion).toBe(12); expect(preview.updatedCards).toEqual([SEED_CARDS[0].id]); expect(preview.newCards).toEqual(['new-card']); expect(preview.duplicateCards).toHaveLength(15);
  });
  it('rasterizes each bundled source once and reuses durable asset references', async () => {
    const original = contentFromState(state()); original.cards = [original.cards[0], { ...original.cards[0], id: 'second', backImage: original.cards[0].image }];
    const calls: string[] = []; const portable = await makePortableBundle(original, async ref => { calls.push(ref); return { dataUrl: asset.dataUrl, width: 1, height: 1 }; });
    expect(calls).toHaveLength(1); expect(portable.assets).toHaveLength(1); expect(portable.cards[0].image).toBe('asset:bundled-limone'); expect(portable.cards[1].backImage).toBe('asset:bundled-limone'); expect(original.cards[0].image).toBe('/art/limone.svg');
  });
  it('exports a recursive branch with only its required designs, media and source dependencies',()=>{const data=state(),branch=sourceSample();data.decks.push(...branch.decks,{id:'other',name:'Other',description:'',suspended:true});data.cards.push(...branch.cards,{...branch.cards[0]!,id:'other-card',deckId:'other',ankiSource:undefined,designSetId:undefined,image:undefined,backImage:undefined,frontAudio:undefined,backAudio:undefined});data.designs.push(...branch.designs);data.assets.push(...branch.assets);data.ankiSources.push(...branch.ankiSources!);data.ankiMappings.push({id:'mapping',version:4,name:'Basic',sourceSignature:'anki-model-v1-abcd',modelName:'Basic',templateId:'template-0',fields:{Front:'front',Back:'answer'}});data.ankiConversionProfiles.push({id:'conversion',version:1,sourceSignature:'anki-model-v1-abcd',modelName:'Basic',templateId:'template-0',templateName:'Card 1',mappingProfileId:'mapping',behaviour:'basic',presentationPolicy:'text-first',status:'automatic',concerns:[],origin:'auto-inferred'});const bundle=contentFromState(data,['exchange-course']);expect(bundle.decks.map(deck=>deck.id)).toEqual(['exchange-course','exchange-italian']);expect(bundle.cards.map(card=>card.id)).toEqual(['exchange-caffe']);expect(bundle.designs.map(design=>design.id)).toEqual(['warm-frame']);expect(bundle.assets.map(item=>item.id).sort()).toEqual(['test-art','test-audio']);expect(bundle.ankiSources?.map(source=>source.id)).toEqual(['anki-source-test']);expect(bundle.ankiMappings?.map(mapping=>mapping.id)).toEqual(['mapping']);expect(bundle.ankiConversionProfiles?.map(profile=>profile.id)).toEqual(['conversion']);expect(bundle.cards[0]).toMatchObject({suspended:false,archived:undefined});expect(bundle.decks[0]).toMatchObject({suspended:false,archived:undefined,studyPresetId:undefined});});
  it('turns an exported subdeck into a self-contained root while preserving inherited presentation',()=>{const data=state(),branch=sourceSample();branch.decks[0]!.designSetId='warm-frame';branch.decks[0]!.studyArtPolicy='image-first';branch.decks[1]!.designSetId=undefined;branch.decks[1]!.studyArtPolicy=undefined;data.decks.push(...branch.decks);data.cards.push(...branch.cards);data.designs.push(...branch.designs);data.assets.push(...branch.assets);data.ankiSources.push(...branch.ankiSources!);const bundle=contentFromState(data,['exchange-italian']);expect(bundle.decks).toEqual([expect.objectContaining({id:'exchange-italian',parentId:undefined,designSetId:'warm-frame',studyArtPolicy:'image-first'})]);expect(bundle.designs.map(design=>design.id)).toEqual(['warm-frame']);});
  it('excludes learner state while full backup retains it',()=>{const data=acceptScheduledReview(state(),{id:'review',cardId:SEED_CARDS[0]!.id,sessionId:'session',rating:3,now:new Date('2026-10-20T12:00:00Z')}),bundle=contentFromState(data);expect(Object.keys(bundle).sort()).toEqual(['assets','cards','decks','designs']);expect(JSON.stringify(bundle)).not.toContain('review');const backup=parseBackup(exportBackup(data,new Date(0)));expect(backup.events).toEqual(data.events);expect(backup.states).toEqual(data.states);expect(backup.rewardEvents).toEqual(data.rewardEvents);});
  it('detects a missing manifest, corrupt payload and duplicate package without duplicating IDs',async()=>{const bytes=await writePortableZip(sample(),{exportedAt:new Date(0),packageId:'portable-integrity'}),zip=await JSZip.loadAsync(bytes);zip.remove('manifest.json');let preview=await readContentFile(await zip.generateAsync({type:'uint8array'}),'missing.zip',state());expect(preview.errors[0]).toContain('requires manifest');const existing=state();existing.decks.push(...sample().decks);existing.cards.push(...sample().cards);existing.designs.push(...sample().designs);existing.assets.push(...sample().assets);preview=await readContentFile(bytes,'same.zip',existing);expect(preview.errors).toEqual([]);expect(preview.newCards).toEqual([]);expect(preview.updatedCards).toEqual([]);expect(preview.duplicateCards).toEqual(['exchange-caffe']);expect(preview.warnings).toContain('This package is already present; importing it again would make no content changes.');});
});
