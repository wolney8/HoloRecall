import { COLLECTION_DEFAULT_FACE, type CollectionCardFace } from './collection-face-policy';

export type DeskFace=CollectionCardFace;
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

export type DeskPlacementIdentity=Pick<DeskCardPlacement,'id'|'cardId'|'kind'>;
export type DeskPlacementGeometry=Pick<DeskCardPlacement,'x'|'y'|'rotation'|'zIndex'>;

/** The only constructor for a newly materialised physical Desk card. */
export function createDeskPlacement(identity:DeskPlacementIdentity,geometry:DeskPlacementGeometry):DeskCardPlacement {
  return {...identity,...geometry,face:COLLECTION_DEFAULT_FACE};
}

export const DESK_BATCH_SIZE=5;
export const DESK_LAYOUT_PAGE=18;
export const DESK_CARD_WIDTH=190;
export const DESK_CARD_HEIGHT=285;
export interface DeskWorldSize {width:number;height:number}

export function deterministicRotation(index:number):number {
  return ((index*7)%9)-4;
}

export function placementGrid(
  items:readonly Pick<DeskCardPlacement,'id'|'cardId'|'kind'>[],
  width:number,
  cardWidth=DESK_CARD_WIDTH,
  cardHeight=DESK_CARD_HEIGHT,
):DeskCardPlacement[] {
  const inset=64,gap=36,usable=Math.max(cardWidth,width-inset*2),columns=Math.max(1,Math.floor((usable+gap)/(cardWidth+gap)));
  return items.map((item,index)=>createDeskPlacement(item,{
    x:inset+(index%columns)*(cardWidth+gap),
    y:inset+Math.floor(index/columns)*(cardHeight+gap),
    rotation:deterministicRotation(index),
    zIndex:index+1,
  }));
}

export function deskWorldSize(count:number,viewportWidth:number,viewportHeight:number):DeskWorldSize {
  const columns=Math.min(6,Math.max(2,Math.ceil(Math.sqrt(Math.max(1,count)*1.45))));
  const rows=Math.ceil(Math.max(1,count)/columns),gap=36,inset=64;
  return {
    width:Math.min(1600,Math.max(viewportWidth,inset*2+columns*DESK_CARD_WIDTH+(columns-1)*gap)),
    height:Math.min(2400,Math.max(viewportHeight,inset*2+rows*DESK_CARD_HEIGHT+(rows-1)*gap)),
  };
}

export function nextFreePlacement(
  placements:readonly DeskCardPlacement[],
  item:Pick<DeskCardPlacement,'id'|'cardId'|'kind'>,
  world:DeskWorldSize,
):DeskCardPlacement {
  const inset=64,gap=36,columns=Math.max(1,Math.floor((world.width-inset*2+gap)/(DESK_CARD_WIDTH+gap)));
  const occupied=(x:number,y:number)=>placements.some(placement=>Math.abs(placement.x-x)<DESK_CARD_WIDTH*.72&&Math.abs(placement.y-y)<DESK_CARD_HEIGHT*.72);
  const capacity=Math.max(columns,columns*Math.ceil((world.height-inset*2+gap)/(DESK_CARD_HEIGHT+gap)));
  let index=0,x=inset,y=inset;
  for(;index<capacity;index++){x=inset+(index%columns)*(DESK_CARD_WIDTH+gap);y=inset+Math.floor(index/columns)*(DESK_CARD_HEIGHT+gap);if(!occupied(x,y))break;}
  return createDeskPlacement(item,{x:clampPlacement(x,world.width,DESK_CARD_WIDTH,64),y:clampPlacement(y,world.height,DESK_CARD_HEIGHT,64),rotation:deterministicRotation(index),zIndex:placements.length+1});
}

export function clampPan(value:number,viewportExtent:number,worldExtent:number):number {
  return Math.min(0,Math.max(Math.min(0,viewportExtent-worldExtent),value));
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
