/**
 * Bot players for balancing. They only see the ClientView and only act
 * through commands, exactly like a real client. That also makes every run
 * an end-to-end test of rules and view.
 */
import { cardValue } from '../auction.ts';
import { CONFIG } from '../config.ts';
import { CARD_BY_ID, CARDS_BY_FACTION, FACTIONS, rarityRank, seasonCards, seasonOf, type FactionId } from '../content.ts';
import { convoyChance, convoyStrength, MODULE_BY_ID, MODULE_MAX, SHIPS, type ModuleId } from '../fleet.ts';
import { applyCommand, createInitialState, forgeCost, quote, toClientView, type ClientView, type Command, type GameState } from '../game.ts';
import { GOOD_BY_ID, isBanned, STATION_BY_ID, type GoodId } from '../world.ts';

export type Policy = 'legal' | 'smuggler';

const HOUR = 3_600_000;

export interface DaySample { prestige: number; edition: number; ship: number; modules: number; league: number; charter: number; charterPremium: boolean; posts: number; day: number; worth: number; profit: number; crates: number; level: number; cards: number; legends: number; quanta: number; shards: number; streak: number; albums: number; jumps: number; caught: number; wantedMax: number }

interface Ctx { state: GameState; now: number; policy: Policy; log: Record<string, number> }

