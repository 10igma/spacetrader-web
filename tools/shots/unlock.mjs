// Captures the staged unlocks: what a new captain sees, and how the rest arrives level by level.
// Usage: node tools/shots/unlock.mjs <outDir> [scale]   (dev server on :5173, offline mode)
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
// No "open" switch here: this run is about what is locked.
const start = async (query) => {
  await page.goto(`http://localhost:5173/?q=high${query}`);
  await settle(2000);
  await page.locator('.splash').tap(); await settle(1500);
};
const tabs = () => page.locator('.nav__item .nav__label').allInnerTexts().then((all) => all.map((t) => t.toUpperCase()));
const tab = async (name) => { await page.locator('.nav__item', { hasText: name }).tap(); await settle(800); };
const patch = async (fn, arg) => {
  await page.evaluate(([src, a]) => { const s = JSON.parse(localStorage.getItem('nova.save')); new Function('s', 'a', src)(s, a); localStorage.setItem('nova.save', JSON.stringify(s)); }, [fn, arg]);
  await start('');
};
const level = (n) => patch('s.profile = { level: a, xp: 0 }; s.wallet.credits = 30000;', n);

// --- A new captain ---------------------------------------------------------------
await start('&seed=unlock');
await shot('250-rookie-hub');
check('a new captain has three tabs', JSON.stringify(await tabs()) === JSON.stringify(['STATION', 'MARKT', 'HANGAR']));
check('the home screen has two tiles: tank and container', await page.locator('.tile').count() === 2);
await tab('Markt');
check('the market has no auction house yet', await page.locator('.market .segment').count() === 0);
// Make a save, so the following steps can set the level.
await page.locator('.good', { hasText: 'Wasser' }).tap(); await settle(500);
await page.locator('.trade__actions .cta').first().tap(); await settle(600);
await tab('Hangar');
await shot('251-rookie-hangar');
check('the hangar shows containers only', await page.locator('.hangar .segment').count() === 0);

// --- The first crew opens the deck ---------------------------------------------------
await patch('s.crates.opened = 1;');
check('the deck appears with the first crew', (await tabs()).includes('DECK') && !(await tabs()).includes('AUFTRÄGE'));
check('the new tab carries a mark', await page.locator('.nav__item', { hasText: 'Deck' }).locator('.dot--new').count() === 1);
await shot('252-deck-new');
await tab('Deck');
check('convoys are not there yet', await page.locator('.deck .segment button').count() === 2);
await tab('Station');
check('once looked at, the mark is gone', await page.locator('.nav__item', { hasText: 'Deck' }).locator('.dot--new').count() === 0);

// --- Level by level -----------------------------------------------------------------
await level(2);
check('level 2 brings the daily goals', (await tabs()).length === 5);
await tab('Aufträge');
check('charter and league are not there yet', await page.locator('.daily .segment').count() === 0);
await shot('253-level2-daily');

await app(() => window.__nova.app.getState().celebrate({ kind: 'level', level: 3 })); await settle(1700);
await shot('254-level3-moment');
check('the level-up names what is new', await page.locator('.moment__lines .is-new').allInnerTexts().then((all) => all.length === 3 && all.some((t) => t.includes('Handelsposten')) && all.some((t) => t.includes('Frachtbörse')) && all.some((t) => t.includes('Shop'))));
await page.locator('.moment').tap(); await settle(500);

await level(3);
check('level 3 brings the trading post to the home screen', await page.locator('.tile').count() === 3 && await page.locator('.tile--new').count() === 1);
await shot('255-level3-hub');
await tab('Hangar');
check('and the shop to the hangar', await page.locator('.hangar .segment button').allInnerTexts().then((all) => all.map((t) => t.toUpperCase()).join() === 'CONTAINER,SHOP'));

await level(4);
await tab('Hangar');
check('level 4 brings the shipyard', await page.locator('.hangar .segment button').count() === 3);
await tab('Aufträge');
check('and the season charter', await page.locator('.daily .segment button').count() === 2);

await level(5);
await tab('Markt');
check('level 5 brings the auction house', await page.locator('.market .segment button').count() === 2);
await shot('256-level5-market');
await tab('Aufträge');
check('and the league', await page.locator('.daily .segment button').count() === 3);

await level(6);
await tab('Deck');
check('level 6 brings the convoys', await page.locator('.deck .segment button').count() === 3);

// --- Someone who was already playing gets no marks ----------------------------------
await page.evaluate(() => localStorage.removeItem('nova.seen'));
await level(12);
check('an existing captain sees everything and nothing is marked as new', (await tabs()).length === 5 && await page.locator('.dot--new').count() === 0 && await page.locator('.tile--new').count() === 0);
await shot('257-existing-captain');
await browser.close();
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no console errors');
