import { COLLECTION_DEFAULT_FACE } from './collection-face-policy';
import type { DeskCardPlacement,DeskFace,DeskPlacementKind } from './desk-placement';

export const DESK_PILE_FAN_PAGE_SIZE=12;
export const DESK_PILE_FAN_COLUMNS=6;
const FAN_STEP_X=208;
const FAN_STEP_Y=310;

export interface DeskPileMember {
  id:string;
  cardId:string;
  kind:DeskPlacementKind;
  face:DeskFace;
}

export interface DeskPile {
  id:string;
  x:number;
  y:number;
  rotation:number;
  zIndex:number;
  members:DeskPileMember[];
  expanded:boolean;
  page:number;
}

export interface DeskFanGeometry {x:number;y:number;rotation:number}

export function pileMember(placement:Pick<DeskCardPlacement,'id'|'cardId'|'kind'|'face'>):DeskPileMember {
  return {id:placement.id,cardId:placement.cardId,kind:placement.kind,face:placement.face};
}

export function restoredPileMember(identity:Pick<DeskPileMember,'id'|'cardId'|'kind'>):DeskPileMember {
  return {...identity,face:COLLECTION_DEFAULT_FACE};
}

export function fanPageCount(pile:Pick<DeskPile,'members'>):number {
  return Math.max(1,Math.ceil(pile.members.length/DESK_PILE_FAN_PAGE_SIZE));
}

export function visiblePileMembers(pile:DeskPile):DeskPileMember[] {
  const page=Math.min(Math.max(0,pile.page),fanPageCount(pile)-1),start=page*DESK_PILE_FAN_PAGE_SIZE;
  return pile.members.slice(start,start+DESK_PILE_FAN_PAGE_SIZE);
}

export function fanGeometry(index:number,count:number):DeskFanGeometry {
  const columns=Math.min(DESK_PILE_FAN_COLUMNS,Math.max(1,count)),row=Math.floor(index/DESK_PILE_FAN_COLUMNS),column=index%DESK_PILE_FAN_COLUMNS;
  const rowCount=Math.min(columns,count-row*DESK_PILE_FAN_COLUMNS),centre=(rowCount-1)/2,offset=column-centre;
  return {x:column*FAN_STEP_X,y:row*FAN_STEP_Y+Math.abs(offset)*7,rotation:Math.max(-4,Math.min(4,offset*1.4))};
}

export function fanExtent(count:number):{width:number;height:number} {
  const visible=Math.min(DESK_PILE_FAN_PAGE_SIZE,Math.max(1,count)),columns=Math.min(DESK_PILE_FAN_COLUMNS,visible),rows=Math.ceil(visible/DESK_PILE_FAN_COLUMNS);
  return {width:190+(columns-1)*FAN_STEP_X,height:285+(rows-1)*FAN_STEP_Y+22};
}

export function removePileMember(pile:DeskPile,memberId:string):DeskPile {
  const members=pile.members.filter(member=>member.id!==memberId),pages=Math.max(1,Math.ceil(members.length/DESK_PILE_FAN_PAGE_SIZE));
  return {...pile,members,page:Math.min(pile.page,pages-1)};
}
