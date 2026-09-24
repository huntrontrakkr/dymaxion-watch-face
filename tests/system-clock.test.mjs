import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readPbf, SYSTEM_CLOCK_FONTS, DELTA, deltaRows} from '../tools/generate-system-clock.mjs';
import {DISPLAY_CODES, DISPLAY_STYLES} from '../shared/triangle-display.js';
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
test('Leco Delta is Leco with 60-degree corner cuts, packed identically for the watch', () => {
  const delta = generated[DELTA.id], leco = generated[DELTA.from], R3 = Math.sqrt(3);
  assert.equal(DISPLAY_CODES[DELTA.id], DELTA.code);assert.equal(delta.boxTop, leco.boxTop);
  const bytes = header.match(/DELTA_BITS\[\d+\] = \{([^}]*)\}/)[1].split(',').map(Number);
  const glyphs = [...header.match(/DELTA_GLYPHS\[\d+\] = \{(.*)\};/)[1].matchAll(/\{(-?\d+),(-?\d+),(-?\d+),(-?\d+),(-?\d+),(\d+)\}/g)].map(m => m.slice(1).map(Number));
  [...'0123456789:'].forEach((ch, i) => {
    const g = delta.glyphs[ch], base = leco.glyphs[ch], [w, h, left, top, advance, bit] = glyphs[i];
    assert.deepEqual(g.rows, deltaRows(base.rows), ch);
    assert.deepEqual([w, h, left, top, advance], [g.width, g.height, g.left, g.top, g.advance], ch);
    const rows = Array.from({length: h}, (_, y) => Array.from({length: w}, (_, x) => { const k = bit + y * w + x; return (bytes[k >> 3] >> (k & 7)) & 1 ? '#' : '.'; }).join(''));
    assert.deepEqual(rows, g.rows, `${ch} bits in system_clock.h`);
    // Cutting only removes ink, and never from a pixel the original lacks.
    g.rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') assert.equal(base.rows[y][x], '#'); }));
  });
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
