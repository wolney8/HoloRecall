import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

export type DeckManagementAction = 'add-card' | 'add-subdeck' | 'import' | 'study-settings' | 'edit' | 'toggle-archive';

@Component({
  selector: 'hr-deck-journey-actions',
  standalone: true,
  imports: [MatButtonModule],
  template: `
    <div class="primary-actions" aria-label="Deck actions">
      <button mat-flat-button type="button" (click)="study.emit()" [disabled]="disabled || archived">Study</button>
      <button mat-stroked-button type="button" (click)="focus.emit()" [disabled]="archived">Focus</button>
      <details #menu class="management-menu" (keydown.escape)="menu.open = false"><summary role="button" aria-label="More deck actions">More</summary><div role="menu">
        <button type="button" role="menuitem" (click)="choose(menu, 'add-card')" [disabled]="archived">Add card</button>
        <button type="button" role="menuitem" (click)="choose(menu, 'add-subdeck')" [disabled]="archived">Add subdeck</button>
        @if (allowImport) { <button type="button" role="menuitem" (click)="choose(menu, 'import')">Import content</button> }
        <button type="button" role="menuitem" (click)="choose(menu, 'study-settings')">Study settings</button>
        <button type="button" role="menuitem" (click)="choose(menu, 'edit')">Edit deck</button>
        <button type="button" role="menuitem" (click)="choose(menu, 'toggle-archive')">{{ archived ? 'Restore deck' : 'Archive deck' }}</button>
      </div></details>
    </div>
  `,
  styles: [`:host{display:block}.primary-actions{display:flex;align-items:center;gap:.75rem;flex-wrap:nowrap}.management-menu{position:relative;border:0;padding:0;margin:0}.management-menu summary{display:grid;place-items:center;min-width:4rem;min-height:2.5rem;padding:0 .75rem;border-radius:999px;cursor:pointer;font:var(--mat-sys-label-large);list-style:none;color:var(--mat-sys-primary)}.management-menu summary::-webkit-details-marker{display:none}.management-menu summary:hover,.management-menu summary:focus-visible{background:var(--mat-sys-surface-container-high)}.management-menu>div{position:absolute;z-index:20;inset:auto 0 auto auto;display:grid;min-width:12rem;padding:.5rem;border-radius:var(--mat-sys-corner-medium);background:var(--mat-sys-surface-container);box-shadow:var(--mat-sys-level2)}.management-menu button{border:0;background:transparent;color:var(--mat-sys-on-surface);min-height:3rem;padding:.65rem .8rem;text-align:start;border-radius:var(--mat-sys-corner-small);font:var(--mat-sys-label-large);cursor:pointer}.management-menu button:hover,.management-menu button:focus-visible{background:var(--mat-sys-surface-container-high)}.management-menu button:disabled{opacity:.45;cursor:default}@media(max-width:580px){.primary-actions{width:100%}.primary-actions>button{flex:1}.management-menu{margin-left:auto}.management-menu>div{position:fixed;inset:auto 1rem calc(env(safe-area-inset-bottom,0px) + 1rem);min-width:min(20rem,calc(100vw - 2rem));padding:.75rem;border-radius:var(--mat-sys-corner-large)}}`],
})
export class DeckJourneyActionsComponent {
  @Input() disabled = false;
  @Input() archived = false;
  @Input() allowImport = false;
  @Output() readonly study = new EventEmitter<void>();
  @Output() readonly focus = new EventEmitter<void>();
  @Output() readonly manage = new EventEmitter<DeckManagementAction>();

  choose(menu: HTMLDetailsElement, action: DeckManagementAction): void {
    menu.open = false;
    this.manage.emit(action);
  }
}
