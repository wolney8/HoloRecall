import type { ImageOcclusionContent, ImageOcclusionMode, ImageOcclusionShape } from './models';

export interface AnkiImageOcclusionProjection { content:ImageOcclusionContent;imageName:string }
const bounded=(value:string|undefined):number=>{const number=Number.parseFloat(value??'');return Number.isFinite(number)?Math.max(0,Math.min(1,number)):0;};
const unescapeValue=(value:string):string=>value.replace(/\\([\\:])/g,'$1');
function properties(source:string):Record<string,string>{
  const result:Record<string,string>={};let token='',escaped=false;const parts:string[]=[];
  for(const character of source){if(escaped){token+=`\\${character}`;escaped=false;}else if(character==='\\')escaped=true;else if(character===':'){parts.push(token);token='';}else token+=character;}parts.push(token);
  for(const part of parts){const split=part.indexOf('=');if(split>0)result[part.slice(0,split)]=unescapeValue(part.slice(split+1));}
  return result;
}
const safeText=(value:string|undefined):string|undefined=>{const text=(value??'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/\s+\n/g,'\n').replace(/[ \t]+/g,' ').trim();return text||undefined;};
const imageName=(value:string):string=>value.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1]??'';
const imageAlt=(value:string):string|undefined=>safeText(value.match(/<img\b[^>]*\balt=["']([^"']*)["']/i)?.[1]);

/** Parse Anki 23.10+ native `image-occlusion:*` cloze payloads without executing their template. */
export function parseAnkiImageOcclusion(fields:Record<string,string>,cardOrdinal:number,noteId=''):AnkiImageOcclusionProjection|undefined{
  const occlusion=Object.entries(fields).find(([name])=>/^occlusion$/i.test(name))?.[1]??'';
  const image=Object.entries(fields).find(([name])=>/^image$/i.test(name))?.[1]??'';
  const imageRef=imageName(image);if(!occlusion||!imageRef)return undefined;
  const groups=new Map<number,ImageOcclusionShape[]>();let hideAll=false,index=0;
  for(const match of occlusion.matchAll(/\{\{c(\d+)::image-occlusion:(rect|ellipse|polygon|text):([\s\S]*?)\}\}/gi)){
    const ordinal=Number(match[1]),type=match[2]!.toLowerCase(),props=properties(match[3]??'');if(props['oi']==='1')hideAll=true;if(type==='text'||ordinal<1)continue;
    const groupId=`mask-${ordinal}`,base={id:`${groupId}-${index++}`,groupId,...(props['angle']?{angle:Number(props['angle'])||0}:{})};let shape:ImageOcclusionShape|undefined;
    if(type==='rect'){const x=bounded(props['left']),y=bounded(props['top']),width=bounded(props['width']),height=bounded(props['height']);if(width&&height)shape={...base,type:'rect',x,y,width,height};}
    if(type==='ellipse'){const x=bounded(props['left']),y=bounded(props['top']),rx=bounded(props['rx']||String(Number(props['width']??0)/2)),ry=bounded(props['ry']||String(Number(props['height']??0)/2));if(rx&&ry)shape={...base,type:'ellipse',cx:x+rx,cy:y+ry,rx,ry};}
    if(type==='polygon'){const points=(props['points']??'').split(/\s+/).flatMap(point=>{const [x,y]=point.split(',');return x!==undefined&&y!==undefined?[{x:bounded(x),y:bounded(y)}]:[]});if(points.length>=3)shape={...base,type:'polygon',points};}
    if(shape)groups.set(ordinal,[...(groups.get(ordinal)??[]),shape]);
  }
  const targetOrdinal=cardOrdinal+1,target=groups.get(targetOrdinal);if(!target?.length)return undefined;
  const shapes=[...groups.values()].flat();const mode:ImageOcclusionMode=hideAll?'hide-all-guess-one':'hide-one-guess-one';
  const field=(name:RegExp)=>Object.entries(fields).find(([key])=>name.test(key))?.[1];
  const header=safeText(field(/^header$/i)),backExtra=safeText(field(/^back\s*extra$/i)),comments=safeText(field(/^comments$/i));
  const imageDescription=imageAlt(image);
  return{imageName:imageRef,content:{version:1,source:'anki-native',mode,activeGroupId:`mask-${targetOrdinal}`,shapes,...(header?{header}:{}),...(backExtra?{backExtra}:{}),...(comments?{comments}:{}),...(imageDescription?{imageDescription}:{}),sourceNoteId:noteId,sourceMaskOrdinal:targetOrdinal}};
}

export function visibleOcclusionShapes(content:ImageOcclusionContent,revealed:boolean):ImageOcclusionShape[]{
  if(revealed)return content.mode==='hide-all-guess-one'?content.shapes.filter(shape=>shape.groupId!==content.activeGroupId):[];
  return content.mode==='hide-all-guess-one'?content.shapes:content.shapes.filter(shape=>shape.groupId===content.activeGroupId);
}
export function occlusionGroupIds(content:Pick<ImageOcclusionContent,'shapes'>):string[]{return [...new Set(content.shapes.map(shape=>shape.groupId))];}
export function cardsFromOcclusion(_baseId:string,content:Omit<ImageOcclusionContent,'activeGroupId'>):ImageOcclusionContent[]{return occlusionGroupIds(content).map(groupId=>({...structuredClone(content),activeGroupId:groupId}));}
