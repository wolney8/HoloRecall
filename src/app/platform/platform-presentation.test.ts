import { describe, expect, it } from 'vitest';
import { isNativeIosPlatform } from './platform-presentation';

describe('platform presentation', () => {
  it('uses the native Capacitor identity rather than viewport width', () => {
    expect(isNativeIosPlatform({ isNativePlatform: () => true, getPlatform: () => 'ios' })).toBe(true);
    expect(isNativeIosPlatform({ isNativePlatform: () => false, getPlatform: () => 'ios' })).toBe(false);
    expect(isNativeIosPlatform({ isNativePlatform: () => true, getPlatform: () => 'android' })).toBe(false);
  });
});
