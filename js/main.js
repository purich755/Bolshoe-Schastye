/* «Большое счастье» — поведение страницы. Без сборки: GSAP 3 + ScrollTrigger + MotionPath + Draggable и Lenis с CDN. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const mq = (q) => window.matchMedia(q).matches;
  const calm = mq('(prefers-reduced-motion: reduce)');
  const finePointer = mq('(hover: hover) and (pointer: fine)');
  const hasGsap = !!window.gsap;
  const body = document.body;
  const root = document.documentElement;
  const preloaded = root.hasAttribute('data-preload');
  const INTRO = preloaded ? 1.2 : 0.15; // сек: то же, что --intro в CSS

  if (!hasGsap) body.classList.add('no-gsap');
  if (calm) body.classList.add('no-anim');

  /* ── WhatsApp: ссылки с готовым текстом ───────────────────────── */
  const WA = '79655883372';
  const wa = (text) => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
  const WA_TEXT = {
    diag: 'Здравствуйте! Хочу записать ребёнка на диагностику',
    hello: 'Здравствуйте! Хочу узнать о занятиях в «Большом счастье»',
  };
  $$('[data-wa]').forEach((a) => { a.href = wa(WA_TEXT[a.dataset.wa] || WA_TEXT.hello); });

  /* ── Прелоадер: CSS делает всё сам, здесь только уборка ───────── */
  if (preloaded) setTimeout(() => $('.preloader')?.remove(), 1500);

  /* ── Lenis + ScrollTrigger ─────────────────────────────────────── */
  let lenis = null;
  if (hasGsap) gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, Draggable);
  if (!calm && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      ScrollTrigger.addEventListener('refresh', () => lenis.resize());
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  const scrollY = () => (lenis ? lenis.scroll : window.scrollY);
  const scrollTo = (target) => {
    if (lenis) lenis.scrollTo(target, { duration: 1.2 });
    else if (typeof target === 'number') window.scrollTo({ top: target, behavior: calm ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: calm ? 'auto' : 'smooth' });
  };

  /* ── Шапка: сжатие, прогресс-карандаш, текущий раздел ────────── */
  const hdr = $('#hdr');
  const pLine = $('.progress__line');
  const pPen = $('.progress__pencil');
  let lastCompact = null;
  function onScroll() {
    const y = scrollY();
    const compact = y > 24;
    if (compact !== lastCompact) { hdr.classList.toggle('is-compact', compact); lastCompact = compact; }
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const p = Math.min(1, Math.max(0, y / max));
    pLine.style.transform = `scaleX(${p})`;
    pPen.style.transform = `translateX(${p * (window.innerWidth - 20) - 2}px)`;
    if (p > 0.995) revealAll();
  }
  if (lenis) lenis.on('scroll', onScroll); else window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  const navLinks = $$('.nav a');
  const navIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === `#${e.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['directions', 'path', 'teacher', 'space', 'reviews', 'contacts'].forEach((id) => { const s = document.getElementById(id); if (s) navIO.observe(s); });

  /* ── Мобильное меню ────────────────────────────────────────────── */
  const burger = $('.burger');
  const menu = $('#menu');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.hidden = !open;
    hdr.classList.toggle('is-menu', open);
    if (open) {
      lenis?.stop();
      if (hasGsap && !calm) gsap.from(menu.querySelectorAll('.menu__list a, .menu__foot > *'), { y: 18, opacity: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out' });
    } else lenis?.start();
  }
  burger.addEventListener('click', () => setMenu(menu.hidden));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); } });

  /* ── Якоря через Lenis ─────────────────────────────────────────── */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id === '#' ) return;
    const target = id === '#top' ? 0 : document.querySelector(id);
    if (target === null) return;
    e.preventDefault();
    if (a.dataset.tabGo) selectTab(a.dataset.tabGo === 'school' ? 1 : 0, false);
    if (!menu.hidden) setMenu(false);
    scrollTo(target);
    if (target !== 0) target.setAttribute('tabindex', '-1'), target.focus({ preventScroll: true });
  });

  /* ── Появление блоков ──────────────────────────────────────────── */
  $$('.sec .caps, .sec .h2, .problems__after, .reviews__lead, .deck__ctrl, .dirs__pay, .contacts__sub, .steps, .contacts__stop, .contacts__btns, .contacts__tel, .map-sheet, .faq__list, .tabs-strip, .foot__grid, .space__hint, .faq__side-note')
    .forEach((el) => { if (!el.closest('[data-rv]') && !el.hasAttribute('data-rv')) el.setAttribute('data-rv', ''); });
  // ступенька задержек внутри одного родителя
  const groups = new Map();
  $$('[data-rv]').forEach((el) => {
    const k = el.parentElement;
    const i = groups.get(k) || 0;
    if (i) el.style.setProperty('--rv-d', `${Math.min(i, 5) * 0.08}s`);
    groups.set(k, i + 1);
  });
  const rvIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); rvIO.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -16% 0px' });
  $$('[data-rv], .u-draw').forEach((el) => rvIO.observe(el));
  function revealAll() { $$('[data-rv]:not(.is-in), .u-draw:not(.is-in)').forEach((el) => el.classList.add('is-in')); }

  /* ── Вспомогательное: разбить текст на буквы (слова не рвутся) ── */
  function splitChars(el) {
    const words = el.textContent.split(/([ \t\n]+)/);
    el.textContent = '';
    const chars = [];
    words.forEach((w) => {
      if (/^[ \t\n]+$/.test(w)) { el.append(' '); return; }
      if (!w) return;
      const ws = document.createElement('span');
      ws.style.cssText = 'display:inline-block;white-space:nowrap';
      [...w].forEach((c) => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; ws.append(s); chars.push(s); });
      el.append(ws);
    });
    return chars;
  }
  // точка на SVG-пути → координаты относительно элемента box
  function pathPoint(path, len, t, box) {
    const p = path.getPointAtLength(len * t);
    const m = path.getScreenCTM();
    const b = box.getBoundingClientRect();
    return { x: p.x * m.a + p.y * m.c + m.e - b.left, y: p.x * m.b + p.y * m.d + m.f - b.top };
  }
  function baseline(el) {
    const s = document.createElement('span');
    s.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    el.prepend(s);
    const b = s.getBoundingClientRect().top - el.getBoundingClientRect().top;
    s.remove();
    return b;
  }
  // рукопись встаёт ровно на линейку: смещения линовки считаются от реальной базовой линии шрифта
  function alignRules() {
    const hs = $('.hero__script');
    hs.style.setProperty('--bl', `${baseline(hs)}px`);
    hs.style.setProperty('--L', getComputedStyle(hs).lineHeight);
    const slip = $('.slip__front');
    if (slip) {
      const b = baseline(slip);
      $('[data-ribbon]').style.setProperty('--slip-off', `${((b + 4) % 30) - 30}px`);
    }
    const ft = $('.five__text'), fs = $('.five__sheet');
    const L = parseFloat(getComputedStyle(ft).lineHeight);
    const off = ft.getBoundingClientRect().top - fs.getBoundingClientRect().top + 30 + baseline(ft) + 5;
    fs.style.setProperty('--fL', `${L}px`);
    fs.style.setProperty('--fOff', `${(off % L) - L}px`);
  }
  // карандаш символа i-pencil: кончик в (4, 56) из 60
  const placePen = (pen, x, y) => { const s = pen.getBoundingClientRect().width || 34; pen.style.transform = `translate(${x - s * 0.067}px, ${y - s * 0.933}px)`; };

  /* ── 02 Первый экран: волна, рукопись, параллакс ───────────────── */
  function heroIntro() {
    const copy = $('.hero__copy');
    const pen = $('.hero__caret');
    copy.append(pen);
    pen.style.position = 'absolute';
    const waves = $$('.hero__wave path');
    const chars = splitChars($('.hero__script-text'));
    if (calm || !hasGsap) { $('.hero__title').classList.add('is-risen'); chars.forEach((c) => (c.style.opacity = 1)); waves.forEach((w) => (w.style.strokeDashoffset = 0)); return; }

    setTimeout(() => $('.hero__title').classList.add('is-risen'), (INTRO + 1.02) * 1000);
    const tl = gsap.timeline({ delay: INTRO + 1.05 });
    tl.set(pen, { opacity: 1 });
    waves.forEach((path, i) => {
      const len = path.getTotalLength();
      const pr = { t: 0 };
      const step = () => { const p = pathPoint(path, len, pr.t, copy); placePen(pen, p.x, p.y); path.style.strokeDashoffset = 1 - pr.t; };
      tl.add(() => { pr.t = 0; step(); }, i ? '+=0.06' : 0);
      tl.to(pr, { t: 1, duration: i ? 0.5 : 0.55, ease: 'power1.inOut', onUpdate: step });
    });
    // посимвольная рукопись: карандаш идёт по буквам
    const cpos = () => chars.map((c) => { const r = c.getBoundingClientRect(); const b = copy.getBoundingClientRect(); return { x: r.right - b.left, y: r.bottom - b.top - r.height * 0.24 }; });
    let pos;
    tl.add(() => { pos = cpos(); }, '+=0.05');
    chars.forEach((c, i) => {
      tl.add(() => { c.style.opacity = 1; const p = pos[i]; placePen(pen, p.x, p.y); }, `+=${i ? 0.038 : 0.12}`);
    });
    tl.to(pen, { opacity: 0, y: '-=10', duration: 0.4 }, '+=0.25');
  }

  function heroParallax() {
    if (calm || !finePointer) return;
    const hero = $('.hero');
    const img = $('.sheet--hero img');
    const ring = $('.hero__ring');
    const sparks = $$('.hero__spark');
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0, visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);
    hero.addEventListener('pointermove', (e) => {
      tx = e.clientX / window.innerWidth - 0.5; ty = e.clientY / window.innerHeight - 0.5;
      if (!raf && visible) raf = requestAnimationFrame(tick);
    });
    function tick() {
      x += (tx - x) * 0.08; y += (ty - y) * 0.08;
      img.style.transform = `scale(1.06) translate(${(-x * 12).toFixed(2)}px, ${(-y * 10).toFixed(2)}px)`;
      ring.style.transform = `translate(${(x * 10).toFixed(2)}px, ${(y * 8).toFixed(2)}px)`;
      sparks.forEach((s, i) => { s.style.translate = `${(x * (18 + i * 10)).toFixed(2)}px ${(y * (14 + i * 8)).toFixed(2)}px`; });
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(tick) : 0;
    }
  }

  /* ── 03 Лента записок ──────────────────────────────────────────── */
  function ribbon() {
    const wrap = $('[data-ribbon]');
    const track = $('.ribbon__track', wrap);
    const slips = $$('.slip', wrap);
    // тап/клик/Enter переворачивает записку
    wrap.addEventListener('click', (e) => {
      const s = e.target.closest('.slip');
      if (!s) return;
      const was = s.classList.contains('is-flip');
      $$('.slip.is-flip', wrap).forEach((o) => o.classList.remove('is-flip'));
      if (!was) s.classList.add('is-flip');
    });
    if (calm || !hasGsap) return;
    [...track.children].forEach((li) => {
      const c = li.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      c.querySelectorAll('button').forEach((b) => b.setAttribute('tabindex', '-1'));
      track.append(c);
    });
    const tw = gsap.to(track, { xPercent: -50, ease: 'none', duration: slips.length * 6.2, repeat: -1 });
    const slow = (v) => gsap.to(tw, { timeScale: v, duration: 0.6, overwrite: true });
    wrap.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') slow(0.2); });
    wrap.addEventListener('pointerleave', () => slow(1));
    wrap.addEventListener('focusin', () => slow(0));
    wrap.addEventListener('focusout', () => slow(1));
    new IntersectionObserver(([e]) => (e.isIntersecting ? tw.play() : tw.pause())).observe(wrap);
  }

  /* ── 04 Самопроверка ───────────────────────────────────────────── */
  function selfCheck() {
    const boxes = $$('.check__list input');
    const res = $('.check__result');
    const n = $('.check__n');
    const verdict = $('.check__verdict');
    const btn = $('.check__btn');
    const V = [
      'Похоже, всё спокойно. Подготовка к школе поможет войти в учёбу уверенно.',
      'Есть на что посмотреть внимательнее. Диагностика покажет, откуда берутся трудности и с чего начать.',
      'Стоит прийти на диагностику — разберём причины по полочкам.',
    ];
    function update(bump) {
      const picked = boxes.filter((b) => b.checked).map((b) => b.value);
      const k = picked.length;
      n.textContent = k;
      verdict.textContent = V[k <= 1 ? 0 : k <= 4 ? 1 : 2];
      const text = k
        ? `Здравствуйте! Прошли самопроверку на сайте «Большого счастья». Замечаем у ребёнка:\n${picked.map((p) => `— ${p}`).join('\n')}\nХотим записаться на диагностику.`
        : 'Здравствуйте! Хотим узнать о подготовке к школе в «Большом счастье».';
      btn.href = wa(text);
      if (bump) { res.classList.remove('is-bump'); void res.offsetWidth; res.classList.add('is-bump'); }
    }
    boxes.forEach((b) => b.addEventListener('change', () => update(true)));
    update(false);
  }

  /* ── 05 Черновик → чистовик ────────────────────────────────────── */
  const NS = 'http://www.w3.org/2000/svg';
  const PHRASE = 'Мама, я сам!';
  const FS = 98, X0 = 170, BASE = 262, MARGIN_X = 132;
  function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent?.append(n); return n; };

  function xHeight() {
    const c = document.createElement('canvas').getContext('2d');
    c.font = `${FS}px "Bad Script"`;
    const m = c.measureText('а');
    return Math.round(m.actualBoundingBoxAscent) || 36;
  }
  function drawRuling(g, xh) {
    g.textContent = '';
    for (let x = -260; x < 900; x += 38) el('line', { x1: x, y1: 420, x2: x + 420 / Math.tan((65 * Math.PI) / 180), y2: 0, class: 'r-slant' }, g);
    [BASE - 130, BASE, BASE + 130].forEach((b) => {
      el('line', { x1: 0, x2: 800, y1: b, y2: b, class: 'r-main' }, g);
      el('line', { x1: 0, x2: 800, y1: b - xh, y2: b - xh, class: 'r-main' }, g);
      el('line', { x1: 0, x2: 800, y1: b - xh / 2, y2: b - xh / 2 }, g);
      el('line', { x1: 0, x2: 800, y1: b - xh * 2, y2: b - xh * 2 }, g);
    });
    el('line', { x1: MARGIN_X, x2: MARGIN_X, y1: 0, y2: 420, class: 'r-margin' }, g);
  }
  // раскладка букв по эталонной строке
  function glyphs() {
    // меряем во временном видимом SVG: на мобильном основной лист скрыт и не раскладывает текст
    const svg = el('svg', { viewBox: '0 0 800 420', width: 800, height: 420, style: 'position:absolute;left:-9999px;top:0;visibility:hidden' }, document.body);
    const t = el('text', { x: X0, y: BASE, 'font-size': FS, style: 'font-family:"Bad Script"' }, svg);
    t.textContent = PHRASE;
    const out = [];
    [...PHRASE].forEach((ch, i) => {
      if (ch === ' ') return;
      const a = t.getStartPositionOfChar(i).x, b = t.getEndPositionOfChar(i).x;
      out.push({ ch, x: a, cx: (a + b) / 2 });
    });
    svg.remove();
    return out;
  }
  function poses(gl, xh) {
    const r = mulberry(11);
    const A = gl.map((g, i) => ({
      x: (r() - 0.5) * 16 + (i % 4 === 2 ? 8 : 0),
      y: (r() - 0.5) * 34 + (i % 3 === 1 ? -14 : 6),
      rotation: (r() - 0.5) * 34,
      scale: 0.78 + r() * 0.6,
    }));
    // характерные «ошибки»: большая М, провалившаяся «я», завалившийся «!»
    A[0] = { x: -6, y: 10, rotation: -9, scale: 1.4 };
    const iy = gl.findIndex((g) => g.ch === 'я'); if (iy > -1) A[iy] = { x: 6, y: 26, rotation: 16, scale: 1.12 };
    A[A.length - 1] = { x: 14, y: -6, rotation: 24, scale: 1.25 };
    const B = gl.map(() => ({ x: (r() - 0.5) * 4, y: (r() - 0.5) * 8, rotation: (r() - 0.5) * 7, scale: 0.95 + r() * 0.1 }));
    const C = gl.map(() => ({ x: 0, y: 0, rotation: 0, scale: 1 }));
    return { A, B, C, origin: (g) => `${g.cx} ${BASE - xh / 2}` };
  }
  function letters(g, gl, cls) {
    return gl.map((c) => { const t = el('text', { x: c.x, y: BASE, 'font-size': FS, class: cls || '' }, g); t.textContent = c.ch; return t; });
  }
  const setPose = (ts, pose, P, gl) => ts.forEach((t, i) => gsap.set(t, { ...pose[i], svgOrigin: P.origin(gl[i]) }));

  function draft() {
    const sec = $('#draft');
    const svg = $('.draft__svg', sec);
    const xh = xHeight();
    drawRuling($('.ruling', svg), xh);
    const gl = glyphs();
    const P = poses(gl, xh);
    const LA = letters($('.draft__layer--a g', svg), gl);
    const LB = letters($('.draft__layer--b g g', svg), gl);
    const LC = letters($('.draft__layer--c g', svg), gl);
    LA.forEach((t) => { t.setAttribute('stroke', '#24496f'); t.setAttribute('stroke-width', '1.4'); });
    buildMobileSheets(gl, P, xh);

    const num = $('.draft__num', sec);
    const steps = $$('.draft__steps li', sec);
    const five = $('.draft__five', sec), star = $('.draft__star', sec);
    const wipes = { aOut: $('.wipe-a-out', svg), aIn: $('.wipe-a-in', svg), bOut: $('.wipe-b-out', svg), bIn: $('.wipe-b-in', svg) };
    const desktop = mq('(min-width: 900px)');

    if (calm || !hasGsap || !desktop) {
      // сразу чистовик
      sec.classList.add('is-static');
      wipes.aOut.setAttribute('x', 820); wipes.aIn.setAttribute('x', -740);
      wipes.bOut.setAttribute('x', 820); wipes.bIn.setAttribute('x', -740);
      $$('.blot', svg).forEach((b) => (b.style.opacity = 0));
      five.style.strokeDashoffset = 0; star.style.strokeDashoffset = 0;
      num.textContent = '8';
      steps.forEach((s) => s.classList.add('is-on'));
      return;
    }

    setPose(LA, P.A, P, gl); setPose(LB, P.A, P, gl); setPose(LC, P.B, P, gl);
    gsap.set([wipes.aOut, wipes.bOut], { attr: { x: -252 } });
    gsap.set([wipes.aIn, wipes.bIn], { attr: { x: -1800 } });

    const tl = gsap.timeline({ defaults: { ease: 'none' } });
    const PA = 0.6, PB = 4.8, D = 3.2;
    tl.to(wipes.aOut, { attr: { x: 808 }, duration: D }, PA)
      .to(wipes.aIn, { attr: { x: -740 }, duration: D }, PA)
      .to('.wobble-a', { attr: { scale: 1.5 }, duration: D }, PA)
      .to($$('.blot', svg), { scale: 0.1, opacity: 0, transformOrigin: '50% 50%', duration: 1.2, stagger: 0.35, ease: 'power1.in' }, PA + 0.2);
    LA.forEach((t, i) => tl.to(t, { ...P.B[i], svgOrigin: P.origin(gl[i]), duration: D, ease: 'power1.inOut' }, PA));
    LB.forEach((t, i) => tl.to(t, { ...P.B[i], svgOrigin: P.origin(gl[i]), duration: D, ease: 'power1.inOut' }, PA));
    tl.to(wipes.bOut, { attr: { x: 808 }, duration: D }, PB)
      .to(wipes.bIn, { attr: { x: -740 }, duration: D }, PB);
    LB.forEach((t, i) => tl.to(t, { ...P.C[i], svgOrigin: P.origin(gl[i]), duration: D, ease: 'power1.inOut' }, PB));
    LC.forEach((t, i) => tl.to(t, { ...P.C[i], svgOrigin: P.origin(gl[i]), duration: D, ease: 'power1.inOut' }, PB));
    tl.to(five, { strokeDashoffset: 0, duration: 1.1, ease: 'power1.inOut' }, PB + D + 0.15)
      .to(star, { strokeDashoffset: 0, duration: 0.8, ease: 'power1.inOut' }, '>-0.1')
      .to({}, { duration: 0.35 });

    let lastN = 1, lastS = 0;
    tl.eventCallback('onUpdate', () => {
      const t = tl.time();
      const k = Math.max(1, Math.min(8, 1 + Math.round(((t - PA) / (PB + D - PA)) * 7)));
      if (k !== lastN) { num.textContent = k; lastN = k; }
      const s = t < PA + D * 0.8 ? 0 : t < PB + D * 0.75 ? 1 : 2;
      if (s !== lastS) { steps.forEach((li, i) => li.classList.toggle('is-on', i === s)); lastS = s; }
    });

    ScrollTrigger.create({ trigger: sec, pin: '.draft__stage', start: 'top top', end: '+=220%', scrub: 1, animation: tl, anticipatePin: 1 });
  }

  function buildMobileSheets(gl, P, xh) {
    const box = $('.draft__mobile');
    const caps = [['Занятие 1', 'Ставим руку и правильный захват ручки', -1.2], ['Занятие 4', 'Буквы становятся ровными, рука перестаёт уставать', 0.8], ['Занятие 8', 'Ребёнок пишет быстрее — и с удовольствием', -0.6]];
    const poseOf = [P.A, P.B, P.C];
    caps.forEach(([n, t, r], k) => {
      const wrap = document.createElement('div');
      wrap.className = 'm-sheet';
      wrap.innerHTML = `<p class="m-sheet__cap"><b>${n}</b><span>${t}</span></p><div class="draft__sheet" style="--r:${r}deg"><span class="sheet__corner"></span></div>`;
      const svg = el('svg', { class: 'draft__svg', viewBox: '0 0 800 420' });
      wrap.querySelector('.draft__sheet').prepend(svg);
      svg.style.overflow = 'hidden';
      const defs = el('defs', {}, svg);
      const f = el('filter', { id: `m-wob-${k}`, x: '-10%', y: '-40%', width: '120%', height: '180%' }, defs);
      el('feTurbulence', { type: 'turbulence', baseFrequency: '.04', numOctaves: 2, seed: 3, result: 't' }, f);
      el('feDisplacementMap', { in: 'SourceGraphic', in2: 't', scale: k === 0 ? 6 : k === 1 ? 2 : 0, xChannelSelector: 'R', yChannelSelector: 'G' }, f);
      drawRuling(el('g', { class: 'ruling' }, svg), xh);
      const g = el('g', { filter: `url(#m-wob-${k})`, class: `draft__layer--${'abc'[k]}` }, svg);
      const ts = letters(g, gl);
      if (k === 0) {
        ts.forEach((t) => { t.setAttribute('stroke', '#24496f'); t.setAttribute('stroke-width', '1.4'); });
        $$('.blots .blot', $('.draft__svg')).slice(0, 3).forEach((b) => svg.append(b.cloneNode()));
      }
      if (k === 2) {
        const m = el('g', { class: 'draft__mark' }, svg);
        m.innerHTML = $('.draft__mark').innerHTML;
      }
      box.append(wrap);
      if (!hasGsap) return;
      const from = k === 0 ? P.A.map((p) => ({ ...p, y: p.y + 30, rotation: p.rotation * 1.6 })) : poseOf[k - 1];
      if (calm) { ts.forEach((tt, i) => gsap.set(tt, { ...poseOf[k][i], svgOrigin: P.origin(gl[i]) })); if (k === 2) $$('.draft__mark path', svg).forEach((p) => (p.style.strokeDashoffset = 0)); return; }
      ts.forEach((tt, i) => gsap.set(tt, { ...from[i], svgOrigin: P.origin(gl[i]) }));
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        ts.forEach((tt, i) => gsap.to(tt, { ...poseOf[k][i], svgOrigin: P.origin(gl[i]), duration: 1.4, ease: 'power2.inOut', delay: 0.15 + i * 0.02 }));
        if (k === 2) gsap.to($$('.draft__mark path', svg), { strokeDashoffset: 0, duration: 0.9, stagger: 0.5, delay: 1.3, ease: 'power1.inOut' });
      }, { rootMargin: '0px 0px -25% 0px' });
      io.observe(wrap);
    });
  }

  /* ── 06 Направления: перелистывание ───────────────────────────── */
  const dtabs = $$('.dtab');
  const dpanels = $$('.dpanel');
  const page = $('[data-page]');
  let curTab = 0, flipping = false;
  function selectTab(i, animate = true) {
    if (i === curTab || flipping) return;
    const swap = () => {
      dtabs.forEach((t, k) => { t.classList.toggle('is-on', k === i); t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      dpanels.forEach((p, k) => { p.hidden = k !== i; });
      curTab = i;
      window.ScrollTrigger?.refresh();
    };
    if (!animate || calm || !hasGsap) { swap(); return; }
    flipping = true;
    const dir = i > curTab ? -1 : 1;
    gsap.timeline({ onComplete: () => { flipping = false; gsap.set(page, { clearProps: 'transform' }); } })
      .to(page, { rotationY: 88 * dir, duration: 0.3, ease: 'power2.in', transformPerspective: 1800 })
      .add(swap)
      .fromTo(page, { rotationY: -88 * dir }, { rotationY: 0, duration: 0.3, ease: 'power2.out', transformPerspective: 1800 });
  }
  dtabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(i));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + dtabs.length) % dtabs.length;
      selectTab(n); dtabs[n].focus();
    });
  });
  function stickerTilt() {
    const s = $('[data-tilt]');
    if (!s || calm || !finePointer || !hasGsap) return;
    gsap.set(s, { transformPerspective: 600, rotation: 9 });
    s.addEventListener('pointermove', (e) => {
      const r = s.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(s, { rotationY: x * 16, rotationX: -y * 16, duration: 0.4, ease: 'power2.out' });
    });
    s.addEventListener('pointerleave', () => gsap.to(s, { rotationY: 0, rotationX: 0, duration: 0.7, ease: 'elastic.out(1, .5)' }));
  }

  /* ── 07 Путь: самолётик по пунктиру ────────────────────────────── */
  function planePath() {
    const field = $('.path__field');
    const plane = $('.path__plane');
    const stops = $$('.stop', field);
    const desktop = mq('(min-width: 1024px)');
    const svg = $(desktop ? '.path__svg--h' : '.path__svg--v', field);
    const guide = $('.path__guide', svg);
    const reveal = $('.path__reveal', svg);
    const len = guide.getTotalLength();
    // позиции остановок на десктопе — прямо с кривой
    // доля длины пути, на которой кривая проходит заданный x (гребни и впадины волны)
    const atX = (x) => { let best = 0, d = 1e9; for (let k = 0; k <= 600; k++) { const p = guide.getPointAtLength((len * k) / 600); const dd = Math.abs(p.x - x); if (dd < d) { d = dd; best = k / 600; } } return best; };
    const F = desktop ? [60, 260, 500, 740, 980].map(atX) : [];
    if (desktop) {
      const vb = svg.viewBox.baseVal;
      stops.forEach((s, i) => { const p = guide.getPointAtLength(len * F[i]); s.style.setProperty('--x', `${(p.x / vb.width) * 100}%`); s.style.setProperty('--y', `${(p.y / vb.height) * 100}%`); });
    }
    if (calm || !hasGsap) { reveal.style.strokeDashoffset = 0; stops.forEach((s) => s.classList.add('is-lit')); gsap?.set?.(plane, { motionPath: { path: guide, align: guide, alignOrigin: [0.5, 0.5], autoRotate: 24, start: 1, end: 1 } }); return; }
    const thresholds = desktop ? F : stops.map((s) => { const st = $('.stop__star', s); return (st.offsetTop + s.offsetTop + 17) / field.offsetHeight; });
    const tl = gsap.timeline({ defaults: { ease: 'none' } })
      .to(plane, { motionPath: { path: guide, align: guide, alignOrigin: [0.5, 0.5], autoRotate: 24 }, duration: 1 }, 0)
      .fromTo(reveal, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1 }, 0);
    tl.eventCallback('onUpdate', () => { const p = tl.progress(); stops.forEach((s, i) => s.classList.toggle('is-lit', p >= thresholds[i] - 0.01)); });
    ScrollTrigger.create({ trigger: field, start: desktop ? 'top 70%' : 'top 60%', end: desktop ? 'bottom 45%' : 'bottom 60%', scrub: 0.8, animation: tl });
  }

  /* ── 08 Пробковая доска ────────────────────────────────────────── */
  function cork() {
    const c = $('.cork');
    const notes = $$('.pin-note', c);
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      c.classList.add('is-in');
      if (!hasGsap || calm) return;
      notes.forEach((n, i) => {
        const r = parseFloat(n.style.getPropertyValue('--r')) || 0;
        gsap.fromTo(n, { rotation: r + (i % 2 ? -14 : 14), y: -12, opacity: 0 }, { rotation: r, y: 0, opacity: 1, duration: 1.5, delay: i * 0.12, ease: 'elastic.out(1, .35)' });
      });
    }, { rootMargin: '0px 0px -18% 0px' });
    io.observe(c);
  }

  /* ── 09 Альбом + лайтбокс ──────────────────────────────────────── */
  const photos = $$('.photo');
  const shots = photos.map((li) => {
    const img = $('img', li);
    const big = img.getAttribute('src').replace(/-640\.webp$/, /write-/.test(img.src) ? '-768.webp' : '-1000.webp');
    return { src: big, alt: img.alt };
  });
  let lastDrag = 0;
  function album() {
    const table = $('[data-table]');
    photos.forEach((li, i) => $('button', li).addEventListener('click', () => { if (Date.now() - lastDrag > 250) openLb(i); }));
    if (!hasGsap || calm || !mq('(min-width: 900px)')) return;
    let z = 40;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const tb = table.getBoundingClientRect();
      gsap.from(photos, {
        x: (i, t) => tb.left + tb.width / 2 - (t.getBoundingClientRect().left + t.offsetWidth / 2),
        y: (i, t) => tb.top + tb.height / 2 - (t.getBoundingClientRect().top + t.offsetHeight / 2),
        rotation: (i) => (i % 2 ? 8 : -8), scale: 0.86, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.06,
      });
    }, { rootMargin: '0px 0px -25% 0px' });
    io.observe(table);
    Draggable.create(photos, {
      type: 'x,y', dragClickables: true, minimumMovement: 6, zIndexBoost: false,
      onPress() { this.target.style.zIndex = ++z; },
      onDragStart() { this.target.classList.add('is-drag'); },
      onRelease() {
        this.target.classList.remove('is-drag');
        if (this.isDragging || Math.abs(this.x) + Math.abs(this.y) > 6) lastDrag = Date.now();
        gsap.to(this.target, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, .55)' });
      },
    });
  }
  const lb = $('.lb');
  const lbImg = $('.lb__img');
  const lbCount = $('.lb__count b');
  const lbSheet = $('.lb__sheet');
  let lbIndex = 0, lbBack = null;
  function showLb(i, dir = 0) {
    lbIndex = (i + shots.length) % shots.length;
    lbImg.src = shots[lbIndex].src;
    lbImg.alt = shots[lbIndex].alt;
    lbCount.textContent = lbIndex + 1;
    if (hasGsap && !calm) gsap.fromTo(lbSheet, { x: dir * 40, rotation: dir * 1.5, opacity: 0.4 }, { x: 0, rotation: dir ? -0.6 : 0, opacity: 1, duration: 0.45, ease: 'power2.out' });
  }
  function openLb(i) {
    lbBack = document.activeElement;
    lb.hidden = false;
    lenis?.stop();
    showLb(i);
    if (hasGsap && !calm) gsap.fromTo(lb, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    $('.lb__close').focus();
  }
  function closeLb() { lb.hidden = true; lenis?.start(); lbBack?.focus?.(); }
  $('.lb__close').addEventListener('click', closeLb);
  $('.lb__prev').addEventListener('click', () => showLb(lbIndex - 1, -1));
  $('.lb__next').addEventListener('click', () => showLb(lbIndex + 1, 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowLeft') showLb(lbIndex - 1, -1);
    else if (e.key === 'ArrowRight') showLb(lbIndex + 1, 1);
    else if (e.key === 'Tab') {
      const f = $$('button', lb);
      const k = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  let sx = null;
  lb.addEventListener('pointerdown', (e) => { sx = e.clientX; });
  lb.addEventListener('pointerup', (e) => { if (sx === null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) showLb(lbIndex + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); });

  /* ── 10 Колода отзывов ─────────────────────────────────────────── */
  function deck() {
    const box = $('[data-deck-root]');
    const cards = $$('.rcard', box);
    const count = $('.deck__count b');
    let order = cards.map((_, i) => i);
    let busy = false;
    const ROT = [0, -2.6, 2.2, -1.4, 1.6];
    const pose = (d) => ({ x: 0, y: Math.min(d, 4) * 10, rotation: ROT[Math.min(d, 4)], scale: 1 - Math.min(d, 4) * 0.025, opacity: d > 4 ? 0 : 1 });
    function layout(animate) {
      order.forEach((ci, d) => {
        const c = cards[ci];
        c.style.zIndex = cards.length - d;
        c.setAttribute('aria-hidden', String(d > 0));
        if (hasGsap) gsap[animate && !calm ? 'to' : 'set'](c, { ...pose(d), duration: 0.5, ease: 'power3.out' });
        else c.style.transform = `translateY(${Math.min(d, 4) * 10}px) rotate(${ROT[Math.min(d, 4)]}deg)`;
      });
      count.textContent = order[0] + 1;
      drags.forEach((dr, i) => (i === order[0] ? dr.enable() : dr.disable()));
    }
    function next(dir = 1) {
      if (busy) return;
      busy = true;
      const top = cards[order[0]];
      const W = box.offsetWidth;
      const done = () => { order.push(order.shift()); top.style.zIndex = 0; layout(true); busy = false; };
      if (!hasGsap || calm) { done(); return; }
      gsap.to(top, { x: dir * W * 0.9, rotation: dir * 16, duration: 0.32, ease: 'power2.in', onComplete: () => { gsap.set(top, { x: 0 }); done(); } });
    }
    function prev() {
      if (busy) return;
      busy = true;
      order.unshift(order.pop());
      const c = cards[order[0]];
      if (!hasGsap || calm) { layout(false); busy = false; return; }
      layout(true);
      gsap.fromTo(c, { x: -box.offsetWidth * 0.9, rotation: -14 }, { x: 0, rotation: 0, duration: 0.45, ease: 'power3.out', onComplete: () => (busy = false) });
    }
    const drags = hasGsap ? cards.map((c) => Draggable.create(c, {
      type: 'x', minimumMovement: 4,
      onDrag() { gsap.set(c, { rotation: this.x / 22 }); },
      onRelease() {
        if (Math.abs(this.x) > Math.min(130, box.offsetWidth * 0.28)) next(this.x > 0 ? 1 : -1);
        else gsap.to(c, { x: 0, rotation: 0, duration: 0.6, ease: 'elastic.out(1, .6)' });
      },
    })[0]) : [];
    $('[data-deck="next"]').addEventListener('click', () => next(1));
    $('[data-deck="prev"]').addEventListener('click', prev);
    box.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); next(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); } });
    layout(false);
  }

  /* ── 11 Пятёрка ────────────────────────────────────────────────── */
  function fiveScene() {
    const sec = $('#five');
    const chars = splitChars($('.five__text', sec));
    if (calm || !hasGsap) { sec.classList.add('is-done'); chars.forEach((c) => (c.style.opacity = 1)); return; }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      gsap.timeline({ onComplete: () => sec.classList.add('is-done') })
        .to(chars, { opacity: 1, duration: 0.12, stagger: 0.026, ease: 'none' })
        .to('.five__ring', { strokeDashoffset: 0, duration: 0.8, ease: 'power1.inOut' }, '+=0.15')
        .to('.five__digit', { strokeDashoffset: 0, duration: 1, ease: 'power1.inOut' }, '-=0.25');
    }, { rootMargin: '0px 0px -30% 0px' });
    io.observe(sec);
  }

  /* ── 12 FAQ ────────────────────────────────────────────────────── */
  $$('.qa__q').forEach((b) => b.addEventListener('click', () => {
    const qa = b.closest('.qa');
    const open = !qa.classList.contains('is-open');
    qa.classList.toggle('is-open', open);
    b.setAttribute('aria-expanded', String(open));
  }));

  /* ── 14 Подвал: карандаш подчёркивает «счастье» ────────────────── */
  function footer() {
    const foot = $('.foot');
    const box = $('.foot .wrap');
    box.style.position = 'relative';
    const path = $('.foot__line path');
    const pen = $('.foot__pencil');
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      foot.classList.add('is-in');
      if (calm || !hasGsap) { path.style.strokeDashoffset = 0; return; }
      const len = path.getTotalLength();
      const pr = { t: 0 };
      gsap.timeline({ delay: 0.2 })
        .set(pen, { opacity: 1 })
        .to(pr, { t: 1, duration: 1.6, ease: 'power1.inOut', onUpdate: () => { const p = pathPoint(path, len, pr.t, box); placePen(pen, p.x, p.y); path.style.strokeDashoffset = 1 - pr.t; } })
        .to(pen, { opacity: 0, duration: 0.4 }, '+=0.2');
    }, { rootMargin: '0px 0px -20% 0px' });
    io.observe(foot);
  }

  /* ── Запуск ────────────────────────────────────────────────────── */
  ribbon();
  selfCheck();
  stickerTilt();
  album();
  deck();
  cork();
  heroParallax();
  const fontsReady = document.fonts ? Promise.all([document.fonts.load(`${FS}px "Bad Script"`), document.fonts.ready]) : Promise.resolve();
  fontsReady.then(() => {
    alignRules();
    heroIntro();
    draft();          // пин — первым из ScrollTrigger
    if (hasGsap) planePath();
    fiveScene();
    footer();
    if (hasGsap) ScrollTrigger.refresh();
  });
  window.addEventListener('load', () => hasGsap && ScrollTrigger.refresh());
  let rw = window.innerWidth;
  window.addEventListener('resize', () => { if (window.innerWidth !== rw) { rw = window.innerWidth; alignRules(); } });
  if (hasGsap && window.ResizeObserver) {
    let h = 0;
    new ResizeObserver(() => { const nh = document.body.scrollHeight; if (Math.abs(nh - h) > 40) { h = nh; ScrollTrigger.refresh(); } }).observe(document.body);
  }
  window.__lenis = lenis;
})();
