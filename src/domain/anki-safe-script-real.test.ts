import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {beforeAll,describe,expect,it} from 'vitest';
import {analyseAnkiPackage,analyseAnkiSourceSnapshot} from './anki';

const packagePath=process.env['HOLORECALL_LESSON1_V51_PACKAGE'];
beforeAll(()=>{const wasm=readFileSync('node_modules/sql.js/dist/sql-wasm-browser.wasm'),original=globalThis.fetch;globalThis.fetch=((input:RequestInfo|URL,init?:RequestInit)=>String(input).endsWith('/runtime/sql-wasm-browser.wasm')?Promise.resolve(new Response(wasm,{headers:{'content-type':'application/wasm'}})):original(input,init)) as typeof fetch;});

describe.skipIf(!packagePath||!existsSync(packagePath))('Lesson 1 v5.1 safe-script package',()=>{
  it('omits its presentation-only script without losing learning semantics or guessing orphan media',async()=>{
    const bytes=readFileSync(packagePath!);expect(createHash('sha256').update(bytes).digest('hex')).toBe('8e8323d2f00a835f9d4d994b7480bbe807f95c7686ad1bb57514172f3cb5a81e');
    const analysis=await analyseAnkiPackage(new Uint8Array(bytes),'Italian - Lesson 1 - Introductions - v5.1 Case Corrected.apkg');
    expect(analysis).toMatchObject({sourceNotes:44,generatedCards:44,compatibility:{tierA:0,tierB:44,tierC:0,tierD:0},conversion:{normal:0,simplified:44,excluded:0,unsafe:0},content:{lessonGroups:5,subdecks:0,referencedMedia:0,unreferencedPackageAssets:19,bundledMedia:0}});
    expect(analysis.decks).toHaveLength(5);expect(analysis.cards).toHaveLength(44);expect(analysis.assets).toEqual([]);expect(analysis.sourceSnapshot.media).toEqual([]);
    expect(analysis.issues).toEqual([expect.objectContaining({severity:'info',kind:'simplification',message:expect.stringContaining('Presentation-only Anki template script was omitted safely'),count:44})]);
    expect(analysis.conversionProfiles).toHaveLength(2);expect(analysis.conversionProfiles.every(profile=>profile.status==='automatic'&&!profile.audit?.findings.length&&profile.audit?.sourceElementCount===profile.audit?.accountedElementCount)).toBe(true);
    expect(analysis.cards.every(card=>card.ankiSource?.contentProvenance?.templateSimplifications?.includes('presentation-script'))).toBe(true);
    expect(JSON.stringify(analysis.sourceSnapshot)).toMatch(/<script/i);expect(JSON.stringify(analysis.cards)).not.toMatch(/<script\b|javascript:|\son[a-z]+\s*=/i);

    const visual=analysis.cards.find(card=>card.answer==='Piacere!')!;
    expect(visual).toMatchObject({answer:'Piacere!',pronunciation:'pyah-CHEH-reh',meaning:'Nice to meet you / It’s a pleasure',art:{kind:'source-visual-panel',badge:'L1',title:'Greetings & farewells',subtitle:'Choose the expression that fits.'}});
    expect(visual.choices).toEqual(['Ciao','Buongiorno','Buonasera','Piacere']);expect(visual.details?.map(detail=>detail.label)).toEqual(expect.arrayContaining(['Literal','Use / examples','Pattern / sound','Reference']));
    const practice=analysis.cards.find(card=>card.ankiSource?.modelName==='Italian Course Practice v5 - Lesson 1')!;
    expect(practice.front).toBeTruthy();expect(practice.answer).toBeTruthy();expect(practice.details?.length).toBeGreaterThan(0);

    const retained=analyseAnkiSourceSnapshot(analysis.sourceSnapshot);
    expect(retained).toMatchObject({sourceNotes:44,generatedCards:44,compatibility:{tierA:0,tierB:44,tierC:0,tierD:0}});
    expect(retained.cards.map(card=>card.id)).toEqual(analysis.cards.map(card=>card.id));expect(retained.cards.map(card=>card.front)).toEqual(analysis.cards.map(card=>card.front));expect(retained.cards.map(card=>card.answer)).toEqual(analysis.cards.map(card=>card.answer));
  },30_000);
});
