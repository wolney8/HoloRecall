import type { AnkiFieldTarget, AnkiMappingConfidence, AnkiMappingPreset, CardContent, CardDetail, Deck } from './models';
import { plainSafeContentText, safeContentBlocks } from './safe-content';

export const ANKI_SEMANTIC_CONTRACT_VERSION = 1;
export type AnkiExportProfile = 'basic' | 'extended-v1';
export interface SemanticRoleDefinition { id: AnkiFieldTarget; group: 'Recall'|'Answer'|'Support'|'Other'; label: string }
export interface MappingProfileInput { sourceSignature:string; modelName:string; templateId:string; templateName:string; fields:string[]; questionFields:string[]; answerFields:string[]; fieldSamples:Record<string,string[]> }
export interface AnkiExportPreview { profile:AnkiExportProfile; noteType:string; identity:string; fields:Record<string,string>; frontTemplate:string; backTemplate:string; renderedFront:string; renderedBack:string; warnings:string[] }

export const SEMANTIC_ROLES:SemanticRoleDefinition[]=[
  {id:'situation-context',group:'Recall',label:'Context'}, {id:'primary-prompt',group:'Recall',label:'Question / prompt'}, {id:'task-guidance',group:'Recall',label:'Guidance'}, {id:'hint',group:'Recall',label:'Hint'}, {id:'choices',group:'Recall',label:'Choices'}, {id:'instructional-artwork',group:'Recall',label:'Artwork'},
  {id:'primary-answer',group:'Answer',label:'Primary answer'}, {id:'secondary-cue',group:'Answer',label:'Secondary'}, {id:'concise-example',group:'Answer',label:'Example'}, {id:'concise-interpretation',group:'Answer',label:'Interpretation'},
  {id:'explanation',group:'Support',label:'Explanation'}, {id:'rule-pattern',group:'Support',label:'Rule / pattern'}, {id:'method',group:'Support',label:'Method'}, {id:'worked-steps',group:'Support',label:'Worked steps'}, {id:'reference-table',group:'Support',label:'Table / reference'}, {id:'usage-examples',group:'Support',label:'Examples'}, {id:'memory-aid',group:'Support',label:'Memory'}, {id:'source-reference',group:'Support',label:'Source / reference'}, {id:'additional-detail',group:'Support',label:'Other details'}, {id:'safe-original-details',group:'Support',label:'Original details fallback'},
  {id:'media',group:'Other',label:'Media'}, {id:'decorative',group:'Other',label:'Decorative'}, {id:'duplicate-frontside',group:'Other',label:'Duplicate FrontSide'}, {id:'hidden',group:'Other',label:'Hide'}, {id:'ignored',group:'Other',label:'Ignore / metadata'},
];

const legacyRole=(role:AnkiFieldTarget):AnkiFieldTarget=>({front:'primary-prompt',answer:'primary-answer',pronunciation:'secondary-cue',meaning:'concise-interpretation',notes:'additional-detail','front-media':'instructional-artwork','back-media':'media',ignore:'ignored'} as Partial<Record<AnkiFieldTarget,AnkiFieldTarget>>)[role]??role;
const clean=(value:string):string=>plainSafeContentText(value).trim();
const evidence=(confidence:AnkiMappingConfidence,reason:string)=>({confidence,reason});

export function mappingProfileKey(mapping:Pick<AnkiMappingPreset,'sourceSignature'|'templateId'|'scope'>):string{return `${mapping.sourceSignature}::${mapping.templateId??'*'}::${mapping.scope??'model'}`;}
export function chooseMappingProfile(profiles:AnkiMappingPreset[],sourceSignature:string,templateId:string):AnkiMappingPreset|undefined{
  return profiles.find(item=>item.sourceSignature===sourceSignature&&item.templateId===templateId&&item.origin==='user-confirmed')
    ??profiles.find(item=>item.sourceSignature===sourceSignature&&!item.templateId&&item.origin==='user-confirmed')
    ??profiles.find(item=>item.sourceSignature===sourceSignature&&item.templateId===templateId)
    ??profiles.find(item=>item.sourceSignature===sourceSignature&&!item.templateId);
}

