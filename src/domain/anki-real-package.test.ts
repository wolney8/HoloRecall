import { existsSync, readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { analyseAnkiPackage } from './anki';

const packagePath=process.env['HOLORECALL_REAL_ANKI_PACKAGE'];
beforeAll(()=>{const wasm=readFileSync('node_modules/sql.js/dist/sql-wasm-browser.wasm'),original=globalThis.fetch;globalThis.fetch=((input:RequestInfo|URL,init?:RequestInit)=>String(input).endsWith('/runtime/sql-wasm-browser.wasm')?Promise.resolve(new Response(wasm,{headers:{'content-type':'application/wasm'}})):original(input,init)) as typeof fetch;});

describe.skipIf(!packagePath||!existsSync(packagePath))('real Anki interoperability acceptance',()=>{
  it('reviews the real Italian templates without manual mapping or semantic loss',async()=>{
    const bytes=new Uint8Array(readFileSync(packagePath!)),analysis=await analyseAnkiPackage(bytes,'Italian_Lessons_1-3_Clear_Prompts_v3_UPDATE.apkg');
    expect(analysis.sourceNotes).toBe(254);expect(analysis.generatedCards).toBe(254);expect(analysis.compatibility.tierC).toBe(0);expect(analysis.compatibility.tierD).toBe(0);
    expect(analysis.effectiveMappings.length).toBeGreaterThan(0);expect(analysis.effectiveMappings.every(mapping=>!!mapping.templateId&&mapping.scope==='template')).toBe(true);
    expect(analysis.conversionProfiles).toEqual([expect.objectContaining({version:3,status:'automatic',concerns:[],semanticVariants:[expect.objectContaining({label:'Explicit answer variant',predicate:{all:[{field:'Answer',operator:'non-empty'}]},overrides:{primaryAnswerField:'Answer'}})],audit:expect.objectContaining({sourceElementCount:7374,accountedElementCount:7374,auditedCardCount:254,findings:[],semanticVariants:[expect.objectContaining({matchedCardCount:64,findings:[]})]})})]);
    expect(analysis.cards.every(card=>!!card.front.trim()&&!!card.answer.trim()&&card.answer!=='it')).toBe(true);
    expect(analysis.cards.some(card=>card.details?.some(detail=>detail.blocks?.some(block=>block.type==='table')))).toBe(true);
    expect(analysis.cards.some(card=>card.choices?.length)).toBe(true);
    const soundGroup=analysis.cards.find(card=>card.front.includes('spaghetti'));expect(soundGroup).toMatchObject({front:expect.stringContaining('spaghetti'),answer:'GHE · hard G',ankiSource:{contentProvenance:{semanticVariantId:expect.stringContaining('answer-present')}}});expect(soundGroup?.answerLabel).toBeUndefined();const sourceNote=analysis.sourceSnapshot.notes.find(note=>note.guid===soundGroup?.ankiSource?.noteGuid);expect(sourceNote?.fields['Answer']).toBe('GHE · hard G');
    const template=analysis.sourceSnapshot.noteTypes[0]!.templates[0]!;expect(template.question).not.toContain('{{Answer}}');expect(template.answer).toContain('{{#Answer}}<div class="answer-tag">{{Answer}}</div>{{/Answer}}');
    const variantCards=analysis.cards.filter(card=>card.ankiSource?.contentProvenance?.semanticVariantId),defaultCards=analysis.cards.filter(card=>!card.ankiSource?.contentProvenance?.semanticVariantId);expect(variantCards).toHaveLength(64);expect(defaultCards).toHaveLength(190);expect(defaultCards.every(card=>card.answer===analysis.sourceSnapshot.notes.find(note=>note.guid===card.ankiSource?.noteGuid)?.fields['Italian'])).toBe(true);expect(variantCards.filter(card=>card.ankiSource?.contentProvenance?.blocks?.some(block=>block.source==='Italian'&&block.classification==='duplicate-frontside'))).toHaveLength(41);expect(variantCards.filter(card=>card.details?.some(detail=>detail.label==='Additional answer content'))).toHaveLength(23);
    const retainedSource=JSON.stringify(analysis.sourceSnapshot).toLocaleLowerCase();expect(retainedSource).not.toContain('day of the week');expect(retainedSource).not.toContain('thursday');expect(retainedSource).not.toContain('gioved');
    expect(JSON.stringify(analysis.cards)).not.toMatch(/onclick=|javascript:/i);
  },30_000);
});
