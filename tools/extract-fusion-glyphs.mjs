// Copies the glyphs the watch's languages need out of Fusion Pixel Font 10px
// (TakWolf, SIL Open Font License 1.1) into assets/type/fusion-glyphs.json,
// so the repository keeps a few kilobytes rather than the 13 MB source fonts.
// Rerun it when a translation in shared/watch-text.js uses a new character:
//   node tools/extract-fusion-glyphs.mjs <folder of fusion-pixel-10px-proportional-*.bdf>
// The release used is in assets/fonts/fusion-pixel/README.md.
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {WATCH_TEXT, WATCH_LANGUAGES} from '../shared/watch-text.js';
import {neededCharacters, FUSION_VARIANT, LATIN_BASES} from './watch-text-glyphs.mjs';

const folder = process.argv[2];
if (!folder) throw new Error('Pass the folder holding the Fusion Pixel 10px proportional BDF files.');
function readBdf(path) {
  const glyphs = new Map(), text = readFileSync(path, 'utf8');
  for (const block of text.split('STARTCHAR').slice(1)) {
    const code = +block.match(/ENCODING (\d+)/)[1], advance = +block.match(/DWIDTH (\d+)/)[1];
    const [w, h, x, y] = block.match(/BBX (-?\d+) (-?\d+) (-?\d+) (-?\d+)/).slice(1).map(Number);
    const hex = block.split('BITMAP')[1].split('ENDCHAR')[0].trim().split(/\s+/).filter(Boolean);
    const rows = hex.map(row => { const v = BigInt('0x' + row), bits = row.length * 4; return Array.from({length: w}, (_, i) => (v >> BigInt(bits - 1 - i)) & 1n ? '#' : '.').join(''); });
    glyphs.set(code, {a: advance, l: x, t: y + h, rows});
  }
  return glyphs;
}
const out = {source: 'Fusion Pixel Font 10px proportional (TakWolf), SIL Open Font License 1.1', variants: {}};
const fonts = {};
for (const code of WATCH_LANGUAGES) {
  const variant = FUSION_VARIANT[code] || 'latin';
  fonts[variant] ||= readBdf(join(folder, `fusion-pixel-10px-proportional-${variant}.bdf`));
  const chars = new Set([...neededCharacters(WATCH_TEXT[code])]);
  if (variant === 'latin') for (const ch of [...chars]) { const base = LATIN_BASES(ch); if (base) chars.add(base); }
  out.variants[variant] ||= {};
  for (const ch of chars) {
    const glyph = fonts[variant].get(ch.codePointAt(0));
    if (!glyph) throw new Error(`Fusion Pixel ${variant} has no glyph for ${ch} (${code}).`);
    out.variants[variant][ch] = glyph;
  }
}
// Latin capitals: the accents are measured against these.
for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') out.variants.latin[ch] = fonts.latin.get(ch.codePointAt(0));
for (const v of Object.values(out.variants)) for (const k of Object.keys(v).sort()) { const g = v[k]; delete v[k]; v[k] = g; }
writeFileSync('assets/type/fusion-glyphs.json', JSON.stringify(out, null, 0).replace(/\},"/g, '},\n"'));
console.log('Fusion glyphs:', Object.entries(out.variants).map(([v, g]) => `${v} ${Object.keys(g).length}`).join(', '));
