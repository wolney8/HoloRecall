import { Component, ElementRef, EventEmitter, inject, Input, Output, QueryList, ViewChildren } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { PlatformPresentation } from '../platform/platform-presentation';

export interface SubviewNavigationItem<T extends string = string> {
  id: T;
  label: string;
  panelId: string;
}

let instance = 0;

@Component({
  selector: 'hr-subview-navigation',
  standalone: true,
  imports: [MatButtonModule],
  template: `
    <nav class="subview-navigation" [class.ios-segmented]="platform.nativeIos()" [attr.data-presentation]="platform.nativeIos() ? 'ios-segmented' : 'web-tabs'" role="tablist" [attr.aria-label]="ariaLabel">
      @for (item of items; track item.id; let index = $index) {
        <button #tab mat-button type="button" role="tab" [id]="tabId(item.id)" [attr.aria-controls]="item.panelId" [attr.aria-selected]="current === item.id" [attr.tabindex]="current === item.id ? 0 : -1" [class.active]="current === item.id" (click)="select(item.id)" (keydown)="onKeydown($event, index)">{{item.label}}</button>
      }
    </nav>
  `,
  styleUrl: './subview-navigation.css',
})
export class SubviewNavigationComponent<T extends string = string> {
  @Input({ required: true }) items: readonly SubviewNavigationItem<T>[] = [];
  @Input({ required: true }) current!: T;
  @Input({ required: true }) ariaLabel = 'Sections';
  @Output() readonly currentChange = new EventEmitter<T>();
  @ViewChildren('tab', { read: ElementRef }) private tabs!: QueryList<ElementRef<HTMLButtonElement>>;
  readonly platform = inject(PlatformPresentation);
  private readonly instanceId = `subview-${++instance}`;

  tabId(id: string): string { return `${this.instanceId}-${id}-tab`; }
  select(id: T): void { if (id !== this.current) this.currentChange.emit(id); }
  onKeydown(event: KeyboardEvent, index: number): void {
    let target: number | undefined;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') target = (index + 1) % this.items.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') target = (index - 1 + this.items.length) % this.items.length;
    if (event.key === 'Home') target = 0;
    if (event.key === 'End') target = this.items.length - 1;
    if (target === undefined) return;
    event.preventDefault();
    this.currentChange.emit(this.items[target]!.id);
    queueMicrotask(() => this.tabs.get(target!)?.nativeElement.focus());
  }
}
