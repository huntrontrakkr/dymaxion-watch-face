// Geodesic clock numerals: an original monoline figure set drawn for this face.
// Each figure is a centre-line skeleton stroked at one weight and sampled to
// 1-bit pixels. Bowls are true circles (the globe); every diagonal runs at
// exactly 60 degrees, the angle of the icosahedral net's triangle edges.
// Figures sit in fixed tabular cells so the readout never shifts sideways and
// the triangular minute flip can reuse its lattice unchanged.
import pixelMasters from '../assets/type/geodesic-clock.json' with {type: 'json'};
import {equilateralGrid} from './broad-numerals.js';

export const GEODESIC_METRICS = Object.freeze({
  width: 200, height: 64, capHeight: 56, capTop: 4, digitWidth: 34,
  starts: Object.freeze([17, 56, 110, 149]), colonX: 96, colonSize: 8,
  colonTops: Object.freeze([18, 38])
});
// Design space: cap height 100 units, figure width 60, stroke 14 (7.8 px).
export const GEODESIC_DESIGN = Object.freeze({s: 14, w: 60, flag: 37.2});
const {width, height, capHeight, capTop, digitWidth, starts, colonX, colonSize, colonTops} = GEODESIC_METRICS;
const T60 = Math.tan(Math.PI / 3);
const index = (x, y) => y * width + x;

// Authoring only: returns the centre-line Path2D for one figure.
export function geodesicSkeleton(ch, {s, w, flag} = GEODESIC_DESIGN, H = 100) {
  const r = s / 2, R = w / 2 - r, cx = w / 2, P = new Path2D();
  const low = [cx, H - r - R];
  switch (ch) {
    case '0': P.roundRect(r, r, w - s, H - s, (w - s) / 2); break;
    case '1': {
      const xs = w - r;
      P.moveTo(xs - flag, r + flag * T60); P.lineTo(xs, r - 0.01); P.lineTo(xs, H + s);
      break;
    }
    case '2': {
      // Upper bowl, then a straight tangent to the lower-left corner.
      const by = r + R, qx = r, qy = H - r;
      let best = 0, error = Infinity;
      for (let t = -0.2; t < Math.PI / 2; t += 0.0005) {
        const px = cx + R * Math.cos(t), py = by + R * Math.sin(t), tx = -Math.sin(t), ty = Math.cos(t);
        const e = Math.abs((qx - px) * ty - (qy - py) * tx);
        if (e < error && (qx - px) * tx + (qy - py) * ty > 0) { error = e; best = t; }
      }
      P.arc(cx, by, R, Math.PI * 0.95, best < 0 ? best + Math.PI * 2 : best);
      P.lineTo(qx, qy); P.lineTo(w + s, qy);
      break;
    }
    case '3': {
      const a = -Math.PI * 0.62;
      P.moveTo(-s, r); P.lineTo(w - r, r);
      P.lineTo(low[0] + R * Math.cos(a), low[1] + R * Math.sin(a));
      P.arc(low[0], low[1], R, a, Math.PI * 0.86);
      break;
    }
    case '4': {
      const bar = 0.7 * H, stem = r + (bar - r) / T60;
      P.moveTo(stem, -s); P.lineTo(stem, H + s);
      P.moveTo(stem, r - 0.01); P.lineTo(stem - (bar - r) / T60, bar); P.lineTo(w + s, bar);
      break;
    }
    case '5': {
      const a = -Math.PI * 0.76, jx = low[0] + R * Math.cos(a), jy = low[1] + R * Math.sin(a);
      P.moveTo(w + s, r); P.lineTo(jx, r); P.lineTo(jx, jy);
      P.arc(low[0], low[1], R, a, Math.PI * 0.86);
      break;
    }
    case '6': case '9': {
      // A full lower bowl and a spine leaving it tangentially at 60 degrees.
      const a = Math.PI * 7 / 6, px = low[0] + R * Math.cos(a), py = low[1] + R * Math.sin(a);
      const t = (py + s) / Math.sin(Math.PI / 3);
      P.arc(low[0], low[1], R, 0, Math.PI * 2);
      P.moveTo(px, py); P.lineTo(px + t / 2, py - t * Math.sin(Math.PI / 3));
      break;
    }
    case '7': P.moveTo(-s, r); P.lineTo(w - r, r); P.lineTo(w - r - (H + s) / T60, H + s); break;
    case '8': {
      const R1 = (H - s) / 2 - R;
      P.arc(cx, r + R1, R1, 0, Math.PI * 2);
      P.moveTo(cx + R, low[1]); P.arc(low[0], low[1], R, 0, Math.PI * 2);
      break;
    }
    default: throw new Error('Choose a single numeral.');
  }
  return P;
}

