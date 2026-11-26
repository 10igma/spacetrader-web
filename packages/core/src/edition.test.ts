import { describe, expect, it } from 'vitest';
import { CONFIG } from './config.ts';
import { CARD_BY_ID, CARDS, EDITION, EDITION_SIZE, rarityRank, seasonCards, seasonOf } from './content.ts';
import { SHIPS } from './fleet.ts';
import { applyCommand, createInitialState, forgeCost, parseCommand, toClientView, type Command, type GameEvent, type GameState } from './game.ts';
import { albumInfo } from './meta.ts';
import { seasonTitleId, seasonTitleName } from './profile.ts';
import { seedRng } from './rng.ts';
import { charterReward, seasonEndsAt, seasonIndex } from './season.ts';

const T0 = 1_800_000_000_000;
const SEASON = seasonIndex(T0);
const fresh = (seed = 'edition'): GameState => createInitialState(seed, T0);
const of = <T extends GameEvent['type']>(events: GameEvent[], type: T): Extract<GameEvent, { type: T }> | undefined =>
  events.find((e): e is Extract<GameEvent, { type: T }> => e.type === type);
const rejected = (s: GameState, cmd: Command, now = T0) => of(applyCommand(s, cmd, now).events, 'CommandRejected')?.reason;
const run = (s: GameState, cmd: Command, now = T0): GameState => {
  const res = applyCommand(s, cmd, now);
  expect(of(res.events, 'CommandRejected')?.reason).toBeUndefined();
  return res.state;
};

