import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.holorecall.app',
  appName: 'HoloRecall',
  webDir: 'dist/holorecall/browser',
  loggingBehavior: 'none',
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
};

export default config;
