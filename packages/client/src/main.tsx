import '@fontsource-variable/inter';
import '@fontsource-variable/oxanium';
import './ui/styles.css';
import { createRoot } from 'react-dom/client';
import { audio } from './audio/engine.ts';
import { syncReminders } from './native/reminders.ts';
import { initShell, isNative } from './native/shell.ts';
import { useApp } from './store.ts';
import { stage } from './stage/index.ts';
import { App } from './ui/App.tsx';

// The stage is decoration: if WebGL is unavailable the game still works.
stage.init(document.getElementById('stage') as HTMLCanvasElement).catch((err: unknown) => {
  console.warn('stage unavailable', err);
  document.body.classList.add('no-stage');
});

createRoot(document.getElementById('root') as HTMLElement).render(<App />);

initShell({
  back: () => useApp.getState().back(),
  // Going away: plan reminders from the freshest view, right now.
  pause: () => { const { view, settings } = useApp.getState(); if (view) syncReminders(view, settings.reminders, true); },
  resume: () => { void useApp.getState().refresh(); },
});

// Installable from the browser: cache the build so the game opens without a network.
if (import.meta.env.PROD && !isNative && !import.meta.env.VITE_SINGLE && 'serviceWorker' in navigator && location.protocol === 'https:') {
  void navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// Handles for automated checks (tools/shots). Not part of the game.
if (import.meta.env.DEV) Object.assign(window, { __nova: { audio, stage, app: useApp } });
