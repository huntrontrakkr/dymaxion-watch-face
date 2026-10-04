// Glyphs for the watch's languages beyond the Draft Micro capitals.
// - A Latin letter with an accent is the Draft capital with the accent marks
//   Fusion Pixel draws on the same letter (its accented glyph less its plain
//   one), centred over the Draft letter.
// - Cyrillic and Greek capitals shaped like Latin ones reuse the Draft
//   capital; the rest are Fusion Pixel's 7-pixel capitals.
// - Chinese, Japanese and Korean are Fusion Pixel's 10px glyphs, from the
//   regional cut that matches the language.
// Glyphs use draft.json's form: advance a, left l, top t above the baseline,
// runs r of [x, y, length] from the top-left.

// Characters the base capitals already draw (tools/generate-caps.mjs).
const CAPS = /^[A-Z0-9 :.,\-+/%?]$/;
export const FUSION_VARIANT = {'zh-Hans': 'zh_hans', 'zh-Hant': 'zh_hant', ja: 'ja', ko: 'ko'};
const strings = text => Object.entries(text).flatMap(([key, value]) => Array.isArray(value) ? value : [key === 'date' || key.startsWith('calendar') ? value.replace(/\{\w+\}/g, '') : value]);
export function neededCharacters(text) {
  const chars = new Set();
  for (const s of strings(text)) for (const ch of s) if (!CAPS.test(ch)) chars.add(ch);
  return chars;
}
// Cyrillic and Greek capitals drawn like Latin ones.
const LOOKALIKE = {
  'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O', 'Р': 'P', 'С': 'C', 'Т': 'T', 'Х': 'X', 'І': 'I', 'Ѕ': 'S', 'Ј': 'J',
  'Α': 'A', 'Β': 'B', 'Ε': 'E', 'Ζ': 'Z', 'Η': 'H', 'Ι': 'I', 'Κ': 'K', 'Μ': 'M', 'Ν': 'N', 'Ο': 'O', 'Ρ': 'P', 'Τ': 'T', 'Υ': 'Y', 'Χ': 'X'
};
// Letters with a stroke have no decomposition.
const STROKED = {'Đ': 'D', 'Ø': 'O', 'Ħ': 'H'};
// The plain letter an accented capital is built on, if any.
export function LATIN_BASES(ch) {
  if (STROKED[ch]) return STROKED[ch];
  const base = ch.normalize('NFD')[0];
  return base !== ch && (CAPS.test(base) || LOOKALIKE[base]) ? base : null;
}
const pixels = glyph => {
  const set = new Set();
  if (glyph.rows) glyph.rows.forEach((row, y) => [...row].forEach((c, x) => c === '#' && set.add(`${glyph.l + x},${y - glyph.t}`)));
  else for (const [x, y, n] of glyph.r) for (let i = 0; i < n; i++) set.add(`${glyph.l + x + i},${y - glyph.t}`);
  return set;
};
const centre = set => { const xs = [...set].map(p => +p.split(',')[0]); return (Math.min(...xs) + Math.max(...xs)) / 2; };
function fromPixels(set, advance) {
  const points = [...set].map(p => p.split(',').map(Number));
  const left = Math.min(...points.map(p => p[0])), top = Math.min(...points.map(p => p[1]));
  const rows = new Map();
  for (const [x, y] of points) { if (!rows.has(y)) rows.set(y, []); rows.get(y).push(x - left); }
  const r = [];
  for (const [y, xs] of [...rows].sort((a, b) => a[0] - b[0])) {
    xs.sort((a, b) => a - b);
    for (let i = 0; i < xs.length;) { let j = i; while (j + 1 < xs.length && xs[j + 1] === xs[j] + 1) j++; r.push([xs[i], y - top, j - i + 1]); i = j + 1; }
  }
  return {a: advance, l: left, t: -top, r};
}
// Drawn here: Fusion Pixel's stroke does not sit on the Draft letter's stem.
const DRAWN = {
  'Ł': ['.#....', '.#....', '.#.#..', '.##...', '##....', '.#....', '.#####']
};
export function buildGlyph(ch, caps, fusion) {
  if (LOOKALIKE[ch]) return caps[LOOKALIKE[ch]];
  if (DRAWN[ch]) return fromPixels(pixels({l: 0, t: 7, rows: DRAWN[ch]}), DRAWN[ch][0].length + 1);
  const base = LATIN_BASES(ch);
  if (base) {
    const draft = caps[LOOKALIKE[base] || base], plain = fusion[base], marked = fusion[ch];
    if (!draft || !plain || !marked) throw new Error('Cannot build ' + ch);
    const own = pixels(draft), from = pixels(plain), marks = [...pixels(marked)].filter(p => !from.has(p));
    const dx = Math.round(centre(own) - centre(from));
    for (const p of marks) { const [x, y] = p.split(',').map(Number); own.add(`${x + dx},${y}`); }
    return fromPixels(own, draft.a);
  }
  const glyph = fusion[ch];
  if (!glyph) throw new Error('No glyph for ' + ch + ' U+' + ch.codePointAt(0).toString(16));
  const set = pixels(glyph);
  return set.size ? fromPixels(set, glyph.a) : {a: glyph.a, l: 0, t: 0, r: []};
}
