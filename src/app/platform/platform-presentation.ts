import { DestroyRef, Injectable, inject, signal } from '@angular/core';

interface CapacitorPlatformSignal { isNativePlatform(): boolean; getPlatform(): string }
export function isNativeIosPlatform(capacitor: CapacitorPlatformSignal): boolean {
  return capacitor.isNativePlatform() && capacitor.getPlatform() === 'ios';
}

/** Shell identity only. Responsive layout remains a separate concern. */
@Injectable({ providedIn: 'root' })
export class PlatformPresentation {
  readonly nativeIos = signal(false);
  readonly coarsePointer = signal(typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches);
  constructor() {
    const pointer=typeof matchMedia==='function'?matchMedia('(pointer:coarse)'):undefined;
    const updatePointer=()=>this.coarsePointer.set(!!pointer?.matches);
    pointer?.addEventListener('change',updatePointer);
    inject(DestroyRef).onDestroy(()=>pointer?.removeEventListener('change',updatePointer));
    void import('@capacitor/core').then(({ Capacitor }) => this.nativeIos.set(isNativeIosPlatform(Capacitor)));
  }
}
