// Контактные листы: node tools/contact-sheet.mjs [dir] [prefix] — по 20 кадров на лист raw/sheet-<prefix>-N.jpg
import sharp from 'sharp';
import fs from 'node:fs';
const dir = process.argv[2] || 'raw/photos';
const prefix = process.argv[3] || 'ya';
const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
const W = 360, H = 400, cols = 5, per = 20;
for (let s = 0; s * per < files.length; s++) {
  const chunk = files.slice(s * per, s * per + per);
  const tiles = await Promise.all(chunk.map(async (f, i) => {
    const img = await sharp(`${dir}/${f}`).rotate().resize(W - 6, H - 34, { fit: 'contain', background: '#222' }).toBuffer();
    const meta = await sharp(`${dir}/${f}`).metadata();
    const label = Buffer.from(`<svg width="${W}" height="30"><rect width="100%" height="100%" fill="#000"/><text x="8" y="21" font-size="18" fill="#fff" font-family="Arial">${f} ${meta.width}x${meta.height}</text></svg>`);
    const x = (i % cols) * W, y = Math.floor(i / cols) * H;
    return [{ input: img, left: x + 3, top: y + 2 }, { input: label, left: x, top: y + H - 31 }];
  }));
  const rows = Math.ceil(chunk.length / cols);
  await sharp({ create: { width: W * cols, height: H * rows, channels: 3, background: '#111' } }).composite(tiles.flat()).jpeg({ quality: 82 }).toFile(`raw/sheet-${prefix}-${s + 1}.jpg`);
  console.log(`raw/sheet-${prefix}-${s + 1}.jpg`, chunk.length);
}
