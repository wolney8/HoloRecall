export type DeskFace='recall'|'answer';
export type DeskPlacementKind='owned'|'locked';

export interface DeskCardPlacement {
  id:string;
  cardId:string;
  kind:DeskPlacementKind;
  x:number;
  y:number;
  rotation:number;
  zIndex:number;
  face:DeskFace;
}

export const DESK_BATCH_SIZE=5;
export const DESK_LAYOUT_PAGE=18;

export function deterministicRotation(index:number):number {
  return ((index*7)%9)-4;
}

export function placementGrid(
  items:readonly Pick<DeskCardPlacement,'id'|'cardId'|'kind'>[],
  width:number,
  cardWidth=190,
  cardHeight=285,
):DeskCardPlacement[] {
  const inset=28,gap=24,usable=Math.max(cardWidth,width-inset*2),columns=Math.max(1,Math.floor((usable+gap)/(cardWidth+gap)));
  return items.map((item,index)=>({
    ...item,
    x:inset+(index%columns)*(cardWidth+gap),
    y:inset+Math.floor(index/columns)*(cardHeight+gap),
    rotation:deterministicRotation(index),
    zIndex:index+1,
    face:'recall',
  }));
}

export function clampPlacement(value:number,extent:number,itemExtent:number,inset=28):number {
  const maximum=Math.max(inset,extent-itemExtent-inset);
  return Math.max(inset,Math.min(value,maximum));
}

export function nextZIndex(placements:readonly DeskCardPlacement[],selectedId:string):DeskCardPlacement[] {
  const ordered=[...placements].sort((a,b)=>a.zIndex-b.zIndex),selected=ordered.find(item=>item.id===selectedId);
  if(!selected)return placements.map((item,index)=>({...item,zIndex:index+1}));
  const ranks=new Map([...ordered.filter(item=>item.id!==selectedId),selected].map((item,index)=>[item.id,index+1]));
  return placements.map(item=>({...item,zIndex:ranks.get(item.id)!}));
}
