import { FACTIONS, GOOD_BY_ID, STATION_BY_ID, type EncounterChoice, type GoodId } from '@nova/core';
import { useEffect, useState } from 'react';
import { audio } from '../audio/engine.ts';
import { stage } from '../stage/index.ts';
import { useApp, type Travel as TravelState } from '../store.ts';
import { FACTION_COLOR, num } from './format.ts';

type Phase = 'launch' | 'encounter' | 'outcome' | 'cruise' | 'arrive';

const LAUNCH_MS = 2400;
const CRUISE_MS = 1100;
const ARRIVE_MS = 2600;

const buzz = (pattern: number | number[]): void => { try { navigator.vibrate?.(pattern); } catch { /* unsupported */ } };

const OPTION: Record<EncounterChoice, { label: string; stat?: 'nav' | 'hdl' | 'tec' | 'kmp'; note: (hot: boolean) => string }> = {
  fight: { label: 'Kämpfen', stat: 'kmp', note: () => 'Sieg bringt Beute. Niederlage kostet 40 % der Fracht' },
  flee: { label: 'Fliehen', stat: 'nav', note: () => 'Misslingt es, gehen 25 % der Fracht verloren' },
  pay: { label: 'Tribut zahlen', note: () => 'Sie lassen dich ziehen' },
  submit: { label: 'Kontrollieren lassen', stat: 'tec', note: (hot) => (hot ? 'Wird verbotene Ware gefunden: beschlagnahmt, Busse, Fahndung' : 'Deine Fracht ist hier legal') },
  bribe: { label: 'Bestechen', stat: 'hdl', note: () => 'Geld ist in jedem Fall weg' },
  breakThrough: { label: 'Durchbrechen', stat: 'nav', note: () => 'Bringt immer Fahndung. Scheitert es, wird alles durchsucht' },
};

const OUTCOME_TEXT: Record<EncounterChoice, [string, string]> = {
  fight: ['Piraten vertrieben', 'Gefecht verloren'],
  flee: ['Entkommen', 'Eingeholt'],
  pay: ['Tribut gezahlt', 'Tribut gezahlt'],
  submit: ['Kontrolle bestanden', 'Schmuggelware entdeckt'],
  bribe: ['Beamter drückt ein Auge zu', 'Bestechung abgelehnt'],
  breakThrough: ['Sperre durchbrochen', 'Abgefangen'],
};

/**
 * The jump as a scene. Outcomes are decided by the game service: this
 * component only sequences picture, sound and the one decision the player has.
 */
