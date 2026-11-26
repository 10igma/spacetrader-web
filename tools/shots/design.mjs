// Captures what the design round added: first steps, big moments, tiered sale feedback,
// two-tap spends, the charter track and the close buttons.
// Usage: node tools/shots/design.mjs <outDir> [scale]   (dev server on :5173, offline mode)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2]; const scale = Number(process.argv[3] ?? 1);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: scale, hasTouch: true, isMobile: true });
const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => problems.push(String(e).slice(0, 300)));
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const settle = (ms) => page.waitForTimeout(ms);
const check = (name, ok) => { if (!ok) problems.push(`CHECK FAILED: ${name}`); else console.log(`ok: ${name}`); };
const tab = async (name) => { await page.locator('.nav__item', { hasText: name }).tap(); await settle(1100); };
const app = (fn, arg) => page.evaluate(fn, arg);
const start = async (query) => {
  await page.goto(`http://localhost:5173/?q=high${query}`);
  await settle(2000);
  await page.locator('.splash').tap(); await settle(1500);
};

// --- A new captain: first steps and a guided first purchase ------------------
await start('&seed=design');
await shot('150-first-steps');
check('first step points at the free crate', await page.locator('.coach b').innerText().then((t) => t.includes('Gratis-Container')));
check('main button sends an empty ship to the market', await page.locator('.hub > .cta span').first().innerText().then((t) => t.toUpperCase().includes('FRACHT KAUFEN')));
await page.locator('.hub > .cta').tap(); await settle(1000);
await page.locator('.good', { hasText: 'Wasser' }).tap(); await settle(600);
check('first purchase suggests a full hold', await page.locator('.stepper output').innerText().then((t) => Number(t) >= 20));
check('every sheet has a close button', await page.locator('.sheet__x').count() === 1);
await shot('151-first-buy');
await page.locator('.sheet__x').tap(); await settle(500);
check('close button closes the sheet', await page.locator('.sheet').count() === 0);

// --- A seasoned captain ---------------------------------------------------------
await page.locator('.good', { hasText: 'Wasser' }).tap(); await settle(500);
await page.locator('.trade__actions .cta').first().tap(); await settle(600);
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('nova.save'));
  s.wallet = { credits: 9_400, quanta: 620, shards: 300 };
  s.profile = { level: 8, xp: 500 };
  s.stats = { ...s.stats, jumps: 40, profit: 60_000 };
  s.crates.opened = 9;
  s.cargo = { artifacts: { qty: 12, avgCost: 40, heat: 0 }, water: { qty: 4, avgCost: 9_000, heat: 0 } };
  s.season = { ...s.season, xp: 24_000, claimedFree: 9, claimedPremium: 0, premium: false };
  s.slots = [{ tier: 'premium', readyAt: Date.now() + 2 * 3_600_000 }];
  localStorage.setItem('nova.save', JSON.stringify(s));
});
await start('');
await shot('152-hub-best-route');
check('with cargo on board the main button opens the chart', await page.locator('.hub > .cta span').first().innerText().then((t) => t.toUpperCase().includes('STERNKARTE')));

// Sale feedback in three sizes, and a loss
await tab('Markt');
await page.locator('.good', { hasText: 'Xeno-Artefakte' }).first().tap(); await settle(500);
await page.locator('.trade__actions .cta').nth(1).tap(); await settle(380);
await shot('153-sale-large');
check('a big win gets the big pop', await page.locator('.salepop--l').count() === 1);
await settle(2000);
await page.locator('.good', { hasText: 'Wasser' }).first().tap(); await settle(500);
await page.locator('.trade__actions .cta').nth(1).tap(); await settle(380);
await shot('154-sale-loss');
check('a loss is shown as a loss', await page.locator('.salepop.is-down').count() === 1);
await settle(2000);

// The big moments
await app(() => window.__nova.app.getState().nextMilestone());
await app(() => window.__nova.app.getState().celebrate({ kind: 'level', level: 9 })); await settle(1600);
await shot('155-moment-level');
await page.locator('.moment').tap(); await settle(500);
await app(() => window.__nova.app.getState().celebrate({ kind: 'ship', ship: 'lanze' })); await settle(1600);
await shot('156-moment-ship');
await page.locator('.moment').tap(); await settle(500);
await app(() => window.__nova.app.getState().celebrate({ kind: 'prestige', rank: 2 })); await settle(1600);
await shot('157-moment-prestige');
await page.locator('.moment').tap(); await settle(500);
check('moments close on tap', await page.locator('.moment').count() === 0);

// Two taps to spend premium currency
await tab('Hangar');
await shot('158-hangar');
const quantaBefore = await app(() => window.__nova.app.getState().view.wallet.quanta);
await page.locator('.slot__btn--speed').tap(); await settle(400);
await shot('159-speedup-armed');
check('first tap spends nothing', await app(() => window.__nova.app.getState().view.wallet.quanta) === quantaBefore);
await settle(3300);
check('the button disarms by itself', await page.locator('.slot__btn--speed.is-armed').count() === 0);
await page.locator('.slot__btn--speed').tap(); await settle(300);
await page.locator('.slot__btn--speed.is-armed').tap(); await settle(900);
check('second tap spends', await app(() => window.__nova.app.getState().view.wallet.quanta) < quantaBefore);

// Charter as reward tiles
await tab('Aufträge');
await page.locator('.segment button', { hasText: 'Saison' }).tap(); await settle(900);
await shot('160-charter');
await page.locator('.premium').tap(); await settle(400);
await page.locator('.premium.is-armed').tap(); await settle(1700);
await shot('161-moment-charter');
await page.locator('.moment').tap(); await settle(500);
// The beat between an encounter choice and its result, and the arrival card
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('nova.save'));
  const other = ['kessin', 'lumen', 'helixtor'].find((id) => id !== s.location);
  s.pending = { to: other, kind: 'pirates' };
  s.cargo = { water: { qty: 10, avgCost: 20, heat: 0 } };
  localStorage.setItem('nova.save', JSON.stringify(s));
});
await start('');
await shot('162-encounter');
const tapped = Date.now();
await page.locator('.opt').first().tap(); await settle(300);
// Check first, then the picture: a large screenshot can take longer than the beat.
check('the result is not shown during the beat', await page.locator('.enc--result').count() === 0 && await page.locator('.enc--resolve').count() === 1);
await shot('163-encounter-beat');
await page.waitForSelector('.enc--result', { timeout: 5000 });
check('the beat lasts about a second', Date.now() - tapped >= 1000);
await settle(500);
await shot('164-encounter-result');
await page.locator('.travel__tap').tap();
await page.waitForSelector('.arrive__chip', { timeout: 6000 });
// Check first: the arrival card closes by itself after a few seconds, and a large screenshot takes time.
check('arrival shows what the cargo is worth here', await page.locator('.arrive__chip', { hasText: 'Deine Fracht hier' }).count() === 1);
await settle(1100);
await shot('165-arrival');
await browser.close();
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no console errors');
