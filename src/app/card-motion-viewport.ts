import { Component, Input } from '@angular/core';

@Component({
  selector:'hr-card-motion-viewport',
  standalone:true,
  template:'<div class="card-motion-viewport" [attr.data-scale]="scale"><ng-content/></div>',
  styles:[`
    :host{display:block;min-width:0;width:100%}
    .card-motion-viewport{--card-motion-paint-margin:48px;position:relative;isolation:isolate;width:100%;min-width:0;overflow:clip;overflow-clip-margin:var(--card-motion-paint-margin)}
    .card-motion-viewport[data-scale=mini]{width:min(100%,230px);margin-inline:auto;--card-motion-paint-margin:32px}
    @supports not (overflow-clip-margin:1px){
      .card-motion-viewport{box-sizing:border-box;width:calc(100% + 2 * var(--card-motion-paint-margin));margin-inline:calc(-1 * var(--card-motion-paint-margin));padding:var(--card-motion-paint-margin)}
      .card-motion-viewport[data-scale=mini]{width:min(100%,294px);margin-inline:auto}
    }
    @media(max-width:580px){.card-motion-viewport[data-scale=mini]{width:min(100%,220px);--card-motion-paint-margin:26px}}
  `],
})
export class CardMotionViewportComponent {
  @Input() scale:'focal'|'mini'='focal';
}
