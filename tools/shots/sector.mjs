// Captures the sector chart: lanes, a far crisis, setting a course and following it.
// Usage: node tools/shots/sector.mjs <outDir> [scale]   (dev server on :5173, offline mode)
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
const app = (fn, arg) => page.evaluate(fn, arg);
const start = async (query) => {
  await page.goto(`http://localhost:5173/?q=high&calm=1&open=1${query}`);
  await settle(2000);
  await page.locator('.splash').tap(); await settle(1500);
};

await start('&seed=sector');
await page.locator('.nav__item', { hasText: 'Markt' }).tap(); await settle(900);
await page.locator('.good', { hasText: 'Wasser' }).tap(); await settle(500);
await page.locator('.trade__actions .cta').first().tap(); await settle(500);
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('nova.save'));
  s.location = 'meridian';
  s.routes = ['lumen', 'kessin', 'helixtor', 'zenit'];
  s.profile = { level: 9, xp: 0 };
  s.stats = { ...s.stats, jumps: 40, profit: 60000 };
  s.crates.opened = 5;
  s.wallet.credits = 64000;
  s.fuel = { amount: 5, updatedAt: Date.now() };
  s.cargo = { huntarms: { qty: 18, avgCost: 400, heat: 0 } };
  // A war at the far end of the Asche territory, and a plague one jump away.
  s.events = [
    { stationId: 'eisenfurt', category: 'waffen', mult: 1.85, demand: 44, drain: 8 },
    { stationId: 'zenit', category: 'medizin', mult: 1.6, demand: 21, drain: 6 },
  ];
  localStorage.setItem('nova.save', JSON.stringify(s));
});
await start('');
await shot('210-hub-crises');
check('the hub marks both crises on one symbol', await page.locator('.rail__btn--crisis i').innerText() === '2');
await page.locator('.hub > .cta').tap(); await settle(900);
await shot('211-sector-chart');
check('the chart shows all twelve stations', await page.locator('.sector__node').count() === 12);
check('four lanes lead away from the hub station', await page.locator('.sector__lane.is-open').count() === 4);

// Set a course for the war, two jumps away.
await page.locator('.target--crisis', { hasText: 'Eisenfurt' }).tap(); await settle(900);
await shot('212-course-set');
check('the course is two jumps long', await page.locator('.sector__lane.is-course').count() === 2);
check('the first jump of the course comes first', await page.locator('.route').first().evaluate((el) => el.classList.contains('route--course')));
check('the course says what will be left on arrival', await page.locator('.course__crisis').innerText().then((t) => t.includes('Bedarf 28')));
const demandBefore = await app(() => window.__nova.app.getState().view.events.find((e) => e.stationId === 'eisenfurt').demand);

// Follow it.
await page.locator('.route--course').tap();
await page.waitForFunction(() => { const s = window.__nova.app.getState(); return s.travel && s.view.encounter; }, null, { timeout: 4000 }).then(async () => {
  await page.locator('.opt').last().tap();
  await page.waitForSelector('.travel__tap', { timeout: 6000 }); await page.locator('.travel__tap').tap();
}, () => {});
await page.waitForFunction(() => !window.__nova.app.getState().travel, null, { timeout: 15000 }); await settle(800);
const afterOne = await app(() => { const s = window.__nova.app.getState(); return { at: s.view.location, course: s.course, demand: s.view.events.find((e) => e.stationId === 'eisenfurt')?.demand }; });
check('the first jump follows a lane towards the target', ['lumen', 'kessin'].includes(afterOne.at));
check('the course is kept until the target is reached', afterOne.course === 'eisenfurt');
check('the demand dropped by the announced amount', afterOne.demand === demandBefore - 8);
await page.locator('.nav__item', { hasText: 'Station' }).tap(); await settle(900);
await shot('213-hub-on-course');
check('the main button continues the course', await page.locator('.hub > .cta span').first().innerText().then((t) => t.toUpperCase().includes('EISENFURT')));
await page.locator('.hub > .cta').tap(); await settle(900);
await shot('214-chart-on-course');
await page.locator('.route--course').tap();
await page.waitForFunction(() => { const s = window.__nova.app.getState(); return s.travel && s.view.encounter; }, null, { timeout: 4000 }).then(async () => {
  await page.locator('.opt').last().tap();
  await page.waitForSelector('.travel__tap', { timeout: 6000 }); await page.locator('.travel__tap').tap();
}, () => {});
await page.waitForFunction(() => !window.__nova.app.getState().travel, null, { timeout: 15000 }); await settle(900);
const arrived = await app(() => { const s = window.__nova.app.getState(); return { at: s.view.location, course: s.course, tab: s.tab }; });
check('arrived at the war', arrived.at === 'eisenfurt');
check('the course is cleared on arrival', arrived.course === null);
await shot('215-market-in-crisis');
check('the market announces the crisis', await page.locator('.market__event--crisis').count() === 1);
await browser.close();
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no console errors');
