import { Component, inject, Input } from '@angular/core';
import type { CardContent, CardDetail, SafeContentBlock } from '../domain/models';
import { plainSafeContentText, safeContentBlocks } from '../domain/safe-content';
import { LocalStudyStore } from './data/study-store';

@Component({selector:'hr-answer-support',standalone:true,template:`<details class="answer-support"><summary>Answer Support</summary><div class="support-body">
@if(showMeaning){<section><h3>Natural English / interpretation</h3><p>{{card.meaning||card.interpretation}}</p></section>}
@for(detail of card.details??[];track $index){<section><h3>{{detail.label}}</h3>@for(block of blocks(detail);track $index){@switch(block.type){@case('heading'){<h4>{{block.text}}</h4>}@case('paragraph'){<p>{{block.text}}</p>}@case('pairs'){<dl class="support-pairs">@for(row of block.rows;track $index){<div><dt>{{row.term}}</dt><dd>{{row.description}}</dd></div>}</dl>}@case('list'){@if(block.ordered){<ol>@for(item of block.items;track $index){<li>{{item}}</li>}</ol>}@else{<ul>@for(item of block.items;track $index){<li>{{item}}</li>}</ul>}}@case('table'){<div class="support-table"><table>@if(block.headers.length){<thead><tr>@for(cell of block.headers;track $index){<th scope="col">{{cell}}</th>}</tr></thead>}<tbody>@for(row of block.rows;track $index){<tr>@for(cell of row;track $index){<td>{{cell}}</td>}</tr>}</tbody></table></div>}@case('code'){<pre><code>{{block.text}}</code></pre>}}}</section>}
@if(localNotes){<section><h3>Local notes</h3><p>{{localNotes}}</p></section>}
</div></details>`,styles:[`:host{display:block;min-width:0}.answer-support{border:1px solid var(--mat-sys-outline-variant);border-radius:var(--mat-sys-corner-large,16px);padding:0;margin:0;background:var(--mat-sys-surface-container-low)}summary{cursor:pointer;min-height:48px;display:flex;align-items:center;padding:0 var(--space-4);font:var(--mat-sys-title-small);color:var(--mat-sys-on-surface)}.support-body{display:grid;gap:var(--space-4);padding:0 var(--space-4) var(--space-4)}section{min-width:0;border-top:1px solid var(--mat-sys-outline-variant);padding-top:var(--space-3)}h3,h4{margin:0 0 var(--space-2)}h3{font:var(--mat-sys-title-small)}h4{font:var(--mat-sys-label-large)}p,li{font:var(--mat-sys-body-medium);line-height:1.55;color:var(--mat-sys-on-surface-variant);white-space:pre-line;overflow-wrap:anywhere}p{margin:0}ol,ul{margin:.35rem 0;padding-inline-start:1.4rem}.support-pairs{display:grid;gap:var(--space-2);margin:0}.support-pairs div{display:grid;grid-template-columns:minmax(5rem,.7fr) minmax(0,1.3fr);gap:var(--space-3);padding:.45rem 0;border-bottom:1px solid color-mix(in srgb,var(--mat-sys-outline-variant) 65%,transparent)}.support-pairs dt{font:var(--mat-sys-title-small);overflow-wrap:anywhere}.support-pairs dd{margin:0;color:var(--mat-sys-on-surface-variant);font:var(--mat-sys-body-medium)}.support-table{max-width:100%;overflow:auto}table{border-collapse:collapse;width:max-content;min-width:100%}th,td{padding:.55rem .7rem;border:1px solid var(--mat-sys-outline-variant);text-align:start;vertical-align:top;white-space:pre-line}th{font:var(--mat-sys-label-medium);background:var(--mat-sys-surface-container)}td{font:var(--mat-sys-body-small)}pre{overflow:auto;padding:var(--space-3);border-radius:10px;background:var(--mat-sys-surface-container-high)}@media(max-width:580px){summary{padding-inline:var(--space-3)}.support-body{padding:0 var(--space-3) var(--space-3)}.support-pairs div{grid-template-columns:1fr;gap:2px}}`]})
export class AnswerSupportComponent{
  private readonly store=inject(LocalStudyStore);
  private readonly blockCache=new WeakMap<CardDetail,SafeContentBlock[]>();
  @Input({required:true})card!:CardContent;
  @Input()interpretationOnCard=false;
  get showMeaning():boolean{return !this.interpretationOnCard&&!!(this.card.meaning||this.card.interpretation)}
  get localNotes():string{return this.card.notes.replace(/^Imported source\s*·[^\n]*(?:\n\n)?/i,'').trim()}
  blocks(detail:CardDetail):SafeContentBlock[]{
    const cached=this.blockCache.get(detail);if(cached)return cached;
    if(detail.blocks?.length){this.blockCache.set(detail,detail.blocks);return detail.blocks;}
    const source=this.card.ankiSource,state=this.store.data();
    if(source&&state){
      const snapshot=state.ankiSources.find(item=>item.id===source.sourceSnapshotId),note=snapshot?.notes.find(item=>item.guid===source.noteGuid);
      if(note)for(const raw of Object.values(note.fields)){const comparable=(value:string)=>value.replace(/\s+/gu,'');if(comparable(plainSafeContentText(raw))!==comparable(detail.content))continue;const blocks=safeContentBlocks(raw);if(blocks.length>1||blocks.some(block=>block.type!=='paragraph')){this.blockCache.set(detail,blocks);return blocks;}}
    }
    const fallback:SafeContentBlock[]=[{type:'paragraph',text:detail.content}];this.blockCache.set(detail,fallback);return fallback;
  }
}
