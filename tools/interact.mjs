// Проверка интерактива реальными событиями мыши и клавиатуры.
//   node tools/interact.mjs [ширина=1440] [--reduced]
import { chromium } from 'playwright-core';
import os from 'node:os'; import path from 'node:path';
const args = process.argv.slice(2);
const W = +(args.find((a) => /^\d+$/.test(a)) || 1440);
const reduced = args.includes('--reduced');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ctx = await chromium.launchPersistentContext(path.join(os.tmpdir(), 'bs-int-' + W + (reduced ? 'r' : '')), {
  channel: 'chrome', headless: true, viewport: { width: W, height: W < 700 ? 812 : 900 }, isMobile: W < 700, hasTouch: W < 700,
  locale: 'ru-RU', reducedMotion: reduced ? 'reduce' : 'no-preference',
});
const page = ctx.pages()[0];
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.addInitScript(() => { try { sessionStorage.setItem('bs-preload', '1'); } catch (e) {} });
await page.goto(process.env.URL || 'http://localhost:8577/', { waitUntil: 'load' });
await sleep(1500);
let ok = 0, bad = 0;
const t = (name, cond, extra = '') => { cond ? ok++ : bad++; console.log(cond ? '✓' : '✗', name, extra); };
const go = async (sel, off = -120) => { await page.evaluate(([s, o]) => { const y = document.querySelector(s).getBoundingClientRect().top + scrollY + o; if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y); }, [sel, off]); await sleep(700); };
const clickEl = async (sel) => { const b = await page.locator(sel).first().boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };

// WhatsApp-ссылки
const wa = await page.$$eval('[data-wa]', (as) => as.every((a) => a.href.startsWith('https://wa.me/79655883372?text=')));
t('все кнопки WhatsApp с текстом', wa);

// самопроверка
await go('#check', 0);
await clickEl('.check__list li:nth-child(1) .tick');
await clickEl('.check__list li:nth-child(3) .tick');
await clickEl('.check__list li:nth-child(4) .tick');
await sleep(300);
const chk = await page.evaluate(() => ({ n: document.querySelector('.check__n').textContent, v: document.querySelector('.check__verdict').textContent, href: decodeURIComponent(document.querySelector('.check__btn').href) }));
t('счётчик самопроверки = 3', chk.n === '3', chk.v);
t('в WhatsApp подставлены пункты', chk.href.includes('читает медленно, теряет строку') && chk.href.includes('путает или пропускает буквы'));

// вкладки направлений
await go('#directions', 0);
await clickEl('#tab-school');
await sleep(900);
t('вкладка «Школьникам»', await page.evaluate(() => !document.querySelector('#panel-school').hidden && document.querySelector('#panel-pre').hidden));
await page.focus('#tab-school'); await page.keyboard.press('ArrowLeft'); await sleep(900);
t('стрелка возвращает «Дошкольникам»', await page.evaluate(() => !document.querySelector('#panel-pre').hidden));

// лайтбокс
await go('#space', 0);
await sleep(1500);
await go('.photo:nth-child(3)', -200);
await clickEl('.photo:nth-child(3) button');
await sleep(600);
const lb1 = await page.evaluate(() => ({ open: !document.querySelector('.lb').hidden, c: document.querySelector('.lb__count b').textContent, src: document.querySelector('.lb__img').currentSrc }));
t('лайтбокс открылся на 3-м фото', lb1.open && lb1.c === '3', lb1.src.split('/').pop());
await page.keyboard.press('ArrowRight'); await sleep(400);
t('стрелка → листает', (await page.textContent('.lb__count b')) === '4');
await page.keyboard.press('Escape'); await sleep(300);
t('Esc закрывает', await page.evaluate(() => document.querySelector('.lb').hidden));
const imgOk = await page.evaluate(async () => { const r = await fetch(document.querySelector('.lb__img').getAttribute('src')); return r.ok; });
t('большое фото существует', imgOk);

// колода
await go('#reviews', 0);
await clickEl('[data-deck="next"]'); await sleep(900);
t('кнопка → следующий отзыв', (await page.textContent('.deck__count b')) === '2');
await page.focus('[data-deck-root]'); await page.keyboard.press('ArrowLeft'); await sleep(900);
t('стрелка ← возвращает', (await page.textContent('.deck__count b')) === '1');
if (!reduced) {
  const b = await page.locator('.deck').boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) { await page.mouse.move(b.x + b.width / 2 + i * 22, b.y + b.height / 2); await sleep(16); }
  await page.mouse.up(); await sleep(1000);
  t('свайп мышью листает колоду', (await page.textContent('.deck__count b')) === '2');
}

// FAQ
await go('#faq', 0);
await clickEl('#qa3-b'); await sleep(700);
const faq = await page.evaluate(() => ({ exp: document.querySelector('#qa3-b').getAttribute('aria-expanded'), h: document.querySelector('#qa3').getBoundingClientRect().height }));
t('FAQ раскрывается', faq.exp === 'true' && faq.h > 40, `h=${Math.round(faq.h)}`);

// мобильное меню
if (W < 1100) {
  await clickEl('.burger'); await sleep(700);
  t('меню открылось', await page.evaluate(() => !document.querySelector('#menu').hidden));
  await clickEl('#menu a[href="#teacher"]'); await sleep(1800);
  const m = await page.evaluate(() => ({ hidden: document.querySelector('#menu').hidden, top: Math.round(document.querySelector('#teacher').getBoundingClientRect().top) }));
  t('пункт меню ведёт к разделу и закрывает меню', m.hidden && Math.abs(m.top) < 120, `top=${m.top}`);
}

// якорь из шапки
if (W >= 1100) {
  await clickEl('.nav a[href="#contacts"]'); await sleep(1800);
  const top = await page.evaluate(() => Math.round(document.querySelector('#contacts').getBoundingClientRect().top));
  t('якорь «Контакты»', Math.abs(top) < 120, `top=${top}`);
}

// размер кнопок
const small = await page.$$eval('a.btn, button.round-btn, .burger, .dtab, .qa__q', (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height < 43.5; }).map((e) => e.className));
t('кнопки не ниже 44 px', !small.length, small.join(','));

console.log(`\n${ok} ok, ${bad} bad`, errors.length ? '\nОШИБКИ:\n' + errors.join('\n') : '· ошибок нет');
await ctx.close();
