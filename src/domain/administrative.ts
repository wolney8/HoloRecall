import { createEmptyCard } from 'ts-fsrs';
import type { AdministrativeEvent, CardControl, CardState, State } from './models';
import { serializeCard } from './study';

export type AdministrativeAction=Exclude<AdministrativeEvent['action'],'undo'>;
export interface AdministrativeUndoStatus { allowed:boolean; reason:string; groupId?:string; eventIds:string[] }

const same=(left:unknown,right:unknown)=>JSON.stringify(left)===JSON.stringify(right);
const control=(state:State,cardId:string):CardControl|undefined=>state.cardControls[cardId];
const card=(state:State,cardId:string)=>state.cards.find(item=>item.id===cardId);
const group=(state:State,event:AdministrativeEvent)=>event.groupId?state.administrativeEvents.filter(item=>item.groupId===event.groupId&&item.action!=='undo'):[event];
const projections=(event:AdministrativeEvent):Set<'state'|'control'|'suspension'>=>{
  if(event.action==='set-due'||event.action==='reset')return new Set(['state']);
  if(event.action==='suspend'||event.action==='unsuspend')return new Set(['control','suspension']);
  return event.action==='undo'?new Set():new Set(['control']);
};

function hasRequiredSnapshot(event:AdministrativeEvent):boolean{
  if(event.action==='set-due'||event.action==='reset')return !!event.previousState&&!!event.resultingState;
  if(event.action==='suspend'||event.action==='unsuspend')return event.previousSuspended!==undefined&&event.resultingSuspended!==undefined&&event.previousControl!==undefined&&event.resultingControl!==undefined;
  return ['bury','unbury','reposition'].includes(event.action)&&event.previousControl!==undefined&&event.resultingControl!==undefined;
}

export function administrativeUndoStatus(state:State,eventId:string):AdministrativeUndoStatus{
  const event=state.administrativeEvents.find(item=>item.id===eventId);
  if(!event||event.action==='undo')return{allowed:false,reason:'This management change cannot be undone.',eventIds:[]};
  const members=group(state,event),eventIds=members.map(item=>item.id);
  if(!event.groupId||members.some(item=>!hasRequiredSnapshot(item)))return{allowed:false,reason:'This older management record does not contain a safe undo snapshot.',eventIds};
  if(state.administrativeEvents.some(item=>item.action==='undo'&&item.reversesEventId&&eventIds.includes(item.reversesEventId)))return{allowed:false,reason:'This management change has already been undone.',groupId:event.groupId,eventIds};
  const reversed=new Set(state.administrativeEvents.flatMap(item=>item.action==='undo'&&item.reversesEventId?[item.reversesEventId]:[]));
  for(const item of members){
    const itemIndex=state.administrativeEvents.findIndex(candidate=>candidate.id===item.id),affected=projections(item);
    const superseded=state.administrativeEvents.slice(itemIndex+1).some(candidate=>candidate.action!=='undo'&&!eventIds.includes(candidate.id)&&candidate.cardId===item.cardId&&!reversed.has(candidate.id)&&[...projections(candidate)].some(value=>affected.has(value)));
    if(superseded)return{allowed:false,reason:'A later management change superseded this action, so it is no longer safe to undo.',groupId:event.groupId,eventIds};
    const currentCard=card(state,item.cardId);
    if(!currentCard)return{allowed:false,reason:'A card in this change no longer exists.',groupId:event.groupId,eventIds};
    if(item.resultingState&&!same(state.states[item.cardId],item.resultingState))return{allowed:false,reason:'The card schedule changed afterwards, so this action is no longer safe to undo.',groupId:event.groupId,eventIds};
    if(item.resultingControl!==undefined&&!same(control(state,item.cardId)??{},item.resultingControl))return{allowed:false,reason:'The card controls changed afterwards, so this action is no longer safe to undo.',groupId:event.groupId,eventIds};
    if(item.resultingSuspended!==undefined&&currentCard.suspended!==item.resultingSuspended)return{allowed:false,reason:'The card status changed afterwards, so this action is no longer safe to undo.',groupId:event.groupId,eventIds};
  }
  return{allowed:true,reason:'',groupId:event.groupId,eventIds};
}

