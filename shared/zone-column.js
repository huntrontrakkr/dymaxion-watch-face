// Place times beside the clock. The clock shifts 36 pixels aside and up to
// three places stack in a 70-pixel column on the other side, in the
// status-line capitals. The watch mirrors this layout in
// watchface/src/c/zone_column.c.
// When place times also show outside the bottom panel, and where.
export const ZONE_TIMES = ['panel', 'when-hidden', 'always'];
export const ZONE_TIMES_NAMES = Object.freeze({panel: 'Only in the bottom panel', 'when-hidden': 'Also whenever the panel shows something else', always: 'Always'});
export const ZONE_POSITIONS = ['left', 'right', 'map'];
export const ZONE_POSITION_NAMES = Object.freeze({left: 'Left of the clock', right: 'Right of the clock', map: 'On the map'});
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
// Whether place times show outside the panel this frame, and so beside the
// clock (which needs a narrow horizontal clock) or on the map.
const elsewhere = (settings, panelShowsZones) => settings.zoneTimes === 'always' || (settings.zoneTimes === 'when-hidden' && !panelShowsZones);
export function zonesBeside(settings, panelShowsZones) {
  if (settings.zonePosition === 'map' || settings.stacked || !zoneColumnFits(settings.clockDisplay)) return false;
  return elsewhere(settings, panelShowsZones);
}
export const zonesOnMap = (settings, panelShowsZones) => settings.zonePosition === 'map' && elsewhere(settings, panelShowsZones);
// Baseline of row `index` of `count`, relative to the strip top: rows are
// centred on the figures, which run from y 2 to 37.
// Tall times (the Tall place times option) use TALL_FIGURES, 10 pixels high,
// on rows 13 apart, so three rows fill the strip exactly.
export function zoneRowBaseline(index, count, tall = false) {
  const {top} = ZONE_COLUMN, pitch = tall ? 13 : ZONE_COLUMN.pitch, glyphHeight = tall ? TALL_HEIGHT : ZONE_COLUMN.glyphHeight, height = tall ? 36 : ZONE_COLUMN.height;
  const block = glyphHeight + pitch * (count - 1);
  return top + Math.floor((height - block) / 2) + index * pitch + glyphHeight;
}
// Tall figures for the times beside the clock: the status-line figures drawn
// 10 pixels high with the same shapes and the same advances (6, the colon 3),
// so a row keeps its width. Labels, day offsets and A/P stay in the capitals
// on the same baseline.
export const TALL_HEIGHT = 10;
export const TALL_FIGURES = Object.freeze({
  '0': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'], '1': ['..#..', '.##..', '#.#..', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '....#', '...#.', '..#..', '.#...', '#....', '#....', '#####'], '3': ['####.', '....#', '....#', '....#', '.###.', '....#', '....#', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '.#.#.', '#..#.', '#..#.', '#####', '...#.', '...#.', '...#.'], '5': ['#####', '#....', '#....', '#....', '####.', '....#', '....#', '....#', '....#', '####.'],
  '6': ['.###.', '#....', '#....', '#....', '####.', '#...#', '#...#', '#...#', '#...#', '.###.'], '7': ['#####', '....#', '....#', '...#.', '...#.', '..#..', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '#...#', '.###.', '#...#', '#...#', '#...#', '#...#', '.###.'], '9': ['.###.', '#...#', '#...#', '#...#', '#...#', '.####', '....#', '....#', '....#', '.###.'],
  ':': ['.', '.', '#', '.', '.', '.', '.', '#', '.', '.']
});
export const TALL_ADVANCE = Object.freeze({':': 3});
// Pixels of a time in tall figures, relative to (x, baseline).
export function tallPixels(text) {
  const out = [];let x = 0;
  for (const c of text) {
    const rows = TALL_FIGURES[c];
    if (rows) rows.forEach((row, y) => [...row].forEach((p, px) => { if (p === '#') out.push([x + px, y - TALL_HEIGHT]); }));
    x += TALL_ADVANCE[c] ?? 6;
  }
  return out;
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
