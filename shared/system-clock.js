// Pebble's built-in clock fonts, drawn in the workshop from the same glyphs
// the firmware uses (tools/generate-system-clock.mjs, vendor/pebbleos-fonts).
// Layout follows PebbleOS text layout: one centred line in a 200-pixel box,
// each glyph at the cursor plus its left and top offsets.
import fonts from '../assets/type/system-clock.json' with {type: 'json'};
export const SYSTEM_CLOCKS = Object.freeze(Object.keys(fonts));
export const systemClockName = id => fonts[id]?.name;
export function drawSystemTime(ctx, id, time, x, y, ink) {
  const font = fonts[id], text = time.trim();
  const width = [...text].reduce((w, ch) => w + font.glyphs[ch].advance, 0);
  let cursor = x + Math.trunc((200 - width) / 2);
  ctx.fillStyle = ink;
  for (const ch of text) {
    const g = font.glyphs[ch];
    g.rows.forEach((row, ry) => { for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') ctx.fillRect(cursor + g.left + rx, y + font.boxTop + g.top + ry, 1, 1); });
    cursor += g.advance;
  }
}
