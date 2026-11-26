// Captures the shipyard and the convoys.
// Usage: node tools/shots/fleet.mjs <outDir> [scale]   (dev server on :5173, offline mode)
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
const tab = async (name) => { await page.locator('.nav__item', { hasText: name }).tap(); await settle(1200); };
const mode = async (name) => { await page.locator('.segment button', { hasText: name }).tap(); await settle(900); };
const start = async (query) => {
  await page.goto(`http://localhost:5173/?q=high&calm=1${query}`);
  await settle(2000);
  await page.locator('.splash').tap(); await settle(1500);
};

await start('&seed=fleet');
// The save is written with the first command.
await tab('Markt');
await page.locator('.good', { hasText: 'Wasser' }).tap(); await settle(500);
await page.locator('.trade__actions .cta').first().tap(); await settle(500);
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('nova.save'));
  s.wallet = { credits: 412600, quanta: 180, shards: 310 };
  s.profile = { level: 13, xp: 400 };
  s.cargo = {};
  s.collection = { c01: 2, c02: 1, c03: 1, c04: 1, c05: 2, c06: 1, c07: 1, c08: 1, c09: 1, c10: 1, c11: 1, c12: 3, c13: 1, c14: 1, c15: 2, c16: 1, c17: 2, c18: 1, c19: 1, c20: 1, c22: 1, g001: 1, g004: 1, g011: 1, g017: 2, g023: 1, g030: 1 };
  s.fleet = { owned: ['sperling', 'kormoran', 'lanze'], active: 'lanze', modules: { pods: 2, shield: 1, charger: 1 }, fitted: ['pods', 'shield'] };
  localStorage.setItem('nova.save', JSON.stringify(s));
});
await start('');
await shot('100-hub-ship');
await page.locator('.chip--ship').tap(); await settle(1200);
await shot('101-shipyard');
await page.locator('.gear', { hasText: 'Fusionslader' }).locator('.mission__btn').tap(); await settle(800);
await page.locator('.gear', { hasText: 'Signalstörer' }).locator('.price--btn').tap(); await settle(900);
await page.locator('.hangar').evaluate((el) => el.scrollTo(0, 250)); await settle(400);
await shot('102-modules');
await page.locator('.hangar').evaluate((el) => el.scrollTo(0, 9999)); await settle(400);
await shot('103-ships');
await page.locator('.hull', { hasText: 'Nachtfalter' }).locator('.price--btn').tap(); await settle(1500);
await page.locator('.hangar').evaluate((el) => el.scrollTo(0, 0)); await settle(600);
await shot('104-new-ship');

await tab('Deck');
await page.locator('.deck .link', { hasText: 'Automatisch' }).tap(); await settle(700);
await mode('Konvois');
await shot('105-convoys');
await page.locator('.convoy--offer').last().tap(); await settle(800);
await shot('106-convoy-sheet');
await page.locator('.chance .link').tap(); await settle(500);
await shot('107-convoy-team');
await page.locator('.picker .cta').tap(); await settle(1000);
await page.locator('.convoy--offer').first().tap(); await settle(700);
await page.locator('.chance .link').tap(); await settle(400);
await page.locator('.picker .cta').tap(); await settle(1000);
await shot('108-convoys-running');
// Let the short one come home: move its end into the past.
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('nova.save'));
  s.convoys[1].endsAt = Date.now() - 1000;
  localStorage.setItem('nova.save', JSON.stringify(s));
});
await start('');
await tab('Deck');
await shot('109-deck-badge');
await mode('Konvois');
await page.locator('.convoy.is-done .mission__btn').tap(); await settle(900);
await shot('110-convoy-back');
await browser.close();
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no console errors');
