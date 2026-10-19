import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector:'hr-desk-stack',standalone:true,imports:[MatProgressBarModule],
  template:`<button type="button" class="desk-stack" (click)="opened.emit(deckId)" [attr.aria-label]="name+', '+earned+' of '+total+' collected'">
    <span class="stack-backs" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    <span class="stack-top"><span class="stack-mark" aria-hidden="true">✦</span><strong>{{name}}</strong><small>{{earned}} / {{total}} collected</small><mat-progress-bar mode="determinate" [value]="percent"/></span>
  </button>`,
  styles:[`:host{display:block;width:min(100%,220px)}.desk-stack{position:relative;width:100%;aspect-ratio:2/3;border:0;background:transparent;color:var(--mat-sys-on-surface);font:inherit;cursor:pointer;padding:0}.stack-backs,.stack-top{position:absolute;inset:0;border:2px solid var(--mat-sys-outline-variant);border-radius:20px;background:var(--mat-sys-surface-container-high);box-shadow:var(--mat-sys-level2)}.stack-backs i{position:absolute;inset:0;border:inherit;border-radius:inherit;background:var(--mat-sys-surface-container);transform:translate(calc(var(--layer)*-4px),calc(var(--layer)*4px));z-index:calc(-1*var(--layer))}.stack-backs i:nth-child(1){--layer:1}.stack-backs i:nth-child(2){--layer:2}.stack-backs i:nth-child(3){--layer:3}.stack-backs i:nth-child(4){--layer:4}.stack-top{display:grid;grid-template-rows:1fr auto auto auto;gap:10px;padding:22px;text-align:left;overflow:hidden;background:linear-gradient(145deg,color-mix(in srgb,var(--mat-sys-primary) 10%,var(--mat-sys-surface-container-low)),var(--mat-sys-surface-container-low))}.stack-top::before{content:'';position:absolute;inset:12px;border:1px solid var(--mat-sys-outline-variant);border-radius:13px}.stack-mark{align-self:center;justify-self:center;font-size:3rem;color:var(--mat-sys-primary);opacity:.64}.stack-top strong,.stack-top small,.stack-top mat-progress-bar{position:relative;z-index:1}.stack-top strong{font:var(--mat-sys-title-medium)}.stack-top small{color:var(--mat-sys-on-surface-variant)}.desk-stack:hover .stack-top,.desk-stack:focus-visible .stack-top{border-color:var(--mat-sys-primary)}.desk-stack:focus-visible{outline:3px solid var(--mat-sys-primary);outline-offset:7px;border-radius:20px}`],
})
export class DeskStackComponent {
  @Input({required:true}) deckId='';@Input({required:true}) name='';@Input() earned=0;@Input() total=0;@Input() percent=0;
  @Output() readonly opened=new EventEmitter<string>();
}
