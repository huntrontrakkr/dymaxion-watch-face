// Place times beside the clock. The clock shifts 36 pixels aside and up to
// three places stack in a 70-pixel column on the other side, in the
// status-line capitals. The watch mirrors this layout in
// watchface/src/c/zone_column.c.
// When place times also show outside the bottom panel, and where.
export const ZONE_TIMES = ['panel', 'when-hidden', 'always'];
export const ZONE_TIMES_NAMES = Object.freeze({panel: 'Only in the bottom panel', 'when-hidden': 'Also whenever the panel shows something else', always: 'Always'});
export const ZONE_POSITIONS = ['left', 'right', 'map', 'strip'];
export const ZONE_POSITION_NAMES = Object.freeze({left: 'Left of the clock', right: 'Right of the clock', map: 'On the map', strip: 'Between the clock and the map'});
// The icosahedron beside a narrow clock (shared/clock-art.js): off, or on the
// left or right, where it holds the column until place times take it.
export const CLOCK_ART = ['none', 'left', 'right'];
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
  if (!['left', 'right'].includes(settings.zonePosition) || !zoneColumnFits(settings.clockDisplay)) return false;
  return elsewhere(settings, panelShowsZones);
}
export const zonesOnMap = (settings, panelShowsZones) => settings.zonePosition === 'map' && elsewhere(settings, panelShowsZones);
export const zonesOnStrip = (settings, panelShowsZones) => settings.zonePosition === 'strip' && elsewhere(settings, panelShowsZones);
// The icosahedron shows beside a narrow clock; the column is then always on
// its side, and place times beside the clock take its place there.
export const artBeside = settings => (settings.clockArt ?? 'none') !== 'none' && zoneColumnFits(settings.clockDisplay);
export const besideSide = settings => artBeside(settings) ? settings.clockArt : settings.zonePosition;
// Baseline of row `index` of `count`, relative to the strip top: rows are
// centred on the figures, which run from y 2 to 37.
// Tall times (the Tall place times option) use TALL_FIGURES, 10 pixels high,
// on rows 13 apart, so three rows fill the strip exactly.
export function zoneRowBaseline(index, count, tall = false) {
  const {top} = ZONE_COLUMN, pitch = tall ? 13 : ZONE_COLUMN.pitch, glyphHeight = tall ? TALL_HEIGHT : ZONE_COLUMN.glyphHeight, height = tall ? 36 : ZONE_COLUMN.height;
  const block = glyphHeight + pitch * (count - 1);
  return top + Math.floor((height - block) / 2) + index * pitch + glyphHeight;
}
// Tall figures for the times beside the clock (the Tall place times option):
// the status-line figures drawn 10 pixels high and a pixel wider, 6×10 on an
// advance of 7, the colon 1 pixel on an advance of 2. Labels, day offsets and
// A/P stay in the capitals on the same baseline; zoneRow tightens their spacing
// by a pixel each so a 12-hour row with a day offset still fits.
export const TALL_HEIGHT = 10;
export const TALL_FIGURES = Object.freeze({
  '0': ['.####.', '#....#', '#....#', '#....#', '#....#', '#....#', '#....#', '#....#', '#....#', '.####.'], '1': ['...#..', '..##..', '.#.#..', '...#..', '...#..', '...#..', '...#..', '...#..', '...#..', '..###.'],
  '2': ['.####.', '#....#', '.....#', '.....#', '....#.', '...#..', '..#...', '.#....', '#.....', '######'], '3': ['#####.', '.....#', '.....#', '.....#', '.####.', '.....#', '.....#', '.....#', '.....#', '#####.'],
  '4': ['....#.', '...##.', '..#.#.', '.#..#.', '#...#.', '#...#.', '######', '....#.', '....#.', '....#.'], '5': ['######', '#.....', '#.....', '#.....', '#####.', '.....#', '.....#', '.....#', '.....#', '#####.'],
  '6': ['.####.', '#.....', '#.....', '#.....', '#####.', '#....#', '#....#', '#....#', '#....#', '.####.'], '7': ['######', '.....#', '.....#', '....#.', '....#.', '...#..', '...#..', '..#...', '..#...', '..#...'],
  '8': ['.####.', '#....#', '#....#', '#....#', '.####.', '#....#', '#....#', '#....#', '#....#', '.####.'], '9': ['.####.', '#....#', '#....#', '#....#', '#....#', '.#####', '.....#', '.....#', '.....#', '.####.'],
  ':': ['.', '.', '#', '.', '.', '.', '.', '#', '.', '.']
});
export const TALL_ADVANCE = Object.freeze({':': 2});
export const tallWidth = text => [...text].reduce((n, c) => n + (TALL_ADVANCE[c] ?? 7), 0);
// Pixels of a time in tall figures, relative to (x, baseline).
export function tallPixels(text) {
  const out = [];let x = 0;
  for (const c of text) {
    const rows = TALL_FIGURES[c];
    if (rows) rows.forEach((row, y) => [...row].forEach((p, px) => { if (p === '#') out.push([x + px, y - TALL_HEIGHT]); }));
    x += TALL_ADVANCE[c] ?? 7;
  }
  return out;
}
// One row: the label with its day offset ("+1") right after it, then the time
// and A/P in fixed slots flush right, so the times line up in one column.
// `measure` returns a string's advance width in the capitals.
// Tall rows drop the pixel after A/P at the edge, a pixel of the gap before
// the time and the extra pixel between label and day offset.
// With `icon`, the place glyph leads the row (centred at glyphX) and the label
// starts 7 pixels later: the glyph and 2.
export const ZONE_ROW_GLYPH_ADVANCE = 7;
export function zoneRow({label, hour, minute, clock24, delta = 0, stale = false, side = 'left', tall = false, icon = false}, measure) {
  const {x: start, right} = zoneColumn(side), x = start + (icon ? ZONE_ROW_GLYPH_ADVANCE : 0), two = n => String(n).padStart(2, '0');
  const h = clock24 ? hour : hour % 12 || 12;
  const time = two(h) + ':' + two(minute), suffix = clock24 ? '' : hour < 12 ? 'A' : 'P';
  const day = stale ? '?' : delta ? (delta > 0 ? '+' : '') + delta : '';
  const trim = tall ? 1 : 0, suffixX = right - (clock24 ? 0 : measure('P') - trim), timeX = suffixX - (tall ? tallWidth(time) : measure(time));
  const room = timeX - ZONE_COLUMN.gap + trim - x - (day ? measure(day) + 1 - trim : 0);
  let text = label.toUpperCase().slice(0, 7);
  while (text && measure(text) > room) text = text.slice(0, -1);
  // With an icon, the glyph names the place: a label cut to one letter is dropped.
  if (icon && text.length < 2 && label.length > 1) text = '';
  return {glyphX: start + 2, label: text, labelX: x, day, dayX: x + measure(text) + 1 - trim, time, timeX, suffix, suffixX};
}

