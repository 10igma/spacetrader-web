import { MODULE_MAX, MODULES, SHIP_BY_ID, SHIPS, type ModuleDef, type ShipDef, type ShipId } from '@nova/core';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { num } from './format.ts';
import { Credits, IconLock } from './icons.tsx';

/** Top-down hull outlines, nose up, in a 120 by 120 box. */
const HULL: Record<ShipId, { d: string; engines: number[]; tone: string }> = {
  sperling: { d: 'M60 14 L72 50 L96 78 L72 74 L68 96 L52 96 L48 74 L24 78 L48 50 Z', engines: [56, 64], tone: '#7fe3ff' },
  kormoran: { d: 'M60 12 L74 28 L78 60 L100 72 L100 88 L78 84 L74 104 L46 104 L42 84 L20 88 L20 72 L42 60 L46 28 Z', engines: [52, 60, 68], tone: '#ffc24a' },
  lanze: { d: 'M60 6 L68 44 L104 92 L74 80 L66 108 L54 108 L46 80 L16 92 L52 44 Z', engines: [57, 63], tone: '#ff5468' },
  nachtfalter: { d: 'M60 16 L70 40 L108 50 L96 78 L72 70 L66 104 L54 104 L48 70 L24 78 L12 50 L50 40 Z', engines: [57, 63], tone: '#b06cff' },
  basilisk: { d: 'M60 20 L70 34 L84 14 L92 56 L108 84 L80 96 L72 108 L48 108 L40 96 L12 84 L28 56 L36 14 L50 34 Z', engines: [52, 60, 68], tone: '#4dffb5' },
  leviathan: { d: 'M60 6 L76 22 L80 50 L96 58 L96 96 L78 100 L74 114 L46 114 L42 100 L24 96 L24 58 L40 50 L44 22 Z', engines: [50, 57, 63, 70], tone: '#ff8a3c' },
};

