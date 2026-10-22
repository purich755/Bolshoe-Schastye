// Собирает WebP для сайта из raw/: фото центра (Яндекс, 2ГИС), портрет педагога, фрагменты баннера,
// стикер и словесную часть логотипа с прозрачным фоном.
//   node tools/build-assets.mjs
import sharp from 'sharp';
import fs from 'node:fs';

const IMG = 'assets/img', BRAND = 'assets/brand';
fs.mkdirSync(IMG, { recursive: true });
fs.mkdirSync(BRAND, { recursive: true });

// Тёплая подтонировка, чтобы холодные офисные кадры сели на кремовую бумагу
const warm = (s) => s.recomb([[1.03, 0.02, 0], [0, 1.0, 0], [0, 0.02, 0.93]]).modulate({ brightness: 1.02, saturation: 0.94 });

const manifest = {};
async function photo(src, name, { extract, widths = [640, 1000], q = 70 } = {}) {
  const meta = await sharp(src).rotate().metadata();
  const out = [];
  for (const w of widths) {
    let s = sharp(src).rotate();
    if (extract) s = s.extract(extract);
    const realW = extract ? extract.width : meta.width;
    s = warm(s.resize({ width: Math.min(w, realW) }));
    const file = `${IMG}/${name}-${w}.webp`;
    const info = await s.webp({ quality: q, effort: 6 }).toFile(file);
    out.push({ file, w: info.width, h: info.height, kb: Math.round(info.size / 1024) });
  }
  manifest[name] = out.map((o) => ({ w: o.w, h: o.h }));
  console.log(name, out.map((o) => `${o.w}x${o.h} ${o.kb}KB`).join(' · '));
  return out;
}

// Альбом пространства — 12 кадров (порядок = порядок в альбоме)
const album = [
  ['raw/ya/ya02.jpg', 'room'],
  ['raw/gis/g03-o.jpg', 'board'],
  ['raw/gis/g01-o.jpg', 'lesson'],
  ['raw/ya/ya05.jpg', 'gym'],
  ['raw/ya/ya06.jpg', 'desks'],
  ['raw/ya/ya03.jpg', 'play'],
  ['raw/ya/ya09.jpg', 'books'],
  ['raw/gis/g15-u.jpg', 'abacus'],
  ['raw/ya/ya11.jpg', 'corner'],
  ['raw/ya/ya12.jpg', 'desk'],
  ['raw/ya/ya13.jpg', 'class'],
];
for (const [src, name] of album) await photo(src, name);
// Девочка пишет — только руки и лист, без лица
await photo('raw/ya/ya07.jpg', 'write', { extract: { left: 0, top: 470, width: 768, height: 554 }, widths: [640, 768] });
// Вход с красной стрелкой владельца — для «Как нас найти»
await photo('raw/ya/ya01.jpg', 'entrance', { widths: [480, 900] });
// Портрет педагога (аватар аккаунта, который публикует фото центра)
await photo('raw/av-orig.jpg', 'irina', { widths: [480, 900], q: 80 });

// ── Бренд ──────────────────────────────────────────────
// Баннер: правая часть с детьми и жирафом
await sharp('raw/banner.webp').extract({ left: 1196, top: 0, width: 804, height: 744 }).webp({ quality: 84 }).toFile(`${BRAND}/banner-kids.webp`);
await sharp('raw/banner.webp').extract({ left: 1196, top: 0, width: 804, height: 744 }).resize({ width: 600 }).webp({ quality: 80 }).toFile(`${BRAND}/banner-kids-600.webp`);
// Подвал: голова и шея жирафа
await sharp('raw/banner.webp').extract({ left: 1385, top: 60, width: 360, height: 360 }).webp({ quality: 84 }).toFile(`${BRAND}/giraffe-peek.webp`);
// Стикер «6–7 лет»: в файле клиента есть только верхние 846 строк круга, углы белые — режем по кругу
{
  const mask = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1254" height="846"><circle cx="627" cy="630" r="622" fill="#fff"/></svg>');
  const cut = await sharp('raw/sticker.webp').extract({ left: 0, top: 0, width: 1254, height: 846 }).png().toBuffer();
  await sharp(await sharp(cut).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer())
    .resize({ width: 640 }).webp({ quality: 84, alphaQuality: 90 }).toFile(`${BRAND}/sticker-6-7.webp`);
}
fs.copyFileSync('raw/logo.png', `${BRAND}/logo.png`);
fs.copyFileSync('raw/banner.webp', `${BRAND}/banner.webp`);
fs.copyFileSync('raw/sticker.webp', `${BRAND}/sticker.webp`);

// Словесная часть логотипа: фон #F8EBDA → прозрачность по расстоянию до цвета бумаги
async function keyed(extract, file, width) {
  const { data, info } = await sharp('raw/logo.png').extract(extract).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bg = [248, 235, 218];
  for (let i = 0; i < data.length; i += 4) {
    const d = Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]);
    const a = Math.max(0, Math.min(1, (d - 14) / 70));
    data[i + 3] = Math.round(a * 255);
    if (a > 0 && a < 1) { // снять кремовую кайму с полупрозрачных пикселей
      for (let c = 0; c < 3; c++) data[i + c] = Math.max(0, Math.min(255, Math.round((data[i + c] - bg[c] * (1 - a)) / a)));
    }
  }
  const info2 = await sharp(data, { raw: info }).resize({ width }).webp({ quality: 90, alphaQuality: 100 }).toFile(file);
  console.log(file, info2.width, info2.height);
}
await keyed({ left: 678, top: 408, width: 840, height: 252 }, `${BRAND}/wordmark.webp`, 640);
await keyed({ left: 678, top: 408, width: 840, height: 112 }, `${BRAND}/wordmark-title.webp`, 640);

fs.writeFileSync('raw/manifest.json', JSON.stringify(manifest, null, 1));
