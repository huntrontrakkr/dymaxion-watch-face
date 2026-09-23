// Original clock lettering. References: Quantico's angled cuts, Forza's curved
// joins, Gridnik's softened facets, and Dymaxion v.1's heavy, extended proportions.
// The outlines below are authored for this study, not extracted font glyphs.
import pixelMasters from '../assets/type/broad-clock.json' with {type:'json'};
export const BROAD_METRICS = Object.freeze({
  width: 200, height: 40, capHeight: 32, capTop: 4, stroke: 8,
  margin: 2, digitWidth: 45, starts: Object.freeze([2, 49, 106, 153])
});
export const BROAD_GLYPHS = Object.freeze({
  '0':'M22 0H68Q75 0 80 4L86 8Q90 11 90 18V46Q90 53 84 57L78 61Q73 64 67 64H23Q17 64 12 61L6 57Q0 53 0 46V18Q0 11 6 7L12 3Q17 0 22 0Z M27 16Q23 16 20 20Q18 22 18 26V38Q18 42 21 45Q23 48 27 48H63Q67 48 70 44Q72 42 72 38V26Q72 22 69 19Q67 16 63 16Z',
  '1':'M17 12L38 0H59V48H90V64H0V48H37V21L20 30L9 17Z',
  '2':'M0 11L14 3Q20 0 28 0H66Q78 0 85 7Q90 12 90 21Q90 30 82 35L29 48H90V64H0V47Q0 40 11 36L65 22Q70 21 70 18Q70 16 64 16H25L12 23Z',
  '3':'M2 0H66Q77 0 84 7Q90 12 90 21Q90 28 82 32Q90 36 90 44Q90 53 83 59Q77 64 65 64H0V48H64Q70 48 70 44Q70 40 64 40H18V24H64Q70 24 70 20Q70 16 64 16H2Z',
  '4':'M47 0H69V32H90V48H69V64H49V48H0V37Z M24 32H49V13Z',
  '5':'M0 0H90V16H20V24H65Q77 24 84 31Q90 37 90 45Q90 54 83 60Q77 64 65 64H0V48H64Q70 48 70 44Q70 40 64 40H0Z',
  '6':'M26 0H90V16H29Q20 16 20 24H65Q76 24 83 31Q90 37 90 45Q90 54 83 60Q77 64 65 64H26Q15 64 7 57Q0 51 0 42V22Q0 12 8 6Q15 0 26 0Z M28 40Q20 40 20 44Q20 48 28 48H62Q70 48 70 44Q70 40 62 40Z',
  '7':'M0 0H90V16L47 64H22L66 16H0Z',
  '8':'M25 0H65Q77 0 84 7Q90 12 90 20Q90 28 82 32Q90 36 90 44Q90 53 83 59Q77 64 65 64H25Q13 64 6 57Q0 52 0 44Q0 36 8 32Q0 28 0 20Q0 12 8 6Q15 0 25 0Z M29 16Q21 16 21 20Q21 24 29 24H61Q69 24 69 20Q69 16 61 16Z M28 40Q20 40 20 44Q20 48 28 48H62Q70 48 70 44Q70 40 62 40Z'
});
const {width, height, capHeight, capTop, stroke, digitWidth, starts} = BROAD_METRICS;
const index = (x, y) => y * width + x;
const glyphCache = new Map();
function softenSquareCorners(original) {
  const mask = new Uint8Array(original);
  const ink = (x, y) => x >= 0 && x < digitWidth && y >= 0 && y < capHeight ? original[y * digitWidth + x] : 0;
  // One native pixel at an exposed right-angle corner. Four-pixel straight
  // edges distinguish square terminals from the already curved/faceted bowls.
  for (let y = 0; y < capHeight; y++) for (let x = 0; x < digitWidth; x++) {
    if (!ink(x, y)) continue;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      let square = true;
      for (let k = 0; k < 4; k++) {
        if (!ink(x + sx * k, y) || !ink(x, y + sy * k) || ink(x + sx * k, y - sy) || ink(x - sx, y + sy * k)) square = false;
      }
      if (square && ink(x + sx, y + sy)) mask[y * digitWidth + x] = 0;
    }
  }
  return mask;
}
// Authoring only: the asset generator samples these outlines once. The live
// clock always reads the approved bitmap, matching the native watch exactly.
export function rasterizeBroadGlyph(character) {
  const canvas = document.createElement('canvas');
  canvas.width = 180; canvas.height = 128;
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  ctx.scale(2, 2);
  if (character === '9') { ctx.translate(90, 64); ctx.rotate(Math.PI); }
  ctx.fill(new Path2D(BROAD_GLYPHS[character === '9' ? '6' : character]), 'evenodd');
  const rgba = ctx.getImageData(0, 0, 180, 128).data;
  const mask = new Uint8Array(digitWidth * capHeight);
  for (let y = 0; y < capHeight; y++) for (let x = 0; x < digitWidth; x++) {
    let coverage = 0;
    for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++)
      coverage += rgba[((y * 4 + sy) * 180 + x * 4 + sx) * 4 + 3];
    mask[y * digitWidth + x] = coverage >= 255 * 8 ? 1 : 0;
  }
  return softenSquareCorners(mask);
}
function glyphMask(character) {
  if (!glyphCache.has(character)) {
    const packed = pixelMasters[Number(character)];
    glyphCache.set(character, Uint8Array.from({length: digitWidth * capHeight}, (_, i) => (packed[i >> 3] >> (i & 7)) & 1));
  }
  return glyphCache.get(character);
}
export function drawBroadDigit(ctx, character, x, y, ink = '#000000') {
  if (!/^\d$/.test(character)) throw new Error('Choose a single numeral.');
  const mask = glyphMask(character);
  ctx.fillStyle = ink;
  for (let py = 0; py < capHeight; py++) for (let px = 0; px < digitWidth; px++)
    if (mask[py * digitWidth + px]) ctx.fillRect(x + px, y + py, 1, 1);
}