export function ShipArt({ id, locked = false, paint = null }: { id: ShipId; locked?: boolean; paint?: string | null }) {
  const prisma = paint === 'prisma';
  const hull = { ...HULL[id], tone: paint && !prisma ? paint : HULL[id].tone };
  const base = Number(hull.d.match(/L\d+ (\d+) L\d+ \1 /)?.[1] ?? 104);
  return (
    <svg className={`shipart${locked ? ' is-locked' : ''}${prisma ? ' shipart--prisma' : ''}`} viewBox="0 0 120 120" style={{ ['--tone' as string]: hull.tone }} aria-hidden="true">
      <defs>
        <linearGradient id={`hull-${id}-${paint ?? 'werk'}`.replace('#', '')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9f4ff" stopOpacity="0.95" />
          <stop offset="0.5" stopColor={hull.tone} stopOpacity="0.55" />
          <stop offset="1" stopColor="#0a1224" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {hull.engines.map((x) => <ellipse key={x} className="shipart__flame" cx={x} cy={base + 5} rx="2.6" ry="7" />)}
      <path d={hull.d} fill={`url(#${`hull-${id}-${paint ?? 'werk'}`.replace('#', '')})`} stroke={hull.tone} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M60 30 L64 46 L60 56 L56 46 Z" fill="#04101c" stroke={hull.tone} strokeWidth="0.8" opacity="0.9" />
      <path d="M60 58 V92" stroke={hull.tone} strokeWidth="0.7" opacity="0.5" />
    </svg>
  );
}

const share = (x: number): string => `${Math.round(x * 100)} %`;
const moduleValue = (def: ModuleDef, level: number): string => {
  const v = def.values[level - 1]!;
  return def.effect.replace('{n}', def.unit === 'percent' ? share(v) : String(v));
};

function perks(ship: ShipDef): string[] {
  const out: string[] = [];
  if (ship.fight) out.push(`Kampf +${share(ship.fight)}`);
  if (ship.flee) out.push(`Flucht +${share(ship.flee)}`);
  if (ship.stealth) out.push(`Scan −${share(ship.stealth)}`);
  return out;
}

export function Shipyard() {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const { fleet } = view;
  const ship = SHIP_BY_ID.get(fleet.active)!;
  const credits = view.wallet.credits;
  const tap = (fn: () => void) => (): void => { audio.tap(); fn(); };
  const slots = Array.from({ length: fleet.rig.slots }, (_, i) => fleet.fitted[i] ?? null);

  return (
    <div className="yard">
      <div className="yard__hero">
        <ShipArt id={ship.id} paint={view.captain.paints.find((p) => p.id === view.captain.paint)?.tone ?? null} />
        <div className="yard__info">
          <span className="eyebrow">{ship.cls}</span>
          <h3>{ship.name}</h3>
          <p>{ship.tagline}</p>
          <div className="yard__stats">
            <span><b>{view.cargo.cap}</b>Laderaum</span>
            <span><b>{view.fuel.max}</b>Tank</span>
            <span><b>{fleet.fitted.length}/{fleet.rig.slots}</b>Module</span>
          </div>
          {perks(ship).length > 0 && <div className="chips">{perks(ship).map((p) => <span key={p} className="chip chip--ok">{p}</span>)}</div>}
        </div>
      </div>

      <div className="yard__slots">
        {slots.map((id, i) => {
          const def = id ? MODULES.find((m) => m.id === id)! : null;
          return def ? (
            <button key={i} className="slotbox is-filled" disabled={busy} onClick={tap(() => void send({ type: 'UnfitModule', module: def.id }))}>
              <b>{def.name}</b>
              <small>Stufe {fleet.modules[def.id]} · ausbauen</small>
            </button>
          ) : <div key={i} className="slotbox"><small>Freier Platz</small></div>;
        })}
      </div>

      <h4 className="market__section">Module<span>Wirken nur eingebaut</span></h4>
      {MODULES.map((def) => {
        const level = fleet.modules[def.id] ?? 0;
        const fitted = fleet.fitted.includes(def.id);
        const price = level < MODULE_MAX ? def.prices[level]! : null;
        return (
          <div key={def.id} className={`gear${fitted ? ' is-fitted' : ''}`}>
            <span className="gear__main">
              <b>{def.name}<span className="gear__pips">{[1, 2, 3].map((l) => <i key={l} className={l <= level ? 'on' : ''} />)}</span></b>
              <small>{level > 0 ? moduleValue(def, level) : moduleValue(def, 1)}</small>
              {level > 0 && level < MODULE_MAX && <small className="gear__next">Stufe {level + 1}: {moduleValue(def, level + 1)}</small>}
            </span>
            <span className="gear__actions">
              {level > 0 && !fitted && (
                <button className="mission__btn" disabled={busy || fleet.fitted.length >= fleet.rig.slots} onClick={tap(() => void send({ type: 'FitModule', module: def.id }))}>
                  {fleet.fitted.length >= fleet.rig.slots ? 'Kein Platz' : 'Einbauen'}
                </button>
              )}
              {fitted && price === null && <span className="gear__state">Eingebaut</span>}
              {price !== null && (
                <button className="price price--btn" disabled={busy || credits < price} onClick={tap(() => void send({ type: 'BuyModule', module: def.id }))}>
                  <Credits />{num(price)}
                </button>
              )}
            </span>
          </div>
        );
      })}

      <h4 className="market__section">Werft<span>Gekaufte Schiffe bleiben dir</span></h4>
      {SHIPS.map((s) => {
        const owned = fleet.owned.includes(s.id);
        const active = fleet.active === s.id;
        const locked = !owned && view.profile.level < s.level;
        return (
          <div key={s.id} className={`hull${active ? ' is-active' : ''}${locked ? ' is-locked' : ''}`}>
            <ShipArt id={s.id} locked={locked} />
            <span className="hull__main">
              <b>{s.name}</b>
              <small>{[s.cls, s.hold ? `Laderaum +${s.hold}` : '', s.fuel ? `Tank +${s.fuel}` : '', `${s.slots} ${s.slots === 1 ? 'Modul' : 'Module'}`].filter(Boolean).join(' · ')}</small>
              {perks(s).length > 0 && <small className="hull__perks">{perks(s).join(' · ')}</small>}
            </span>
            <span className="gear__actions">
              {active && <span className="gear__state">Aktiv</span>}
              {owned && !active && <button className="mission__btn" disabled={busy} onClick={tap(() => void send({ type: 'SelectShip', ship: s.id }))}>Wechseln</button>}
              {locked && <span className="gear__state"><IconLock />Stufe {s.level}</span>}
              {!owned && !locked && (
                <button className="price price--btn" disabled={busy || credits < s.price} onClick={tap(() => void send({ type: 'BuyShip', ship: s.id }))}>
                  <Credits />{num(s.price)}
                </button>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
