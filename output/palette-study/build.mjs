import {readFileSync,writeFileSync} from 'node:fs';
const directory=new URL('./',import.meta.url);
const renders=readFileSync(new URL('renders.json',directory),'utf8');
const html=readFileSync(new URL('palettes.template.html',directory),'utf8').replace('__RENDERS__',renders);
if(Buffer.byteLength(html)>1_000_000)throw new Error('Palette comparison exceeds 1 MB.');
writeFileSync(new URL('watch-palettes.html',directory),html);
console.log('Built watch-palette comparison: '+Buffer.byteLength(html)+' bytes.');
