import type {AnkiConversionProfile,AnkiSemanticVariant,AnkiSourceNote,AnkiSourceNoteType,AnkiSourceSnapshot,AnkiSourceTemplate,CardContent} from './models';

const clean=(value?:string):string=>(value??'').replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
const same=(a?:string,b?:string):boolean=>!!clean(a)&&clean(a).localeCompare(clean(b),undefined,{sensitivity:'base'})===0;
const fieldName=(model:AnkiSourceNoteType,name:string):string|undefined=>model.fields.find(field=>field.name.localeCompare(name,undefined,{sensitivity:'base'})===0)?.name;
const escaped=(value:string):string=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const templateUses=(template:string,name:string):boolean=>new RegExp(`{{(?:[#^/]\\s*)?(?:text:)?${escaped(name)}\\s*}}`,'i').test(template);
const key=(model:AnkiSourceNoteType,template:AnkiSourceTemplate)=>`${model.signature}::${template.id}`;

export function semanticVariantMatches(variant:AnkiSemanticVariant,fields:Record<string,string>):boolean{
  return variant.predicate.all.every(clause=>clause.operator==='non-empty'?!!clean(fields[clause.field]):clause.operator==='starts-with'?clean(fields[clause.field]).toLocaleLowerCase().startsWith(clean(clause.value).toLocaleLowerCase()):same(fields[clause.field],clause.value));
}

function sharedStablePrefix(values:string[]):string{
  if(!values.length)return'';let prefix=values[0]!;for(const value of values.slice(1)){while(prefix&&!value.startsWith(prefix))prefix=prefix.slice(0,-1);if(!prefix)break;}const boundary=Math.max(prefix.lastIndexOf('_'),prefix.lastIndexOf('-'));return boundary>=3?prefix.slice(0,boundary+1):'';
}

/**
 * Finds an optional source Answer that the exact template deliberately renders
 * only when present, ahead of its ordinary default answer region. The rule is
 * owned by this model/template and never promotes Answer fields globally.
 */
export function inferSemanticVariants(snapshot:AnkiSourceSnapshot,model:AnkiSourceNoteType,template:AnkiSourceTemplate,cards:CardContent[]):AnkiSemanticVariant[]{
  const idField=fieldName(model,'ID'),pronunciationField=fieldName(model,'Pronunciation'),promptField=fieldName(model,'Prompt');
  if(idField&&pronunciationField&&promptField&&templateUses(template.answer,pronunciationField)){
    const sourceCards=snapshot.cards.filter(card=>card.templateId===template.id),notes=sourceCards.map(source=>snapshot.notes.find(note=>note.id===source.noteId&&note.noteTypeId===model.id)).filter((note):note is AnkiSourceNote=>!!note);
    const candidates=notes.filter(note=>!!clean(note.fields[idField])&&!!clean(note.fields[pronunciationField])&&/\b(?:pronounce|read aloud|say aloud)\b/i.test(clean(note.fields[promptField]))),prefix=sharedStablePrefix(candidates.map(note=>clean(note.fields[idField])));
    if(prefix&&candidates.length>1&&candidates.length<notes.length&&notes.filter(note=>clean(note.fields[idField]).startsWith(prefix)).length===candidates.length)return[{id:`semantic-${model.signature.slice(14)}-${template.id.replace(/[^a-z0-9]/gi,'-')}-pronunciation-response`,label:'Pronunciation response variant',predicate:{all:[{field:idField,operator:'starts-with',value:prefix}]},overrides:{primaryAnswerField:pronunciationField},origin:'auto-inferred'}];
  }
  const answerField=fieldName(model,'Answer');if(!answerField||templateUses(template.question,answerField)||!templateUses(template.answer,answerField)||!new RegExp(`{{#\\s*${escaped(answerField)}\\s*}}`,'i').test(template.answer))return[];
  const sourceCards=snapshot.cards.filter(card=>card.templateId===template.id),notes=sourceCards.map(source=>snapshot.notes.find(note=>note.id===source.noteId&&note.noteTypeId===model.id)).filter((note):note is AnkiSourceNote=>!!note),withAnswer=notes.filter(note=>!!clean(note.fields[answerField])),withoutAnswer=notes.filter(note=>!clean(note.fields[answerField]));
  if(!withAnswer.length||!withoutAnswer.length)return[];
  const projected=withAnswer.map(note=>cards.find(card=>card.ankiSource?.noteGuid===note.guid&&card.ankiSource.sourceTemplateId===template.id)).filter((card):card is CardContent=>!!card);
  if(projected.length!==withAnswer.length||projected.some((card,index)=>same(card.answer,withAnswer[index]?.fields[answerField])))return[];
  return[{id:`semantic-${model.signature.slice(14)}-${template.id.replace(/[^a-z0-9]/gi,'-')}-answer-present`,label:'Explicit answer variant',predicate:{all:[{field:answerField,operator:'non-empty'}]},overrides:{primaryAnswerField:answerField},origin:'auto-inferred'}];
}

