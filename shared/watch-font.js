// The Draft capitals with a language's own glyphs (shared/watch-glyphs.json,
// made by tools/generate-watch-text.mjs): what the watch draws for that
// language, for the workshop and phone previews.
import GLYPHS from './watch-glyphs.json' with {type: 'json'};
import {watchLanguage} from './watch-text.js';
const fonts = new WeakMap();
export function localizedFont(base, code) {
  code = watchLanguage(code);
  if (code === 'en' || !GLYPHS[code]) return base;
  if (!fonts.has(base)) fonts.set(base, {});
  const cache = fonts.get(base);
  return cache[code] ||= {...base, ...GLYPHS[code]};
}
