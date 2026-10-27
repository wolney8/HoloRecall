import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { clampPageIndex } from './data-page';

@Component({
  selector:'hr-data-pagination',
  standalone:true,
  imports:[MatPaginatorModule],
  changeDetection:ChangeDetectionStrategy.OnPush,
  template:`<mat-paginator
    [length]="length()"
    [pageIndex]="validPageIndex()"
    [pageSize]="pageSize()"
    [pageSizeOptions]="pageSizeOptions()"
    [showFirstLastButtons]="true"
    [hidePageSize]="!showPageSize()"
    [attr.aria-label]="ariaLabel()"
    (page)="page.emit($event)"/>
    <span class="pagination-status" aria-live="polite">{{rangeLabel()}}</span>`,
  styles:[`:host{display:block}.pagination-status{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}`],
})
export class DataPaginationComponent{
  readonly length=input.required<number>();
  readonly pageIndex=input.required<number>();
  readonly pageSize=input.required<number>();
  readonly pageSizeOptions=input<readonly number[]>([10,25,50]);
  readonly showPageSize=input(true);
  readonly ariaLabel=input('Choose a page');
  readonly page=output<PageEvent>();
  readonly validPageIndex=computed(()=>clampPageIndex(this.pageIndex(),this.pageSize(),this.length()));
  readonly rangeLabel=computed(()=>{
    const length=this.length();
    if(!length)return'No results';
    const start=this.validPageIndex()*this.pageSize()+1;
    return`${start}–${Math.min(start+this.pageSize()-1,length)} of ${length}`;
  });
}
