import { inject, Injectable, Injector } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { CardContent } from '../domain/models';
import type { CardInspectionRequest } from './card';

@Injectable({providedIn:'root'})
export class CardInspectionService {
  private readonly injector=inject(Injector);

  async open(card:CardContent,request:CardInspectionRequest,imageUrl:string):Promise<void>{
    const [{MatDialog},{CardInspectionDialogComponent}]=await Promise.all([import('@angular/material/dialog'),import('./card-inspection-dialog')]);
    const dialog=this.injector.get(MatDialog);
    try{await firstValueFrom(dialog.open(CardInspectionDialogComponent,{data:{card:structuredClone(card),revealed:request.revealed,imageUrl},panelClass:'card-inspection-panel',backdropClass:'card-inspection-backdrop',maxWidth:'96vw',maxHeight:'96dvh',autoFocus:'first-tabbable',restoreFocus:false}).afterClosed());}
    finally{if(request.opener.isConnected)request.opener.focus({preventScroll:true});}
  }
}
