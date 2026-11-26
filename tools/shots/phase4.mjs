// Captures Phase 4: comeback gift, season charter, weekend event, league.
// Usage: node tools/shots/phase4.mjs <outDir> [scale]   (dev server on :5173, offline mode)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2]; const scale = Number(process.argv[3] ?? 1);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const problems = [];
const DAY = 86_400_000;

async function open(offsetMs) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: scale, hasTouch: true, isMobile: true });
  // Shift the clock so the script can visit a weekday and a Saturday on any calendar day.
  await page.addInitScript((off) => { const real = Date.now.bind(Date); Date.now = () => real() + off; }, offsetMs);
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => problems.push(String(e).slice(0, 300)));
  return page;
}
const settle = (page, ms) => page.waitForTimeout(ms);
const start = async (page, query) => {
  await page.goto(`http://localhost:5173/?q=high&calm=1${query}`);
  await settle(page, 2000);
  await page.locator('.splash').tap(); await settle(page, 1500);
};
const tab = async (page, name) => { await page.locator('.nav__item', { hasText: name }).tap(); await settle(page, 1200); };
const mode = async (page, name) => { await page.locator('.segment button', { hasText: name }).tap(); await settle(page, 900); };

// Offsets from the real clock to the next Wednesday noon and the next Saturday noon (UTC).
const now = Date.now();
const dow = new Date(now).getUTCDay(); // 0 = Sunday
const noon = Math.floor(now / DAY) * DAY + 12 * 3_600_000;
const toWeekday = (target) => noon + (((target - dow) % 7 + 7) % 7) * DAY - now;
const wednesday = toWeekday(3);
const saturday = wednesday + 3 * DAY;

// --- Wednesday: comeback, charter, league result ---------------------------
let page = await open(wednesday);
await start(page, '&seed=p4');
// The save is written with the first command.
await tab(page, 'Markt');
await page.locator('.good', { hasText: 'Wasser' }).tap(); await settle(page, 500);
await page.locator('.trade__actions .cta').first().tap(); await settle(page, 500);
await page.evaluate(({ day }) => {
  const s = JSON.parse(localStorage.getItem('nova.save'));
  s.wallet = { credits: 184300, quanta: 540, shards: 220 };
  s.profile = { level: 9, xp: 300 };
  s.season = { ...s.season, xp: 21700, premium: false, claimedFree: 9, claimedPremium: 0 };
  s.league = { ...s.league, tier: 1, score: 212400, last: { week: s.league.week - 1, tier: 0, rank: 4, moved: 1, reward: { crate: 'standard', quanta: 15, credits: 0 } } };
  s.lastActiveDay -= 4;
  s.comeback = true;
  localStorage.setItem('nova.save', JSON.stringify(s));
}, { day: DAY });
await start(page, '');
await tab(page, 'Aufträge');
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
await mode(page, 'Heute');
await shot('80-comeback');
await page.locator('.comeback').tap(); await settle(page, 900);
await mode(page, 'Liga');
await shot('81-league-result');
await page.locator('.results .mission__btn').tap(); await settle(page, 900);
await shot('82-league-table');
await page.locator('.table').evaluate((el) => el.scrollTo(0, 9999)); await settle(page, 400);
await shot('83-league-bottom');
await mode(page, 'Saison');
await shot('84-charter-free');
await page.locator('.season__tier .mission__btn').tap(); await settle(page, 900);
await page.locator('.premium').tap(); await settle(page, 400);
await shot('84b-charter-confirm');
await page.locator('.premium').tap(); await settle(page, 1200);
await shot('85-charter-premium');
await page.locator('.season__tier .mission__btn').tap(); await settle(page, 900);
await shot('86-charter-claimed');
const save = await page.evaluate(() => localStorage.getItem('nova.save'));
await page.close();

// --- Saturday: the weekend event is running --------------------------------
page = await open(saturday);
await start(page, '&seed=p4');
await page.evaluate((raw) => {
  const s = JSON.parse(raw);
  s.weekend = { ...s.weekend, points: 31, claimed: 1 };
  localStorage.setItem('nova.save', JSON.stringify(s));
}, save);
await start(page, '');
await tab(page, 'Aufträge');
await mode(page, 'Saison');
await page.screenshot({ path: `${out}/87-weekend-event.png` });
await page.locator('.event .mission__btn').tap(); await settle(page, 900);
await page.screenshot({ path: `${out}/88-weekend-claimed.png` });
await tab(page, 'Markt');
await page.screenshot({ path: `${out}/89-weekend-market.png` });
await tab(page, 'Station');
await page.screenshot({ path: `${out}/90-weekend-hub.png` });
await browser.close();
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no console errors');
