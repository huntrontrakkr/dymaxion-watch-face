// Place times beside the clock. The clock shifts 36 pixels aside and up to
// three places stack in a 70-pixel column on the other side, in the
// status-line capitals. The watch mirrors this layout in
// watchface/src/c/zone_column.c.
export const ZONE_TIMES = ['panel', 'beside-hidden', 'beside'];
export const ZONE_TIMES_NAMES = Object.freeze({panel: 'In the bottom panel', 'beside-hidden': 'Beside the clock when the panel shows something else', beside: 'Always beside the clock'});
export const ZONE_SIDES = ['left', 'right'];
// Chamfer's figures and every system font's ink sit within x 37-162 of the
// strip. Shifted 36 pixels right they start at x 73, clear of a left column
// [4, 70); shifted left they end by x 126, clear of a right column [130, 196).
// The 4-pixel inset lines the column up with the status line above.
export const ZONE_COLUMN = Object.freeze({shift: 36, inset: 4, width: 70, gap: 2, pitch: 14, glyphHeight: 7, top: 2, height: 35});
export const zoneColumn = side => side === 'right'
  ? {shift: -ZONE_COLUMN.shift, x: 200 - ZONE_COLUMN.width, right: 200 - ZONE_COLUMN.inset}
  : {shift: ZONE_COLUMN.shift, x: ZONE_COLUMN.inset, right: ZONE_COLUMN.width};
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
// One row: the label with its day offset ("+1") right after it, then the time
// and A/P in fixed slots flush right, so the times line up in one column.
// `measure` returns a string's advance width in the capitals.
export function zoneRow({label, hour, minute, clock24, delta = 0, stale = false, side = 'left'}, measure) {
  const {x, right} = zoneColumn(side), two = n => String(n).padStart(2, '0');
  const h = clock24 ? hour : hour % 12 || 12;
  const time = two(h) + ':' + two(minute), suffix = clock24 ? '' : hour < 12 ? 'A' : 'P';
  const day = stale ? '?' : delta ? (delta > 0 ? '+' : '') + delta : '';
  const suffixX = right - (clock24 ? 0 : measure('P')), timeX = suffixX - measure(time);
  const room = timeX - ZONE_COLUMN.gap - x - (day ? measure(day) + 1 : 0);
  let text = label.toUpperCase().slice(0, 7);
  while (text && measure(text) > room) text = text.slice(0, -1);
  return {label: text, labelX: x, day, dayX: x + measure(text) + 1, time, timeX, suffix, suffixX};
}
