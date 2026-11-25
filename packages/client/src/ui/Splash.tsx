import { useApp } from '../store.ts';

type OrientationCtor = { requestPermission?: () => Promise<string> };

export function Splash({ ready }: { ready: boolean }) {
  const begin = useApp((s) => s.begin);
  const mode = useApp((s) => s.service.mode);

  const start = (): void => {
    if (!ready) return;
    // iOS only hands out motion data after an explicit request from a tap.
    const ctor = (window as unknown as { DeviceOrientationEvent?: OrientationCtor }).DeviceOrientationEvent;
    void ctor?.requestPermission?.().catch(() => undefined);
    begin();
  };

  return (
    <div className="splash" onClick={start} role="button" aria-label="Spiel starten">
      <div className="splash__center">
        <div className="splash__eyebrow">Projekt</div>
        <div className="splash__mark" data-text="NOVA">NOVA</div>
        <div className="splash__line" />
        <div className="splash__sub">Technik-Vorschau 0.1</div>
      </div>
      <div className="splash__bottom">
        <div className="splash__cta">{ready ? 'Tippen zum Starten' : 'Verbinde …'}</div>
        <div className="splash__note">Am besten mit Ton · {mode === 'remote' ? 'Server-Modus' : 'Offline-Modus'}</div>
      </div>
    </div>
  );
}
