/**
 * Bot players for balancing. They only see the ClientView and only act
 * through commands, exactly like a real client. That also makes every run
 * an end-to-end test of rules and view.
 */
import { CONFIG } from '../config.ts';
import { FACTIONS } from '../content.ts';
import { applyCommand, createInitialState, quote, toClientView, type ClientView, type Command, type GameState } from '../game.ts';
import { GOOD_BY_ID, isBanned, STATION_BY_ID, type GoodId } from '../world.ts';

export type Policy = 'legal' | 'smuggler';

const HOUR = 3_600_000;

export interface DaySample { day: number; worth: number; profit: number; crates: number; level: number; cards: number; jumps: number; caught: number; wantedMax: number }

interface Ctx { state: GameState; now: number; policy: Policy; log: Record<string, number>; boughtToday: number }

function act(ctx: Ctx, cmd: Command): ClientView {
  const res = applyCommand(ctx.state, cmd, ctx.now);
  ctx.state = res.state;
  for (const ev of res.events) {
    ctx.log[ev.type] = (ctx.log[ev.type] ?? 0) + 1;
    if (ev.type === 'CommandRejected') ctx.log[`rejected:${ev.reason}`] = (ctx.log[`rejected:${ev.reason}`] ?? 0) + 1;
    if (ev.type === 'EncounterResolved') ctx.log[`${ev.kind}:${ev.choice}:${ev.success ? 'ok' : 'fail'}`] = (ctx.log[`${ev.kind}:${ev.choice}:${ev.success ? 'ok' : 'fail'}`] ?? 0) + 1;
  }
  return toClientView(ctx.state, ctx.now);
}

const cargoValue = (view: ClientView): number =>
  Object.entries(view.cargo.items).reduce((sum, [id, lot]) => sum + (lot?.qty ?? 0) * GOOD_BY_ID.get(id as GoodId)!.base, 0);

export const netWorth = (view: ClientView): number => view.wallet.credits + cargoValue(view);

function sellWhatPays(ctx: Ctx, view: ClientView): ClientView {
  for (const row of view.market) {
    const lot = view.cargo.items[row.goodId];
    if (!lot) continue;
    let qty = lot.qty;
    if (row.channel === 'fence') {
      if (view.fence.closed) continue;
      qty = Math.min(qty, view.fence.left);
    }
    // Sell the largest part of the lot that still earns money after price impact.
    // Dump at a loss only when the hold is clogged with stale cargo.
    const clogged = view.cargo.used >= view.cargo.cap;
    while (qty > 0 && !clogged && quote(row, 'sell', qty) <= lot.avgCost * qty) qty = Math.floor(qty / 2);
    if (qty > 0) view = act(ctx, { type: 'Sell', goodId: row.goodId, qty });
  }
  return view;
}

interface Plan { to: ClientView['routes'][number]; score: number; basket: { goodId: GoodId; qty: number }[] }

function plan(ctx: Ctx, view: ClientView): Plan | null {
  let best: Plan | null = null;
  for (const route of view.routes) {
    const destFaction = STATION_BY_ID.get(route.stationId)!.faction;
    let credits = view.wallet.credits - 300; // keep a reserve for tribute and bribes
    let space = view.cargo.cap - view.cargo.used;
    let fenceLeft = view.fence.closed ? 0 : view.fence.left;
    let score = 0;
    const basket: Plan['basket'] = [];
    // Risk-adjusted value of a unit: the hint is the gain, customs may take all of it.
    const options = route.hints
      .map((h) => {
        const good = GOOD_BY_ID.get(h.goodId)!;
        const row = view.market.find((m) => m.goodId === h.goodId)!;
        const hot = isBanned(good, destFaction);
        if (ctx.policy === 'legal' && (hot || row.channel === 'fence')) return null;
        const risk = hot ? route.customsChance * 0.6 : 0;
        const perUnit = row.buy * h.pct * (1 - risk) - row.buy * risk;
        return { h, row, perUnit };
      })
      .filter((o): o is NonNullable<typeof o> => o !== null && o.perUnit > 0)
      .sort((a, b) => b.perUnit - a.perUnit);
    for (const o of options) {
      // Hints are quoted for a typical lot. Beyond it, price impact eats the margin: spread the hold.
      let qty = Math.min(space, CONFIG.market.hintLot + 2);
      if (o.row.channel === 'fence') qty = Math.min(qty, fenceLeft);
      while (qty > 0 && quote(o.row, 'buy', qty) > credits) qty--;
      if (qty <= 0) continue;
      basket.push({ goodId: o.h.goodId, qty });
      score += qty * o.perUnit;
      credits -= quote(o.row, 'buy', qty);
      space -= qty;
      if (o.row.channel === 'fence') fenceLeft -= qty;
    }
    // Cargo already aboard: prefer a destination that wants it.
    for (const h of route.hints) {
      const lot = view.cargo.items[h.goodId];
      if (lot) score += lot.qty * lot.avgCost * h.pct * 0.5;
    }
    if (!best || score > best.score) best = { to: route, score, basket };
  }
  return best;
}