export function Travel({ travel }: { travel: TravelState }) {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const end = useApp((s) => s.endTravel);
  const [phase, setPhase] = useState<Phase>(travel.resumed ? 'encounter' : 'launch');
  const dest = STATION_BY_ID.get(travel.to)!;
  const encounter = view.encounter;

  // The server answer for an encounter choice arrives as travel.outcome.
  useEffect(() => { if (travel.outcome && phase === 'encounter') setPhase('outcome'); }, [travel.outcome, phase]);

  useEffect(() => {
    let timer = 0;
    if (phase === 'launch') {
      audio.duck(true);
      audio.warp(LAUNCH_MS / 1000);
      buzz(20);
      stage.setWarp(1);
      stage.setPlanet(-1.6, 0.4, 1.8); // the world slides past as we accelerate
      timer = window.setTimeout(() => setPhase(encounter ? 'encounter' : 'arrive'), LAUNCH_MS);
    } else if (phase === 'encounter') {
      stage.setWarp(0.3);
      stage.snapPlanet(0, 3, 0.3);
      stage.setRift(encounter?.kind === 'pirates' ? [1, 0.18, 0.2] : [0.25, 0.55, 1], 0.28);
      stage.pulse(0.3);
      audio.alert(encounter?.kind ?? 'customs');
      buzz([40, 60, 40]);
    } else if (phase === 'outcome') {
      const ok = travel.outcome!.success;
      stage.setRift(ok ? [0.3, 1, 0.7] : [1, 0.2, 0.2], 0.4);
      stage.pulse(ok ? 0.25 : 0.45);
      if (ok) audio.reveal(travel.outcome!.creditsDelta > 0 ? 2 : 1); else audio.loss();
      buzz(ok ? 20 : [60, 40, 120]);
    } else if (phase === 'cruise') {
      stage.setRift(null, 0);
      stage.setWarp(1);
      audio.warp(CRUISE_MS / 1000);
      timer = window.setTimeout(() => setPhase('arrive'), CRUISE_MS);
    } else {
      stage.setRift(null, 0);
      stage.setWorld(dest.look);
      stage.snapPlanet(0.9, -0.2, 0.12); // a dot ahead that grows into the destination
      stage.setPlanet(0.3, 0.52, 0.62);
      stage.setWarp(0);
      stage.pulse(0.3);
      audio.reveal(1);
      audio.duck(false);
      buzz(15);
      timer = window.setTimeout(end, ARRIVE_MS);
    }
    return () => window.clearTimeout(timer);
    // Each phase runs its cue exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const choose = (choice: EncounterChoice) => (): void => { audio.tap(); void send({ type: 'Encounter', choice }); };

  return (
    <div className={`overlay travel travel--${phase}`} style={{ ['--faction' as string]: FACTION_COLOR[dest.faction] }}>
      {(phase === 'launch' || phase === 'cruise') && (
        <div className="travel__status">
          <span className="eyebrow">Sprung</span>
          <b>{dest.name}</b>
          <div className="travel__bar"><i style={{ animationDuration: `${phase === 'launch' ? LAUNCH_MS : CRUISE_MS}ms` }} /></div>
        </div>
      )}

      {phase === 'encounter' && encounter && (
        <div className={`enc enc--${encounter.kind}`}>
          <span className="eyebrow">{encounter.kind === 'pirates' ? 'Angriff' : `Zoll · ${FACTIONS[dest.faction].name}`}</span>
          <h3>{encounter.kind === 'pirates' ? 'Piraten!' : 'Zollkontrolle'}</h3>
          <p>
            {encounter.kind === 'pirates'
              ? 'Ein Jäger hängt an deinem Heck und verlangt die Fracht.'
              : encounter.hasContraband ? `Ein Kreuzer befiehlt den Stopp. Du hast Ware an Bord, die im ${FACTIONS[dest.faction].name} verboten ist.` : 'Ein Kreuzer befiehlt den Stopp. Routinekontrolle.'}
          </p>
          <div className="enc__options">
            {encounter.options.map((o) => {
              const meta = OPTION[o.id];
              const bonus = meta.stat ? view.crew[meta.stat] : 0;
              return (
                <button key={o.id} className="opt" disabled={busy} onClick={choose(o.id)}>
                  <span className="opt__main">
                    <b>{meta.label}</b>
                    <small>{meta.note(encounter.hasContraband)}{o.cost > 0 ? ` · kostet ${num(o.cost)}` : ''}</small>
                  </span>
                  <span className="opt__odds" style={{ ['--p' as string]: o.chance, ['--ring' as string]: o.chance >= 0.7 ? 'var(--ok)' : o.chance >= 0.4 ? 'var(--amber)' : 'var(--danger)' }}>
                    <b>{Math.round(o.chance * 100)} %</b>
                    {meta.stat && bonus > 0 ? <small>Crew {meta.stat.toUpperCase()}</small> : <small>Chance</small>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {phase === 'outcome' && travel.outcome && (
        <div className={`enc enc--result ${travel.outcome.success ? 'is-win' : 'is-loss'}`}>
          <span className="eyebrow">{travel.outcome.success ? 'Geschafft' : 'Verloren'}</span>
          <h3>{OUTCOME_TEXT[travel.outcome.choice][travel.outcome.success ? 0 : 1]}</h3>
          <ul className="enc__effects">
            {travel.outcome.creditsDelta !== 0 && (
              <li className={travel.outcome.creditsDelta > 0 ? 'is-up' : 'is-down'}>
                {travel.outcome.creditsDelta > 0 ? '+' : '−'}{num(Math.abs(travel.outcome.creditsDelta))} Credits
              </li>
            )}
            {(Object.entries(travel.outcome.lost) as [GoodId, number][]).map(([id, qty]) => (
              <li key={id} className="is-down">−{qty} {GOOD_BY_ID.get(id)!.name}</li>
            ))}
            {travel.outcome.hidden > 0 && <li className="is-up">Schmuggelfach: {travel.outcome.hidden} Einheiten unentdeckt</li>}
            {travel.outcome.wantedDelta > 0 && <li className="is-down">Fahndung +{travel.outcome.wantedDelta} · {FACTIONS[dest.faction].short}</li>}
            {travel.outcome.creditsDelta === 0 && Object.keys(travel.outcome.lost).length === 0 && travel.outcome.wantedDelta === 0 && <li>Fracht und Kasse unberührt</li>}
          </ul>
        </div>
      )}
      {phase === 'outcome' && (
        <button className="travel__tap" aria-label="Weiter" onClick={() => { audio.tap(); setPhase('cruise'); }}>
          <span className="overlay__hint">Tippen für weiter</span>
        </button>
      )}

      {phase === 'arrive' && (
        <div className="arrive" onClick={end}>
          <span className="eyebrow">{FACTIONS[dest.faction].name} · {dest.tagline}</span>
          <h2>{dest.name}</h2>
          <div className="arrive__line" />
          <span className="arrive__sub">Andocken{travel.courier > 0 ? ` · Kurierpost +${num(travel.courier)}` : ''}</span>
        </div>
      )}
    </div>
  );
}
