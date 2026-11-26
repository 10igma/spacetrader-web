// Walks one complete jump (buy, route, warp, encounter, arrival, sale) and captures each step.
// Usage: node tools/shots/jump.mjs <outDir> [seed] [scale] [routeIndex] [goodName]   (dev server on :5173)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2]; const seed = process.argv[3] ?? 'j1'; const scale = Number(process.argv[4] ?? 1);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: scale, hasTouch: true, isMobile: true });
const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => problems.push(String(e).slice(0, 300)));
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const settle = (ms) => page.waitForTimeout(ms);
await page.goto(`http://localhost:5173/?q=high&calm=1&seed=${seed}`);
await settle(2500);
await page.locator('.splash').tap(); await settle(2000);
await shot('a-hub');
await page.locator('.nav__item', { hasText: 'Markt' }).tap(); await settle(1500);
await shot('b-market');
await page.locator('.good', { hasText: process.argv[6] ?? 'Wasser' }).tap(); await settle(700);
await settle(300); await shot('c-trade');
await page.locator('.trade__actions .cta').first().tap(); await settle(700);
await page.locator('.nav__item', { hasText: 'Station' }).tap(); await settle(800);
await page.locator('.hub .cta').tap(); await settle(900);
await shot('d-routes');
await page.locator('.route').nth(Number(process.argv[5] ?? 0)).tap(); await settle(1300);
await shot('e-warp');
const first = await Promise.race([
  page.waitForSelector('.enc', { timeout: 8000 }).then(() => 'enc'),
  page.waitForSelector('.arrive', { timeout: 8000 }).then(() => 'arrive'),
]);
console.log('after warp:', first);
if (first === 'enc') {
  await settle(900); await shot('f-encounter');
  await page.locator('.opt').first().tap();
  await page.waitForSelector('.enc--result'); await settle(900); await shot('g-outcome');
  await page.locator('.travel__tap').tap();
  await page.waitForSelector('.arrive', { timeout: 8000 });
}
await settle(1500); await shot('h-arrive');
await page.waitForSelector('.market', { timeout: 8000 }); await settle(1500);
await shot('i-market-dest');
const hot = page.locator('.good--owned').first();
if (await hot.count()) {
  await hot.tap(); await settle(600);
  await page.locator('.trade__actions .cta--gold').tap(); await settle(450);
  await shot('j-sale');
}
await browser.close();
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no console errors');
