import { describe, expect, it } from 'vitest';
import { automaticMappingProfile, chooseMappingProfile, previewAnkiExport, projectSemanticMapping, writeAnkiTextExport } from './anki-interop';
import { safeContentBlocks } from './safe-content';
import type { CardContent, Deck } from './models';

const card:CardContent={id:'native-1',deckId:'deck-1',kind:'text',front:'Solve 7 × 8',answer:'56',pronunciation:'',meaning:'',secondary:'Multiplication fact',interpretation:'Seven groups of eight',notes:'',tags:['maths'],revision:1,suspended:false,details:[{label:'Method',content:'Seven groups of eight'}]};
const deck:Deck={id:'deck-1',name:'Maths',description:'',suspended:false};

describe('Anki semantic interoperability',()=>{
  it('creates a template-scoped subject-neutral mapping with confidence evidence',()=>{
    const profile=automaticMappingProfile({sourceSignature:'anki-model-v1-custom',modelName:'Custom',templateId:'7:0',templateName:'Forward',fields:['Situation','Question','Formula','Explanation','Source'],questionFields:['Situation','Question'],answerFields:['Formula','Explanation','Source'],fieldSamples:{Situation:['A triangle'],Question:['Find x'],Formula:['x = 42'],Explanation:['Worked note'],Source:['Book']}});
    expect(profile).toMatchObject({version:4,scope:'template',templateId:'7:0',origin:'auto-inferred'});
    expect(profile.fields).toMatchObject({Situation:'primary-prompt',Question:'primary-prompt',Formula:'safe-original-details',Explanation:'explanation',Source:'source-reference'});
    expect(profile.evidence?.Question).toMatchObject({confidence:'high'});
  });
  it('prefers a confirmed exact-template profile over model-wide and automatic profiles',()=>{
    const model=automaticMappingProfile({sourceSignature:'anki-model-v1-custom',modelName:'Custom',templateId:'*',templateName:'All',fields:['Front'],questionFields:['Front'],answerFields:[],fieldSamples:{}});model.templateId=undefined;model.scope='model';
    const exact={...model,id:'exact',templateId:'7:1',scope:'template' as const,origin:'user-confirmed' as const};
    expect(chooseMappingProfile([model,exact],model.sourceSignature,'7:1')?.id).toBe('exact');
  });
  it('repairs one template projection without changing card/source identity',()=>{
    const imported={...card,ankiSource:{kind:'anki' as const,noteGuid:'g',noteId:'1',templateOrdinal:0,modelName:'Language',templateName:'Card',modelSignature:'anki-model-v1-language',sourceTemplateId:'1:0',importedContentHash:'hash'}};
    const profile=automaticMappingProfile({sourceSignature:'anki-model-v1-language',modelName:'Language',templateId:'1:0',templateName:'Card',fields:['Prompt','Language','Italian','Pronunciation','Meaning','Rule'],questionFields:['Prompt'],answerFields:['Italian','Pronunciation','Meaning','Rule'],fieldSamples:{}});profile.origin='user-confirmed';profile.evidence={...profile.evidence,Prompt:{confidence:'confirmed',reason:'User choice'},Italian:{confidence:'confirmed',reason:'User choice'}};
    const projected=projectSemanticMapping(imported,{Prompt:'Say it',Language:'it',Italian:'Ciao!',Pronunciation:'CHOW',Meaning:'Hi',Rule:'Informal greeting'},profile);
    expect(projected).toMatchObject({id:card.id,front:'Say it',answer:'Ciao!',secondary:'CHOW',interpretation:'Hi',ankiSource:{noteGuid:'g'},details:expect.arrayContaining([expect.objectContaining({label:'Rule or pattern',content:'Informal greeting'})])});
    expect(projected.answer).not.toBe('it');
  });
  it('defines Basic and Extended v1 previews and an importable UTF-8 tab intermediate',()=>{
    const basic=previewAnkiExport(card,'basic'),extended=previewAnkiExport(card,'extended-v1');
    expect(basic).toMatchObject({noteType:'HoloRecall Basic',fields:{Front:'Solve 7 × 8',Back:'56'}});expect(basic.warnings[0]).toMatch(/Extended v1/);
    expect(extended.fields).toMatchObject({Prompt:'Solve 7 × 8',Answer:'56',Secondary:'Multiplication fact',Interpretation:'Seven groups of eight'});expect(extended.backTemplate).toContain('{{FrontSide}}<hr id="answer">');
    const text=new TextDecoder().decode(writeAnkiTextExport([card],[deck],'extended-v1'));expect(text).toContain('#separator:tab');expect(text).toContain('#notetype:HoloRecall Extended v1');expect(text).toContain('holorecall:native-1\tMaths');
  });
  it('retains term and pronunciation as separate lines in safe table cells',()=>{
    const blocks=safeContentBlocks('<table><tr><th>Italian + pronunciation</th><th>English</th></tr><tr><td><strong>io sono</strong><span class="mini-phon">EE-oh SOH-noh</span></td><td>I am</td></tr></table>');
    expect(blocks).toEqual([{type:'table',headers:['Italian + pronunciation','English'],rows:[['io sono\nEE-oh SOH-noh','I am']]}]);
  });
});
