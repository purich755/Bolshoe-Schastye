// Самопроверка в headless Chrome: прокрутка всей страницы шагами, снимки разделов, ошибки, переполнение.
//   node tools/shots.mjs [ширина=1440] [--only top,draft] [--reduced] [--pre] [--h 900]
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i > -1 ? args[i + 1] : d; };
const W = +(args.find((a) => /^\d+$/.test(a)) || 1440);
const H = +opt('h', W < 700 ? 812 : W < 1000 ? 1024 : 900);
const only = opt('only', '').split(',').filter(Boolean);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync('raw/shots', { recursive: true });

const ctx = await chromium.launchPersistentContext(path.join(os.tmpdir(), 'bs-shots-' + W), {
  channel: 'chrome', headless: true, viewport: { width: W, height: H }, isMobile: W < 700, hasTouch: W < 700, deviceScaleFactor: 1,
  locale: 'ru-RU', reducedMotion: args.includes('--reduced') ? 'reduce' : 'no-preference',
});
const page = ctx.pages()[0];
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('requestfailed', (r) => { if (!/yandex|mc\.|metrika/.test(r.url())) errors.push('REQFAIL ' + r.url()); });
if (!args.includes('--pre')) await page.addInitScript(() => { try { sessionStorage.setItem('bs-preload', '1'); } catch (e) {} });
await page.goto(process.env.URL || 'http://localhost:8577/', { waitUntil: 'load' });
await sleep(args.includes('--pre') ? 700 : 4200);
const go = (y) => page.evaluate((y) => { if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y); }, y);
const top = (s) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top + scrollY : null; }, s);
let cur = 0;
async function travel(to) { const step = to > cur ? 350 : -350; for (let y = cur; step > 0 ? y < to : y > to; y += step) { await go(y); await sleep(70); } await go(to); cur = to; await sleep(500); }
const shot = async (name) => { await page.screenshot({ path: `raw/shots/${W}-${name}.png` }); console.log('📸', name); };

const plan = [
  ['top', '#top', 0], ['problems', '#problems', 0], ['check', '#check', 60], ['draft-0', '#draft', 0],
  ['draft-1', '#draft', 'p.35'], ['draft-2', '#draft', 'p.62'], ['draft-3', '#draft', 'p1'],
  ['dirs', '#directions', 0], ['dirs-school', '#directions', 'tab'], ['path', '#path', 'mid'], ['teacher', '#teacher', 40], ['space', '#space', 40],
  ['reviews', '#reviews', 40], ['five', '#five', -80], ['faq', '#faq', 'faq'], ['contacts', '#contacts', 30], ['foot', 'END', 0],
];
if (args.includes('--pre')) { await shot('pre-a'); await sleep(500); await shot('pre-b'); await sleep(1600); await shot('pre-c'); }
for (const [name, sel, mode] of plan) {
  if (only.length && !only.some((o) => name.startsWith(o))) continue;
  if (sel === 'END') { const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight); await travel(max); await sleep(2200); await shot(name); continue; }
  let y = await top(sel);
  if (y === null) continue;
  if (typeof mode === 'string' && mode.startsWith('p')) {
    const len = await page.evaluate(() => { const st = ScrollTrigger.getAll().find((s) => s.pin); return st ? st.end - st.start : 0; });
    y = y + len * +mode.slice(1);
    await travel(y); await sleep(1500); await shot(name); continue;
  }
  if (mode === 'mid') { const h = await page.evaluate(() => document.querySelector('.path__field').offsetHeight); await travel(y + h * 0.3); await sleep(1200); await shot(name); continue; }
  if (mode === 'tab') { await travel(y - 10); await page.click('#tab-school'); await sleep(900); await shot(name); continue; }
  if (mode === 'faq') { await travel(y + 10); await page.click('#qa2-b'); await sleep(700); await shot(name); continue; }
  await travel(Math.max(0, y + mode)); await sleep(name === 'five' ? 4200 : 1100); await shot(name);
}
// итоги: переполнение и «застрявшие» скрытые элементы
const report = await page.evaluate((W) => ({
  innerWidth, scrollW: document.documentElement.scrollWidth, devW: W,
  hiddenRv: [...document.querySelectorAll('[data-rv]:not(.is-in)')].map((e) => e.className || e.tagName).slice(0, 10),
  undrawn: [...document.querySelectorAll('.hero__wave path, .five__digit, .foot__line path')].map((p) => getComputedStyle(p).strokeDashoffset),
  wideEls: [...document.querySelectorAll('main *, footer *')].filter((e) => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 2 && getComputedStyle(e).position !== 'fixed' && !e.closest('.ribbon'); }).slice(0, 8).map((e) => `${e.tagName}.${e.className?.baseVal ?? e.className} ${Math.round(e.getBoundingClientRect().right)}`),
}), W);
console.log(JSON.stringify(report, null, 1));
console.log(errors.length ? 'ОШИБКИ:\n' + errors.join('\n') : 'ошибок нет');
await ctx.close();
