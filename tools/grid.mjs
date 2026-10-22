// Склейка снимков в лист: node tools/grid.mjs out.png cols scale a.png b.png ...
import sharp from 'sharp';
const [out, cols, scale, ...files] = process.argv.slice(2);
const metas = await Promise.all(files.map((f) => sharp(f).metadata()));
const w = Math.round(metas[0].width * +scale), h = Math.round(Math.max(...metas.map((m) => m.height)) * +scale);
const tiles = await Promise.all(files.map((f) => sharp(f).resize({ width: w }).toBuffer()));
const C = +cols, R = Math.ceil(files.length / C);
await sharp({ create: { width: C * (w + 8), height: R * (h + 8), channels: 3, background: '#333' } })
  .composite(tiles.map((t, i) => ({ input: t, left: (i % C) * (w + 8), top: Math.floor(i / C) * (h + 8) }))).png().toFile(out);
console.log(out);
