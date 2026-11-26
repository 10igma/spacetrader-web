// Captures the Phase 3 screens: hangar with slots, daily screen, albums, card upgrade, forge, upgrade moment.
// Usage: node tools/shots/phase3.mjs <outDir> [scale] [bumpSeed]   (dev server on :5173, offline mode)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2]; const scale = Number(process.argv[3] ?? 1); const bumpSeed = process.argv[4];
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: scale, hasTouch: true, isMobile: true });
const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => problems.push(String(e).slice(0, 300)));
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const settle = (ms) => page.waitForTimeout(ms);
const tab = async (name) => { await page.locator('.nav__item', { hasText: name }).tap(); await settle(1300); };
const dismiss = async () => { await page.locator('.overlay').last().tap({ position: { x: 12, y: 12 } }); await settle(350); };

await page.goto('http://localhost:5173/?q=high&calm=1&seed=p3');
await settle(2000);
await page.locator('.splash').tap(); await settle(700);
// One buy and one jump so the offline save exists and the streak has started.
await tab('Markt');
await page.locator('.good', { hasText: 'Wasser' }).tap(); await settle(500);
await page.locator('.trade__actions .cta').first().tap(); await settle(500);
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('nova.save'));
  const now = Date.now();
  const DAY = 86400000;
  const day = Math.floor((now + 3600000) / DAY);
  for (const id of ['c20', 'c21', 'c11', 'c18', 'c13', 'c02', 'c01', 'c09', 'g001', 'g002', 'g004', 'g006', 'g009', 'g011', 'g014', 'g016', 'g018']) s.collection[id] = 1;
  s.collection.c11 = 3;
  s.cardLevels = { c20: 3, c21: 2 };
  s.deck = { pilot: 'c20', trader: 'c21', tech: 'c13', gunner: 'c18', smuggler: 'c11' };
  s.wallet = { credits: 86400, quanta: 185, shards: 640 };
  s.profile = { level: 8, xp: 900 };
  s.slots = [{ tier: 'standard', readyAt: now - 1000 }, { tier: 'premium', readyAt: now + 2 * 3600000 + 14 * 60000 }, { tier: 'standard', readyAt: null }];
  s.crates.freeStock = 1; s.crates.freeAt = now + 5 * 3600000; s.crates.sinceElite = 6; s.crates.sinceLegend = 41;
  s.streak = { count: 6, lastDay: day - 1, freezes: 1, best: 6 };
  s.calendar = { lastDay: day - 1, step: 3 };
  s.daily = { ...s.daily, day, chestClaimed: false, bought: { standard: 1, premium: 0 }, missions: [
    { kind: 'jumps', target: 5, progress: 5, claimed: false, reward: { credits: 2400 } },
    { kind: 'hotUnits', target: 8, progress: 3, claimed: false, reward: { shards: 40 } },
    { kind: 'profit', target: 32000, progress: 32000, claimed: true, reward: { quanta: 6 } },
  ] };
  localStorage.setItem('nova.save', JSON.stringify(s));
});
await page.goto('http://localhost:5173/?q=high&calm=1');
await settle(2000);
await page.locator('.splash').tap(); await settle(1800);
await shot('30-hub-streak');
await tab('Hangar'); await shot('31-hangar');
await page.locator('.link', { hasText: 'Quoten' }).tap(); await settle(600); await shot('32-odds');
await page.locator('.sheet .cta').tap(); await settle(300);
await tab('Aufträge'); await shot('33-daily');
await tab('Deck'); await shot('34-bridge');
await page.locator('.segment button', { hasText: 'Sammlung' }).tap(); await settle(800); await shot('34-albums');
await page.locator('.holo[role=button]:not(.is-locked)').first().tap(); await settle(1200); await shot('35-upgrade');
await dismiss();
await page.locator('.holo.is-locked').first().tap(); await settle(900); await shot('36-forge');
await dismiss();

if (bumpSeed) {
  await page.goto(`http://localhost:5173/?q=high&calm=1&seed=${bumpSeed}`);
  await settle(2000);
  await page.locator('.splash').tap(); await settle(700);
  await tab('Hangar');
  await page.locator('.free .cta').tap();
  await page.waitForSelector('.reveal');
  const count = async () => (await page.locator('.reveal__count').textContent()).trim();
  const total = (await count()).split('/')[1].trim();
  while (!(await count()).startsWith(total)) {
    const before = await count();
    await page.waitForSelector('.reveal__card');
    await page.locator('.reveal').tap();
    await page.waitForFunction((b) => document.querySelector('.reveal__count')?.textContent?.trim() !== b, before);
  }
  await page.waitForSelector('.reveal__tell--bump', { timeout: 15000 });
  await settle(300);
  await shot('37-upgrade-moment');
}
await browser.close();
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no console errors');
