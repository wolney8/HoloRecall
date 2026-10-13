export interface AnkiTemplateContext {
  fields: Record<string, string>;
  frontSide?: string;
  clozeOrdinal?: number;
  answerSide: boolean;
  special?: Partial<Record<'Tags' | 'Type' | 'Deck' | 'Subdeck' | 'Card', string>>;
}

export interface AnkiTemplateRender {
  markup: string;
  referencedFields: string[];
  staticBlocks: AnkiTemplateStaticBlock[];
  simplifications: string[];
  unsupported: string[];
}

export interface AnkiTemplateStaticBlock {
  tag: string;
  text: string;
  classes: string[];
}

const tokenPattern = /{{([#^/]?)([^{}]+)}}/g;
const executablePattern = /<script\b|\bon\w+\s*=|javascript\s*:/i;

const decode=(value:string)=>value.replace(/&nbsp;/gi,' ').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#(?:39|x27);/gi,"'").replace(/&amp;/gi,'&');
const cleanStatic=(value:string)=>decode(value.replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
const meaningfulStatic=(value:string)=>/[\p{L}\p{N}]/u.test(value);

/** Extracts visible literal template blocks without inventing field identities. */
function staticTemplateBlocks(markup:string):AnkiTemplateStaticBlock[]{
  type Node={tag:string;attrs:string;parts:Array<string|Node>};
  const root:Node={tag:'root',attrs:'',parts:[]},stack=[root],safe=markup.replace(/<!--[\s\S]*?-->/g,'').replace(/<(?:script|style|svg|iframe|object|embed)\b[\s\S]*?<\/(?:script|style|svg|iframe|object|embed)\s*>/gi,'');
  for(const token of safe.matchAll(/<[^>]+>|[^<]+/g)){
    const value=token[0];if(!value)continue;
    const close=/^<\s*\/\s*([\w-]+)/.exec(value);if(close){const tag=close[1]!.toLowerCase();while(stack.length>1){const node=stack.pop()!;if(node.tag===tag)break;}continue;}
    const open=/^<\s*([\w-]+)([^>]*)>/.exec(value);if(open){if(/^<\s*[!?]/.test(value))continue;const node:Node={tag:open[1]!.toLowerCase(),attrs:open[2]??'',parts:[]};stack.at(-1)!.parts.push(node);if(!/\/\s*>$/.test(value)&&!/^(?:br|hr|img|input|meta|link|source|wbr)$/i.test(node.tag))stack.push(node);continue;}
    stack.at(-1)!.parts.push(value);
  }
  const blockTags=new Set(['address','article','aside','blockquote','div','figcaption','figure','footer','header','li','main','nav','ol','p','pre','section','small','summary','table','td','th','tr','ul']);
  const text=(node:Node):string=>cleanStatic(node.parts.map(part=>typeof part==='string'?part:text(part)).join(' '));
  const result:AnkiTemplateStaticBlock[]=[];
  const visit=(node:Node)=>{for(const part of node.parts)if(typeof part!=='string')visit(part);if(node.tag==='root')return;const value=text(node);if(!meaningfulStatic(value))return;const isHeading=/^h[1-6]$/.test(node.tag),hasBlockChild=node.parts.some(part=>typeof part!=='string'&&(blockTags.has(part.tag)||/^h[1-6]$/.test(part.tag))&&meaningfulStatic(text(part)));if(!isHeading&&!['p','small','summary','li','th','td'].includes(node.tag)&&!(node.tag==='div'&&!hasBlockChild))return;const classValue=/\bclass\s*=\s*["']([^"']*)["']/i.exec(node.attrs)?.[1]??'';result.push({tag:node.tag,text:value,classes:classValue.split(/\s+/).filter(Boolean).slice(0,12)});};
  visit(root);const seen=new Set<string>();return result.filter(block=>{const key=`${block.tag}:${block.text}:${block.classes.join('.')}`;if(seen.has(key))return false;seen.add(key);return true;});
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

function cloze(value: string, ordinal: number, answer: boolean): string {
  return value.replace(/{{c(\d+)::(.*?)(?:::(.*?))?}}/g, (_match, number, text, hint) =>
    Number(number) === ordinal ? (answer ? text : `[${hint || '…'}]`) : text,
  );
}

function fieldValue(expression: string, context: AnkiTemplateContext, result: AnkiTemplateRender): string {
  const parts = expression.split(':').map(value => value.trim()).filter(Boolean);
  const name = parts.pop() ?? '';
  if (name === 'FrontSide') return context.frontSide ?? '';
  const special = context.special?.[name as keyof NonNullable<AnkiTemplateContext['special']>];
  const raw = special ?? context.fields[name] ?? '';
  if (name && !(name in (context.special ?? {})) && !result.referencedFields.includes(name)) result.referencedFields.push(name);
  let value = raw;
  for (const filter of parts.reverse()) {
    if (filter === 'text') value = stripHtml(value);
    else if (filter === 'cloze') value = cloze(value, context.clozeOrdinal ?? 1, context.answerSide);
    else if (filter === 'type') { result.simplifications.push('typed-answer'); value = context.answerSide ? value : ''; }
    else if (filter.startsWith('tts ')) result.simplifications.push('tts');
    else if (['hint', 'furigana', 'kana', 'kanji'].includes(filter)) result.simplifications.push(filter);
    else { result.unsupported.push(`filter:${filter}`); return ''; }
  }
  return value;
}

/** Safe, non-executing subset of Anki/Mustache template evaluation. */
export function renderAnkiTemplate(template: string, context: AnkiTemplateContext): AnkiTemplateRender {
  const result: AnkiTemplateRender = { markup: '', referencedFields: [], staticBlocks: [], simplifications: [], unsupported: [] };
  template=template.replace(/\[anki:tts[^\]]*]([\s\S]*?)\[\/anki:tts]/gi,(_match,body)=>{result.simplifications.push('tts');return body;}).replace(/{{tts-voices:[^}]*}}/gi,()=>{result.simplifications.push('tts');return'';});
  if (executablePattern.test(template)) result.unsupported.push('executable-template');
  const stack: Array<{ name: string; inverse: boolean; include: boolean }> = [];
  let cursor = 0,staticMarkup='';
  const included = () => stack.every(frame => frame.include);
  for (const match of template.matchAll(tokenPattern)) {
    const index = match.index ?? 0;
    if (included()) {const literal=template.slice(cursor,index);result.markup+=literal;staticMarkup+=literal;}
    cursor = index + match[0].length;
    const marker = match[1] ?? '', expression = (match[2] ?? '').trim();
    if (marker === '#' || marker === '^') {
      const value = fieldValue(expression, context, result).trim();
      stack.push({ name: expression, inverse: marker === '^', include: marker === '^' ? !value : !!value });
      continue;
    }
    if (marker === '/') {
      const frame = stack.pop();
      if (!frame || frame.name !== expression) result.unsupported.push('malformed-conditional');
      continue;
    }
    if (included()) result.markup += fieldValue(expression, context, result);
  }
  if (included()) {const literal=template.slice(cursor);result.markup+=literal;staticMarkup+=literal;}
  if (stack.length) result.unsupported.push('malformed-conditional');
  result.referencedFields = [...new Set(result.referencedFields)];
  result.simplifications = [...new Set(result.simplifications)];
  result.unsupported = [...new Set(result.unsupported)];
  result.staticBlocks=staticTemplateBlocks(staticMarkup);
  return result;
}

export function answerOnlyMarkup(backTemplate: string): string {
  const answerMarker = /<hr\b[^>]*\bid=["']answer["'][^>]*>/i.exec(backTemplate);
  if (answerMarker?.index !== undefined) return backTemplate.slice(answerMarker.index + answerMarker[0].length);
  return backTemplate.replace(/{{FrontSide}}/gi, '');
}
