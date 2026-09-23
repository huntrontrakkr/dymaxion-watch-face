import {BROAD_METRICS, broadTimeMask, broadTriangleGrid} from './broad-numerals.js';

export const FLIP_DURATION = 400;
export const TILE_DURATION = 320;
export const FLIP_SCALE = Object.freeze(Array.from({length: 33}, (_, i) => Math.round(Math.cos(i * Math.PI / 64) * 1024)));
const {width: W, height: H, starts, digitWidth} = BROAD_METRICS;
const slotAt = x => starts.findIndex(start => x >= start && x < start + digitWidth);
let defaultGrid;

export function flipGrid() {
  if (defaultGrid) return defaultGrid;
  const grid = broadTriangleGrid(8, 0);
  const cells = grid.cells.map((cell, id) => {
    // Every tile hinges along the same 60-degree family of lattice edges.
    // Q8 coordinates make the inverse projection identical on browser and watch.
    const hinge = cell.vertices[0][1] === cell.vertices[1][1] ? 2 : 0;
    const a = cell.vertices[hinge].map(v => Math.round(v * 256));
    const b = cell.vertices[(hinge + 1) % 3].map(v => Math.round(v * 256));
    const nx = a[1] - b[1], ny = b[0] - a[0];
    return {...cell, id, ax: a[0], ay: a[1], nx, ny, length2: nx * nx + ny * ny,
      centerX: Math.round(cell.vertices.reduce((sum, p) => sum + p[0], 0) / 3 * 256)};
  });
  defaultGrid = {...grid, cells};
  return defaultGrid;
}

export function planPixelFlip(before, after) {
  if (before.length !== W * H || after.length !== W * H) throw new Error('Clock frames must be 200 by 40 pixels.');
  const grid = flipGrid(), active = new Uint8Array(grid.cells.length), delays = new Uint8Array(grid.cells.length);
  let changedSlots = 0, changedPixels = 0;
  for (let i = 0; i < before.length; i++) if (before[i] !== after[i]) {
    const slot = slotAt(i % W);
    if (slot < 0) throw new Error('Only numeral pixels may change during the minute flip.');
    active[grid.membership[i]] = 1; changedSlots |= 1 << slot; changedPixels++;
  }
  const changed = grid.cells.filter(cell => active[cell.id]);
  const min = Math.min(...changed.map(cell => cell.centerX)), max = Math.max(...changed.map(cell => cell.centerX));
  for (const cell of changed) delays[cell.id] = max > min ? Math.round((FLIP_DURATION - TILE_DURATION) * (cell.centerX - min) / (max - min)) : 0;
  return {before: new Uint8Array(before), after: new Uint8Array(after), grid, active, delays, changedSlots,
    changedPixels, changedCells: changed.length, duration: changed.length ? FLIP_DURATION : 0};
}

export function planMinuteFlip(from, to) {
  return {...planPixelFlip(broadTimeMask(from), broadTimeMask(to)), from, to};
}

// Palette indices: background, ink, tilted background, tilted ink.
// Start with the new drawing underneath, then hinge the old tile out of the way.
// Unchanged cells, unchanged numerals, inter-digit gaps and colon stay stationary.
export function sampleMinuteFlip(plan, elapsed, output = new Uint8Array(W * H)) {
  output.set(plan.after);
  if (elapsed >= plan.duration || !plan.changedCells) return output;
  const phases = new Int8Array(plan.active.length).fill(-1);
  for (const cell of plan.grid.cells) if (plan.active[cell.id]) {
    const local = elapsed - plan.delays[cell.id];
    if (local < TILE_DURATION) phases[cell.id] = Math.max(0, Math.floor(local * 32 / TILE_DURATION));
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const slot = slotAt(x);
    if (slot < 0 || !(plan.changedSlots & (1 << slot))) continue;
    const at = y * W + x, id = plan.grid.membership[at], phase = phases[id];
    if (phase < 0) continue;
    if (phase === 0) { output[at] = plan.before[at]; continue; }
    const scale = FLIP_SCALE[phase];
    if (!scale) continue;
    const cell = plan.grid.cells[id], px = x * 256 + 128, py = y * 256 + 128;
    const distance = (px - cell.ax) * cell.nx + (py - cell.ay) * cell.ny;
    const denominator = cell.length2 * scale;
    const sx = Math.floor((px + Math.trunc(distance * cell.nx * (1024 - scale) / denominator)) / 256);
    const sy = Math.floor((py + Math.trunc(distance * cell.ny * (1024 - scale) / denominator)) / 256);
    if (sx < 0 || sx >= W || sy < 0 || sy >= H || plan.grid.membership[sy * W + sx] !== id) continue;
    const ink = slotAt(sx) === slot ? plan.before[sy * W + sx] : 0;
    output[at] = ink + (scale < 850 ? 2 : 0);
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
// immediately; a real adjacent minute advances through exactly one short flip.
export function minuteFlipClock({invalidate, now = () => performance.now(),
  requestFrame = callback => requestAnimationFrame(callback), cancelFrame = id => cancelAnimationFrame(id)} = {}) {
  let previous = null, current = null, request = null;
  function stop() { if (request !== null) cancelFrame(request); request = null; current = null; }
  return {
    update(time, minute, key, animate = true) {
      if (previous?.time === time && previous.minute === minute && previous.key === key) {
        if (!animate) stop();
        return;
      }
      stop();
      if (animate && previous && previous.key === key && minute === previous.minute + 1 && time !== previous.time) {
        const plan = planMinuteFlip(previous.time, time);
        if (plan.changedCells) current = {plan, started: now()};
      }
      previous = {time, minute, key};
    },
    frame() {
      if (!previous) return null;
      if (!current) return broadTimeMask(previous.time);
      const elapsed = Math.max(0, now() - current.started), result = sampleMinuteFlip(current.plan, elapsed);
      if (elapsed >= FLIP_DURATION) stop();
      else if (request === null) request = requestFrame(() => { request = null; invalidate?.(); });
      return result;
    },
    get active() { return !!current; },
    reset() { stop(); previous = null; }
  };
}
