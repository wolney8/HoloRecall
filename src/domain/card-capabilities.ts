import type { CardContent } from './models';
import type { ResolvedCardPresentation } from './card-presentation';
export type CardCapability='image-occlusion'|'cloze'|'clue'|'audio'|'choices';
export function cardCapabilities(card:CardContent,presentation?:ResolvedCardPresentation):CardCapability[]{
  const result:CardCapability[]=[];
  if(card.imageOcclusion)result.push('image-occlusion');
  if(card.ankiSource?.contentProvenance?.front==='cloze'&&!card.imageOcclusion)result.push('cloze');
  if((presentation?.hint??card.presentation?.hint)?.trim())result.push('clue');
  if(card.frontAudio?.length||card.backAudio?.length)result.push('audio');
  if(card.choices?.length)result.push('choices');
  return result;
}
