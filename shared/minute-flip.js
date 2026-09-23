import {BROAD_METRICS, broadTimeMask, equilateralGrid} from './broad-numerals.js';
import {CHAMFER_METRICS, chamferTimeMask, chamferTriangleGrid} from './chamfer-numerals.js';

export const FLIP_DURATION = 400;
export const TILE_DURATION = 320;
export const FLIP_SCALE = Object.freeze(Array.from({length: 33}, (_, i) => Math.round(Math.cos(i * Math.PI / 64) * 1024)));
// Clock faces that share the minute transition. Each is a 200-pixel-wide strip
// with four fixed numeral slots; only pixels inside a slot may change. The
// lattice is one row of triangles as tall as the figures: the map's own scale.
export const FLIP_FACES = Object.freeze({
  broad: {metrics: BROAD_METRICS, mask: broadTimeMask,
    lattice: () => equilateralGrid({width: 200, height: 40, pitch: BROAD_METRICS.capHeight, originX: 2, originY: BROAD_METRICS.capTop})},
  chamfer: {metrics: CHAMFER_METRICS, mask: chamferTimeMask, lattice: chamferTriangleGrid}
});
function face(name) {
  const f = FLIP_FACES[name];
  if (!f) throw new Error('Unknown clock face.');
  return f;
}
const slotFinder = ({starts, digitWidth}) => x => starts.findIndex(start => x >= start && x < start + digitWidth);
const grids = new Map();

export function flipGrid(name = 'broad') {
  if (grids.has(name)) return grids.get(name);
  const grid = face(name).lattice();
  const cells = grid.cells.map((cell, id) => {
    // Every tile shrinks toward its centroid. Q8 coordinates make the inverse
    // projection identical on browser and watch.
    const [cx, cy] = [0, 1].map(axis => Math.round(cell.vertices.reduce((sum, p) => sum + p[axis], 0) / 3 * 256));
    return {...cell, id, cx, cy, centerX: cx};
  });
  const result = {...grid, cells};
  grids.set(name, result);
  return result;
}

export function planPixelFlip(before, after, name = 'broad') {
  const {width: W, height: H} = face(name).metrics, slotAt = slotFinder(face(name).metrics);
  if (before.length !== W * H || after.length !== W * H) throw new Error(`Clock frames must be ${W} by ${H} pixels.`);
  const grid = flipGrid(name), active = new Uint8Array(grid.cells.length), delays = new Uint8Array(grid.cells.length);
  let changedSlots = 0, changedPixels = 0;
  for (let i = 0; i < before.length; i++) if (before[i] !== after[i]) {
    const slot = slotAt(i % W);
    if (slot < 0) throw new Error('Only numeral pixels may change during the minute flip.');
    active[grid.membership[i]] = 1; changedSlots |= 1 << slot; changedPixels++;
  }
  const changed = grid.cells.filter(cell => active[cell.id]);
  const min = Math.min(...changed.map(cell => cell.centerX)), max = Math.max(...changed.map(cell => cell.centerX));
  for (const cell of changed) delays[cell.id] = max > min ? Math.round((FLIP_DURATION - TILE_DURATION) * (cell.centerX - min) / (max - min)) : 0;
  return {face: name, before: new Uint8Array(before), after: new Uint8Array(after), grid, active, delays, changedSlots,
    changedPixels, changedCells: changed.length, duration: changed.length ? FLIP_DURATION : 0};
}

export function planMinuteFlip(from, to, name = 'broad') {
  const {mask} = face(name);
  return {...planPixelFlip(mask(from), mask(to), name), from, to};
}
export function clockMask(time, name = 'broad') { return face(name).mask(time); }

// Palette indices: background, ink (the shaded pair is unused by the shrink).
// Start with the new drawing underneath, then shrink each old tile to its
// centroid in the face's own colors. Tiles without a changed pixel stay still.
export function sampleMinuteFlip(plan, elapsed, output) {
  const {width: W, height: H} = face(plan.face ?? 'broad').metrics;
  output ??= new Uint8Array(W * H);
  output.set(plan.after);
  if (elapsed >= plan.duration || !plan.changedCells) return output;
  const phases = new Int8Array(plan.active.length).fill(-1);
  for (const cell of plan.grid.cells) if (plan.active[cell.id]) {
    const local = elapsed - plan.delays[cell.id];
    if (local < TILE_DURATION) phases[cell.id] = Math.max(0, Math.floor(local * 32 / TILE_DURATION));
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const at = y * W + x, id = plan.grid.membership[at], phase = id < 0 ? -1 : phases[id];
    if (phase < 0) continue;
    if (phase === 0) { output[at] = plan.before[at]; continue; }
    const scale = FLIP_SCALE[phase];
    if (!scale) continue;
    const cell = plan.grid.cells[id];
    const sx = cell.cx + Math.trunc((x * 256 + 128 - cell.cx) * 1024 / scale);
    const sy = cell.cy + Math.trunc((y * 256 + 128 - cell.cy) * 1024 / scale);
    if (sx < 0 || sx >= W * 256 || sy < 0 || sy >= H * 256) continue;
    const source = (sy >> 8) * W + (sx >> 8);
    if (plan.grid.membership[source] !== id) continue;
    output[at] = plan.before[source];
  }
  return output;
}

function shade(from, toward) {
  return '#' + [1, 3, 5].map(i => {
    const a = parseInt(from.slice(i, i + 2), 16), b = parseInt(toward.slice(i, i + 2), 16);
    return Math.max(0, Math.min(255, a + Math.sign(b - a) * Math.min(85, Math.abs(b - a)))).toString(16).padStart(2, '0');
  }).join('');
}
export function drawFlipPixels(ctx, pixels, x = 0, y = 0, {ink = '#000000', background = '#FFFFFF'} = {}) {
  const W = 200, H = pixels.length / W;
  const colors = [background, ink, shade(background, ink), shade(ink, background)];
  for (let row = 0; row < H; row++) {
    let start = 0;
    while (start < W) {
      const color = pixels[row * W + start]; let end = start + 1;
      while (end < W && pixels[row * W + end] === color) end++;
      ctx.fillStyle = colors[color]; ctx.fillRect(x + start, y + row, end - start, 1); start = end;
    }
  }
}

// Idle clocks have no animation callbacks. Discontinuous time changes settle
// immediately; a real adjacent minute advances through exactly one short transition.
export function minuteFlipClock({invalidate, now = () => performance.now(),
  requestFrame = callback => requestAnimationFrame(callback), cancelFrame = id => cancelAnimationFrame(id)} = {}) {
  let previous = null, current = null, request = null;
  function stop() { if (request !== null) cancelFrame(request); request = null; current = null; }
  return {
    update(time, minute, key, animate = true, name = 'broad') {
      key = name + '/' + key;
      if (previous?.time === time && previous.minute === minute && previous.key === key) {
        if (!animate) stop();
        return;
      }
      stop();
      if (animate && previous && previous.key === key && minute === previous.minute + 1 && time !== previous.time) {
        const plan = planMinuteFlip(previous.time, time, name);
        if (plan.changedCells) current = {plan, started: now()};
      }
      previous = {time, minute, key, name};
    },
    frame() {
      if (!previous) return null;
      if (!current) return face(previous.name).mask(previous.time);
      const elapsed = Math.max(0, now() - current.started), result = sampleMinuteFlip(current.plan, elapsed);
      if (elapsed >= FLIP_DURATION) stop();
      else if (request === null) request = requestFrame(() => { request = null; invalidate?.(); });
      return result;
    },
    get active() { return !!current; },
    reset() { stop(); previous = null; }
  };
}
