import type { CardContent, Deck } from '../domain/models';

export const SEED_DECKS: Deck[] = [
  {
    id: 'italian-essentials',
    name: 'Italian, a little every day',
    description: 'Everyday objects, useful little patterns, and your first Italian verbs. One small discovery at a time.',
    suspended: false,
  },
];

const base = {
  deckId: 'italian-essentials',
  revision: 1,
  suspended: false,
};

/** Original demonstration content; no synthetic review history or learner state. */
export const SEED_CARDS: CardContent[] = [
  {
    ...base, id: 'it-limone', kind: 'visual', front: 'Name what you see, with its Italian article.',
    answer: 'il limone', pronunciation: 'eel lee-MOH-neh', meaning: 'the lemon',
    notes: 'Limone is masculine. Approximate pronunciation; not IPA.', tags: ['Everyday objects', 'Visual'],
    image: '/art/limone.svg', imageDescription: 'A yellow oval object with textured peel and green leaves, resting on a plate.',
  },
  {
    ...base, id: 'it-caffe', kind: 'visual', front: 'Name the drink, with its Italian article.',
    answer: 'il caffè', pronunciation: 'eel kaf-FEH', meaning: 'the coffee',
    notes: 'The accent marks stress on the final syllable. Approximate pronunciation; not IPA.', tags: ['Everyday objects', 'Visual'],
    image: '/art/caffe.svg', imageDescription: 'A small yellow cup containing a dark brown drink, with steam rising above it.',
  },
  {
    ...base, id: 'it-casa', kind: 'visual', front: 'Name what you see, with its Italian article.',
    answer: 'la casa', pronunciation: 'lah KAH-zah', meaning: 'the house',
    notes: 'Casa is feminine. Approximate pronunciation; not IPA.', tags: ['Everyday objects', 'Visual'],
    image: '/art/casa.svg', imageDescription: 'A small building with a red pitched roof, shuttered windows, and a front door in a garden.',
  },
  {
    ...base, id: 'it-libro', kind: 'visual', front: 'Name what you see, with its Italian article.',
    answer: 'il libro', pronunciation: 'eel LEE-broh', meaning: 'the book',
    notes: 'Libro is masculine. Approximate pronunciation; not IPA.', tags: ['Everyday objects', 'Visual'],
    image: '/art/libro.svg', imageDescription: 'A closed rectangular object with a green cover, a gold motif, stacked paper edges, and a ribbon.',
  },
  {
    ...base, id: 'it-tavolo', kind: 'text', front: 'Say “the table” in Italian.',
    answer: 'il tavolo', pronunciation: 'eel TAH-voh-loh', meaning: 'the table',
    notes: 'Many singular nouns ending in -o are masculine, but this is a pattern, not an absolute rule.', tags: ['Everyday objects', 'Articles'],
  },
  {
    ...base, id: 'it-mela', kind: 'text', front: 'Say “an apple” in Italian.',
    answer: 'una mela', pronunciation: 'OO-nah MEH-lah', meaning: 'an apple',
    notes: 'Una is an indefinite article used with feminine singular nouns such as mela.', tags: ['Everyday objects', 'Articles'],
  },
  {
    ...base, id: 'it-libri', kind: 'text', front: 'Make this plural: il libro.',
    answer: 'i libri', pronunciation: 'ee LEE-bree', meaning: 'the books',
    notes: 'A common masculine pattern: -o → -i. The article also changes: il → i.', tags: ['Noun patterns'],
  },
  {
    ...base, id: 'it-mani', kind: 'text', front: 'Make this plural: la mano.',
    answer: 'le mani', pronunciation: 'leh MAH-nee', meaning: 'the hands',
    notes: 'Mano is a feminine noun despite ending in -o. Its plural is mani, with the feminine article le.', tags: ['Noun patterns', 'Exceptions'],
  },
  {
    ...base, id: 'it-sono', kind: 'text', front: 'Complete: Io ___ qui.\n(I am here.)',
    answer: 'sono', pronunciation: 'SOH-noh', meaning: 'I am',
    notes: 'Essere, present tense: io sono. Full sentence: Io sono qui. The subject pronoun can often be omitted.', tags: ['Verbs', 'Essere'],
  },
  {
    ...base, id: 'it-sei', kind: 'text', front: 'Complete: Tu ___ qui.\n(You are here.)',
    answer: 'sei', pronunciation: 'say', meaning: 'you are (singular, informal)',
    notes: 'Essere, present tense: tu sei. This task tests the verb only.', tags: ['Verbs', 'Essere'],
  },
  {
    ...base, id: 'it-siamo', kind: 'text', front: 'Complete: Noi ___ qui.\n(We are here.)',
    answer: 'siamo', pronunciation: 'see-AH-moh', meaning: 'we are',
    notes: 'Essere, present tense: noi siamo. Full sentence: Noi siamo qui.', tags: ['Verbs', 'Essere'],
  },
  {
    ...base, id: 'it-ho', kind: 'text', front: 'Complete: Io ___ un libro.\n(I have a book.)',
    answer: 'ho', pronunciation: 'oh', meaning: 'I have',
    notes: 'Avere, present tense: io ho. The h is silent.', tags: ['Verbs', 'Avere'],
  },
  {
    ...base, id: 'it-ha', kind: 'text', front: 'Complete: Lui ___ un libro.\n(He has a book.)',
    answer: 'ha', pronunciation: 'ah', meaning: 'he has',
    notes: 'Avere, present tense: lui ha. The h is silent.', tags: ['Verbs', 'Avere'],
  },
  {
    ...base, id: 'it-abbiamo', kind: 'text', front: 'Complete: Noi ___ un libro.\n(We have a book.)',
    answer: 'abbiamo', pronunciation: 'ahb-bee-AH-moh', meaning: 'we have',
    notes: 'Avere, present tense: noi abbiamo. Hold the doubled b slightly longer.', tags: ['Verbs', 'Avere'],
  },
  {
    ...base, id: 'it-parlo', kind: 'text', front: 'Complete: Io ___ italiano.\n(I speak Italian.)',
    answer: 'parlo', pronunciation: 'PAR-loh', meaning: 'I speak',
    notes: 'Parlare is a regular -are verb. Remove -are and add -o for io.', tags: ['Verbs', 'Parlare'],
  },
  {
    ...base, id: 'it-parliamo', kind: 'text', front: 'Complete: Noi ___ italiano.\n(We speak Italian.)',
    answer: 'parliamo', pronunciation: 'par-lee-AH-moh', meaning: 'we speak',
    notes: 'Parlare is a regular -are verb. Remove -are and add -iamo for noi.', tags: ['Verbs', 'Parlare'],
  },
];