function decideEncounter(view: ClientView): Command {
  const enc = view.encounter!;
  const value = cargoValue(view);
  const opt = (id: string) => enc.options.find((o) => o.id === id)!;
  if (enc.kind === 'pirates') {
    const e = CONFIG.encounter;
    const fight = (1 - opt('fight').chance) * value * e.lossOnLostFight - opt('fight').chance * (e.lootMin + e.lootRange / 2);
    const flee = (1 - opt('flee').chance) * value * e.lossOnFailedFlee;
    const pay = opt('pay').cost;
    const bestChoice = fight <= flee && fight <= pay ? 'fight' : flee <= pay ? 'flee' : 'pay';
    return { type: 'Encounter', choice: bestChoice };
  }
  if (!enc.hasContraband) return { type: 'Encounter', choice: 'submit' };
  const loss = value * 1.1;
  const submit = (1 - opt('submit').chance) * loss;
  const bribe = opt('bribe').cost + (1 - opt('bribe').chance) * loss;
  const run = (1 - opt('breakThrough').chance) * (loss + 600) + 300;
  const bestChoice = submit <= bribe && submit <= run ? 'submit' : bribe <= run ? 'bribe' : 'breakThrough';
  return { type: 'Encounter', choice: bestChoice };
}

function session(ctx: Ctx): void {
  let view = toClientView(ctx.state, ctx.now);
  if (ctx.now >= view.crates.nextFreeAt) { view = act(ctx, { type: 'ClaimFreeCrate' }); view = act(ctx, { type: 'AutoDeck' }); }
  for (let guard = 0; guard < 80; guard++) {
    view = sellWhatPays(ctx, view);
    // A typical player: buys a crate when it is comfortably affordable, a couple per day.
    if (view.wallet.credits > view.crates.price * 4 && ctx.boughtToday < 2) {
      ctx.boughtToday++; view = act(ctx, { type: 'BuyCrate' }); view = act(ctx, { type: 'AutoDeck' }); }
    if (view.payOff !== null && view.wanted[STATION_BY_ID.get(view.location)!.faction] >= 3 && view.wallet.credits > view.payOff * 5) {
      view = act(ctx, { type: 'PayOff' });
    }
    // Reinvest: a bigger hold pays for itself.
    if (view.holdUpgrade && view.wallet.credits > view.holdUpgrade.cost * 1.6) view = act(ctx, { type: 'UpgradeHold' });
    if (view.fuel.amount < 1) return;
    const p = plan(ctx, view);
    if (!p) return;
    for (const b of p.basket) view = act(ctx, { type: 'Buy', goodId: b.goodId, qty: b.qty });
    view = act(ctx, { type: 'Jump', to: p.to.stationId });
    if (view.encounter) view = act(ctx, decideEncounter(view));
    ctx.now += 60_000;
  }
}

export function simulate(seed: string, policy: Policy, days: number, sessionsPerDay = 3): { samples: DaySample[]; log: Record<string, number> } {
  const t0 = 1_800_000_000_000;
  const ctx: Ctx = { state: createInitialState(seed, t0), now: t0, policy, log: {}, boughtToday: 0 };
  const samples: DaySample[] = [];
  for (let day = 1; day <= days; day++) {
    ctx.boughtToday = 0;
    for (let s = 0; s < sessionsPerDay; s++) {
      session(ctx);
      ctx.now += 5 * HOUR;
    }
    ctx.now = t0 + day * 24 * HOUR;
    const view = toClientView(ctx.state, ctx.now);
    samples.push({
      day,
      worth: netWorth(view),
      profit: view.stats.profit,
      crates: view.crates.opened,
      level: view.profile.level,
      cards: Object.keys(view.collection).length,
      jumps: view.stats.jumps,
      caught: view.stats.caught,
      wantedMax: Math.max(...(Object.keys(FACTIONS) as (keyof typeof FACTIONS)[]).map((f) => view.wanted[f])),
    });
  }
  return { samples, log: ctx.log };
}
