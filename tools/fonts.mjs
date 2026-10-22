// Шрифты локально: по одному woff2 на начертание, только нужные знаки (Google Fonts API, параметр text=).
// Вписывает @font-face в начало css/styles.css (между /*@FONTS*/ … /*/@FONTS*/).   node tools/fonts.mjs
import fs from 'node:fs';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const CHARS = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ' +
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' +
  '  .,:;!?…—–-‑«»"\'„“()[]#/\\№₽·•●▸→←×+%&*@_=';
const FACES = [
  // [семейство, параметры API, имя файла, style, weight]
  ['Cormorant Garamond', 'ital,wght@0,500', 'cormorant', 'normal', '500 600'],
  ['Cormorant Garamond', 'ital,wght@1,500', 'cormorant-i', 'italic', '500 600'],
  ['Manrope', 'wght@400..600', 'manrope', 'normal', '400 600'],
  ['Alumni Sans', 'wght@600..800', 'alumni', 'normal', '600 800'],
  ['Caveat', 'wght@600', 'caveat', 'normal', '500 700'],
];
fs.mkdirSync('assets/fonts', { recursive: true });
for (const f of fs.readdirSync('assets/fonts')) fs.unlinkSync('assets/fonts/' + f);
const out = ['/* Шрифты лежат локально: одно начертание — один файл, только нужные знаки; font-display: swap */'];
let total = 0;
for (const [fam, spec, name, style, weight] of FACES) {
  const url = `https://fonts.googleapis.com/css2?family=${fam.replace(/ /g, '+')}:${spec}&text=${encodeURIComponent(CHARS)}&display=swap`;
  const css = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
  const src = [...css.matchAll(/url\(([^)]+)\) format\('woff2'\)/g)].map((m) => m[1]);
  if (src.length !== 1) throw new Error(`${fam} ${spec}: файлов ${src.length}\n${css}`);
  const buf = Buffer.from(await (await fetch(src[0])).arrayBuffer());
  fs.writeFileSync(`assets/fonts/${name}.woff2`, buf);
  total += buf.length;
  console.log(name.padEnd(14), weight.padEnd(8), (buf.length / 1024).toFixed(1) + 'КБ');
  out.push(`@font-face { font-family: '${fam}'; font-style: ${style}; font-weight: ${weight}; font-display: swap; src: url(../assets/fonts/${name}.woff2) format('woff2'); }`);
}
const st = fs.readFileSync('css/styles.css', 'utf8');
fs.writeFileSync('css/styles.css', st.replace(/\/\*@FONTS\*\/[\s\S]*?\/\*\/@FONTS\*\//, () => '/*@FONTS*/\n' + out.join('\n') + '\n/*/@FONTS*/'));
console.log('всего', (total / 1024).toFixed(0) + 'КБ');
