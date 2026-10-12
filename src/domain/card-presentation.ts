import type { AnkiSourceSnapshot, ArtworkRole, CardContent, CardPresentation, Deck, DesignSet, StudyArtPolicy } from './models';

export interface ResolvedCardPresentation {
  profile: 'general' | 'language';
  primary: string;
  cue?: string;
  situationContext?: string;
  taskGuidance?: string;
  hint?: string;
  answerInterpretation?: string;
  artRole: ArtworkRole;
  requestedArtPolicy: StudyArtPolicy;
  effectiveArtPolicy: Exclude<StudyArtPolicy, 'auto'>;
}

const VAGUE = /^(?:recall (?:from the (?:illustration|image)|the answer)|complete the (?:phrase|pattern|sentence)|answer the question below\.?|read the question below\.?)$/i;
const entities = (value: string): string => value.replace(/&nbsp;/gi, ' ').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#(?:39|x27);/gi, "'").replace(/&amp;/gi, '&');
const clean = (value?: string): string => entities(value ?? '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/?(?:div|p|section|li|tr|td|th|h[1-6])\b[^>]*>/gi, '\n').replace(/<[^>]+>/g, '').split('\n').map(line => line.replace(/[\t ]+/g, ' ').trim()).filter(Boolean).join('\n').trim();
const same = (a?: string, b?: string): boolean => clean(a).localeCompare(clean(b), undefined, { sensitivity: 'base' }) === 0;
const sourceField = (fields: Record<string, string>, ...names: string[]): string => {
  const entry = Object.entries(fields).find(([key]) => names.some(name => key.localeCompare(name, undefined, { sensitivity: 'base' }) === 0));
  return clean(entry?.[1]);
};

export function sourceForCard(card: CardContent, snapshots: AnkiSourceSnapshot[]): { fields: Record<string, string>; modelName: string } | undefined {
  const source = card.ankiSource;
  if (!source?.sourceSnapshotId) return undefined;
  const snapshot = snapshots.find(item => item.id === source.sourceSnapshotId);
  const note = snapshot?.notes.find(item => item.guid === source.noteGuid || item.id === source.noteId);
  const model = note && snapshot?.noteTypes.find(item => item.id === note.noteTypeId);
  return note && model ? { fields: note.fields, modelName: model.name } : undefined;
}

function languageProfile(card: CardContent, source?: { fields: Record<string, string>; modelName: string }): boolean {
  if (card.presentation?.profile) return card.presentation.profile === 'language';
  const fields = source?.fields ?? {};
  const language = sourceField(fields, 'Language');
  return /italian|language/i.test(`${source?.modelName ?? ''} ${card.tags.join(' ')}`) || language === 'it' || (!!sourceField(fields, 'Italian') && !!sourceField(fields, 'English', 'Meaning'));
}

function inferredPresentation(card: CardContent, source?: { fields: Record<string, string>; modelName: string }): CardPresentation {
  if (!languageProfile(card, source)) return { profile: 'general', recallTask: clean(card.front), artRole: 'supportive' };
  const fields = source?.fields ?? {};
  const prompt = sourceField(fields, 'Prompt');
  const question = sourceField(fields, 'Question');
  const context = sourceField(fields, 'Context');
  const focus = sourceField(fields, 'Focus');
  const task = sourceField(fields, 'Task');
  const hint = sourceField(fields, 'Hint');
  const equivalent = sourceField(fields, 'English', 'Meaning');
  const visibleGap = /_{2,}|\[…]|\.\.\.|…/.test(question || focus);
  const meaningfulQuestion = question && (!VAGUE.test(question) || visibleGap) ? question : '';
  const meaningfulFocus = focus && (!VAGUE.test(focus) || visibleGap) ? focus : '';
  const front = clean(card.front);
  let primary = meaningfulQuestion || meaningfulFocus || (!VAGUE.test(front) ? front : '') || equivalent;
  if (same(primary, card.answer)) primary = equivalent && !same(equivalent, card.answer) ? equivalent : (prompt && !VAGUE.test(prompt) ? prompt : 'Recall the target-language expression');
  const promptIsTask=/^(?:say|use|complete|fill|choose|identify|translate|answer|recall)\b/i.test(prompt);
  const situation = context || (!promptIsTask&&prompt&&!VAGUE.test(prompt)&&!same(prompt,primary)?prompt:'');
  const instruction = task || (promptIsTask&&!VAGUE.test(prompt)&&!same(prompt,primary)?prompt:'Say it in the target language');
  const answer = clean(card.answer).toLocaleLowerCase();
  const safe = (value?: string): string | undefined => { const result=clean(value);return result&&!same(result,primary)&&!(answer.length>1&&result.toLocaleLowerCase().includes(answer))?result:undefined; };
  const safeSituation=safe(situation),safeInstruction=safe(instruction),safeHint=safe(hint);
  const explicitlyVisual = /illustration|image|picture|what (?:do you see|is shown)/i.test(prompt);
  const hasArt = !!(card.image || card.art);
  return { profile: 'language', recallTask: primary, recallCue: meaningfulQuestion && meaningfulFocus && !same(meaningfulFocus, primary) ? meaningfulFocus : undefined, situationContext:safeSituation,taskGuidance:safeInstruction,hint:safeHint,artRole: hasArt ? (explicitlyVisual ? 'instructional' : 'supportive') : 'hidden' };
}

export function derivedCardPresentation(card: CardContent, snapshots: AnkiSourceSnapshot[]): CardPresentation {
  const inferred = inferredPresentation(card, sourceForCard(card, snapshots));
  return { ...inferred, ...card.presentation, situationContext:card.presentation?.situationContext??inferred.situationContext,taskGuidance:card.presentation?.taskGuidance??inferred.taskGuidance??card.presentation?.recallGuidance?.[0],hint:card.presentation?.hint??inferred.hint };
}

export function resolveCardPresentation(card: CardContent, snapshots: AnkiSourceSnapshot[], deck?: Deck, design?: DesignSet): ResolvedCardPresentation {
  const presentation = derivedCardPresentation(card, snapshots);
  const requestedArtPolicy = presentation.studyArtPolicy ?? deck?.studyArtPolicy ?? design?.studyArtPolicy ?? 'auto';
  const artRole = presentation.artRole ?? (card.image || card.art ? 'supportive' : 'hidden');
  const effectiveArtPolicy = requestedArtPolicy === 'auto' ? (artRole === 'instructional' || presentation.profile !== 'language' && !!(card.image || card.art) ? 'image-first' : 'text-first') : requestedArtPolicy;
  const situationContext=clean(presentation.situationContext)||undefined,taskGuidance=clean(presentation.taskGuidance)||undefined,hint=clean(presentation.hint)||undefined;
  return { profile: presentation.profile ?? 'general', primary: clean(presentation.recallTask) || clean(card.front), cue: clean(presentation.recallCue) || undefined, situationContext,taskGuidance,hint,answerInterpretation:card.details?.length?undefined:clean(card.interpretation||card.meaning)||undefined, artRole, requestedArtPolicy, effectiveArtPolicy };
}
