import type { CardContent } from './models';
export type CardCapability='image-occlusion'|'cloze'|'clue'|'audio'|'choices';
export function cardCapabilities(card:CardContent):CardCapability[]{
  const result:CardCapability[]=[];
  if(card.imageOcclusion)result.push('image-occlusion');
  if(card.ankiSource?.contentProvenance?.front==='cloze'&&!card.imageOcclusion)result.push('cloze');
  if(card.presentation?.hint?.trim())result.push('clue');
  if(card.frontAudio?.length||card.backAudio?.length)result.push('audio');
  if(card.choices?.length)result.push('choices');
  return result;
}
