import type { AnkiBehaviourAdapter, AnkiConversionConcern, AnkiSourceSnapshot, AnkiTranslationAudit, CardContent } from './models';
import { answerOnlyMarkup, renderAnkiTemplate } from './anki-template';

type Coverage=AnkiTranslationAudit['representativeCoverage'][number];
const clean=(value?:string)=>value?.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().toLocaleLowerCase()??'';
const same=(a?:string,b?:string)=>!!clean(a)&&clean(a)===clean(b);
const media=(value:string,kind:'image'|'audio')=>kind==='image'?/<img\b[^>]*\bsrc\s*=/i.test(value):/\[sound:[^\]]+]/i.test(value);
const capabilityTitle=(value?:string)=>/^(?:cloze|image occlusion|audio|choices?|clue)$/i.test(clean(value));
const hash=(value:string):string=>{let result=2166136261;for(const char of value)result=Math.imul(result^char.charCodeAt(0),16777619);return(result>>>0).toString(16).padStart(8,'0');};
const frontClasses=new Set(['card-title','situation-context','primary-prompt','task-guidance','hint','choices','instructional-art','decorative','metadata','fallback']);
const backClasses=new Set(['primary-answer','secondary-cue','concise-interpretation','support','instructional-art','duplicate-frontside','decorative','metadata','fallback']);

