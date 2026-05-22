import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.neebooks.ams',
  appName: '爱灵慕圣书报',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
};

export default config;