describe('season edition', () => {
  it('is twelve cards made from the season number alone', () => {
    const a = seasonCards(SEASON);
    expect(a).toHaveLength(EDITION_SIZE);
    expect(seasonCards(SEASON)).toEqual(a);
    for (const [rarity, n] of Object.entries(EDITION)) expect(a.filter((c) => c.rarity === rarity)).toHaveLength(n);
    expect(new Set(a.map((c) => c.id)).size).toBe(EDITION_SIZE);
    expect(new Set(a.map((c) => c.name)).size).toBe(EDITION_SIZE);
    expect(a.every((c) => c.season === SEASON && seasonOf(c.id) === SEASON)).toBe(true);
    expect(seasonCards(SEASON + 1).map((c) => c.name)).not.toEqual(a.map((c) => c.name));
    expect(seasonCards(SEASON + 1).map((c) => c.epithet)).not.toEqual(a.map((c) => c.epithet));
  });

  it('sits at the top of its rarity and never above it', () => {
    const top = (rarity: string): number => Math.max(...CARDS.filter((c) => c.rarity === rarity).map((c) => c.rating));
    const bottom = (rarity: string): number => Math.min(...CARDS.filter((c) => c.rarity === rarity).map((c) => c.rating));
    for (let s = SEASON; s < SEASON + 8; s++) {
      for (const c of seasonCards(s)) {
        expect(c.rating).toBeLessThanOrEqual(top(c.rarity) + 2);
        if (c.rarity === 'rare') expect(c.rating).toBeLessThan(bottom('elite'));
        if (c.rarity === 'elite') expect(c.rating).toBeLessThan(bottom('legend'));
        if (c.rarity === 'legend') expect(c.rating).toBeLessThan(bottom('singularity'));
      }
    }
  });

  it('is found by id like any other card, and nothing else is', () => {
    expect(CARD_BY_ID.get(`s${SEASON}-07`)).toEqual(seasonCards(SEASON)[6]);
    expect(CARD_BY_ID.has(`s${SEASON}-12`)).toBe(true);
    expect(CARD_BY_ID.has(`s${SEASON}-13`)).toBe(false);
    expect(CARD_BY_ID.has('s-1-01')).toBe(false);
    expect(seasonOf('c21')).toBeNull();
    expect(CARD_BY_ID.get('c21')!.season).toBeUndefined();
  });

  it('drops from crates at the published share, only for rare and better, without touching rarity odds', () => {
    const open = (seasonSeed: string): { cardId: string; rarity: string }[] => {
      let s = fresh('share');
      s.rng.season = seedRng(seasonSeed);
      const pulls: { cardId: string; rarity: string }[] = [];
      for (let i = 0; i < 700; i++) {
        s.crates.freeStock = 1;
        const res = applyCommand(s, { type: 'ClaimFreeCrate' }, T0);
        pulls.push(...of(res.events, 'CrateOpened')!.pulls);
        s = res.state;
      }
      return pulls;
    };
    const a = open('one');
    const b = open('two');
    // Same crates, different season stream: the rarities are identical, only some identities differ.
    expect(a.map((p) => p.rarity)).toEqual(b.map((p) => p.rarity));
    expect(a.map((p) => p.cardId)).not.toEqual(b.map((p) => p.cardId));
    const eligible = a.filter((p) => rarityRank(p.rarity as never) >= rarityRank('rare') && p.rarity !== 'singularity');
    const fromEdition = eligible.filter((p) => seasonOf(p.cardId) !== null);
    expect(fromEdition.every((p) => seasonOf(p.cardId) === SEASON)).toBe(true);
    expect(a.filter((p) => p.rarity === 'standard' || p.rarity === 'singularity').every((p) => seasonOf(p.cardId) === null)).toBe(true);
    const share = fromEdition.length / eligible.length;
    expect(share).toBeGreaterThan(CONFIG.season.cardShare - 0.04);
    expect(share).toBeLessThan(CONFIG.season.cardShare + 0.04);
  }, 30_000);

  it('the next season drops its own edition', () => {
    let s = fresh('next');
    const later = seasonEndsAt(T0) + 3_600_000;
    const seen = new Set<number>();
    for (let i = 0; i < 300; i++) {
      s.crates.freeStock = 1;
      const res = applyCommand(s, { type: 'ClaimFreeCrate' }, later);
      for (const p of of(res.events, 'CrateOpened')!.pulls) { const n = seasonOf(p.cardId); if (n !== null) seen.add(n); }
      s = res.state;
    }
    expect([...seen]).toEqual([SEASON + 1]);
  });

  it('does not count towards faction albums, but sits on the bridge like any card', () => {
    const s = fresh();
    const before = albumInfo(s.collection, 0, 'helix');
    for (const c of seasonCards(SEASON)) s.collection[c.id] = 1;
    expect(albumInfo(s.collection, 0, 'helix')).toEqual(before);
    const card = seasonCards(SEASON)[11]!;
    const seated = run(s, { type: 'SetSeat', seat: card.role, cardId: card.id });
    expect(toClientView(seated, T0).deck.seats[card.role]!.cardId).toBe(card.id);
  });

  it('the premium charter hands out an elite at the halfway mark and ends with a legend you lack', () => {
    expect(charterReward(CONFIG.season.tiers / 2, 'premium').seasonCard).toBe('elite');
    expect(charterReward(CONFIG.season.tiers, 'premium').seasonCard).toBe('legend');
    const s = fresh();
    s.season.premium = true;
    s.season.xp = CONFIG.season.tiers * CONFIG.season.xpPerTier;
    const legends = seasonCards(SEASON).filter((c) => c.rarity === 'legend');
    s.collection[legends[0]!.id] = 1;
    const res = applyCommand(s, { type: 'ClaimCharter' }, T0);
    const cards = res.events.filter((e) => e.type === 'CrateOpened').flatMap((e) => (e.type === 'CrateOpened' && e.source === 'reward' ? e.pulls : []));
    expect(cards.map((p) => p.rarity).sort()).toEqual(['elite', 'legend']);
    expect(cards.find((p) => p.rarity === 'legend')).toMatchObject({ cardId: legends[1]!.id, isNew: true });
    expect(res.state.collection[legends[1]!.id]).toBe(1);
  });

  it('can be forged while the season runs, for more shards, and not afterwards', () => {
    const s = fresh();
    s.wallet.shards = 100_000;
    const card = seasonCards(SEASON)[0]!;
    expect(forgeCost(card)).toBe(CONFIG.cards.forge.rare * CONFIG.season.forgeMult);
    expect(forgeCost(CARDS.find((c) => c.rarity === 'rare')!)).toBe(CONFIG.cards.forge.rare);
    const made = run(s, { type: 'ForgeCard', cardId: card.id });
    expect(s.wallet.shards - made.wallet.shards).toBe(forgeCost(card));
    expect(rejected(s, { type: 'ForgeCard', cardId: seasonCards(SEASON - 1)[0]!.id })).toBe('season_over');
    expect(rejected(s, { type: 'ForgeCard', cardId: card.id }, seasonEndsAt(T0) + 1)).toBe('season_over');
  });
});