function act(ctx: Ctx, cmd: Command): ClientView {
  const res = applyCommand(ctx.state, cmd, ctx.now);
  ctx.state = res.state;
  for (const ev of res.events) {
    ctx.log[ev.type] = (ctx.log[ev.type] ?? 0) + 1;
    if (ev.type === 'ConvoyReturned') ctx.log[ev.success ? 'convoy:ok' : 'convoy:fail'] = (ctx.log[ev.success ? 'convoy:ok' : 'convoy:fail'] ?? 0) + 1;
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

const FACTION_LIST = Object.keys(FACTIONS) as FactionId[];

/** Everything a diligent player collects when opening the app. */
/** Which modules a player of this style wants, most wanted first. */
const MODULE_WISH: Record<Policy, ModuleId[]> = {
  legal: ['pods', 'charger', 'shield', 'drive', 'jammer', 'stash'],
  smuggler: ['pods', 'charger', 'jammer', 'stash', 'drive', 'shield'],
};

/** Shipyard: the next hull once it is comfortably affordable, then modules, most wanted in the slots. */
function shipyard(ctx: Ctx, view: ClientView): ClientView {
  const next = SHIPS.find((s) => !view.fleet.owned.includes(s.id));
  if (next && view.profile.level >= next.level && view.wallet.credits > next.price * 1.15) view = act(ctx, { type: 'BuyShip', ship: next.id });
  const wish = MODULE_WISH[ctx.policy];
  for (const id of wish) {
    const level = view.fleet.modules[id] ?? 0;
    if (level < MODULE_MAX && view.wallet.credits > MODULE_BY_ID.get(id)!.prices[level]! * 3) view = act(ctx, { type: 'BuyModule', module: id });
  }
  const want = wish.filter((id) => view.fleet.modules[id]).slice(0, view.fleet.rig.slots);
  // Only rebuild with an empty hold, so cargo pods can always come out.
  if (view.cargo.used === 0) for (const id of view.fleet.fitted) if (!want.includes(id)) view = act(ctx, { type: 'UnfitModule', module: id });
  for (const id of want) if (!view.fleet.fitted.includes(id) && view.fleet.fitted.length < view.fleet.rig.slots) view = act(ctx, { type: 'FitModule', module: id });
  return view;
}

/** Convoys: collect what is back, then send the strongest free crew on every contract that looks good. */
function convoys(ctx: Ctx, view: ClientView): ClientView {
  for (let i = view.convoys.running.length - 1; i >= 0; i--) if (view.convoys.running[i]!.done) view = act(ctx, { type: 'ClaimConvoy', slot: i });
  // Longest contract first: it pays best and the slot is busy while the player is away anyway.
  for (const offer of [...view.convoys.offers].sort((a, b) => b.hours - a.hours)) {
    if (offer.taken || view.convoys.running.length >= view.convoys.slots) continue;
    const seated = new Set(Object.values(view.deck.seats).map((s) => s?.cardId));
    const team = Object.keys(view.collection)
      .filter((id) => !seated.has(id) && !view.convoys.busy.includes(id))
      .sort((a, b) => convoyStrength(offer, b, view.cardLevels[b] ?? 1) - convoyStrength(offer, a, view.cardLevels[a] ?? 1))
      .slice(0, view.convoys.crew);
    if (team.length > 0 && convoyChance(offer, team, view.cardLevels) >= 0.5) view = act(ctx, { type: 'SendConvoy', offer: offer.id, cards: team });
  }
  return view;
}

function housekeeping(ctx: Ctx, view: ClientView): ClientView {
  if (view.comeback) view = act(ctx, { type: 'ClaimComeback' });
  if (view.league.last) view = act(ctx, { type: 'ClaimLeague' });
  while (view.weekend.claimable > 0) view = act(ctx, { type: 'ClaimWeekend' });
  // The charter comes before premium crates: it pays back most of its price over the season.
  if (!view.season.premium && view.wallet.quanta >= view.season.premiumPrice) view = act(ctx, { type: 'BuyCharter' });
  if (view.season.claimable > 0) view = act(ctx, { type: 'ClaimCharter' });
  if (view.calendar.claimable) view = act(ctx, { type: 'ClaimCalendar' });
  view.daily.missions.forEach((m, index) => { if (!m.claimed && m.progress >= m.target) view = act(ctx, { type: 'ClaimMission', index }); });
  if (!view.daily.chest.claimed && view.daily.chest.done === view.daily.chest.total) view = act(ctx, { type: 'ClaimChest' });
  for (const f of FACTION_LIST) while (view.albums[f].claimable) view = act(ctx, { type: 'ClaimAlbum', faction: f });
  while (view.seasonAlbum.claimable) view = act(ctx, { type: 'ClaimSeasonAlbum' });
  // Start over once the big ship is flown: the bonus is for good and the climb is the game.
  if (view.captain.canPrestige && view.fleet.owned.includes('leviathan')) view = act(ctx, { type: 'Prestige' });
  if (view.daily.wheel.available) view = act(ctx, { type: 'SpinWheel' });
  if (view.posts.stored > 0) view = act(ctx, { type: 'CollectPosts' });
  // Read each manifest from the current view: handing one in can use up the copies another one needs.
  for (let index = 0; index < view.daily.manifests.length; index++) {
    const m = view.daily.manifests[index]!;
    if (!m.done && m.have >= m.need) view = act(ctx, { type: 'SubmitManifest', index });
  }
  // Shop: missing cards when the price barely dents the trading capital.
  view.daily.offers.forEach((o, index) => {
    if (!o.bought && o.kind === 'card' && !view.collection[o.cardId!] && view.wallet.credits > o.price * 5) view = act(ctx, { type: 'BuyOffer', index });
  });
  // Auction house: look at results, bid on cards we lack at a little under the estimate, sell surplus copies.
  if (view.auction.results.length > 0) view = act(ctx, { type: 'AckAuctions' });
  for (const lot of view.auction.lots) {
    if (lot.gone || lot.yourMax !== null || view.collection[lot.cardId] || view.auction.openBids >= view.auction.maxBids) continue;
    const max = Math.max(lot.minBid, Math.round((lot.estimate * 0.9) / 50) * 50);
    if (max <= lot.estimate && view.wallet.credits > max * 4) view = act(ctx, { type: 'PlaceBid', lot: lot.key, max });
  }
  for (const id of Object.keys(view.collection)) {
    const copies = view.collection[id] ?? 0;
    if (view.auction.listings.length >= view.auction.maxListings) break;
    const card = CARD_BY_ID.get(id)!;
    // Keep one spare for manifests. Commons are not worth a listing slot.
    if (copies < 3 || rarityRank(card.rarity) < rarityRank('rare')) continue;
    view = act(ctx, { type: 'ListCard', cardId: id, min: Math.round((cardValue(card) * 0.6) / 50) * 50, duration: 2 });
  }
  let opened = false;
  while (view.crates.free.stock > 0) { view = act(ctx, { type: 'ClaimFreeCrate' }); opened = true; }
  for (let i = view.slots.length - 1; i >= 0; i--) if (view.slots[i]!.state === 'ready') { view = act(ctx, { type: 'OpenSlot', slot: i }); opened = true; }
  if (view.slots.length > 0 && !view.slots.some((s) => s.state === 'unlocking')) {
    const i = view.slots.findIndex((s) => s.state === 'sealed');
    if (i >= 0) view = act(ctx, { type: 'StartUnlock', slot: i });
  }
  if (opened) view = act(ctx, { type: 'AutoDeck' });
  view = convoys(ctx, view);
  // Put shards into whoever sits on the bridge, cheapest upgrade first.
  for (let guard = 0; guard < 20; guard++) {
    const seated = Object.values(view.deck.seats).filter((s): s is NonNullable<typeof s> => !!s)
      .map((s) => ({ id: s.cardId, level: view.cardLevels[s.cardId] ?? 1 }))
      .filter((s) => s.level < CONFIG.cards.maxLevel)
      .map((s) => ({ ...s, cost: CONFIG.cards.upgradeBase[CARD_BY_ID.get(s.id)!.rarity] * CONFIG.cards.upgradeMult[s.level - 1]! }))
      .sort((a, b) => a.cost - b.cost);
    if (!seated[0] || seated[0].cost > view.wallet.shards) break;
    view = act(ctx, { type: 'UpgradeCard', cardId: seated[0].id });
  }
  // The season album has a deadline: forge its cheapest missing card first, once shards are plentiful.
  for (let guard = 0; guard < 4; guard++) {
    const missing = seasonCards(view.season.index).filter((c) => !view.collection[c.id]).sort((a, b) => forgeCost(a) - forgeCost(b))[0];
    if (!missing || forgeCost(missing) * 1.5 > view.wallet.shards) break;
    view = act(ctx, { type: 'ForgeCard', cardId: missing.id });
  }
  // Spare shards go into the album that is closest to its next milestone: forge the cheapest missing card.
  for (let guard = 0; guard < 10; guard++) {
    const target = FACTION_LIST
      .map((f) => ({ f, a: view.albums[f] }))
      .filter((x) => x.a.next)
      .sort((x, y) => (Math.ceil(x.a.total * x.a.next!.pct) - x.a.owned) - (Math.ceil(y.a.total * y.a.next!.pct) - y.a.owned))[0];
    if (!target) break;
    const missing = CARDS_BY_FACTION[target.f].filter((c) => !view.collection[c.id])
      .sort((a, b) => CONFIG.cards.forge[a.rarity] - CONFIG.cards.forge[b.rarity])[0];
    if (!missing || CONFIG.cards.forge[missing.rarity] * 2 > view.wallet.shards) break;
    view = act(ctx, { type: 'ForgeCard', cardId: missing.id });
  }
  return view;
}

function session(ctx: Ctx): void {
  let view = housekeeping(ctx, toClientView(ctx.state, ctx.now));
  for (let guard = 0; guard < 80; guard++) {
    view = sellWhatPays(ctx, view);
    // A typical player: buys a crate when it is comfortably affordable, a couple per day.
    // Buys what the daily limit allows once it is comfortably affordable.
    for (const tier of ['premium', 'standard'] as const) {
      const offer = view.crates.tiers[tier];
      // Credits: only when it barely dents the trading capital. Quanta: keep a reserve for a streak freeze.
      // Quanta are saved for the charter first.
      // Someone saving for a ship stops at two crates a day.
      const nextShip = SHIPS.find((s) => !view.fleet.owned.includes(s.id));
      const saving = !!nextShip && view.profile.level >= nextShip.level && offer.currency === 'credits' && offer.leftToday <= 2;
      const ok = saving ? false : offer.currency === 'credits' ? view.wallet.credits > offer.price * 3 : view.season.premium && view.wallet.quanta >= offer.price + CONFIG.streak.freezePrice;
      if (offer.leftToday > 0 && ok) { view = act(ctx, { type: 'BuyCrate', tier }); view = act(ctx, { type: 'AutoDeck' }); }
    }
    if (view.payOff !== null && view.wanted[STATION_BY_ID.get(view.location)!.faction] >= 3 && view.wallet.credits > view.payOff * 5) {
      view = act(ctx, { type: 'PayOff' });
    }
    // A post wherever we dock, once it is cheap relative to the capital. A small gamble on wrecks now and then.
    if (view.posts.next && !view.posts.list.some((p) => p.stationId === view.location && p.readyAt !== null) && view.wallet.credits > view.posts.next.cost * 5) {
      view = act(ctx, { type: 'BuildPost' });
    }
    if (view.salvage && view.wallet.credits > view.salvage.price * 25) view = act(ctx, { type: 'BuySalvage' });
    // Reinvest: a bigger hold pays for itself.
    if (view.holdUpgrade && view.wallet.credits > view.holdUpgrade.cost * 1.6) view = act(ctx, { type: 'UpgradeHold' });
    view = shipyard(ctx, view);
    if (view.fuel.amount < 1) return;
    const p = plan(ctx, view);
    if (!p) return;
    for (const b of p.basket) view = act(ctx, { type: 'Buy', goodId: b.goodId, qty: b.qty });
    view = act(ctx, { type: 'Jump', to: p.to.stationId });
    if (view.encounter) view = act(ctx, decideEncounter(view));
    ctx.now += 60_000;
  }
}

const endSession = (ctx: Ctx): void => { housekeeping(ctx, toClientView(ctx.state, ctx.now)); };

export function simulate(seed: string, policy: Policy, days: number, sessionsPerDay = 3): { samples: DaySample[]; log: Record<string, number> } {
  const t0 = 1_800_000_000_000;
  const ctx: Ctx = { state: createInitialState(seed, t0), now: t0, policy, log: {} };
  const samples: DaySample[] = [];
  for (let day = 1; day <= days; day++) {
    for (let s = 0; s < sessionsPerDay; s++) {
      session(ctx);
      endSession(ctx);
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
      cards: Object.keys(view.collection).filter((id) => seasonOf(id) === null).length,
      edition: view.seasonAlbum.owned,
      prestige: view.captain.prestige,
      legends: Object.keys(view.collection).filter((id) => seasonOf(id) === null && rarityRank(CARD_BY_ID.get(id)!.rarity) >= rarityRank('legend')).length,
      quanta: view.wallet.quanta,
      posts: view.posts.list.reduce((sum, p) => sum + p.level, 0),
      league: view.league.tier,
      ship: SHIPS.findIndex((s) => s.id === view.fleet.active),
      modules: Object.values(view.fleet.modules).reduce((sum, l) => sum + (l ?? 0), 0),
      charter: view.season.tier,
      charterPremium: view.season.premium,
      shards: view.wallet.shards,
      streak: view.streak.count,
      albums: FACTION_LIST.filter((f) => view.albums[f].complete).length,
      jumps: view.stats.jumps,
      caught: view.stats.caught,
      wantedMax: Math.max(...(Object.keys(FACTIONS) as (keyof typeof FACTIONS)[]).map((f) => view.wanted[f])),
    });
  }
  return { samples, log: ctx.log };
}
