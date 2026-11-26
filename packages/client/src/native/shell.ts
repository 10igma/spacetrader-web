import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export const isNative = Capacitor.isNativePlatform();

export interface ShellHooks {
  /** Android back: close whatever is on top. Return false when nothing was open. */
  back(): boolean;
  /** The app went to the background. */
  pause(): void;
  /** The app is in front again: time has passed. */
  resume(): void;
}

/** Wire the native shell to the game. Does nothing in a browser. */
export function initShell(hooks: ShellHooks): void {
  if (!isNative) {
    // In a browser tab the same moments exist as visibility changes.
    document.addEventListener('visibilitychange', () => { if (document.hidden) hooks.pause(); else hooks.resume(); });
    return;
  }
  void StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  void StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
  void App.addListener('backButton', () => { if (!hooks.back()) void App.minimizeApp(); });
  void App.addListener('pause', hooks.pause);
  void App.addListener('resume', hooks.resume);
}

/** iOS asks before a page may read the motion sensor. Must be called from a tap. */
export function askForMotion(): void {
  const ctor = (globalThis as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
  if (typeof ctor?.requestPermission === 'function') void ctor.requestPermission().catch(() => {});
}
