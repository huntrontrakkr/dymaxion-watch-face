// Transitions between states of the face: the bottom tray swiping to its next
// page, and the clock making room for the place times beside it. All integer
// math, so the watch (watchface/src/c/transitions.c) matches pixel for pixel.
export const TRAY_MS = 300, BESIDE_MS = 500, FRAME_MS = 33, TRAY_Y = 184, TRAY_H = 44;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// Ease out (cubic): quick to start, gentle to land. Permille in and out.
export function easeOut(t) {
  const u = 1000 - clamp(t, 0, 1000);
  return 1000 - Math.trunc(Math.trunc(u * u / 1000) * u / 1000);
}
// How far the tray has slid (0..200 pixels) this long after a page change:
// the old page leaves to the left as the new one arrives from the right.
export const traySlide = elapsed => Math.trunc(200 * easeOut(Math.trunc(clamp(elapsed, 0, TRAY_MS) * 1000 / TRAY_MS)) / 1000);
// One row of the sliding tray.
export function slideRow(oldRow, newRow, slide) {
  const out = new Array(200);
  for (let x = 0; x < 200; x++) out[x] = x < 200 - slide ? oldRow[x + slide] : newRow[x - (200 - slide)];
  return out;
}
// Beside progress runs 0 (times in the tray) to 1000 (times beside the clock)
// at a steady rate; from is where it stood when the target last changed.
export function besideProgress(from, toward, elapsed) {
  const step = Math.trunc(clamp(elapsed, 0, BESIDE_MS) * 1000 / BESIDE_MS);
  return toward ? Math.min(1000, from + step) : Math.max(0, from - step);
}
// The clock glides over in the first half, the column fades in in the second
// (and the reverse on the way back: the column fades, then the clock returns).
export const besideShift = (p, shift) => Math.trunc(shift * easeOut(Math.min(1000, 2 * p)) / 1000) || 0;
export const columnAlpha = p => clamp(2 * p - 1000, 0, 1000);
// A color part way from the ground toward the ink, per RGB222 channel.
export function mixColor(from, to, alpha) {
  let out = 0xc0;
  for (let shift = 0; shift <= 4; shift += 2) {
    const a = (from >> shift) & 3, b = (to >> shift) & 3, d = (b - a) * alpha;
    out |= (a + (d >= 0 ? Math.trunc((d + 500) / 1000) : -Math.trunc((500 - d) / 1000))) << shift;
  }
  return out;
}
