// Качает фото из raw/ya-api-p1.json в raw/ya/yaNN.jpg (orig) + raw/ya-photos.json
import fs from 'node:fs';
const j = JSON.parse(fs.readFileSync('raw/ya-api-p1.json', 'utf8'));
const out = [];
let n = 0;
for (const it of j.data) {
  const base = it.url.replace(/[^/]+$/, '');
  const id = `ya${String(++n).padStart(2, '0')}`;
  const file = `raw/ya/${id}.jpg`;
  if (!fs.existsSync(file)) {
    const r = await fetch(base + 'orig', { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) { console.log('✗', id, r.status); continue; }
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  out.push({ id, n, base, w: it.width, h: it.height, tags: (it.tags || []).map((t) => t.name), author: it.copyright?.name, time: it.copyright?.updateTime });
  console.log(id, it.width + 'x' + it.height, (it.tags || []).map((t) => t.name).join(','), it.copyright?.name, it.copyright?.updateTime?.slice(0, 10));
}
fs.writeFileSync('raw/ya-photos.json', JSON.stringify(out, null, 1));
