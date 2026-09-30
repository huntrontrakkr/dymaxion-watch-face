// Ways to lay out the watch's 64 colors in the color picker
// (shared/color-picker.js): Pebble's honeycomb, the RGB cube in four slices,
// CIELAB lightness by hue, and the CIE 1931 chromaticity diagram. Each layout
// places every color at pixel coordinates in a stage of the given size.
import {WATCH_COLOR_LAYOUT, WATCH_COLORS, asOnWatch} from './pebble-colors.js';

// sRGB (D65) to CIE XYZ, CIELAB and xy chromaticity.
const linear = c => { c /= 255;return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export function toXYZ(hex) {
  const [r, g, b] = [1, 3, 5].map(i => linear(parseInt(hex.slice(i, i + 2), 16)));
  return [0.4124 * r + 0.3576 * g + 0.1805 * b, 0.2126 * r + 0.7152 * g + 0.0722 * b, 0.0193 * r + 0.1192 * g + 0.9505 * b];
}
const WHITE = [0.95047, 1, 1.08883];
export function toLab(hex) {
  const f = t => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
  const [fx, fy, fz] = toXYZ(hex).map((v, i) => f(v / WHITE[i]));
  const L = 116 * fy - 16, a = 500 * (fx - fy), b = 200 * (fy - fz);
  return {L, a, b, C: Math.hypot(a, b), h: (Math.atan2(b, a) * 180 / Math.PI + 360) % 360};
}
export const D65 = [0.3127, 0.3290];
export function toXy(hex) {
  const [X, Y, Z] = toXYZ(hex), s = X + Y + Z;
  return s > 1e-9 ? [X / s, Y / s] : D65; // black has no chromaticity: at the white point
}
// The CIE 1931 2° spectral locus (the horseshoe), 380–700 nm.
export const SPECTRAL_LOCUS = Object.freeze([
  [0.1741, 0.0050], [0.1714, 0.0051], [0.1644, 0.0109], [0.1566, 0.0177], [0.1440, 0.0297], [0.1241, 0.0578],
  [0.1096, 0.0868], [0.0913, 0.1327], [0.0687, 0.2007], [0.0454, 0.2950], [0.0235, 0.4127], [0.0082, 0.5384],
  [0.0039, 0.6548], [0.0139, 0.7502], [0.0389, 0.8120], [0.0743, 0.8338], [0.1142, 0.8262], [0.1547, 0.8059],
  [0.2296, 0.7543], [0.3016, 0.6923], [0.3731, 0.6245], [0.4441, 0.5547], [0.5125, 0.4866], [0.5752, 0.4242],
  [0.6270, 0.3725], [0.6658, 0.3340], [0.6915, 0.3083], [0.7079, 0.2920], [0.7190, 0.2809], [0.7260, 0.2740], [0.7347, 0.2653]
]);
export const SRGB_PRIMARIES = Object.freeze([[0.64, 0.33], [0.30, 0.60], [0.15, 0.06]]);

export const COLOR_LAYOUTS = Object.freeze(['honeycomb', 'rgb', 'lab', 'xy']);
export const COLOR_LAYOUT_NAMES = Object.freeze({honeycomb: 'Honeycomb', rgb: 'RGB cube', lab: 'Lightness', xy: 'Chromaticity'});
const display = (hex, view) => view === 'watch' ? asOnWatch(hex) : hex;

// Pebble's honeycomb: rows of 6 to 10 hexagons, each row half a cell from the next.
function honeycomb() {
  const w = 30, h = 34, gap = 2, pitch = h - 7, widest = Math.max(...WATCH_COLOR_LAYOUT.map(r => r.length)), width = widest * (w + gap) - gap;
  const cells = WATCH_COLOR_LAYOUT.flatMap((row, r) => row.map((hex, k) => ({hex: '#' + hex.toUpperCase(), x: (width - (row.length * (w + gap) - gap)) / 2 + k * (w + gap), y: r * pitch, w, h, shape: 'hex'})));
  return {width, height: (WATCH_COLOR_LAYOUT.length - 1) * pitch + h, cells, labels: []};
}
// The RGB cube in four slices by blue: red across, green down.
function rgb() {
  const s = 30, gap = 2, block = 4 * (s + gap) - gap, between = 14, head = 16, cells = [], labels = [];
  const levels = ['00', '55', 'AA', 'FF'];
  levels.forEach((blue, b) => {
    const bx = (b % 2) * (block + between), by = Math.floor(b / 2) * (block + between + head);
    labels.push({text: `Blue ${blue}`, x: bx, y: by});
    levels.forEach((green, g) => levels.forEach((red, r) => cells.push({hex: `#${red}${green}${blue}`, x: bx + r * (s + gap), y: by + head + g * (s + gap), w: s, h: s, shape: 'square'})));
  });
  return {width: 2 * block + between, height: 2 * (block + head) + between, cells, labels};
}
// CIELAB: the greys (chroma under 8) in a column of their own on the left,
// then the rest in order of hue angle, from red round to purple, six to a
// column, each column lightest at the top. In the watch view the order
// follows the colors as the screen shows them.
function lab(view) {
  const s = 24, gap = 2, per = 6, greys = [], hues = [];
  for (const hex of WATCH_COLORS) {
    const c = '#' + hex.toUpperCase(), v = toLab(display(c, view));
    (v.C < 8 ? greys : hues).push({hex: c, L: v.L, h: (v.h + 360 - 20) % 360});
  }
  hues.sort((a, b) => a.h - b.h);
  const columns = [greys];
  for (let i = 0; i < hues.length; i += per) columns.push(hues.slice(i, i + per));
  const cells = columns.flatMap((col, k) => col.sort((a, b) => b.L - a.L).map((e, i) => ({hex: e.hex, x: k * (s + gap) + (k ? 6 : 0), y: 16 + i * (s + gap), w: s, h: s, shape: 'square'})));
  const rows = Math.max(...columns.map(c => c.length));
  return {width: columns.length * (s + gap) - gap + 6, height: 16 + rows * (s + gap) - gap, cells, labels: [{text: 'Grey', x: 0, y: 0}, {text: 'Hue, red to purple → (lighter at the top)', x: s + gap + 6, y: 0}]};
}
// CIE 1931 xy: each color at its chromaticity inside the spectral horseshoe,
// with the sRGB triangle and, dashed, the triangle of the watch screen's own
// primaries (as Pebble sampled them). Colors that share a chromaticity (a
// hue at several lightnesses, or the greys) sit side by side, darkest first.
export const XY_BOX = Object.freeze({width: 300, height: 316, x0: 0, x1: 0.8, y0: 0, y1: 0.85, pad: 10});
export const xyToStage = ([x, y]) => [XY_BOX.pad + (x - XY_BOX.x0) / (XY_BOX.x1 - XY_BOX.x0) * (XY_BOX.width - 2 * XY_BOX.pad), XY_BOX.height - XY_BOX.pad - (y - XY_BOX.y0) / (XY_BOX.y1 - XY_BOX.y0) * (XY_BOX.height - 2 * XY_BOX.pad)];
function xy(view) {
  const s = 14, groups = new Map();
  for (const hex of WATCH_COLORS) {
    const c = '#' + hex.toUpperCase(), shown = display(c, view), p = toXy(shown), key = p.map(v => Math.round(v * 60)).join(',');
    if (!groups.has(key)) groups.set(key, {p, members: []});
    groups.get(key).members.push({hex: c, L: toLab(shown).L});
  }
  const cells = [];
  for (const {p, members} of groups.values()) {
    const [cx, cy] = xyToStage(p);members.sort((a, b) => a.L - b.L);
    members.forEach((m, i) => cells.push({hex: m.hex, x: cx - s / 2 + (i - (members.length - 1) / 2) * (s + 1), y: cy - s / 2, w: s, h: s, shape: 'dot'}));
  }
  const pts = a => a.map(xyToStage).map(q => q.map(v => v.toFixed(1)).join(',')).join(' ');
  const screen = ['#FF0000', '#00FF00', '#0000FF'].map(h => toXy(asOnWatch(h)));
  const svg = `<svg width="${XY_BOX.width}" height="${XY_BOX.height}" viewBox="0 0 ${XY_BOX.width} ${XY_BOX.height}" aria-hidden="true">`
    + `<polygon points="${pts(SPECTRAL_LOCUS)}" fill="#eef1ea" stroke="#7a867c" stroke-width="1"/>`
    + `<polygon points="${pts(SRGB_PRIMARIES)}" fill="none" stroke="#5b665f" stroke-width="1"/>`
    + `<polygon points="${pts(screen)}" fill="none" stroke="#5b665f" stroke-width="1" stroke-dasharray="3 3"/>`
    + `<text x="${xyToStage([0.03, 0.8])[0]}" y="${xyToStage([0, 0.83])[1]}" font-size="10" fill="#5b665f">520 nm</text>`
    + `<text x="${xyToStage([0.66, 0])[0]}" y="${xyToStage([0, 0.235])[1]}" font-size="10" fill="#5b665f">700 nm</text>`
    + `<text x="${xyToStage([0.2, 0])[0]}" y="${xyToStage([0, 0.0])[1] + 2}" font-size="10" fill="#5b665f">380 nm</text></svg>`;
  return {width: XY_BOX.width, height: XY_BOX.height, cells, labels: [], svg};
}
export function colorLayout(mode, view = 'screen') {
  return mode === 'rgb' ? rgb() : mode === 'lab' ? lab(view) : mode === 'xy' ? xy(view) : honeycomb();
}
