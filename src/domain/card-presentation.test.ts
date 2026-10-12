import { describe, expect, it } from 'vitest';
import type { AnkiSourceSnapshot, CardContent, Deck } from './models';
import { derivedCardPresentation, resolveCardPresentation } from './card-presentation';

const card=(front:string,answer:string,guid='guid'):CardContent=>({id:`card-${guid}`,deckId:'lesson',kind:'text',front,answer,pronunciation:'',meaning:'',notes:'',tags:['italian'],revision:1,suspended:false,image:'asset:picture',art:{kind:'imported-media'},ankiSource:{kind:'anki',noteGuid:guid,noteId:guid,templateOrdinal:0,modelName:'Italian Visual Study',templateName:'Card 1',modelSignature:'anki-model-v1-test',sourceSnapshotId:'source',sourceTemplateId:'model:0',importedContentHash:'00000000'}});
const snapshot=(guid:string,fields:Record<string,string>):AnkiSourceSnapshot=>({id:'source',version:2,packageVariant:'legacy-anki2',sourceDecks:[{id:'source-deck',path:'Lesson 1'}],noteTypes:[{id:'model',name:'Italian Visual Study',cloze:false,fields:Object.keys(fields).map((name,ordinal)=>({id:String(ordinal),name,ordinal})),templates:[{id:'model:0',name:'Card 1',ordinal:0,question:'{{Prompt}}{{Question}}{{Context}}',answer:'{{FrontSide}}<hr id="answer">{{Italian}}'}],signature:'anki-model-v1-test'}],notes:[{id:guid,guid,noteTypeId:'model',fields,tags:['italian']}],cards:[{id:`source-${guid}`,noteId:guid,templateId:'model:0',templateOrdinal:0,sourceDeckId:'source-deck'}],media:[],contentHash:'snapshot'});

describe('language card presentation',()=>{
  it('replaces a vague illustration label with the retained English retrieval cue without leaking Italian',()=>{
    const source=snapshot('ciao',{Prompt:'Recall from the illustration',Italian:'Ciao!',Meaning:'Hi / Hello / Bye — informal',Picture:'<div>CIAO</div>'}),value=card('Recall from the illustration','Ciao!','ciao');value.meaning='Hi / Hello / Bye — informal';
    expect(resolveCardPresentation(value,[source],{id:'lesson',name:'Lesson',description:'',suspended:false})).toMatchObject({profile:'language',primary:'Hi / Hello / Bye — informal',artRole:'instructional',effectiveArtPolicy:'image-first'});
  });

  it('shows the actual incomplete phrase and preserves contextual guidance',()=>{
    const source=snapshot('gap',{Prompt:'Talking ABOUT a woman. Complete the phrase.',Question:'Lei si &lt;b&gt;<span>____</span>&lt;/b&gt; Giulia.',Context:'The name belongs to a fictional person.',Italian:'Lei si chiama Giulia.',Meaning:'She is called Giulia.'}),value=card('Talking ABOUT a woman. Complete the phrase.','Lei si chiama Giulia.','gap');
    const result=resolveCardPresentation(value,[source]);
    expect(result.primary).toBe('Lei si ____ Giulia.');
    expect(result.situationContext).toBe('The name belongs to a fictional person.');
    expect(result.primary).not.toContain('chiama');
  });

  it('uses question, context and hint from a template-rich verb card',()=>{
    const source=snapshot('verb',{Prompt:'Use venire to say:',Question:'I come',Context:'One person · pronoun + verb',Hint:'Use venire to say: I come.',Italian:'io vengo',Meaning:'I come'}),value=card('Use venire to say:\nI come\nOne person · pronoun + verb','io vengo','verb');
    expect(resolveCardPresentation(value,[source])).toMatchObject({primary:'I come',situationContext:'One person · pronoun + verb',taskGuidance:'Use venire to say:',hint:'Use venire to say: I come.'});
  });

  it('honours deck and per-card art policy without changing source art',()=>{
    const source=snapshot('name',{Prompt:'Speaking TO a friend or peer',Focus:'You are called…',Task:'Say it in Italian',Italian:'Tu ti chiami…',English:'You are called / named… — informal'}),value=card('Speaking TO a friend or peer','Tu ti chiami…','name'),deck:Deck={id:'lesson',name:'Lesson',description:'',suspended:false,studyArtPolicy:'text-first'};
    expect(resolveCardPresentation(value,[source],deck).effectiveArtPolicy).toBe('text-first');
    value.presentation={...derivedCardPresentation(value,[source]),studyArtPolicy:'image-first',artRole:'decorative'};
    expect(resolveCardPresentation(value,[source],deck).effectiveArtPolicy).toBe('image-first');
    expect(value.image).toBe('asset:picture');
  });

  it('promotes retained Focus and Task fields on the real asking-a-friend schema',()=>{
    const source=snapshot('name',{Prompt:'Speaking TO a friend or peer',Focus:'You are called…',Task:'Say it in Italian',Italian:'Tu ti chiami…',English:'You are called / named… — informal'}),value=card('Speaking TO a friend or peer','Tu ti chiami…','name');
    expect(resolveCardPresentation(value,[source])).toMatchObject({primary:'You are called…',situationContext:'Speaking TO a friend or peer',taskGuidance:'Say it in Italian',artRole:'supportive',effectiveArtPolicy:'text-first'});
  });

  it('keeps material register context alongside a stronger Focus prompt',()=>{
    const source=snapshot('formal',{Prompt:'A formal interaction with an unfamiliar adult',Focus:'Which “you”?',Task:'Say it in Italian',Italian:'Lei',Pronunciation:'LAY',English:'You — formal'}),value=card('A formal interaction with an unfamiliar adult','Lei','formal');
    const result=resolveCardPresentation(value,[source]);
    expect(result).toMatchObject({primary:'Which “you”?',situationContext:'A formal interaction with an unfamiliar adult',taskGuidance:'Say it in Italian'});
    expect(JSON.stringify(result)).not.toContain('Lei');
  });

  it('promotes the visible incomplete phrase rather than its vague instruction',()=>{
    const source=snapshot('pattern',{Prompt:'Fill the gap, then say the whole phrase',Focus:'Io ___ Marco.',Task:'Complete the pattern',Italian:'sono',English:'I am Marco.'}),value=card('Fill the gap, then say the whole phrase','sono','pattern');
    expect(resolveCardPresentation(value,[source])).toMatchObject({primary:'Io ___ Marco.',taskGuidance:'Complete the pattern',effectiveArtPolicy:'text-first'});
  });

  it('leaves a non-language subject on its generic hierarchy',()=>{
    const value={...card('Solve 7 × 8','56'),tags:['maths'],image:undefined,art:undefined,ankiSource:undefined};
    expect(resolveCardPresentation(value,[])).toMatchObject({profile:'general',primary:'Solve 7 × 8',effectiveArtPolicy:'text-first'});
  });
});
