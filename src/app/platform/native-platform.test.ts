import { describe, expect, it, vi } from 'vitest';
import { connectCapacitorLifecycle } from './app-lifecycle';
import { deliverNativeFile } from './file-delivery';
import { connectNativeBack } from './native-navigation';

describe('native platform adapters', () => {
  it('maps official Capacitor lifecycle events and removes every listener', async () => {
    const listeners = new Map<string, (value?: { isActive: boolean }) => void>();
    const removals = [vi.fn(), vi.fn(), vi.fn()];
    const loader = async () => ({
      core: { Capacitor: { isNativePlatform: () => true } },
      app: { App: { addListener: vi.fn(async (name: string, callback: (value?: { isActive: boolean }) => void) => {
        listeners.set(name, callback);
        return { remove: removals[listeners.size - 1]! };
      }) } },
    });
    const states: boolean[] = [];
    const cleanup = await connectCapacitorLifecycle(active => states.push(active), loader as unknown as Parameters<typeof connectCapacitorLifecycle>[1]);
    listeners.get('appStateChange')?.({ isActive: false });
    listeners.get('resume')?.();
    listeners.get('pause')?.();
    expect(states).toEqual([false, true, false]);
    await cleanup();
    expect(removals.every(remove => remove.mock.calls.length === 1)).toBe(true);
  });

  it('writes bytes to a native cache file, shares that URI, and cleans it up', async () => {
    const writeFile = vi.fn(async () => ({ uri: 'file:///cache/export.zip' }));
    const deleteFile = vi.fn(async () => undefined);
    const share = vi.fn(async () => ({ activityType: 'saveToFiles' }));
    const modules = {
      core: { Capacitor: { isNativePlatform: () => true } },
      filesystem: { Directory: { Cache: 'CACHE' }, Filesystem: { writeFile, deleteFile } },
      share: { Share: { canShare: async () => ({ value: true }), share } },
    };
    await deliverNativeFile(new Blob(['HoloRecall'], { type: 'application/zip' }), '../lesson.zip', modules as unknown as Parameters<typeof deliverNativeFile>[2]);
    expect(writeFile).toHaveBeenCalledWith(expect.objectContaining({ path: expect.stringMatching(/^holorecall-exports\/.+-lesson\.zip$/), data: 'SG9sb1JlY2FsbA==', directory: 'CACHE', recursive: true }));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ files: ['file:///cache/export.zip'] }));
    expect(deleteFile).toHaveBeenCalledOnce();
  });

  it('still removes a native temporary file if sharing is cancelled or fails', async () => {
    const deleteFile = vi.fn(async () => undefined);
    const modules = {
      core: { Capacitor: { isNativePlatform: () => true } },
      filesystem: { Directory: { Cache: 'CACHE' }, Filesystem: { writeFile: async () => ({ uri: 'file:///cache/export.xlsx' }), deleteFile } },
      share: { Share: { canShare: async () => ({ value: true }), share: async () => { throw new Error('cancelled'); } } },
    };
    await expect(deliverNativeFile(new Blob(['x']), 'export.xlsx', modules as unknown as Parameters<typeof deliverNativeFile>[2])).rejects.toThrow('cancelled');
    expect(deleteFile).toHaveBeenCalledOnce();
  });

  it('owns Android Back at the shell boundary and removes the listener',async()=>{
    let callback:((event:{canGoBack:boolean})=>void)|undefined;const remove=vi.fn(),exitApp=vi.fn();
    const loader=async()=>({core:{Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'android'}},app:{App:{addListener:vi.fn(async(_name:string,next:(event:{canGoBack:boolean})=>void)=>{callback=next;return{remove};}),exitApp}}});
    const handled=vi.fn(()=>true),cleanup=await connectNativeBack(handled,loader as unknown as Parameters<typeof connectNativeBack>[1]);callback?.({canGoBack:false});expect(handled).toHaveBeenCalledOnce();expect(exitApp).not.toHaveBeenCalled();await cleanup();expect(remove).toHaveBeenCalledOnce();
  });
});
