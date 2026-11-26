/** Choices that belong to this device, not to the game: they are not part of the save and never reach the server. */
export interface DeviceSettings { haptics: boolean; reminders: boolean }

const KEY = 'nova.device';
const DEFAULTS: DeviceSettings = { haptics: true, reminders: false };

export function loadSettings(): DeviceSettings {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<DeviceSettings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: DeviceSettings): void {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* private mode: settings last for the session */ }
}
