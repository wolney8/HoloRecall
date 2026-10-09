import type {FinishPreset} from './models';

export type CardMotionTreatment='none'|'specular-sweep'|'tilt-parallax'|'sparkle-burst'|'soft-aura-pulse'|'rarity-reveal-flare';
export type CardFrameTreatment='classic'|'borderless'|'full-art'|'showcase'|'lesson-themed'|'relic'|'seasonal';
export interface FinishTreatment {id:FinishPreset;label:string;motion:CardMotionTreatment;texture:'none'|'metal'|'foil'|'stars'|'facets'|'ink'|'stone'}

/** Portable treatments; Effects Off and reduced motion suppress every animated layer. */
export const FINISH_TREATMENTS:readonly FinishTreatment[]=[
  {id:'matte',label:'Matte',motion:'none',texture:'none'},{id:'gloss',label:'Gloss',motion:'specular-sweep',texture:'none'},
  {id:'metallic',label:'Soft metallic foil',motion:'specular-sweep',texture:'metal'},{id:'holographic',label:'Directional holographic',motion:'tilt-parallax',texture:'foil'},
  {id:'reverse-holo',label:'Reverse holo',motion:'specular-sweep',texture:'foil'},{id:'prismatic',label:'Prismatic rainbow',motion:'soft-aura-pulse',texture:'foil'},
  {id:'etched',label:'Etched metallic',motion:'none',texture:'metal'},{id:'textured-foil',label:'Textured foil',motion:'specular-sweep',texture:'foil'},
  {id:'starfield',label:'Cosmos starfield',motion:'sparkle-burst',texture:'stars'},{id:'shattered-glass',label:'Shattered glass',motion:'specular-sweep',texture:'facets'},
  {id:'crystal',label:'Faceted crystal',motion:'specular-sweep',texture:'facets'},{id:'gilded',label:'Gold foil edges',motion:'rarity-reveal-flare',texture:'metal'},
  {id:'neon-ink',label:'Neon ink',motion:'soft-aura-pulse',texture:'ink'},{id:'obsidian',label:'Obsidian',motion:'specular-sweep',texture:'stone'},
  {id:'aurora',label:'Aurora premium',motion:'soft-aura-pulse',texture:'foil'},
];

export const FRAME_TREATMENTS:readonly {id:CardFrameTreatment;implementedBy?:'clean'|'ornate'|'showcase'}[]=[
  {id:'classic',implementedBy:'clean'},{id:'showcase',implementedBy:'showcase'},{id:'relic',implementedBy:'ornate'},
  {id:'borderless'},{id:'full-art'},{id:'lesson-themed'},{id:'seasonal'},
];
