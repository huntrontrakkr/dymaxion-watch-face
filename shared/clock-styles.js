// Transition masks for the numeral styles without fixed figure slots: Span,
// the Pebble system fonts and Leco Delta. Each renders the time into
// a 200 x 40 strip exactly as the watch does (watchface/src/c/clock_styles.c),
// so the minute transition shrinks the same tiles on both.
import span from '../assets/type/span-clock.json' with {type: 'json'};
import fonts from '../assets/type/system-clock.json' with {type: 'json'};
export const STYLE_WIDTH = 200, STYLE_HEIGHT = 40;
const blank = () => new Uint8Array(STYLE_WIDTH * STYLE_HEIGHT);
const plot = (mask, x, y) => { if (x >= 0 && y >= 0 && x < STYLE_WIDTH && y < STYLE_HEIGHT) mask[y * STYLE_WIDTH + x] = 1; };
const check = time => { if (!/^[\d ]\d:\d{2}$/.test(time)) throw new Error('Use a readout such as 12:34.'); };
export function spanTimeMask(time) {
  check(time);const mask = blank();let cursor = 5;
  for (const ch of time) {
    if (ch === ' ') { cursor += 45; continue; }
    for (const [x, y, length] of span[ch].r) for (let k = 0; k < length; k++) plot(mask, cursor + x + k, 2 + y);
    cursor += ch === ':' ? 10 : 45;
  }
  return mask;
}
export function fontTimeMask(id, time) {
  check(time);const mask = blank(), font = fonts[id], text = time.trim();
  let cursor = Math.trunc((STYLE_WIDTH - [...text].reduce((w, ch) => w + font.glyphs[ch].advance, 0)) / 2);
  for (const ch of text) {
    const g = font.glyphs[ch];
    g.rows.forEach((row, r) => { for (let c = 0; c < row.length; c++) if (row[c] === '#') plot(mask, cursor + g.left + c, font.boxTop + g.top + r); });
    cursor += g.advance;
  }
  return mask;
}
export const STYLE_MASKS = Object.freeze({span: spanTimeMask,
  ...Object.fromEntries(Object.keys(fonts).map(id => [id, time => fontTimeMask(id, time)]))});
