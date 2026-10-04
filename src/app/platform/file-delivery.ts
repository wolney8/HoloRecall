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

type NativeFileModules = {
  core: typeof import('@capacitor/core');
  filesystem: typeof import('@capacitor/filesystem');
  share: typeof import('@capacitor/share');
};

/** Writes an actual temporary file before presenting the native share surface. */
@Injectable({ providedIn: 'root' })
export class PlatformFileDelivery implements FileDelivery {
  private readonly browser = inject(BrowserFileDelivery);

  async deliver(blob: Blob, suggestedName: string): Promise<void> {
    const modules = await loadNativeFileModules();
    if (!modules.core.Capacitor.isNativePlatform()) return this.browser.deliver(blob, suggestedName);
    return deliverNativeFile(blob, suggestedName, modules);
  }
}

export async function deliverNativeFile(blob: Blob, suggestedName: string, modules: NativeFileModules): Promise<void> {
    const safeName = suggestedName.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^[-.]+/, '') || 'holorecall-export';
    const path = `holorecall-exports/${crypto.randomUUID()}-${safeName}`;
    const data = bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
    const written = await modules.filesystem.Filesystem.writeFile({ path, data, directory: modules.filesystem.Directory.Cache, recursive: true });
    try {
      const capability = await modules.share.Share.canShare();
      if (!capability.value) throw new Error('Sharing files is unavailable on this device.');
      await modules.share.Share.share({ title: safeName, files: [written.uri], dialogTitle: 'Save or share HoloRecall export' });
    } finally {
      await modules.filesystem.Filesystem.deleteFile({ path, directory: modules.filesystem.Directory.Cache }).catch(() => undefined);
    }
}

async function loadNativeFileModules(): Promise<NativeFileModules> {
  return { core: await import('@capacitor/core'), filesystem: await import('@capacitor/filesystem'), share: await import('@capacitor/share') };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
}

export const FILE_DELIVERY = new InjectionToken<FileDelivery>('FileDelivery', {
  providedIn: 'root',
  factory: () => inject(PlatformFileDelivery),
});
