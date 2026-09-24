// Backgrounds behind the map: edge to edge across the 200-pixel strip, from the
// top of the unfolded net to its bottom, drawn only where the net leaves the map
// block empty. The map bitmap carries each as a spare flag bit
// (tools/generate-map.mjs), so the watch spends no extra memory.
import {buildNetFuller,V} from './map.js';
// Byte 3 of the display packet indexes this list.
export const MAP_BACKGROUNDS = ['none', 'points', 'lines', 'fine-points', 'folds'];
export const MAP_BACKGROUND_NAMES = Object.freeze({none: 'None', points: 'Triangle points', lines: 'Triangle lines', 'fine-points': 'Fine triangle points', folds: 'Fold tabs'});
// Each pattern: how many times the map's faces are split into four, and whether
// edges are dotted or only the vertices marked.
export const GRID_PATTERNS = Object.freeze({points: {splits: 1, lines: false}, lines: {splits: 1, lines: true}, 'fine-points': {splits: 2, lines: false}});
// Flag bit in map-0.bin byte 3 for each background (after kind 0-1 and edge 2):
// background n uses bit 4 << n.
export const BACKGROUND_BITS = Object.freeze(Object.fromEntries(MAP_BACKGROUNDS.map((id, n) => [id, n ? 4 << n : 0])));
// Line dots are about this many pixels apart, always including both corners.
export const GRID_DOT_SPACING = 3;
const S3 = Math.sqrt(3);

// Rows the net covers: the strip runs from its top edge to its bottom edge.
export function netRows(map) {
  let top = map.height, bottom = -1;
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++)
    if (map.inverse(x + .5, y + .5)) { top = Math.min(top, y); bottom = Math.max(bottom, y); break; }
  return [top, bottom];
}
// The net's faces are unit triangles on one equilateral lattice. Split each into
// four through its edge midpoints (edge 1/2; twice for 'fine-points', edge 1/4)
// and continue that finer lattice across the strip. The point patterns mark
// every vertex where its triangles meet; 'lines' samples every edge as evenly
// spaced dots.
export function triangleGridMask(map, pattern = 'points', rows = netRows(map)) {
  const spec = GRID_PATTERNS[pattern];
  if (!spec) throw new Error('Unknown map background.');
  const {width, height, toPixel} = map, mask = new Uint8Array(width * height), [top, bottom] = rows;
  const origin = buildNetFuller()[0].p[0], edge = 2 ** -spec.splits, row = edge * S3 / 2;
  const lattice = ([x, y]) => { const j = (y - origin[1]) / row; return [(x - origin[0]) / edge - j / 2, j]; };
  // Every net vertex must sit on the finer lattice, so the grid meets the map's corners.
  for (const t of buildNetFuller()) for (const p of t.p) {
    const [i, j] = lattice(p);
    if (Math.abs(i - Math.round(i)) > 1e-9 || Math.abs(j - Math.round(j)) > 1e-9) throw new Error('The net is not on one lattice.');
  }
  const vertex = (i, j) => [origin[0] + (i + j / 2) * edge, origin[1] + j * row];
  const o = toPixel([0, 0]), ex = toPixel([1, 0])[0] - o[0], ey = toPixel([0, 1])[1] - o[1];
  const netOf = (x, y) => [(x - o[0]) / ex, (y - o[1]) / ey];
  const steps = !spec.lines ? 0 : Math.max(1, Math.round(Math.abs(ex) * edge / GRID_DOT_SPACING));
  const corners = [[0, 0], [width, 0], [0, height], [width, height]].map(([x, y]) => lattice(netOf(x, y)));
  const js = corners.map(c => c[1]), is = corners.map(c => c[0]);
  const j0 = Math.floor(Math.min(...js)) - 2, j1 = Math.ceil(Math.max(...js)) + 2;
  const i0 = Math.floor(Math.min(...is)) - j1 - 2, i1 = Math.ceil(Math.max(...is)) - j0 + 2;
  // Nudge by a hair so points exactly on a pixel boundary land consistently.
  // Lattice lines along the net's top and bottom edges fall a hair outside its
  // rows; within half a pixel they snap onto the strip's edge rows.
  const plot = ([x, y]) => {
    const px = Math.floor(x + 1e-7);let py = Math.floor(y + 1e-7);
    if (py < top && y >= top - .5) py = top;
    if (py > bottom && y < bottom + 1.5) py = bottom;
    if (px >= 0 && px < width && py >= top && py <= bottom) mask[py * width + px] = 1;
  };
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const a = toPixel(vertex(i, j));
    if (!steps) { plot(a); continue; }
    for (const b of [vertex(i + 1, j), vertex(i, j + 1), vertex(i - 1, j + 1)].map(toPixel))
      for (let s = 0; s <= steps; s++) plot([0, 1].map(k => a[k] + (b[k] - a[k]) * s / steps));
  }
  return mask;
}

