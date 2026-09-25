// Place times on the map: tiny 3×5, 3×6 or 3×7 pixel figures, placed in the nearest
// open gap of the unfolded net and joined to the place's glyph by an outlined
// leader of flat and 45° runs with sharp corners. The watch runs the same
// steps in watchface/src/c/map_times.c; tests compare the two.
// Three sizes of figure, chosen in the settings (Map time size): 3×5, 3×6
// (the default) and 3×7. They share widths, so a label's template fits any.
export const MAP_TIME_SMALL = 0, MAP_TIME_MEDIUM = 1, MAP_TIME_LARGE = 2;
export const MAP_TIME_SIZES = ['small', 'medium', 'large'];
export const TINY_FONTS = Object.freeze([
  {height: 5, glyphs: Object.freeze({
  '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'], '3': ['###', '..#', '.##', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'], '7': ['###', '..#', '..#', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '###'],
  ':': ['.', '#', '.', '#', '.'], 'A': ['.#.', '#.#', '###', '#.#', '#.#'], 'P': ['##.', '#.#', '##.', '#..', '#..'],
  '+': ['...', '.#.', '###', '.#.', '...'], '-': ['...', '...', '###', '...', '...'], '?': ['##.', '..#', '.#.', '...', '.#.'], ' ': ['.', '.', '.', '.', '.']
})},
  {height: 6, glyphs: Object.freeze({
  '0': ['###', '#.#', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '..#', '###', '#..', '###'], '3': ['###', '..#', '.##', '..#', '..#', '###'],
  '4': ['#.#', '#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '###', '..#', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '#.#', '###'], '7': ['###', '..#', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '#.#', '###'], '9': ['###', '#.#', '#.#', '###', '..#', '###'],
  ':': ['.', '#', '.', '.', '#', '.'], 'A': ['.#.', '#.#', '#.#', '###', '#.#', '#.#'],
  'P': ['##.', '#.#', '#.#', '##.', '#..', '#..'], '+': ['...', '.#.', '###', '.#.', '...', '...'],
  '-': ['...', '...', '###', '...', '...', '...'], '?': ['##.', '..#', '..#', '.#.', '...', '.#.'],
  ' ': ['.', '.', '.', '.', '.', '.']
})},
  {height: 7, glyphs: Object.freeze({
    '0': ['.#.', '#.#', '#.#', '#.#', '#.#', '#.#', '.#.'], '1': ['.#.', '##.', '.#.', '.#.', '.#.', '.#.', '.#.'],
    '2': ['.#.', '#.#', '..#', '..#', '.#.', '#..', '###'], '3': ['##.', '..#', '..#', '.#.', '..#', '..#', '##.'],
    '4': ['#.#', '#.#', '#.#', '###', '..#', '..#', '..#'], '5': ['###', '#..', '#..', '##.', '..#', '..#', '##.'],
    '6': ['.##', '#..', '#..', '##.', '#.#', '#.#', '.#.'], '7': ['###', '..#', '..#', '.#.', '.#.', '.#.', '.#.'],
    '8': ['.#.', '#.#', '#.#', '.#.', '#.#', '#.#', '.#.'], '9': ['.#.', '#.#', '#.#', '.##', '..#', '..#', '##.'],
    ':': ['.', '.', '#', '.', '#', '.', '.'], 'A': ['.#.', '#.#', '#.#', '###', '#.#', '#.#', '#.#'],
    'P': ['##.', '#.#', '#.#', '##.', '#..', '#..', '#..'], '+': ['...', '...', '.#.', '###', '.#.', '...', '...'],
    '-': ['...', '...', '...', '###', '...', '...', '...'], '?': ['##.', '..#', '..#', '.#.', '.#.', '...', '.#.'],
    ' ': ['.', '.', '.', '.', '.', '.', '.']
  })}
]);
export const TINY_GLYPHS = TINY_FONTS[MAP_TIME_MEDIUM].glyphs, TINY_HEIGHT = TINY_FONTS[MAP_TIME_MEDIUM].height;
export const TINY_CHARS = '0123456789:AP+-? ';
export const MAP_TIME_ORIENTATIONS = ['horizontal', 'turn'];
const H = 0, V = 1, HALO = 3, MARGIN = 1, TURN_PENALTY = 20, TIME_GLYPHS = 5;
export const tinyWidth = (text, size = MAP_TIME_MEDIUM) => [...text].reduce((w, c, i) => w + TINY_FONTS[size].glyphs[c][0].length + (i ? 1 : 0), 0);
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
export function tinyLayout(text, orientation, total, size = MAP_TIME_MEDIUM) {
  total ??= tinyWidth(text, size);
  const glyphs = [], {height, glyphs: set} = TINY_FONTS[size];let x = 0;
  for (const c of text) {
    const g = set[c], w = g[0].length;
    glyphs.push(orientation === V ? {x: 0, y: total - x - w, w: height, h: w, c} : {x, y: 0, w, h: height, c});
    x += w + 1;
  }
  return glyphs;
}
export function tinyPixels(text, orientation, total, size = MAP_TIME_MEDIUM) {
  total ??= tinyWidth(text, size);
  const out = [];
  for (const g of tinyLayout(text, orientation, total, size)) {
    const rows = TINY_FONTS[size].glyphs[g.c], w = rows[0].length;
    rows.forEach((row, py) => [...row].forEach((p, px) => { if (p === '#') out.push(orientation === V ? [g.x + py, g.y + w - 1 - px] : [g.x + px, g.y + py]); }));
  }
  return out;
}
// Leaders meet square and centred. They leave the glyph straight out from
// the middle of a side (4 pixels from its centre, just past the clearing) and
// arrive straight on, one pixel short of the time, at a port: the middle row
// of the label's first or last figure end, or the centre column of one of the
// time's figures from above or below (turned labels rotate these). Between the
// two ends the route runs straight, then 45°, then straight, with at least one
// straight pixel leaving the glyph and two arriving (five into an end, where
// a shorter run would read as a minus sign).
export const EXITS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const EXIT_DISTANCE = HALO + 1;
// Where leaders attach: the label's middle row, and a figure's centre column.
const centre = w => (w - 1) >> 1;
function ports(text, orientation, total, x, y, size) {
  const glyphs = tinyLayout(text, orientation, total, size), out = [], timeOnly = text.length === TIME_GLYPHS;
  const height = TINY_FONTS[size].height, MID = centre(height);
  const last = glyphs[TIME_GLYPHS - 1];
  if (orientation === H) {
    out.push({p: [x - 2, y + MID], d: [1, 0], end: true});
    if (timeOnly) out.push({p: [x + last.x + last.w + 1, y + MID], d: [-1, 0], end: true});
    glyphs.slice(0, TIME_GLYPHS).forEach(g => { if (g.c === ':') return; out.push({p: [x + g.x + centre(g.w), y - 2], d: [0, 1]}, {p: [x + g.x + centre(g.w), y + height + 1], d: [0, -1]}); });
  } else {
    out.push({p: [x + MID, y + glyphs[0].y + glyphs[0].h + 1], d: [0, -1], end: true});
    if (timeOnly) out.push({p: [x + MID, y + last.y - 2], d: [0, 1], end: true});
    glyphs.slice(0, TIME_GLYPHS).forEach(g => { if (g.c === ':') return; out.push({p: [x - 2, y + g.y + centre(g.h)], d: [1, 0]}, {p: [x + height + 1, y + g.y + centre(g.h)], d: [-1, 0]}); });
  }
  return out;
}
// The route's corner points from the glyph centre c through exit direction e
// to port p arriving in direction d, or null when no such route exists.
// Cost: 5 per straight pixel, 7 per diagonal one.
export function leaderRoute([cx, cy], e, {p: [px, py], d, end = false}) {
  const ex = cx + e[0] * EXIT_DISTANCE, ey = cy + e[1] * EXIT_DISTANCE, X = px - ex, Y = py - ey, arrive = end ? 5 : 2;
  const dot = (v, w) => v[0] * w[0] + v[1] * w[1];
  if (e[0] === d[0] && e[1] === d[1]) {
    const along = dot([X, Y], e), perp = e[0] ? Y : X, n = Math.abs(perp);
    if (along < n + 1 + arrive) return null;
    const s = Math.sign(perp), k1 = [ex + e[0], ey + e[1]], k2 = [k1[0] + (e[0] || s) * n, k1[1] + (e[1] || s) * n];
    return {points: [[cx, cy], [ex, ey], k1, k2, [px, py]], cost: 5 * (EXIT_DISTANCE + along - n) + 7 * n};
  }
  if (e[0] === -d[0] && e[1] === -d[1]) return null;
  const U = dot([X, Y], e), W = dot([X, Y], d);
  if (U < 1 || W < arrive) return null;
  const n = Math.min(U - 1, W - arrive), k1 = [ex + e[0] * (U - n), ey + e[1] * (U - n)], k2 = [k1[0] + (e[0] + d[0]) * n, k1[1] + (e[1] + d[1]) * n];
  return {points: [[cx, cy], [ex, ey], k1, k2, [px, py]], cost: 5 * (EXIT_DISTANCE + U + W - 2 * n) + 7 * n};
}
// Pixels along a route's corner points, each once.
export function routePixels(points) {
  const out = [points[0].slice()];
  for (let i = 1; i < points.length; i++) {
    let [x, y] = points[i - 1];const [tx, ty] = points[i], sx = Math.sign(tx - x), sy = Math.sign(ty - y);
    while (x !== tx || y !== ty) { x += sx; y += sy; out.push([x, y]); }
  }
  return out;
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
function placeOne(p, taken, blocked, width, height, turn, markers, size) {
  const mark = (x, y) => { if (x >= 0 && y >= 0 && x < width && y < height) taken[y * width + x] = 1; };
  const open = (x, y) => x >= 0 && y >= 0 && x < width && y < height && !taken[y * width + x] && !blocked(x, y);
  let best = null;
  for (const orientation of turn ? [H, V] : [H]) {
    const total = tinyWidth(p.template, size), glyphs = tinyLayout(p.template, orientation, total, size);
    const bw = Math.max(...glyphs.map(g => g.x + g.w)), bh = Math.max(...glyphs.map(g => g.y + g.h));
    const xs = outward(p.x - (bw >> 1), MARGIN, width - MARGIN - bw), ys = outward(p.y - (bh >> 1), MARGIN, height - MARGIN - bh);
    const penalty = orientation === V ? TURN_PENALTY : 0;
    // No route costs less than 5 per pixel of distance on either axis.
    const gap = (c, lo, hi) => c < lo ? lo - c : c > hi ? c - hi : 0;
    for (const y of ys) {
      const dyMin = gap(p.y, y - 2, y + bh + 1);
      if (best && 5 * dyMin + penalty >= best.cost) continue;
      for (const x of xs) {
        if (best && 5 * Math.max(dyMin, gap(p.x, x - 2, x + bw + 1)) + penalty >= best.cost) continue;
        let fits = true;
        for (const g of glyphs) {
          for (let yy = y + g.y - MARGIN; fits && yy < y + g.y + g.h + MARGIN; yy++) for (let xx = x + g.x - MARGIN; xx < x + g.x + g.w + MARGIN; xx++) if (!open(xx, yy)) { fits = false; break; }
          if (!fits) break;
        }
        if (!fits) continue;
        // Candidate routes, cheapest first (exits, then ports, in order on ties).
        const routes = [];
        for (const e of EXITS) for (const port of ports(p.template, orientation, total, x, y, size)) {
          const r = leaderRoute([p.x, p.y], e, port);
          if (r) routes.push(r);
        }
        if (!routes.length) continue;
        routes.sort((a, b) => a.cost - b.cost);
        if (best && routes[0].cost + penalty >= best.cost) continue;
        const own = (px, py) => glyphs.some(g => px >= x + g.x - MARGIN && px < x + g.x + g.w + MARGIN && py >= y + g.y - MARGIN && py < y + g.y + g.h + MARGIN);
        // Inside its own clearing (or group hull) a leader only has to miss the
        // other glyphs and the pixel around them; beyond it, anything taken.
        const {x0, y0, x1, y1} = p.own ?? {x0: p.x - HALO, y0: p.y - HALO, x1: p.x + HALO, y1: p.y + HALO};
        const sibling = (px, py) => markers.some(m => (m.x !== p.x || m.y !== p.y) && Math.max(Math.abs(px - m.x), Math.abs(py - m.y)) <= m.half + 1);
        for (const r of routes) {
          if (best && r.cost + penalty >= best.cost) break;
          const ok = routePixels(r.points).every(([px, py]) => px >= x0 && px <= x1 && py >= y0 && py <= y1 ? !sibling(px, py) :
            (px >= 0 && py >= 0 && px < width && py < height && !taken[py * width + px] && !own(px, py)));
          if (ok) { best = {cost: r.cost + penalty, orientation, x, y, points: r.points}; break; }
        }
      }
    }
  }
  if (!best) return null;
  for (const g of tinyLayout(p.template, best.orientation, tinyWidth(p.template, size), size))
    for (let yy = best.y + g.y - MARGIN; yy < best.y + g.y + g.h + MARGIN; yy++) for (let xx = best.x + g.x - MARGIN; xx < best.x + g.x + g.w + MARGIN; xx++) mark(xx, yy);
  for (const [px, py] of routePixels(best.points)) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) mark(px + dx, py + dy);
  return {...best, template: p.template, total: tinyWidth(p.template, size), size};
}
// Every order of the places is tried (at most six); the arrangement with the
// lowest total cost wins, a missing label costing 10000, first order on ties.
// `blocked(x, y)` is true where the map covers the block; `places` are
// {x, y, template, own?} or null, where `own` is the rectangle a place's
// leader may cross freely (its clearing, or its group's hull; default the
// clearing). `obstacles` are rectangles {x0, y0, x1, y1} to keep clear of (your
// location's clearing, group hulls) and `markers` every glyph {x, y, half},
// which leaders crossing a hull must miss.
export const MAP_TIME_ORDERS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
// `size` is MAP_TIME_SMALL, MAP_TIME_MEDIUM or MAP_TIME_LARGE; every label
// uses it, going wherever it fits.
export function placeMapTimes(places, blocked, width, height, {size = MAP_TIME_MEDIUM, ...options} = {}) {
  return arrange(places, blocked, width, height, options, size);
}
function arrange(places, blocked, width, height, {turn = false, obstacles = [], markers = []}, size) {
  let best = null;
  for (const order of MAP_TIME_ORDERS) {
    const taken = new Uint8Array(width * height), result = [null, null, null];
    const clear = ({x0, y0, x1, y1}) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < width && y < height) taken[y * width + x] = 1; };
    for (const p of places) if (p) clear({x0: p.x - HALO, y0: p.y - HALO, x1: p.x + HALO, y1: p.y + HALO});
    for (const o of obstacles) clear(o);
    let total = 0;
    // An order already costing at least the best so far cannot win.
    for (const i of order) if (places[i] && (!best || total < best.total)) { result[i] = placeOne(places[i], taken, blocked, width, height, turn, markers, size); total += result[i] ? result[i].cost : 10000; }
    if (!best || total < best.total) best = {total, result};
  }
  return best.result.slice(0, places.length);
}
