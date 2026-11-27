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
    // A rival sets out from Varn-Gürtel with six units: two lanes away, so it gets there when we do.
    { stationId: 'eisenfurt', category: 'waffen', mult: 1.85, demand: 44, drain: 8, rivals: [{ name: 'Vela Wray', at: 'varn', cargo: 6 }] },
    { stationId: 'zenit', category: 'medizin', mult: 1.6, demand: 21, drain: 6 },
  ];
  localStorage.setItem('nova.save', JSON.stringify(s));
  // This run is about the whole sector: start in that view of the chart.
  localStorage.setItem('nova.chart', 'sector');
});
await start('');
await shot('210-hub-crises');
check('the hub marks both crises on one symbol', await page.locator('.rail__btn--crisis i').innerText() === '2');
await page.locator('.hub > .cta').tap(); await settle(900);
await shot('211-sector-chart');
check('the chart shows all twelve stations', await page.locator('.sector__node').count() === 12);
check('four lanes lead away from the hub station', await page.locator('.sector__lane.is-open').count() === 4);
check('each of them says what it costs', await page.locator('.sector__fuel').count() === 4);
// The other view: only the next jump, large.
await page.locator('.routes .segment button', { hasText: 'Nahbereich' }).tap(); await settle(600);
await shot('211b-close-range');
check('close range shows one card per lane, without overlap', await page.locator('.near__card').count() === 4 && await page.evaluate(() => { const r = [...document.querySelectorAll('.near__card')].map((el) => el.getBoundingClientRect()); return r.every((a, i) => r.every((b, j) => i === j || a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top)); }));
await page.locator('.near__card', { hasText: 'Kessin' }).tap(); await settle(500);
check('tapping a card picks that jump', await page.locator('.dest__title b').innerText().then((t) => t.toUpperCase().includes('KESSIN')));
await page.locator('.dest .link').tap(); await settle(300);
await page.locator('.routes .segment button', { hasText: 'Sektor' }).tap(); await settle(600);

// Set a course for the war, two jumps away.
await page.locator('.target--crisis', { hasText: 'Eisenfurt' }).tap(); await settle(900);
await shot('212-course-set');
check('the course is two jumps long', await page.locator('.sector__lane.is-course').count() === 2);
check('the jump button names the first leg of the course', await page.locator('.jump small').innerText().then((t) => /Lumen-Reede|Kessin Tief/.test(t)));
check('there is one destination card, not a list', await page.locator('.dest').count() === 1 && await page.locator('.route').count() === 0);
check('the course says what will be left on arrival', await page.locator('.course__crisis').innerText().then((t) => t.includes('Bedarf 22')));
check('the rival is on the chart and named with what it carries', await page.locator('.sector__rival').count() === 1 && await page.locator('.course__rivals').innerText().then((t) => t.includes('Vela Wray') && t.includes('6') && t.includes('2 Sprüngen')));
const demandBefore = await app(() => window.__nova.app.getState().view.events.find((e) => e.stationId === 'eisenfurt').demand);

// Follow it.
await page.locator('.jump').tap();
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
await page.locator('.jump').tap();
await page.waitForFunction(() => { const s = window.__nova.app.getState(); return s.travel && s.view.encounter; }, null, { timeout: 4000 }).then(async () => {
  await page.locator('.opt').last().tap();
  await page.waitForSelector('.travel__tap', { timeout: 6000 }); await page.locator('.travel__tap').tap();
}, () => {});
await page.waitForFunction(() => !window.__nova.app.getState().travel, null, { timeout: 15000 }); await settle(900);
const arrived = await app(() => { const s = window.__nova.app.getState(); return { at: s.view.location, course: s.course, tab: s.tab }; });
check('arrived at the war', arrived.at === 'eisenfurt');
check('the rival delivered on the way: what is left is what the chart promised', await app(() => window.__nova.app.getState().view.events.find((e) => e.stationId === 'eisenfurt')?.demand) === 22);
check('the course is cleared on arrival', arrived.course === null);
await shot('215-market-in-crisis');
check('the market announces the crisis', await page.locator('.market__event--crisis').count() === 1);
await browser.close();
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no console errors');
