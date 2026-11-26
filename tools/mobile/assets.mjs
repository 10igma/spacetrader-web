// Renders the app icon, the Android launcher and notification icons, the splash screens
// and the icons of the installable web app from one drawing.
// Usage: node tools/mobile/assets.mjs      (run from the repository root, after `cap add android`)
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');

const CLIENT = 'packages/client';
const RES = `${CLIENT}/android/app/src/main/res`;
const BG = '#02030a';

/** The mark: a ringed planet. `scale` shrinks it around the centre, for adaptive icons and splash screens. */
const mark = (scale = 1) => `
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    <g transform="rotate(-22 512 512)">
      <ellipse cx="512" cy="512" rx="400" ry="112" fill="none" stroke="url(#ring)" stroke-width="30" clip-path="url(#back)" opacity="0.75"/>
    </g>
    <circle cx="512" cy="512" r="250" fill="#3be3ff" filter="url(#glow)" opacity="0.5"/>
    <circle cx="512" cy="512" r="232" fill="url(#planet)"/>
    <path d="M300 470 Q420 430 520 462 T730 440" fill="none" stroke="#e9fbff" stroke-width="16" opacity="0.28" stroke-linecap="round"/>
    <path d="M320 590 Q450 560 560 590 T720 570" fill="none" stroke="#e9fbff" stroke-width="12" opacity="0.18" stroke-linecap="round"/>
    <g transform="rotate(-22 512 512)">
      <ellipse cx="512" cy="512" rx="400" ry="112" fill="none" stroke="url(#ring)" stroke-width="44" clip-path="url(#front)" filter="url(#soft)" opacity="0.9"/>
      <ellipse cx="512" cy="512" rx="400" ry="112" fill="none" stroke="url(#ring)" stroke-width="30" clip-path="url(#front)"/>
    </g>
    <path d="M770 250 l22 -58 22 58 58 22 -58 22 -22 58 -22 -58 -58 -22 Z" fill="#fff3c4"/>
  </g>`;
const defs = `
  <defs>
    <radialGradient id="space" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="#16244d"/><stop offset="0.55" stop-color="#070b1c"/><stop offset="1" stop-color="${BG}"/>
    </radialGradient>
    <radialGradient id="planet" cx="36%" cy="30%" r="80%">
      <stop offset="0" stop-color="#bff6ff"/><stop offset="0.28" stop-color="#3be3ff"/><stop offset="0.62" stop-color="#2a5bd8"/><stop offset="1" stop-color="#170a3c"/>
    </radialGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ff4dd2" stop-opacity="0"/><stop offset="0.25" stop-color="#ff4dd2"/><stop offset="0.55" stop-color="#ffc24a"/><stop offset="0.85" stop-color="#3be3ff"/><stop offset="1" stop-color="#3be3ff" stop-opacity="0"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="26"/></filter>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>
    <clipPath id="front"><rect x="-200" y="512" width="1424" height="712"/></clipPath>
    <clipPath id="back"><rect x="-200" y="-200" width="1424" height="712"/></clipPath>
  </defs>`;
const stars = [[170, 210, 5], [820, 170, 4], [880, 760, 5], [140, 800, 3], [690, 880, 3], [300, 120, 3], [930, 430, 3]]
  .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#dff3ff" opacity="0.85"/>`).join('');
const svg = (inner, clip = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="100%" height="100%" style="display:block;${clip}">${defs}${inner}</svg>`;

const ART = {
  icon: svg(`<rect width="1024" height="1024" fill="url(#space)"/>${stars}${mark()}`),
  round: svg(`<rect width="1024" height="1024" fill="url(#space)"/>${stars}${mark(0.86)}`, 'border-radius:50%'),
  // Adaptive icons crop to the middle two thirds: keep the mark inside.
  foreground: svg(mark(0.56)),
  // Notification icons are a white shape on nothing.
  status: svg(`<circle cx="512" cy="512" r="250" fill="#fff"/><g transform="rotate(-22 512 512)"><ellipse cx="512" cy="512" rx="430" ry="124" fill="none" stroke="#fff" stroke-width="56"/></g>`),
};

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
async function render(html, width, height, path, transparent) {
  mkdirSync(path.slice(0, path.lastIndexOf('/')), { recursive: true });
  await page.setViewportSize({ width, height });
  await page.setContent(`<body style="margin:0;background:${transparent ? 'transparent' : BG};width:${width}px;height:${height}px;display:grid;place-items:center">${html}</body>`);
  await page.screenshot({ path, omitBackground: transparent });
}
const square = (art, size, path, transparent = false) => render(`<div style="width:${size}px;height:${size}px">${art}</div>`, size, size, path, transparent);

// Installable web app
await square(ART.icon, 192, `${CLIENT}/public/icons/icon-192.png`);
await square(ART.icon, 512, `${CLIENT}/public/icons/icon-512.png`);
await square(ART.icon, 180, `${CLIENT}/public/icons/apple-touch-icon.png`);

if (existsSync(RES)) {
  const density = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [name, k] of Object.entries(density)) {
    await square(ART.icon, 48 * k, `${RES}/mipmap-${name}/ic_launcher.png`);
    await square(ART.round, 48 * k, `${RES}/mipmap-${name}/ic_launcher_round.png`, true);
    await square(ART.foreground, 108 * k, `${RES}/mipmap-${name}/ic_launcher_foreground.png`, true);
    await square(ART.status, 24 * k, `${RES}/drawable-${name}/ic_stat_nova.png`, true);
  }
  // Splash screens: the mark on the game's black, at whatever sizes the template ships.
  for (const dir of readdirSync(RES).filter((d) => d.startsWith('drawable'))) {
    const file = `${RES}/${dir}/splash.png`;
    if (!existsSync(file)) continue;
    const head = readFileSync(file);
    const width = head.readUInt32BE(16), height = head.readUInt32BE(20);
    const size = Math.round(Math.min(width, height) * 0.62);
    await render(`<div style="width:${size}px;height:${size}px">${svg(mark(0.9))}</div>`, width, height, file, false);
  }
}
const IOS = `${CLIENT}/ios/App/App/Assets.xcassets`;
if (existsSync(IOS)) {
  await square(ART.icon, 1024, `${IOS}/AppIcon.appiconset/AppIcon-512@2x.png`);
  for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
    await render(`<div style="width:1100px;height:1100px">${svg(mark(0.9))}</div>`, 2732, 2732, `${IOS}/Splash.imageset/${name}`, false);
  }
}
await browser.close();
console.log('assets written');
