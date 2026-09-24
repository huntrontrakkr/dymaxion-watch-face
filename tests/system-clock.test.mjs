import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readPbf, SYSTEM_CLOCK_FONTS, DELTA, deltaRows} from '../tools/generate-system-clock.mjs';
import {DISPLAY_CODES, DISPLAY_STYLES} from '../shared/display.js';
import {SYSTEM_CLOCKS} from '../shared/system-clock.js';
const generated = JSON.parse(readFileSync('assets/type/system-clock.json'));
const header = readFileSync('watchface/src/c/generated/system_clock.h', 'utf8');
test('PebbleOS system fonts decode to the committed preview glyphs', () => {
  for (const [id, file, key, code] of SYSTEM_CLOCK_FONTS) {
    const font = readPbf(readFileSync(`vendor/pebbleos-fonts/${file}.pbf`));
    for (const ch of '0123456789:') {
      const g = font.glyph(ch.codePointAt(0));
      assert(g && g.width > 0 && g.height > 0 && g.rows.every(r => r.length === g.width), `${file} ${ch}`);
      assert.deepEqual(g, generated[id].glyphs[ch], `${file} ${ch} matches assets/type/system-clock.json`);
    }
    assert.equal(generated[id].code, code);assert.equal(DISPLAY_CODES[id], code);assert(DISPLAY_STYLES.includes(id));
    assert.match(header, new RegExp(`\\{${code}, ${key}, ${generated[id].boxTop}, \\d+\\}`), `${key} in system_clock.h`);
  }
  assert.deepEqual(SYSTEM_CLOCKS, [...SYSTEM_CLOCK_FONTS.map(f => f[0]), DELTA.id]);
});
test('Leco Delta is Leco with 60-degree corner cuts; every style’s glyphs pack identically for the watch', () => {
  const delta = generated[DELTA.id], leco = generated[DELTA.from], R3 = Math.sqrt(3);
  assert.equal(DISPLAY_CODES[DELTA.id], DELTA.code);assert.equal(delta.boxTop, leco.boxTop);
  for (const ch of '0123456789:') {
    assert.deepEqual(delta.glyphs[ch].rows, deltaRows(leco.glyphs[ch].rows), ch);
    // Cutting only removes ink, and never from a pixel the original lacks.
    delta.glyphs[ch].rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') assert.equal(leco.glyphs[ch].rows[y][x], '#'); }));
  }
  // clock-glyphs.bin: [count], per font [code, box top, offset u16], 11 glyphs of 7 bytes, then bits.
  const bin = readFileSync('watchface/resources/data/clock-glyphs.bin'), count = bin[0];
  assert.equal(count, Object.keys(generated).length);assert.match(header, new RegExp(`CLOCK_GLYPHS_BYTES ${bin.length}\\b`));
  for (let f = 0; f < count; f++) {
    const code = bin[1 + f * 4], boxTop = bin.readInt8(2 + f * 4), at = bin.readUInt16LE(3 + f * 4);
    const [id, font] = Object.entries(generated).find(([, v]) => v.code === code);
    assert.equal(boxTop, font.boxTop, id);
    [...'0123456789:'].forEach((ch, k) => {
      const m = at + k * 7, w = bin[m], h = bin[m + 1], bit = bin.readUInt16LE(m + 5), bits = at + 77, g = font.glyphs[ch];
      assert.deepEqual([w, h, bin.readInt8(m + 2), bin.readInt8(m + 3), bin.readInt8(m + 4)], [g.width, g.height, g.left, g.top, g.advance], `${id} ${ch}`);
      const rows = Array.from({length: h}, (_, y) => Array.from({length: w}, (_, x) => { const n = bit + y * w + x; return (bin[bits + (n >> 3)] >> (n & 7)) & 1 ? '#' : '.'; }).join(''));
      assert.deepEqual(rows, g.rows, `${id} ${ch} bits`);
    });
  }
  // An upright stroke end comes to a symmetric point that widens row by row,
  // about 1.2 pixels per row on each side: a 60-degree edge (tan 30 = 0.58 per side).
  const end = deltaRows(Array(12).fill('######')), widths = end.map(r => r.split('#').length - 1);
  end.forEach(r => assert.equal(r, [...r].reverse().join('')));
  assert(widths[0] <= 2 && widths[5] === 6);
  for (let k = 1; k < 6; k++) assert(widths[k] >= widths[k - 1]); // the top half; the bottom end tapers too
  assert(R3 > 1.7);
});
test('every system-font readout stays inside the 40-pixel clock strip', () => {
  for (const [id, font] of Object.entries(generated)) for (let minute = 0; minute < 1440; minute += 7) {
    const text = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
    const width = [...text].reduce((w, ch) => w + font.glyphs[ch].advance, 0);
    let x = Math.trunc((200 - width) / 2);
    for (const ch of text) {
      const g = font.glyphs[ch], top = font.boxTop + g.top;
      assert(top >= 0 && top + g.height <= 40 && x + g.left >= 0 && x + g.left + g.width <= 200, `${id} ${text} ${ch}`);
      x += g.advance;
    }
  }
});
