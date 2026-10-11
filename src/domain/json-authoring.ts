import type { CardContent, CardDetail, Deck, Rarity } from './models';
import { validateCard } from './backup';

export interface JsonAuthoringCard {
  id?: string;
  front: string;
  answer: string;
  secondary?: string;
  interpretation?: string;
  details?: CardDetail[];
  tags?: string[];
  rarity?: Rarity;
}
export interface JsonAuthoringDocument { format: 'holorecall-card-batch'; version: 1; cards: JsonAuthoringCard[] }
export interface JsonAuthoringError { index: number; message: string }
export interface JsonAuthoringPreview { deckId: string; cards: CardContent[]; errors: JsonAuthoringError[]; valid: boolean }

const executable = /<\s*\/?\s*(?:script|style|svg|iframe|object|embed)\b|\bon\w+\s*=|javascript\s*:/i;
const markup = /<[^>]+>/;
const clean = (value: unknown, label: string, max = 20_000): string => {
  if (typeof value !== 'string' || value.length > max) throw new Error(`${label} must be text of at most ${max.toLocaleString()} characters.`);
  if (executable.test(value) || markup.test(value)) throw new Error(`${label} must be plain learning text; HTML and executable content are not supported.`);
  return value;
};

/** Parses either the official versioned document or the friendly card-list shorthand. */
export function previewJsonAuthoring(raw: string, deck: Deck, makeId: () => string = () => crypto.randomUUID()): JsonAuthoringPreview {
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return { deckId: deck.id, cards: [], errors: [{ index: -1, message: 'The file is not valid JSON.' }], valid: false }; }
  const document = Array.isArray(input) ? { format: 'holorecall-card-batch', version: 1, cards: input } : input;
  if (!document || typeof document !== 'object' || Array.isArray(document)) return { deckId: deck.id, cards: [], errors: [{ index: -1, message: 'Use a JSON card list or a HoloRecall card-batch document.' }], valid: false };
  const source = document as Record<string, unknown>;
  if (source['format'] !== 'holorecall-card-batch' || source['version'] !== 1 || !Array.isArray(source['cards'])) return { deckId: deck.id, cards: [], errors: [{ index: -1, message: 'Unsupported card-batch format or version.' }], valid: false };
  if (source['cards'].length > 5000) return { deckId: deck.id, cards: [], errors: [{ index: -1, message: 'A batch may contain at most 5,000 cards.' }], valid: false };
  const cards: CardContent[] = [], errors: JsonAuthoringError[] = [], ids = new Set<string>();
  source['cards'].forEach((unknownCard, index) => {
    try {
      if (!unknownCard || typeof unknownCard !== 'object' || Array.isArray(unknownCard)) throw new Error('Card must be an object.');
      const item = unknownCard as Record<string, unknown>;
      const allowed = new Set(['id','front','answer','secondary','interpretation','details','tags','rarity']);
      const unsupported = Object.keys(item).find(key => !allowed.has(key));
      if (unsupported) throw new Error(`Unknown property "${unsupported}".`);
      const id = item['id'] === undefined ? `card-${makeId()}` : clean(item['id'], 'ID', 120);
      if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id) || ids.has(id)) throw new Error('Card ID is invalid or duplicated in this batch.');
      ids.add(id);
      const details = item['details'] === undefined ? [] : Array.isArray(item['details']) ? item['details'].map((value, detailIndex) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Detail ${detailIndex + 1} must have label and content.`);
        const detail = value as Record<string, unknown>;
        const unsupportedDetail = Object.keys(detail).find(key => key !== 'label' && key !== 'content');
        if (unsupportedDetail) throw new Error(`Detail ${detailIndex + 1} has unknown property "${unsupportedDetail}".`);
        const label = clean(detail['label'], `Detail ${detailIndex + 1} label`, 120), content = clean(detail['content'], `Detail ${detailIndex + 1} content`, 100_000);
        if (!label.trim() || !content.trim()) throw new Error(`Detail ${detailIndex + 1} needs a label and content.`);
        return { label, content };
      }) : (() => { throw new Error('Details must be a list.'); })();
      const tags = item['tags'] === undefined ? [] : Array.isArray(item['tags']) ? item['tags'].map((tag, tagIndex) => clean(tag, `Tag ${tagIndex + 1}`, 100)) : (() => { throw new Error('Tags must be a list.'); })();
      const rarity = String(item['rarity'] ?? 'common') as Rarity;
      const card: CardContent = {
        id, deckId: deck.id, kind: 'text', front: clean(item['front'], 'Front'), answer: clean(item['answer'], 'Answer'),
        pronunciation: '', meaning: '', notes: '', tags, revision: 1, suspended: false, rarity,
        ...(item['secondary'] === undefined ? {} : { secondary: clean(item['secondary'], 'Secondary') }),
        ...(item['interpretation'] === undefined ? {} : { interpretation: clean(item['interpretation'], 'Interpretation') }),
        ...(details.length ? { details } : {}),
      };
      // Absence of designSetId intentionally means follow the deck Design Set.
      validateCard(card); cards.push(card);
    } catch (error) { errors.push({ index, message: error instanceof Error ? error.message : 'Invalid card.' }); }
  });
  return { deckId: deck.id, cards, errors, valid: errors.length === 0 };
}

export const JSON_AUTHORING_EXAMPLE: JsonAuthoringDocument = {
  format: 'holorecall-card-batch', version: 1,
  cards: [{ front: 'Solve 7 × 8', answer: '56', secondary: 'Multiplication fact', details: [{ label: 'Method', content: 'Seven groups of eight' }], tags: ['maths', 'multiplication'] }],
};

/** Published, inert JSON Schema for the official versioned batch document. */
export const JSON_AUTHORING_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://holorecall.local/schema/card-batch-v1.json',
  title: 'HoloRecall card batch', type: 'object', additionalProperties: false,
  required: ['format', 'version', 'cards'],
  properties: {
    format: { const: 'holorecall-card-batch' }, version: { const: 1 },
    cards: { type: 'array', maxItems: 5000, items: { type: 'object', additionalProperties: false, required: ['front','answer'], properties: {
      id: { type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$', maxLength: 120 }, front: { type: 'string', maxLength: 20000 }, answer: { type: 'string', maxLength: 20000 },
      secondary: { type: 'string', maxLength: 20000 }, interpretation: { type: 'string', maxLength: 20000 }, tags: { type: 'array', maxItems: 30, items: { type: 'string', maxLength: 100 } },
      rarity: { enum: ['common','uncommon','rare','holo-rare','ultra-rare','secret-rare','relic'] },
      details: { type: 'array', maxItems: 24, items: { type: 'object', additionalProperties: false, required: ['label','content'], properties: { label: { type: 'string', maxLength: 120 }, content: { type: 'string', maxLength: 100000 } } } },
    } } },
  },
} as const;
