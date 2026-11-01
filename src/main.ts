import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app';

bootstrapApplication(AppComponent).catch(error => {
  console.error('[HoloRecall bootstrap]', error);
  const root = document.querySelector('app-root');
  if (!root) return;
  root.innerHTML = '<main class="preboot preboot-error" role="alert" aria-labelledby="fatal-boot-title"><img src="brand/holorecall-mark.svg" alt=""><strong id="fatal-boot-title">HoloRecall couldn\'t finish starting.</strong><span>Your data remains on this device.</span><button type="button">Try again</button></main>';
  root.querySelector('button')?.addEventListener('click', () => location.reload());
});
