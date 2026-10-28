import { Injectable, Injector, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DesignStudioExitGuard {
  readonly dirty = signal(false);
  register(): () => void { return () => this.dirty.set(false); }
  approveExit(): void { this.dirty.set(false); }
  constructor(private readonly injector: Injector) {}
  async confirm(action: 'leave' | 'switch' | 'new' | 'revert' = 'leave'): Promise<boolean> {
    if (!this.dirty()) return true;
    const [{ MatDialog }, { UnsavedDesignDialogComponent }] = await Promise.all([import('@angular/material/dialog'), import('./design-studio-dialogs')]);
    const dialog = this.injector.get(MatDialog);
    return !!await firstValueFrom(dialog.open(UnsavedDesignDialogComponent, { data: { action }, autoFocus: 'first-tabbable', restoreFocus: true, maxWidth: 'min(94vw, 30rem)' }).afterClosed());
  }
}
