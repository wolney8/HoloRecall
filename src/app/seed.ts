import type { CardContent, Deck } from '../domain/models';

export const SEED_DECKS: Deck[] = [
  {
    id: 'italian-essentials',
    name: 'Italian essentials',
    description: '16 illustrated cards: everyday nouns, articles, plurals and first verbs.',
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
    ...base, id: 'it-limone', rarity: 'common', kind: 'visual', front: 'Name what you see, with its Italian article.',
    answer: 'il limone', pronunciation: 'eel lee-MOH-neh', meaning: 'the lemon',
    notes: 'Limone is masculine. Approximate pronunciation; not IPA.', tags: ['Everyday objects', 'Visual'],
    image: '/art/limone.svg', imageDescription: 'A yellow oval object with textured peel and green leaves, resting on a plate.',
  },
  {
    ...base, id: 'it-caffe', rarity: 'uncommon', kind: 'visual', front: 'Name the drink, with its Italian article.',
    answer: 'il caffè', pronunciation: 'eel kaf-FEH', meaning: 'the coffee',
    notes: 'The accent marks stress on the final syllable. Approximate pronunciation; not IPA.', tags: ['Everyday objects', 'Visual'],
    image: '/art/caffe.svg', imageDescription: 'A small yellow cup containing a dark brown drink, with steam rising above it.',
  },
  {
    ...base, id: 'it-casa', rarity: 'rare', kind: 'visual', front: 'Name what you see, with its Italian article.',
    answer: 'la casa', pronunciation: 'lah KAH-zah', meaning: 'the house',
    notes: 'Casa is feminine. Approximate pronunciation; not IPA.', tags: ['Everyday objects', 'Visual'],
    image: '/art/casa.svg', imageDescription: 'A small building with a red pitched roof, shuttered windows, and a front door in a garden.',
  },
  {
    ...base, id: 'it-libro', rarity: 'holo-rare', kind: 'visual', front: 'Name what you see, with its Italian article.',
    answer: 'il libro', pronunciation: 'eel LEE-broh', meaning: 'the book',
    notes: 'Libro is masculine. Approximate pronunciation; not IPA.', tags: ['Everyday objects', 'Visual'],
    image: '/art/libro.svg', imageDescription: 'A closed rectangular object with a green cover, a gold motif, stacked paper edges, and a ribbon.',
  },
  {
    ...base, id: 'it-tavolo', rarity: 'common', kind: 'text', front: 'Say “the table” in Italian.',
    answer: 'il tavolo', pronunciation: 'eel TAH-voh-loh', meaning: 'the table',
    notes: 'Many singular nouns ending in -o are masculine, but this is a pattern, not an absolute rule.', tags: ['Everyday objects', 'Articles'],
    image: '/art/tavolo.svg', imageDescription: 'A round wooden surface on four legs with a small vase on top.',
  },
  {
    ...base, id: 'it-mela', rarity: 'uncommon', kind: 'text', front: 'Say “an apple” in Italian.',
    answer: 'una mela', pronunciation: 'OO-nah MEH-lah', meaning: 'an apple',
    notes: 'Una is an indefinite article used with feminine singular nouns such as mela.', tags: ['Everyday objects', 'Articles'],
    image: '/art/mela.svg', imageDescription: 'A round red fruit with a curved stem and green leaf.',
  },
  {
    ...base, id: 'it-libri', rarity: 'rare', kind: 'text', front: 'Make this plural: il libro.',
    answer: 'i libri', pronunciation: 'ee LEE-bree', meaning: 'the books',
    notes: 'A common masculine pattern: -o → -i. The article also changes: il → i.', tags: ['Noun patterns'],
    image: '/art/libri.svg', imageDescription: 'Three rectangular volumes with different coloured covers and visible paper edges.',
  },
  {
    ...base, id: 'it-mani', rarity: 'ultra-rare', kind: 'text', front: 'Make this plural: la mano.',
    answer: 'le mani', pronunciation: 'leh MAH-nee', meaning: 'the hands',
    notes: 'Mano is a feminine noun despite ending in -o. Its plural is mani, with the feminine article le.', tags: ['Noun patterns', 'Exceptions'],
    image: '/art/mani.svg', imageDescription: 'Two open palms with five fingers each, reaching up from green sleeves.',
  },
  {
    ...base, id: 'it-sono', rarity: 'common', kind: 'text', front: 'Complete: Io ___ qui.\n(I am here.)',
    answer: 'sono', pronunciation: 'SOH-noh', meaning: 'I am',
    notes: 'Essere, present tense: io sono. Full sentence: Io sono qui. The subject pronoun can often be omitted.', tags: ['Verbs', 'Essere'],
    image: '/art/sono.svg', imageDescription: 'One person points toward their own chest while standing on a marked spot.',
  },
  {
    ...base, id: 'it-sei', rarity: 'uncommon', kind: 'text', front: 'Complete: Tu ___ qui.\n(You are here.)',
    answer: 'sei', pronunciation: 'say', meaning: 'you are (singular, informal)',
    notes: 'Essere, present tense: tu sei. This task tests the verb only.', tags: ['Verbs', 'Essere'],
    image: '/art/sei.svg', imageDescription: 'A foreground hand points toward another person, who waves from a marked spot.',
  },
  {
    ...base, id: 'it-siamo', rarity: 'holo-rare', kind: 'text', front: 'Complete: Noi ___ qui.\n(We are here.)',
    answer: 'siamo', pronunciation: 'see-AH-moh', meaning: 'we are',
    notes: 'Essere, present tense: noi siamo. Full sentence: Noi siamo qui.', tags: ['Verbs', 'Essere'],
    image: '/art/siamo.svg', imageDescription: 'Three people stand together on the same circular spot.',
  },
  {
    ...base, id: 'it-ho', rarity: 'rare', kind: 'text', front: 'Complete: Io ___ un libro.\n(I have a book.)',
    answer: 'ho', pronunciation: 'oh', meaning: 'I have',
    notes: 'Avere, present tense: io ho. The h is silent.', tags: ['Verbs', 'Avere'],
    image: '/art/ho.svg', imageDescription: 'From the viewer’s perspective, two hands hold a green volume with a gold cover motif.',
  },
  {
    ...base, id: 'it-ha', rarity: 'ultra-rare', kind: 'text', front: 'Complete: Lui ___ un libro.\n(He has a book.)',
    answer: 'ha', pronunciation: 'ah', meaning: 'he has',
    notes: 'Avere, present tense: lui ha. The h is silent.', tags: ['Verbs', 'Avere'],
    image: '/art/ha.svg', imageDescription: 'A foreground hand points to a man holding a green volume against his chest.',
  },
  {
    ...base, id: 'it-abbiamo', rarity: 'secret-rare', kind: 'text', front: 'Complete: Noi ___ un libro.\n(We have a book.)',
    answer: 'abbiamo', pronunciation: 'ahb-bee-AH-moh', meaning: 'we have',
    notes: 'Avere, present tense: noi abbiamo. Hold the doubled b slightly longer.', tags: ['Verbs', 'Avere'],
    image: '/art/abbiamo.svg', imageDescription: 'Two people jointly hold a single green volume between them.',
  },
  {
    ...base, id: 'it-parlo', rarity: 'holo-rare', kind: 'text', front: 'Complete: Io ___ italiano.\n(I speak Italian.)',
    answer: 'parlo', pronunciation: 'PAR-loh', meaning: 'I speak',
    notes: 'Parlare is a regular -are verb. Remove -are and add -o for io.', tags: ['Verbs', 'Parlare'],
    image: '/art/parlo.svg', imageDescription: 'One person gestures while a speech bubble appears beside their face.',
  },
  {
    ...base, id: 'it-parliamo', rarity: 'relic', kind: 'text', front: 'Complete: Noi ___ italiano.\n(We speak Italian.)',
    answer: 'parliamo', pronunciation: 'par-lee-AH-moh', meaning: 'we speak',
    notes: 'Parlare is a regular -are verb. Remove -are and add -iamo for noi.', tags: ['Verbs', 'Parlare'],
    image: '/art/parliamo.svg', imageDescription: 'Two people face one another with separate speech bubbles above them.',
  },
];
