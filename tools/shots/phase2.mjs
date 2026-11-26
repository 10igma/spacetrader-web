// Captures the Phase 2 screens: bridge, seat picker, black market, hold, wanted level, news.
// Usage: node tools/shots/phase2.mjs <outDir> [scale]   (dev server on :5173, offline mode)
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

// 1. Fresh game, then shape the offline save into an interesting mid-game state.
await page.goto('http://localhost:5173/?q=high&calm=1&seed=p2');
await settle(2000);
await page.locator('.splash').tap(); await settle(800);
await tab('Hangar');
await page.locator('.cta').tap();
await page.waitForSelector('.reveal');
for (let i = 0; i < 12 && !(await page.locator('.reveal--summary').count()); i++) { await page.locator('.reveal').tap(); await settle(450); }
await page.locator('.reveal .cta', { hasText: 'Weiter' }).tap(); await settle(400);
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('nova.save'));
  for (const id of ['c20', 'c21', 'c11', 'c18', 'c15', 'c17', 'c13', 'c06']) s.collection[id] = 1;
  s.deck = { pilot: 'c20', trader: 'c21', tech: 'c13', gunner: 'c18', smuggler: 'c11' };
  s.wallet.credits = 48200;
  s.profile = { level: 6, xp: 400 };
  s.cargo = { neurostaub: { qty: 6, avgCost: 640, heat: 3 }, meds: { qty: 5, avgCost: 300, heat: 0 } };
  s.wanted.tessera = { level: 2, cool: 3 };
  s.event = { stationId: s.routes[0], category: 'medizin', mult: 1.72, jumpsLeft: 3 };
  localStorage.setItem('nova.save', JSON.stringify(s));
});
await page.goto('http://localhost:5173/?q=high&calm=1');
await settle(2000);
await page.locator('.splash').tap(); await settle(1800);
await shot('20-hub-wanted-news');
await page.locator('.hub .cta').tap(); await settle(900);
await shot('21-routes');
await page.locator('.overlay').tap({ position: { x: 20, y: 20 } }); await settle(400);
await tab('Markt');
await shot('22-market');
await page.locator('.good', { hasText: 'Neurostaub' }).tap(); await settle(700);
await shot('23-fence-trade');
await page.locator('.overlay').tap({ position: { x: 20, y: 20 } }); await settle(300);
await page.locator('.pill--btn').tap(); await settle(600);
await shot('24-hold');
await page.locator('.overlay').tap({ position: { x: 20, y: 20 } }); await settle(300);
await tab('Deck');
await shot('25-bridge');
await page.locator('.seat').nth(2).tap(); await settle(700);
await shot('26-picker');
await page.locator('.pick').first().tap(); await settle(700);
await shot('27-bridge-after');
await browser.close();
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no console errors');
