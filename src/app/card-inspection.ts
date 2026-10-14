import { inject, Injectable, Injector, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { CardContent } from '../domain/models';
import type { CardInspectionRequest } from './card';

@Injectable({providedIn:'root'})
export class CardInspectionService {
  private readonly injector=inject(Injector);
  private readonly openCount=signal(0);
  readonly active=()=>this.openCount()>0;

  async open(card:CardContent,request:CardInspectionRequest,imageUrl:string):Promise<void>{
    this.openCount.update(value=>value+1);
    try{
      const [{MatDialog},{CardInspectionDialogComponent}]=await Promise.all([import('@angular/material/dialog'),import('./card-inspection-dialog')]);
      const dialog=this.injector.get(MatDialog);
      await firstValueFrom(dialog.open(CardInspectionDialogComponent,{data:{card:structuredClone(card),revealed:request.revealed,imageUrl},panelClass:'card-inspection-panel',backdropClass:'card-inspection-backdrop',maxWidth:'96vw',maxHeight:'96dvh',autoFocus:'first-tabbable',restoreFocus:false}).afterClosed());
    }
    finally{this.openCount.update(value=>Math.max(0,value-1));if(request.opener.isConnected)request.opener.focus({preventScroll:true});}
  }
}
