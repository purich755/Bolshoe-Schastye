// Фото галереи через внутренний API Яндекс.Карт: photos/getByBusinessId (подпись s — djb2^ по
// отсортированной query-строке, как в клиенте карт). Обычный HTTP проходит там, где браузер ловит капчу.
//   node tools/ya-api.mjs
import fs from 'node:fs';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const ID = '48476677129';
let HOST = 'https://yandex.com';
const cookies = {};
const jar = () => Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
async function get(url, hop = 0) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ru-RU,ru', Cookie: jar(), Referer: `${HOST}/maps/org/bolshoye_schastye/${ID}/gallery/`, 'X-Retpath-Y': `${HOST}/maps/org/bolshoye_schastye/${ID}/gallery/` }, redirect: 'manual' });
  for (const c of r.headers.getSetCookie?.() || []) { const [kv] = c.split(';'); const i = kv.indexOf('='); cookies[kv.slice(0, i)] = kv.slice(i + 1); }
  const loc = r.headers.get('location');
  if (loc && hop < 5) { HOST = new URL(loc, url).origin; return get(new URL(loc, url).href, hop + 1); }
  return { status: r.status, text: await r.text() };
}
const qs = (o) => Object.keys(o).filter((k) => o[k] !== undefined).sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0))
  .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(o[k] ?? '')}`).join('&');
const sign = (q) => { let n = 5381; for (let i = 0; i < q.length; i++) n = (33 * n) ^ q.charCodeAt(i); return String(n >>> 0); };

const page0 = await get(`${HOST}/maps/org/bolshoye_schastye/${ID}/gallery/`);
let token = page0.text.match(/"csrfToken":"([^"]+)"/)?.[1] || '';
const sessionId = page0.text.match(/"sessionId":"([^"]+)"/)?.[1];
console.log('страница', page0.status, HOST, 'token', !!token, 'session', !!sessionId);

async function api(method, extra) {
  for (let t = 0; t < 3; t++) {
    const params = { ajax: '1', csrfToken: token, sessionId, ...extra };
    const q = qs(params);
    const r = await get(`${HOST}/maps/api/${method}?${q}&s=${sign(q)}`);
    let j; try { j = JSON.parse(r.text); } catch { console.log(method, r.status, r.text.slice(0, 160)); return null; }
    if (j.csrfToken && !j.data) { token = j.csrfToken; continue; }
    return j;
  }
}
const all = new Map();
for (let page = 1; page <= 8; page++) {
  const j = await api('photos/getByBusinessId', { id: ID, lang: 'ru_RU', page: String(page) });
  if (!j) break;
  const d = j.data || {};
  if (page === 1) { fs.writeFileSync('raw/ya-api-p1.json', JSON.stringify(j, null, 1)); console.log('ключи', Object.keys(d)); }
  const items = Array.isArray(d) ? d : (d.photos || d.items || []);
  const before = all.size;
  for (const it of items) { const base = (it.urlTemplate || '').replace('%s', ''); if (base) all.set(base, { base, tags: it.tags || null, alt: it.alt || '', id: it.id }); }
  console.log('стр', page, items.length, 'всего', all.size, d.totalCount ?? d.count ?? '');
  if (all.size === before || !items.length) break;
}
fs.writeFileSync('raw/ya-photos.json', JSON.stringify([...all.values()], null, 1));
console.log('✓', all.size);
