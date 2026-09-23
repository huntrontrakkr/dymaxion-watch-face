import {build} from 'esbuild';
import {readFileSync, writeFileSync} from 'node:fs';
const base = new URL('./', import.meta.url), bases = {};
for (const id of ['paper', 'dark']) bases[id] = 'data:image/png;base64,' + readFileSync(new URL('../broad-numeral-study/watch-base-' + id + '.png', base)).toString('base64');
const built = await build({entryPoints: [new URL('study.js', base).pathname], bundle: true, format: 'iife', write: false, target: 'es2020'});
const html = readFileSync(new URL('minute-flip.template.html', base), 'utf8').replace('__WATCH_BASES__', JSON.stringify(bases)).replace('__FLIP_SCRIPT__', built.outputFiles[0].text);
if (Buffer.byteLength(html) >= 1_000_000) throw new Error('Inline study exceeds 1 MB.');
writeFileSync(new URL('minute-flip.html', base), html);
console.log('Built minute-flip preview: ' + Buffer.byteLength(html) + ' bytes.');
