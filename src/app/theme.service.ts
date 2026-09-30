import { effect, inject, Injectable, signal } from '@angular/core';
import { LocalStudyStore } from './data/study-store';

export type ThemeChoice = 'light' | 'dark' | 'system';
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly store = inject(LocalStudyStore);
  readonly choice = signal<ThemeChoice>((document.documentElement.dataset['theme'] as ThemeChoice) || 'system');
  constructor() {
    effect(() => {
      const state = this.store.data();
      if (state) this.apply(state.preferences.theme ?? 'system');
    });
  }
  private apply(choice: ThemeChoice): void {
    this.choice.set(choice);
    document.documentElement.dataset['theme'] = choice;
    document.documentElement.style.colorScheme = choice === 'system' ? 'light dark' : choice;
    try { localStorage.setItem('holorecall-theme', choice); } catch { /* IndexedDB remains authoritative. */ }
  }
  async select(choice: ThemeChoice): Promise<void> {
    await this.store.updatePreferences({ theme: choice });
    this.apply(choice);
  }
}
