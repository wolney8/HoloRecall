import type { MotionPreference, Rarity } from '../domain/models';

export interface SurfaceState { x:number;y:number;press:number }

export function reducedMotion(preference:MotionPreference|undefined,systemReduced:boolean):boolean{
  return preference==='reduced'||(preference!=='full'&&systemReduced);
}

export function surfaceVariables(state:SurfaceState,rarity:Rarity,effects:boolean,reduced:boolean):Record<string,string>{
  const x=Math.max(-1,Math.min(1,state.x)),y=Math.max(-1,Math.min(1,state.y)),press=Math.max(0,Math.min(1,state.press));
  const magnitude=Math.min(1,Math.hypot(x,y)/Math.SQRT2),factor=rarity==='common'?.18:rarity==='uncommon'?.26:rarity==='rare'?.36:rarity==='holo-rare'?.58:rarity==='ultra-rare'?.76:.84;
  const intensity=effects?magnitude*factor+press*.08:0,shadow=17+magnitude*5;
  return {
    '--tilt-x':`${(reduced?0:-y*7).toFixed(2)}deg`,'--tilt-y':`${(reduced?0:x*8).toFixed(2)}deg`,
    '--ambient-x':`${(50-x*25).toFixed(2)}%`,'--ambient-y':`${(49-y*19).toFixed(2)}%`,'--ambient-angle':`${(-24+x*18-y*10).toFixed(2)}deg`,'--ambient-strength':(intensity*.72).toFixed(3),
    '--graze-x':`${(50+x*35).toFixed(2)}%`,'--graze-y':`${(52+y*29).toFixed(2)}%`,'--shimmer-x':`${(52-x*37).toFixed(2)}%`,'--shimmer-y':`${(48-y*31).toFixed(2)}%`,'--shimmer-phase':`${(x*54-y*32).toFixed(2)}deg`,'--shimmer-strength':intensity.toFixed(3),'--shimmer-width':`${(34-magnitude*9-press*3).toFixed(2)}%`,
    '--press-y':`${(press*2).toFixed(3)}px`,'--press-scale':(1-press*.006).toFixed(5),'--shadow-depth':(1+(magnitude*.18)-(press*.34)).toFixed(3),
  };
}

const segmenter=new Intl.Segmenter(undefined,{granularity:'grapheme'});
export function graphemeCount(value:string):number{return Array.from(segmenter.segment(value.normalize('NFC'))).filter(part=>part.segment.trim()).length;}
export function adaptiveShortCandidate(value:string):boolean{return !!value.trim()&&!/[\r\n]/.test(value)&&graphemeCount(value)<=4;}
