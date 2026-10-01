/** A calendar date in the learner's time zone, independent of the host zone and DST. */
export function dayKey(date:Date,timeZone:string):string{const parts=new Intl.DateTimeFormat('en-GB',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date),part=(type:string)=>parts.find(item=>item.type===type)!.value;return `${part('year')}-${part('month')}-${part('day')}`;}
