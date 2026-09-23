// Chamfer clock figures: the Draft zone numerals, enlarged three times with
// every exposed pixel corner cut on a clean 45-degree line and every inside
// step filled on the same diagonal. The big clock and the zone clocks are one
// drawing at two sizes. Figures sit in fixed tabular cells so the minute flip
// can reuse its lattice unchanged.
import pixelMasters from '../assets/type/chamfer-clock.json' with {type: 'json'};
import {equilateralGrid} from './broad-numerals.js';

export const CHAMFER_SCALE = 3;
export const CHAMFER_METRICS = Object.freeze({
  width: 200, height: 40, capHeight: 36, capTop: 2, digitWidth: 27,
  starts: Object.freeze([37, 67, 106, 136]), colonX: 97, colonWidth: 6,
  colonTops: Object.freeze([11, 26]), pitch: 9
});
const {width, height, capHeight, capTop, digitWidth, starts, colonX, colonWidth, colonTops} = CHAMFER_METRICS;
const index = (x, y) => y * width + x;

// Authoring only: zone master rows ('#' ink) -> enlarged mask with 45° cuts.
// Pure geometry: each cell is a square polygon, sampled at 8x8 per pixel.
export function chamferMaster(rows, k = CHAMFER_SCALE, SS = 8) {
  const H = rows.length, W = rows[0].length, ink = (x, y) => y >= 0 && y < H && x >= 0 && x < W && rows[y][x] === '#';
  const polys = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const x0 = x * k, x1 = x0 + k, y0 = y * k, y1 = y0 + k, mx = x0 + k / 2, my = y0 + k / 2;
    const up = ink(x, y - 1), dn = ink(x, y + 1), lf = ink(x - 1, y), rt = ink(x + 1, y);
    if (ink(x, y)) {
      // An exposed corner (both neighbours empty) is replaced by its two edge midpoints.
      const poly = [];
      for (const [corner, a, b, cut] of [[[x0, y0], up, lf, [[x0, my], [mx, y0]]], [[x1, y0], up, rt, [[mx, y0], [x1, my]]],
        [[x1, y1], dn, rt, [[x1, my], [mx, y1]]], [[x0, y1], dn, lf, [[mx, y1], [x0, my]]]]) poly.push(...(!a && !b ? cut : [corner]));
      polys.push(poly);
    } else {
      // An inside step (both neighbours inked) gains the matching diagonal half-corner.
      if (up && lf) polys.push([[x0, y0], [mx, y0], [x0, my]]);
      if (up && rt) polys.push([[x1, y0], [x1, my], [mx, y0]]);
      if (dn && rt) polys.push([[x1, y1], [mx, y1], [x1, my]]);
      if (dn && lf) polys.push([[x0, y1], [x0, my], [mx, y1]]);
    }
  }
  const inside = (poly, px, py) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const w = W * k, h = H * k, mask = new Uint8Array(w * h);
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    let n = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const X = px + (sx + .5) / SS, Y = py + (sy + .5) / SS;
      if (polys.some(p => inside(p, X, Y))) n++;
    }
    mask[py * w + px] = n * 2 >= SS * SS ? 1 : 0;
  }
  return mask;
}

export const CHAMFER_MASK_BYTES = Math.ceil(digitWidth * capHeight / 8);
const glyphCache = new Map();
function glyphMask(character) {
  if (!glyphCache.has(character)) {
    const packed = pixelMasters[Number(character)];
    glyphCache.set(character, Uint8Array.from({length: digitWidth * capHeight}, (_, i) => (packed[i >> 3] >> (i & 7)) & 1));
  }
  return glyphCache.get(character);
}
// Colon: two 6-pixel squares with their corners cut, matching the figures.
export function colonDot(x, y) { return Math.abs(x + .5 - colonWidth / 2) + Math.abs(y + .5 - colonWidth / 2) <= colonWidth / 2 + 0.45; }
export function chamferTimeMask(time) {
  if (!/^\d{2}:\d{2}$/.test(time)) throw new Error('Use a readout such as 12:34.');
  const mask = new Uint8Array(width * height), digits = [...time.replace(':', '')];
  for (let slot = 0; slot < 4; slot++) {
    const glyph = glyphMask(digits[slot]);
    for (let y = 0; y < capHeight; y++) for (let x = 0; x < digitWidth; x++)
      if (glyph[y * digitWidth + x]) mask[index(starts[slot] + x, y + capTop)] = 1;
  }
  for (const top of colonTops) for (let y = 0; y < colonWidth; y++) for (let x = 0; x < colonWidth; x++)
    if (colonDot(x, y)) mask[index(colonX + x, top + y)] = 1;
  return mask;
}
// Nine-pixel lattice rows: the 36-pixel figures span exactly four.
let grid;
export function chamferTriangleGrid() {
  return grid ??= equilateralGrid({width, height, pitch: CHAMFER_METRICS.pitch, originX: 2, originY: capTop});
}
export function drawChamferTime(ctx, time, x = 0, y = 0, ink = '#000000') {
  const mask = chamferTimeMask(time);
  ctx.fillStyle = ink;
  for (let py = 0; py < height; py++) for (let px = 0; px < width;) {
    if (!mask[index(px, py)]) { px++; continue; }
    let end = px + 1;
    while (end < width && mask[index(end, py)]) end++;
    ctx.fillRect(x + px, y + py, end - px, 1); px = end;
  }
}
