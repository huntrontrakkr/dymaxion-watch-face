import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readPbf, SYSTEM_CLOCK_FONTS} from '../tools/generate-system-clock.mjs';
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
  assert.deepEqual(SYSTEM_CLOCKS, SYSTEM_CLOCK_FONTS.map(f => f[0]));
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
