// The store listing's banner: the Dymaxion net lit for one moment, laid on
// the same triangular lattice its faces are cut from, with the wordmark above.
// Drawn in the watch's own pixels and colors at 360 × 160, then enlarged
// without smoothing to the store's 720 × 320 (and 1440 × 640 for the web).
//   node tools/generate-hero.mjs
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {deflateSync} from 'node:zlib';
import {geoContains} from 'd3-geo';
import {feature} from 'topojson-client';
import {buildNetFuller, netToDir, lonLatToNet, direction} from '../shared/map.js';
import {THEMES} from '../shared/palettes.js';
import {defaults} from '../shared/settings.js';
import {MARKERS} from '../shared/markers.js';
import {CITIES} from '../shared/cities.js';
import {SUN_ROWS, MARKER_HALO_ROWS} from '../shared/status-glyphs.js';
import {sunDirection, SUNRISE_SINE, CIVIL_TWILIGHT_SINE} from '../shared/solar.js';

const W = 360, H = 160, S3 = Math.sqrt(3);
const theme = THEMES[defaults().theme];
// An equinox afternoon in Europe: day over the Atlantic, night across Asia.
const MOMENT = new Date(Date.UTC(2026, 8, 22, 15, 0));
const WORDMARK = JSON.parse(readFileSync('assets/type/wordmark.json'));

const px = new Uint8Array(W * H * 3);
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const set = (x, y, c) => {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  px.set(hex(c), (y * W + x) * 3);
};
const ctx = {fillStyle: '#000000', fillRect(x, y, w, h) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, this.fillStyle); }};
const rows = (r, x, y, c) => r.forEach((row, j) => [...row].forEach((ch, i) => ch === '#' && set(x + i, y + j, c)));

// The net, scaled to fit below the wordmark. Net units: a face's side is 1.
const T = buildNetFuller();
const weights = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [.5, .5, 0], [0, .5, .5], [.5, 0, .5], [1 / 3, 1 / 3, 1 / 3]];
const corners = {1: [0, 3, 6], 2: [1, 3, 6], 3: [1, 4, 6], 4: [2, 4, 6], 5: [2, 5, 6], 6: [0, 5, 6]};
const pts = T.flatMap(t => t.lcd ? [...new Set(t.lcd.flatMap(l => corners[l]))].map(i => [0, 1].map(c => weights[i].reduce((s, v, j) => s + v * t.p[j][c], 0))) : t.p);
const x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0]));
const y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));
// Lattice rows fall on pixel centres, so every horizontal line is one pixel.
const MAP = {top: 34.5, bottom: 154.5};
const k = (MAP.bottom - MAP.top) / (y1 - y0);
const ox = Math.round((W - k * (x1 - x0)) / 2);
const toPixel = ([x, y]) => [ox + (x - x0) * k, MAP.top + (y1 - y) * k];
const toNet = (x, y) => [x0 + (x - ox) / k, y1 - (y - MAP.top) / k];

// Land from Natural Earth, sampled at half-degree cells as the watch's map is.
const atlas = JSON.parse(readFileSync('node_modules/world-atlas/land-110m.json'));
const land = feature(atlas, atlas.objects.land), landCache = new Map();
function isLand(d) {
  const lat = Math.asin(d[2]) * 180 / Math.PI, lon = Math.atan2(d[1], d[0]) * 180 / Math.PI;
  const r = Math.max(0, Math.min(359, Math.round((89.75 - lat) * 2))), c = ((Math.round((lon + 179.75) * 2) % 720) + 720) % 720, key = r * 720 + c;
  if (!landCache.has(key)) landCache.set(key, geoContains(land, [-179.75 + c / 2, 89.75 - r / 2]));
  return landCache.get(key);
}

// The lattice the faces are cut from: lines of three directions, a face's
// side apart. Near the map each lattice triangle is halved and halved again,
// so the grid grows finer toward the Earth and opens out toward the edges.
const faceCenters = T.map(t => [0, 1].map(c => (t.p[0][c] + t.p[1][c] + t.p[2][c]) / 3));
const lattice = (x, y) => [2 * y / S3, x - y / S3 - .5, x + y / S3 - .5];
const offGrid = (u, s) => { const f = u / s; return Math.abs(f - Math.round(f)) * s * S3 / 2; };
function cellDepth(x, y) {
  const [a, b, c] = lattice(x, y).map(Math.floor);
  // The cell's centre, from its three lattice indices.
  const cx = (b + c + 1) / 2 + .5, cy = ((a + .5) * S3 / 2 + (c - b) * S3 / 2) / 2;
  const d = Math.min(...faceCenters.map(([fx, fy]) => Math.hypot(fx - cx, fy - cy)));
  return {depth: d < .8 ? 2 : d < 1.9 ? 1 : 0, far: d, id: (a * 73856093) ^ (b * 19349663) ^ (c * 83492791)};
}
const hash = n => { n = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d); n = Math.imul(n ^ (n >>> 12), 0x297a2d39); return ((n ^ (n >>> 15)) >>> 0) / 4294967296; };

