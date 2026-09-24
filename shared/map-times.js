// Place times on the map: a tiny 3×5 pixel figure set, placed in the nearest
// open gap of the unfolded net and joined to the place's glyph by an outlined
// leader of flat and 45° runs with sharp corners. The watch runs the same
// steps in watchface/src/c/map_times.c; tests compare the two.
export const TINY_HEIGHT = 5;
export const TINY_GLYPHS = Object.freeze({
  '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'], '3': ['###', '..#', '.##', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'], '7': ['###', '..#', '..#', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '###'],
  ':': ['.', '#', '.', '#', '.'], 'A': ['.#.', '#.#', '###', '#.#', '#.#'], 'P': ['##.', '#.#', '##.', '#..', '#..'],
  '+': ['...', '.#.', '###', '.#.', '...'], '-': ['...', '...', '###', '...', '...'], '?': ['##.', '..#', '.#.', '...', '.#.'], ' ': ['.', '.', '.', '.', '.']
});
export const TINY_CHARS = '0123456789:AP+-? ';
export const MAP_TIME_ORIENTATIONS = ['horizontal', 'turn'];
const H = 0, V = 1, HALO = 3, MARGIN = 1, TURN_PENALTY = 20, TIME_GLYPHS = 5;
export const tinyWidth = text => [...text].reduce((w, c, i) => w + TINY_GLYPHS[c][0].length + (i ? 1 : 0), 0);
// The text a place shows, and the widest it can get (its placement template):
// HH:MM, A/P in 12-hour time, and a day offset when its offset differs from
// the watch's, so the label never outgrows its gap.
export function mapTimeText({hour, minute, clock24, delta = 0, stale = false}) {
  const two = n => String(n).padStart(2, '0'), h = clock24 ? hour : hour % 12 || 12;
  const day = stale ? '?' : delta ? (delta > 0 ? '+' : '-') + Math.min(9, Math.abs(delta)) : '';
  return two(h) + ':' + two(minute) + (clock24 ? '' : hour < 12 ? 'A' : 'P') + (day ? ' ' + day : '');
}
export const mapTimeTemplate = (clock24, reserveDay) => '00:00' + (clock24 ? '' : 'P') + (reserveDay ? ' +1' : '');
// Glyph boxes relative to the label origin. Turned labels read bottom to top;
// `total` (the template's width) keeps the first figure in place when the text
// is shorter than its template.
export function tinyLayout(text, orientation, total = tinyWidth(text)) {
  const glyphs = [];let x = 0;
  for (const c of text) {
    const g = TINY_GLYPHS[c], w = g[0].length;
    glyphs.push(orientation === V ? {x: 0, y: total - x - w, w: TINY_HEIGHT, h: w, c} : {x, y: 0, w, h: TINY_HEIGHT, c});
    x += w + 1;
  }
  return glyphs;
}
export function tinyPixels(text, orientation, total = tinyWidth(text)) {
  const out = [];
  for (const g of tinyLayout(text, orientation, total)) {
    const rows = TINY_GLYPHS[g.c], w = rows[0].length;
    rows.forEach((row, py) => [...row].forEach((p, px) => { if (p === '#') out.push(orientation === V ? [g.x + py, g.y + w - 1 - px] : [g.x + px, g.y + py]); }));
  }
  return out;
}
// Octilinear path from a to b: the 45° run first, then the flat one, or the
// reverse. Pixels, inclusive of both ends.
export function leaderPath([ax, ay], [bx, by], diagonalFirst = true) {
  const dx = Math.sign(bx - ax), dy = Math.sign(by - ay), adx = Math.abs(bx - ax), ady = Math.abs(by - ay), diag = Math.min(adx, ady);
  const pts = [[ax, ay]];let x = ax, y = ay;
  const step = (sx, sy, n) => { for (let i = 0; i < n; i++) { x += sx; y += sy; pts.push([x, y]); } };
  const flat = adx > ady ? [dx, 0, adx - diag] : [0, dy, ady - diag];
  if (diagonalFirst) { step(dx, dy, diag); step(...flat); } else { step(...flat); step(dx, dy, diag); }
  return pts;
}
// Offsets tried outward from a centre: c, c-1, c+1, c-2, c+2, ... within [lo, hi].
export function outward(c, lo, hi) {
  const out = [];
  if (hi < lo) return out;
  c = Math.max(lo, Math.min(hi, c));
  for (let k = 0; out.length < hi - lo + 1; k++) { if (c - k >= lo && k) out.push(c - k); if (c + k <= hi) out.push(c + k); }
  return out;
}
// Places one label against `taken`. Candidates are tried horizontal first,
// rows then columns outward from the glyph; the cheapest (5 × the longer
// leader leg plus 2 × the shorter, plus 20 for a turned label) wins, first
// found on ties. Returns the placement or null, and marks it taken.
function placeOne(p, taken, blocked, width, height, turn) {
  const mark = (x, y) => { if (x >= 0 && y >= 0 && x < width && y < height) taken[y * width + x] = 1; };
  const open = (x, y) => x >= 0 && y >= 0 && x < width && y < height && !taken[y * width + x] && !blocked(x, y);
  const clear = (x, y) => x >= 0 && y >= 0 && x < width && y < height && !taken[y * width + x];
  let best = null;
  for (const orientation of turn ? [H, V] : [H]) {
    const glyphs = tinyLayout(p.template, orientation), bw = Math.max(...glyphs.map(g => g.x + g.w)), bh = Math.max(...glyphs.map(g => g.y + g.h));
    const xs = outward(p.x - (bw >> 1), MARGIN, width - MARGIN - bw), ys = outward(p.y - (bh >> 1), MARGIN, height - MARGIN - bh);
    const penalty = orientation === V ? TURN_PENALTY : 0;
    // No candidate can cost less than 5 × its distance on either axis.
    const gap = (c, lo, hi) => c < lo ? lo - c : c > hi ? c - hi : 0;
    for (const y of ys) {
      const dyMin = gap(p.y, y - MARGIN, y + bh + MARGIN - 1);
      if (best && 5 * dyMin + penalty >= best.cost) continue;
      for (const x of xs) {
      if (best && 5 * Math.max(dyMin, gap(p.x, x - MARGIN, x + bw + MARGIN - 1)) + penalty >= best.cost) continue;
      let cost = Infinity, anchor = null;
      for (let i = 0; i < Math.min(TIME_GLYPHS, glyphs.length); i++) {
        const g = glyphs[i], bx = x + g.x - MARGIN, by = y + g.y - MARGIN;
        const ax = Math.max(bx, Math.min(bx + g.w + 1, p.x)), ay = Math.max(by, Math.min(by + g.h + 1, p.y));
        const dx = Math.abs(ax - p.x), dy = Math.abs(ay - p.y), c = 5 * Math.max(dx, dy) + 2 * Math.min(dx, dy);
        if (c < cost) { cost = c; anchor = [ax, ay]; }
      }
      cost += penalty;
      if (best && cost >= best.cost) continue;
      let fits = true;
      for (const g of glyphs) {
        for (let yy = y + g.y - MARGIN; fits && yy < y + g.y + g.h + MARGIN; yy++) for (let xx = x + g.x - MARGIN; xx < x + g.x + g.w + MARGIN; xx++) if (!open(xx, yy)) { fits = false; break; }
        if (!fits) break;
      }
      if (!fits) continue;
      for (const diagonalFirst of [true, false]) {
        const path = leaderPath([p.x, p.y], anchor, diagonalFirst);
        if (path.every(([px, py]) => Math.max(Math.abs(px - p.x), Math.abs(py - p.y)) <= HALO || clear(px, py))) { best = {cost, orientation, x, y, anchor, diagonalFirst}; break; }
      }
      }
    }
  }
  if (!best) return null;
  for (const g of tinyLayout(p.template, best.orientation))
    for (let yy = best.y + g.y - MARGIN; yy < best.y + g.y + g.h + MARGIN; yy++) for (let xx = best.x + g.x - MARGIN; xx < best.x + g.x + g.w + MARGIN; xx++) mark(xx, yy);
  for (const [px, py] of leaderPath([p.x, p.y], best.anchor, best.diagonalFirst)) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) mark(px + dx, py + dy);
  return {...best, template: p.template, total: tinyWidth(p.template)};
}
// Every order of the places is tried (at most six); the arrangement with the
// lowest total cost wins, a missing label costing 10000, first order on ties.
// `blocked(x, y)` is true where the map covers the block; `places` are
// {x, y, template} or null.
export const MAP_TIME_ORDERS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
export function placeMapTimes(places, blocked, width, height, {turn = false} = {}) {
  let best = null;
  for (const order of MAP_TIME_ORDERS) {
    const taken = new Uint8Array(width * height), result = [null, null, null];
    for (const p of places) if (p) for (let dy = -HALO; dy <= HALO; dy++) for (let dx = -HALO; dx <= HALO; dx++) {
      const x = p.x + dx, y = p.y + dy;if (x >= 0 && y >= 0 && x < width && y < height) taken[y * width + x] = 1;
    }
    let total = 0;
    // An order already costing at least the best so far cannot win.
    for (const i of order) if (places[i] && (!best || total < best.total)) { result[i] = placeOne(places[i], taken, blocked, width, height, turn); total += result[i] ? result[i].cost : 10000; }
    if (!best || total < best.total) best = {total, result};
  }
  return best.result.slice(0, places.length);
}
