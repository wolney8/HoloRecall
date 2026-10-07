import type { CardContent, ContentImport, Deck, DesignSet, LocalAsset, State } from './models';

export interface MediaReference { owner: 'card'|'deck'|'design'; ownerId: string; field: string }
export interface MediaRegistry { assets: Map<string,LocalAsset>; references: Map<string,MediaReference[]>; byHash: Map<string,string> }
const assetId=(ref?:string):string|undefined=>ref?.startsWith('asset:')?ref.slice(6):undefined;

export function buildMediaRegistry(state:Pick<State,'assets'|'cards'|'decks'|'designs'>):MediaRegistry{
  const assets=new Map(state.assets.map(asset=>[asset.id,asset])),references=new Map<string,MediaReference[]>(),byHash=new Map<string,string>();
  const add=(ref:string|undefined,entry:MediaReference)=>{const id=assetId(ref);if(id)references.set(id,[...(references.get(id)??[]),entry]);};
  for(const asset of state.assets)if(asset.contentHash&&!byHash.has(asset.contentHash))byHash.set(asset.contentHash,asset.id);
  for(const card of state.cards){add(card.image,{owner:'card',ownerId:card.id,field:'front image'});add(card.backImage,{owner:'card',ownerId:card.id,field:'answer image'});card.frontAudio?.forEach(ref=>add(ref,{owner:'card',ownerId:card.id,field:'front audio'}));card.backAudio?.forEach(ref=>add(ref,{owner:'card',ownerId:card.id,field:'answer audio'}));}
  for(const deck of state.decks)add(deck.coverImage,{owner:'deck',ownerId:deck.id,field:'cover image'});
  for(const design of state.designs){add(design.background,{owner:'design',ownerId:design.id,field:'background'});add(design.frame,{owner:'design',ownerId:design.id,field:'frame'});add(design.texture,{owner:'design',ownerId:design.id,field:'texture'});Object.entries(design.frames??{}).forEach(([field,ref])=>add(ref,{owner:'design',ownerId:design.id,field:`${field} frame`}));}
  return{assets,references,byHash};
}
function decode(dataUrl:string):Uint8Array{const binary=atob(dataUrl.slice(dataUrl.indexOf(',')+1)),result=new Uint8Array(binary.length);for(let index=0;index<binary.length;index++)result[index]=binary.charCodeAt(index);return result;}
export async function describeAsset(asset:LocalAsset):Promise<LocalAsset>{const data=decode(asset.dataUrl),copy=new Uint8Array(data.byteLength);copy.set(data);const digest=await crypto.subtle.digest('SHA-256',copy.buffer);return{...asset,contentHash:`sha256:${[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('')}`,byteLength:data.byteLength};}
const replaceRef=(ref:string|undefined,replacements:Map<string,string>):string|undefined=>{const id=assetId(ref);return id&&replacements.has(id)?`asset:${replacements.get(id)}`:ref;};
function replaceCard(card:CardContent,replacements:Map<string,string>):CardContent{return{...card,image:replaceRef(card.image,replacements),backImage:replaceRef(card.backImage,replacements),frontAudio:card.frontAudio?.map(ref=>replaceRef(ref,replacements)!),backAudio:card.backAudio?.map(ref=>replaceRef(ref,replacements)!)};}
function replaceDeck(deck:Deck,replacements:Map<string,string>):Deck{return{...deck,coverImage:replaceRef(deck.coverImage,replacements)};}
function replaceDesign(design:DesignSet,replacements:Map<string,string>):DesignSet{return{...design,background:replaceRef(design.background,replacements),frame:replaceRef(design.frame,replacements),texture:replaceRef(design.texture,replacements),frames:design.frames&&Object.fromEntries(Object.entries(design.frames).map(([key,ref])=>[key,replaceRef(ref,replacements)]))};}
export async function deduplicateContent(existing:Pick<State,'assets'|'cards'|'decks'|'designs'>,bundle:ContentImport):Promise<{bundle:ContentImport;replacements:Map<string,string>}>{
  const known=buildMediaRegistry(existing),replacements=new Map<string,string>(),assets:LocalAsset[]=[];
  for(const raw of bundle.assets){const asset=await describeAsset(raw),duplicate=known.byHash.get(asset.contentHash!),knownAsset=duplicate?(known.assets.get(duplicate)??assets.find(item=>item.id===duplicate)):undefined;if(duplicate&&knownAsset?.mime===asset.mime){replacements.set(asset.id,duplicate);continue;}known.byHash.set(asset.contentHash!,asset.id);known.assets.set(asset.id,asset);assets.push(asset);}
  return{replacements,bundle:{decks:bundle.decks.map(deck=>replaceDeck(deck,replacements)),cards:bundle.cards.map(card=>replaceCard(card,replacements)),designs:bundle.designs.map(design=>replaceDesign(design,replacements)),assets}};
}
export function removableAssets(state:Pick<State,'assets'|'cards'|'decks'|'designs'>):LocalAsset[]{const registry=buildMediaRegistry(state);return state.assets.filter(asset=>!(registry.references.get(asset.id)?.length));}