describe('season album', () => {
  const withCards = (n: number): GameState => {
    const s = fresh();
    for (const c of seasonCards(SEASON).slice(0, n)) s.collection[c.id] = 1;
    return s;
  };

  it('pays at four, eight and twelve cards, in that order', () => {
    expect(toClientView(withCards(3), T0).seasonAlbum).toMatchObject({ owned: 3, total: 12, claimable: false, next: { need: 4 } });
    expect(rejected(withCards(3), { type: 'ClaimSeasonAlbum' })).toBe('not_claimable');
    let s = withCards(12);
    expect(toClientView(s, T0).badges.deck).toBeGreaterThanOrEqual(1);
    for (let step = 1; step <= 3; step++) {
      const res = applyCommand(s, { type: 'ClaimSeasonAlbum' }, T0);
      expect(of(res.events, 'SeasonAlbumClaimed')).toEqual({ type: 'SeasonAlbumClaimed', step, complete: step === 3 });
      expect(of(res.events, 'RewardGranted')!.reward).toEqual(CONFIG.season.album.rewards[step - 1]);
      s = res.state;
    }
    expect(rejected(s, { type: 'ClaimSeasonAlbum' })).toBe('not_claimable');
    expect(toClientView(s, T0).seasonAlbum).toMatchObject({ complete: true, next: null, claimable: false });
  });

  it('a finished album leaves a title and a paint that outlive the season, the progress does not', () => {
    let s = withCards(12);
    for (let i = 0; i < 3; i++) s = run(s, { type: 'ClaimSeasonAlbum' });
    s = run(s, { type: 'SetTitle', title: seasonTitleId(SEASON) });
    s = run(s, { type: 'SetPaint', paint: 'prisma' });
    const later = seasonEndsAt(T0) + 3_600_000;
    const view = toClientView(s, later);
    expect(view.captain).toMatchObject({ title: seasonTitleName(SEASON), paint: 'prisma' });
    expect(view.seasonAlbum).toMatchObject({ owned: 0, claimed: 0 });
    // The old cards are still in the collection.
    expect(Object.keys(view.collection).filter((id) => seasonOf(id) === SEASON)).toHaveLength(12);
    // The new season's title is on the list as a goal.
    expect(view.captain.titles.find((t) => t.id === seasonTitleId(SEASON + 1))).toMatchObject({ unlocked: false });
  });
});

describe('titles, paints and showcase', () => {
  it('a title has to be earned', () => {
    const s = fresh();
    expect(toClientView(s, T0).captain).toMatchObject({ title: 'Kapitän', paint: 'werk', prestige: 0 });
    expect(rejected(s, { type: 'SetTitle', title: 'vielflieger' })).toBe('not_owned');
    expect(rejected(s, { type: 'SetTitle', title: 'kaiser' })).toBe('unknown_command');
    expect(rejected(s, { type: 'SetTitle', title: seasonTitleId(SEASON) })).toBe('not_owned');
    s.stats.jumps = 250;
    expect(toClientView(run(s, { type: 'SetTitle', title: 'vielflieger' }), T0).captain.title).toBe('Vielflieger');
    s.league.tier = 2;
    expect(toClientView(s, T0).captain.titles.find((t) => t.id === 'goldhaendler')!.unlocked).toBe(true);
    // Once reached, a league title stays after relegation.
    s.stats.bestLeague = 2;
    s.league.tier = 0;
    expect(toClientView(s, T0).captain.paints.find((p) => p.id === 'gold')!.unlocked).toBe(true);
  });

  it('paints are bought with quanta or earned, and change no number', () => {
    let s = fresh();
    expect(rejected(s, { type: 'SetPaint', paint: 'karmin' })).toBe('not_owned');
    expect(rejected(s, { type: 'BuyPaint', paint: 'gold' })).toBe('unknown_command');
    s.wallet.quanta = CONFIG.prestige.paintPrice - 1;
    expect(rejected(s, { type: 'BuyPaint', paint: 'karmin' })).toBe('not_enough_quanta');
    s.wallet.quanta = CONFIG.prestige.paintPrice;
    const before = toClientView(s, T0);
    s = run(s, { type: 'BuyPaint', paint: 'karmin' });
    const after = toClientView(s, T0);
    expect(after.wallet.quanta).toBe(0);
    expect(after.captain.paint).toBe('karmin');
    expect(after.fleet.rig).toEqual(before.fleet.rig);
    expect(after.market).toEqual(before.market);
    expect(rejected(s, { type: 'BuyPaint', paint: 'karmin' })).toBe('already_owned');
    expect(run(s, { type: 'SetPaint', paint: 'werk' }).cosmetics.paint).toBe('werk');
    expect(parseCommand({ type: 'SetPaint', paint: 'rainbow' })).toBeNull();
  });

  it('the showcase holds up to three cards you own', () => {
    const s = fresh();
    for (const c of CARDS.slice(0, 5)) s.collection[c.id] = 1;
    const ids = CARDS.slice(0, 4).map((c) => c.id);
    expect(rejected(s, { type: 'SetShowcase', cards: ids })).toBe('invalid_choice');
    expect(rejected(s, { type: 'SetShowcase', cards: [ids[0]!, ids[0]!] })).toBe('invalid_choice');
    expect(rejected(s, { type: 'SetShowcase', cards: ['c30x'] })).toBe('card_not_owned');
    expect(toClientView(run(s, { type: 'SetShowcase', cards: ids.slice(0, 3) }), T0).captain.showcase).toEqual(ids.slice(0, 3));
    expect(parseCommand({ type: 'SetShowcase', cards: [1, 2] })).toBeNull();
  });
});

