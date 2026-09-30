import { computed,DestroyRef,effect,inject,Injectable,signal,untracked } from '@angular/core';
import { buildLibraryIndex, canonicalTags, queryLibrary, type LibraryFilters, type LibraryIndex, type LibrarySort, type SearchResult } from '../../domain/library';
import type { State } from '../../domain/models';
import { AppLifecycle } from '../platform/app-lifecycle';
import { LocalStudyStore } from '../data/study-store';

@Injectable({providedIn:'root'})
export class LibraryViewService{
  private readonly store=inject(LocalStudyStore);
  private readonly lifecycle=inject(AppLifecycle);
  private worker?:Worker;private job=0;
  readonly index=signal<LibraryIndex|null>(null);readonly status=signal<'idle'|'building'|'ready'|'error'>('idle');readonly error=signal('');
  readonly query=signal('');readonly filters=signal<LibraryFilters>({});readonly sort=signal<LibrarySort>('name');readonly visible=signal(60);readonly filtersOpen=signal(false);readonly target=signal<SearchResult|null>(null);
  readonly page=computed(()=>{const index=this.index();return index?queryLibrary(index,{query:this.query(),filters:this.filters(),sort:this.sort(),limit:this.visible()}):{items:[],total:0,results:[]};});
  readonly activeFilterCount=computed(()=>Object.entries(this.filters()).reduce((count,[key,value])=>count+(key==='includeArchived'?value?1:0:Array.isArray(value)?value.length:value?1:0),0));
  readonly tags=computed(()=>[...(this.index()?.tagLabels.values()??[])].sort((a,b)=>a.localeCompare(b)));
  constructor(){effect(()=>{const state=this.store.data();if(state)untracked(()=>this.rebuild(state));});const unsubscribe=this.lifecycle.subscribe(active=>{if(!active)this.cancelBuild();else{const state=this.store.data();if(state&&this.index()?.version!==state.version)this.rebuild(state);}});inject(DestroyRef).onDestroy(()=>{unsubscribe();this.cancelBuild();});}
  private rebuild(state:State):void{
    const id=++this.job;this.cancelBuild(false);this.status.set('building');this.error.set('');
    const searchable={...state,assets:state.assets.map(({dataUrl,...asset})=>({...asset,dataUrl:''}))};
    if(state.cards.length<=500){try{this.index.set(buildLibraryIndex(searchable));this.status.set('ready');}catch(error){this.fail(error);}return;}
    if(typeof Worker==='undefined'){queueMicrotask(()=>{if(id!==this.job)return;try{this.index.set(buildLibraryIndex(searchable));this.status.set('ready');}catch(error){this.fail(error);}});return;}
    try{this.worker=new Worker(new URL('./library-index.worker',import.meta.url));this.worker.onmessage=({data}:{data:{id:number;index?:LibraryIndex;error?:string}})=>{if(data.id!==this.job)return;if(data.error){this.fail(new Error(data.error));return;}this.index.set(data.index!);this.status.set('ready');this.worker?.terminate();this.worker=undefined;};this.worker.onerror=()=>this.fail(new Error('Local library indexing failed. Your cards were not changed.'));this.worker.postMessage({id,state:searchable});}catch(error){this.fail(error);}
  }
  private fail(error:unknown):void{this.worker?.terminate();this.worker=undefined;this.status.set('error');this.error.set(error instanceof Error?error.message:'Local library indexing failed.');}
  private cancelBuild(increment=true):void{this.worker?.terminate();this.worker=undefined;if(increment)this.job++;if(this.status()==='building')this.status.set('idle');}
  setQuery(value:string):void{this.query.set(value);this.visible.set(60);}
  setFilter<K extends keyof LibraryFilters>(key:K,value:LibraryFilters[K]):void{this.filters.update(current=>({...current,[key]:value}));this.visible.set(60);}
  toggleListFilter<K extends 'deckIds'|'tags'|'rarities'|'designSetIds'|'finishes'|'studyStates'|'media'>(key:K,value:NonNullable<LibraryFilters[K]>[number]):void{const current=(this.filters()[key]??[]) as string[],next=current.includes(value as string)?current.filter(item=>item!==value):[...current,value as string];this.setFilter(key,next as LibraryFilters[K]);}
  clear():void{this.filters.set({});this.visible.set(60);}
  removeTag(tag:string):void{this.setFilter('tags',(this.filters().tags??[]).filter(value=>value!==tag));}
  selectResult(result:SearchResult):void{this.target.set(result);if(result.kind==='tag'){const label=this.index()?.tagLabels.get(result.id)??result.label;this.setFilter('tags',[...new Set([...(this.filters().tags??[]),label])]);this.query.set('');}else if(result.kind==='deck'){this.setFilter('deckIds',[result.deckId!]);this.query.set('');}}
  more():void{this.visible.update(value=>Math.min(this.page().total,value+60));}
  allMatchingIds():string[]{const index=this.index();return index?queryLibrary(index,{query:this.query(),filters:this.filters(),sort:this.sort(),limit:index.cards.length}).items.map(item=>item.card.id):[];}
  canonicalize(tags:string[]):string[]{return canonicalTags(tags);}
}