// Authoring only: the generator samples each skeleton once at 8x8 per pixel.
// The live clock always reads the approved masters, matching the watch exactly.
export function rasterizeGeodesicGlyph(ch, design = GEODESIC_DESIGN) {
  const SS = 8, scale = capHeight / 100 * SS, W = Math.ceil(design.w * capHeight / 100) + 2;
  const canvas = document.createElement('canvas');
  canvas.width = W * SS; canvas.height = capHeight * SS;
  const g = canvas.getContext('2d', {willReadFrequently: true});
  g.scale(scale, scale);
  if (ch === '9') { g.translate(design.w, 100); g.rotate(Math.PI); }
  // The 1's flag is cut vertically, leaving a small lattice triangle.
  const clipX = ch === '1' ? design.w - design.s / 2 - design.flag / 2 : 0;
  g.beginPath(); g.rect(clipX, 0, design.w - clipX, 100); g.clip();
  g.lineWidth = design.s; g.lineCap = 'butt'; g.miterLimit = 10;
  g.lineJoin = ch === '3' || ch === '5' ? 'round' : 'miter';
  g.stroke(geodesicSkeleton(ch === '9' ? '6' : ch, design));
  const rgba = g.getImageData(0, 0, canvas.width, canvas.height).data, raw = new Uint8Array(W * capHeight);
  for (let y = 0; y < capHeight; y++) for (let x = 0; x < W; x++) {
    let coverage = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) coverage += rgba[((y * SS + sy) * canvas.width + x * SS + sx) * 4 + 3];
    raw[y * W + x] = coverage >= SS * SS * 255 / 2 ? 1 : 0;
  }
  let x0 = W, x1 = -1;
  for (let y = 0; y < capHeight; y++) for (let x = 0; x < W; x++) if (raw[y * W + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  const inkWidth = x1 - x0 + 1;
  if (inkWidth > digitWidth) throw new Error(`Numeral ${ch} is ${inkWidth} pixels wide; the cell is ${digitWidth}.`);
  // Centre the ink in its tabular cell.
  const shift = Math.floor((digitWidth - inkWidth) / 2) - x0, mask = new Uint8Array(digitWidth * capHeight);
  for (let y = 0; y < capHeight; y++) for (let x = x0; x <= x1; x++) mask[y * digitWidth + x + shift] = raw[y * W + x];
  return mask;
}

export const GEODESIC_MASK_BYTES = digitWidth * capHeight / 8;
const glyphCache = new Map();
function glyphMask(character) {
  if (!glyphCache.has(character)) {
    const packed = pixelMasters[Number(character)];
    glyphCache.set(character, Uint8Array.from({length: digitWidth * capHeight}, (_, i) => (packed[i >> 3] >> (i & 7)) & 1));
  }
  return glyphCache.get(character);
}
// Round colon dots: an 8-pixel square with two-pixel clipped corners.
export const COLON_INSET = Object.freeze([2, 1, 0, 0, 0, 0, 1, 2]);
export function geodesicTimeMask(time) {
  if (!/^\d{2}:\d{2}$/.test(time)) throw new Error('Use a readout such as 12:34.');
  const mask = new Uint8Array(width * height), digits = [...time.replace(':', '')];
  for (let slot = 0; slot < 4; slot++) {
    const glyph = glyphMask(digits[slot]);
    for (let y = 0; y < capHeight; y++) for (let x = 0; x < digitWidth; x++)
      if (glyph[y * digitWidth + x]) mask[index(starts[slot] + x, y + capTop)] = 1;
  }
  for (const top of colonTops) for (let y = 0; y < colonSize; y++)
    for (let x = COLON_INSET[y]; x < colonSize - COLON_INSET[y]; x++) mask[index(colonX + x, top + y)] = 1;
  return mask;
}
// The same equilateral lattice as the broad clock: 8-pixel rows, so the
// 56-pixel figures span exactly seven rows from cap height to baseline.
let grid;
export function geodesicTriangleGrid() {
  return grid ??= equilateralGrid({width, height, pitch: 8, originX: 2, originY: capTop});
}
export function drawGeodesicTime(ctx, time, x = 0, y = 0, ink = '#000000') {
  const mask = geodesicTimeMask(time);
  ctx.fillStyle = ink;
  for (let py = 0; py < height; py++) for (let px = 0; px < width;) {
    if (!mask[index(px, py)]) { px++; continue; }
    let end = px + 1;
    while (end < width && mask[index(end, py)]) end++;
    ctx.fillRect(x + px, y + py, end - px, 1); px = end;
  }
}