// Place times between the clock and the map, in the nameplate's place (the
// Position option "Between the clock and the map"): one line per place of its
// glyph, label and time, the places spread evenly across the width. Labels
// shorten to three letters, then drop, if the line would not fit. Times use
// the tall figures by default, or the same capitals as beside-clock times in
// compact mode. Labels and A/P use the capitals. Offsets are from the slot's
// top left; the watch mirrors this in zone_strip (zone_column.c).
export const ZONE_STRIP = Object.freeze({height: 16, baseline: 13, glyphY: 9, compactBaseline: 11, compactGlyphY: 7, glyph: 5, width: 200, edge: 2});
export function zoneStripEntry({label, hour, minute, clock24, delta = 0, stale = false}) {
  // 12-hour hours drop their leading zero here, to leave the labels room.
  const two = n => String(n).padStart(2, '0'), h = clock24 ? two(hour) : String(hour % 12 || 12);
  return {label: label.toUpperCase().slice(0, 7), time: h + ':' + two(minute), suffix: clock24 ? '' : hour < 12 ? 'A' : 'P', day: stale ? '?' : delta ? (delta > 0 ? '+' : '') + delta : ''};
}
export function zoneStrip(entries, measure, compact = false) {
  const {glyph, width, edge} = ZONE_STRIP;
  const timeWidth = compact ? measure : tallWidth;
  // Advances: glyph and 2, label and 2, the time, A/P, then 1 and the day offset.
  const size = (e, label) => glyph + 2 + (label ? measure(label) + 2 : 0) + timeWidth(e.time) + (e.suffix ? measure(e.suffix) : 0) + (e.day ? 1 + measure(e.day) : 0) - 1;
  let labels = entries.map(e => e.label);
  const total = () => entries.reduce((n, e, i) => n + size(e, labels[i]), 0);
  // At least 4 pixels between places and `edge` at each side.
  const fits = () => total() + 4 * (entries.length - 1) <= width - 2 * edge;
  if (!fits()) labels = labels.map(l => l.slice(0, 3));
  if (!fits()) labels = labels.map(() => '');
  const free = width - total(), gap = Math.floor(free / (entries.length + 1));
  let x = gap + ((free - gap * (entries.length + 1)) >> 1);
  return entries.map((e, i) => {
    const label = labels[i], labelX = x + glyph + 2, timeX = labelX + (label ? measure(label) + 2 : 0), suffixX = timeX + timeWidth(e.time), dayX = suffixX + (e.suffix ? measure(e.suffix) : 0) + 1;
    const item = {...e, label, glyphX: x + (glyph >> 1), labelX, timeX, suffixX, dayX};
    x += size(e, label) + gap;
    return item;
  });
}
