import { useEffect, useState, type ReactNode } from 'react';
import { audio } from '../audio/engine.ts';

/**
 * Every spend of premium currency takes two taps: the first arms the button and says what
 * it will cost, the second confirms. It disarms by itself after three seconds.
 * Nothing is ever spent by a tap that was meant for something else.
 */
export function SpendButton({ className = '', disabled = false, onSpend, confirm, children }: {
  className?: string;
  disabled?: boolean;
  onSpend: () => void;
  /** What the armed button says. */
  confirm: ReactNode;
  children: ReactNode;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      className={`${className}${armed ? ' is-armed' : ''}`}
      disabled={disabled}
      onBlur={() => setArmed(false)}
      onClick={(e) => {
        e.stopPropagation();
        audio.tap();
        if (armed) { setArmed(false); onSpend(); } else setArmed(true);
      }}
    >
      {armed ? confirm : children}
    </button>
  );
}

/** The way out of every sheet, in the same place every time. */
export function CloseX({ onClick }: { onClick: () => void }) {
  return <button className="sheet__x" aria-label="Schliessen" onClick={(e) => { e.stopPropagation(); audio.tap(); onClick(); }}>×</button>;
}
