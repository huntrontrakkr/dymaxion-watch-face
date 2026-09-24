// Backgrounds behind the map: edge to edge across the 200-pixel strip, from the
// top of the unfolded net to its bottom, drawn only where the net leaves the map
// block empty. The map bitmap carries each as a spare flag bit
// (tools/generate-map.mjs), so the watch spends no extra memory.
import {buildNetFuller} from './map.js';
// Byte 3 of the display packet indexes this list.
export const MAP_BACKGROUNDS = ['none', 'points', 'lines', 'fine-points'];
export const MAP_BACKGROUND_NAMES = Object.freeze({none: 'None', points: 'Triangle points', lines: 'Triangle lines', 'fine-points': 'Fine triangle points'});
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