describe('prestige', () => {
  const veteran = (): GameState => {
    const s = fresh('prestige');
    s.profile = { level: CONFIG.prestige.level, xp: 10 };
    s.wallet = { credits: 3_000_000, quanta: 40, shards: 70 };
    s.hold = 4;
    s.fleet = { owned: SHIPS.map((x) => x.id), active: 'leviathan', modules: { pods: 3, stash: 2 }, fitted: ['pods', 'stash'] };
    s.cargo = { water: { qty: 30, avgCost: 10, heat: 0 } };
    s.collection = { c01: 2, c21: 1 };
    s.cardLevels = { c21: 3 };
    s.season.xp = 12_345;
    s.league.tier = 3;
    s.stats.profit = 5_000_000;
    s.wanted.helix = { level: 3, cool: 2 };
    return s;
  };

  it('needs the level', () => {
    const s = veteran();
    s.profile.level = CONFIG.prestige.level - 1;
    expect(toClientView(s, T0).captain.canPrestige).toBe(false);
    expect(rejected(s, { type: 'Prestige' })).toBe('level_too_low');
  });

  it('takes level, money, ships and cargo, and keeps crew, season, league and lifetime numbers', () => {
    const s = veteran();
    const res = applyCommand(s, { type: 'Prestige' }, T0);
    const n = res.state;
    expect(of(res.events, 'Prestiged')).toEqual({ type: 'Prestiged', rank: 1 });
    expect(n.profile).toEqual({ level: 1, xp: 0 });
    expect(n.wallet).toEqual({ credits: CONFIG.startCredits, quanta: 40 + CONFIG.prestige.quanta, shards: 70 + CONFIG.prestige.shards });
    expect(n.fleet).toEqual({ owned: ['sperling'], active: 'sperling', modules: {}, fitted: [] });
    expect(n.hold).toBe(0);
    expect(n.cargo).toEqual({});
    expect(n.wanted.helix.level).toBe(0);
    expect(n.fuel.amount).toBe(CONFIG.fuel.max);
    expect(n.collection).toEqual(s.collection);
    expect(n.cardLevels).toEqual(s.cardLevels);
    expect(n.season.xp).toBe(s.season.xp);
    expect(n.league.tier).toBe(3);
    expect(n.stats.profit).toBe(5_000_000);
    const view = toClientView(n, T0);
    expect(view.captain.titles.find((t) => t.id === 'veteran')!.unlocked).toBe(true);
    expect(view.captain.titles.find((t) => t.id === 'flottenadmiral')!.unlocked).toBe(true);
    expect(view.captain.paints.find((p) => p.id === 'leere')!.unlocked).toBe(true);
  });

  it('every rank sells a little better for good, up to the cap', () => {
    let s = veteran();
    const sell = (state: GameState): number => toClientView(state, T0).market[0]!.sellFactor;
    s.cargo = {};
    const base = sell(s);
    for (let rank = 1; rank <= CONFIG.prestige.max; rank++) {
      s = run(s, { type: 'Prestige' });
      expect(toClientView(s, T0).saleBonus.prestige).toBeCloseTo(rank * CONFIG.prestige.saleBonus, 5);
      s.profile.level = CONFIG.prestige.level;
    }
    expect(sell(s) / base).toBeGreaterThan(1 + CONFIG.prestige.max * CONFIG.prestige.saleBonus * 0.8);
    expect(toClientView(s, T0).captain.canPrestige).toBe(false);
    expect(rejected(s, { type: 'Prestige' })).toBe('max_level');
  });
});
