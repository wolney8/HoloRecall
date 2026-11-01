import { DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { LocalStudyStore } from './data/study-store';

export type ThemeChoice = 'light' | 'dark' | 'system';
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly store = inject(LocalStudyStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly systemDark = matchMedia('(prefers-color-scheme: dark)');
  readonly choice = signal<ThemeChoice>((document.documentElement.dataset['theme'] as ThemeChoice) || 'system');
  readonly resolved = signal<'light'|'dark'>(this.systemDark.matches?'dark':'light');
  constructor() {
    const syncSystem=()=>{if(this.choice()==='system')this.apply('system');};
    this.systemDark.addEventListener('change',syncSystem);
    this.destroyRef.onDestroy(()=>this.systemDark.removeEventListener('change',syncSystem));
    effect(() => {
      const state = this.store.data();
      if (state) this.apply(state.preferences.theme ?? 'system');
    });
  }
  private apply(choice: ThemeChoice): void {
    const resolved=choice==='system'?(this.systemDark.matches?'dark':'light'):choice;
    this.choice.set(choice);
    this.resolved.set(resolved);
    document.documentElement.dataset['theme'] = choice;
    document.documentElement.dataset['resolvedTheme']=resolved;
    document.documentElement.style.colorScheme = resolved;
    if(Capacitor.isNativePlatform())void SystemBars.setStyle({style:resolved==='dark'?SystemBarsStyle.Dark:SystemBarsStyle.Light}).catch(()=>{/* Web surfaces remain correctly themed if the native bridge is unavailable. */});
    try { localStorage.setItem('holorecall-theme', choice); } catch { /* IndexedDB remains authoritative. */ }
  }
  async select(choice: ThemeChoice): Promise<void> {
    const previous=this.choice();
    this.apply(choice);
    try { await this.store.updatePreferences({ theme: choice }); }
    catch (error) { this.apply(previous); throw error; }
  }
}
