// Builds the watch's languages from shared/watch-text.js:
// - shared/watch-glyphs.json: each language's glyphs beyond the Draft
//   capitals, for the workshop and phone previews;
// - watchface/resources/data/text-<code>.bin: each language's words and
//   glyphs, for the watch;
// - watchface/src/c/generated/watch_text_data.h: the string order, and the
//   English words for the host tests (the watch loads text-en.bin).
// It also checks that every word fits where the watch draws it.
//   node tools/generate-watch-text.mjs
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {WATCH_TEXT, WATCH_TEXT_KEYS, WATCH_LANGUAGES, PREVIEW_TEXT_KEYS, fillPattern} from '../shared/watch-text.js';
import {neededCharacters, buildGlyph, FUSION_VARIANT} from './watch-text-glyphs.mjs';

const caps = JSON.parse(readFileSync('designer/public/type/draft.json', 'utf8')).lining.small;
const fusion = JSON.parse(readFileSync('assets/type/fusion-glyphs.json', 'utf8')).variants;
const LISTS = {weekdays: 7, months: 12, initials: 7};
const flatten = text => WATCH_TEXT_KEYS.flatMap(key => LISTS[key] ? text[key] : [text[key]]);
const STRING_COUNT = flatten(WATCH_TEXT.en).length;

const glyphs = {}, sizes = [];
for (const code of WATCH_LANGUAGES) {
  const text = WATCH_TEXT[code], font = fusion[FUSION_VARIANT[code] || 'latin'];
  for (const key of [...WATCH_TEXT_KEYS, ...PREVIEW_TEXT_KEYS]) if (text[key] === undefined) throw new Error(`${code} is missing ${key}.`);
  for (const [key, n] of Object.entries(LISTS)) if (text[key].length !== n) throw new Error(`${code} ${key} needs ${n} entries.`);
  const own = {};
  for (const ch of [...neededCharacters(text)].sort()) own[ch] = buildGlyph(ch, caps, font);
  glyphs[code] = own;
  // Every word must fit where the watch draws it.
  const width = s => [...s].reduce((n, ch) => n + (own[ch] || caps[ch] || caps['?']).a, 0);
  const fit = (s, limit, what) => { if (width(s) > limit) throw new Error(`${code} ${what} "${s}" is ${width(s)} px; the watch has ${limit}.`); };
  for (const key of ['setUpTides', 'enableWeather', 'expired', 'unavailable', 'waiting', 'allowHealth', 'tide', 'humidity', 'weather', 'health']) fit(text[key], 192, key);
  fit(text.mapUnavailable, 200, 'mapUnavailable');
  fit(text.healthPreview, 210, 'healthPreview');
  fit(text.old, 89, 'old');
  text.initials.forEach(s => fit(s, 24, 'initial'));
  for (let w = 0; w < 7; w++) for (let m = 0; m < 12; m++) fit(fillPattern(text.date, {w: text.weekdays[w], d: 28, dd: 28, m: text.months[m]}), 100, 'date');
  for (let m = 0; m < 12; m++) fit(fillPattern(text.calendarSpan, {m: text.months[m], m2: text.months[(m + 1) % 12]}), 160, 'calendar span');
  // The resource: 'WT', version, string count, glyph count (u16), glyph table
  // offset (u16); string offsets (u16 each); the strings, NUL-terminated
  // UTF-8; 10-byte glyph entries sorted by code point (code point u16,
  // advance, left, top, width, height, unused, bitmap offset u16); bitmaps,
  // rows of whole bytes, most significant bit leftmost.
  const strings = flatten(text).map(s => Buffer.concat([Buffer.from(s, 'utf8'), Buffer.from([0])]));
  const entries = Object.entries(own).map(([ch, g]) => ({cp: ch.codePointAt(0), g})).sort((a, b) => a.cp - b.cp);
  if (entries.some(e => e.cp > 0xffff)) throw new Error('Glyphs must be in the Basic Multilingual Plane.');
  const head = 8 + 2 * STRING_COUNT, stringBytes = Buffer.concat(strings), tableAt = head + stringBytes.length;
  const bitmaps = [], table = Buffer.alloc(10 * entries.length);
  let bitmapAt = tableAt + table.length;
  entries.forEach(({cp, g}, i) => {
    const xs = g.r.map(([x, , n]) => x + n), w = g.r.length ? Math.max(...xs) : 0, h = g.r.length ? Math.max(...g.r.map(([, y]) => y)) + 1 : 0;
    const stride = Math.ceil(w / 8), bits = Buffer.alloc(stride * h);
    for (const [x, y, n] of g.r) for (let k = x; k < x + n; k++) bits[y * stride + (k >> 3)] |= 0x80 >> (k & 7);
    table.writeUInt16LE(cp, 10 * i); table.writeUInt8(g.a, 10 * i + 2); table.writeInt8(g.l, 10 * i + 3); table.writeUInt8(g.t, 10 * i + 4);
    table.writeUInt8(w, 10 * i + 5); table.writeUInt8(h, 10 * i + 6); table.writeUInt16LE(bitmapAt, 10 * i + 8);
    bitmaps.push(bits); bitmapAt += bits.length;
  });
  const header = Buffer.alloc(head);
  header.write('WT', 0); header[2] = 1; header[3] = STRING_COUNT; header.writeUInt16LE(entries.length, 4); header.writeUInt16LE(tableAt, 6);
  let at = head;
  strings.forEach((s, i) => { header.writeUInt16LE(at, 8 + 2 * i); at += s.length; });
  const out = Buffer.concat([header, stringBytes, table, ...bitmaps]);
  if (out.length > 0xffff) throw new Error(code + ' text is too large.');
  mkdirSync('watchface/resources/data', {recursive: true});
  writeFileSync(`watchface/resources/data/text-${code}.bin`, out);
  sizes.push(`${code} ${out.length}`);
}
writeFileSync('shared/watch-glyphs.json', JSON.stringify(glyphs) + '\n');

// The C side: string positions, and English for the host tests.
const english = flatten(WATCH_TEXT.en), defines = [];
let index = 0;
for (const key of WATCH_TEXT_KEYS) {
  defines.push(`#define WT_${key.replace(/[A-Z]/g, c => '_' + c).toUpperCase()} ${index}`);
  index += LISTS[key] || 1;
}
const resourceNames = WATCH_LANGUAGES.map(code => 'RESOURCE_ID_TEXT_' + code.replace('-', '_').toUpperCase());
writeFileSync('watchface/src/c/generated/watch_text_data.h', [
  '// Generated by tools/generate-watch-text.mjs from shared/watch-text.js.',
  '#pragma once',
  `#define WT_STRING_COUNT ${STRING_COUNT}`,
  `#define WT_LANGUAGE_COUNT ${WATCH_LANGUAGES.length}`,
  ...defines,
  '// The watch-language packet\'s index -> its resource ',
  `#define WT_RESOURCES {${resourceNames.join(',')}}`,
  '#ifdef WATCH_TEXT_ENGLISH',
  `static const char *const WT_ENGLISH[WT_STRING_COUNT]={${english.map(s => JSON.stringify(s)).join(',')}};`,
  '#endif', ''
].join('\n'));
// Every language needs its resource listed in the watch app's package.json.
const media = JSON.parse(readFileSync('watchface/package.json', 'utf8')).pebble.resources.media.map(m => m.name);
const missing = resourceNames.filter(n => !media.includes(n.replace('RESOURCE_ID_', '')));
if (missing.length) throw new Error('Add to watchface/package.json: ' + missing.join(', '));
console.log('Watch text:', sizes.join(', '), 'bytes.');