function inferRole(field:string,input:MappingProfileInput):{role:AnkiFieldTarget;confidence:AnkiMappingConfidence;reason:string}{
  const name=field.trim(),key=name.toLocaleLowerCase().replace(/[\s_-]+/g,''),q=input.questionFields.includes(field),a=input.answerFields.includes(field);
  const exact:Record<string,[AnkiFieldTarget,AnkiMappingConfidence,string]>={
    context:['situation-context','high','Field name identifies situational context.'],prompt:['primary-prompt','high','Field name and front-template use identify the recall prompt.'],question:['primary-prompt','high','Question is referenced by the front template.'],focus:['primary-prompt','high','Focus is referenced by the front template.'],task:['task-guidance','high','Task is an instruction on the front.'],guidance:['task-guidance','high','Field name identifies task guidance.'],hint:['hint','high','Field name identifies a hint.'],options:['choices','high','Options are rendered as inert choices.'],choices:['choices','high','Field name identifies choices.'],picture:['instructional-artwork','medium','Picture is referenced on the front; its instructional role remains editable.'],image:['instructional-artwork','medium','Image is referenced on the front; its instructional role remains editable.'],
    answer:['primary-answer','medium','Answer is referenced by the answer template; confirm when a more specific target field exists.'],italian:['primary-answer','high','Template use identifies this as the target answer in the current profile.'],response:['primary-answer','high','Field name identifies the response.'],solution:['primary-answer','high','Field name identifies the solution.'],pronunciation:['secondary-cue','high','Field name identifies a secondary pronunciation cue.'],reading:['secondary-cue','high','Field name identifies a reading cue.'],meaning:['concise-interpretation','high','Field name identifies concise interpretation.'],english:['concise-interpretation','medium','English is answer-side interpretation in this template.'],example:['concise-example','high','Field name identifies an example.'],examples:['usage-examples','high','Field name identifies examples.'],usage:['usage-examples','high','Field name identifies usage examples.'],literal:['explanation','high','Literal construction is supporting explanation.'],explanation:['explanation','high','Field name identifies supporting explanation.'],rule:['rule-pattern','high','Field name identifies a rule.'],pattern:['rule-pattern','high','Field name identifies a pattern.'],soundnote:['rule-pattern','medium','Sound note is supporting pattern material.'],method:['method','high','Field name identifies method.'],steps:['worked-steps','high','Field name identifies worked steps.'],roles:['explanation','medium','Roles are supporting explanation.'],memory:['memory-aid','high','Field name identifies a memory aid.'],source:['source-reference','high','Field name identifies provenance/reference.'],sources:['source-reference','high','Field name identifies provenance/reference.'],reference:['source-reference','high','Field name identifies reference material.'],extra:['additional-detail','high','Field name identifies additional detail.'],language:['ignored','high','Language metadata is not learning content by itself.'],lesson:['ignored','high','Lesson is source metadata.'],topic:['ignored','high','Topic is source metadata.'],kind:['ignored','high','Kind is source metadata.'],key:['ignored','high','Key is source identity metadata.'],stablekey:['ignored','high','Stable key is source identity metadata.'],adaptation:['ignored','medium','Adaptation is source provenance metadata.']
  };
  const known=exact[key];if(known){let [role,confidence,reason]=known;if(role==='primary-answer'&&!a){role='ignored';confidence='low';reason='Name suggests an answer, but this card template does not reference it on the answer side.';}return{role,confidence,reason};}
  if(/pronunciation|phonetic|reading/.test(key))return{role:'secondary-cue',confidence:'high',reason:'Field name identifies a secondary pronunciation/reading cue.'};
  if(/meaning|translation|definition/.test(key))return{role:'concise-interpretation',confidence:'high',reason:'Field name identifies concise interpretation.'};
  if(/example|usage|everydayuse/.test(key))return{role:'usage-examples',confidence:'medium',reason:'Field name identifies supporting usage/examples.'};
  if(/source|reference/.test(key))return{role:'source-reference',confidence:'medium',reason:'Field name identifies source/reference material.'};
  if(q&&!a)return{role:'primary-prompt',confidence:'medium',reason:'Referenced only by the front template.'};
  if(a&&!q)return{role:'safe-original-details',confidence:'low',reason:'Answer-side content is preserved losslessly pending review.'};
  if(q&&a)return{role:'safe-original-details',confidence:'low',reason:'Referenced on both sides; retained pending review.'};
  return{role:'ignored',confidence:'medium',reason:'Not referenced by this card template; retained as source metadata.'};
}

