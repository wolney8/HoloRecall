import type { AnkiSourceSnapshot, ArtworkRole, CardContent, CardPresentation, Deck, DesignSet, StudyArtPolicy } from './models';

export interface ResolvedCardPresentation {
  profile: 'general' | 'language';
  title?:string;
  /** Display-only chrome label. It may fall back to current deck identity without becoming source semantics. */
  chromeTitle?:string;
  chromeTitleSource?:'explicit'|'source-context'|'deck'|'none';
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

export function sourceForCard(card: CardContent, snapshots: AnkiSourceSnapshot[]): { fields: Record<string, string>; modelName: string; templateName:string } | undefined {
  const source = card.ankiSource;
  if (!source?.sourceSnapshotId) return undefined;
  const snapshot = snapshots.find(item => item.id === source.sourceSnapshotId);
  const note = snapshot?.notes.find(item => item.guid === source.noteGuid || item.id === source.noteId);
  const model = note && snapshot?.noteTypes.find(item => item.id === note.noteTypeId);
  const template=model?.templates.find(item=>item.id===source.sourceTemplateId)??model?.templates[source.templateOrdinal];
  return note && model ? { fields: note.fields, modelName: model.name,templateName:template?.name??source.templateName } : undefined;
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
  const hasArt = !!(card.image || card.art);
  const explicitlyVisual = /illustration|image|picture|what (?:do you see|is shown)/i.test(`${prompt} ${front}`);
  // A retained template front is the same pre-Reveal learning surface Study received
  // from Anki. Keep it intact instead of replacing it with an answer-side gloss.
  const retainedTemplateFront=card.ankiSource?.contentProvenance?.front==='template'&&!VAGUE.test(front)?front:'';
  const visualFallback=explicitlyVisual&&hasArt?'Recall the target-language expression shown by the illustration.':'';
  let primary = retainedTemplateFront || meaningfulQuestion || meaningfulFocus || (!VAGUE.test(front) ? front : '') || visualFallback || equivalent;
  if (same(primary, card.answer)) primary = equivalent && !same(equivalent, card.answer) ? equivalent : (prompt && !VAGUE.test(prompt) ? prompt : 'Recall the target-language expression');
  const promptIsTask=/^(?:say|use|complete|fill|choose|identify|translate|answer|recall)\b/i.test(prompt);
  const situation = context || (!promptIsTask&&prompt&&!VAGUE.test(prompt)&&!same(prompt,primary)?prompt:'');
  const instruction = task || (promptIsTask&&!VAGUE.test(prompt)&&!same(prompt,primary)?prompt:'Say it in the target language');
  const answer = clean(card.answer).toLocaleLowerCase();
  const primaryLines=new Set(clean(primary).split('\n').map(line=>line.toLocaleLowerCase()));
  const safe = (value?: string): string | undefined => { const result=clean(value);return result&&!same(result,primary)&&!primaryLines.has(result.toLocaleLowerCase())&&!(answer.length>1&&result.toLocaleLowerCase().includes(answer))?result:undefined; };
  const safeSituation=safe(situation),safeInstruction=safe(instruction),safeHint=safe(hint);
  return { profile: 'language', recallTask: primary, recallCue: meaningfulQuestion && meaningfulFocus && !same(meaningfulFocus, primary) ? meaningfulFocus : undefined, situationContext:safeSituation,taskGuidance:safeInstruction,hint:safeHint,artRole: hasArt ? (explicitlyVisual ? 'instructional' : 'supportive') : 'hidden' };
}

function storedPresentationIsAuthored(card:CardContent,source:ReturnType<typeof sourceForCard>,inferred:CardPresentation):boolean{
  if(!card.ankiSource)return true;
  const recall=clean(card.presentation?.recallTask);if(!recall)return false;
  const origin=card.ankiSource.conversion?.fieldOrigins?.presentation;
  if(origin==='local')return true;
  if(origin==='derived')return false;
  // Older snapshots did not record presentation provenance. Preserve a distinct
  // legacy override, but reject values that match known importer-derived fields.
  const fields=source?.fields??{},derived=[inferred.recallTask,card.front,card.answer,card.meaning,sourceField(fields,'Prompt'),sourceField(fields,'Question'),sourceField(fields,'Focus'),sourceField(fields,'English','Meaning')];
  return !derived.some(value=>same(recall,value));
}

const CAPABILITY_TITLE=/^(?:cloze|image occlusion|audio|choices?|clue)$/i;
const contextualGroups=[['topic','category','section','kind'],['lesson','unit','chapter']] as const;
function safeChromeLabel(value:string|undefined,card:CardContent,presentation:CardPresentation,source?:{modelName:string;templateName:string}):string|undefined{
  const candidate=clean(value);if(!candidate||candidate.length>56||candidate.split(/\s+/).length>8||CAPABILITY_TITLE.test(candidate))return undefined;
  const primary=clean(presentation.recallTask)||clean(card.front),answer=clean(card.answer);
  if(same(candidate,primary)||same(candidate,answer)||same(candidate,source?.modelName)||same(candidate,source?.templateName))return undefined;
  const folded=candidate.toLocaleLowerCase(),answerFolded=answer.toLocaleLowerCase();
  if(answerFolded.length>=3&&new RegExp(`(?:^|\\W)${answerFolded.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?:$|\\W)`,'iu').test(folded))return undefined;
  return candidate;
}
function contextualChromeLabel(card:CardContent,presentation:CardPresentation,source?:{fields:Record<string,string>;modelName:string;templateName:string}):string|undefined{
  if(!source)return undefined;
  const frontSources=new Set((card.ankiSource?.contentProvenance?.blocks??[]).filter(block=>block.side==='front').map(block=>block.source.toLocaleLowerCase()));
  for(const names of contextualGroups){
    const candidates=Object.entries(source.fields).filter(([name,value])=>(names as readonly string[]).includes(name.toLocaleLowerCase())&&frontSources.has(name.toLocaleLowerCase())&&!!clean(value)).map(([,value])=>safeChromeLabel(value,card,presentation,source)).filter((value):value is string=>!!value);
    const distinct=[...new Map(candidates.map(value=>[value.toLocaleLowerCase(),value])).values()];if(distinct.length===1)return distinct[0];if(distinct.length>1)return undefined;
  }
  return undefined;
}

export function derivedCardPresentation(card: CardContent, snapshots: AnkiSourceSnapshot[]): CardPresentation {
  const source=sourceForCard(card,snapshots),inferred = inferredPresentation(card, source),stored=card.presentation,authored=storedPresentationIsAuthored(card,source,inferred);
  return { ...inferred, ...stored,recallTask:authored?stored?.recallTask:inferred.recallTask, situationContext:stored?.situationContext??inferred.situationContext,taskGuidance:stored?.taskGuidance??inferred.taskGuidance??stored?.recallGuidance?.[0],hint:stored?.hint??inferred.hint };
}

export function resolveCardPresentation(card: CardContent, snapshots: AnkiSourceSnapshot[], deck?: Deck, design?: DesignSet): ResolvedCardPresentation {
  const source=sourceForCard(card,snapshots),inferred=inferredPresentation(card,source),presentation = derivedCardPresentation(card, snapshots);
  const requestedArtPolicy = presentation.studyArtPolicy ?? deck?.studyArtPolicy ?? design?.studyArtPolicy ?? 'auto';
  const artRole = presentation.artRole ?? (card.image || card.art ? 'supportive' : 'hidden');
  const effectiveArtPolicy = requestedArtPolicy === 'auto' ? (artRole === 'instructional' || presentation.profile !== 'language' && !!(card.image || card.art) ? 'image-first' : 'text-first') : requestedArtPolicy;
  const explicit=safeChromeLabel(presentation.title,card,presentation,source),contextual=contextualChromeLabel(card,presentation,source),deckFallback=safeChromeLabel(deck?.name,card,presentation,source),chromeTitle=explicit??contextual??deckFallback;
  const requestedPrimary=clean(presentation.recallTask)||clean(card.front),fallbackPrimary=clean(inferred.recallTask)||clean(card.front);
  const primary=!same(requestedPrimary,card.answer)?requestedPrimary:!same(fallbackPrimary,card.answer)?fallbackPrimary:!same(card.front,card.answer)?clean(card.front):'Recall the requested response';
  const primaryLines=new Set(primary.split('\n').map(line=>line.toLocaleLowerCase())),supplement=(value?:string)=>{const result=clean(value);return result&&!primaryLines.has(result.toLocaleLowerCase())?result:undefined;};
  const situationContext=supplement(presentation.situationContext),taskGuidance=supplement(presentation.taskGuidance),hint=supplement(presentation.hint);
  return { profile: presentation.profile ?? 'general', title:clean(presentation.title)||undefined,...(chromeTitle?{chromeTitle}:{}),chromeTitleSource:explicit?'explicit':contextual?'source-context':deckFallback?'deck':'none', primary, cue: clean(presentation.recallCue) || undefined, situationContext,taskGuidance,hint,answerInterpretation:card.details?.length?undefined:clean(card.interpretation||card.meaning)||undefined, artRole, requestedArtPolicy, effectiveArtPolicy };
}