export function resolveSemanticVariants(snapshot:AnkiSourceSnapshot,cards:CardContent[],stored:AnkiConversionProfile[]=[]):Map<string,AnkiSemanticVariant[]>{
  const resolved=new Map<string,AnkiSemanticVariant[]>();
  for(const model of snapshot.noteTypes)for(const template of model.templates){
    const prior=stored.find(profile=>profile.sourceSignature===model.signature&&profile.templateId===template.id&&profile.origin==='user-confirmed'&&profile.semanticVariants?.length),matching=cards.filter(card=>card.ankiSource?.modelSignature===model.signature&&card.ankiSource.sourceTemplateId===template.id);
    resolved.set(key(model,template),prior?.semanticVariants?.map(variant=>structuredClone(variant))??inferSemanticVariants(snapshot,model,template,matching));
  }
  return resolved;
}

export function applySemanticVariants(snapshot:AnkiSourceSnapshot,cards:CardContent[],variants:Map<string,AnkiSemanticVariant[]>):void{
  for(const card of cards){
    const source=card.ankiSource;if(!source)continue;const note=snapshot.notes.find(item=>item.guid===source.noteGuid||item.id===source.noteId);if(!note)continue;
    const matches=(variants.get(`${source.modelSignature}::${source.sourceTemplateId}`)??[]).filter(variant=>semanticVariantMatches(variant,note.fields));if(matches.length!==1)continue;
    const variant=matches[0]!,answer=clean(note.fields[variant.overrides.primaryAnswerField]);if(!answer)continue;const priorAnswer=card.answer,priorAnswerIsRecallDuplicate=(source.contentProvenance?.frontFields??[]).some(field=>same(note.fields[field],priorAnswer));
    card.answer=answer;if(same(card.answerLabel,answer))delete card.answerLabel;if(same(card.pronunciation,answer))card.pronunciation='';
    const blocks=source.contentProvenance?.blocks;if(blocks){for(const block of blocks){if(block.side!=='back')continue;if(block.source===variant.overrides.primaryAnswerField){block.classification='primary-answer';block.destination='Answer card · primary-answer';}else if(block.classification==='primary-answer'){block.classification=priorAnswerIsRecallDuplicate?'duplicate-frontside':'support';block.destination=priorAnswerIsRecallDuplicate?'Omitted duplicate Recall stimulus':'Card Details · additional answer content';}}}
    if(!priorAnswerIsRecallDuplicate&&clean(priorAnswer)&&!card.details?.some(detail=>same(detail.content,priorAnswer)))card.details=[{label:'Additional answer content',content:priorAnswer},...(card.details??[])];
    if(source.contentProvenance)source.contentProvenance.semanticVariantId=variant.id;
  }
}

export function confirmSemanticVariants(variants:AnkiSemanticVariant[]|undefined,at:string):AnkiSemanticVariant[]|undefined{return variants?.map(variant=>({...variant,origin:'user-confirmed',acceptedAt:at}));}
