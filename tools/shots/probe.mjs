// Usage: node probe.mjs <url> <out.png> [js to eval before shot] [waitMs]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [url, out, js, wait] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[${m.type()}]`, m.text().slice(0, 600)); });
p.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 600)));
await p.goto(url);
await p.waitForTimeout(2500);
if (js) await p.evaluate(js);
await p.waitForTimeout(Number(wait ?? 1500));
await p.screenshot({ path: out });
await b.close();
