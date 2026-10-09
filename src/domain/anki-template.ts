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
  simplifications: string[];
  unsupported: string[];
}

const tokenPattern = /{{([#^/]?)([^{}]+)}}/g;
const executablePattern = /<script\b|\bon\w+\s*=|javascript\s*:/i;

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
  const result: AnkiTemplateRender = { markup: '', referencedFields: [], simplifications: [], unsupported: [] };
  template=template.replace(/\[anki:tts[^\]]*]([\s\S]*?)\[\/anki:tts]/gi,(_match,body)=>{result.simplifications.push('tts');return body;}).replace(/{{tts-voices:[^}]*}}/gi,()=>{result.simplifications.push('tts');return'';});
  if (executablePattern.test(template)) result.unsupported.push('executable-template');
  const stack: Array<{ name: string; inverse: boolean; include: boolean }> = [];
  let cursor = 0;
  const included = () => stack.every(frame => frame.include);
  for (const match of template.matchAll(tokenPattern)) {
    const index = match.index ?? 0;
    if (included()) result.markup += template.slice(cursor, index);
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
  if (included()) result.markup += template.slice(cursor);
  if (stack.length) result.unsupported.push('malformed-conditional');
  result.referencedFields = [...new Set(result.referencedFields)];
  result.simplifications = [...new Set(result.simplifications)];
  result.unsupported = [...new Set(result.unsupported)];
  return result;
}

export function answerOnlyMarkup(backTemplate: string): string {
  const answerMarker = /<hr\b[^>]*\bid=["']answer["'][^>]*>/i.exec(backTemplate);
  if (answerMarker?.index !== undefined) return backTemplate.slice(answerMarker.index + answerMarker[0].length);
  return backTemplate.replace(/{{FrontSide}}/gi, '');
}
