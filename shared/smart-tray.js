// Smart rotation: the bottom tray shows what matters now instead of cycling on
// a timer. Checked on the minute tick from data the face already holds; a
// manual flick keeps its page for SMART_HOLD seconds. The watch mirrors the
// rules in watchface/src/c/smart_tray.c.
export const SMART_HOLD = 600, RAIN_LIKELY = 50, TIDE_SOON = 45, WALKING = 600;
export const SMART_HOURS = 3; // how far ahead rain counts
// pages: enabled page ids in order; home: the starting page; hour: local hour;
// rainPeak: highest rain chance (0-100) over the next hours, -1 unknown;
// tideMinutes: minutes to the next high or low, -1 unknown; recentSteps: steps
// in the last ten minutes, -1 unknown. First match wins, among enabled pages.
// Inputs from the workshop's example or live data (the watch reads its own
// packets in panels.c): data is {weather, tide, health}, now in milliseconds.
export function smartInputs(settings, data, now, hour) {
  const f = settings.footer, w = f.weather, t = now / 1000;
  let rainPeak = -1, tideMinutes = -1, recentSteps = -1;
  const series = data.weather;
  if (w.enabled && w.precipitation !== 'off' && series?.samples?.length && !series.error && t <= series.fetched + w.refreshMinutes * 120) {
    const start = Math.floor((t - series.start) / 3600);
    for (const p of series.samples.slice(Math.max(0, start), Math.max(0, start) + SMART_HOURS))
      if (start >= 0) rainPeak = Math.max(rainPeak, w.precipitation === 'probability' ? p.probability : p.rain >= 5 ? 100 : 0);
  }
  const tide = data.tide;
  if ((f.tide.station || tide?.demo) && tide?.samples?.length && t <= tide.fetched + 12 * 3600) {
    const next = [tide.high, tide.low].filter(v => v >= t).sort((a, b) => a - b)[0];
    if (next !== undefined) tideMinutes = Math.trunc((next - t) / 60);
  }
  // The example day spreads each hour's steps evenly over it.
  const h = data.health;
  if (h) recentSteps = Math.trunc(h.steps[h.hour] * 10 / Math.max(10, h.minute));
  return {pages: f.pages, home: f.home, hour, rainPeak, tideMinutes, recentSteps};
}
export function smartPage({pages, home, hour, rainPeak = -1, tideMinutes = -1, recentSteps = -1}) {
  const has = id => pages.includes(id);
  if (has('weather') && rainPeak >= RAIN_LIKELY) return 'weather';
  if (has('tide') && tideMinutes >= 0 && tideMinutes <= TIDE_SOON) return 'tide';
  if (has('health') && recentSteps >= WALKING) return 'health';
  if (hour >= 6 && hour < 9) { if (has('calendar')) return 'calendar'; if (has('weather')) return 'weather'; }
  return home;
}
