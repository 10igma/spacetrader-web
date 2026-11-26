// Checks what the native shell relies on, in the browser: device settings, the back button logic,
// refresh after a pause, and that a save from an older version of the rules is carried over.
// Usage: node tools/shots/device.mjs <outDir> [scale]   (dev server on :5173, offline mode)
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
const settle = (ms) => page.waitForTimeout(ms);
const check = (name, ok) => { if (!ok) problems.push(`CHECK FAILED: ${name}`); else console.log(`ok: ${name}`); };
const start = async (query) => {
  await page.goto(`http://localhost:5173/?q=high&calm=1${query}`);
  await settle(2000);
  await page.locator('.splash').tap(); await settle(1500);
};
const app = (fn) => page.evaluate(fn);

await start('&seed=device');
await page.locator('.nav__item', { hasText: 'Markt' }).tap(); await settle(900);
await page.locator('.good', { hasText: 'Wasser' }).tap(); await settle(500);
await page.locator('.trade__actions .cta').first().tap(); await settle(500);

// A save as it looked two versions ago: no ships, convoys, cosmetics or season album.
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('nova.save'));
  s.version = 8;
  s.wallet.credits = 76_543;
  for (const key of ['fleet', 'convoys', 'cosmetics', 'prestige']) delete s[key];
  delete s.season.album; delete s.daily.convoys; delete s.rng.convoy; delete s.rng.season;
  localStorage.setItem('nova.save', JSON.stringify(s));
});
await start('');
check('old save carried over with its credits', await app(() => window.__nova.app.getState().view.wallet.credits) === 76_543);
check('new systems are there', await app(() => window.__nova.app.getState().view.fleet.active) === 'sperling');

// Back button: closes what is on top, then goes home, then reports nothing left.
await page.locator('.nav__item', { hasText: 'Deck' }).tap(); await settle(700);
await page.locator('.topbar__me').tap(); await settle(700);
check('back closes the sheet', await app(() => { const s = window.__nova.app.getState(); return s.back() && window.__nova.app.getState().sheet === null; }));
check('back goes to the station', await app(() => { const s = window.__nova.app.getState(); return s.back() && window.__nova.app.getState().tab === 'station'; }));
check('back has nothing left', await app(() => window.__nova.app.getState().back()) === false);

// Refresh after a pause keeps the running game.
check('refresh keeps the game', await app(async () => { await window.__nova.app.getState().refresh(); return window.__nova.app.getState().view.wallet.credits; }) === 76_543);

// Device settings
await page.locator('.topbar__me').tap(); await settle(700);
await page.locator('.profile__scroll').evaluate((el) => el.scrollTo(0, 9999)); await settle(400);
await page.screenshot({ path: `${out}/140-device-settings.png` });
check('reminders are off by default', await page.locator('.switch').nth(1).getAttribute('aria-checked') === 'false');
check('reminders cannot be switched on in a browser', await page.locator('.switch').nth(1).isDisabled());
await page.locator('.switch').first().tap(); await settle(400);
check('haptics switch is remembered', await page.evaluate(() => JSON.parse(localStorage.getItem('nova.device')).haptics) === false);
await page.screenshot({ path: `${out}/141-haptics-off.png` });

// The installable web app has its manifest and icons.
const manifest = await page.evaluate(async () => (await fetch('./manifest.webmanifest')).json());
check('manifest is served', manifest.display === 'standalone' && manifest.icons.length === 3);
check('icons are served', await page.evaluate(async () => (await fetch('./icons/icon-512.png')).ok));
await browser.close();
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no console errors');
