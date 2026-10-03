import type { FocusCriteria, FocusPreset, FocusSessionRequest } from './models';

const ID=/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$/;
const STATES=new Set(['new','learning','review','due','overdue','attention','leech','suspended','buried','recently-reviewed']);
const ORDERS=new Set(['deck','due','overdue','retrievability','lapses','oldest-reviewed','recently-added','random']);
const uniqueStrings=(values:unknown,name:string,maximum:number):void=>{if(!Array.isArray(values)||values.length>maximum||values.some(value=>typeof value!=='string'||!value.trim()||value.length>160)||new Set(values).size!==values.length)throw new Error(`Choose valid, unique ${name}.`);};

export function validateFocusCriteria(criteria: FocusCriteria): void {
  if (criteria.version !== 1) throw new Error('This Focus selection needs an update.');
  if (criteria.deckId !== undefined && !ID.test(criteria.deckId)) throw new Error('Choose a valid deck.');
  if (criteria.query !== undefined && (typeof criteria.query!=='string'||criteria.query.length>500)) throw new Error('The Focus search is too large.');
  if(criteria.tags!==undefined)uniqueStrings(criteria.tags,'tags',30);
  if(criteria.explicitCardIds!==undefined){uniqueStrings(criteria.explicitCardIds,'card references',100_000);if(criteria.explicitCardIds.some(value=>!ID.test(value)))throw new Error('Choose valid card references.');}
  if(criteria.studyStates!==undefined){uniqueStrings(criteria.studyStates,'study states',20);if(criteria.studyStates.some(value=>!STATES.has(value)))throw new Error('Choose supported study states.');}
  if(criteria.includeSuspended!==undefined&&typeof criteria.includeSuspended!=='boolean')throw new Error('Choose a valid suspended-card option.');
  for (const value of [criteria.missedWithinDays, criteria.dueWithinDays, criteria.overdueByDays, criteria.recentlyAddedDays]) if (value !== undefined && (!Number.isSafeInteger(value) || value < 0 || value > 3650)) throw new Error('Choose a valid day range.');
}

export function validateFocusRequest(request: FocusSessionRequest): void {
  validateFocusCriteria(request.criteria);
  if (!['scheduled', 'practice'].includes(request.mode) || !ORDERS.has(request.order)) throw new Error('Choose a supported Focus mode and order.');
  if(request.presetId!==undefined&&!ID.test(request.presetId))throw new Error('Choose a valid Focus preset.');
  if(request.seed!==undefined&&!ID.test(request.seed))throw new Error('Choose a valid Focus session seed.');
  if (!request.label.trim() || request.label.length > 160 || !Number.isSafeInteger(request.limit) || request.limit < 1 || request.limit > 10_000) throw new Error('Focus sessions need a name and a limit from 1 to 10,000 cards.');
}

export function validateFocusPreset(preset: FocusPreset): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$/.test(preset.id) || preset.version !== 1 || !preset.name.trim() || preset.name.length > 160) throw new Error('Focus presets need a valid name and stable ID.');
  validateFocusRequest({ mode: preset.mode, label: preset.name, criteria: preset.criteria, order: preset.order, limit: preset.limit });
}
