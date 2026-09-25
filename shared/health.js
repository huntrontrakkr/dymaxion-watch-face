// The Health drawer: today's steps per hour as bars, the heart rate as a line
// and a typical day for this weekday dotted behind them, in the weather chart's
// layout. The watch reads the numbers from Pebble Health and draws the same
// geometry (watchface/src/c/health.c); the workshop shows example data.
import {chartLayout,chartX,chartY} from './chart-axis.js';
export const HEALTH_HOURS = 24;
const SCALES = [500, 1000, 1500, 2000, 3000, 4000, 5000, 6000, 8000, 10000];
// The bar scale: the smallest round number that holds the busiest hour.
export function stepScale(max) {
  for (const s of SCALES) if (max <= s) return s;
  return Math.trunc((max + 4999) / 5000) * 5000;
}
// Rounded integer division, halves away from zero (as in C).
const roundDiv = (a, b) => a >= 0 ? Math.trunc((a + Math.trunc(b / 2)) / b) : -Math.trunc((-a + Math.trunc(b / 2)) / b);
// h: {steps[24], typical[24], heart[24] (0: no reading), hour, minute, heartNow}.
export function healthView(h, rangeLabels = true, hourWidth = 12) {
  let total = 0, typical = 0, busiest = 100, lo = 0, hi = 0;
  for (let i = 0; i <= h.hour; i++) total += h.steps[i];
  for (let i = 0; i < h.hour; i++) typical += h.typical[i];
  typical += Math.trunc(h.typical[h.hour] * h.minute / 60);
  for (let i = 0; i < HEALTH_HOURS; i++) busiest = Math.max(busiest, h.typical[i], i <= h.hour ? h.steps[i] : 0);
  for (let i = 0; i <= h.hour; i++) if (h.heart[i] > 0) { lo = lo ? Math.min(lo, h.heart[i]) : h.heart[i]; hi = Math.max(hi, h.heart[i]); }
  const scale = stepScale(busiest), heart = hi > 0;
  if (heart) { const pad = Math.max(5, Math.trunc((hi - lo) / 8)); lo -= pad; hi += pad; }
  const upper = heart ? String(hi) : String(scale), lower = heart ? String(lo) : '0';
  const layout = chartLayout(upper, lower, HEALTH_HOURS, rangeLabels, hourWidth);
  const plot = layout.bottom - layout.top + 1, x = i => chartX(layout, i);
  const bars = [];
  for (let i = 0; i <= h.hour; i++) {
    const height = Math.min(plot, Math.trunc(h.steps[i] * plot / scale));
    bars.push({x: x(i), y: layout.bottom + 1 - height, width: Math.min(3, Math.max(1, x(Math.min(i + 1, HEALTH_HOURS - 1)) - x(i) - 1), layout.right - x(i) + 1), height});
  }
  const usual = h.typical.map(v => chartY(v, 0, scale, layout.top, layout.bottom));
  const pulse = h.heart.map((v, i) => i <= h.hour && v > 0 ? chartY(v, lo, hi, layout.top, layout.bottom) : -1);
  const delta = typical > 0 ? roundDiv((total - typical) * 100, typical) : null;
  return {layout, upper, lower, scale, lo, hi, bars, usual, pulse,
    title: `STEPS ${total}${h.heartNow > 0 ? ` HR ${h.heartNow}` : ''}`,
    right: delta === null ? '' : `TYPICAL ${delta > 0 ? '+' : ''}${delta}%`};
}
// Workshop example: a commute, a lunch walk and an evening stroll, up to now.
export function sampleHealth(now = Date.now()) {
  const d = new Date(now), hour = d.getHours(), minute = d.getMinutes();
  const shape = [0, 0, 0, 0, 0, 20, 180, 900, 1300, 300, 250, 400, 1400, 500, 300, 350, 400, 700, 1100, 600, 300, 150, 60, 0];
  const beat = [52, 51, 50, 50, 51, 54, 62, 88, 96, 70, 68, 72, 94, 74, 70, 71, 73, 80, 92, 78, 70, 64, 58, 54];
  const steps = shape.map((v, i) => i < hour ? Math.round(v * (0.8 + 0.4 * ((i * 7) % 5) / 4)) : i === hour ? Math.round(v * minute / 60) : 0);
  const heart = beat.map((v, i) => i <= hour ? v : 0);
  return {steps, typical: shape, heart, hour, minute, heartNow: beat[hour], demo: true};
}