export function broadTimeGeometry(time) {
  if (!/^\d{2}:\d{2}$/.test(time)) throw new Error('Use a readout such as 12:34.');
  const mask = new Uint8Array(width * height), digits = [...time.replace(':', '')];
  for (let slot = 0; slot < 4; slot++) {
    const glyph = glyphMask(digits[slot]);
    for (let y = 0; y < capHeight; y++) for (let x = 0; x < digitWidth; x++)
      mask[index(starts[slot] + x, y + capTop)] = glyph[y * digitWidth + x];
  }
  // Two 8 x 8 blocks match the stroke weight. Two-pixel corner clips repeat the
  // lettering's softened facets; a two-pixel clear gutter separates each side.
  for (const top of [9, 23]) for (let y = 0; y < stroke; y++) for (let x = 0; x < stroke; x++) {
    const inset = y === 0 || y === 7 ? 2 : y === 1 || y === 6 ? 1 : 0;
    if (x >= inset && x < stroke - inset) mask[index(96 + x, top + y)] = 1;
  }
  return {mask, digits};
}
export function broadTimeMask(time) { return broadTimeGeometry(time).mask; }

const SQRT3 = Math.sqrt(3), triangleCache = new Map();
const signedArea = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
export function broadTriangleGrid(pitch = 8, phase = 0) {
  pitch = Math.max(6, Math.min(10, Number(pitch) || 8));
  phase = Math.max(0, Math.min(1, Number(phase) || 0));
  const key = pitch + ':' + phase;
  if (triangleCache.has(key)) return triangleCache.get(key);
  const edge = 2 * pitch / SQRT3;
  const grid = {...equilateralGrid({width, height, pitch, originX: 2 + phase * edge / 2, originY: capTop}), phase};
  triangleCache.set(key, grid);
  return grid;
}
// One continuous lattice over a whole clock strip. Each pixel belongs to the
// first cell whose closed triangle contains its centre; cells are numbered in
// row order, so ids increase from left to right along every pixel row.
export function equilateralGrid({width, height, pitch, originX, originY}) {
  const edge = 2 * pitch / SQRT3;
  const cells = [], membership = new Int16Array(width * height).fill(-1);
  for (let row = -2; row < Math.ceil(height / pitch) + 2; row++) {
    for (let column = -3; column < Math.ceil(width * 2 / edge) + 3; column++) {
      const x = originX + column * edge / 2, y = originY + row * pitch;
      const vertices = (row + column) & 1
        ? [[x, y], [x + edge, y], [x + edge / 2, y + pitch]]
        : [[x + edge / 2, y], [x + edge, y + pitch], [x, y + pitch]];
      const pixels = [], id = cells.length;
      for (let py = Math.max(0, Math.floor(y)); py < Math.min(height, Math.ceil(y + pitch)); py++) {
        for (let px = Math.max(0, Math.floor(x)); px < Math.min(width, Math.ceil(x + edge)); px++) {
          const p = [px + .5, py + .5], sides = vertices.map((v, i) => signedArea(v, vertices[(i + 1) % 3], p));
          if (!(sides.every(n => n >= -1e-8) || sides.every(n => n <= 1e-8))) continue;
          const at = py * width + px;
          if (membership[at] >= 0) continue;
          membership[at] = id; pixels.push(at);
        }
      }
      if (pixels.length) cells.push({vertices, pixels});
    }
  }
  return {edge, pitch, originX, originY, width, height, cells, membership};
}