export function applyAdministrativeUndo(state:State,eventId:string,now=new Date(),undoGroupId=`admin-undo-${crypto.randomUUID()}`):State{
  const status=administrativeUndoStatus(state,eventId);
  if(!status.allowed)throw new Error(status.reason);
  const originals=status.eventIds.map(id=>state.administrativeEvents.find(item=>item.id===id)!);
  const states={...state.states},controls={...state.cardControls};let cards=state.cards;
  const reversals:AdministrativeEvent[]=[];
  for(const original of originals){
    const beforeState=states[original.cardId],beforeControl=structuredClone(controls[original.cardId]??{}),beforeCard=card({...state,cards} as State,original.cardId)!;
    let afterState:CardState|undefined,afterControl:CardControl|undefined,afterSuspended:boolean|undefined;
    if(original.previousState){
      const restored={...structuredClone(original.previousState),version:(beforeState?.version??0)+1};
      states[original.cardId]=restored;afterState=restored;
    }
    if(original.previousControl!==undefined){
      afterControl=structuredClone(original.previousControl);
      if(Object.keys(afterControl).length)controls[original.cardId]=afterControl;else delete controls[original.cardId];
    }
    if(original.previousSuspended!==undefined){
      afterSuspended=original.previousSuspended;
      cards=cards.map(item=>item.id===original.cardId?{...item,suspended:afterSuspended!}:item);
    }
    reversals.push({id:crypto.randomUUID(),userId:state.userId,cardId:original.cardId,timestamp:now.toISOString(),action:'undo',groupId:undoGroupId,reversesEventId:original.id,
      ...(beforeState&&afterState?{previousState:structuredClone(beforeState),resultingState:structuredClone(afterState)}:{}),
      ...(original.previousControl!==undefined?{previousControl:beforeControl,resultingControl:structuredClone(afterControl!)}:{}),
      ...(afterSuspended!==undefined?{previousSuspended:beforeCard.suspended,resultingSuspended:afterSuspended}:{}),detail:original.action});
  }
  return{...state,version:state.version+1,cards,states,cardControls:controls,administrativeEvents:[...state.administrativeEvents,...reversals]};
}

export function applyAdministrativeChange(state:State,ids:string[],action:AdministrativeAction,value?:string|number,now=new Date(),groupId=`admin-${crypto.randomUUID()}`):State{
  const selected=[...new Set(ids)];
  if(!selected.length||selected.some(id=>!state.cards.some(card=>card.id===id)))throw new Error('Choose existing cards.');
  if(action==='set-due'&&!Number.isFinite(new Date(String(value)).getTime()))throw new Error('Choose a valid due date.');
  if(action==='reposition'&&(!Number.isSafeInteger(value)||Number(value)<0))throw new Error('Choose a valid new-card position.');
  const states={...state.states},controls={...state.cardControls};let cards=state.cards,positionOffset=0;const events=[...state.administrativeEvents];
  for(const cardId of selected){
    const previousControl=structuredClone(controls[cardId]??{}),current=state.cards.find(card=>card.id===cardId)!;let event:AdministrativeEvent|undefined;
    if(action==='set-due'||action==='reset'){
      if(action==='reset'&&!states[cardId])continue;
      const base=states[cardId]??serializeCard(createEmptyCard(now),0),result=action==='reset'?serializeCard(createEmptyCard(now),base.version+1):{...base,due:new Date(String(value)).toISOString(),version:base.version+1};
      if(action==='set-due'&&base.due===result.due)continue;
      states[cardId]=result;event={id:crypto.randomUUID(),userId:state.userId,cardId,timestamp:now.toISOString(),action,groupId,previousState:structuredClone(base),resultingState:structuredClone(result)};
    }else if(action==='bury'||action==='unbury'){
      const manualBuried=action==='bury';if(!!previousControl.manualBuried===manualBuried)continue;
      const resultingControl={...previousControl,manualBuried};controls[cardId]=resultingControl;
      event={id:crypto.randomUUID(),userId:state.userId,cardId,timestamp:now.toISOString(),action,groupId,previousControl,resultingControl:structuredClone(resultingControl)};
    }else if(action==='suspend'||action==='unsuspend'){
      const suspended=action==='suspend',resultingControl={...previousControl,manualBuried:false,leechSuspended:false};
      if(current.suspended===suspended&&same(previousControl,resultingControl))continue;
      cards=cards.map(card=>card.id===cardId?{...card,suspended}:card);controls[cardId]=resultingControl;
      event={id:crypto.randomUUID(),userId:state.userId,cardId,timestamp:now.toISOString(),action,groupId,previousControl,resultingControl:structuredClone(resultingControl),previousSuspended:current.suspended,resultingSuspended:suspended};
    }else{
      const position=Number(value)+positionOffset++;if(previousControl.newPosition===position)continue;
      const resultingControl={...previousControl,newPosition:position};controls[cardId]=resultingControl;
      event={id:crypto.randomUUID(),userId:state.userId,cardId,timestamp:now.toISOString(),action,groupId,previousControl,resultingControl:structuredClone(resultingControl),detail:String(position)};
    }
    events.push(event);
  }
  return events.length===state.administrativeEvents.length?state:{...state,version:state.version+1,cards,states,cardControls:controls,administrativeEvents:events};
}
