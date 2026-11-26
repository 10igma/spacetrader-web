import { CONFIG, FACTIONS, GOOD_BY_ID, quote, STATION_BY_ID, type EncounterChoice, type GoodId } from '@nova/core';
import { useEffect, useState } from 'react';
import { audio } from '../audio/engine.ts';
import { stage } from '../stage/index.ts';
import { useApp, type Travel as TravelState } from '../store.ts';
import { art } from './art.ts';
import { Emblem } from './Emblem.tsx';
import { FACTION_COLOR, num } from './format.ts';
import { ShipArt } from './Shipyard.tsx';

type Phase = 'launch' | 'encounter' | 'resolve' | 'outcome' | 'cruise' | 'arrive';

/** The first jumps of a session get the full launch. After that it is shorter: jump 200 is not jump 1. */
const LAUNCH_LONG_MS = 2400;
const LAUNCH_SHORT_MS = 1400;
let jumpsThisSession = 0;
/** The beat between a choice and its result. The result is already decided: this only lets it land. */
const RESOLVE_MS = 1100;
const CRUISE_MS = 1100;
const ARRIVE_MS = 3400;


const OPTION: Record<EncounterChoice, { label: string; stat?: 'nav' | 'hdl' | 'tec' | 'kmp'; note: (hot: boolean) => string }> = {
  // The stakes come from the rules, so the text can never drift from what really happens.
  fight: { label: 'Kämpfen', stat: 'kmp', note: () => `Sieg bringt Beute. Niederlage kostet ${Math.round(CONFIG.encounter.lossOnLostFight * 100)} % der Fracht` },
  flee: { label: 'Fliehen', stat: 'nav', note: () => `Misslingt es, gehen ${Math.round(CONFIG.encounter.lossOnFailedFlee * 100)} % der Fracht verloren` },
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
  const [chosen, setChosen] = useState<EncounterChoice | null>(null);
  /** The chance as it was shown when the choice was made: the encounter is gone from the view once it is resolved. */
  const [chosenChance, setChosenChance] = useState(1);
  const [beatOver, setBeatOver] = useState(false);
  // The picture of this encounter: one of two per kind, fixed for the whole scene.
  const [scene] = useState(() => {
    const kind = view.encounter?.kind;
    return kind ? art('encounters', `${kind}-${1 + (view.stats.jumps % 2)}`) ?? art('encounters', `${kind}-1`) : undefined;
  });
  const [launchMs] = useState(() => (jumpsThisSession++ >= 3 ? LAUNCH_SHORT_MS : LAUNCH_LONG_MS));
  const dest = STATION_BY_ID.get(travel.to)!;
  const encounter = view.encounter;

  // The server answer for an encounter choice arrives as travel.outcome.
  // It is shown once the beat is over, never before.
  useEffect(() => {
    if (travel.outcome && (phase === 'encounter' || (phase === 'resolve' && beatOver))) setPhase('outcome');
  }, [travel.outcome, phase, beatOver]);

  useEffect(() => {
    let timer = 0;
    if (phase === 'launch') {
      audio.duck(true);
      audio.warp(launchMs / 1000);
      stage.setWarp(1);
      stage.setPlanet(-1.6, 0.4, 1.8); // the world slides past as we accelerate
      timer = window.setTimeout(() => setPhase(encounter ? 'encounter' : 'arrive'), launchMs);
    } else if (phase === 'encounter') {
      stage.setWarp(0.3);
      stage.snapPlanet(0, 3, 0.3);
      stage.setRift(encounter?.kind === 'pirates' ? [1, 0.18, 0.2] : [0.25, 0.55, 1], 0.28);
      stage.pulse(0.3);
      audio.alert(encounter?.kind ?? 'customs');
    } else if (phase === 'resolve') {
      // One steady pulse for every choice and every result: nothing here hints at how it ends.
      setBeatOver(false);
      audio.riser(RESOLVE_MS / 1000);
      timer = window.setTimeout(() => setBeatOver(true), RESOLVE_MS);
    } else if (phase === 'outcome') {
      const ok = travel.outcome!.success;
      stage.setRift(ok ? [0.3, 1, 0.7] : [1, 0.2, 0.2], 0.4);
      stage.pulse(ok ? 0.25 : 0.45);
      if (ok) audio.reveal(travel.outcome!.creditsDelta > 0 ? 2 : 1); else audio.loss();
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
      timer = window.setTimeout(end, ARRIVE_MS);
    }
    return () => window.clearTimeout(timer);
    // Each phase runs its cue exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const choose = (choice: EncounterChoice) => (): void => {
    audio.tap();
    setChosen(choice);
    setChosenChance(encounter?.options.find((o) => o.id === choice)?.chance ?? 1);
    setPhase('resolve');
    // If the choice is refused there is no result to wait for: back to the decision.
    void send({ type: 'Encounter', choice }).then((events) => { if (events.some((e) => e.type === 'CommandRejected')) setPhase('encounter'); });
  };
  const skip = (): void => {
    if (phase === 'launch') setPhase(encounter ? 'encounter' : 'arrive');
    else if (phase === 'cruise') setPhase('arrive');
  };
  // What the cargo on board is worth at this market, against what it cost.
  const cargoHere = phase !== 'arrive' ? null : view.market.reduce<number | null>((sum, row) => {
    const lot = view.cargo.items[row.goodId];
    return lot ? (sum ?? 0) + Math.round(quote(row, 'sell', lot.qty) - lot.avgCost * lot.qty) : sum;
  }, null);


  return (
    <div className={`overlay travel travel--${phase}`} style={{ ['--faction' as string]: FACTION_COLOR[dest.faction] }} onClick={skip}>
      {(phase === 'launch' || phase === 'cruise') && (
        <div className="travel__ship" key={phase} style={{ animationDuration: `${phase === 'launch' ? launchMs : CRUISE_MS}ms` }}>
          <ShipArt id={view.fleet.active} paint={view.captain.paints.find((p) => p.id === view.captain.paint)?.tone ?? null} />
        </div>
      )}
      {(phase === 'launch' || phase === 'cruise') && (
        <div className="travel__status">
          <span className="eyebrow">Sprung</span>
          <b>{dest.name}</b>
          <div className="travel__bar"><i style={{ animationDuration: `${phase === 'launch' ? launchMs : CRUISE_MS}ms` }} /></div>
          <span className="overlay__hint travel__skip">Tippen zum Überspringen</span>
        </div>
      )}

      {phase === 'encounter' && encounter && (
        <div className={`enc enc--${encounter.kind}`}>
          {scene && <div className="enc__art"><img src={scene} alt="" draggable={false} /></div>}
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

      {phase === 'resolve' && (
        <div className="enc enc--resolve">
          {scene && <div className="enc__art enc__art--held"><img src={scene} alt="" draggable={false} /></div>}
          <span className="eyebrow">{chosen ? OPTION[chosen].label : ''}</span>
          <div className="enc__beat"><i /><i /><i /></div>
          {chosenChance < 1 && <small className="enc__chance">Chance {Math.round(chosenChance * 100)} %</small>}
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
          <Emblem faction={dest.faction} className="emblem--arrive" />
          <span className="eyebrow">{FACTIONS[dest.faction].name} · {dest.tagline}</span>
          <h2>{dest.name}</h2>
          <div className="arrive__line" />
          <span className="arrive__sub">Andocken</span>
          <div className="arrive__chips">
            {travel.courier > 0 && <span className="arrive__chip"><small>Kurierpost</small><b>+{num(travel.courier)}</b></span>}
            {travel.streak && (
              <span className="arrive__chip arrive__chip--streak">
                <small>{travel.streak.kind === 'saved' ? 'Serie gerettet' : 'Serie'}</small>
                <b>{travel.streak.count} {travel.streak.count === 1 ? 'Tag' : 'Tage'}</b>
              </span>
            )}
            {cargoHere !== null && (
              <span className={`arrive__chip ${cargoHere >= 0 ? 'is-up' : 'is-down'}`}>
                <small>Deine Fracht hier</small>
                <b>{cargoHere >= 0 ? '+' : '−'}{num(Math.abs(cargoHere))}</b>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
