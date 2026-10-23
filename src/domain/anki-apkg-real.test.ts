import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { analyseAnkiPackage, previewAnkiImport } from './anki';
import { planAnkiApkg, writeAnkiApkg } from './anki-apkg';
import { createInitialState } from './study';

const italian='/Users/will_work/Downloads/Italian_Lessons_1-3_Clear_Prompts_v3_UPDATE.apkg';
const anatomy='/Users/will_work/Downloads/bBarryy_anatomy_thorax_pt_1.apkg';
const python='.runtime/anki-fixture-env/bin/python';
const available=existsSync(python);
beforeAll(()=>{const wasm=readFileSync('node_modules/sql.js/dist/sql-wasm-browser.wasm'),original=globalThis.fetch;globalThis.fetch=((input:RequestInfo|URL,init?:RequestInit)=>String(input).endsWith('/runtime/sql-wasm-browser.wasm')?Promise.resolve(new Response(wasm,{headers:{'content-type':'application/wasm'}})):original(input,init)) as typeof fetch;});
const validate=(bytes:Uint8Array,label:string)=>{const path=join(tmpdir(),`holorecall-${label}-${crypto.randomUUID()}.apkg`);writeFileSync(path,bytes);return JSON.parse(execFileSync('/usr/bin/arch',['-arm64',python,'scripts/validate-anki-apkg.py',path],{encoding:'utf8',maxBuffer:30_000_000}));};

describe.skipIf(!available||!existsSync(italian))('official Anki Italian APKG dogfood',()=>{
  it('imports all 254 Lesson 1–3 cards with semantic fields and clean scheduling',async()=>{const analysis=await analyseAnkiPackage(new Uint8Array(readFileSync(italian)),'Italian_Lessons_1-3_Clear_Prompts_v3_UPDATE.apkg'),bundle=previewAnkiImport(analysis,createInitialState([],[])).bundle;const plan=await planAnkiApkg(bundle.cards,bundle.decks,bundle.assets,'','extended-v1',true),result=validate(await writeAnkiApkg(plan,{modifiedAt:new Date('2026-10-23T12:00:00Z')}),'italian');expect(plan.cards).toHaveLength(254);expect(result).toMatchObject({foundNotes:254,newNotes:254,revlogCount:0});expect(result.decks.join(' ')).toMatch(/Lesson 1/i);expect(result.decks.join(' ')).toMatch(/Lesson 2/i);expect(result.decks.join(' ')).toMatch(/Lesson 3/i);for(const answer of['Ciao!','Buongiorno!','Buonasera!','Come stai?'])expect(result.notes.some((note:{fields:Record<string,string>})=>note.fields['Answer']?.includes(answer))).toBe(true);expect(result.cards.every((card:{reps:number;lapses:number;interval:number})=>!card.reps&&!card.lapses&&!card.interval)).toBe(true);},120_000);
});

describe.skipIf(!available||!existsSync(anatomy))('official Anki anatomy APKG dogfood',()=>{
  it('imports every safe card and media with disclosed static Image Occlusion fallbacks',async()=>{const analysis=await analyseAnkiPackage(new Uint8Array(readFileSync(anatomy)),'bBarryy_anatomy_thorax_pt_1.apkg'),bundle=previewAnkiImport(analysis,createInitialState([],[])).bundle,root=bundle.decks.find(deck=>!deck.parentId)!;const plan=await planAnkiApkg(bundle.cards,bundle.decks,bundle.assets,root.id,'extended-v1',true),result=validate(await writeAnkiApkg(plan,{modifiedAt:new Date('2026-10-23T12:00:00Z')}),'anatomy');expect(plan.cards).toHaveLength(58);expect(plan.imageOcclusionFallbackIds).toHaveLength(26);expect(result).toMatchObject({foundNotes:58,newNotes:58,revlogCount:0});expect(result.cards).toHaveLength(58);expect(result.media.length).toBe(plan.media.length);expect(result.notes.filter((note:{fields:Record<string,string>})=>note.fields['ImageOcclusion']).length).toBe(26);},120_000);
});
