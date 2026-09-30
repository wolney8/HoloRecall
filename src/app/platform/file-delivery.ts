import { DestroyRef, Injectable, InjectionToken, inject } from '@angular/core';

export interface FileDelivery {
  deliver(blob: Blob, suggestedName: string): Promise<void>;
}

@Injectable({ providedIn: 'root' })
export class BrowserFileDelivery implements FileDelivery {
  private readonly urls = new Set<string>();

  constructor() {
    const release = () => this.releaseAll();
    window.addEventListener('pagehide', release);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('pagehide', release);
      this.releaseAll();
    });
  }

  async deliver(blob: Blob, suggestedName: string): Promise<void> {
    const url = URL.createObjectURL(blob);
    this.urls.add(url);
    const link = document.createElement('a');
    link.href = url;
    link.download = suggestedName;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    // The browser has accepted the request; it cannot report whether the user retained the file.
    window.setTimeout(() => this.release(url), 1_000);
  }

  private release(url: string): void {
    if (!this.urls.delete(url)) return;
    URL.revokeObjectURL(url);
  }

  private releaseAll(): void {
    for (const url of [...this.urls]) this.release(url);
  }
}

export const FILE_DELIVERY = new InjectionToken<FileDelivery>('FileDelivery', {
  providedIn: 'root',
  factory: () => inject(BrowserFileDelivery),
});
