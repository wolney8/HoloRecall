import { Component, inject, signal } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { LocalStudyStore } from '../data/study-store';
import { InteractionFeedback } from '../platform/interaction-feedback';
import { ThemeService, type ThemeChoice } from '../theme.service';
import type { MotionPreference } from '../../domain/models';

@Component({
  selector: 'hr-appearance-settings',
  standalone: true,
  imports: [MatSlideToggleModule, MatButtonToggleModule],
  template: `<h2>Appearance and motion</h2><div class="settings-theme-control"><span id="settings-theme-label">Theme</span><mat-button-toggle-group aria-labelledby="settings-theme-label" [value]="theme.choice()" (change)="setTheme($event.value)"><mat-button-toggle value="light">Light</mat-button-toggle><mat-button-toggle value="dark">Dark</mat-button-toggle><mat-button-toggle value="system">System</mat-button-toggle></mat-button-toggle-group></div><div class="settings-theme-control"><span id="settings-motion-label">Motion</span><mat-button-toggle-group aria-labelledby="settings-motion-label" [value]="store.data()!.preferences.motion??'system'" (change)="setMotion($event.value)"><mat-button-toggle value="system">System</mat-button-toggle><mat-button-toggle value="full">Full</mat-button-toggle><mat-button-toggle value="reduced">Reduced</mat-button-toggle></mat-button-toggle-group></div><p class="hint">System follows your device preference. Reduced keeps material identity while simplifying spatial motion.</p><mat-slide-toggle [checked]="store.data()!.preferences.effects" (change)="toggleEffects()">Card effects</mat-slide-toggle><p class="hint">Controls decorative glare, shimmer, interference and digital facets. Functional card motion remains available separately.</p>@if(feedback.available()){<mat-slide-toggle [checked]="store.data()!.preferences.haptics!==false" (change)="toggleHaptics()">Haptics</mat-slide-toggle><p class="hint">Subtle tactile feedback for card actions and real achievements. This setting is separate from motion.</p>}@if(error()){<p class="inline-notice" role="alert">{{error()}}</p>}`,
  styles: [`.settings-theme-control{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:12px 0 20px}.settings-theme-control>span{font:var(--mat-sys-label-large)}@media(max-width:420px){.settings-theme-control{align-items:flex-start;flex-direction:column}.settings-theme-control mat-button-toggle-group{width:100%}.settings-theme-control mat-button-toggle{flex:1}}`],
})
export class AppearanceSettingsComponent {
  readonly store=inject(LocalStudyStore);
  readonly feedback=inject(InteractionFeedback);
  readonly theme=inject(ThemeService);
  readonly error=signal('');
  async toggleEffects():Promise<void>{try{await this.store.updatePreferences({effects:!this.store.data()?.preferences.effects});this.error.set('');}catch(error){this.error.set(error instanceof Error?error.message:'Card effects could not be saved.');}}
  async toggleHaptics():Promise<void>{try{await this.store.updatePreferences({haptics:this.store.data()?.preferences.haptics===false});this.error.set('');}catch(error){this.error.set(error instanceof Error?error.message:'Haptics could not be saved.');}}
  async setMotion(motion:MotionPreference):Promise<void>{try{await this.store.updatePreferences({motion});this.error.set('');}catch(error){this.error.set(error instanceof Error?error.message:'Motion preference could not be saved.');}}
  async setTheme(choice:ThemeChoice):Promise<void>{try{await this.theme.select(choice);this.error.set('');}catch(error){this.error.set(error instanceof Error?error.message:'Theme could not be saved.');}}
}
