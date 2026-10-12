import type { SafeContentBlock } from './models';

const decode=(value:string)=>value.replace(/&nbsp;/gi,' ').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#(?:39|x27);/gi,"'").replace(/&amp;/gi,'&');
export const plainSafeContentText=(value:string)=>decode(value.replace(/<br\s*\/?>/gi,'\n').replace(/<\/?(?:address|article|aside|blockquote|div|figcaption|figure|footer|header|main|nav|p|section)\b[^>]*>/gi,'\n').replace(/<[^>]+>/g,'')).split('\n').map(line=>line.replace(/[\t ]+/g,' ').trim()).filter(Boolean).join('\n');
const inert=(value:string)=>value.replace(/<!--[\s\S]*?-->/g,'').replace(/<(?:script|style|svg|iframe|object|embed)\b[\s\S]*?<\/(?:script|style|svg|iframe|object|embed)\s*>/gi,'').replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'').replace(/\s+(?:src|href)\s*=\s*["']\s*(?:javascript:|https?:|\/\/)[^"']*["']/gi,'');

/** Converts untrusted source HTML into HoloRecall-owned declarative blocks. */
export function safeContentBlocks(source:string):SafeContentBlock[]{
  const html=inert(source),found:Array<{index:number;block:SafeContentBlock}>=[];let available=html;
  const take=(pattern:RegExp,handler:(match:RegExpMatchArray,emit:(block:SafeContentBlock)=>void)=>void)=>{const matches=[...available.matchAll(pattern)];for(const match of matches)handler(match,block=>found.push({index:match.index??0,block}));for(const match of matches.reverse()){const index=match.index??0;available=available.slice(0,index)+' '.repeat(match[0].length)+available.slice(index+match[0].length);}};
  take(/<table\b[^>]*>([\s\S]*?)<\/table\s*>/gi,(match,emit)=>{const tableCellText=(value:string)=>plainSafeContentText(value.replace(/(<\/(?:strong|b|em|span)\s*>)\s*(<(?:span|small)\b[^>]*class=["'][^"']*(?:phon|pronunciation|reading)[^"']*["'][^>]*>)/gi,'$1\n$2'));const rows=[...(match[1]??'').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)].map(row=>[...(row[1]??'').matchAll(/<t([hd])\b[^>]*>([\s\S]*?)<\/t[hd]\s*>/gi)].map(cell=>({header:cell[1]?.toLowerCase()==='h',value:tableCellText(cell[2]??'')}))).filter(row=>row.length);if(!rows.length)return;const first=rows[0]!,hasHeaders=first.some(cell=>cell.header);emit({type:'table',headers:hasHeaders?first.map(cell=>cell.value):[],rows:(hasHeaders?rows.slice(1):rows).map(row=>row.map(cell=>cell.value))});});
  take(/<div\b[^>]*class=["'][^"']*\b(?:word-tile|term-pair|key-value)\b[^"']*["'][^>]*>([\s\S]*?)<\/div\s*>/gi,(match,emit)=>{const body=match[1]??'',term=plainSafeContentText(/<(?:span|strong|dt)\b[^>]*>([\s\S]*?)<\/(?:span|strong|dt)\s*>/i.exec(body)?.[1]??''),description=plainSafeContentText(/<(?:small|dd)\b[^>]*>([\s\S]*?)<\/(?:small|dd)\s*>/i.exec(body)?.[1]??'');if(term&&description)emit({type:'pairs',rows:[{term,description}]});});
  take(/<(ol|ul)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi,(match,emit)=>{const items=[...(match[2]??'').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li\s*>/gi)].map(item=>plainSafeContentText(item[1]??'')).filter(Boolean);if(items.length)emit({type:'list',ordered:match[1]?.toLowerCase()==='ol',items});});
  take(/<pre\b[^>]*>([\s\S]*?)<\/pre\s*>/gi,(match,emit)=>{const value=plainSafeContentText(match[1]??'');if(value)emit({type:'code',text:value});});
  take(/<h([2-4])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi,(match,emit)=>{const value=plainSafeContentText(match[2]??'');if(value)emit({type:'heading',text:value,level:Number(match[1]) as 2|3|4});});
  take(/<(?:p|div|section)\b[^>]*>([\s\S]*?)<\/(?:p|div|section)\s*>/gi,(match,emit)=>{if(/<(?:table|ol|ul|pre|h[2-4]|div\b[^>]*class=["'][^"']*\b(?:word-tile|term-pair|key-value))/i.test(match[1]??''))return;const value=plainSafeContentText(match[1]??'');if(value)emit({type:'paragraph',text:value});});
  const fallback=plainSafeContentText(available);if(fallback&&!found.some(({block})=>'text'in block&&block.text===fallback))found.push({index:html.length,block:{type:'paragraph',text:fallback}});
  const ordered=found.sort((a,b)=>a.index-b.index).map(item=>item.block),merged:SafeContentBlock[]=[];
  for(const block of ordered){const previous=merged.at(-1);if(block.type==='pairs'&&previous?.type==='pairs')previous.rows.push(...block.rows);else merged.push(block);}
  return merged;
}
