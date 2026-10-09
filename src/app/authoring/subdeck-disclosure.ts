import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector:'hr-subdeck-disclosure',standalone:true,imports:[MatButtonModule],
  template:`<div><h3>Subdecks</h3><button mat-button type="button" (click)="toggle.emit()" [attr.aria-expanded]="expanded" [attr.aria-controls]="controls">{{expanded?'Hide':'Show'}} {{count}} subdecks</button></div>`,
  styles:[`div{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--mat-sys-outline-variant)}h3{margin:0;font:var(--mat-sys-title-medium)}@media(max-width:580px){div{align-items:flex-start;flex-direction:column}button{align-self:stretch}}`]
})
export class SubdeckDisclosureComponent{
  @Input() count=0;@Input() expanded=false;@Input() controls='';@Output() readonly toggle=new EventEmitter<void>();
}
