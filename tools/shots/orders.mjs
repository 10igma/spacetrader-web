// Captures delivery orders: the freight board, accepting, loading, the chart, delivering, and an order out of reach.
// Usage: node tools/shots/orders.mjs <outDir> [scale]   (dev server on :5173, offline mode)
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
const state = () => app(() => { const s = window.__nova.app.getState(); return { at: s.view.location, credits: s.view.wallet.credits, orders: s.view.orders, course: s.course, fuel: s.view.fuel.amount }; });
const start = async (query) => {
  await page.goto(`http://localhost:5173/?q=high&calm=1${query}`);
  await settle(2000);
  await page.locator('.splash').tap(); await settle(1500);
};
const jump = async () => {
  await page.locator('.route--course').tap();
  await page.waitForFunction(() => { const s = window.__nova.app.getState(); return s.travel && s.view.encounter; }, null, { timeout: 4000 }).then(async () => {
    await page.locator('.opt').last().tap();
    await page.waitForSelector('.travel__tap', { timeout: 6000 }); await page.locator('.travel__tap').tap();
  }, () => {});
  await page.waitForFunction(() => !window.__nova.app.getState().travel, null, { timeout: 15000 }); await settle(900);
};

await start('&seed=orders');
await page.locator('.nav__item', { hasText: 'Markt' }).tap(); await settle(900);
await page.locator('.good', { hasText: 'Wasser' }).tap(); await settle(500);
await page.locator('.trade__actions .cta').first().tap(); await settle(500);
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('nova.save'));
  s.location = 'lumen';
  s.routes = ['meridian', 'kreuz', 'eisenfurt'];
  s.profile = { level: 9, xp: 0 };
  s.stats = { ...s.stats, jumps: 40, profit: 60000 };
  s.crates.opened = 5;
  s.wallet.credits = 64000;
  s.fuel = { amount: 5, updatedAt: Date.now() };
  s.cargo = {};
  s.events = [];
  s.orders = {
    seq: 13,
    active: [],
    offers: [
      { id: 11, from: 'lumen', to: 'kessin', goodId: 'meds', qty: 14, pay: 520, deposit: 728, left: 3 },
      { id: 12, from: 'lumen', to: 'solace', goodId: 'drones', qty: 12, pay: 960, deposit: 1152, left: 4 },
      { id: 13, from: 'lumen', to: 'corvus', goodId: 'art', qty: 10, pay: 1180, deposit: 1180, left: 5 },
    ],
  };
  localStorage.setItem('nova.save', JSON.stringify(s));
});
await start('');
await shot('220-hub-board');
check('the hub announces the freight board', await page.locator('.rail__btn--orders').getAttribute('aria-label').then((t) => t.includes('3 Lieferaufträge')));
await page.locator('.rail__btn--orders').tap(); await settle(700);
await shot('221-board');
check('three offers hang on the board', await page.locator('.orders .order').count() === 3);
check('every offer says deadline, deposit and what it earns', await page.locator('.orders .facts').allInnerTexts().then((all) => all.length === 3 && all.every((t) => t.toUpperCase().includes('GEWINN') && t.toUpperCase().includes('PFAND') && t.toUpperCase().includes('FRIST'))));

// Accepting takes two taps: the first says what the deposit is.
const before = await state();
const acceptBtn = page.locator('.orders .order').first().locator('.mission__btn');
await acceptBtn.tap(); await settle(300);
check('the first tap only asks', await acceptBtn.innerText().then((t) => t.toUpperCase().includes('PFAND 728')) && (await state()).orders.active.length === 0);
await acceptBtn.tap(); await settle(700);
const accepted = await state();
check('the second tap accepts and takes the deposit', accepted.orders.active.length === 1 && accepted.credits === before.credits - 728);
await shot('222-accepted');
check('the order moved to the accepted list', await page.locator('.orders .order').first().locator('.order__status').innerText().then((t) => t.includes('Noch 3 Sprünge')));
await page.locator('.sheet__x').tap(); await settle(500);

