import type { CardCompositionId, CardContent, Deck, DesignPalette, DesignSet, Rarity, State } from './models';

export const GLOBAL_DESIGN_SET_ID = 'holorecall-default';
export const CARD_COMPOSITIONS: readonly CardCompositionId[] = [
  'full-bleed', 'framed-art', 'illustration-window', 'split-art-content',
  'typographic-showcase', 'minimal-prestige', 'diagram-technical',
  'photo-focus', 'symbolic-generated',
] as const;

/** Built-in fallback. It need not be duplicated in every legacy state or on every card. */
export const DEFAULT_DESIGN_SET: Readonly<DesignSet> = Object.freeze<DesignSet>({
  id: GLOBAL_DESIGN_SET_ID,
  name: 'HoloRecall',
  backgroundFit: 'cover',
  backgroundPositionX: 50,
  backgroundPositionY: 50,
  frameFit: 'contain',
  credit: 'HoloRecall',
  source: 'Built-in',
  license: 'Original',
  composition: 'symbolic-generated',
  layoutPolicy: 'suggest',
  palette: { primary: '#6750a4', secondary: '#625b71', surface: '#1d1b20', onSurface: '#e6e1e5', accent: '#d0bcff' },
  artwork: { fit: 'cover', focalX: 50, focalY: 48, treatment: 'embedded', mask: 'rounded-window', fullBleed: false, vignette: 20, tint: '#6750a4', safeZone: 'centre', edgeFade: 24, backgroundBleed: 30, duotone: 8, textureBlend: 18, emboss: 10, depth: 5 },
});

export interface ResolvedDesign {
  design: DesignSet;
  source: 'card-override' | 'deck' | 'ancestor-deck' | 'global';
  sourceDeckId?: string;
}

export interface DesignDeletionImpact { deckReferences: number; cardReferences: number; }
export function designDeletionImpact(state: Pick<State, 'decks' | 'cards'>, designId: string): DesignDeletionImpact {
  return { deckReferences: state.decks.filter(deck => deck.designSetId === designId).length, cardReferences: state.cards.filter(card => card.designSetId === designId).length };
}

/** Remove one reusable presentation definition and return its references to inheritance. */
export function deleteDesignSet(state: State, designId: string): State {
  if (!state.designs.some(design => design.id === designId)) return state;
  const clear = <T extends { designSetId?: string }>(item: T): T => {
    if (item.designSetId !== designId) return item;
    const next = { ...item }; delete next.designSetId; return next;
  };
  return { ...state, version: state.version + 1, designs: state.designs.filter(design => design.id !== designId), decks: state.decks.map(clear), cards: state.cards.map(clear) };
}

export function designCopyName(existing: readonly DesignSet[], sourceName: string): string {
  const names = new Set(existing.map(design => design.name.trim().toLocaleLowerCase('en')));
  let name = `${sourceName.trim()} copy`, suffix = 2;
  while (names.has(name.toLocaleLowerCase('en'))) name = `${sourceName.trim()} copy ${suffix++}`;
  return name;
}

export function inheritedDesignId(decks: readonly Deck[], deckId: string): { id?: string; deckId?: string } {
  const byId = new Map(decks.map(deck => [deck.id, deck]));
  const visited = new Set<string>();
  let current = byId.get(deckId);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.designSetId) return { id: current.designSetId, deckId: current.id };
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return {};
}

export function resolveCardDesign(state: Pick<State, 'decks' | 'designs'>, card: Pick<CardContent, 'deckId' | 'designSetId'>): ResolvedDesign {
  const byId = new Map(state.designs.map(design => [design.id, design]));
  if (card.designSetId) return { design: byId.get(card.designSetId) ?? DEFAULT_DESIGN_SET, source: 'card-override' };
  const inherited = inheritedDesignId(state.decks, card.deckId);
  if (inherited.id) return { design: byId.get(inherited.id) ?? DEFAULT_DESIGN_SET, source: inherited.deckId === card.deckId ? 'deck' : 'ancestor-deck', sourceDeckId: inherited.deckId };
  return { design: DEFAULT_DESIGN_SET, source: 'global' };
}

/** Coherent defaults from one family; explicit authored overrides always win. */
export function rarityVariant(design: DesignSet, rarity: Rarity): NonNullable<DesignSet['rarityVariants']>[Rarity] {
  const intensity: Record<Rarity, number> = { common: 0, uncommon: .12, rare: .28, 'holo-rare': .46, 'ultra-rare': .62, 'secret-rare': .78, relic: .9 };
  return {
    finish: design.finishes?.[rarity] ?? design.finish ?? (rarity === 'common' ? 'matte' : rarity === 'uncommon' ? 'gloss' : 'holographic'),
    frame: design.frames?.[rarity] ?? design.frame,
    texture: design.texture,
    accent: design.palette?.accent ?? design.palette?.primary,
    composition: design.composition,
    effectIntensity: intensity[rarity],
    ...design.rarityVariants?.[rarity],
  };
}

const hex = (red: number, green: number, blue: number): string => `#${[red,green,blue].map(value=>Math.max(0,Math.min(255,Math.round(value))).toString(16).padStart(2,'0')).join('')}`;
const luminance = ([red,green,blue]:readonly number[]):number => .2126*red+.7152*green+.0722*blue;
/** Small deterministic palette extraction primitive; source pixels are never modified. */
export function deriveDesignPalette(rgba: ArrayLike<number>): DesignPalette {
  const samples:Array<[number,number,number]>=[];
  const stride=Math.max(4,Math.floor(rgba.length/4096/4)*4);
  for(let index=0;index+3<rgba.length;index+=stride){if(Number(rgba[index+3])<32)continue;samples.push([Number(rgba[index]),Number(rgba[index+1]),Number(rgba[index+2])]);}
  if(!samples.length)return structuredClone(DEFAULT_DESIGN_SET.palette!);
  samples.sort((a,b)=>luminance(a)-luminance(b));
  const average=(from:number,to:number):[number,number,number]=>{const selected=samples.slice(from,Math.max(from+1,to)),sum=selected.reduce((value,item)=>[value[0]+item[0],value[1]+item[1],value[2]+item[2]] as [number,number,number],[0,0,0]);return sum.map(value=>value/selected.length) as [number,number,number];};
  const dark=average(0,Math.ceil(samples.length*.3)),mid=average(Math.floor(samples.length*.3),Math.ceil(samples.length*.72)),light=average(Math.floor(samples.length*.72),samples.length);
  const surface=dark.map(value=>value*.42) as [number,number,number];
  // Ink contrast belongs to the derived card surface, not the brighter source
  // sample it came from. This matters most for sparse white artwork with a
  // small dark motif, where the old comparison could choose dark-on-dark.
  return {primary:hex(...mid),secondary:hex(...dark),surface:hex(...surface),onSurface:luminance(surface)<145?'#ffffff':'#111111',accent:hex(...light)};
}
