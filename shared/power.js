// Power and motion: how often the daylight shading is recomputed, which
// animations play, and a night saver that slows the shading to every other
// hour, stops animations and can pause redraws in the dark. Carried in bytes
// 4-6 of the DISPLAY packet; the watch mirrors this in watchface/src/c/power.c.
export const DAYLIGHT_MINUTES = [5, 10, 15, 30];
export const NIGHT_DAYLIGHT_MINUTES = 120;
export function defaultPower() {
  return {daylightMinutes: 5, minuteAnimation: true, flourishes: true, night: false, nightStart: 22, nightEnd: 7, darkPause: false};
}
const hourOk = h => Number.isInteger(h) && h >= 0 && h < 24;
export function validatePower(input) {
  const d = defaultPower();
  if (input == null) return d;
  if (typeof input !== 'object') throw new Error('Invalid power settings.');
  const out = {...d};
  for (const key of ['minuteAnimation', 'flourishes', 'night', 'darkPause']) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== 'boolean') throw new Error(`Invalid ${key}.`);
    out[key] = input[key];
  }
  if (input.daylightMinutes !== undefined) {
    if (!DAYLIGHT_MINUTES.includes(input.daylightMinutes)) throw new Error('Invalid daylight update interval.');
    out.daylightMinutes = input.daylightMinutes;
  }
  for (const key of ['nightStart', 'nightEnd']) {
    if (input[key] === undefined) continue;
    if (!hourOk(input[key])) throw new Error(`Invalid ${key}.`);
    out[key] = input[key];
  }
  return out;
}
// Byte 4: bits 0-1 index DAYLIGHT_MINUTES, bit 2 minute animation off, bit 3
// pulse and swipes off, bit 4 night saver, bit 5 pause redraws in the dark.
// Bytes 5 and 6: the night's first hour and the hour it ends.
export function encodePower(power) {
  const p = validatePower(power);
  return [DAYLIGHT_MINUTES.indexOf(p.daylightMinutes) | (p.minuteAnimation ? 0 : 4) | (p.flourishes ? 0 : 8) | (p.night ? 16 : 0) | (p.darkPause ? 32 : 0), p.nightStart, p.nightEnd];
}
export function decodePower([bits, nightStart, nightEnd]) {
  return {daylightMinutes: DAYLIGHT_MINUTES[bits & 3], minuteAnimation: !(bits & 4), flourishes: !(bits & 8), night: !!(bits & 16), nightStart, nightEnd, darkPause: !!(bits & 32)};
}
// Whether this hour falls in the night saver's hours (which may wrap past
// midnight; the same start and end hour means all day).
export function isNight(p, hour) {
  if (!p.night) return false;
  const {nightStart: s, nightEnd: e} = p;
  return s === e ? true : s < e ? hour >= s && hour < e : hour >= s || hour < e;
}
export const daylightMinutes = (p, hour) => isNight(p, hour) ? NIGHT_DAYLIGHT_MINUTES : p.daylightMinutes;
// Whether the shading is recomputed at this minute tick (never while day and
// night is off: the map then does not change with time).
export const relightAt = (p, dayNight, hour, minute) => dayNight && (hour * 60 + minute) % daylightMinutes(p, hour) === 0;
// Minutes since the shading was last recomputed on schedule.
export function sinceRelight(p, hour, minute) {
  for (let back = 0; back < NIGHT_DAYLIGHT_MINUTES; back++) {
    const t = ((hour * 60 + minute - back) % 1440 + 1440) % 1440;
    if (relightAt(p, true, Math.floor(t / 60), t % 60)) return back;
  }
  return 0;
}
export const minuteAnimationOn = (p, motion, hour) => motion && p.minuteAnimation && !isNight(p, hour);
export const flourishesOn = (p, motion, hour) => motion && p.flourishes && !isNight(p, hour);
export const darkPaused = (p, hour) => p.darkPause && isNight(p, hour);
