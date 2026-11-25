// Walks the preview build and captures the key screens at phone size.
// Usage: node tools/shots/shots.mjs [baseUrl] [outDir] [scale]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');

const base = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'shots';
const scale = Number(process.argv[4] ?? 2);
const seed = process.argv[5] ?? 'shot0';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: scale, hasTouch: true, isMobile: true });
const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => problems.push(String(e).slice(0, 300)));
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
const settle = (ms) => page.waitForTimeout(ms);

await page.goto(`${base}?q=high&seed=${seed}`);
await settle(3000);
await shot('01-splash');
await page.locator('.splash').tap();
await settle(2500);
await shot('02-hub');
await page.locator('.nav__item', { hasText: 'Hangar' }).tap();
await settle(2500);
await shot('03-hangar');
await page.locator('.cta').tap();
await settle(700);
await shot('04-reveal-charge');
// Skip through all but the last card, then let the best one play in full.
// Phases also advance on their own timers, so drive this by observed state.
const count = async () => (await page.locator('.reveal__count').textContent()).trim();
const total = (await count()).split('/')[1].trim();
while (!(await count()).startsWith(total)) {
  const before = await count();
  await page.waitForSelector('.reveal__card');
  await page.locator('.reveal').tap();
  await page.waitForFunction((b) => document.querySelector('.reveal__count')?.textContent?.trim() !== b, before);
}
await page.waitForSelector('.reveal__tell, .reveal__card', { timeout: 15000 });
await settle(250);
await shot('05-reveal-tell');
await page.waitForSelector('.reveal__card', { timeout: 8000 });
await settle(1600);
await shot('06-reveal-card');
await page.locator('.reveal').tap();
await settle(900);
await shot('07-reveal-summary');
await page.locator('.reveal .cta').tap();
await settle(600);
await page.locator('.link', { hasText: 'Quoten' }).tap();
await settle(600);
await shot('08-odds');
await page.locator('.sheet .cta').tap();
await page.locator('.nav__item', { hasText: 'Deck' }).tap();
await settle(2500);
await shot('09-deck');
await page.locator('.holo[role=button]').first().tap();
await settle(1200);
await shot('10-inspect');

await browser.close();
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no console errors');