/** Audits semantic coverage for one exact note type/template without executing source code. */
export function auditAnkiTemplateTranslation(snapshot:AnkiSourceSnapshot,model:AnkiSourceSnapshot['noteTypes'][number],template:AnkiSourceSnapshot['noteTypes'][number]['templates'][number],cards:CardContent[],adapter:AnkiBehaviourAdapter):AnkiTranslationAudit{
  const sourceCards=snapshot.cards.filter(source=>source.templateId===template.id&&snapshot.notes.some(note=>note.id===source.noteId&&note.noteTypeId===model.id));
  const projected=cards.filter(card=>card.ankiSource?.modelSignature===model.signature&&card.ankiSource.sourceTemplateId===template.id),findings=new Set<AnkiConversionConcern>();
  let sourceElementCount=0,accountedElementCount=0,frontExpected=false,answerExpected=false,frontProjected=false,answerProjected=false,decorative=false;
  let representativeCoverage:Coverage[]=[];
  for(const card of projected){
    const sourceCard=sourceCards.find(item=>{const note=snapshot.notes.find(value=>value.id===item.noteId);return note&&(note.guid===card.ankiSource?.noteGuid||note.id===card.ankiSource?.noteId)&&item.templateOrdinal===card.ankiSource?.templateOrdinal;});
    const note=sourceCard&&snapshot.notes.find(item=>item.id===sourceCard.noteId),provenance=card.ankiSource?.contentProvenance,blocks=provenance?.blocks??[];
    if(adapter==='image-occlusion'){
      sourceElementCount+=2;accountedElementCount+=card.imageOcclusion&&card.image?2:0;frontExpected=true;answerExpected=true;frontProjected||=!!card.image;answerProjected||=!!card.backImage;
      if(!card.imageOcclusion)findings.add('unsupported-behaviour');if(!card.image||!card.backImage)findings.add('missing-media');if(card.answer.trim())findings.add('visual-answer-text');
      if(!representativeCoverage.length)representativeCoverage=[{side:'front',source:'Image',classification:'media',destination:'Recall image with source masks',status:card.image?'accounted':'review-required'},{side:'back',source:'Occlusion',classification:'capability/behavior',destination:'Revealed visual answer',status:card.imageOcclusion&&card.backImage?'accounted':'review-required'}];
      continue;
    }
    if(!sourceCard||!note||!provenance){findings.add('missing-provenance');continue;}
    const sourceDeck=snapshot.sourceDecks.find(item=>item.id===sourceCard.sourceDeckId),special={Tags:note.tags.join(' '),Type:model.name,Deck:sourceDeck?.path??'',Subdeck:sourceDeck?.path.split('::').at(-1)??'',Card:template.name},clozeOrdinal=model.cloze?sourceCard.templateOrdinal+1:undefined;
    const front=renderAnkiTemplate(template.question,{fields:note.fields,clozeOrdinal,answerSide:false,special}),back=renderAnkiTemplate(answerOnlyMarkup(template.answer),{fields:note.fields,frontSide:front.markup,clozeOrdinal,answerSide:true,special});
    const expected=[...front.referencedFields.filter(name=>clean(note.fields[name])).map(source=>({side:'front' as const,source})),...back.referencedFields.filter(name=>clean(note.fields[name])).map(source=>({side:'back' as const,source})),...front.staticBlocks.map((_block,index)=>({side:'front' as const,source:`template-static:front:${index}`})),...back.staticBlocks.map((_block,index)=>({side:'back' as const,source:`template-static:back:${index}`})),...(/{{FrontSide}}/i.test(template.answer)?[{side:'back' as const,source:'FrontSide'}]:[])];
    sourceElementCount+=expected.length;
    const counts=new Map<string,number>();for(const block of blocks){const key=`${block.side}:${block.source}`;counts.set(key,(counts.get(key)??0)+1);if(block.classification==='fallback')findings.add(block.side==='front'?'unaccounted-front':'unaccounted-back');if(block.side==='front'&&!frontClasses.has(block.classification)||block.side==='back'&&!backClasses.has(block.classification))findings.add('wrong-side-content');if(block.classification==='decorative')decorative=true;if(block.classification==='primary-answer'&&/Card Details/i.test(block.destination))findings.add('primary-answer-in-details');}
    for(const item of expected){const count=counts.get(`${item.side}:${item.source}`)??0;if(count===1)accountedElementCount++;else if(count>1)findings.add('duplicate-semantic-coverage');else findings.add(item.side==='front'?'unaccounted-front':'unaccounted-back');}
    if([...counts.values()].some(count=>count>1))findings.add('duplicate-semantic-coverage');
    const frontHasImage=media(front.markup,'image'),frontHasAudio=media(front.markup,'audio'),backHasImage=media(back.markup,'image'),backHasAudio=media(back.markup,'audio');
    frontExpected||=frontHasImage||frontHasAudio;answerExpected||=backHasImage||backHasAudio;
    if(frontHasImage||frontHasAudio)frontProjected||=(!frontHasImage||!!card.image)&&(!frontHasAudio||!!card.frontAudio?.length);
    if(backHasImage||backHasAudio)answerProjected||=(!backHasImage||!!card.backImage)&&(!backHasAudio||!!card.backAudio?.length);
    if(frontHasImage&&!card.image||frontHasAudio&&!card.frontAudio?.length||backHasImage&&!card.backImage||backHasAudio&&!card.backAudio?.length)findings.add('missing-media');
    if(!frontHasImage&&backHasImage&&!!card.image)findings.add('answer-leak');
    if(!card.answer.trim())findings.add('placeholder-answer');
    if(same(card.front,card.answer))findings.add('equivalent-recall-answer');
    const answer=clean(card.answer);if(answer.length>=3&&new RegExp(`(?:^|\\W)${answer.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?:$|\\W)`,'iu').test(clean(card.front)))findings.add('answer-leak');
    if(card.art?.kind==='generated-text-art'&&(same(card.art.title,card.front)||clean(card.front).startsWith(clean(card.art.title))))findings.add('duplicate-prompt-art');
    if(capabilityTitle(card.presentation?.title)||same(card.presentation?.title,card.answer)||same(card.presentation?.title,card.front)||same(card.presentation?.title,model.name)||same(card.presentation?.title,template.name))findings.add('unsafe-title');
    if(/{{FrontSide}}/i.test(template.answer)&&clean(card.answer).includes(clean(card.front)))findings.add('duplicated-frontside');
    if(card.details?.some(detail=>!detail.blocks?.length&&detail.content.length>400&&detail.content.split('\n').filter(Boolean).length>=6))findings.add('unstructured-support');
    if(!representativeCoverage.length)representativeCoverage=blocks.slice(0,40).map(block=>({side:block.side,source:block.source,classification:block.classification,destination:block.destination,status:block.classification==='fallback'?'review-required':'accounted'}));
  }
  if(adapter==='image-occlusion'&&projected.some(card=>!card.imageOcclusion||!card.image))findings.add('unsupported-behaviour');
  const mediaAudit={frontExpected,answerExpected,frontProjected,answerProjected,decorative},findingList=[...findings].sort();
  const auditCore={sourceCardCount:sourceCards.length,projectedCardCount:projected.length,auditedCardCount:projected.length,sourceElementCount,accountedElementCount,findings:findingList,representativeCoverage,media:mediaAudit};
  return{version:1,fingerprint:`anki-translation-audit-v1-${hash(JSON.stringify(auditCore))}`,...auditCore};
}
