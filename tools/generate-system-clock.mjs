// Reads PebbleOS system fonts (vendor/pebbleos-fonts/*.pbf) as data and writes
// the clock glyphs the workshop needs for a pixel-exact preview, plus the
// native constants that centre each font's figures in the 40-pixel clock strip.
// On the watch the fonts come from firmware (fonts_get_system_font).
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';

export const SYSTEM_CLOCK_FONTS = [
  // id, PBF file, SDK font key, display code, name
  ['leco', 'LECO_42_NUMBERS', 'FONT_KEY_LECO_42_NUMBERS', 5, 'Leco (Pebble system font)'],
  ['bitham-bold', 'BITHAM_42_BOLD', 'FONT_KEY_BITHAM_42_BOLD', 6, 'Bitham Bold (Pebble system font)'],
  ['bitham-light', 'BITHAM_42_LIGHT', 'FONT_KEY_BITHAM_42_LIGHT', 7, 'Bitham Light (Pebble system font)'],
  ['bitham-medium', 'BITHAM_42_MEDIUM_NUMBERS', 'FONT_KEY_BITHAM_42_MEDIUM_NUMBERS', 8, 'Bitham Medium (Pebble system font)']
];
const CHARACTERS = '0123456789:';
const STRIP = 40;

// PBF layout: a metadata header (v2 six bytes, v3 ten), a hash table of
// (hash, count, offset) entries, per-bucket offset tables of (codepoint, glyph
// offset), then the glyph table. Each glyph is width, height (or RLE4 unit
// count), left, top, advance, then its bitmap: row-major bits, least
// significant bit first, or 4-bit run-length units when the font uses RLE4.
export function readPbf(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = bytes[0], maxHeight = bytes[1], glyphCount = view.getUint16(2, true);
  const tableSize = bytes[6], codepointBytes = bytes[7];
  if (version !== 2 && version !== 3) throw new Error(`Unsupported PBF version ${version}.`);
  const headerSize = version === 3 ? bytes[8] : 8, features = version === 3 ? bytes[9] : 0;
  const offset16 = features & 1, rle4 = features & 2;
  const entrySize = codepointBytes + (offset16 ? 2 : 4);
  const offsetsAt = headerSize + tableSize * 4, glyphsAt = offsetsAt + entrySize * glyphCount;
  const glyph = codepoint => {
    const bucket = headerSize + (codepoint % tableSize) * 4, count = bytes[bucket + 1], offset = view.getUint16(bucket + 2, true);
    for (let i = 0; i < count; i++) {
      const at = offsetsAt + offset + i * entrySize;
      const cp = codepointBytes === 4 ? view.getUint32(at, true) : view.getUint16(at, true);
      if (cp !== codepoint) continue;
      const g = glyphsAt + (offset16 ? view.getUint16(at + codepointBytes, true) : view.getUint32(at + codepointBytes, true));
      const width = bytes[g], units = bytes[g + 1], left = view.getInt8(g + 2), top = view.getInt8(g + 3), advance = view.getInt8(g + 4);
      let pixels = [];
      if (rle4) {
        for (let u = 0; u < units; u++) {
          const nibble = (bytes[g + 5 + (u >> 1)] >> ((u & 1) * 4)) & 15;
          pixels.push(...Array((nibble & 7) + 1).fill((nibble >> 3) & 1));
        }
      } else {
        const height = units;
        for (let i = 0; i < width * height; i++) pixels.push((bytes[g + 5 + (i >> 3)] >> (i & 7)) & 1);
      }
      const height = width ? pixels.length / width : 0;
      return {width, height, left, top, advance, rows: Array.from({length: height}, (_, y) => pixels.slice(y * width, (y + 1) * width).map(p => p ? '#' : '.').join(''))};
    }
    return null;
  };
  return {version, maxHeight, glyph};
}

