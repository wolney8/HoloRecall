import { describe, expect, it } from 'vitest';
import type { AnkiSourceSnapshot, CardContent, Deck } from './models';
import { derivedCardPresentation, resolveCardPresentation } from './card-presentation';

const card=(front:string,answer:string,guid='guid'):CardContent=>({id:`card-${guid}`,deckId:'lesson',kind:'text',front,answer,pronunciation:'',meaning:'',notes:'',tags:['italian'],revision:1,suspended:false,image:'asset:picture',art:{kind:'imported-media'},ankiSource:{kind:'anki',noteGuid:guid,noteId:guid,templateOrdinal:0,modelName:'Italian Visual Study',templateName:'Card 1',modelSignature:'anki-model-v1-test',sourceSnapshotId:'source',sourceTemplateId:'model:0',importedContentHash:'00000000'}});
const snapshot=(guid:string,fields:Record<string,string>):AnkiSourceSnapshot=>({id:'source',version:2,packageVariant:'legacy-anki2',sourceDecks:[{id:'source-deck',path:'Lesson 1'}],noteTypes:[{id:'model',name:'Italian Visual Study',cloze:false,fields:Object.keys(fields).map((name,ordinal)=>({id:String(ordinal),name,ordinal})),templates:[{id:'model:0',name:'Card 1',ordinal:0,question:'{{Prompt}}{{Question}}{{Context}}',answer:'{{FrontSide}}<hr id="answer">{{Italian}}'}],signature:'anki-model-v1-test'}],notes:[{id:guid,guid,noteTypeId:'model',fields,tags:['italian']}],cards:[{id:`source-${guid}`,noteId:guid,templateId:'model:0',templateOrdinal:0,sourceDeckId:'source-deck'}],media:[],contentHash:'snapshot'});

