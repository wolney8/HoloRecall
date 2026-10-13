import type { AnkiBehaviourAdapter, AnkiConversionConcern, AnkiConversionProfile, AnkiMappingPreset, AnkiPresentationPolicy, AnkiSourceSnapshot, CardContent } from './models';

export const ANKI_CONVERSION_PROFILE_VERSION=1;
export const conversionProfileKey=(value:Pick<AnkiConversionProfile,'sourceSignature'|'templateId'>)=>`${value.sourceSignature}::${value.templateId}`;
const clean=(value?:string)=>value?.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().toLocaleLowerCase()??'';
const same=(a?:string,b?:string)=>!!clean(a)&&clean(a)===clean(b);

function behaviour(model:AnkiSourceSnapshot['noteTypes'][number],template:AnkiSourceSnapshot['noteTypes'][number]['templates'][number]):AnkiBehaviourAdapter{
  if(/image[ _-]?occlusion/i.test(model.name))return'image-occlusion';
  if(model.cloze)return'cloze';
  if(/revers/i.test(template.name)||/\b(?:back|answer)\b/i.test(template.question)&&/\b(?:front|question)\b/i.test(template.answer))return'reversed';
  return model.fields.length>2||/<(?:table|ul|ol|pre|code|section|h[1-6])\b/i.test(`${template.question}\n${template.answer}`)?'rich-template':'basic';
}
function policy(adapter:AnkiBehaviourAdapter,cards:CardContent[]):AnkiPresentationPolicy{
  if(adapter==='image-occlusion')return'image-occlusion-task-first';
  if(cards.some(card=>card.choices?.length))return'choices';
  if(cards.some(card=>card.image&&card.presentation?.artRole==='instructional'))return'image-first';
  return'text-first';
}

/** Derives one conversion decision per exact model/template. Confirmed decisions win over new automatic inference. */
export function deriveConversionProfiles(snapshot:AnkiSourceSnapshot,cards:CardContent[],mappings:AnkiMappingPreset[],stored:AnkiConversionProfile[]=[]):AnkiConversionProfile[]{
  return snapshot.noteTypes.flatMap(model=>model.templates.map(template=>{
    const key=`${model.signature}::${template.id}`,matching=cards.filter(card=>card.ankiSource?.modelSignature===model.signature&&card.ankiSource.sourceTemplateId===template.id),adapter=behaviour(model,template),concerns=new Set<AnkiConversionConcern>();
    for(const card of matching){
      if(adapter!=='image-occlusion'&&same(card.front,card.answer))concerns.add('equivalent-recall-answer');
      if(/^(?:target region revealed|answer unavailable|unknown answer)$/i.test(card.answer.trim()))concerns.add('placeholder-answer');
      if(card.art?.kind==='generated-text-art'&&(same(card.art.title,card.front)||clean(card.front).startsWith(clean(card.art.title))))concerns.add('duplicate-prompt-art');
      if(card.ankiSource?.contentProvenance?.blocks?.some(block=>block.side==='front'&&block.classification==='fallback'))concerns.add('unaccounted-front');
      if(card.ankiSource?.contentProvenance?.blocks?.some(block=>block.side==='back'&&block.classification==='fallback'))concerns.add('unaccounted-back');
    }
    if(new Set(matching.map(card=>`${card.ankiSource?.contentProvenance?.front}:${card.ankiSource?.contentProvenance?.answer}:${!!card.imageOcclusion}`)).size>1)concerns.add('inconsistent-template');
    if(adapter==='image-occlusion'&&matching.some(card=>!card.imageOcclusion||!card.image))concerns.add('unsupported-behaviour');
    const sourceCards=snapshot.cards.filter(source=>source.templateId===template.id&&snapshot.notes.some(note=>note.id===source.noteId&&note.noteTypeId===model.id));
    const prior=stored.find(item=>conversionProfileKey(item)===key&&item.origin==='user-confirmed'),mapping=mappings.find(item=>item.sourceSignature===model.signature&&(item.templateId===template.id||!item.templateId));
    if(prior)return{...prior,mappingProfileId:mapping?.id??prior.mappingProfileId};
    const list=[...concerns],status:AnkiConversionProfile['status']=!matching.length&&sourceCards.length?'unsupported-source-preserved':list.length?'review-required':'automatic';
    return{id:`conversion-${model.signature.slice(14)}-${template.id.replace(/[^a-z0-9]/gi,'-')}`,version:1,sourceSignature:model.signature,modelName:model.name,templateId:template.id,templateName:template.name,mappingProfileId:mapping?.id,behaviour:adapter,presentationPolicy:policy(adapter,matching),status,concerns:list,origin:'auto-inferred'};
  }));
}

export function approveConversionProfile(profile:AnkiConversionProfile,at=new Date()):AnkiConversionProfile{return{...profile,status:'user-approved',origin:'user-confirmed',acceptedAt:at.toISOString()};}
