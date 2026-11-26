import type { CapacitorConfig } from '@capacitor/cli';

/**
 * The native shell around the web build. `appId` is a placeholder until the
 * game has its final name: change it before the first store upload, never after.
 */
const config: CapacitorConfig = {
  appId: 'app.projektnova.game',
  appName: 'Projekt Nova',
  webDir: 'dist',
  backgroundColor: '#02030a',
  android: { backgroundColor: '#02030a' },
  ios: { backgroundColor: '#02030a', contentInset: 'never' },
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_nova', iconColor: '#3BE3FF' },
  },
};

export default config;