describe('language card presentation',()=>{
  it('keeps an image-first source front image-led without substituting the answer-side English meaning',()=>{
    const source=snapshot('ciao',{Prompt:'Recall from the illustration',Italian:'Ciao!',Meaning:'Hi / Hello / Bye — informal',Picture:'<div>CIAO</div>'}),value=card('Recall from the illustration','Ciao!','ciao');value.meaning='Hi / Hello / Bye — informal';
    value.ankiSource!.contentProvenance={front:'template',answer:'template',frontFields:['Picture','Prompt'],answerFields:['Italian','Meaning']};
    expect(resolveCardPresentation(value,[source],{id:'lesson',name:'Lesson',description:'',suspended:false})).toMatchObject({profile:'language',primary:'Recall the target-language expression shown by the illustration.',artRole:'instructional',effectiveArtPolicy:'image-first'});
  });

  it('uses the complete retained Anki front ahead of a stale machine-derived gloss',()=>{
    const front='Say the short informal greeting that also works when leaving.\nYou meet a friend.',source=snapshot('canonical',{Prompt:'Say the short informal greeting that also works when leaving.',Question:'You meet a friend.',Italian:'Ciao!',Meaning:'Hi / Hello / Bye — informal'}),value=card(front,'Ciao!','canonical');
    value.meaning='Hi / Hello / Bye — informal';
    value.presentation={profile:'language',recallTask:value.meaning,taskGuidance:'Say the answer aloud.',artRole:'supportive'};
    value.ankiSource!.contentProvenance={front:'template',answer:'template',frontFields:['Prompt','Question'],answerFields:['Italian','Meaning']};
    value.ankiSource!.conversion={converterVersion:5,templateEngineVersion:1,normalizerVersion:4,enrichmentVersion:2,mappingVersion:3,mappingPolicyVersion:3,mappingOrigin:'auto-inferred',mappingSignature:'anki-mapping-v1-test',fieldBaselines:{},fieldOrigins:{presentation:'derived'}};
    expect(resolveCardPresentation(value,[source]).primary).toBe(front);
  });

  it('preserves a locally authored imported Recall override',()=>{
    const source=snapshot('authored',{Prompt:'Source prompt',Question:'Source question',Italian:'Ciao!'}),value=card('Source prompt\nSource question','Ciao!','authored');
    value.presentation={profile:'language',recallTask:'My chosen Recall direction',artRole:'supportive'};
    value.ankiSource!.contentProvenance={front:'template',answer:'template',frontFields:['Prompt','Question'],answerFields:['Italian']};
    value.ankiSource!.conversion={converterVersion:5,templateEngineVersion:1,normalizerVersion:4,enrichmentVersion:2,mappingVersion:3,mappingPolicyVersion:3,mappingOrigin:'auto-inferred',mappingSignature:'anki-mapping-v1-test',fieldBaselines:{},fieldOrigins:{presentation:'local'}};
    expect(resolveCardPresentation(value,[source]).primary).toBe('My chosen Recall direction');
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

  it('rejects a stale explicit Recall task that is actually the Answer',()=>{
    const source=snapshot('stale',{Prompt:'Say the short informal greeting that also works when leaving.',Focus:'You meet a friend.',Task:'Say the answer aloud.',Italian:'Ciao!',Meaning:'Hi / Hello / Bye — informal'}),value=card('Say the short informal greeting that also works when leaving.\nYou meet a friend.','Ciao!','stale');
    value.presentation={profile:'language',recallTask:'Ciao!',taskGuidance:'Say the answer aloud.',artRole:'supportive'};
    expect(resolveCardPresentation(value,[source])).toMatchObject({primary:'You meet a friend.',taskGuidance:'Say the answer aloud.'});
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

describe('card chrome title fallback',()=>{
  const contextual=(fields:Record<string,string>,sources:string[])=>{const source=snapshot('context',fields),value=card(fields['Question']??'What is recalled?',fields['Italian']??'Answer','context');value.tags=[];value.ankiSource!.contentProvenance={front:'template',answer:'template',frontFields:sources,answerFields:['Italian'],blocks:sources.map(sourceName=>({side:'front' as const,source:sourceName,classification:'metadata' as const,destination:'Source metadata'}))};return{source,value};};
  it('uses explicit title, then one source-backed contextual value, then the current leaf deck',()=>{
    const first=contextual({Topic:'Cell biology',Question:'What makes ATP?',Italian:'Mitochondrion'},['Topic','Question']),deck:Deck={id:'lesson',name:'Science · Cells',description:'',suspended:false};first.value.presentation={title:'ENERGY ORGANELLES'};
    expect(resolveCardPresentation(first.value,[first.source],deck)).toMatchObject({chromeTitle:'ENERGY ORGANELLES',chromeTitleSource:'explicit'});
    delete first.value.presentation;expect(resolveCardPresentation(first.value,[first.source],deck)).toMatchObject({chromeTitle:'Cell biology',chromeTitleSource:'source-context'});
    const plain=contextual({Question:'What makes ATP?',Italian:'Mitochondrion'},['Question']);expect(resolveCardPresentation(plain.value,[plain.source],deck)).toMatchObject({chromeTitle:'Science · Cells',chromeTitleSource:'deck'});
    expect(resolveCardPresentation(plain.value,[plain.source],{...deck,name:'Cell organelles'}).chromeTitle).toBe('Cell organelles');
  });
  it('falls back to the deck rather than guessing between peers or leaking prompt, answer, capability or template identity',()=>{
    const ambiguous=contextual({Topic:'Cells',Category:'Biology',Question:'What makes ATP?',Italian:'Mitochondrion'},['Topic','Category','Question']),deck:Deck={id:'lesson',name:'Science',description:'',suspended:false};expect(resolveCardPresentation(ambiguous.value,[ambiguous.source],deck).chromeTitle).toBe('Science');
    for(const unsafe of ['Mitochondrion','What makes ATP?','Cloze','Card 1']){ambiguous.value.presentation={title:unsafe};expect(resolveCardPresentation(ambiguous.value,[ambiguous.source],deck).chromeTitle).toBe('Science');}
  });
});
