import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import type { LockedCollectibleTeaser } from '../../domain/collection';
import { RARITIES } from '../../domain/rewards';

@Component({
  selector: 'hr-locked-collectible',
  standalone: true,
  imports: [MatProgressBarModule],
  template: `
    <button type="button" class="locked-collectible" (click)="opened.emit(teaser)"
      [attr.aria-label]="accessibleLabel()" [attr.data-rarity]="teaser.rarity">
      <span class="locked-frame" aria-hidden="true"><i class="lock-mark">◇</i><i class="lock-keyhole"></i></span>
      <span class="locked-copy"><span class="locked-label">Locked</span><strong>Card {{pad(teaser.position)}} / {{teaser.setSize}}</strong><span>{{rarityName()}}</span><small>{{teaser.days}} / {{teaser.required}} qualifying days</small></span>
      <mat-progress-bar mode="determinate" [value]="teaser.ratio*100" aria-hidden="true"/>
    </button>
  `,
  styles: [`
    :host{display:block;min-width:0}.locked-collectible{width:100%;min-height:15rem;display:grid;grid-template-rows:1fr auto auto;gap:var(--space-3);padding:var(--space-4);border:1px solid var(--mat-sys-outline-variant);border-radius:var(--mat-sys-corner-extra-large,28px);background:linear-gradient(145deg,var(--mat-sys-surface-container-high),var(--mat-sys-surface-container-low));color:var(--mat-sys-on-surface);font:inherit;text-align:left;cursor:pointer;overflow:hidden}.locked-collectible:hover{border-color:var(--mat-sys-primary);box-shadow:var(--mat-sys-level2)}.locked-collectible:focus-visible{outline:3px solid var(--mat-sys-primary);outline-offset:3px}.locked-frame{min-height:7.5rem;border:2px solid color-mix(in srgb,var(--mat-sys-primary) 35%,var(--mat-sys-outline-variant));border-radius:18px;display:grid;place-items:center;position:relative;background:repeating-linear-gradient(135deg,transparent 0 12px,color-mix(in srgb,var(--mat-sys-primary) 5%,transparent) 12px 13px)}.locked-frame::after{content:'';position:absolute;inset:8px;border:1px solid var(--mat-sys-outline-variant);border-radius:12px}.lock-mark{font-style:normal;font-size:3rem;color:var(--mat-sys-primary);opacity:.6}.lock-keyhole{position:absolute;width:.55rem;height:.7rem;border-radius:50% 50% 35% 35%;background:var(--mat-sys-on-surface-variant)}.locked-copy{display:grid;gap:3px}.locked-copy strong{font:var(--mat-sys-title-medium)}.locked-copy span:not(.locked-label),.locked-copy small{font:var(--mat-sys-body-small);color:var(--mat-sys-on-surface-variant)}.locked-label{font:var(--mat-sys-label-small);letter-spacing:.12em;text-transform:uppercase;color:var(--mat-sys-primary)}
  `],
})
export class LockedCollectibleComponent {
  @Input({required:true}) teaser!:LockedCollectibleTeaser;
  @Output() readonly opened=new EventEmitter<LockedCollectibleTeaser>();
  rarityName():string{return RARITIES.find(item=>item.id===this.teaser.rarity)?.label??'Common';}
  pad(value:number):string{return String(value).padStart(2,'0');}
  accessibleLabel():string{return `Locked ${this.rarityName()} card, ${this.teaser.days} of ${this.teaser.required} qualifying days, card ${this.teaser.position} of ${this.teaser.setSize}.`;}
}
