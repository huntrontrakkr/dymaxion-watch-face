// Place times beside the clock. The clock shifts left and up to three places
// stack in the column on its right, in the status-line capitals. The watch
// mirrors this layout in watchface/src/c/zone_column.c.
export const ZONE_TIMES = ['panel', 'beside-hidden', 'beside'];
export const ZONE_TIMES_NAMES = Object.freeze({panel: 'In the bottom panel', 'beside-hidden': 'Beside the clock when the panel shows something else', beside: 'Always beside the clock'});
// Chamfer's figures and every system font's ink sit within x 37-163 of the
// strip; shifted 36 pixels left they end by x 127, clear of the column.
export const ZONE_COLUMN = Object.freeze({shift: -36, x: 130, right: 200, pitch: 14, glyphHeight: 7, top: 2, height: 35});
const NARROW = ['chamfer', 'leco', 'bitham-bold', 'bitham-light', 'bitham-medium', 'leco-delta'];
// Broad and Span fill the strip's width, so they keep place times in the panel.
export const zoneColumnFits = style => NARROW.includes(style);
// Whether place times go beside the clock for these settings and this frame.
export function zonesBeside(settings, panelShowsZones) {
  if (settings.stacked || !zoneColumnFits(settings.clockDisplay)) return false;
  return settings.zoneTimes === 'beside' || (settings.zoneTimes === 'beside-hidden' && !panelShowsZones);
}
// Baseline of row `index` of `count`, relative to the strip top: rows are
// centred on the figures, which run from y 2 to 37.
export function zoneRowBaseline(index, count) {
  const {pitch, glyphHeight, top, height} = ZONE_COLUMN, block = glyphHeight + pitch * (count - 1);
  return top + Math.floor((height - block) / 2) + index * pitch + glyphHeight;
}
// One row: the label on the left; time, A/P and day offset in fixed slots on
// the right, so the times line up whichever places carry a day offset.
// `measure` returns a string's advance width in the capitals.
export function zoneRow({label, hour, minute, clock24, delta = 0, stale = false}, measure) {
  const {x, right} = ZONE_COLUMN, two = n => String(n).padStart(2, '0');
  const h = clock24 ? hour : hour % 12 || 12;
  const time = two(h) + ':' + two(minute), suffix = clock24 ? '' : hour < 12 ? 'A' : 'P';
  const day = stale ? '?' : delta ? (delta > 0 ? '+' : '') + delta : '';
  const dayX = right - measure(day), groupEnd = right - measure('+1') - 2;
  const suffixX = groupEnd - (clock24 ? 0 : measure('P')), timeX = suffixX - measure(time);
  let text = label.toUpperCase().slice(0, 7);
  while (text && measure(text) > timeX - 3 - x) text = text.slice(0, -1);
  return {label: text, labelX: x, time, timeX, suffix, suffixX, day, dayX};
}
