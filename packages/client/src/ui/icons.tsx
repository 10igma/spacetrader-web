import type { ReactNode } from 'react';

const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const Icon = ({ children }: { children: ReactNode }) => <svg {...base} aria-hidden="true">{children}</svg>;

export const IconStation = () => <Icon><circle cx="12" cy="12" r="3" /><ellipse cx="12" cy="12" rx="10" ry="4" /><path d="M12 2v7M12 15v7" /></Icon>;
export const IconMarket = () => <Icon><path d="M3 17l5-6 4 3 6-8 3 3" /><path d="M3 21h18" /></Icon>;
export const IconDeck = () => <Icon><rect x="7" y="3" width="12" height="16" rx="2" /><path d="M5 7v12a2 2 0 0 0 2 2h9" /></Icon>;
export const IconHangar = () => <Icon><path d="M12 2l9 5v10l-9 5-9-5V7z" /><path d="M3 7l9 5 9-5M12 12v10" /></Icon>;
export const IconLeague = () => <Icon><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8" /></Icon>;
export const IconLock = () => <Icon><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Icon>;
export const IconSound = ({ off }: { off: boolean }) => (
  <Icon><path d="M4 9v6h4l5 4V5L8 9z" />{off ? <path d="M17 9l4 6M21 9l-4 6" /> : <path d="M17 8a5 5 0 0 1 0 8" />}</Icon>
);
export const IconFuel = () => <Icon><path d="M12 3c3 4 5 6.5 5 10a5 5 0 0 1-10 0c0-3.500 2-6 5-10z" /></Icon>;

export const Credits = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1l5 3v6l-5 3-5-3V4z" fill="none" stroke="currentColor" strokeWidth="1.4" /><circle cx="7" cy="7" r="1.6" fill="currentColor" /></svg>
);
export const Quanta = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1l5 6-5 6-5-6z" fill="currentColor" /></svg>
);
export const Shard = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M5 1l6 4-3 8-6-5z" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
);
