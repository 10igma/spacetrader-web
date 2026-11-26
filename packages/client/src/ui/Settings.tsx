import { audio } from '../audio/engine.ts';
import { remindersAvailable } from '../native/reminders.ts';
import { useApp } from '../store.ts';
import { CloseX } from './Spend.tsx';

/** Everything about this device in one place: sound, haptics, reminders. None of it is part of the save. */
export function SettingsSheet() {
  const close = useApp((s) => s.setSheet);
  const muted = useApp((s) => s.muted);
  const toggleMute = useApp((s) => s.toggleMute);
  const settings = useApp((s) => s.settings);
  const setHapticsOn = useApp((s) => s.setHapticsOn);
  const setRemindersOn = useApp((s) => s.setRemindersOn);
  const showToast = useApp((s) => s.showToast);

  return (
    <div className="overlay overlay--dim overlay--bottom" onClick={() => close(null)}>
      <div className="sheet sheet--trade" onClick={(e) => e.stopPropagation()}>
        <CloseX onClick={() => close(null)} />
        <span className="eyebrow">Gilt nur auf diesem Gerät</span>
        <h3>Einstellungen</h3>
        <div className="device">
          <button className={`switch${muted ? '' : ' is-on'}`} role="switch" aria-checked={!muted} onClick={() => { toggleMute(); audio.tap(); }}>
            <span><b>Ton</b><small>Musik und Effekte</small></span><i />
          </button>
          <button className={`switch${settings.haptics ? ' is-on' : ''}`} role="switch" aria-checked={settings.haptics} onClick={() => { setHapticsOn(!settings.haptics); audio.tap(); }}>
            <span><b>Haptik</b><small>Das Gerät antwortet auf Taps, Verkäufe und Karten</small></span><i />
          </button>
          <button
            className={`switch${settings.reminders ? ' is-on' : ''}`} role="switch" aria-checked={settings.reminders} disabled={!remindersAvailable}
            onClick={() => { audio.tap(); void setRemindersOn(!settings.reminders).then((on) => { if (!settings.reminders && !on) showToast('Erinnerungen sind in den Systemeinstellungen gesperrt'); }); }}
          >
            <span>
              <b>Erinnerungen</b>
              <small>{remindersAvailable ? 'Wenn etwas wirklich wartet: Konvoi, Container, voller Tank, Serie. Höchstens sechs, nie zwischen 22 und 8 Uhr' : 'Gibt es in der installierten App, nicht im Browser'}</small>
            </span><i />
          </button>
        </div>
      </div>
    </div>
  );
}
