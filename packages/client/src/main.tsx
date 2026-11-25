import '@fontsource-variable/inter';
import '@fontsource-variable/oxanium';
import './ui/styles.css';
import { createRoot } from 'react-dom/client';
import { audio } from './audio/engine.ts';
import { stage } from './stage/index.ts';
import { App } from './ui/App.tsx';

// The stage is decoration: if WebGL is unavailable the game still works.
stage.init(document.getElementById('stage') as HTMLCanvasElement).catch((err: unknown) => {
  console.warn('stage unavailable', err);
  document.body.classList.add('no-stage');
});

createRoot(document.getElementById('root') as HTMLElement).render(<App />);

// Handles for automated checks (tools/shots). Not part of the game.
if (import.meta.env.DEV) Object.assign(window, { __nova: { audio, stage } });