// Leco Delta: Leco with every exposed corner cut on a line 60 degrees from
// horizontal (the map's triangle sides): horizontal leg a, vertical leg a*sqrt(3).
// Upright stroke ends come to equilateral points, bar ends to chevrons, and
// joints get a 3-pixel bevel. Inside corners stay square.
export const DELTA = {id: 'leco-delta', from: 'leco', code: 9, name: 'Leco Delta (60° corners)', joint: 3};
export function deltaRows(rows, joint = DELTA.joint) {
  const H = rows.length, W = rows[0]?.length || 0, R3 = Math.sqrt(3);
  const ink = (x, y) => x >= 0 && y >= 0 && x < W && y < H && rows[y][x] === '#';
  const out = rows.map(r => [...r].map(c => c === '#'));
  const side = (u, v, w) => (u[0] - w[0]) * (v[1] - w[1]) - (v[0] - w[0]) * (u[1] - w[1]);
  const inTriangle = (p, a, b, c) => { const d = [side(p, a, b), side(p, b, c), side(p, c, a)]; return !(d.some(n => n < 0) && d.some(n => n > 0)); };
  for (let vy = 0; vy <= H; vy++) for (let vx = 0; vx <= W; vx++) {
    const quadrants = [[ink(vx - 1, vy - 1), -1, -1], [ink(vx, vy - 1), 1, -1], [ink(vx - 1, vy), -1, 1], [ink(vx, vy), 1, 1]];
    const inked = quadrants.filter(q => q[0]);
    if (inked.length !== 1) continue; // only convex corners
    const [, dx, dy] = inked[0], px = dx > 0 ? vx : vx - 1, py = dy > 0 ? vy : vy - 1;
    let along = 0; while (ink(px + dx * along, py) && !ink(px + dx * along, py - dy)) along++;
    let down = 0; while (ink(px, py + dy * down) && !ink(px - dx, py + dy * down)) down++;
    const a = Math.min(along / 2, down / (2 * R3), joint), A = [vx, vy], B = [vx + dx * a, vy], C = [vx, vy + dy * a * R3];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inTriangle([x + .5, y + .5], A, B, C)) out[y][x] = false;
  }
  return out.map(r => r.map(v => v ? '#' : '.').join(''));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fonts = {}, native = [];
  for (const [id, file, key, code, name] of SYSTEM_CLOCK_FONTS) {
    const font = readPbf(readFileSync(new URL(`../vendor/pebbleos-fonts/${file}.pbf`, import.meta.url)));
    const glyphs = Object.fromEntries([...CHARACTERS].map(ch => {
      const g = font.glyph(ch.codePointAt(0));
      if (!g) throw new Error(`${file} has no "${ch}".`);
      return [ch, g];
    }));
    // Centre the figures' ink (digits and colon) vertically in the strip.
    const inked = Object.values(glyphs).filter(g => g.height);
    const top = Math.min(...inked.map(g => g.top)), bottom = Math.max(...inked.map(g => g.top + g.height));
    if (bottom - top > STRIP) throw new Error(`${file} figures are ${bottom - top} px tall; the strip is ${STRIP}.`);
    const boxTop = Math.floor((STRIP - (bottom - top)) / 2) - top;
    fonts[id] = {name, key, code, maxHeight: font.maxHeight, boxTop, glyphs};
    native.push({key, code, boxTop, boxHeight: font.maxHeight + 8});
  }
  // Leco Delta ships its own glyphs (a modified font cannot come from firmware).
  const base = fonts[DELTA.from];
  fonts[DELTA.id] = {name: DELTA.name, key: null, code: DELTA.code, maxHeight: base.maxHeight, boxTop: base.boxTop,
    glyphs: Object.fromEntries(Object.entries(base.glyphs).map(([ch, g]) => [ch, {...g, rows: deltaRows(g.rows)}]))};
  // Fallback if the glyph resource cannot load: plain firmware Leco in Delta's place.
  native.push({key: 'FONT_KEY_LECO_42_NUMBERS', code: DELTA.code, boxTop: base.boxTop, boxHeight: base.maxHeight + 8});
  // Watch resource clock-glyphs.bin, loaded only for these styles so the minute
  // transition can render them: [count] then per font [code, box top, block
  // offset u16]; each block holds 11 glyphs for "0123456789:" as width, height,
  // left, top, advance, first bit (u16), followed by their bits (row-major,
  // least significant bit first).
  const blocks = [], order = [...SYSTEM_CLOCK_FONTS.map(f => f[0]), DELTA.id];
  for (const id of order) {
    const font = fonts[id], bits = [], glyphBytes = [];
    for (const ch of CHARACTERS) {
      const g = font.glyphs[ch], start = bits.length;
      for (const row of g.rows) for (const c of row) bits.push(c === '#' ? 1 : 0);
      glyphBytes.push(g.width, g.height, g.left & 255, g.top & 255, g.advance & 255, start & 255, start >> 8);
    }
    const packed = Array.from({length: Math.ceil(bits.length / 8)}, (_, k) => bits.slice(k * 8, k * 8 + 8).reduce((b, v, n) => b | (v << n), 0));
    blocks.push({code: font.code, boxTop: font.boxTop, bytes: [...glyphBytes, ...packed]});
  }
  const table = 1 + blocks.length * 4;let offset = table;
  const resource = [blocks.length];
  for (const b of blocks) { resource.push(b.code, b.boxTop & 255, offset & 255, offset >> 8); offset += b.bytes.length; }
  for (const b of blocks) resource.push(...b.bytes);
  mkdirSync(new URL('../watchface/resources/data/', import.meta.url), {recursive: true});
  writeFileSync(new URL('../watchface/resources/data/clock-glyphs.bin', import.meta.url), Buffer.from(resource));
  // Span's exact watch runs for the browser's transition masks (the full
  // proofs file is too large to bundle).
  const proofs = JSON.parse(readFileSync(new URL('../designer/public/type/proofs.json', import.meta.url)));
  writeFileSync(new URL('../assets/type/span-clock.json', import.meta.url), JSON.stringify(Object.fromEntries([...CHARACTERS].map(ch => [ch, proofs.span.lining.large[ch]]))) + '\n');
  mkdirSync(new URL('../assets/type/', import.meta.url), {recursive: true});
  writeFileSync(new URL('../assets/type/system-clock.json', import.meta.url), JSON.stringify(fonts) + '\n');
  writeFileSync(new URL('../watchface/src/c/generated/system_clock.h', import.meta.url), [
    '// Generated by tools/generate-system-clock.mjs from PebbleOS system fonts.',
    '// Each entry: display code, font key, top of the text box relative to the',
    '// 40-pixel clock strip, and a box tall enough for one line.',
    '#pragma once',
    `#define SYSTEM_CLOCK_COUNT ${native.length}`,
    'typedef struct { uint8_t code; const char *key; int8_t box_top; uint8_t box_height; } SystemClockFont;',
    'static const SystemClockFont SYSTEM_CLOCK_FONTS[SYSTEM_CLOCK_COUNT] = {',
    ...native.map(n => `  {${n.code}, ${n.key}, ${n.boxTop}, ${n.boxHeight}},`),
    '};',
    '// Leco Delta (display code 9) and the four system fonts are drawn from the',
    '// clock-glyphs.bin resource; without it Delta falls back to firmware Leco.',
    `#define DELTA_CODE ${DELTA.code}`,
    `#define CLOCK_GLYPHS_BYTES ${resource.length}`,
    `#define CLOCK_GLYPH_FONTS ${blocks.length}`, ''
  ].join('\n'));
  console.log(`System clock fonts: ${native.map(n => `${n.key.replace('FONT_KEY_', '')} (top ${n.boxTop})`).join(', ')}.`);
}
