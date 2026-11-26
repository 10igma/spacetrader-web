// Captures trading posts, salvage, wheel, manifests and daily offers.
// Usage: node tools/shots/phase3b.mjs <outDir> [scale]   (dev server on :5173, offline mode)
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
const tab = async (name) => { await page.locator('.nav__item', { hasText: name }).tap(); await settle(1300); };

await page.goto('http://localhost:5173/?q=high&calm=1&seed=p3b');
await settle(2000);
await page.locator('.splash').tap(); await settle(700);
await tab('Markt');
await page.locator('.good', { hasText: 'Wasser' }).tap(); await settle(500);
await page.locator('.trade__actions .cta').first().tap(); await settle(500);
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('nova.save'));
  const now = Date.now(); const H = 3600000;
  s.wallet = { credits: 142600, quanta: 96, shards: 310 };
  s.profile = { level: 9, xp: 400 };
  s.collection = { c01: 3, c02: 2, c11: 2, c20: 1, c21: 1, c18: 1, c13: 1, g001: 2, g004: 2 };
  s.deck = { pilot: 'c20', trader: 'c21', tech: 'c13', gunner: 'c18', smuggler: 'c11' };
  s.posts = {
    meridian: { level: 3, stored: 2880, storedAt: now, readyAt: 0 },
    kessin: { level: 2, stored: 640, storedAt: now, readyAt: 0 },
    zenit: { level: 1, stored: 0, storedAt: now, readyAt: now + 7 * 60000 },
  };
  s.salvage = { price: 8400, weight: 1, origin: 'asche' };
  s.daily.manifests = [
    { need: 4, reward: { shards: 80 }, done: false },
    { need: 3, faction: 'tessera', reward: { crate: 'standard' }, done: false },
  ];
  localStorage.setItem('nova.save', JSON.stringify(s));
});
await page.goto('http://localhost:5173/?q=high&calm=1');
await settle(2000);
await page.locator('.splash').tap(); await settle(1800);
await shot('50-hub-posts-salvage');
await page.locator('.tile').first().tap(); await settle(800);
await shot('51-posts');
await page.locator('.posts .cta--gold').tap(); await settle(700);
await shot('52-posts-collected');
await page.locator('.overlay').last().tap({ position: { x: 12, y: 12 } }); await settle(400);
await page.locator('.rail__btn--salvage').tap(); await settle(800);
await shot('53-salvage');
await page.locator('.salvage .cta--gold').tap(); await settle(900);
await shot('54-salvage-result');
await page.locator('.salvage .cta').tap(); await settle(400);
await tab('Aufträge');
await shot('55-daily-wheel-manifests');
await page.locator('.wheelcard').tap(); await settle(900);
await shot('56-wheel');
await page.locator('.wheel .cta--gold').tap(); await settle(1500);
await shot('57-wheel-spinning');
await page.waitForSelector('.wheel__result', { timeout: 15000 }); await settle(700);
await shot('58-wheel-result');
await page.locator('.wheel__result .cta').tap(); await settle(400);
await tab('Deck');
await page.locator('.segment button', { hasText: 'Sammlung' }).tap(); await settle(800);
await shot('59-manifests');
await page.locator('.manifest.is-ready').first().tap(); await settle(900);
await tab('Hangar');
await page.locator('.segment button', { hasText: 'Shop' }).tap(); await settle(800);
await shot('60-offers');
await browser.close();
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no console errors');