export function automaticMappingProfile(input:MappingProfileInput):AnkiMappingPreset{
  const fields:Record<string,AnkiFieldTarget>={},profileEvidence:NonNullable<AnkiMappingPreset['evidence']>={};
  for(const field of input.fields){const inferred=inferRole(field,input);fields[field]=inferred.role;profileEvidence[field]=evidence(inferred.confidence,inferred.reason);}
  return{id:`mapping-${input.sourceSignature.slice(14)}-${input.templateId.replace(/[^a-z0-9]/gi,'-')}`,version:4,name:`${input.modelName} · ${input.templateName}`,sourceSignature:input.sourceSignature,modelName:input.modelName,templateId:input.templateId,templateName:input.templateName,scope:'template',fields,evidence:profileEvidence,policyVersion:4,origin:'auto-inferred'};
}

const supportLabel:Partial<Record<AnkiFieldTarget,string>>={'explanation':'Explanation','rule-pattern':'Rule or pattern','method':'Method','worked-steps':'Worked steps','reference-table':'Reference table','usage-examples':'Usage / examples','memory-aid':'Memory aid','source-reference':'Reference','additional-detail':'Additional detail','safe-original-details':'Original card details'};
const valuesFor=(mapping:AnkiMappingPreset,fields:Record<string,string>,role:AnkiFieldTarget):Array<{name:string;raw:string;text:string}>=>Object.entries(mapping.fields).filter(([,target])=>legacyRole(target)===role).map(([name])=>({name,raw:fields[name]??'',text:clean(fields[name]??'')})).filter(item=>item.text);

/** Applies only the presentation projection. Source snapshots and learning state are untouched. */
export function projectSemanticMapping(base:CardContent,fields:Record<string,string>,mapping:AnkiMappingPreset):CardContent{
  const confirmed=mapping.origin==='user-confirmed',next=structuredClone(base),one=(role:AnkiFieldTarget)=>valuesFor(mapping,fields,role)[0]?.text??'',confirmedValue=(role:AnkiFieldTarget)=>valuesFor(mapping,fields,role).find(item=>mapping.evidence?.[item.name]?.confidence==='confirmed')?.text??'';
  if(confirmed&&confirmedValue('primary-prompt'))next.front=confirmedValue('primary-prompt');
  if(confirmed&&confirmedValue('primary-answer'))next.answer=confirmedValue('primary-answer');
  const secondary=one('secondary-cue'),interpretation=one('concise-interpretation');if(secondary){next.secondary=secondary;next.pronunciation=secondary;}if(interpretation){next.interpretation=interpretation;next.meaning=interpretation;}
  const presentation={...(next.presentation??{})},context=one('situation-context'),guidance=one('task-guidance'),hint=one('hint');if(context)presentation.situationContext=context;if(guidance)presentation.taskGuidance=guidance;if(hint)presentation.hint=hint;if(confirmed&&confirmedValue('primary-prompt'))presentation.recallTask=confirmedValue('primary-prompt');next.presentation=presentation;
  const choices=valuesFor(mapping,fields,'choices').flatMap(item=>[...item.raw.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button\s*>/gi)].map(match=>clean(match[1]??'')).filter(Boolean).length?[...item.raw.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button\s*>/gi)].map(match=>clean(match[1]??'')).filter(Boolean):item.text.split(/\n|\|/).map(value=>value.trim()).filter(Boolean));if(choices.length)next.choices=[...new Set(choices)].slice(0,24);
  const mappedDetails:CardDetail[]=[];for(const [role,label] of Object.entries(supportLabel) as [AnkiFieldTarget,string][])for(const item of valuesFor(mapping,fields,role)){const blocks=safeContentBlocks(item.raw);mappedDetails.push({label,content:item.text,...(blocks.length>1||blocks.some(block=>block.type!=='paragraph')?{blocks}:{})});}
  if(one('concise-example'))mappedDetails.unshift({label:'Example',content:one('concise-example')});
  next.details=[...(next.details??[]).filter(detail=>!mappedDetails.some(item=>item.label===detail.label||item.content===detail.content)),...mappedDetails.filter((detail,index,all)=>all.findIndex(item=>item.label===detail.label&&item.content===detail.content)===index)];
  return next;
}