const CORNERS = Object.freeze({
  '0': ['tl', 'tr', 'bl', 'br'], '1': ['tl'], '2': ['tl', 'tr'],
  '3': ['tr', 'br'], '4': [], '5': ['br'], '6': ['tl', 'bl', 'br'],
  '7': ['tr'], '8': ['tl', 'tr', 'bl', 'br'], '9': ['tl', 'tr', 'br']
});
function lineInRect(a, b, c, rect) {
  const {x0, x1, y0, y1} = rect, points = [];
  for (const x of [x0, x1]) {
    const y = (c - a * x) / b;
    if (y >= y0 - 1e-8 && y <= y1 + 1e-8) points.push([x, y]);
  }
  for (const y of [y0, y1]) {
    const x = (c - b * y) / a;
    if (x >= x0 - 1e-8 && x <= x1 + 1e-8 && !points.some(p => Math.hypot(p[0] - x, p[1] - y) < 1e-8)) points.push([x, y]);
  }
  return points.slice(0, 2);
}
export function trimBroadGeometry(geometry, {pitch = 8, phase = 0, depth = 2} = {}) {
  const {digits, mask: original} = geometry;
  const mask = new Uint8Array(original), removed = new Uint8Array(original.length);
  const grid = broadTriangleGrid(pitch, phase), cuts = [];
  depth = Math.max(0, Math.min(3, Number(depth) || 0));
  for (let slot = 0; slot < digits.length; slot++) for (const corner of CORNERS[digits[slot]]) {
    const right = corner[1] === 'r', bottom = corner[0] === 'b';
    const rect = {
      x0: starts[slot] + (right ? 33 : 0), x1: starts[slot] + (right ? 45 : 12),
      y0: capTop + (bottom ? 24 : 0), y1: capTop + (bottom ? 32 : 8)
    };
    // Each accepted line is an actual +/-60 degree edge in the global lattice.
    // Clip only exterior corner regions; counters and colon stay intact.
    const a = right ? -1 : 1, b = (bottom ? -1 : 1) / SQRT3;
    const offset = a * grid.originX + b * grid.originY + grid.edge / 2;
    let minimum = Infinity;
    const candidates = [];
    for (let y = rect.y0; y < rect.y1; y++) for (let x = rect.x0; x < rect.x1; x++) {
      const at = index(x, y);
      if (!original[at]) continue;
      const value = a * (x + .5) + b * (y + .5);
      candidates.push({at, x, y, value}); minimum = Math.min(minimum, value);
    }
    if (!candidates.length) continue;
    const c = offset + Math.ceil((minimum - offset + 1e-8) / grid.edge) * grid.edge;
    const distance = (c - minimum) / Math.hypot(a, b);
    if (distance > depth || distance < .2) continue;
    const clipped = candidates.filter(p => p.value < c);
    if (clipped.length < 2) continue;
    for (const p of clipped) { mask[p.at] = 0; removed[p.at] = 1; }
    cuts.push({slot, corner, a, b, c, distance, points: lineInRect(a, b, c, rect), pixels: clipped.length});
  }
  return {mask, removed, grid, cuts};
}

export function drawBroadTime(ctx, time, x = 0, y = 0, {
  ink = '#000000', background = '#FFFFFF', guide = '#557799', cut = '#0055AA',
  trimmed = false, showGrid = false, pitch = 8, phase = 0, depth = 2
} = {}) {
  const geometry = broadTimeGeometry(time);
  const result = trimBroadGeometry(geometry, {pitch, phase, depth});
  const display = trimmed ? result.mask : geometry.mask;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = ink;
  for (let py = 0; py < height; py++) for (let px = 0; px < width; px++)
    if (display[index(px, py)]) ctx.fillRect(px, py, 1, 1);
  if (showGrid) {
    ctx.beginPath(); ctx.rect(0, 0, width, height); ctx.clip();
    // Overlay the complete guide above the lettering, including the white space.
    // No mesh texture is baked into either of the clean lettering masks.
    ctx.strokeStyle = guide; ctx.globalAlpha = .5; ctx.lineWidth = .25;
    ctx.beginPath();
    for (const cell of result.grid.cells) {
      cell.vertices.forEach((v, i) => i ? ctx.lineTo(...v) : ctx.moveTo(...v)); ctx.closePath();
    }
    ctx.stroke(); ctx.globalAlpha = 1; ctx.strokeStyle = cut; ctx.lineWidth = .7;
    ctx.beginPath();
    for (const segment of result.cuts) if (segment.points.length === 2) {
      ctx.moveTo(...segment.points[0]); ctx.lineTo(...segment.points[1]);
    }
    ctx.stroke();
  }
  ctx.restore(); return {...result, original: geometry.mask};
}