// The market offers to load the lot.
await page.locator('.nav__item', { hasText: 'Markt' }).tap(); await settle(900);
await shot('223-market-load');
check('the market says what is missing for the order', await page.locator('.market__order--load').innerText().then((t) => t.includes('14 ×') && t.includes('Kessin')));
await page.locator('.market__order--load').tap(); await settle(600);
check('the trade sheet starts at the missing amount', await page.locator('.stepper output').innerText() === '14');
await shot('224-trade-for-order');
await page.locator('.trade__actions .cta').first().tap(); await settle(700);
check('with the lot aboard the market stops asking', await page.locator('.market__order--load').count() === 0);

// The chart marks where the order goes.
await page.locator('.nav__item', { hasText: 'Station' }).tap(); await settle(800);
await shot('225-hub-order-running');
check('the hub follows the order', await page.locator('.rail__btn--orders').getAttribute('aria-label').then((t) => t.includes('Lieferauftrag Kessin') && t.includes('Ware an Bord')));
await page.locator('.hub > .cta').tap(); await settle(900);
check('the chart marks the destination', await page.locator('.sector__order').count() === 1 && await page.locator('.sector__due').innerHTML().then((t) => t.includes('noch 3')));
check('express lanes are drawn', await page.locator('.sector__express').count() === 6);
await page.locator('.target--order').tap(); await settle(900);
await shot('226-chart-order-course');
check('the course takes the way that burns less fuel', await page.locator('.course small').first().innerText().then((t) => t.includes('2 Sprünge') && t.includes('2 Treibstoff')));
check('the course knows about the order', await page.locator('.course__order').count() === 1);
await jump();
const half = await state();
check('one jump on, one jump less on the order', half.at === 'eisenfurt' && half.orders.active[0].left === 2);
await page.locator('.nav__item', { hasText: 'Station' }).tap(); await settle(700);
await page.locator('.hub > .cta').tap(); await settle(900);
await jump();
const there = await state();
check('arrived with a jump to spare', there.at === 'kessin' && there.orders.active[0].here && there.orders.active[0].left === 1);
await shot('227-market-deliver');
check('the market offers to deliver', await page.locator('.market__order.is-ready .mission__btn').count() === 1);
check('the station has none of the good to sell', await page.locator('.good', { hasText: 'Ausverkauft' }).count() === 1);
await page.locator('.market__order.is-ready .mission__btn').tap(); await settle(350);
await shot('228-delivered');
check('the delivery is celebrated as a sale', await page.locator('.salepop').innerText().then((t) => t.toUpperCase().includes('LIEFERAUFTRAG ERFÜLLT')));
const paid = await state();
check('paid the fixed price and the deposit back', paid.credits === there.credits + 14 * 520 + 728 && paid.orders.active.length === 0);
await settle(2600);

// An order that cannot be reached any more says so, and fails on the next jump.
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('nova.save'));
  s.fuel = { amount: 5, updatedAt: Date.now() };
  s.orders.active = [{ id: 30, from: 'lumen', to: 'corvus', goodId: 'art', qty: 10, pay: 1180, deposit: 1180, left: 1 }];
  localStorage.setItem('nova.save', JSON.stringify(s));
});
await start('');
await shot('229-hub-order-lost');
check('the hub warns that the order is out of reach', await page.locator('.rail__btn--lost').getAttribute('aria-label').then((t) => t.includes('Nicht mehr zu schaffen')));
await page.locator('.hub > .cta, .hub__skip').last().tap(); await settle(900);
await shot('230-chart-order-lost');
await page.locator('.route').first().tap();
await page.waitForFunction(() => { const s = window.__nova.app.getState(); return s.travel && s.view.encounter; }, null, { timeout: 4000 }).then(async () => {
  await page.locator('.opt').last().tap();
  await page.waitForSelector('.travel__tap', { timeout: 6000 }); await page.locator('.travel__tap').tap();
}, () => {});
await page.waitForFunction(() => window.__nova.app.getState().view.orders.active.length === 0, null, { timeout: 15000 });
check('the arrival card carries the lost deposit', await page.waitForSelector('.arrive__chip.is-down', { timeout: 12000 }).then((el) => el.innerText()).then((t) => t.includes('1\u2019180') || t.includes("1'180"), () => false));
await shot('231-order-failed');
check('the lost order is gone from the hub', await page.waitForFunction(() => !window.__nova.app.getState().travel, null, { timeout: 15000 }).then(() => page.locator('.rail__btn--lost').count()).then((n) => n === 0));
await browser.close();
console.log(problems.length ? `PROBLEMS:\n${problems.join('\n')}` : 'no console errors');
