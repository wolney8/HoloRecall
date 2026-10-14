import type { AnkiBehaviourAdapter, AnkiConversionConcern, AnkiConversionProfile, AnkiMappingPreset, AnkiPresentationPolicy, AnkiSourceSnapshot, CardContent } from './models';
import { auditAnkiTemplateTranslation } from './anki-translation-audit';

export const ANKI_CONVERSION_PROFILE_VERSION=2;
export const conversionProfileKey=(value:Pick<AnkiConversionProfile,'sourceSignature'|'templateId'>)=>`${value.sourceSignature}::${value.templateId}`;

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
    const audit=auditAnkiTemplateTranslation(snapshot,model,template,matching,adapter);for(const finding of audit.findings)concerns.add(finding);
    for(const card of matching)if(/^(?:target region revealed|answer unavailable|unknown answer)$/i.test(card.answer.trim()))concerns.add('placeholder-answer');
    if(new Set(matching.map(card=>`${card.ankiSource?.contentProvenance?.front}:${card.ankiSource?.contentProvenance?.answer}:${!!card.imageOcclusion}`)).size>1)concerns.add('inconsistent-template');
    if(adapter==='image-occlusion'&&matching.some(card=>!card.imageOcclusion||!card.image))concerns.add('unsupported-behaviour');
    const sourceCards=snapshot.cards.filter(source=>source.templateId===template.id&&snapshot.notes.some(note=>note.id===source.noteId&&note.noteTypeId===model.id));
    const prior=stored.find(item=>conversionProfileKey(item)===key&&item.origin==='user-confirmed'),mapping=mappings.find(item=>item.sourceSignature===model.signature&&(item.templateId===template.id||!item.templateId));
    const list=[...concerns],acceptedAudit=prior?.status==='user-approved'&&prior.audit?.fingerprint===audit.fingerprint;
    if(prior?.origin==='user-confirmed'&&(!list.length||acceptedAudit))return{...prior,version:2,mappingProfileId:mapping?.id??prior.mappingProfileId,concerns:list,audit};
    if(prior?.origin==='user-confirmed')return{...prior,version:2,mappingProfileId:mapping?.id??prior.mappingProfileId,status:'review-required',concerns:list,audit};
    const status:AnkiConversionProfile['status']=!matching.length&&sourceCards.length?'unsupported-source-preserved':list.length?'review-required':'automatic';
    return{id:`conversion-${model.signature.slice(14)}-${template.id.replace(/[^a-z0-9]/gi,'-')}`,version:2,sourceSignature:model.signature,modelName:model.name,templateId:template.id,templateName:template.name,mappingProfileId:mapping?.id,behaviour:adapter,presentationPolicy:policy(adapter,matching),status,concerns:list,origin:'auto-inferred',audit};
  }));
}

export function approveConversionProfile(profile:AnkiConversionProfile,at=new Date()):AnkiConversionProfile{return{...profile,version:2,status:'user-approved',origin:'user-confirmed',acceptedAt:at.toISOString()};}