// Fold tabs: the Dymaxion map was published as a sheet to cut out and fold
// into an icosahedron. Like a paper model, each pair of free edges that glue
// together gets one dashed tab on its first edge, facing into the open ground.
export const FOLD_TAB = Object.freeze({height: 4, inset: 4, offset: .8, dash: 1});
const WEIGHTS = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [.5, .5, 0], [0, .5, .5], [.5, 0, .5], [1 / 3, 1 / 3, 1 / 3]];
const SIXTHS = {1: [0, 3, 6], 2: [1, 3, 6], 3: [1, 4, 6], 4: [2, 4, 6], 5: [2, 5, 6], 6: [0, 5, 6]};
// The net's free edges: each placement as its six LCD sixths (a split face keeps
// only its selected ones); sixth edges used once are outline, merged per placement.
export function netFreeEdges() {
  const key = p => p.map(v => v.toFixed(6)).join(','), edges = new Map();
  buildNetFuller().forEach((t, placement) => {
    for (const l of t.lcd ?? [1, 2, 3, 4, 5, 6]) {
      const ws = SIXTHS[l].map(i => WEIGHTS[i]), mix = (w, pts, n) => Array.from({length: n}, (_, c) => w.reduce((s, v, j) => s + v * pts[j][c], 0));
      const flat = ws.map(w => mix(w, t.p, 2)), solid = ws.map(w => mix(w, t.f.map(i => V[i]), 3));
      for (let a = 0; a < 3; a++) {
        const b = (a + 1) % 3, k = [key(flat[a]), key(flat[b])].sort().join('|');
        edges.set(k, {p: flat[a], q: flat[b], P: solid[a], Q: solid[b], placement, uses: (edges.get(k)?.uses ?? 0) + 1});
      }
    }
  });
  const segments = [...edges.values()].filter(e => e.uses === 1);
  for (let merged = true; merged;) {
    merged = false;
    search: for (let i = 0; i < segments.length; i++) for (let j = i + 1; j < segments.length; j++) {
      const a = segments[i], b = segments[j];
      if (a.placement !== b.placement) continue;
      for (const [x, y] of [['p', 'p'], ['p', 'q'], ['q', 'p'], ['q', 'q']]) {
        if (key(a[x]) !== key(b[y])) continue;
        const ax = x === 'p' ? 'q' : 'p', bx = y === 'p' ? 'q' : 'p';
        const cross = (a[ax][0] - a[x][0]) * (b[bx][1] - a[x][1]) - (a[ax][1] - a[x][1]) * (b[bx][0] - a[x][0]);
        if (Math.abs(cross) > 1e-9) continue;
        segments[i] = {p: a[ax], q: b[bx], P: a[ax.toUpperCase()], Q: b[bx.toUpperCase()], placement: a.placement};
        segments.splice(j, 1);merged = true;break search;
      }
    }
  }
  // Pieces over the same stretch of the icosahedron glue together; the first gets the tab.
  const k3 = v => v.map(x => x.toFixed(4)).join(','), seen = new Set();
  for (const s of segments) { const k = [k3(s.P), k3(s.Q)].sort().join('|'); s.tab = !seen.has(k); seen.add(k); }
  return segments;
}
export function foldTabMask(map, rows = netRows(map), tab = FOLD_TAB) {
  const {width, height, toPixel} = map, mask = new Uint8Array(width * height), [top, bottom] = rows;
  const onNet = ([x, y]) => !!map.inverse(x, y);
  const plot = (x, y) => { const px = Math.floor(x), py = Math.floor(y); if (px >= 0 && px < width && py >= top && py <= bottom) mask[py * width + px] = 1; };
  const line = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let t = 0; t <= L; t += .5) if (Math.floor(t / tab.dash) % 2 === 0) plot(a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L); };
  for (const s of netFreeEdges()) {
    if (!s.tab) continue;
    const A = toPixel(s.p), B = toPixel(s.q), L = Math.hypot(B[0] - A[0], B[1] - A[1]), u = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
    let n = [-u[1], u[0]];
    if (onNet([(A[0] + B[0]) / 2 + n[0] * 2, (A[1] + B[1]) / 2 + n[1] * 2])) n = n.map(v => -v);
    const at = (p, along, out) => [p[0] + u[0] * along + n[0] * out, p[1] + u[1] * along + n[1] * out], inset = Math.min(tab.inset, L / 3);
    const a0 = at(A, 0, tab.offset), b0 = at(B, 0, tab.offset), a1 = at(A, inset, tab.offset + tab.height), b1 = at(B, -inset, tab.offset + tab.height);
    line(a0, a1);line(a1, b1);line(b1, b0);
  }
  return mask;
}
// The mask for any background id.
export function backgroundMask(map, id, rows = netRows(map)) {
  return id === 'folds' ? foldTabMask(map, rows) : triangleGridMask(map, id, rows);
}
