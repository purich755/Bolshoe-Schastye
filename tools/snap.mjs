// Снимок страницы в headless Chrome.
//   node tools/snap.mjs [путь=/] [ширина=1440] [имя=snap] [--sel ".garage"] [--y 1200] [--js "код в странице"]
//        [--wait 1500] [--reduced] [--pre] [--h 900] [--clip x,y,w,h]
// --pre — показать прелоадер (по умолчанию он отключён флагом в sessionStorage)
import { chromium } from 'playwright-core';
import os from 'node:os'; import path from 'node:path';
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i > -1 ? args[i + 1] : d; };
const VALUED = ['--sel', '--y', '--js', '--wait', '--h', '--clip', '--first'];
const pos = args.filter((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1]));
const [p = '', w = '1440', name = 'snap'] = pos;
const W = +w, H = +opt('h', W < 700 ? 812 : 900);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ctx = await chromium.launchPersistentContext(path.join(os.tmpdir(), 'st-snap-' + W), {
  channel: 'chrome', headless: true, viewport: { width: W, height: H }, isMobile: W < 700, hasTouch: W < 700, deviceScaleFactor: 1,
  locale: 'ru-RU', reducedMotion: args.includes('--reduced') ? 'reduce' : 'no-preference',
});
const page = ctx.pages()[0];
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
if (!args.includes('--pre')) await page.addInitScript(() => { try { sessionStorage.setItem('st-pre', '1'); } catch (e) {} });
await page.goto('http://localhost:8216/' + p.replace(/^\/+/, ''), { waitUntil: 'load' });
await sleep(+opt('first', 900));
const go = (y) => page.evaluate((y) => { if (window.ST && ST.lenis) ST.lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y); }, y);
const sel = opt('sel'), Y = opt('y');
if (sel || Y) {
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const target = Y ? +Y : await page.evaluate((s) => document.querySelector(s).getBoundingClientRect().top + scrollY, sel);
  for (let y = 0; y < target; y += 600) { await go(y); await sleep(60); }
  await go(target);
}
const js = opt('js');
if (js) console.log('js →', JSON.stringify(await page.evaluate(js)).slice(0, 2000));
await sleep(+opt('wait', 1500));
const clip = opt('clip');
await page.screenshot({ path: `raw/${name}.png`, ...(clip ? { clip: Object.fromEntries(clip.split(',').map((v, i) => [['x', 'y', 'width', 'height'][i], +v])) } : {}) });
if (errors.length) console.log('ошибки:', errors.join('\n'));
await ctx.close();
console.log(`raw/${name}.png`);
