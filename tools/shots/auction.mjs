// Captures the auction house: lots, bidding, own listings, results.
// Usage: node tools/shots/auction.mjs <outDir> [scale]   (dev server on :5173, offline mode)
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

await page.goto('http://localhost:5173/?q=high&calm=1&open=1&seed=auc');
await settle(2000);
await page.locator('.splash').tap(); await settle(700);
await tab('Markt');
await page.locator('.good', { hasText: 'Wasser' }).tap(); await settle(500);
await page.locator('.trade__actions .cta').first().tap(); await settle(500);
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('nova.save'));
  s.wallet = { credits: 318400, quanta: 96, shards: 310 };
  s.profile = { level: 11, xp: 400 };
  s.collection = { c12: 3, c15: 2, c17: 2, c20: 1, c21: 1, c01: 4 };
  s.auction.results = [{ kind: 'won', cardId: 'c19', price: 26400 }, { kind: 'sold', cardId: 'c14', price: 5130 }, { kind: 'lost', cardId: 'c22', price: 231000 }];
  localStorage.setItem('nova.save', JSON.stringify(s));
});
await page.goto('http://localhost:5173/?q=high&calm=1&open=1');
await settle(2000);
await page.locator('.splash').tap(); await settle(1500);
await tab('Markt');
await page.locator('.segment button', { hasText: 'Auktionen' }).tap(); await settle(900);
await shot('70-auction-results');
await page.locator('.results .mission__btn').tap(); await settle(600);
// Bid on the lot that runs longest, so it is still open at the end of this script.
await page.locator('button.lot').last().tap(); await settle(800);
await shot('71-bid-sheet');
await page.locator('.bid .cta').first().tap(); await settle(900);
await shot('72-leading');
await page.locator('.market__list').evaluate((el) => el.scrollTo(0, 9999)); await settle(400);
await page.locator('.market__list > .cta--ghost').tap(); await settle(700);
await shot('73-sell-pick');
await page.locator('.pick').first().tap(); await settle(600);
await shot('74-sell-price');
await page.locator('.picker .cta').tap(); await settle(900);
await page.locator('.market__list').evaluate((el) => el.scrollTo(0, 9999)); await settle(400);
await shot('75-listing');
await browser.close();
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no console errors');
