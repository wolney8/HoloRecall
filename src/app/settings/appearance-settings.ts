import { Component, inject, signal } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { LocalStudyStore } from '../data/study-store';
import { InteractionFeedback } from '../platform/interaction-feedback';

@Component({
  selector: 'hr-appearance-settings',
  standalone: true,
  imports: [MatSlideToggleModule],
  template: `<h2>Appearance and motion</h2><p>Use the Light, Dark and System control above to choose an appearance. System follows your device until you save a choice.</p><mat-slide-toggle [checked]="store.data()!.preferences.effects" (change)="toggleEffects()">Card effects</mat-slide-toggle><p class="hint">Pointer tilt, reveal and deal transitions, and rarity effects. Reduced motion overrides this setting. Effects stop offscreen and in background tabs.</p>@if(feedback.available()){<mat-slide-toggle [checked]="store.data()!.preferences.haptics!==false" (change)="toggleHaptics()">Haptics</mat-slide-toggle><p class="hint">Subtle tactile feedback for card actions and real achievements. This setting is separate from motion.</p>}@if(error()){<p class="inline-notice" role="alert">{{error()}}</p>}`,
})
export class AppearanceSettingsComponent {
  readonly store=inject(LocalStudyStore);
  readonly feedback=inject(InteractionFeedback);
  readonly error=signal('');
  async toggleEffects():Promise<void>{try{await this.store.updatePreferences({effects:!this.store.data()?.preferences.effects});this.error.set('');}catch(error){this.error.set(error instanceof Error?error.message:'Card effects could not be saved.');}}
  async toggleHaptics():Promise<void>{try{await this.store.updatePreferences({haptics:this.store.data()?.preferences.haptics===false});this.error.set('');}catch(error){this.error.set(error instanceof Error?error.message:'Haptics could not be saved.');}}
}