const sun = sunDirection(MOMENT);
const covered = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const [nx, ny] = toNet(x + .5, y + .5), hit = netToDir(T, nx, ny, .42 / k);
  if (hit) {
    const [d, edge] = hit, light = d[0] * sun[0] + d[1] * sun[1] + d[2] * sun[2], ground = isLand(d);
    const night = light < CIVIL_TWILIGHT_SINE || light < SUNRISE_SINE && ((x + y) & 1);
    set(x, y, edge ? theme.bg : night ? (ground ? theme.nightLand : theme.nightOcean) : (ground ? theme.land : theme.ocean));
    covered[y * W + x] = 1;
    continue;
  }
  const cell = cellDepth(nx, ny), u = lattice(nx, ny), s = 1 / 2 ** cell.depth;
  const [fa, fb, fc] = u.map(v => Math.floor(v / s)), chance = hash(cell.depth ? (fa * 73856093) ^ (fb * 19349663) ^ (fc * 83492791) : cell.id);
  const line = v => Math.min(...u.map(w => offGrid(w, v))) * k < .5;
  // Large open cells far out carry the watch's twilight checker; small cells
  // beside the map are laid in solid, like pieces about to join it.
  const tile = cell.depth === 2 ? chance < .3 && cell.far < .62 : chance < (cell.depth ? .16 : .25) && ((x + y) & 1);
  const color = line(1) ? theme.nightOcean : line(s) ? (((x + y) & 1) ? theme.nightOcean : theme.bg) : tile ? theme.nightOcean : theme.bg;
  set(x, y, color);
}

// City lights on the night side, as on the watch.
for (const [lat, lon, mag] of CITIES) {
  const d = direction(lat, lon), light = d[0] * sun[0] + d[1] * sun[1] + d[2] * sun[2];
  if (light >= CIVIL_TWILIGHT_SINE) continue;
  const [x, y] = toPixel(lonLatToNet(T, lat, lon));
  set(x, y, mag > 1 ? theme.accent : theme.land);
}
// Three places and the Sun, each on a halo of background so it reads on land.
const mark = (glyph, lat, lon, color) => {
  const [x, y] = toPixel(lonLatToNet(T, lat, lon)).map(Math.round);
  rows(MARKER_HALO_ROWS, x - 3, y - 3, theme.bg);
  rows(glyph, x - 2, y - 2, color);
};
defaults().places.forEach((p, i) => mark(MARKERS[p.icon].rows, p.lat, p.lon, theme.marks[i]));
const subsolar = [Math.asin(sun[2]) * 180 / Math.PI, Math.atan2(sun[1], sun[0]) * 180 / Math.PI];
mark(SUN_ROWS, ...subsolar, theme.accent);

// The wordmark, centered at the top, on a clear band cut from the lattice.
const wx = Math.round((W - WORDMARK[0].length) / 2), wy = 10;
ctx.fillStyle = theme.bg; ctx.fillRect(wx - 8, wy - 5, WORDMARK[0].length + 16, WORDMARK.length + 10);
rows(WORDMARK, wx, wy, theme.ink);


function png(scale) {
  const w = W * scale, h = H * scale, raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const src = (Math.floor(y / scale) * W + Math.floor(x / scale)) * 3;
    raw.set(px.subarray(src, src + 3), y * (w * 3 + 1) + 1 + x * 3);
  }
  const crcTable = Array.from({length: 256}, (_, n) => { for (let j = 0; j < 8; j++) n = n & 1 ? 0xEDB88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
  const crc = b => { let c = ~0; for (const v of b) c = crcTable[(c ^ v) & 255] ^ (c >>> 8); return (~c) >>> 0; };
  const chunk = (type, data) => { const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length); out.write(type, 4); data.copy(out, 8); out.writeUInt32BE(crc(out.subarray(4, 8 + data.length)), 8 + data.length); return out; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, {level: 9})), chunk('IEND', Buffer.alloc(0))]);
}
mkdirSync('docs/screenshots/store', {recursive: true});
writeFileSync('docs/screenshots/store/banner-720x320.png', png(2));
writeFileSync('docs/screenshots/dymaxion-banner.png', png(4));
console.log('banner: docs/screenshots/store/banner-720x320.png, docs/screenshots/dymaxion-banner.png');