const htmlEscape=(value:string):string=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const htmlText=(value?:string):string=>htmlEscape(value??'').replace(/\n/g,'<br>');
const supportHtml=(card:CardContent):string=>(card.details??[]).map(detail=>`<section><h3>${htmlEscape(detail.label)}</h3><div>${htmlText(detail.content)}</div></section>`).join('');
export function ankiExportIdentity(card:CardContent):string{return card.ankiSource?`anki:${card.ankiSource.modelSignature}:${card.ankiSource.noteGuid}:${card.ankiSource.templateOrdinal}`:`holorecall:${card.id}`;}
export function previewAnkiExport(card:CardContent,profile:AnkiExportProfile):AnkiExportPreview{
  const context=card.presentation?.situationContext??'',guidance=card.presentation?.taskGuidance??'',hint=card.presentation?.hint??'',secondary=card.secondary||card.pronunciation,interpretation=card.interpretation||card.meaning,choices=(card.choices??[]).join('\n'),support=supportHtml(card),source=card.ankiSource?`${card.ankiSource.modelName} / ${card.ankiSource.templateName}`:'HoloRecall';
  if(profile==='basic'){const rich=!!(context||guidance||hint||choices||secondary||interpretation||support||card.image||card.frontAudio?.length||card.backAudio?.length);const fields={Front:htmlText(card.front),Back:htmlText(card.answer)};return{profile,noteType:'HoloRecall Basic',identity:ankiExportIdentity(card),fields,frontTemplate:'{{Front}}',backTemplate:'{{FrontSide}}<hr id="answer">{{Back}}',renderedFront:fields.Front,renderedBack:`${fields.Front}<hr id="answer">${fields.Back}`,warnings:rich?['Basic exports only Prompt and Answer. Choose Extended v1 to retain context, secondary cues, choices, support and media references.']:[]};}
  const fields={Prompt:htmlText(card.front),Context:htmlText(context),Guidance:htmlText(guidance),Hint:htmlText(hint),Choices:htmlText(choices),Answer:htmlText(card.answer),Secondary:htmlText(secondary),Example:'',Interpretation:htmlText(interpretation),Support:support,Media:htmlText([card.image,...card.frontAudio??[],...card.backAudio??[]].filter(Boolean).join('\n')),Source:htmlText(source),Tags:htmlText(card.tags.join(' '))};
  const frontTemplate='{{#Context}}<div class="context">{{Context}}</div>{{/Context}}<div class="prompt">{{Prompt}}</div>{{#Guidance}}<div class="guidance">{{Guidance}}</div>{{/Guidance}}{{#Hint}}<div class="hint">{{Hint}}</div>{{/Hint}}{{#Choices}}<div class="choices">{{Choices}}</div>{{/Choices}}',backTemplate='{{FrontSide}}<hr id="answer"><div class="answer">{{Answer}}</div>{{#Secondary}}<div class="secondary">{{Secondary}}</div>{{/Secondary}}{{#Example}}<div class="example">{{Example}}</div>{{/Example}}{{#Interpretation}}<div class="interpretation">{{Interpretation}}</div>{{/Interpretation}}{{#Support}}<div class="support">{{Support}}</div>{{/Support}}';
  return{profile,noteType:'HoloRecall Extended v1',identity:ankiExportIdentity(card),fields,frontTemplate,backTemplate,renderedFront:[fields.Context,fields.Prompt,fields.Guidance,fields.Hint,fields.Choices].filter(Boolean).join('<br>'),renderedBack:[fields.Answer,fields.Secondary,fields.Interpretation,fields.Support].filter(Boolean).join('<br>'),warnings:[]};
}

export function writeAnkiTextExport(cards:CardContent[],decks:Deck[],profile:AnkiExportProfile):Uint8Array{
  const previews=cards.map(card=>previewAnkiExport(card,profile)),columns=profile==='basic'?['Identity','Deck','Front','Back','Tags']:['Identity','Deck','Prompt','Context','Guidance','Hint','Choices','Answer','Secondary','Example','Interpretation','Support','Media','Source','Tags'];
  const deckName=(id:string)=>decks.find(deck=>deck.id===id)?.name??'HoloRecall';const cell=(value:string)=>value.replace(/\t/g,' ').replace(/\r?\n/g,'<br>');
  const rows=previews.map((preview,index)=>{const card=cards[index]!,record:Record<string,string>={Identity:preview.identity,Deck:deckName(card.deckId),Tags:card.tags.join(' '),...preview.fields};return columns.map(column=>cell(record[column]??'')).join('\t');});
  const header=['#separator:tab','#html:true',`#notetype:${profile==='basic'?'HoloRecall Basic':'HoloRecall Extended v1'}`,'#deck column:2',`#tags column:${columns.length}`,`#columns:${columns.join('\t')}`];return new TextEncoder().encode([...header,...rows].join('\n'));
}
