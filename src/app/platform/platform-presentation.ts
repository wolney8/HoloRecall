import { Injectable, signal } from '@angular/core';

interface CapacitorPlatformSignal { isNativePlatform(): boolean; getPlatform(): string }
export function isNativeIosPlatform(capacitor: CapacitorPlatformSignal): boolean {
  return capacitor.isNativePlatform() && capacitor.getPlatform() === 'ios';
}

/** Shell identity only. Responsive layout remains a separate concern. */
@Injectable({ providedIn: 'root' })
export class PlatformPresentation {
  readonly nativeIos = signal(false);
  constructor() {
    void import('@capacitor/core').then(({ Capacitor }) => this.nativeIos.set(isNativeIosPlatform(Capacitor)));
  }
}
