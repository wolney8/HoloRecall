export interface DataPage {
  pageIndex: number;
  pageSize: number;
}

export function clampPageIndex(pageIndex:number,pageSize:number,length:number):number{
  const last=Math.max(0,Math.ceil(length/Math.max(1,pageSize))-1);
  return Math.min(Math.max(0,pageIndex),last);
}

export function pageItems<T>(items:readonly T[],pageIndex:number,pageSize:number):readonly T[]{
  const size=Math.max(1,pageSize),index=clampPageIndex(pageIndex,size,items.length);
  return items.slice(index*size,index*size+size);
}
