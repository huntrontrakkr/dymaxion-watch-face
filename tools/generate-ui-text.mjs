// Packs the phone settings page's translations (i18n/ui/<code>.json, each an
// array in the order of i18n/ui/source.json) into shared/ui-text.json.
// A translation must keep the English's {} slots, numbered {1}, {2}... when
// it needs another order.
//   node tools/generate-ui-text.mjs
import {readFileSync, writeFileSync, readdirSync} from 'node:fs';
import {LANGUAGES} from '../shared/watch-text.js';
const keys = JSON.parse(readFileSync('i18n/ui/source.json', 'utf8')), languages = {};
for (const {code} of LANGUAGES.filter(l => l.code !== 'en')) {
  const file = `i18n/ui/${code}.json`;
  if (!readdirSync('i18n/ui').includes(`${code}.json`)) throw new Error('Missing ' + file);
  const words = JSON.parse(readFileSync(file, 'utf8'));
  if (words.length !== keys.length) throw new Error(`${file} has ${words.length} entries; i18n/ui/source.json has ${keys.length}.`);
  words.forEach((w, i) => {
    const slots = keys[i].split('{}').length - 1, used = w.match(/\{\d*\}/g) || [];
    if (typeof w !== 'string' || !w.trim()) throw new Error(`${file} entry ${i} is empty.`);
    if (used.length !== slots) throw new Error(`${file} entry ${i} needs ${slots} slot(s): ${keys[i]} -> ${w}`);
  });
  languages[code] = words;
}
writeFileSync('shared/ui-text.json', JSON.stringify({keys, languages}) + '\n');
console.log('Settings page:', keys.length, 'strings in', Object.keys(languages).length, 'languages.');
